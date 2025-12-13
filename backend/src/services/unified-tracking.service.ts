import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization of Supabase client
let getTripwireSupabase(): SupabaseClient | null = null;

function getTripwireSupabase() {
  if (!getTripwireSupabase()) {
    getTripwireSupabase() = createClient(
      process.env.TRIPWIRE_SUPABASE_URL || '',
      process.env.TRIPWIRE_SUPABASE_SERVICE_KEY || ''
    );
  }
  return getTripwireSupabase();
}

export class UnifiedTrackingService {
  /**
   * Get all leads with aggregated statistics
   */
  async getAllLeads() {
    const { data, error } = await getTripwireSupabase()
      .from('unified_lead_tracking')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const stats = {
      total_leads: data?.length || 0,
      email_sent: data?.filter(l => l.email_sent).length || 0,
      email_opened: data?.filter(l => l.email_opened).length || 0,
      email_clicked: data?.filter(l => l.email_clicked).length || 0,
      email_failed: data?.filter(l => l.email_failed).length || 0,
      sms_sent: data?.filter(l => l.sms_sent).length || 0,
      sms_delivered: data?.filter(l => l.sms_delivered).length || 0,
      sms_clicked: data?.filter(l => l.sms_clicked).length || 0,
      sms_failed: data?.filter(l => l.sms_failed).length || 0,
      landing_visited: data?.filter(l => l.landing_visited).length || 0,
      proftest_leads: data?.filter(l => l.source === 'proftest').length || 0,
    };

    return { stats, leads: data || [] };
  }

  /**
   * Get lead by email
   */
  async getLeadByEmail(email: string) {
    const { data, error } = await getTripwireSupabase()
      .from('unified_lead_tracking')
      .select('*')
      .eq('email', email)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Get lead by source_lead_id (landing_leads.id)
   */
  async getLeadBySourceId(sourceLeadId: string) {
    const { data, error } = await getTripwireSupabase()
      .from('unified_lead_tracking')
      .select('*')
      .eq('source_lead_id', sourceLeadId)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Track landing visit
   */
  async trackLandingVisit(email: string) {
    const lead = await this.getLeadByEmail(email);
    if (!lead) return null;

    const { error } = await getTripwireSupabase()
      .from('unified_lead_tracking')
      .update({
        landing_visited: true,
        landing_visit_at: new Date().toISOString(),
        landing_visit_count: (lead.landing_visit_count || 0) + 1,
      })
      .eq('id', lead.id);

    if (error) throw error;
    return lead.id;
  }

  /**
   * Update email status
   */
  async updateEmailStatus(
    leadId: string,
    status: 'opened' | 'clicked' | 'failed',
    reason?: string
  ) {
    const updateData: any = {};

    if (status === 'opened') {
      updateData.email_opened = true;
      updateData.email_opened_at = new Date().toISOString();
    } else if (status === 'clicked') {
      updateData.email_clicked = true;
      updateData.email_clicked_at = new Date().toISOString();
    } else if (status === 'failed') {
      updateData.email_failed = true;
      updateData.email_failed_reason = reason;
    }

    const { error } = await getTripwireSupabase()
      .from('unified_lead_tracking')
      .update(updateData)
      .eq('id', leadId);

    if (error) throw error;
  }

  /**
   * Update SMS status
   */
  async updateSMSStatus(
    leadId: string,
    status: 'delivered' | 'clicked' | 'failed',
    reason?: string
  ) {
    const updateData: any = {};

    if (status === 'delivered') {
      updateData.sms_delivered = true;
      updateData.sms_delivered_at = new Date().toISOString();
    } else if (status === 'clicked') {
      updateData.sms_clicked = true;
      updateData.sms_clicked_at = new Date().toISOString();
    } else if (status === 'failed') {
      updateData.sms_failed = true;
      updateData.sms_failed_reason = reason;
    }

    const { error } = await getTripwireSupabase()
      .from('unified_lead_tracking')
      .update(updateData)
      .eq('id', leadId);

    if (error) throw error;
  }
}

export const unifiedTrackingService = new UnifiedTrackingService();
