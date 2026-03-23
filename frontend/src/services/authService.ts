import { apiService } from './api'

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
}

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    return apiService.post<AuthResponse>('/auth/login', data)
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    return apiService.post<AuthResponse>('/auth/register', data)
  },
}
