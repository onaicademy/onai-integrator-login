import axios, { AxiosError } from 'axios';
import type { TripwireLoginRequest, TripwireLoginResponse, TripwireErrorResponse } from '@/types/tripwire';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
    
    // Save token if remember is checked
    if (data.remember) {
      localStorage.setItem('tripwire_remember_email', data.email);
    } else {
      localStorage.removeItem('tripwire_remember_email');
    }
    
    // Save auth data
    localStorage.setItem('tripwire_token', response.data.token);
    localStorage.setItem('tripwire_user_id', response.data.user_id);
    localStorage.setItem('tripwire_user', JSON.stringify(response.data.user));
    
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
 * Get remembered email from localStorage
 */
export function getRememberedEmail(): string | null {
  return localStorage.getItem('tripwire_remember_email');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = localStorage.getItem('tripwire_token');
  return !!token;
}

/**
 * Logout user
 */
export function logout(): void {
  localStorage.removeItem('tripwire_token');
  localStorage.removeItem('tripwire_user_id');
  localStorage.removeItem('tripwire_user');
}

