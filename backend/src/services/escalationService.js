'use strict';
const { supabase } = require('../config/supabase');
const notificationService = require('./notificationService');
const { notifyStatusChange } = require('./whatsappService');

const ESCALATION_TO = { 1:'Department Head', 2:'District Officer', 3:'Commissioner' };
const UPGRADE = { low:'medium', medium:'high', high:'critical', critical:'critical' };

const runEscalation = async () => {
  try {
    const now = new Date().toISOString();
    const { data: overdue } = await supabase
      .from('complaints')
      .select('id,title,ticket_number,priority,department_id,citizen_id,escalation_level,status')
      .in('status',['pending','assigned','in_progress'])
      .not('sla_deadline','is',null)
      .lt('sla_deadline',now);

    if (!overdue?.length) return;
    console.log(`[Escalation] Processing ${overdue.length} overdue complaints`);

    for (const c of overdue) {
      const lvl = Math.min((c.escalation_level||0)+1, 3);
      const newPriority = UPGRADE[c.priority]||'high';
      const newDeadline = new Date(Date.now()+24*3600000).toISOString();

      await supabase.from('complaints').update({
        status:'escalated', priority:newPriority, sla_breached:true,
        escalation_level:lvl, escalated_to:ESCALATION_TO[lvl],
        escalated_at:now, sla_deadline:newDeadline
      }).eq('id',c.id);

      await supabase.from('complaint_timeline').insert({
        complaint_id:c.id, actor_role:'system', action:'auto_escalated',
        old_value:c.priority, new_value:newPriority,
        notes:`SLA breached. Auto-escalated to ${ESCALATION_TO[lvl]} (Level ${lvl}).`
      });

      if (c.citizen_id) {
        await supabase.from('notifications').insert({
          user_id:c.citizen_id, type:'escalation',
          title:'🔺 Complaint Escalated',
          message:`Your complaint "${c.title}" (${c.ticket_number}) escalated to ${ESCALATION_TO[lvl]}.`,
          complaint_id:c.id
        });
        // WhatsApp notification
        const { data: citizen } = await supabase.from('users').select('phone').eq('id', c.citizen_id).single();
        if (citizen?.phone) notifyStatusChange(citizen.phone, c.ticket_number, 'escalated').catch(console.error);
      }

      if (lvl >= 2) {
        const { data: adminRows } = await supabase.from('users').select('id,email').in('role',['admin','super_admin']).eq('is_active',true).limit(5);
        admins = adminRows || [];
      }
      await notificationService.notifyEscalation(
        { ...c, title: c.title, ticket_number: c.ticket_number, priority: newPriority },
        lvl,
        admins
      );
    }
  } catch (err) { console.error('[Escalation] Error:', err.message); }
};

const startScheduler = () => {
  runEscalation();
  setInterval(runEscalation, 30*60*1000);
  console.log('[Escalation] Scheduler started — runs every 30 minutes');
};

module.exports = { startScheduler, runEscalation };
