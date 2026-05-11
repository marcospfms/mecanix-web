import { useAuth } from './useAuth'
import { useAPI } from './useAPI'

export type SubscriptionLimits = {
  companies: number | null;
  customers: number | null;
  vehicles: number | null;
  checklist_templates: number | null;
  checklists_per_month: number | null;
}

export type ScheduledChange = {
  subscription_plan_id: number | null;
  plan_name: string | null;
  external_product_id: string | null;
  starts_at: string | null;
}

export type Subscription = {
  id: number;
  subscription_plan_id: number;
  plan_name: string;
  billing_provider: 'admin' | 'free';
  external_product_id?: string | null;
  auto_renews: boolean;
  status: 'active' | 'expired' | 'canceled' | 'pending';
  starts_at: string;
  ends_at: string | null;
  renews_at: string | null;
  scheduled_change: ScheduledChange | null;
  limits: SubscriptionLimits;
}

export type UsageItem = {
  limit: number | null;
  used: number;
  remaining: number | null;
  is_unlimited: boolean;
}

export type SubscriptionUsage = {
  companies: UsageItem;
  customers: UsageItem;
  vehicles: UsageItem;
  checklist_templates: UsageItem;
  checklists_per_month: UsageItem;
}

export type SubscriptionData = {
  subscription: Subscription;
  period: { year: number; month: number };
  usage: SubscriptionUsage;
}

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
}

export function subscriptionStatusLabel(
  status: Subscription['status']
): string {
  switch (status) {
    case 'active':
      return 'Ativo'
    case 'expired':
      return 'Expirado'
    case 'canceled':
      return 'Cancelado'
    case 'pending':
      return 'Pendente'
  }
}

export function subscriptionStatusColor(
  status: Subscription['status']
): 'success' | 'error' | 'neutral' | 'warning' {
  switch (status) {
    case 'active':
      return 'success'
    case 'expired':
      return 'error'
    case 'canceled':
      return 'neutral'
    case 'pending':
      return 'warning'
  }
}

export function useSubscription() {
  const auth = useAuth()

  const state = useAPI<SubscriptionData | null, ApiEnvelope<SubscriptionData>>(
    '/subscription',
    {
      key: 'subscription',
      immediate: false,
      server: false,
      default: (): SubscriptionData | null => null,
      transform: r => r.data
    }
  )

  watch(
    [() => auth.hydrated.value, () => auth.token.value],
    async ([hydrated, token]) => {
      if (!hydrated) return

      if (!token) {
        state.data.value = null
        state.clear()
        return
      }

      await state.refresh()
    },
    { immediate: true }
  )

  return state
}
