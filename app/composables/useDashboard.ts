import type { ComputedRef, Ref } from 'vue'
import { useAuth } from './useAuth'
import { useAPI } from './useAPI'

export type DashboardRecentExecution = {
  id: number;
  name: string;
  status: 'completed' | 'draft';
  executed_by: {
    id: number;
    name: string;
    username: string | null;
  } | null;
  vehicle: {
    id: number | null;
    license_plate: string | null;
    customer_name?: string | null;
  } | null;
  executed_at?: string;
  created_at: string;
}

export type DashboardEmployeeStat = {
  user_id: number;
  name: string | null;
  username: string | null;
  total: number;
}

export type DashboardStats = {
  total_companies?: number;
  total_customers?: number;
  total_vehicles?: number;
  checklists_total: number;
  checklists_completed: number;
  checklists_draft: number;
  checklists_templates?: number;
  checklists_month_total: number;
  checklists_vehicles_inspected_this_month: number;
  checklists_completion_rate: number;
  recent_executions: DashboardRecentExecution[];
  checklists_by_employee?: DashboardEmployeeStat[];
  subscription_plan?: string | null;
  subscription_status?: string | null;
}

type DashboardApiPayload = {
  registrations?: {
    total_companies?: number;
    total_customers?: number;
    total_vehicles?: number;
  };
  checklists?: {
    total?: number;
    completed?: number;
    draft?: number;
    templates?: number;
    month_total?: number;
    vehicles_inspected_this_month?: number;
    completion_rate?: number;
  };
  recent_executions?: DashboardRecentExecution[];
  checklists_by_employee?: DashboardEmployeeStat[];
  subscription?: {
    plan?: string | null;
    status?: string | null;
  } | null;
}

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
}

function mapDashboard(payload: DashboardApiPayload): DashboardStats {
  return {
    total_companies: payload.registrations?.total_companies,
    total_customers: payload.registrations?.total_customers,
    total_vehicles: payload.registrations?.total_vehicles,
    checklists_total: payload.checklists?.total ?? 0,
    checklists_completed: payload.checklists?.completed ?? 0,
    checklists_draft: payload.checklists?.draft ?? 0,
    checklists_templates: payload.checklists?.templates,
    checklists_month_total: payload.checklists?.month_total ?? 0,
    checklists_vehicles_inspected_this_month:
      payload.checklists?.vehicles_inspected_this_month ?? 0,
    checklists_completion_rate: payload.checklists?.completion_rate ?? 0,
    recent_executions: payload.recent_executions ?? [],
    checklists_by_employee: payload.checklists_by_employee,
    subscription_plan: payload.subscription?.plan,
    subscription_status: payload.subscription?.status
  }
}

export function useDashboard(
  selectedEmployeeUserId?: Ref<number | null> | ComputedRef<number | null>
) {
  const auth = useAuth()
  const employeeUserId = selectedEmployeeUserId ?? computed(() => null)

  const endpoint = computed(() => {
    const query = new URLSearchParams()

    if (employeeUserId.value) {
      query.set('employee_user_id', String(employeeUserId.value))
    }

    return query.size > 0 ? `/dashboard?${query.toString()}` : '/dashboard'
  })

  const dashboard = useAPI<
    DashboardStats | null,
    ApiEnvelope<DashboardApiPayload>
  >(() => endpoint.value, {
    key: () => `dashboard:${employeeUserId.value ?? 'all'}`,
    immediate: false,
    server: false,
      default: (): DashboardStats | null => null,
    transform: response => mapDashboard(response.data)
  })

  watch(
    [() => auth.hydrated.value, () => auth.token.value],
    async ([hydrated, token]) => {
      if (!hydrated) {
        return
      }

      if (!token) {
        dashboard.data.value = null
        dashboard.error.value = undefined
        dashboard.clear()
        return
      }

      await dashboard.refresh()
      dashboard.error.value = undefined
    },
    { immediate: true }
  )

  return dashboard
}
