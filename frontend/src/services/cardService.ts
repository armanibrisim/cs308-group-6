import { apiService } from './api'

export interface SavedCard {
  id: string
  label: string
  last4: string
  card_holder_name: string
  expiry: string
  is_default: boolean
}

export interface SavedCardCreate {
  label: string
  last4: string
  card_holder_name: string
  expiry: string
  is_default?: boolean
}

export const cardService = {
  getCards(token: string): Promise<SavedCard[]> {
    return apiService.get<SavedCard[]>('/auth/me/cards', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  addCard(token: string, data: SavedCardCreate): Promise<SavedCard> {
    return apiService.post<SavedCard>('/auth/me/cards', data, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  deleteCard(token: string, cardId: string): Promise<void> {
    return apiService.delete<void>(`/auth/me/cards/${cardId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  setDefault(token: string, cardId: string): Promise<SavedCard[]> {
    return apiService.patch<SavedCard[]>(`/auth/me/cards/${cardId}/default`, undefined, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
}
