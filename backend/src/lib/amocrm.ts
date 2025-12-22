import { AMOCRM_CONFIG, getStageByPaymentMethod } from '../config/amocrm-config.js';
import axios, { AxiosRequestConfig } from 'axios';
import { withAmoCrmLock } from './amocrmLock.js';

const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN || 'onaiagencykz';
const AMOCRM_TOKEN = process.env.AMOCRM_ACCESS_TOKEN;
const AMOCRM_TIMEOUT = 60000; // 60 секунд (увеличено!)

// Helper: axios with proper timeouts (более надежный чем fetch)
const amocrmAxios = axios.create({
  timeout: AMOCRM_TIMEOUT,
  headers: {
    'Authorization': `Bearer ${AMOCRM_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

// Wrapper для совместимости с fetch API
async function fetchWithTimeout(url: string, options: RequestInit = {}) {
  try {
    const config: AxiosRequestConfig = {
      method: (options.method as any) || 'GET',
      url,
      data: options.body ? JSON.parse(options.body as string) : undefined,
      headers: {
        ...amocrmAxios.defaults.headers,
        ...(options.headers as any),
      },
    };
    
    const response = await amocrmAxios.request(config);
    
    // Convert axios response to fetch-like response
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: async () => response.data,
      headers: new Map(Object.entries(response.headers)),
    } as Response;
  } catch (error: any) {
    if (error.response) {
      // HTTP error response
      return {
        ok: false,
        status: error.response.status,
        json: async () => error.response.data,
        headers: new Map(Object.entries(error.response.headers || {})),
      } as Response;
    }
    throw error;
  }
}

interface ContactData {
  name: string;
  email?: string;
  phone?: string;
}

interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  gclid?: string;
}

interface LeadData extends ContactData {
  utmParams?: UTMParams;
  proftestAnswers?: Record<string, any>;
  paymentMethod?: 'kaspi' | 'card' | 'manager';
  campaignSlug?: string;
}

interface ExistingLead {
  id: number;
  name: string;
  status_id: number;
  pipeline_id: number;
  contactId?: number; // ID найденного контакта (даже если нет сделки)
}

function getStageName(stageId: number): string {
  const entry = Object.entries(AMOCRM_CONFIG.STAGES).find(([_, id]) => id === stageId);
  return entry ? entry[0] : 'UNKNOWN';
}

/**
 * Search for existing contact by email OR phone
 */
async function findExistingContact(email?: string, phone?: string): Promise<number | null> {
  if (!AMOCRM_TOKEN || (!email && !phone)) return null;

  try {
    const searchQuery = email || phone || '';
    const searchStartTime = Date.now();
    
    console.log(`      → AmoCRM API: Searching contact by "${searchQuery}"...`);
    
    const contactsResponse = await fetchWithTimeout(
      `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/contacts?query=${encodeURIComponent(searchQuery)}`,
      {
        headers: {
          Authorization: `Bearer ${AMOCRM_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const apiDuration = Date.now() - searchStartTime;

    if (!contactsResponse.ok) {
      console.log(`      ✗ AmoCRM API returned ${contactsResponse.status} (${apiDuration}ms)`);
      return null;
    }

    // Check if response has content before parsing
    const contentLength = contactsResponse.headers.get('content-length');
    if (contentLength === '0' || !contactsResponse.body) {
      console.log(`      ✗ Empty response from AmoCRM (${apiDuration}ms)`);
      return null;
    }

    const contactsData: any = await contactsResponse.json();
    const contacts = contactsData._embedded?.contacts || [];

    if (contacts.length === 0) {
      console.log(`      ✗ No contact found (${apiDuration}ms)`);
      return null;
    }

    const contactId = contacts[0].id;
    console.log(`      ✓ Contact found: ID ${contactId} (${apiDuration}ms)`);
    return contactId;
  } catch (error: any) {
    console.error(`      ✗ Error searching for contact:`, error.message);
    return null;
  }
}

/**
 * Search for existing lead by email OR phone
 * Uses contacts API for more reliable deduplication
 */
async function findExistingLead(email?: string, phone?: string): Promise<ExistingLead | null> {
  if (!AMOCRM_TOKEN || (!email && !phone)) {
    console.log(`⚠️ [DEDUP] Cannot search: No token or no email/phone provided`);
    return null;
  }

  console.log(`🔍 [DEDUP] Starting duplicate check:`);
  console.log(`   Email: ${email || 'N/A'}`);
  console.log(`   Phone: ${phone || 'N/A'}`);
  const searchStartTime = Date.now();

  try {
    // Step 1: Search for contact by email OR phone
    console.log(`   → Searching for existing contact...`);
    const contactId = await findExistingContact(email, phone);
    
    if (!contactId) {
      const searchDuration = Date.now() - searchStartTime;
      console.log(`✅ [DEDUP] No existing contact found (${searchDuration}ms) → Will create NEW lead`);
      return null;
    }
    
    console.log(`   ✅ Found contact ID: ${contactId}`);
    console.log(`   → Searching for leads associated with this contact...`);

    // Step 2: Get contact WITH embedded leads (more reliable than filtering leads endpoint)
    console.log(`🔍 Fetching contact ${contactId} with embedded leads...`);
    const contactResponse = await fetchWithTimeout(
      `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/contacts/${contactId}?with=leads`,
      {
        headers: {
          Authorization: `Bearer ${AMOCRM_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!contactResponse.ok) {
      console.log(`⚠️ AmoCRM contacts API returned status ${contactResponse.status} for contact ${contactId}`);
      return null;
    }

    const contactData: any = await contactResponse.json();
    const allLeads = contactData._embedded?.leads || [];

    console.log(`📊 Contact ${contactId} has ${allLeads.length} total leads`);

    // Filter by our pipeline if we have multiple leads
    const leadsInPipeline = allLeads.filter((lead: any) => lead.pipeline_id === AMOCRM_CONFIG.PIPELINE_ID);
    const leads = leadsInPipeline.length > 0 ? leadsInPipeline : allLeads;

    console.log(`📊 Found ${leads.length} leads in our pipeline ${AMOCRM_CONFIG.PIPELINE_ID}`);

    if (leads.length === 0) {
      console.log(`🔍 No leads found for contact ${contactId} in pipeline ${AMOCRM_CONFIG.PIPELINE_ID}`);
      return null;
    }

    // ✅ FIX: Фильтруем только АКТИВНЫЕ (не закрытые) сделки
    const CLOSED_STAGES = [
      AMOCRM_CONFIG.STAGES.УСПЕШНО_РЕАЛИЗОВАНО, // 142
      AMOCRM_CONFIG.STAGES.ЗАКРЫТО_И_НЕ_РЕАЛИЗОВАНО, // 143
    ];

    const activeLead = leads.find((lead: any) => !CLOSED_STAGES.includes(lead.status_id));

    const searchDuration = Date.now() - searchStartTime;

    if (!activeLead) {
      console.log(`   ⚠️ All ${leads.length} leads are CLOSED (Успешно реализовано or Закрыто)`);
      console.log(`✅ [DEDUP] No ACTIVE lead found (${searchDuration}ms) → Will create NEW lead`);
      return null; // Создастся новая сделка
    }

    // Return the most recently updated ACTIVE lead
    console.log(`   ✅ Found ACTIVE lead:`);
    console.log(`      Lead ID: ${activeLead.id}`);
    console.log(`      Lead Name: ${activeLead.name}`);
    console.log(`      Stage: ${getStageName(activeLead.status_id)} (ID: ${activeLead.status_id})`);
    console.log(`      Pipeline: ${activeLead.pipeline_id}`);
    console.log(`      Contact: ${contactId}`);
    console.log(`🔄 [DEDUP] Existing ACTIVE lead found (${searchDuration}ms) → Will UPDATE existing lead`);

    return {
      id: activeLead.id,
      name: activeLead.name,
      status_id: activeLead.status_id,
      pipeline_id: activeLead.pipeline_id,
      contactId, // Включаем найденный contactId
    };
  } catch (error: any) {
    const searchDuration = Date.now() - searchStartTime;
    console.error(`❌ [DEDUP] Error searching for lead (${searchDuration}ms):`, error.message);
    return null;
  }
}

/**
 * Create contact in AmoCRM
 */
async function createContact(data: ContactData): Promise<number | null> {
  if (!AMOCRM_TOKEN) return null;

  const customFields: any[] = [];

  if (data.email) {
    customFields.push({
      field_code: 'EMAIL',
      values: [{ value: data.email, enum_code: 'WORK' }],
    });
  }

  if (data.phone) {
    customFields.push({
      field_code: 'PHONE',
      values: [{ value: data.phone, enum_code: 'WORK' }],
    });
  }

  try {
    const response = await fetchWithTimeout(`https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/contacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AMOCRM_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          first_name: data.name,
          custom_fields_values: customFields,
        },
      ]),
    });

    if (!response.ok) return null;

    const result: any = await response.json();
    return result._embedded?.contacts?.[0]?.id || null;
  } catch (error) {
    console.error('Error creating contact:', error);
    return null;
  }
}

/**
 * Add note to lead with proftest answers
 */
async function addLeadNote(leadId: number, note: string): Promise<void> {
  if (!AMOCRM_TOKEN) return;

  try {
    await fetchWithTimeout(`https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/leads/${leadId}/notes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AMOCRM_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          note_type: 'common',
          params: { text: note },
        },
      ]),
    });
  } catch (error) {
    console.error('Error adding note:', error);
  }
}

/**
 * Create or update lead in AmoCRM
 * 
 * 🔒 PROTECTED BY DISTRIBUTED LOCK to prevent race conditions and duplicate leads
 */
export async function createOrUpdateLead(data: LeadData): Promise<{
  leadId: number;
  isNew: boolean;
  action: string;
}> {
  if (!AMOCRM_TOKEN) {
    throw new Error('AmoCRM credentials not configured');
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🚀 [AmoCRM] Starting lead creation/update`);
  console.log(`   Email: ${data.email || 'N/A'}`);
  console.log(`   Phone: ${data.phone || 'N/A'}`);
  console.log(`   Name: ${data.name}`);
  console.log(`   Payment: ${data.paymentMethod || 'N/A'}`);
  console.log(`   Campaign: ${data.campaignSlug || 'N/A'}`);
  console.log(`   UTM Source: ${data.utmParams?.utm_source || 'N/A'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // 🔒 WRAP ENTIRE OPERATION IN DISTRIBUTED LOCK
  return withAmoCrmLock(data.email, data.phone, async () => {
    console.log(`🔍 [AmoCRM] Lock acquired, searching for existing lead...`);

    // 1. Search for existing lead
    const existingLead = await findExistingLead(data.email, data.phone);

  // Determine target stage
  const targetStage = data.paymentMethod
    ? getStageByPaymentMethod(data.paymentMethod)
    : AMOCRM_CONFIG.STAGES.ЗАЯВКА_С_ПРОФТЕСТА;

  // 2. If lead exists, update it
  if (existingLead) {
    console.log(`🔄 Updating existing lead ${existingLead.id} → ${getStageName(targetStage)}`);

    // ✅ STEP 1: Get current lead data to check if UTM already exists
    let hasExistingUTM = false;
    try {
      console.log(`🔍 [UTM CHECK] Fetching lead ${existingLead.id} details to check for existing UTM...`);
      const leadDetailsResponse = await fetchWithTimeout(
        `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/leads/${existingLead.id}`,
        {
          headers: {
            Authorization: `Bearer ${AMOCRM_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`🔍 [UTM CHECK] Lead details response status: ${leadDetailsResponse.status}`);

      if (leadDetailsResponse.ok) {
        const leadDetails: any = await leadDetailsResponse.json();
        const existingFields = leadDetails.custom_fields_values || [];
        
        console.log(`🔍 [UTM CHECK] Lead has ${existingFields.length} custom fields`);
        
        // Check if UTM_SOURCE field is already filled
        hasExistingUTM = existingFields.some((field: any) => 
          field.field_id === AMOCRM_CONFIG.CUSTOM_FIELDS.UTM_SOURCE && 
          field.values?.[0]?.value
        );

        console.log(`🔍 [UTM CHECK] hasExistingUTM = ${hasExistingUTM}, UTM_SOURCE field_id = ${AMOCRM_CONFIG.CUSTOM_FIELDS.UTM_SOURCE}`);

        if (hasExistingUTM) {
          const existingUtmSource = existingFields.find((f: any) => f.field_id === AMOCRM_CONFIG.CUSTOM_FIELDS.UTM_SOURCE);
          console.log(`🔒 Lead ${existingLead.id} already has UTM_SOURCE: ${existingUtmSource?.values?.[0]?.value} - keeping original UTM from proftest`);
        } else {
          console.log(`📝 Lead ${existingLead.id} has no UTM yet - will write new UTM if provided`);
        }
      } else {
        console.log(`⚠️ [UTM CHECK] Lead details response NOT OK, status: ${leadDetailsResponse.status}`);
      }
    } catch (error) {
      console.error('⚠️ Error fetching lead details for UTM check:', error);
      // Continue with update even if GET fails (fallback to old behavior)
    }

    // ✅ STEP 2: Build UTM custom fields ONLY if UTM doesn't exist yet
    const customFieldsForUpdate: any[] = [];
    
    if (!hasExistingUTM && data.utmParams && Object.keys(data.utmParams).length > 0) {
      console.log(`✅ Writing NEW UTM to lead ${existingLead.id} from ${data.utmParams.utm_source || 'unknown source'}`);
      
      const utmFieldMap: Record<string, keyof typeof AMOCRM_CONFIG.CUSTOM_FIELDS> = {
        utm_source: 'UTM_SOURCE',
        utm_medium: 'UTM_MEDIUM',
        utm_campaign: 'UTM_CAMPAIGN',
        utm_content: 'UTM_CONTENT',
        utm_term: 'UTM_TERM',
        fbclid: 'FBCLID',
      };

      Object.entries(data.utmParams).forEach(([key, value]) => {
        const fieldKey = utmFieldMap[key as keyof UTMParams];
        const fieldId = fieldKey ? AMOCRM_CONFIG.CUSTOM_FIELDS[fieldKey] : 0;

        if (fieldId && value) {
          customFieldsForUpdate.push({
            field_id: fieldId,
            values: [{ value }],
          });
        }
      });
    } else if (hasExistingUTM && data.utmParams && Object.keys(data.utmParams).length > 0) {
      console.log(`🚫 Ignoring new UTM from ${data.utmParams.utm_source || 'unknown'} - preserving original UTM`);
    }

    // ✅ STEP 3: Update lead stage (always) and UTM fields (only if no existing UTM)
    const updatePayload: any = {
      status_id: targetStage,
    };

    if (customFieldsForUpdate.length > 0) {
      updatePayload.custom_fields_values = customFieldsForUpdate;
    }

    await fetchWithTimeout(`https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/leads/${existingLead.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AMOCRM_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    // Add proftest answers as note
    if (data.proftestAnswers) {
      let answersText: string;
      
      // Проверяем новый формат (массив объектов)
      if (Array.isArray(data.proftestAnswers)) {
        answersText = data.proftestAnswers
          .map((item: any) => `${item.questionNumber}. ${item.question}\n   ➜ ${item.answer}`)
          .join('\n\n');
      } else {
        // Старый формат (объект или числовой массив)
        answersText = Object.entries(data.proftestAnswers)
          .map(([q, a]) => `${q}: ${a}`)
          .join('\n');
      }
      
      await addLeadNote(existingLead.id, `📝 Ответы профтеста:\n\n${answersText}`);
    }

    // Add payment selection note
    if (data.paymentMethod) {
      const methodNames = {
        kaspi: 'Каспий оплата',
        card: 'Банковская карта (Prodamus)',
        manager: 'Чат с менеджером',
      };
      await addLeadNote(existingLead.id, `💳 Выбран способ оплаты: ${methodNames[data.paymentMethod]}`);
    }

    // Add campaign info
    if (data.campaignSlug) {
      await addLeadNote(existingLead.id, `🎯 Кампания: ${data.campaignSlug}`);
    }

    return {
      leadId: existingLead.id,
      isNew: false,
      action: 'updated',
    };
  }

  // 3. Create new lead
  console.log(`✨ Creating new lead in stage: ${getStageName(targetStage)}`);

  // Try to find existing contact first, if not found - create new
  console.log(`🔍 Checking for existing contact before creating lead...`);
  let contactId = await findExistingContact(data.email, data.phone);
  
  if (!contactId) {
    console.log(`🆕 Creating new contact for: ${data.name}`);
    const createStartTime = Date.now();
    contactId = await createContact(data);
    const createDuration = Date.now() - createStartTime;
    
    if (contactId) {
      console.log(`✅ Contact created: ID ${contactId} (${createDuration}ms)`);
    } else {
      console.error(`❌ Failed to create contact (${createDuration}ms)`);
    }
  } else {
    console.log(`✅ Using existing contact: ID ${contactId}`);
  }

  // Build custom fields for UTM
  const customFields: any[] = [];

  if (data.utmParams) {
    const utmFieldMap: Record<string, keyof typeof AMOCRM_CONFIG.CUSTOM_FIELDS> = {
      utm_source: 'UTM_SOURCE',
      utm_medium: 'UTM_MEDIUM',
      utm_campaign: 'UTM_CAMPAIGN',
      utm_content: 'UTM_CONTENT',
      utm_term: 'UTM_TERM',
      fbclid: 'FBCLID',
    };

    Object.entries(data.utmParams).forEach(([key, value]) => {
      const fieldKey = utmFieldMap[key as keyof UTMParams];
      const fieldId = fieldKey ? AMOCRM_CONFIG.CUSTOM_FIELDS[fieldKey] : 0;

      if (fieldId && value) {
        customFields.push({
          field_id: fieldId,
          values: [{ value }],
        });
      }
    });
  }

  // Create lead
  const leadPayload: any = {
    name: `Профтест: ${data.name}`,
    pipeline_id: AMOCRM_CONFIG.PIPELINE_ID,
    status_id: targetStage,
  };

  if (customFields.length > 0) {
    leadPayload.custom_fields_values = customFields;
  }

  if (contactId) {
    leadPayload._embedded = {
      contacts: [{ id: contactId }],
    };
  }

  const response = await fetchWithTimeout(`https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/leads`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AMOCRM_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([leadPayload]),
  });

  if (!response.ok) {
    const errorData: any = await response.json();
    console.error('AmoCRM error:', errorData);
    throw new Error(`Failed to create lead: ${response.status}`);
  }

  const result: any = await response.json();
  const leadId = result._embedded?.leads?.[0]?.id;

  if (!leadId) {
    throw new Error('Lead ID not returned from AmoCRM');
  }

  // Add proftest answers as note
  if (data.proftestAnswers) {
    let answersText: string;
    
    // Проверяем новый формат (массив объектов)
    if (Array.isArray(data.proftestAnswers)) {
      answersText = data.proftestAnswers
        .map((item: any) => `${item.questionNumber}. ${item.question}\n   ➜ ${item.answer}`)
        .join('\n\n');
    } else {
      // Старый формат (объект или числовой массив)
      answersText = Object.entries(data.proftestAnswers)
        .map(([q, a]) => `${q}: ${a}`)
        .join('\n');
    }
    
    await addLeadNote(leadId, `📝 Ответы профтеста:\n\n${answersText}`);
  }

  // Add UTM as note
  if (data.utmParams && Object.keys(data.utmParams).length > 0) {
    const utmText = Object.entries(data.utmParams)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    await addLeadNote(leadId, `📊 UTM метки:\n\n${utmText}`);
  }

  // Add campaign info
  if (data.campaignSlug) {
    await addLeadNote(leadId, `🎯 Кампания: ${data.campaignSlug}`);
  }

  console.log(`✅ Lead created: ID ${leadId}`);

  return {
    leadId,
    isNew: true,
    action: 'created',
  };
  }); // END OF withAmoCrmLock
}

