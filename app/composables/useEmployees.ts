import { useAuth } from './useAuth'
import { useApiFetch } from './useAPI'

export type EmployeeUser = {
  id: number;
  name: string;
  username: string | null;
  must_change_password: boolean;
}

export type EmployeeCompany = {
  id: number;
  name: string;
}

export type Employee = {
  id: number;
  company_id: number;
  company: EmployeeCompany;
  user_id: number;
  user: EmployeeUser;
  role: 'manager' | 'technician';
  is_active: boolean;
  boss_user_id: number;
  updated_by_user_id: number | null;
  created_at: string;
  updated_at: string;
}

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
}

type EmployeeCreatePayload = {
  name: string;
  username: string;
  password: string;
  role: 'manager' | 'technician';
}

type EmployeeUpdatePayload = {
  name?: string;
  username?: string;
  role?: 'manager' | 'technician';
  is_active?: boolean;
}

export function roleLabel(role: Employee['role']): string {
  if (role === 'manager') return 'Gerente'
  if (role === 'technician') return 'Técnico'
  return 'Personalizado'
}

export function useEmployees() {
  const auth = useAuth()
  const search = ref('')
  const employeesState = ref<Employee[]>([])
  const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
  const error = ref<unknown>(null)

  const refresh = async () => {
    if (!auth.token.value) {
      employeesState.value = []
      status.value = 'idle'
      error.value = null
      return employeesState.value
    }

    status.value = 'pending'
    error.value = null

    try {
      const response = await useApiFetch<ApiEnvelope<Employee[]>>('/employees')
      employeesState.value = response.data
      status.value = 'success'
      return employeesState.value
    } catch (err) {
      employeesState.value = []
      status.value = 'error'
      error.value = err
      throw err
    }
  }

  watch(
    [() => auth.hydrated.value, () => auth.token.value],
    async ([hydrated, token]) => {
      if (!hydrated) return

      if (!token) {
        employeesState.value = []
        status.value = 'idle'
        error.value = null
        return
      }

      await refresh()
    },
    { immediate: true }
  )

  const employeesResolved = computed<Employee[]>(() =>
    Array.isArray(employeesState.value) ? employeesState.value : []
  )

  const filteredEmployees = computed(() => {
    const term = search.value.trim().toLowerCase()
    if (!term) return employeesResolved.value

    return employeesResolved.value.filter(emp =>
      emp.user.name.toLowerCase().includes(term)
      || (emp.user.username ?? '').toLowerCase().includes(term)
      || emp.company.name.toLowerCase().includes(term)
    )
  })

  const setEmployees = (next: Employee[]) => {
    employeesState.value = next
    status.value = 'success'
    error.value = null
  }

  const createEmployee = async (
    companyId: number,
    payload: EmployeeCreatePayload
  ): Promise<Employee> => {
    const response = await useApiFetch<ApiEnvelope<Employee>>(
      `/companies/${companyId}/employees`,
      {
        method: 'POST',
        body: {
          name: payload.name.trim(),
          username: payload.username.trim().toLowerCase(),
          password: payload.password,
          role: payload.role
        }
      }
    )

    await refresh()
    return response.data
  }

  const updateEmployee = async (
    companyId: number,
    employeeId: number,
    payload: EmployeeUpdatePayload
  ): Promise<Employee> => {
    const response = await useApiFetch<ApiEnvelope<Employee>>(
      `/companies/${companyId}/employees/${employeeId}`,
      {
        method: 'PATCH',
        body: payload
      }
    )

    setEmployees(
      employeesResolved.value.map(emp =>
        emp.id === employeeId ? response.data : emp
      )
    )
    return response.data
  }

  const deactivateEmployee = async (
    companyId: number,
    employeeId: number
  ): Promise<void> => {
    await useApiFetch(
      `/companies/${companyId}/employees/${employeeId}`,
      { method: 'DELETE' }
    )

    setEmployees(
      employeesResolved.value.map(emp =>
        emp.id === employeeId ? { ...emp, is_active: false } : emp
      )
    )
  }

  const resetPassword = async (
    companyId: number,
    employeeId: number,
    password: string
  ): Promise<void> => {
    await useApiFetch(
      `/companies/${companyId}/employees/${employeeId}/password`,
      {
        method: 'PUT',
        body: { password }
      }
    )
  }

  return {
    search,
    employees: filteredEmployees,
    status,
    error,
    refresh,
    createEmployee,
    updateEmployee,
    deactivateEmployee,
    resetPassword
  }
}
