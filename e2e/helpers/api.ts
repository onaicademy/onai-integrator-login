/**
 * API Helper Functions
 *
 * Direct API calls for test setup, verification, and data management
 */

import { APIRequestContext, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_URL || 'https://api.onai.academy';

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    team?: string;
  };
}

export interface LeadData {
  name: string;
  phone: string;
  email?: string;
  utm_source?: string;
  utm_medium?: string;
  funnel_type?: string;
}

export interface FunnelResponse {
  success: boolean;
  stages: Array<{
    name: string;
    label: string;
    count: number;
    revenue?: number;
  }>;
  totalRevenue?: number;
  totalLeads?: number;
}

/**
 * API Helper class for direct backend interactions
 */
export class ApiHelper {
  private request: APIRequestContext;
  private token: string | null = null;
  private baseUrl: string;

  constructor(request: APIRequestContext, baseUrl?: string) {
    this.request = request;
    this.baseUrl = baseUrl || API_BASE_URL;
  }

  /**
   * Login and store token
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request.post(`${this.baseUrl}/api/auth/login`, {
      data: { email, password }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    this.token = data.token;
    return data;
  }

  /**
   * Login as admin
   */
  async loginAsAdmin(): Promise<AuthResponse> {
    const email = process.env.ADMIN_EMAIL || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin';
    return this.login(email, password);
  }

  /**
   * Login as targetologist
   */
  async loginAsTargetologist(): Promise<AuthResponse> {
    const email = process.env.TARGETOLOGIST_EMAIL || 'icekvup@gmail.com';
    const password = process.env.TARGETOLOGIST_PASSWORD || 'admin123';
    return this.login(email, password);
  }

  /**
   * Set authorization token
   */
  setToken(token: string) {
    this.token = token;
  }

  /**
   * Get headers with authorization
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Get funnel data
   */
  async getFunnel(funnelType?: string, team?: string): Promise<FunnelResponse> {
    const params = new URLSearchParams();
    if (funnelType) params.set('funnel_type', funnelType);
    if (team) params.set('team', team);

    const url = `${this.baseUrl}/api/traffic/funnel?${params.toString()}`;
    const response = await this.request.get(url, {
      headers: this.getHeaders()
    });

    expect(response.ok()).toBeTruthy();
    return await response.json();
  }

  /**
   * Get funnel health status
   */
  async getFunnelHealth(): Promise<{ status: string; timestamp: string }> {
    const response = await this.request.get(`${this.baseUrl}/api/traffic/funnel/health`, {
      headers: this.getHeaders()
    });

    expect(response.ok()).toBeTruthy();
    return await response.json();
  }

  /**
   * Get leads by date range
   */
  async getLeadsByDate(startDate: string, endDate: string, funnelType?: string): Promise<any[]> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate
    });
    if (funnelType) params.set('funnel_type', funnelType);

    const response = await this.request.get(
      `${this.baseUrl}/api/traffic/funnel/leads-by-date?${params.toString()}`,
      { headers: this.getHeaders() }
    );

    expect(response.ok()).toBeTruthy();
    return await response.json();
  }

  /**
   * Get combined analytics
   */
  async getCombinedAnalytics(team?: string): Promise<any> {
    const params = team ? `?team=${team}` : '';
    const response = await this.request.get(
      `${this.baseUrl}/api/traffic/combined-analytics${params}`,
      { headers: this.getHeaders() }
    );

    expect(response.ok()).toBeTruthy();
    return await response.json();
  }

  /**
   * Get traffic stats
   */
  async getTrafficStats(): Promise<any> {
    const response = await this.request.get(`${this.baseUrl}/api/traffic/stats`, {
      headers: this.getHeaders()
    });

    expect(response.ok()).toBeTruthy();
    return await response.json();
  }

  /**
   * Get onboarding status
   */
  async getOnboardingStatus(): Promise<any> {
    const response = await this.request.get(`${this.baseUrl}/api/traffic/onboarding/status`, {
      headers: this.getHeaders()
    });

    expect(response.ok()).toBeTruthy();
    return await response.json();
  }

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<any> {
    const response = await this.request.get(`${this.baseUrl}/api/auth/me`, {
      headers: this.getHeaders()
    });

    expect(response.ok()).toBeTruthy();
    return await response.json();
  }

  /**
   * Create test lead (for testing webhooks)
   */
  async createTestLead(leadData: LeadData): Promise<any> {
    const response = await this.request.post(`${this.baseUrl}/api/leads`, {
      headers: this.getHeaders(),
      data: leadData
    });

    return {
      ok: response.ok(),
      status: response.status(),
      data: await response.json().catch(() => null)
    };
  }

  /**
   * Simulate Challenge3D prepayment webhook
   */
  async simulatePrepaymentWebhook(leadId: string, amount: number = 5000): Promise<any> {
    const response = await this.request.post(
      `${this.baseUrl}/api/amocrm/challenge3d-prepayment`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          leads: {
            update: [{
              id: leadId,
              pipeline_id: 9430994,
              status_id: 12345,
              custom_fields_values: [{
                field_code: 'PHONE',
                values: [{ value: '+77001234567' }]
              }]
            }]
          }
        }
      }
    );

    return {
      ok: response.ok(),
      status: response.status(),
      data: await response.json().catch(() => null)
    };
  }

  /**
   * Verify API health
   */
  async verifyApiHealth(): Promise<boolean> {
    try {
      const endpoints = [
        '/api/health',
        '/api/traffic/health',
        '/api/traffic/funnel/health'
      ];

      for (const endpoint of endpoints) {
        const response = await this.request.get(`${this.baseUrl}${endpoint}`);
        if (!response.ok()) {
          console.log(`Health check failed for ${endpoint}: ${response.status()}`);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('API health check error:', error);
      return false;
    }
  }

  /**
   * Clean up test data (admin only)
   */
  async cleanupTestData(prefix: string = 'test_'): Promise<void> {
    // This would typically call an admin-only cleanup endpoint
    // For now, just log the intent
    console.log(`Would clean up test data with prefix: ${prefix}`);
  }
}

/**
 * Create API helper instance
 */
export function createApiHelper(request: APIRequestContext, baseUrl?: string): ApiHelper {
  return new ApiHelper(request, baseUrl);
}

/**
 * Date helper functions
 */
export const dateHelpers = {
  /**
   * Get today's date in YYYY-MM-DD format
   */
  today(): string {
    return new Date().toISOString().split('T')[0];
  },

  /**
   * Get date N days ago
   */
  daysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  },

  /**
   * Get date range for last N days
   */
  lastNDays(days: number): { start: string; end: string } {
    return {
      start: this.daysAgo(days),
      end: this.today()
    };
  },

  /**
   * Get current month range
   */
  currentMonth(): { start: string; end: string } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      start: start.toISOString().split('T')[0],
      end: this.today()
    };
  }
};

/**
 * Test data generators
 */
export const testData = {
  /**
   * Generate random phone number
   */
  phone(): string {
    const digits = Math.floor(Math.random() * 9000000000) + 1000000000;
    return `+7${digits}`;
  },

  /**
   * Generate random email
   */
  email(prefix: string = 'test'): string {
    const random = Math.random().toString(36).substring(7);
    return `${prefix}_${random}@test.example.com`;
  },

  /**
   * Generate test lead data
   */
  lead(overrides: Partial<LeadData> = {}): LeadData {
    return {
      name: `Test User ${Math.random().toString(36).substring(7)}`,
      phone: this.phone(),
      email: this.email(),
      utm_source: 'test_source',
      utm_medium: 'test_medium',
      funnel_type: 'express',
      ...overrides
    };
  }
};
