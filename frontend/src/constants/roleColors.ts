export type AppRole = 'customer' | 'sales_manager' | 'product_manager' | 'admin'

export const ROLE_META: Record<AppRole, { label: string; color: string; colorRgb: string; bg: string }> = {
  customer: {
    label: 'Customer',
    color: 'rgba(var(--c-text-rgb), 0.55)',
    colorRgb: 'var(--c-text-rgb)',
    bg: 'rgba(var(--c-text-rgb), 0.07)',
  },
  sales_manager: {
    label: 'Sales Manager',
    color: 'var(--c-neon)',
    colorRgb: 'var(--c-neon-rgb)',
    bg: 'rgba(var(--c-neon-rgb), 0.10)',
  },
  product_manager: {
    label: 'Product Manager',
    color: '#818cf8',
    colorRgb: '129,140,248',
    bg: 'rgba(129,140,248,0.12)',
  },
  admin: {
    label: 'Admin',
    color: '#ef4444',
    colorRgb: '239,68,68',
    bg: 'rgba(239,68,68,0.12)',
  },
}