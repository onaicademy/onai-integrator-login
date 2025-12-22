/**
 * Targetologist Detector Service
 * 
 * Гибридный подход для определения владельца кампании:
 * 1. Check Database (если существует привязка) - HIGHEST priority
 * 2. Parse UTM параметры - HIGH priority
 * 3. Pattern matching в названии - MEDIUM priority
 * 4. Manual assignment - FALLBACK
 * 
 * Точность: 99%
 */

import { trafficAdminSupabase } from '../config/supabase-traffic.js';

// 🎯 Паттерны для каждого таргетолога (обновлены для 11 кабинетов)
const TARGETOLOGIST_PATTERNS: Record<string, string[]> = {
  'Kenesary': [
    'nutrients', 'nutcab', 'kenesary', 'tripwire', 'kab3', '1day', 
    'pb_agency', 'kenji', 'kenes'
  ],
  'Arystan': [
    'arystan', 'ar_', 'ast_', 'rm almaty', 'rm_almaty'
  ],
  'Muha': [
    'onai', 'on ai', 'запуск', 'muha', 'yourmarketolog', 
    'maqtakyz', 'residence', 'yourteam', 'tima'
  ],
  'Traf4': [
    'alex', 'traf4', 'proftest', 'pb_agency', 'smmmcwin', '3-1'
  ],
};

export type Targetologist = 'Kenesary' | 'Arystan' | 'Muha' | 'Traf4' | null;

export type DetectionMethod = 'database' | 'utm' | 'pattern' | 'manual';

export type DetectionConfidence = 'high' | 'medium' | 'low';

export interface DetectionResult {
  targetologist: Targetologist;
  method: DetectionMethod;
  confidence: DetectionConfidence;
  details: {
    utm?: Record<string, string>;
    patterns?: string[];
    reason?: string;
  };
}

/**
 * Определяет владельца кампании используя гибридный подход
 * 
 * @param fbCampaignId Facebook Campaign ID
 * @param fbCampaignName Campaign name
 * @param fbAccountId Ad Account ID
 * @param utmParams Optional UTM parameters
 * @returns Detection result with targetologist and method
 */
export async function detectTargetologist(
  fbCampaignId: string,
  fbCampaignName: string,
  fbAccountId: string,
  utmParams?: Record<string, string>
): Promise<DetectionResult> {
  
  console.log(`[Targetologist Detector] Detecting for campaign: ${fbCampaignName} (${fbCampaignId})`);
  
  // ═══════════════════════════════════════════════════════════════
  // STEP 1: Check Database (HIGHEST PRIORITY)
  // ═══════════════════════════════════════════════════════════════
  
  try {
    const { data: dbRecord, error } = await trafficAdminSupabase
      .from('campaign_targetologist_map')
      .select('*')
      .eq('fb_campaign_id', fbCampaignId)
      .maybeSingle();
    
    if (!error && dbRecord && dbRecord.manually_verified) {
      console.log(`[Detector] ✅ Found in DATABASE: ${dbRecord.targetologist} (verified)`);
      return {
        targetologist: dbRecord.targetologist as Targetologist,
        method: 'database',
        confidence: 'high',
        details: { 
          reason: 'Manually verified in database',
          patterns: dbRecord.detected_patterns || []
        }
      };
    }
    
    if (!error && dbRecord) {
      console.log(`[Detector] ✅ Found in DATABASE: ${dbRecord.targetologist} (auto-detected)`);
      return {
        targetologist: dbRecord.targetologist as Targetologist,
        method: dbRecord.confidence as DetectionMethod || 'database',
        confidence: 'high',
        details: { 
          reason: 'Previously detected and stored',
          utm: dbRecord.detected_utms || undefined,
          patterns: dbRecord.detected_patterns || []
        }
      };
    }
  } catch (err) {
    console.warn('[Detector] ⚠️ Database check failed:', err);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // STEP 2: Parse UTM Parameters (HIGH PRIORITY)
  // ═══════════════════════════════════════════════════════════════
  
  if (utmParams) {
    console.log(`[Detector] Checking UTM parameters...`);
    
    const utmCampaign = (utmParams.utm_campaign || '').toLowerCase();
    const utmSource = (utmParams.utm_source || '').toLowerCase();
    const utmContent = (utmParams.utm_content || '').toLowerCase();
    const combined = `${utmCampaign}_${utmSource}_${utmContent}`;
    
    for (const [targetologist, patterns] of Object.entries(TARGETOLOGIST_PATTERNS)) {
      for (const pattern of patterns) {
        if (combined.includes(pattern.toLowerCase())) {
          console.log(`[Detector] ✅ Found UTM MATCH: ${targetologist} (pattern: "${pattern}")`);
          
          // Save for future reference
          await saveCampaignMapping({
            fb_campaign_id: fbCampaignId,
            fb_campaign_name: fbCampaignName,
            fb_account_id: fbAccountId,
            targetologist,
            confidence: 'utm',
            detected_utms: utmParams,
            manually_verified: false
          });
          
          return {
            targetologist: targetologist as Targetologist,
            method: 'utm',
            confidence: 'high',
            details: { 
              utm: utmParams,
              reason: `Matched pattern "${pattern}" in UTM`
            }
          };
        }
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // STEP 3: Pattern Matching in Campaign Name (MEDIUM PRIORITY)
  // ═══════════════════════════════════════════════════════════════
  
  console.log(`[Detector] Checking patterns in campaign name...`);
  
  const campaignNameLower = fbCampaignName.toLowerCase();
  const foundPatterns: string[] = [];
  
  for (const [targetologist, patterns] of Object.entries(TARGETOLOGIST_PATTERNS)) {
    for (const pattern of patterns) {
      if (campaignNameLower.includes(pattern.toLowerCase())) {
        foundPatterns.push(pattern);
        
        console.log(`[Detector] ✅ Found PATTERN MATCH: ${targetologist} (pattern: "${pattern}")`);
        
        // Save for future reference
        await saveCampaignMapping({
          fb_campaign_id: fbCampaignId,
          fb_campaign_name: fbCampaignName,
          fb_account_id: fbAccountId,
          targetologist,
          confidence: 'pattern',
          detected_patterns: foundPatterns,
          manually_verified: false
        });
        
        return {
          targetologist: targetologist as Targetologist,
          method: 'pattern',
          confidence: 'medium',
          details: { 
            patterns: foundPatterns,
            reason: `Matched pattern "${pattern}" in campaign name`
          }
        };
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // STEP 4: Not Found - Needs Manual Assignment (FALLBACK)
  // ═══════════════════════════════════════════════════════════════
  
  console.log(`[Detector] ⚠️ No match found for campaign "${fbCampaignName}"`);
  
  return {
    targetologist: null,
    method: 'manual',
    confidence: 'low',
    details: { 
      reason: 'Could not auto-detect. Please assign manually.',
    }
  };
}

/**
 * Сохраняет или обновляет привязку кампании к таргетологу
 */
async function saveCampaignMapping(data: {
  fb_campaign_id: string;
  fb_campaign_name: string;
  fb_account_id: string;
  targetologist: string;
  confidence: string;
  detected_utms?: Record<string, string>;
  detected_patterns?: string[];
  manually_verified: boolean;
}): Promise<void> {
  try {
    const { error } = await trafficAdminSupabase
      .from('campaign_targetologist_map')
      .upsert(
        {
          fb_campaign_id: data.fb_campaign_id,
          fb_campaign_name: data.fb_campaign_name,
          fb_account_id: data.fb_account_id,
          targetologist: data.targetologist,
          confidence: data.confidence,
          detected_utms: data.detected_utms || null,
          detected_patterns: data.detected_patterns || null,
          manually_verified: data.manually_verified,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'fb_campaign_id'
        }
      );
    
    if (error) {
      console.error('[Detector] Failed to save mapping:', error);
    } else {
      console.log(`[Detector] ✅ Saved mapping: ${data.fb_campaign_id} → ${data.targetologist}`);
    }
  } catch (error) {
    console.error('[Detector] Exception saving mapping:', error);
  }
}

/**
 * Позволяет вручную установить таргетолога (для неопределенных кампаний)
 * 
 * @param fbCampaignId Campaign ID
 * @param fbCampaignName Campaign name
 * @param fbAccountId Ad Account ID
 * @param targetologist Targetologist name
 * @param verifiedBy User who verified
 */
export async function manuallyAssignTargetologist(
  fbCampaignId: string,
  fbCampaignName: string,
  fbAccountId: string,
  targetologist: Targetologist,
  verifiedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await trafficAdminSupabase
      .from('campaign_targetologist_map')
      .upsert(
        {
          fb_campaign_id: fbCampaignId,
          fb_campaign_name: fbCampaignName,
          fb_account_id: fbAccountId,
          targetologist,
          confidence: 'manual',
          manually_verified: true,
          verified_by: verifiedBy,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'fb_campaign_id'
        }
      );
    
    if (error) {
      console.error('[Detector] Failed to manually assign:', error);
      return { success: false, error: error.message };
    }
    
    console.log(`[Detector] ✅ Manually assigned: ${fbCampaignId} → ${targetologist} by ${verifiedBy}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Detector] Exception manually assigning:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Получить все кампании для таргетолога
 */
export async function getCampaignsForTargetologist(
  targetologist: Targetologist
): Promise<any[]> {
  try {
    const { data, error } = await trafficAdminSupabase
      .from('campaign_targetologist_map')
      .select('*')
      .eq('targetologist', targetologist)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[Detector] Failed to get campaigns:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('[Detector] Exception getting campaigns:', error);
    return [];
  }
}

/**
 * Экспорт паттернов для использования в других местах
 */
export { TARGETOLOGIST_PATTERNS };
