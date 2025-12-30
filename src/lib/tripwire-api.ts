import axios, { AxiosError } from 'axios';
import type { TripwireLoginRequest, TripwireLoginResponse, TripwireErrorResponse } from '@/types/tripwire';
import { safeLocalStorage, safeJSONStringify } from '@/utils/error-recovery';
import { getApiBaseUrl } from '@/lib/runtime-config';

const API_BASE_URL = getApiBaseUrl() || 'http://localhost:3000';

// Axios instance для Tripwire API
const tripwireAPI = axios.create({
  baseURL: `${API_BASE_URL}/api/tripwire`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Login to Tripwire platform
 */
export async function tripwireLogin(data: TripwireLoginRequest): Promise<TripwireLoginResponse> {
  try {
    const response = await tripwireAPI.post<TripwireLoginResponse>('/login', {
      email: data.email,
      password: data.password,
    });
    
    // Save token if remember is checked (безопасно)
    if (data.remember) {
      safeLocalStorage.setItem('tripwire_remember_email', data.email);
    } else {
      safeLocalStorage.removeItem('tripwire_remember_email');
    }
    
    // Save auth data (безопасно)
    safeLocalStorage.setItem('tripwire_token', response.data.token);
    safeLocalStorage.setItem('tripwire_user_id', response.data.user_id);
    safeLocalStorage.setItem('tripwire_user', safeJSONStringify(response.data.user));
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<TripwireErrorResponse>;
      
      if (axiosError.response) {
        // Server responded with error
        throw axiosError.response.data;
      } else if (axiosError.request) {
        // Request made but no response
        throw {
          code: 'NETWORK_ERROR',
          message: 'Ошибка подключения. Проверьте интернет.',
          field: 'general',
        } as TripwireErrorResponse;
      }
    }
    
    // Unknown error
    throw {
      code: 'NETWORK_ERROR',
      message: 'Произошла неизвестная ошибка',
      field: 'general',
    } as TripwireErrorResponse;
  }
}

/**
 * Password recovery
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await tripwireAPI.post('/password-reset', { email });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<TripwireErrorResponse>;
      if (axiosError.response) {
        throw axiosError.response.data;
      }
    }
    throw {
      code: 'NETWORK_ERROR',
      message: 'Не удалось отправить письмо',
      field: 'general',
    } as TripwireErrorResponse;
  }
}

/**
 * Get remembered email from localStorage (безопасно)
 */
export function getRememberedEmail(): string | null {
  return safeLocalStorage.getItem('tripwire_remember_email');
}

/**
 * Check if user is authenticated (безопасно)
 */
export function isAuthenticated(): boolean {
  const token = safeLocalStorage.getItem('tripwire_token');
  return !!token;
}

/**
 * Logout user (безопасно)
 */
export function logout(): void {
  safeLocalStorage.removeItem('tripwire_token');
  safeLocalStorage.removeItem('tripwire_user_id');
  safeLocalStorage.removeItem('tripwire_user');
}

