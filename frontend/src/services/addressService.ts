import { apiService } from './api'

export interface Address {
  id: string
  label: string
  full_address: string
  is_default: boolean
}

export interface AddressCreate {
  label: string
  full_address: string
  is_default?: boolean
}

export const addressService = {
  getAddresses(token: string): Promise<Address[]> {
    return apiService.get<Address[]>('/auth/me/addresses', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  addAddress(token: string, data: AddressCreate): Promise<Address> {
    return apiService.post<Address>('/auth/me/addresses', data, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  deleteAddress(token: string, addressId: string): Promise<void> {
    return apiService.delete<void>(`/auth/me/addresses/${addressId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  setDefault(token: string, addressId: string): Promise<Address[]> {
    return apiService.patch<Address[]>(`/auth/me/addresses/${addressId}/default`, undefined, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
}
