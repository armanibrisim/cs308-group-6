import { ApiError, apiService } from './api'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  first_name: string
  last_name: string
}

export interface AuthResponse {
  success: boolean
  doc_id: string
  email: string
  role: string
  token: string
  first_name?: string
  last_name?: string
}

export function loginErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Invalid email or password.'
    if (err.status >= 500) return 'Server error. Please try again later.'
    return err.message
  }
  if (err instanceof TypeError) return 'Could not connect to the server. Check that the backend is running.'
  if (err instanceof Error && err.message) return err.message
  return 'Sign in failed. Please try again.'
}

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    return apiService.post<AuthResponse>('/auth/login', data)
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    return apiService.post<AuthResponse>('/auth/register', data)
  },
}
