// Tripwire TypeScript Interfaces

export interface TripwireUser {
  id: string;
  email: string;
  name?: string;
}

export interface TripwireLoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export interface TripwireLoginResponse {
  user_id: string;
  token: string;
  role: 'tripwire';
  user: TripwireUser;
}

export interface TripwireErrorResponse {
  code: 'INVALID_CREDENTIALS' | 'TOO_MANY_ATTEMPTS' | 'NETWORK_ERROR' | 'VALIDATION_ERROR';
  message: string;
  field?: 'email' | 'password' | 'general';
}

export interface FormState {
  email: string;
  password: string;
  remember: boolean;
}

export type ButtonState = 'default' | 'hover' | 'active' | 'loading' | 'error' | 'success';

