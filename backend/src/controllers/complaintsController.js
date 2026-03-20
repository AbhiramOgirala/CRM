'use strict';
const { supabase } = require('../config/supabase');
const nlp = require('../services/nlpService');
const geocoding = require('../services/geocodingService');
const { addCitizenPoints, addOfficerPoints, POINTS } = require('../services/gamificationService');
const { notifyStatusChange } = require('../services/whatsappService');

// ── Ticket number ─────────────────────────────────────────────────────────────
const genTicket = async () => {
  const { count } = await supabase.from('complaints').select('*',{count:'exact',head:true});
  return `CMP-${((count||0)+1000).toString().padStart(6,'0')}`;
};

// ── NLP Preview ───────────────────────────────────────────────────────────────
exports.previewClassification = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text||text.trim().length<5) {
      return res.json({ category:'other', confidence:0, priority:'low', department:'Municipal Corporation', departmentCode:'GHMC', routing_reason:'General civic issues handled by Municipal Corporation', slaHours:72, keywords:[], subCategory:null });
    }
    const r = nlp.classify(text);
    // Try to get department name from DB
    const { data: dept } = await supabase.from('departments').select('name').eq('code',r.deptCode).single();
    return res.json({
      category:r.category, confidence:r.confidence, priority:r.priority,
      department:dept?.name||r.deptName, departmentCode:r.deptCode,
      routing_reason:r.deptExplanation, slaHours:r.slaHours,
      subCategory:r.subCategory, keywords:r.keywords
    });
  } catch (err) {
    console.error('previewClassification:', err);
    return res.status(500).json({ error:'Classification failed' });
  }
};

// ── File Complaint ─────────────────────────────────────────────────────────────
exports.fileComplaint = async (req, res) => {
  try {
    const {
      title, description, audio_transcript,
      latitude, longitude, address, landmark, pincode,
      state_id, district_id, corporation_id, municipality_id,
      taluka_id, mandal_id, gram_panchayat_id,
      is_public=true, is_anonymous=false, images=[]
    } = req.body;

    const fullText = [title, description, audio_transcript].filter(Boolean).join(' ').trim();
    if (!fullText||fullText.length<5) return res.status(400).json({ error:'Please describe the complaint' });

    const r = nlp.classify(fullText);
    const finalTitle = title||nlp.generateTitle(description||audio_transcript||'', r.category);

    // Get department from DB
    const { data: dept } = await supabase.from('departments').select('id,name,sla_hours').eq('code',r.deptCode).single();
    const slaHours = r.slaHours || dept?.sla_hours || 72;
    const slaDeadline = new Date(Date.now()+slaHours*3600000);
    const ticket = await genTicket();

    // ── Automatic Geocoding ──────────────────────────────────────────────────
    let finalLatitude = latitude;
    let finalLongitude = longitude;
    let finalAddress = address;
    let geocodingAttempted = false;

    // If GPS coordinates are not provided, try to geocode the address
    if ((!latitude || !longitude) && (address || landmark || pincode)) {
      geocodingAttempted = true;
      console.log('Attempting to geocode address:', { address, landmark, pincode });
      
      try {
        const geocodeResult = await geocoding.geocodeComplaintLocation({
          address, landmark, pincode, state_id, district_id, mandal_id
        });

        if (geocodeResult && geocoding.isValidCoordinates(geocodeResult.latitude, geocodeResult.longitude)) {
          finalLatitude = geocodeResult.latitude;
          finalLongitude = geocodeResult.longitude;
          // Use the formatted address from geocoding if it's more detailed
          if (geocodeResult.formatted_address && geocodeResult.formatted_address.length > (address?.length || 0)) {
            finalAddress = geocodeResult.formatted_address;
          }
          console.log('Geocoding successful:', { lat: finalLatitude, lng: finalLongitude });
        } else {
          console.log('Geocoding failed or returned invalid coordinates');
        }
      } catch (geocodeError) {
        console.error('Geocoding error:', geocodeError);
        // Continue without GPS coordinates if geocoding fails
      }
    }

    const { data: complaint, error } = await supabase.from('complaints').insert({
      ticket_number:ticket, citizen_id:req.user.id,
      title:finalTitle, description:description||audio_transcript||'', audio_transcript:audio_transcript||null,
      category:r.category, sub_category:r.subCategory||null,
      nlp_category:r.category, nlp_confidence:r.confidence, nlp_keywords:r.keywords, sentiment:r.sentiment,
      priority:r.priority, status:'pending',
      latitude:finalLatitude||null, longitude:finalLongitude||null, address:finalAddress||null,
      landmark:landmark||null, pincode:pincode||null,
      state_id:state_id||null, district_id:district_id||null, corporation_id:corporation_id||null,
      municipality_id:municipality_id||null, taluka_id:taluka_id||null,
      mandal_id:mandal_id||null, gram_panchayat_id:gram_panchayat_id||null,
      department_id:dept?.id||null, sla_deadline:slaDeadline.toISOString(),
      sla_hours_allotted:slaHours, is_public, is_anonymous, images, escalation_level:0, view_count:0
    }).select().single();

    if (error) { console.error('fileComplaint insert error:', error); return res.status(500).json({ error:'Failed to file complaint. Please try again.' }); }

    // Timeline with geocoding info
    const timelineNotes = `Auto-classified: ${r.category}. Routed to ${dept?.name||r.deptName}. SLA: ${slaHours}h${geocodingAttempted ? (finalLatitude ? ' (GPS auto-located)' : ' (GPS lookup failed)') : ''}`;
    await supabase.from('complaint_timeline').insert({
      complaint_id:complaint.id, actor_id:req.user.id, actor_role:'citizen', action:'created',
      new_value:'pending', notes:timelineNotes
    });

    // Duplicate check (non-blocking)
    _checkDuplicates(complaint).catch(console.error);

    // Points
    await addCitizenPoints(req.user.id, POINTS.COMPLAINT_FILED);

    // Notify officers
    if (dept?.id) {
      const { data: officers } = await supabase.from('users').select('id').eq('department_id',dept.id).eq('role','officer').eq('is_active',true);
      if (officers?.length) {
        await supabase.from('notifications').insert(officers.map(o=>({
          user_id:o.id, type:'assignment',
          title:`New ${r.priority.toUpperCase()} Complaint`,
          message:`${r.category.replace(/_/g,' ')}: "${finalTitle}" — SLA: ${slaHours}h`,
          complaint_id:complaint.id
        })));
      }
    }

    return res.status(201).json({
      message:'Complaint filed successfully',
      complaint,
      auto_detection:{ 
        category:r.category, department:dept?.name||r.deptName, priority:r.priority, 
        slaHours, confidence:r.confidence, routing_reason:r.deptExplanation,
        geocoding: geocodingAttempted ? {
          attempted: true,
          success: !!finalLatitude,
          coordinates: finalLatitude ? { latitude: finalLatitude, longitude: finalLongitude } : null
        } : { attempted: false }
      }
    });
  } catch (err) {
    console.error('fileComplaint:', err);
    return res.status(500).json({ error:'Internal server error' });
  }
};

// ── Duplicate detection (internal helper) ────────────────────────────────────
const _checkDuplicates = async (newC) => {
  if (!newC.latitude||!newC.longitude) return;
  const since = new Date(Date.now()-30*24*3600000).toISOString();
  const { data: nearby } = await supabase.from('complaints')
    .select('id,title,description,latitude,longitude,category,parent_complaint_id,duplicate_count,citizen_id,priority')
    .eq('category',newC.category).neq('id',newC.id).neq('status','rejected').gte('created_at',since);
  if (!nearby?.length) return;
  let parentId = null;
  for (const c of nearby) {
    if (nlp.isDuplicate(newC,c,500,0.2)) { parentId=c.parent_complaint_id||c.id; break; }
  }
  if (!parentId) return;
  await supabase.from('complaints').update({ is_duplicate:true, parent_complaint_id:parentId }).eq('id',newC.id);
  const { data: parent } = await supabase.from('complaints').select('duplicate_count,priority,citizen_id').eq('id',parentId).single();
  if (parent) {
    const cnt = (parent.duplicate_count||0)+1;
    let p = parent.priority;
    if (cnt>=10) p='critical'; else if (cnt>=5) p='high'; else if (cnt>=3) p='medium';
    await supabase.from('complaints').update({ duplicate_count:cnt, priority:p }).eq('id',parentId);
    if (parent.citizen_id) await addCitizenPoints(parent.citizen_id, POINTS.DUPLICATE_VERIFIED);
  }
};

// ── Get Complaints ────────────────────────────────────────────────────────────
exports.getComplaints = async (req, res) => {
  try {
    const { status, category, priority, district_id, mandal_id, state_id, search,
      page=1, limit=20, sortBy='created_at', sortOrder='desc', is_public } = req.query;
    const offset = (parseInt(page)-1)*parseInt(limit);

    let q = supabase.from('complaints').select(`
      id,ticket_number,title,description,category,sub_category,status,priority,
      latitude,longitude,address,is_public,is_anonymous,is_duplicate,duplicate_count,
      upvote_count,comment_count,images,created_at,updated_at,sla_deadline,sla_breached,
      sla_hours_allotted,escalation_level,escalated_to,citizen_id,assigned_officer_id,
      department_id,state_id,district_id,mandal_id,nlp_confidence,nlp_category,
      departments:department_id(name,code),
      states:state_id(name), districts:district_id(name), mandals:mandal_id(name),
      users:citizen_id(full_name)
    `,{count:'exact'});

    const role = req.user?.role;
    if (req.path?.includes('/my')) {
      q = q.eq('citizen_id',req.user.id);
    } else if (!role||role==='citizen') {
      q = q.eq('is_public',true);
    }
    // officer / admin / super_admin see ALL complaints

    if (status) q=q.eq('status',status);
    if (category) q=q.eq('category',category);
    if (priority) q=q.eq('priority',priority);
    if (district_id) q=q.eq('district_id',district_id);
    if (mandal_id) q=q.eq('mandal_id',mandal_id);
    if (state_id) q=q.eq('state_id',state_id);
    if (is_public!==undefined) q=q.eq('is_public',is_public==='true');
    if (search) q=q.or(`title.ilike.%${search}%,description.ilike.%${search}%,ticket_number.ilike.%${search}%`);

    q = q.order(sortBy,{ascending:sortOrder==='asc'}).range(offset,offset+parseInt(limit)-1);
    const { data, error, count } = await q;
    if (error) return res.status(500).json({ error:'Failed to fetch complaints' });

    const masked = (data||[]).map(c=>({
      ...c,
      citizen_id:c.is_anonymous?null:c.citizen_id,
      reporter_name: c.is_anonymous ? 'Anonymous' : (c.users?.full_name || null),
      is_own_dept: role==='officer'?c.department_id===req.user?.department_id:undefined
    }));

    return res.json({ complaints:masked, pagination:{ page:parseInt(page), limit:parseInt(limit), total:count||0, totalPages:Math.ceil((count||0)/parseInt(limit)) } });
  } catch (err) {
    console.error('getComplaints:', err);
    return res.status(500).json({ error:'Internal server error' });
  }
};

// ── Get Complaint by ID ───────────────────────────────────────────────────────
exports.getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: complaint, error } = await supabase.from('complaints').select(`
      *,
      departments:department_id(id,name,code,contact_email),
      states:state_id(name), districts:district_id(name),
      corporations:corporation_id(name), municipalities:municipality_id(name),
      talukas:taluka_id(name), mandals:mandal_id(name),
      gram_panchayats:gram_panchayat_id(name),
      users:citizen_id(full_name)
    `).eq('id',id).single();

    if (error||!complaint) return res.status(404).json({ error:'Complaint not found' });
    if (!complaint.is_public && req.user?.id!==complaint.citizen_id && !['officer','admin','super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error:'This complaint is private' });
    }

    await supabase.from('complaints').update({ view_count:(complaint.view_count||0)+1 }).eq('id',id);

    const [{ data: timeline }, { data: comments }, { data: linked }] = await Promise.all([
      supabase.from('complaint_timeline').select('*,users:actor_id(full_name,role)').eq('complaint_id',id).order('created_at'),
      supabase.from('comments').select('*,users:user_id(full_name,role,badge_level,govt_badge)').eq('complaint_id',id).eq('is_deleted',false).order('created_at'),
      supabase.from('complaints').select('id,ticket_number,title,created_at,address').eq('parent_complaint_id',id).limit(20)
    ]);

    let userUpvoted = false;
    if (req.user) {
      const { data: uv } = await supabase.from('upvotes').select('id').eq('complaint_id',id).eq('user_id',req.user.id).single();
      userUpvoted = !!uv;
    }

    const reporterName = complaint.is_anonymous ? 'Anonymous' : (complaint.users?.full_name || null);
    return res.json({ complaint:{...complaint, reporter_name: reporterName, view_count:(complaint.view_count||0)+1}, timeline:timeline||[], comments:comments||[], linkedComplaints:linked||[], userUpvoted });
  } catch (err) {
    console.error('getComplaintById:', err);
    return res.status(500).json({ error:'Internal server error' });
  }
};

// ── Update Status ─────────────────────────────────────────────────────────────
exports.updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, rejection_reason, proof_images=[] } = req.body;

    if (!status) return res.status(400).json({ error:'Status is required' });

    const { data: complaint } = await supabase.from('complaints').select('*').eq('id',id).single();
    if (!complaint) return res.status(404).json({ error:'Complaint not found' });

    // Officers can only act on their own dept
    if (req.user.role==='officer' && complaint.department_id!==req.user.department_id) {
      return res.status(403).json({ error:'You can only update complaints in your department' });
    }

    if (status==='resolved') {
      if (!notes?.trim()) return res.status(400).json({ error:'Resolution notes are required' });
      if (!proof_images?.length) return res.status(400).json({ error:'Proof-of-work photos are required to resolve a complaint' });
    }
    if (status==='rejected' && !rejection_reason?.trim()) {
      return res.status(400).json({ error:'Rejection reason is required' });
    }

    const now = new Date().toISOString();
    const update = { status, updated_at:now };
    if (status==='resolved') {
      update.resolved_at = now;
      update.resolution_notes = notes;
      update.proof_images = proof_images;
      update.sla_breached = complaint.sla_deadline ? new Date()>new Date(complaint.sla_deadline) : false;
    }
    if (status==='rejected') update.rejection_reason = rejection_reason;
    if (status==='in_progress') update.escalation_level = 0;

    const { data: updated, error } = await supabase.from('complaints').update(update).eq('id',id).select().single();
    if (error) return res.status(500).json({ error:'Failed to update' });

    await supabase.from('complaint_timeline').insert({
      complaint_id:id, actor_id:req.user.id, actor_role:req.user.role,
      action:'status_changed', old_value:complaint.status, new_value:status,
      notes:notes||rejection_reason||`Status updated to ${status}`
    });

    if (status==='resolved' && req.user.role==='officer' && req.user.department_id) {
      await addOfficerPoints(req.user.id, req.user.department_id, complaint.priority, !updated.sla_breached);
      if (complaint.citizen_id) {
        await addCitizenPoints(complaint.citizen_id, POINTS.COMPLAINT_RESOLVED);
        await supabase.from('notifications').insert({ user_id:complaint.citizen_id, type:'resolution', title:'✅ Complaint Resolved!', message:`Your complaint "${complaint.title}" (${complaint.ticket_number}) has been resolved.`, complaint_id:id });
      }
    }

    if (complaint.citizen_id && status!=='resolved') {
      const msgs = { assigned:'has been assigned to a department', in_progress:'is now being worked on', rejected:`was rejected: ${rejection_reason}`, escalated:'has been escalated for priority attention' };
      if (msgs[status]) {
        await supabase.from('notifications').insert({ user_id:complaint.citizen_id, type:'update', title:'Complaint Status Updated', message:`Your complaint "${complaint.title}" ${msgs[status]}`, complaint_id:id });
      }
    }

    // ── WhatsApp notification (non-blocking) ─────────────────────
    if (complaint.citizen_id) {
      const { data: citizen } = await supabase.from('users').select('phone').eq('id', complaint.citizen_id).single();
      if (citizen?.phone) {
        notifyStatusChange(citizen.phone, complaint.ticket_number, status, rejection_reason).catch(console.error);
      }
    }

    return res.json({ message:'Status updated', complaint:updated });
  } catch (err) {
    console.error('updateComplaintStatus:', err);
    return res.status(500).json({ error:'Internal server error' });
  }
};

// ── Assign Complaint ──────────────────────────────────────────────────────────
exports.assignComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { officer_id, department_id, notes } = req.body;
    const { data: c } = await supabase.from('complaints').select('*').eq('id',id).single();
    if (!c) return res.status(404).json({ error:'Not found' });
    const { data: updated } = await supabase.from('complaints').update({ assigned_officer_id:officer_id, department_id:department_id||c.department_id, assigned_at:new Date().toISOString(), status:'assigned' }).eq('id',id).select().single();
    await supabase.from('complaint_timeline').insert({ complaint_id:id, actor_id:req.user.id, actor_role:req.user.role, action:'assigned', notes });
    if (officer_id) await supabase.from('notifications').insert({ user_id:officer_id, type:'assignment', title:'Complaint Assigned to You', message:`"${c.title}" assigned to you`, complaint_id:id });
    return res.json({ message:'Assigned', complaint:updated });
  } catch (err) { return res.status(500).json({ error:'Internal server error' }); }
};

// ── Upvote ───────────────────────────────────────────────────────────────────
exports.upvoteComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: existing } = await supabase.from('upvotes').select('id').eq('complaint_id',id).eq('user_id',req.user.id).single();
    if (existing) {
      await supabase.from('upvotes').delete().eq('id',existing.id);
      return res.json({ upvoted:false });
    }
    await supabase.from('upvotes').insert({ complaint_id:id, user_id:req.user.id });
    const { data: c } = await supabase.from('complaints').select('citizen_id').eq('id',id).single();
    if (c?.citizen_id && c.citizen_id!==req.user.id) await addCitizenPoints(c.citizen_id, POINTS.UPVOTE_RECEIVED);
    return res.json({ upvoted:true });
  } catch (err) { return res.status(500).json({ error:'Internal server error' }); }
};

// ── Hotspots ─────────────────────────────────────────────────────────────────
exports.getHotspots = async (req, res) => {
  try {
    const { state_id, district_id, mandal_id, category, days=30 } = req.query;
    const since = new Date(Date.now()-parseInt(days)*24*3600000).toISOString();
    let q = supabase.from('complaints').select('id,latitude,longitude,category,priority,status,address,title,escalation_level,is_anonymous').eq('is_public',true).not('latitude','is',null).gte('created_at',since);
    if (state_id) q=q.eq('state_id',state_id);
    if (district_id) q=q.eq('district_id',district_id);
    if (mandal_id) q=q.eq('mandal_id',mandal_id);
    if (category) q=q.eq('category',category);
    const { data, error } = await q.limit(1500);
    if (error) return res.status(500).json({ error:'Failed' });
    return res.json({ hotspots:data||[] });
  } catch (err) { return res.status(500).json({ error:'Internal server error' }); }
};

// ── Geocode Existing Complaints (Admin only) ─────────────────────────────────
exports.geocodeExistingComplaints = async (req, res) => {
  try {
    const { geocodeExistingComplaints } = require('../utils/geocodeExistingComplaints');
    
    // Run geocoding in background
    geocodeExistingComplaints()
      .then(() => console.log('Background geocoding completed'))
      .catch(err => console.error('Background geocoding failed:', err));
    
    return res.json({ 
      message: 'Geocoding process started in background. Check server logs for progress.',
      status: 'started'
    });
  } catch (err) {
    console.error('geocodeExistingComplaints:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
exports.getDashboardStats = async (req, res) => {
  try {
    const [total,pending,inProgress,resolved,escalated] = await Promise.all([
      supabase.from('complaints').select('*',{count:'exact',head:true}),
      supabase.from('complaints').select('*',{count:'exact',head:true}).eq('status','pending'),
      supabase.from('complaints').select('*',{count:'exact',head:true}).eq('status','in_progress'),
      supabase.from('complaints').select('*',{count:'exact',head:true}).eq('status','resolved'),
      supabase.from('complaints').select('*',{count:'exact',head:true}).eq('status','escalated')
    ]);

    const { data: catRaw } = await supabase.from('complaints').select('category');
    const catCounts = {};
    (catRaw||[]).forEach(c=>(catCounts[c.category]=(catCounts[c.category]||0)+1));
    const byCategory = Object.entries(catCounts).map(([cat,count])=>({category:cat,count})).sort((a,b)=>b.count-a.count);

    const { data: mRaw } = await supabase.from('complaints').select('created_at').gte('created_at',new Date(Date.now()-180*24*3600000).toISOString());
    const monthly = {};
    (mRaw||[]).forEach(c=>{ const m=new Date(c.created_at).toISOString().substring(0,7); monthly[m]=(monthly[m]||0)+1; });

    return res.json({
      stats:{ total:total.count||0, pending:pending.count||0, inProgress:inProgress.count||0, resolved:resolved.count||0, escalated:escalated.count||0, resolutionRate:total.count?((resolved.count/total.count)*100).toFixed(1):'0' },
      byCategory,
      monthlyTrends:Object.entries(monthly).map(([month,count])=>({month,count})).sort((a,b)=>a.month.localeCompare(b.month))
    });
  } catch (err) {
    console.error('getDashboardStats:', err);
    return res.status(500).json({ error:'Internal server error' });
  }
};
