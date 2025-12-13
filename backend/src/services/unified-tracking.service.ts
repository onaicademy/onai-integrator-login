import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization of Supabase client (using LANDING Supabase)
let landingSupabase: SupabaseClient | null = null;

function getLandingSupabase() {
  if (!landingSupabase) {
    const url = process.env.LANDING_SUPABASE_URL || '';
    const key = process.env.LANDING_SUPABASE_SERVICE_KEY || '';
    
    console.log('🔧 [unified-tracking] Creating Supabase client:');
    console.log('   URL exists:', !!url, url ? `(${url.substring(0, 30)}...)` : '(empty)');
    console.log('   KEY exists:', !!key, key ? `(${key.substring(0, 20)}...)` : '(empty)');
    
    landingSupabase = createClient(url, key);
  }
  return landingSupabase;
}

export class UnifiedTrackingService {
  /**
   * Get all leads with aggregated statistics
   */
  async getAllLeads() {
    const { data, error } = await getLandingSupabase()
      .from('landing_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const stats = {
      total_leads: data?.length || 0,
      email_sent: data?.filter(l => l.email_sent).length || 0,
      email_opened: data?.filter(l => l.email_opened).length || 0,
      email_clicked: data?.filter(l => l.email_clicked).length || 0,
      email_failed: data?.filter(l => l.email_error).length || 0,
      sms_sent: data?.filter(l => l.sms_sent).length || 0,
      sms_delivered: data?.filter(l => l.sms_delivered).length || 0,
      sms_clicked: data?.filter(l => l.sms_clicked).length || 0,
      sms_failed: data?.filter(l => l.sms_error).length || 0,
      landing_visited: data?.filter(l => l.landing_visited).length || 0,
      proftest_leads: data?.filter(l => l.source && l.source.includes('proftest')).length || 0,
    };

    // Map landing_leads fields to unified format for frontend compatibility
    const mappedLeads = (data || []).map(lead => ({
      ...lead,
      full_name: lead.name, // Map name → full_name
      source_lead_id: lead.id,
    }));

    return { stats, leads: mappedLeads };
  }

  /**
   * Get lead by email
   */
  async getLeadByEmail(email: string) {
    const { data, error } = await getLandingSupabase()
      .from('landing_leads')
      .select('*')
      .eq('email', email)
      .single();

    if (error) return null;
    return {
      ...data,
      full_name: data.name,
      source_lead_id: data.id,
    };
  }

  /**
   * Get lead by source_lead_id (landing_leads.id)
   */
  async getLeadBySourceId(sourceLeadId: string) {
    const { data, error } = await getLandingSupabase()
      .from('landing_leads')
      .select('*')
      .eq('id', sourceLeadId)
      .single();

    if (error) return null;
    return {
      ...data,
      full_name: data.name,
      source_lead_id: data.id,
    };
  }

  /**
   * Track landing visit
   */
  async trackLandingVisit(email: string) {
    const lead = await this.getLeadByEmail(email);
    if (!lead) return null;

    const { error } = await getLandingSupabase()
      .from('landing_leads')
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

    const { error } = await getLandingSupabase()
      .from('landing_leads')
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

    const { error } = await getLandingSupabase()
      .from('landing_leads')
      .update(updateData)
      .eq('id', leadId);

    if (error) throw error;
  }
}

export const unifiedTrackingService = new UnifiedTrackingService();
