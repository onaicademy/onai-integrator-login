/**
 * AmoCRM Bulk Sync Service with Rate Limiting
 * Handles high-volume AmoCRM operations with proper rate limiting
 */
import axios, { AxiosInstance } from 'axios';
import Bottleneck from 'bottleneck';
import pino from 'pino';

const logger = pino();

// AmoCRM Rate Limits: 7 requests per second, max 500 per minute
const AMOCRM_RATE_LIMIT_PER_SECOND = 7;
const AMOCRM_TIMEOUT = parseInt(process.env.AMOCRM_TIMEOUT || '30000');

interface AmoCRMLeadData {
  name: string;
  email?: string;
  phone: string;
  campaignSlug?: string;
  paymentMethod?: string;
  utmParams?: Record<string, any>;
}

interface AmoCRMResult {
  success: boolean;
  leadId?: number;
  contactId?: number;
  isNew?: boolean;
  error?: string;
}

class AmoCRMBulkService {
  private client: AxiosInstance;
  private limiter: Bottleneck;
  private domain: string;
  private token: string;
  private pipelineId: number;
  private initialStatusId: number;

  constructor() {
    this.domain = process.env.AMOCRM_DOMAIN || 'onaiagencykz';
    this.token = process.env.AMOCRM_ACCESS_TOKEN || '';
    this.pipelineId = parseInt(process.env.AMOCRM_PIPELINE_ID || '10350882');
    this.initialStatusId = parseInt(process.env.AMOCRM_INITIAL_STATUS_ID || '71918746');

    // Create axios client
    this.client = axios.create({
      baseURL: `https://${this.domain}.amocrm.ru/api/v4`,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      timeout: AMOCRM_TIMEOUT,
    });

    // Create rate limiter (7 req/sec)
    this.limiter = new Bottleneck({
      minTime: Math.floor(1000 / AMOCRM_RATE_LIMIT_PER_SECOND),
      maxConcurrent: 2,
      reservoir: 500, // Max 500 per minute
      reservoirRefreshAmount: 500,
      reservoirRefreshInterval: 60 * 1000, // 1 minute
    });

    logger.info('✅ AmoCRM Bulk Service initialized', {
      domain: this.domain,
      pipelineId: this.pipelineId,
      rateLimit: `${AMOCRM_RATE_LIMIT_PER_SECOND} req/sec`,
    });
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return Boolean(this.token && this.domain && this.pipelineId);
  }

  /**
   * Find or create contact in AmoCRM
   */
  async upsertContact(data: AmoCRMLeadData): Promise<{ id: number; isNew: boolean }> {
    return this.limiter.schedule(async () => {
      try {
        // 1. Search for existing contact by email or phone
        const searchQuery = data.email || data.phone;
        const searchResponse = await this.client.get('/contacts', {
          params: {
            query: searchQuery,
            limit: 1,
          },
        });

        const existingContacts = searchResponse.data._embedded?.contacts || [];

        if (existingContacts.length > 0) {
          const contact = existingContacts[0];
          logger.info(`Found existing contact: ${contact.id}`);

          // Update contact if needed
          await this.updateContact(contact.id, data);

          return { id: contact.id, isNew: false };
        }

        // 2. Create new contact
        const createResponse = await this.client.post('/contacts', [
          {
            name: data.name,
            custom_fields_values: this.buildCustomFields(data),
          },
        ]);

        const newContact = createResponse.data._embedded?.contacts?.[0];

        if (!newContact) {
          throw new Error('Failed to create contact');
        }

        logger.info(`Created new contact: ${newContact.id}`);
        return { id: newContact.id, isNew: true };
      } catch (error: any) {
        logger.error('Error upserting contact:', {
          error: error.message,
          data: error.response?.data,
        });
        throw error;
      }
    });
  }

  /**
   * Update existing contact
   */
  private async updateContact(contactId: number, data: AmoCRMLeadData): Promise<void> {
    try {
      await this.client.patch(`/contacts/${contactId}`, {
        custom_fields_values: this.buildCustomFields(data),
      });
      logger.info(`Updated contact: ${contactId}`);
    } catch (error: any) {
      logger.error(`Error updating contact ${contactId}:`, error.message);
      // Don't throw - update is not critical
    }
  }

  /**
   * Create lead (deal) in AmoCRM
   */
  async createLead(contactId: number, data: AmoCRMLeadData): Promise<number> {
    return this.limiter.schedule(async () => {
      try {
        const leadName = this.buildLeadName(data);

        const response = await this.client.post('/leads', [
          {
            name: leadName,
            pipeline_id: this.pipelineId,
            status_id: this.initialStatusId,
            price: 0,
            _embedded: {
              contacts: [{ id: contactId }],
            },
            custom_fields_values: this.buildLeadCustomFields(data),
          },
        ]);

        const newLead = response.data._embedded?.leads?.[0];

        if (!newLead) {
          throw new Error('Failed to create lead');
        }

        logger.info(`Created new lead: ${newLead.id}`);
        return newLead.id;
      } catch (error: any) {
        logger.error('Error creating lead:', {
          error: error.message,
          data: error.response?.data,
        });
        throw error;
      }
    });
  }

  /**
   * Full sync operation: create contact + lead
   */
  async syncLead(data: AmoCRMLeadData): Promise<AmoCRMResult> {
    try {
      if (!this.isConfigured()) {
        throw new Error('AmoCRM not configured');
      }

      // Step 1: Upsert contact
      const contactResult = await this.upsertContact(data);

      // Step 2: Create lead
      const leadId = await this.createLead(contactResult.id, data);

      return {
        success: true,
        leadId,
        contactId: contactResult.id,
        isNew: contactResult.isNew,
      };
    } catch (error: any) {
      logger.error('Error syncing lead:', error.message);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Build custom fields for contact
   */
  private buildCustomFields(data: AmoCRMLeadData): any[] {
    const fields: any[] = [];

    // Email field (ID: 1 is standard)
    if (data.email) {
      fields.push({
        field_code: 'EMAIL',
        values: [{ value: data.email, enum_code: 'WORK' }],
      });
    }

    // Phone field (ID: 2 is standard)
    if (data.phone) {
      fields.push({
        field_code: 'PHONE',
        values: [{ value: data.phone, enum_code: 'WORK' }],
      });
    }

    return fields;
  }

  /**
   * Build custom fields for lead
   */
  private buildLeadCustomFields(data: AmoCRMLeadData): any[] {
    const fields: any[] = [];

    // Add UTM tags if available
    if (data.utmParams) {
      if (data.utmParams.utm_source) {
        fields.push({
          field_id: parseInt(process.env.AMOCRM_FIELD_UTM_SOURCE || '0'),
          values: [{ value: data.utmParams.utm_source }],
        });
      }
      if (data.utmParams.utm_campaign) {
        fields.push({
          field_id: parseInt(process.env.AMOCRM_FIELD_UTM_CAMPAIGN || '0'),
          values: [{ value: data.utmParams.utm_campaign }],
        });
      }
    }

    // Add payment method if available
    if (data.paymentMethod) {
      fields.push({
        field_id: parseInt(process.env.AMOCRM_FIELD_PAYMENT_METHOD || '0'),
        values: [{ value: data.paymentMethod }],
      });
    }

    return fields.filter((f) => f.field_id > 0); // Only include configured fields
  }

  /**
   * Build lead name from data
   */
  private buildLeadName(data: AmoCRMLeadData): string {
    const source = data.campaignSlug || 'landing';
    return `${data.name} - ${source}`;
  }

  /**
   * Get current limiter stats (for monitoring)
   */
  getLimiterStats(): any {
    return {
      running: this.limiter.running(),
      queued: this.limiter.queued(),
    };
  }
}

// Export singleton instance
export const amoCrmBulkService = new AmoCRMBulkService();
export default amoCrmBulkService;

