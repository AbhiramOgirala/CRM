'use strict';
const { supabase } = require('../config/supabase');
const nlp = require('../services/nlpService');
const geocoding = require('../services/geocodingService');
const imageProcessingService = require('../services/imageProcessingService');
const geminiValidation = require('../services/geminiValidationService');
const { addCitizenPoints, addOfficerPoints, POINTS } = require('../services/gamificationService');
const notificationService = require('../services/notificationService');
const { notifyStatusChange } = require('../services/whatsappService');

const CITIZEN_DELETE_REASON_PREFIX = 'CITIZEN_DELETED:';
const CITIZEN_DELETE_REASONS = [
  { code: 'issue_resolved', label: 'Issue resolved already' },
  { code: 'filed_by_mistake', label: 'Filed by mistake' },
  { code: 'duplicate_report', label: 'I filed a duplicate report' },
  { code: 'wrong_information', label: 'Wrong information submitted' },
  { code: 'privacy_concern', label: 'Privacy concern' },
  { code: 'other', label: 'Other reason' }
];

// Enhanced classification (optional, based on environment variable)
const USE_ENHANCED_CLASSIFICATION = process.env.USE_ENHANCED_CLASSIFICATION === 'true';
const enhancedOrchestrator = USE_ENHANCED_CLASSIFICATION ? require('../services/enhancedClassificationOrchestrator') : null;
const MAX_COMPLAINT_IMAGES = 5;

const isImageDataUrl = (value) => typeof value === 'string' && /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);

const parseImageToBuffer = (imageInput) => {
  if (!imageInput) return null;

  if (Buffer.isBuffer(imageInput)) return imageInput;

  if (typeof imageInput === 'string') {
    const rawBase64 = imageInput.includes(',') ? imageInput.split(',')[1] : imageInput;
    try {
      return Buffer.from(rawBase64, 'base64');
    } catch {
      return null;
    }
  }

  if (typeof imageInput === 'object') {
    if (Buffer.isBuffer(imageInput.buffer)) return imageInput.buffer;
    if (typeof imageInput.buffer === 'string') {
      const rawBase64 = imageInput.buffer.includes(',') ? imageInput.buffer.split(',')[1] : imageInput.buffer;
      try {
        return Buffer.from(rawBase64, 'base64');
      } catch {
        return null;
      }
    }
  }

  return null;
};

// ── Ticket number ─────────────────────────────────────────────────────────────
const genTicket = async () => {
  try {
    // UUID-based ticket generation that fits in 20 characters
    // Format: CMP-XXXXXXXXXXXXXXXX (4 + 16 = 20 chars exactly)

    // Generate random hex string
    const part1 = Math.random().toString(16).substring(2);
    const part2 = Math.random().toString(16).substring(2);
    const combined = (part1 + part2).substring(0, 16);

    const ticket = `CMP-${combined}`;

    // Optional: Verify it doesn't exist (should be virtually impossible)
    const { data: existing } = await supabase
      .from('complaints')
      .select('id')
      .eq('ticket_number', ticket)
      .limit(1);

    if (existing && existing.length > 0) {
      // Virtually impossible, but recursive call as backup
      console.warn(`[genTicket] Rare collision detected: ${ticket}`);
      return genTicket();
    }

    return ticket;
  } catch (err) {
    console.error('[genTicket] Error:', err.message);
    // Fallback: generate directly without DB check
    const part1 = Math.random().toString(16).substring(2);
    const part2 = Math.random().toString(16).substring(2);
    const combined = (part1 + part2).substring(0, 16);
    return `CMP-${combined}`;
  }
};

// ── Auto-assign officer by department + district ──────────────────────────────
const autoAssignOfficer = async (complaintId, departmentId, districtId) => {
  try {
    if (!departmentId) return null;
    // Try to find an officer matching both dept and district
    let query = supabase.from('users')
      .select('id')
      .eq('role', 'officer')
      .eq('department_id', departmentId)
      .eq('is_active', true);

    if (districtId) {
      const { data: areaOfficer } = await query.eq('district_id', districtId).limit(1).single();
      if (areaOfficer) {
        await supabase.from('complaints').update({
          assigned_officer_id: areaOfficer.id,
          assigned_at: new Date().toISOString(),
          status: 'assigned'
        }).eq('id', complaintId);
        await supabase.from('complaint_timeline').insert({
          complaint_id: complaintId, actor_id: areaOfficer.id, actor_role: 'system',
          action: 'assigned', notes: 'Auto-assigned to area officer based on department and district'
        });
        return areaOfficer.id;
      }
    }
    // Fallback: any officer in the department
    const { data: deptOfficer } = await supabase.from('users')
      .select('id')
      .eq('role', 'officer')
      .eq('department_id', departmentId)
      .eq('is_active', true)
      .limit(1)
      .single();
    if (deptOfficer) {
      await supabase.from('complaints').update({
        assigned_officer_id: deptOfficer.id,
        assigned_at: new Date().toISOString(),
        status: 'assigned'
      }).eq('id', complaintId);
      await supabase.from('complaint_timeline').insert({
        complaint_id: complaintId, actor_id: deptOfficer.id, actor_role: 'system',
        action: 'assigned', notes: 'Auto-assigned to department officer'
      });
      return deptOfficer.id;
    }
    return null;
  } catch (err) {
    console.warn('[AutoAssign] Failed:', err.message);
    return null;
  }
};

// ── NLP Preview ───────────────────────────────────────────────────────────────
exports.generateTitle = async (req, res) => {
  try {
    const { text, category = 'other', priority = 'medium' } = req.body || {};
    if (!text || text.trim().length < 5) return res.json({ title: '' });

    const geminiGenerated = await geminiValidation.generateComplaintTitle(text, category, priority);
    if (geminiGenerated?.title) {
      return res.json({ title: geminiGenerated.title, source: 'gemini' });
    }

    const fallback = nlp.generateTitle(text, category);
    return res.json({ title: fallback, source: 'nlp' });
  } catch (err) {
    console.error('generateTitle:', err);
    return res.status(500).json({ error: 'Failed to generate title' });
  }
};

exports.previewClassification = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 5) {
      console.log(`⚠️  [PREVIEW] Text too short (${text?.length || 0} chars)`);
      return res.json({ category: 'other', confidence: 0, priority: 'low', department: 'Municipal Corporation', departmentCode: 'GHMC', routing_reason: 'General civic issues handled by Municipal Corporation', slaHours: 72, keywords: [], subCategory: null });
    }

    console.log(`📥 [PREVIEW] Input text: "${text}"`);

    // Use enhanced classification if enabled
    if (USE_ENHANCED_CLASSIFICATION && enhancedOrchestrator) {
      try {
        const enhanced = await enhancedOrchestrator.classifyComplaint({
          title: text,
          description: text,
          audio_transcript: null,
          images: []
        });

        // Map enhanced result to legacy format for backward compatibility
        const { data: dept } = await supabase.from('departments').select('name').eq('code', enhanced.department_code).single();

        // Calculate department confidence (weighted average, max 100%)
        const categoryConfScore = enhanced.confidence * 100;
        const slaScore = (1 - Math.min(enhanced.sla_hours / 120, 1)) * 100;
        const deptConf = Math.min((categoryConfScore * 0.6 + slaScore * 0.4), 100);

        // Log preview classification with enhanced confidence
        if (enhanced.priority === 'critical') {
          console.log(`🚨 [PREVIEW-ENHANCED-CRITICAL] Category: ${enhanced.final_category.toUpperCase()} | Department: ${dept?.name || enhanced.department} | Category Confidence: ${(enhanced.confidence * 100).toFixed(2)}% | Dept Confidence: ${deptConf.toFixed(2)}% | Labels: [${enhanced.all_labels.join(', ')}] | URGENT`);
        } else {
          console.log(`🔍 [PREVIEW-ENHANCED] Category: ${enhanced.final_category} | Priority: ${enhanced.priority} | Department: ${dept?.name || enhanced.department} | Category Confidence: ${(enhanced.confidence * 100).toFixed(2)}% | Dept Confidence: ${deptConf.toFixed(2)}% | Labels: [${enhanced.all_labels.join(', ')}]`);
        }

        return res.json({
          category: enhanced.final_category,
          confidence: enhanced.confidence,
          priority: enhanced.priority,
          department: dept?.name || enhanced.department,
          departmentCode: enhanced.department_code,
          departmentConfidence: parseFloat(deptConf.toFixed(2)),
          routing_reason: enhanced.internal?.rule_based?.deptExplanation || 'Classified by enhanced pipeline',
          slaHours: enhanced.sla_hours,
          subCategory: enhanced.sub_category,
          keywords: enhanced.keywords,
          // Enhanced metadata
          all_labels: enhanced.all_labels,
          requires_review: enhanced.requires_review,
          gemini_adjusted: enhanced.gemini_adjusted,
          confidence_breakdown: enhanced.confidence_breakdown,
          enhancements_applied: enhanced.enhancements_applied
        });
      } catch (enhancedErr) {
        console.warn('[PreviewClassification] Enhanced pipeline failed, falling back:', enhancedErr.message);
        // Fall through to rule-based
      }
    }

    // Fallback to original rule-based pipeline
    const r = nlp.classify(text);
    const { data: dept } = await supabase.from('departments').select('name').eq('code', r.deptCode).single();

    // Calculate department confidence (weighted average, max 100%)
    const categoryConfScore = r.confidence * 100;
    const slaScore = (1 - Math.min(r.slaHours / 120, 1)) * 100;
    const deptConf = Math.min((categoryConfScore * 0.6 + slaScore * 0.4), 100);

    // Log preview classification with emphasis on critical
    if (r.priority === 'critical') {
      console.log(`🚨 [PREVIEW-CRITICAL] Category: ${r.category.toUpperCase()} | Department: ${dept?.name || r.deptName} | Category Confidence: ${(r.confidence * 100).toFixed(2)}% | Dept Confidence: ${deptConf.toFixed(2)}% | URGENT`);
    } else {
      console.log(`🔍 [PREVIEW] Category: ${r.category} | Priority: ${r.priority} | Department: ${dept?.name || r.deptName} | Category Confidence: ${(r.confidence * 100).toFixed(2)}% | Dept Confidence: ${deptConf.toFixed(2)}%`);
    }

    return res.json({
      category: r.category, confidence: r.confidence, priority: r.priority,
      department: dept?.name || r.deptName, departmentCode: r.deptCode,
      routing_reason: r.deptExplanation, slaHours: r.slaHours,
      subCategory: r.subCategory, keywords: r.keywords,
      departmentConfidence: parseFloat(deptConf.toFixed(2))

    });
  } catch (err) {
    console.error('previewClassification:', err);
    return res.status(500).json({ error: 'Classification failed' });
  }
};

// ── Analyze Image ──────────────────────────────────────────────────────────────
exports.analyzeImage = async (req, res) => {
  try {
    const { category, description } = req.body;
    const imageBuffer = req.file?.buffer || req.body.image;

    console.log('[AnalyzeImage] Request received', {
      hasFile: !!req.file,
      fileName: req.file?.filename,
      fileSize: req.file?.size,
      category,
      hasDescription: !!description
    });

    if (!imageBuffer) {
      console.error('[AnalyzeImage] No image buffer found');
      return res.status(400).json({ error: 'No image provided. Please upload an image file.' });
    }

    if (!category) {
      console.error('[AnalyzeImage] No category provided');
      return res.status(400).json({ error: 'Category is required' });
    }

    console.log('[AnalyzeImage] Processing image:', { category, bufferSize: imageBuffer.length });

    // Process image (runs local analysis + Gemini verification)
    const analysisResult = await imageProcessingService.processImage(
      imageBuffer,
      category,
      description || ''
    );

    // Get category info (department, priority, confidence)
    const catInfo = imageProcessingService.getCategoryInfo(category);

    // Extract consolidated result
    const consolidated = analysisResult.consolidated || {};
    const finalConfidence = parseFloat((consolidated.overallConfidence * 100).toFixed(2));
    const deptConfidence = parseFloat((catInfo.score * 100).toFixed(2));

    // Build mismatch details for response
    let mismatchDetails = null;
    if (consolidated.textImageMatch === 'mismatch' || consolidated.status === 'MISMATCH') {
      mismatchDetails = {
        description: "Image and issue are not matching",
        what_in_image: (analysisResult.gemini?.detectedObjects && analysisResult.gemini.detectedObjects.length > 0)
          ? analysisResult.gemini.detectedObjects.join(', ')
          : 'Unable to detect specific objects',
        issues_found: analysisResult.gemini?.issues || 'Image content does not match the complaint category',
        category_analysis: {
          expected_category: category,
          matches_complaint_text: analysisResult.gemini?.categoryMatchesText ?? undefined,
          matches_image_content: analysisResult.gemini?.categoryMatchesImage ?? undefined
        },
        analysis_explanation: analysisResult.gemini?.explanation || 'The image content appears to be different from what is described in the complaint'
      };
    }

    const result = {
      // Local analysis breakdown
      local_analysis: analysisResult.local ? {
        confidence: parseFloat((analysisResult.local.confidence * 100).toFixed(2)),
        detected_features: analysisResult.local.features || [],
        detected_labels: analysisResult.local.labels || []
      } : null,

      // Gemini analysis breakdown  
      gemini_analysis: analysisResult.gemini ? {
        text_image_match: analysisResult.gemini.textImageMatch,
        text_image_coherence: parseFloat((analysisResult.gemini.textImageCoherence * 100).toFixed(2)),
        category_matches_text: analysisResult.gemini.categoryMatchesText,
        category_matches_image: analysisResult.gemini.categoryMatchesImage,
        visual_description_match: analysisResult.gemini.visualDescriptionMatch,
        detected_objects: analysisResult.gemini.detectedObjects || [],
        issues: analysisResult.gemini.issues,
        final_validation: analysisResult.gemini.finalValidation,
        confidence: parseFloat((analysisResult.gemini.confidence * 100).toFixed(2)),
        explanation: analysisResult.gemini.explanation
      } : null,

      // Final unified result
      image_analysis: {
        text_image_match: consolidated.textImageMatch,
        complaint_image_alignment: parseFloat((consolidated.complaintImageAlignment * 100).toFixed(2)),
        category_valid: consolidated.categoryValid,
        confidence: finalConfidence,
        requires_review: consolidated.requiresReview,
        reasoning: consolidated.reasoning
      },

      classification: {
        category: category,
        department: catInfo.dept,
        priority: catInfo.priority.toUpperCase(),
        image_confidence: finalConfidence,
        department_confidence: deptConfidence,
        final_confidence: Math.min(parseFloat(((finalConfidence + deptConfidence) / 2).toFixed(2)), 100)
      },

      // Include mismatch details if mismatch detected
      mismatch_details: mismatchDetails,

      status: consolidated.status
    };

    // Detailed console logging
    const statusIcon = consolidated.status === 'VERIFIED' ? '✅' :
      consolidated.status === 'MISMATCH' ? '❌' : '⚠️ ';
    console.log(`\n${statusIcon} [COMPLAINT + IMAGE VALIDATION]`);
    console.log(`   Category: ${category.toUpperCase()}`);
    console.log(`   Department: ${catInfo.dept}`);
    console.log(`   Priority: ${catInfo.priority.toUpperCase()}`);

    if (analysisResult.local) {
      console.log(`\n   📊 LOCAL IMAGE ANALYSIS:`);
      console.log(`      Confidence: ${result.local_analysis.confidence}%`);
      console.log(`      Features: ${result.local_analysis.detected_features.join(', ') || 'none'}`);
    }

    if (analysisResult.gemini) {
      console.log(`\n   🤖 UNIFIED GEMINI VALIDATION (Text + Image):`);
      console.log(`      Text-Image Match: ${analysisResult.gemini.textImageMatch.toUpperCase()}`);
      console.log(`      Complaint-Image Coherence: ${result.gemini_analysis.text_image_coherence}%`);
      console.log(`      Category Matches Text: ${analysisResult.gemini.categoryMatchesText ? 'Yes' : 'No'}`);
      console.log(`      Category Matches Image: ${analysisResult.gemini.categoryMatchesImage ? 'Yes' : 'No'}`);
      console.log(`      Validation: ${analysisResult.gemini.finalValidation}`);
      console.log(`      Gemini Confidence: ${result.gemini_analysis.confidence}%`);
      if (analysisResult.gemini.detectedObjects.length > 0) {
        console.log(`      Detected Objects: ${analysisResult.gemini.detectedObjects.join(', ')}`);
      }
      if (analysisResult.gemini.issues !== 'none') {
        console.log(`      ⚠️  Issues: ${analysisResult.gemini.issues}`);
      }
    }

    console.log(`\n   ✨ FINAL VERDICT:`);
    console.log(`      Status: ${consolidated.status}`);
    console.log(`      Complaint-Image Alignment: ${result.image_analysis.complaint_image_alignment}%`);
    console.log(`      Category Valid: ${consolidated.categoryValid ? 'Yes' : 'No'}`);
    console.log(`      Final Confidence: ${finalConfidence}%`);
    console.log(`      Requires Review: ${consolidated.requiresReview ? 'YES 🚨' : 'No'}\n`);

    return res.json(result);
  } catch (err) {
    console.error('[AnalyzeImage] Error:', err.message, err.stack);
    return res.status(500).json({ error: 'Image analysis failed: ' + err.message });
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
      is_public=true, is_anonymous=false, images: rawImages=[]
    } = req.body;

    const incomingImages = Array.isArray(rawImages)
      ? rawImages.filter(Boolean)
      : (rawImages ? [rawImages] : []);

    if (incomingImages.length > MAX_COMPLAINT_IMAGES) {
      return res.status(400).json({ error: `Maximum ${MAX_COMPLAINT_IMAGES} images allowed per complaint` });
    }

    const invalidImage = incomingImages.find((img) => {
      if (typeof img === 'string') return !isImageDataUrl(img);
      if (Buffer.isBuffer(img)) return false;
      if (img && typeof img === 'object') {
        if (Buffer.isBuffer(img.buffer)) return false;
        if (typeof img.buffer === 'string') return !isImageDataUrl(img.buffer);
      }
      return true;
    });

    if (invalidImage) {
      return res.status(400).json({ error: 'Invalid image format. Please upload valid image files.' });
    }

    const imagesForStorage = incomingImages.map((img) => {
      if (typeof img === 'string') return img;
      if (img && typeof img === 'object' && typeof img.buffer === 'string') return img.buffer;
      return null;
    }).filter(Boolean);

    const imageBuffers = incomingImages
      .map(parseImageToBuffer)
      .filter((buf) => Buffer.isBuffer(buf) && buf.length > 0);

    const fullText = [title, description, audio_transcript].filter(Boolean).join(' ').trim();
    if (!fullText || fullText.length < 5) return res.status(400).json({ error: 'Please describe the complaint' });

    // ── CLASSIFICATION: Use enhanced pipeline if enabled ──────────────────────
    let classificaton = null;
    let finalTitle = null;
    let enhancedMetadata = null;

    if (USE_ENHANCED_CLASSIFICATION && enhancedOrchestrator) {
      try {
        // Use enhanced orchestrator
        const enhanced = await enhancedOrchestrator.classifyComplaint({
          title: title || '',
          description: description || '',
          audio_transcript: audio_transcript || null,
          images: imageBuffers.map((buffer) => ({ buffer }))
        });

        classificaton = {
          category: enhanced.final_category,
          confidence: enhanced.confidence,
          priority: enhanced.priority,
          sentiment: enhanced.sentiment,
          keywords: enhanced.keywords,
          subCategory: enhanced.sub_category,
          slaHours: enhanced.sla_hours,
          deptCode: enhanced.department_code,
          deptName: enhanced.department
        };

        if (title?.trim()) {
          finalTitle = title.trim();
        } else {
          const geminiGenerated = await geminiValidation.generateComplaintTitle(
            fullText,
            classificaton.category,
            classificaton.priority
          );
          finalTitle = geminiGenerated?.title || nlp.generateTitle(description || audio_transcript || '', classificaton.category);
        }
        enhancedMetadata = {
          all_labels: enhanced.all_labels,
          requires_review: enhanced.requires_review,
          gemini_adjusted: enhanced.gemini_adjusted,
          multi_label: enhanced.multi_label,
          conflict_detected: enhanced.conflict_detected,
          severity_calibrated: enhanced.severity_calibrated,
          confidence_breakdown: enhanced.confidence_breakdown,
          enhancements_applied: enhanced.enhancements_applied,
          processing_time_ms: enhanced.processing_time_ms
        };

        console.log('[FileComplaint] Enhanced classification applied:', {
          category: classificaton.category,
          confidence: classificaton.confidence,
          requiresReview: enhancedMetadata.requires_review
        });
        console.log(`✅ [ENHANCED FILED] Confidence: ${(classificaton.confidence * 100).toFixed(2)}% | All Labels: [${enhancedMetadata.all_labels.join(', ')}]`);
      } catch (enhancedErr) {
        console.warn('[FileComplaint] Enhanced classification failed, falling back:', enhancedErr.message);
        // Fall through to rule-based
      }
    }

    // Fallback to original rule-based pipeline if enhanced not available or failed
    if (!classificaton) {
      const r = nlp.classify(fullText);
      classificaton = r;
      finalTitle = title || nlp.generateTitle(description || audio_transcript || '', r.category);
    }

    // ── City-aware department resolution ─────────────────────────────────────
    // Map complaint category → department code per state
    // Falls back to Delhi codes if state not matched
    const CITY_DEPT_MAP = {
      'Telangana': {
        roads: 'GHMC', infrastructure: 'GHMC', waste_management: 'GHMC',
        parks: 'GHMC', public_services: 'GHMC', street_lights: 'GHMC',
        water_supply: 'HMWSSB', drainage: 'HMWSSB',
        electricity: 'TSSPDCL',
        law_enforcement: 'HYDPOL', noise_pollution: 'HYDPOL',
        health: 'TSHFW', education: 'TSEDU', other: 'GHMC'
      },
      'Maharashtra': {
        roads: 'BMC', infrastructure: 'BMC', waste_management: 'BMC',
        parks: 'BMC', public_services: 'BMC', street_lights: 'BMC',
        water_supply: 'MWRRA', drainage: 'MWRRA',
        electricity: 'MSEDCL',
        law_enforcement: 'MUMPOL', noise_pollution: 'MUMPOL',
        health: 'MHFW', education: 'MHEDU', other: 'BMC'
      },
      'West Bengal': {
        roads: 'KMC', infrastructure: 'KMC', waste_management: 'KMC',
        parks: 'KMC', public_services: 'KMC', street_lights: 'KMC',
        water_supply: 'WBPHED', drainage: 'WBPHED',
        electricity: 'CESC',
        law_enforcement: 'KOLPOL', noise_pollution: 'KOLPOL',
        health: 'WBHFW', education: 'WBEDU', other: 'KMC'
      },
      'Karnataka': {
        roads: 'BBMP', infrastructure: 'BBMP', waste_management: 'BBMP',
        parks: 'BBMP', public_services: 'BBMP', street_lights: 'BBMP',
        water_supply: 'BWSSB', drainage: 'BWSSB',
        electricity: 'BESCOM',
        law_enforcement: 'BLRPOL', noise_pollution: 'BLRPOL',
        health: 'KARHFW', education: 'KAREDU', other: 'BBMP'
      }
    };

    // Get state name from state_id if provided
    let stateName = null;
    if (state_id) {
      const { data: stateRow } = await supabase.from('states').select('name').eq('id', state_id).single();
      stateName = stateRow?.name || null;
    }

    // Resolve the correct dept code for this city
    const cityMap = stateName ? CITY_DEPT_MAP[stateName] : null;
    const resolvedDeptCode = cityMap
      ? (cityMap[classificaton.category] || cityMap.other)
      : classificaton.deptCode; // fallback to NLP's Delhi code

    // Fetch dept from DB using resolved code
    let dept = null;
    const { data: deptByCode } = await supabase.from('departments').select('id,name,sla_hours').eq('code', resolvedDeptCode).maybeSingle();
    dept = deptByCode;

    // If still not found, fall back to NLP's original code
    if (!dept && resolvedDeptCode !== classificaton.deptCode) {
      const { data: fallbackDept } = await supabase.from('departments').select('id,name,sla_hours').eq('code', classificaton.deptCode).maybeSingle();
      dept = fallbackDept;
    }

    console.log(`[Routing] State: ${stateName || 'Delhi'} | Category: ${classificaton.category} | Dept Code: ${resolvedDeptCode} | Dept: ${dept?.name || 'not found'}`);
    const slaHours = classificaton.slaHours || dept?.sla_hours || 72;
    const slaDeadline = new Date(Date.now() + slaHours * 3600000);
    const ticket = await genTicket();

    // Calculate department confidence (weighted average, max 100%)
    const categoryConfScore = classificaton.confidence * 100;
    const slaScore = (1 - Math.min(slaHours / 120, 1)) * 100;
    const departmentConfidence = Math.min((categoryConfScore * 0.6 + slaScore * 0.4), 100);
    const isCritical = classificaton.priority === 'critical';

    // Log with emphasis for critical cases
    if (isCritical) {
      console.log(`\n🚨🚨🚨 [CRITICAL COMPLAINT] Ticket: ${ticket} 🚨🚨🚨`);
      console.log(`   ⚠️  Priority: CRITICAL`);
      console.log(`   📍 Category: ${classificaton.category.toUpperCase()}`);
      console.log(`   🏢 Category Confidence: ${(classificaton.confidence * 100).toFixed(2)}%`);
      console.log(`   🎯 Department: ${dept?.name || classificaton.deptName}`);
      console.log(`   🎯 Department Routing Confidence: ${departmentConfidence.toFixed(2)}%`);
      console.log(`   ⏱️  URGENT SLA: ${slaHours}h (${new Date(slaDeadline).toLocaleString()})`);
      console.log(`🚨🚨🚨\n`);
    } else {
      console.log(`\n📋 [COMPLAINT FILED] Ticket: ${ticket}`);
      console.log(`   Category: ${classificaton.category}`);
      console.log(`   Category Confidence: ${(classificaton.confidence * 100).toFixed(2)}%`);
      console.log(`   Department: ${dept?.name || classificaton.deptName}`);
      console.log(`   Department Routing Confidence: ${departmentConfidence.toFixed(2)}%`);
      console.log(`   Priority: ${classificaton.priority}`);
      console.log(`   SLA Hours: ${slaHours}\n`);
    }

    // ── Automatic Geocoding ──────────────────────────────────────────────────
    let finalLatitude = latitude;
    let finalLongitude = longitude;
    let finalAddress = address;
    let geocodingAttempted = false;

    // ── IMAGE ANALYSIS (if enabled and images provided) ───────────────────────
    if (imagesForStorage.length > 0) {
      const catInfo = imageProcessingService.getCategoryInfo(classificaton.category);
      
      console.log(`\n📸 [IMAGE UPLOAD DETECTED] - ${imagesForStorage.length} image(s) provided`);
      console.log(`   📍 Expected Category: ${classificaton.category.toUpperCase()}`);
      console.log(`   🏢 Expected Department: ${catInfo.dept}`);
      console.log(`   ⚡ Expected Priority: ${catInfo.priority.toUpperCase()}`);
      console.log(`   📊 Category Confidence: ${(classificaton.confidence * 100).toFixed(2)}%\n`);

      // Process each image if image layer is enabled
      if (USE_ENHANCED_CLASSIFICATION && enhancedOrchestrator) {
        try {
          for (let i = 0; i < Math.min(imageBuffers.length, 3); i++) {
            const imgBuffer = imageBuffers[i];
            if (!imgBuffer) continue;

            const analysisResult = await imageProcessingService.processImage(
              imgBuffer,
              classificaton.category,
              description
            );

            // Extract consolidated result
            const consolidated = analysisResult.consolidated || {};
            const finalConfidence = parseFloat((consolidated.overallConfidence * 100).toFixed(2));

            const statusIcon = consolidated.status === 'VERIFIED' ? '✅' :
              consolidated.status === 'MISMATCH' ? '❌' : '⚠️ ';
            console.log(`${statusIcon} [IMAGE #${i + 1}]`);

            // Show local analysis if available
            if (analysisResult.local) {
              const localConf = parseFloat((analysisResult.local.confidence * 100).toFixed(2));
              console.log(`   📊 Local Analysis: ${localConf}% | Features: ${analysisResult.local.features.join(', ') || 'none'}`);
            }

            // Show unified Gemini validation if available
            if (analysisResult.gemini) {
              const geminiConf = parseFloat((analysisResult.gemini.confidence * 100).toFixed(2));
              const coherence = parseFloat((analysisResult.gemini.textImageCoherence * 100).toFixed(2));
              console.log(`   🤖 Unified Validation (Text + Image):`);
              console.log(`      Text-Image Coherence: ${coherence}%`);
              console.log(`      Category Match (Text): ${analysisResult.gemini.categoryMatchesText ? 'Yes' : 'No'}`);
              console.log(`      Category Match (Image): ${analysisResult.gemini.categoryMatchesImage ? 'Yes' : 'No'}`);
              console.log(`      Validation: ${analysisResult.gemini.finalValidation}`);
              console.log(`      Gemini Confidence: ${geminiConf}%`);

              // If MISMATCH, show detailed analysis of what's in the image
              if (consolidated.status === 'MISMATCH' || analysisResult.gemini.textImageMatch === 'mismatch') {
                console.log(`\n   🔍 MISMATCH ANALYSIS - Why image and issue don't match:`);

                if (analysisResult.gemini.detectedObjects && analysisResult.gemini.detectedObjects.length > 0) {
                  console.log(`      📷 What's actually in the image: ${analysisResult.gemini.detectedObjects.join(', ')}`);
                } else {
                  console.log(`      📷 What's in the image: Unable to detect specific objects`);
                }

                if (analysisResult.gemini.issues && analysisResult.gemini.issues !== 'none') {
                  console.log(`      ⚠️  Issues detected: ${analysisResult.gemini.issues}`);
                } else {
                  console.log(`      ⚠️  The image content does not match the complaint category`);
                }

                console.log(`      ❌ Category Analysis:`);
                console.log(`         - Expected category: ${classificaton.category}`);
                console.log(`         - Matches complaint text: ${analysisResult.gemini.categoryMatchesText ? 'Yes ✅' : 'No ❌'}`);
                console.log(`         - Matches image content: ${analysisResult.gemini.categoryMatchesImage ? 'Yes ✅' : 'No ❌'}`);

                if (analysisResult.gemini.explanation) {
                  console.log(`      📝 Explanation: ${analysisResult.gemini.explanation}`);
                }
                console.log();
              }
            }

            // Show final result
            console.log(`   ✨ Final: ${consolidated.status} | Complaint-Image Alignment: ${parseFloat((consolidated.complaintImageAlignment * 100).toFixed(2))}% | Category Valid: ${consolidated.categoryValid ? 'Yes' : 'No'} | Confidence: ${finalConfidence}% | ${consolidated.requiresReview ? '🚨 NEEDS_REVIEW' : 'OK'}`);
          }
        } catch (imgErr) {
          console.warn('[ImageAnalysis] Processing failed:', imgErr.message);
        }
      } else if (imagesForStorage.length > 0) {
        // Show without processing if enhanced not enabled
        const catInfo = imageProcessingService.getCategoryInfo(classificaton.category);
        console.log(`   [Images will be processed if enhanced classification is enabled]`);
      }
    }

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

    // ── Store complaint with all classification data ──────────────────────────
    // Helper function to truncate strings to 50 chars (for varchar(50) columns)
    const truncateTo50 = (str) => str ? str.substring(0, 50) : null;

    // Extract category name (before parenthesis if it has description)
    // e.g., "electricity (power cuts, transformer issues...)" → "electricity"
    const extractCategoryName = (cat) => {
      if (!cat) return null;
      const match = cat.match(/^([^(]+)/);
      return match ? match[1].trim() : cat;
    };

    // Convert keywords array to PostgreSQL array format
    // Format: {keyword1,keyword2} or null if empty
    let keywordsArray = null;
    if (Array.isArray(classificaton.keywords) && classificaton.keywords.length > 0) {
      // PostgreSQL array format: {item1,item2,item3}
      keywordsArray = classificaton.keywords.slice(0, 10); // Limit to 10 keywords
    } else if (typeof classificaton.keywords === 'string' && classificaton.keywords.trim()) {
      // If it's already a string, split it
      keywordsArray = classificaton.keywords.split(',').map(k => k.trim()).slice(0, 10);
    }

    const complaintData = {
      ticket_number:ticket, citizen_id:req.user.id,
      title:truncateTo50(finalTitle), description:description||audio_transcript||'', audio_transcript:audio_transcript||null,
      category:extractCategoryName(classificaton.category), sub_category:truncateTo50(classificaton.subCategory)||null,
      nlp_category:extractCategoryName(classificaton.category), nlp_confidence:classificaton.confidence, nlp_keywords:keywordsArray, sentiment:truncateTo50(classificaton.sentiment||'neutral'),
      priority:truncateTo50(classificaton.priority), status:truncateTo50('pending'),
      latitude:finalLatitude||null, longitude:finalLongitude||null, address:truncateTo50(finalAddress)||null,
      landmark:truncateTo50(landmark)||null, pincode:truncateTo50(pincode)||null,
      state_id:state_id||null, district_id:district_id||null, corporation_id:corporation_id||null,
      municipality_id:municipality_id||null, taluka_id:taluka_id||null,
      mandal_id:mandal_id||null, gram_panchayat_id:gram_panchayat_id||null,
      images:imagesForStorage,
      department_id:dept?.id||null, sla_deadline:slaDeadline.toISOString(),
      sla_hours_allotted:slaHours, is_public, is_anonymous, escalation_level:0, view_count:0
    };

    // Add enhanced metadata if available (stored in notes, not as separate columns)
    // Note: enhanced metadata is preserved in timeline notes
    if (enhancedMetadata) {
      // Enhanced metadata is logged in timeline, not stored as column
    }

    const { data: complaint, error } = await supabase.from('complaints').insert(complaintData).select().single();

    if (error) { console.error('fileComplaint insert error:', error); return res.status(500).json({ error: 'Failed to file complaint. Please try again.' }); }

    // ── Auto-assign to officer by dept + district ─────────────────────────────
    if (complaint && dept?.id) {
      const assignedOfficerId = await autoAssignOfficer(complaint.id, dept.id, district_id || null);
      if (assignedOfficerId) {
        complaint.assigned_officer_id = assignedOfficerId;
        complaint.status = 'assigned';
        console.log(`[AutoAssign] Complaint ${complaint.ticket_number} assigned to officer ${assignedOfficerId}`);
      }
    }

    // ── Timeline with enhanced classification notes ────────────────────────────
    let timelineNotes = `Auto-classified: ${classificaton.category}. Routed to ${dept?.name || classificaton.deptName}. SLA: ${slaHours}h`;

    if (enhancedMetadata) {
      if (enhancedMetadata.all_labels.length > 1) {
        timelineNotes += ` Multi-label: [${enhancedMetadata.all_labels.join(', ')}]`;
      }
      if (enhancedMetadata.requires_review) {
        timelineNotes += ' [REQUIRES_REVIEW]';
      }
      if (enhancedMetadata.gemini_adjusted) {
        timelineNotes += ' [GEMINI_ADJUSTED]';
      }
      timelineNotes += ` (Enhanced: ${Object.keys(enhancedMetadata.enhancements_applied).filter(k => enhancedMetadata.enhancements_applied[k]).join(', ')})`;
    }

    timelineNotes += geocodingAttempted ? (finalLatitude ? ' [GPS_AUTO_LOCATED]' : ' [GPS_LOOKUP_FAILED]') : '';

    await supabase.from('complaint_timeline').insert({
      complaint_id: complaint.id, actor_id: req.user.id, actor_role: 'citizen', action: 'created',
      new_value: 'pending', notes: timelineNotes
    });

    // Duplicate check (non-blocking)
    _checkDuplicates(complaint).catch(console.error);

    // Points
    await addCitizenPoints(req.user.id, POINTS.COMPLAINT_FILED);

    // Notify citizen and officers via notification service
    const { data: citizen } = await supabase.from('users').select('id,email,phone,full_name').eq('id', req.user.id).single();
    let officers = [];
    if (dept?.id) {
      const { data: officerRows } = await supabase.from('users').select('id,email,phone').eq('department_id', dept.id).eq('role', 'officer').eq('is_active', true);
      officers = officerRows || [];
    }
    notificationService.notifyComplaintFiled(complaint, citizen || req.user, dept, officers).catch(err => console.error('[Notification] notifyComplaintFiled failed:', err.message));

    return res.status(201).json({
      message: 'Complaint filed successfully',
      complaint,
      auto_detection: {
        category: classificaton.category, department: dept?.name || classificaton.deptName, priority: classificaton.priority,
        slaHours, confidence: classificaton.confidence, routing_reason: classificaton.deptExplanation,
        geocoding: geocodingAttempted ? {
          attempted: true,
          success: !!finalLatitude,
          coordinates: finalLatitude ? { latitude: finalLatitude, longitude: finalLongitude } : null
        } : { attempted: false }
      }
    });
  } catch (err) {
    console.error('fileComplaint:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Duplicate detection (internal helper) ────────────────────────────────────
const _checkDuplicates = async (newC) => {
  if (!newC.latitude || !newC.longitude) return;
  const since = new Date(Date.now() - 30 * 24 * 3600000).toISOString();
  const { data: nearby } = await supabase.from('complaints')
    .select('id,title,description,latitude,longitude,category,parent_complaint_id,duplicate_count,citizen_id,priority')
    .eq('category', newC.category).neq('id', newC.id).neq('status', 'rejected').gte('created_at', since);
  if (!nearby?.length) return;
  let parentId = null;
  for (const c of nearby) {
    if (nlp.isDuplicate(newC, c, 500, 0.2)) { parentId = c.parent_complaint_id || c.id; break; }
  }
  if (!parentId) return;
  await supabase.from('complaints').update({ is_duplicate: true, parent_complaint_id: parentId }).eq('id', newC.id);
  const { data: parent } = await supabase.from('complaints').select('duplicate_count,priority,citizen_id,title').eq('id', parentId).single();
  if (parent) {
    const cnt = (parent.duplicate_count || 0) + 1;
    let p = parent.priority;
    if (cnt >= 10) p = 'critical'; else if (cnt >= 5) p = 'high'; else if (cnt >= 3) p = 'medium';
    await supabase.from('complaints').update({ duplicate_count: cnt, priority: p }).eq('id', parentId);
    if (parent.citizen_id) await addCitizenPoints(parent.citizen_id, POINTS.DUPLICATE_VERIFIED);
    // Notify both: filer (duplicate detected) and parent's citizen (milestone)
    await notificationService.notifyDuplicateDetected(
      { ...newC },
      { id: parentId, citizen_id: parent.citizen_id, title: parent.title },
      cnt
    );
  }
};

// ── Get Complaints ────────────────────────────────────────────────────────────
exports.getComplaints = async (req, res) => {
  try {
    const { status, category, priority, district_id, mandal_id, state_id, department_id, search,
      page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc', is_public } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let q = supabase.from('complaints').select(`
      id,ticket_number,title,description,category,sub_category,status,priority,
      latitude,longitude,address,is_public,is_anonymous,is_duplicate,duplicate_count,
      upvote_count,comment_count,images,created_at,updated_at,sla_deadline,sla_breached,
      sla_hours_allotted,escalation_level,escalated_to,citizen_id,assigned_officer_id,
      department_id,state_id,district_id,mandal_id,nlp_confidence,nlp_category,
      departments:department_id(name,code),
      states:state_id(name), districts:district_id(name), mandals:mandal_id(name),
      users:citizen_id(full_name)
    `, { count: 'exact' });

    const role = req.user?.role;
    const isMyComplaintsRoute = req.path?.includes('/my') || req.originalUrl?.includes('/my');
    if (isMyComplaintsRoute) {
      q = q.eq('citizen_id', req.user.id);
      // PostgREST filter syntax for LIKE uses * wildcard in query strings.
      q = q.or(`rejection_reason.is.null,rejection_reason.not.like.${CITIZEN_DELETE_REASON_PREFIX}*`);
    } else if (!role || role === 'citizen') {
      q = q.eq('is_public', true);
    }
    // officer / admin / super_admin see ALL complaints

    if (status) q = q.eq('status', status);
    if (category) q = q.eq('category', category);
    if (priority) q = q.eq('priority', priority);
    if (department_id) q = q.eq('department_id', department_id);
    if (district_id) q = q.eq('district_id', district_id);
    if (mandal_id) q = q.eq('mandal_id', mandal_id);
    if (state_id) q = q.eq('state_id', state_id);
    if (is_public !== undefined) q = q.eq('is_public', is_public === 'true');
    if (search) q = q.or(`title.ilike.%${search}%,description.ilike.%${search}%,ticket_number.ilike.%${search}%`);

    q = q.order(sortBy, { ascending: sortOrder === 'asc' }).range(offset, offset + parseInt(limit) - 1);
    const { data, error, count } = await q;
    if (error) return res.status(500).json({ error: 'Failed to fetch complaints' });

    const masked = (data || []).map(c => ({
      ...c,
      citizen_id: c.is_anonymous ? null : c.citizen_id,
      reporter_name: c.is_anonymous ? 'Anonymous' : (c.users?.full_name || null),
      is_own_dept: role === 'officer' ? c.department_id === req.user?.department_id : undefined
    }));

    return res.json({ complaints: masked, pagination: { page: parseInt(page), limit: parseInt(limit), total: count || 0, totalPages: Math.ceil((count || 0) / parseInt(limit)) } });
  } catch (err) {
    console.error('getComplaints:', err);
    return res.status(500).json({ error: 'Internal server error' });
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
    `).eq('id', id).single();

    if (error || !complaint) return res.status(404).json({ error: 'Complaint not found' });
    const isCitizenDeleted = complaint.rejection_reason?.startsWith(CITIZEN_DELETE_REASON_PREFIX);
    if (isCitizenDeleted && req.user?.id === complaint.citizen_id && req.user?.role === 'citizen') {
      return res.status(404).json({ error: 'Complaint not found' });
    }
    if (!complaint.is_public && req.user?.id !== complaint.citizen_id && !['officer', 'admin', 'super_admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'This complaint is private' });
    }

    await supabase.from('complaints').update({ view_count: (complaint.view_count || 0) + 1 }).eq('id', id);

    const [{ data: timeline }, { data: comments }, { data: linked }] = await Promise.all([
      supabase.from('complaint_timeline').select('*,users:actor_id(full_name,role)').eq('complaint_id', id).order('created_at'),
      supabase.from('comments').select('*,users:user_id(full_name,role,badge_level,govt_badge)').eq('complaint_id', id).eq('is_deleted', false).order('created_at'),
      supabase.from('complaints').select('id,ticket_number,title,created_at,address').eq('parent_complaint_id', id).limit(20)
    ]);

    let userUpvoted = false;
    if (req.user) {
      const { data: uv } = await supabase.from('upvotes').select('id').eq('complaint_id', id).eq('user_id', req.user.id).single();
      userUpvoted = !!uv;
    }

    const reporterName = complaint.is_anonymous ? 'Anonymous' : (complaint.users?.full_name || null);
    return res.json({ complaint: { ...complaint, reporter_name: reporterName, view_count: (complaint.view_count || 0) + 1 }, timeline: timeline || [], comments: comments || [], linkedComplaints: linked || [], userUpvoted });
  } catch (err) {
    console.error('getComplaintById:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Update Status ─────────────────────────────────────────────────────────────
exports.updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, rejection_reason, proof_images = [] } = req.body;

    if (!status) return res.status(400).json({ error: 'Status is required' });

    const { data: complaint } = await supabase.from('complaints').select('*').eq('id', id).single();
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    // Officers can only act on complaints in their department
    if (req.user.role === 'officer') {
      const officerDept = req.user.department_id ? String(req.user.department_id) : null;
      const complaintDept = complaint.department_id ? String(complaint.department_id) : null;
      if (!officerDept) {
        return res.status(403).json({ error: 'Your account has no department assigned. Contact admin.' });
      }
      if (complaintDept && officerDept !== complaintDept) {
        return res.status(403).json({ error: 'You can only update complaints assigned to your department' });
      }
    }

    if (status === 'resolved') {
      if (!notes?.trim()) return res.status(400).json({ error: 'Resolution notes are required' });
      if (!proof_images?.length) return res.status(400).json({ error: 'Proof-of-work photos are required to resolve a complaint' });
    }
    if (status === 'rejected' && !rejection_reason?.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const now = new Date().toISOString();
    const update = { status, updated_at: now };
    if (status === 'resolved') {
      update.resolved_at = now;
      update.resolution_notes = notes;
      update.proof_images = proof_images;
      update.sla_breached = complaint.sla_deadline ? new Date() > new Date(complaint.sla_deadline) : false;
    }
    if (status === 'rejected') update.rejection_reason = rejection_reason;
    if (status === 'in_progress') update.escalation_level = 0;

    const { data: updated, error } = await supabase.from('complaints').update(update).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: 'Failed to update' });

    await supabase.from('complaint_timeline').insert({
      complaint_id: id, actor_id: req.user.id, actor_role: req.user.role,
      action: 'status_changed', old_value: complaint.status, new_value: status,
      notes: notes || rejection_reason || `Status updated to ${status}`
    });

    if (status === 'resolved' && req.user.role === 'officer' && req.user.department_id) {
      await addOfficerPoints(req.user.id, req.user.department_id, complaint.priority, !updated.sla_breached);
      if (complaint.citizen_id) {
        await addCitizenPoints(complaint.citizen_id, POINTS.COMPLAINT_RESOLVED);
      }
    }

    // Unified notification via service (handles in-app + email + SMS per matrix)
    if (complaint.citizen_id) {
      const { data: citizen } = await supabase.from('users').select('id,email,phone,full_name').eq('id', complaint.citizen_id).single();
      notificationService.notifyStatusUpdate(complaint, citizen, status, notes || rejection_reason).catch(err => console.error('[Notification] notifyStatusUpdate failed:', err.message));
    }

    // ── WhatsApp notification (non-blocking) ─────────────────────
    if (complaint.citizen_id) {
      const { data: citizen } = await supabase.from('users').select('phone').eq('id', complaint.citizen_id).single();
      if (citizen?.phone) {
        notifyStatusChange(citizen.phone, complaint.ticket_number, status, rejection_reason, complaint.title).catch(console.error);
      }
    }

    return res.json({ message: 'Status updated', complaint: updated });
  } catch (err) {
    console.error('updateComplaintStatus:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Assign Complaint ──────────────────────────────────────────────────────────
exports.assignComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { officer_id, department_id, notes } = req.body;
    const { data: c } = await supabase.from('complaints').select('*').eq('id', id).single();
    if (!c) return res.status(404).json({ error: 'Not found' });
    const { data: updated } = await supabase.from('complaints').update({ assigned_officer_id: officer_id, department_id: department_id || c.department_id, assigned_at: new Date().toISOString(), status: 'assigned' }).eq('id', id).select().single();
    await supabase.from('complaint_timeline').insert({ complaint_id: id, actor_id: req.user.id, actor_role: req.user.role, action: 'assigned', notes });
    if (officer_id) {
      const { data: officer } = await supabase.from('users').select('id,email,phone').eq('id', officer_id).single();
      notificationService.notifyOfficerAssignment(c, officer || { id: officer_id }).catch(() => { });
    }
    return res.json({ message: 'Assigned', complaint: updated });
  } catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
};

// ── Upvote ───────────────────────────────────────────────────────────────────
exports.upvoteComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: existing } = await supabase.from('upvotes').select('id').eq('complaint_id', id).eq('user_id', req.user.id).single();
    if (existing) {
      await supabase.from('upvotes').delete().eq('id', existing.id);
      return res.json({ upvoted: false });
    }
    await supabase.from('upvotes').insert({ complaint_id: id, user_id: req.user.id });
    const { data: c } = await supabase.from('complaints').select('citizen_id').eq('id', id).single();
    if (c?.citizen_id && c.citizen_id !== req.user.id) await addCitizenPoints(c.citizen_id, POINTS.UPVOTE_RECEIVED);
    return res.json({ upvoted: true });
  } catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
};

// ── Hotspots ─────────────────────────────────────────────────────────────────
exports.getHotspots = async (req, res) => {
  try {
    const { state_id, district_id, mandal_id, category, days = 30 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 24 * 3600000).toISOString();
    let q = supabase.from('complaints').select('id,latitude,longitude,category,priority,status,address,title,escalation_level,is_anonymous').eq('is_public', true).not('latitude', 'is', null).gte('created_at', since);
    if (state_id) q = q.eq('state_id', state_id);
    if (district_id) q = q.eq('district_id', district_id);
    if (mandal_id) q = q.eq('mandal_id', mandal_id);
    if (category) q = q.eq('category', category);
    const { data, error } = await q.limit(1500);
    if (error) return res.status(500).json({ error: 'Failed' });
    return res.json({ hotspots: data || [] });
  } catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
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
    const [total, pending, inProgress, resolved, escalated] = await Promise.all([
      supabase.from('complaints').select('*', { count: 'exact', head: true }),
      supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
      supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'escalated')
    ]);

    const { data: catRaw } = await supabase.from('complaints').select('category');
    const catCounts = {};
    (catRaw || []).forEach(c => (catCounts[c.category] = (catCounts[c.category] || 0) + 1));
    const byCategory = Object.entries(catCounts).map(([cat, count]) => ({ category: cat, count })).sort((a, b) => b.count - a.count);

    const { data: mRaw } = await supabase.from('complaints').select('created_at').gte('created_at', new Date(Date.now() - 180 * 24 * 3600000).toISOString());
    const monthly = {};
    (mRaw || []).forEach(c => { const m = new Date(c.created_at).toISOString().substring(0, 7); monthly[m] = (monthly[m] || 0) + 1; });

    return res.json({
      stats: { total: total.count || 0, pending: pending.count || 0, inProgress: inProgress.count || 0, resolved: resolved.count || 0, escalated: escalated.count || 0, resolutionRate: total.count ? ((resolved.count / total.count) * 100).toFixed(1) : '0' },
      byCategory,
      monthlyTrends: Object.entries(monthly).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month))
    });
  } catch (err) {
    console.error('getDashboardStats:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


// ── Citizen Delete Complaint ────────────────────────────────────────────────
exports.getCitizenDeleteReasons = async (_req, res) => {
  return res.json({ reasons: CITIZEN_DELETE_REASONS });
};

exports.deleteComplaintByCitizen = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason_code, reason_text } = req.body || {};

    if (!reason_code) return res.status(400).json({ error: 'Deletion reason is required' });

    const selectedReason = CITIZEN_DELETE_REASONS.find(r => r.code === reason_code);
    if (!selectedReason) return res.status(400).json({ error: 'Invalid deletion reason' });
    if (reason_code === 'other' && !reason_text?.trim()) {
      return res.status(400).json({ error: 'Please provide details for "Other reason"' });
    }

    const { data: complaint, error: fetchError } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !complaint) return res.status(404).json({ error: 'Complaint not found' });
    if (complaint.citizen_id !== req.user.id) return res.status(403).json({ error: 'You can only delete your own complaint' });
    if (complaint.rejection_reason?.startsWith(CITIZEN_DELETE_REASON_PREFIX)) {
      return res.status(400).json({ error: 'Complaint is already deleted' });
    }

    const now = new Date().toISOString();
    const reasonPayload = `${CITIZEN_DELETE_REASON_PREFIX}${reason_code}|${(reason_text || '').trim()}`;

    const { data: updated, error: updateError } = await supabase
      .from('complaints')
      .update({
        status: 'closed',
        is_public: false,
        rejection_reason: reasonPayload,
        updated_at: now
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('deleteComplaintByCitizen update:', updateError);
      return res.status(500).json({ error: 'Failed to delete complaint' });
    }

    await supabase.from('complaint_timeline').insert({
      complaint_id: id,
      actor_id: req.user.id,
      actor_role: 'citizen',
      action: 'deleted_by_citizen',
      old_value: complaint.status,
      new_value: 'closed',
      notes: `Complaint deleted by citizen. Reason: ${selectedReason.label}${reason_text?.trim() ? ` (${reason_text.trim()})` : ''}`
    });

    return res.json({
      message: 'Complaint deleted successfully',
      complaint: updated
    });
  } catch (err) {
    console.error('deleteComplaintByCitizen:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};



exports.upvoteComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: existing } = await supabase.from('upvotes').select('id').eq('complaint_id', id).eq('user_id', req.user.id).single();
    if (existing) {
      await supabase.from('upvotes').delete().eq('id', existing.id);
      return res.json({ upvoted: false });
    }
    await supabase.from('upvotes').insert({ complaint_id: id, user_id: req.user.id });
    const { data: c } = await supabase.from('complaints').select('citizen_id').eq('id', id).single();
    if (c?.citizen_id && c.citizen_id !== req.user.id) await addCitizenPoints(c.citizen_id, POINTS.UPVOTE_RECEIVED);
    return res.json({ upvoted: true });
  } catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
};

