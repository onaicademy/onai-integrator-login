import { AMOCRM_CONFIG, getStageByPaymentMethod } from '../config/amocrm-config.js';

const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN || 'onaiagencykz';
const AMOCRM_TOKEN = process.env.AMOCRM_ACCESS_TOKEN;
const AMOCRM_TIMEOUT = 30000; // 30 секунд

// Helper: fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AMOCRM_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
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
    
    const contactsResponse = await fetchWithTimeout(
      `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/contacts?query=${encodeURIComponent(searchQuery)}`,
      {
        headers: {
          Authorization: `Bearer ${AMOCRM_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!contactsResponse.ok) return null;

    // Check if response has content before parsing
    const contentLength = contactsResponse.headers.get('content-length');
    if (contentLength === '0' || !contactsResponse.body) {
      console.log(`🔍 Empty response from AmoCRM for: ${searchQuery}`);
      return null;
    }

    const contactsData: any = await contactsResponse.json();
    const contacts = contactsData._embedded?.contacts || [];

    if (contacts.length === 0) {
      console.log(`🔍 No existing contact found for: ${searchQuery}`);
      return null;
    }

    const contactId = contacts[0].id;
    console.log(`👤 Found contact: ID ${contactId}`);
    return contactId;
  } catch (error) {
    console.error('Error searching for contact:', error);
    return null;
  }
}

/**
 * Search for existing lead by email OR phone
 * Uses contacts API for more reliable deduplication
 */
async function findExistingLead(email?: string, phone?: string): Promise<ExistingLead | null> {
  if (!AMOCRM_TOKEN || (!email && !phone)) return null;

  try {
    // Step 1: Search for contact by email OR phone
    const contactId = await findExistingContact(email, phone);
    
    if (!contactId) {
      return null;
    }

    // Step 2: Get contact's leads (filter by our pipeline, sort by update date DESC)
    const leadsResponse = await fetchWithTimeout(
      `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/leads?filter[contacts][]=${contactId}&filter[pipeline_id]=${AMOCRM_CONFIG.PIPELINE_ID}&order[updated_at]=desc`,
      {
        headers: {
          Authorization: `Bearer ${AMOCRM_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!leadsResponse.ok) return null;

    const leadsData: any = await leadsResponse.json();
    const leads = leadsData._embedded?.leads || [];

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

    if (!activeLead) {
      console.log(`🔍 No ACTIVE leads found for contact ${contactId} in pipeline ${AMOCRM_CONFIG.PIPELINE_ID} (all leads are closed)`);
      return null; // Создастся новая сделка
    }

    // Return the most recently updated ACTIVE lead
    console.log(`✅ Found ACTIVE lead: ID ${activeLead.id}, Stage: ${getStageName(activeLead.status_id)}, Contact: ${contactId}, Pipeline: ${activeLead.pipeline_id}`);

    return {
      id: activeLead.id,
      name: activeLead.name,
      status_id: activeLead.status_id,
      pipeline_id: activeLead.pipeline_id,
      contactId, // Включаем найденный contactId
    };
  } catch (error) {
    console.error('Error searching for lead:', error);
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
 */
export async function createOrUpdateLead(data: LeadData): Promise<{
  leadId: number;
  isNew: boolean;
  action: string;
}> {
  if (!AMOCRM_TOKEN) {
    throw new Error('AmoCRM credentials not configured');
  }

  // 1. Search for existing lead
  const existingLead = await findExistingLead(data.email, data.phone);

  // Determine target stage
  const targetStage = data.paymentMethod
    ? getStageByPaymentMethod(data.paymentMethod)
    : AMOCRM_CONFIG.STAGES.ЗАЯВКА_С_ПРОФТЕСТА;

  // 2. If lead exists, update it
  if (existingLead) {
    console.log(`🔄 Updating existing lead ${existingLead.id} → ${getStageName(targetStage)}`);

    // Build UTM custom fields for update
    const customFieldsForUpdate: any[] = [];
    if (data.utmParams && Object.keys(data.utmParams).length > 0) {
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
    }

    // Update lead stage and UTM fields
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
  let contactId = await findExistingContact(data.email, data.phone);
  
  if (!contactId) {
    console.log(`🆕 Creating new contact for: ${data.name}`);
    contactId = await createContact(data);
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
}

