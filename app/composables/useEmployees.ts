import { useAuth } from './useAuth'
import { useApiFetch } from './useAPI'

// ─── Permission types ────────────────────────────────────────────────
export type PermissionActionKey = 'view' | 'create' | 'update' | 'delete'

export type PermissionModuleKey
  = | 'companies'
    | 'customers'
    | 'vehicles'
    | 'checklist_templates'
    | 'checklists'
    | 'employees'

export type PermissionActions = {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export type EmployeePermissions = {
  companies: PermissionActions;
  customers: PermissionActions;
  vehicles: PermissionActions;
  checklist_templates: PermissionActions;
  checklists: PermissionActions;
  employees: PermissionActions;
}

export const permissionModules: Array<{
  key: PermissionModuleKey;
  label: string;
  description: string;
}> = [
  {
    key: 'companies',
    label: 'Lojas',
    description: 'Configurações e dados centrais da loja.'
  },
  {
    key: 'customers',
    label: 'Clientes',
    description: 'Cadastro e manutenção de clientes.'
  },
  {
    key: 'vehicles',
    label: 'Veículos',
    description: 'Cadastro, edição e exclusão de veículos.'
  },
  {
    key: 'checklist_templates',
    label: 'Templates',
    description: 'Modelos usados para gerar checklists.'
  },
  {
    key: 'checklists',
    label: 'Checklists',
    description: 'Execução, edição e histórico das inspeções.'
  },
  {
    key: 'employees',
    label: 'Equipe',
    description: 'Acessos, funções e senhas da equipe.'
  }
]

export const permissionActions: Array<{
  key: PermissionActionKey;
  label: string;
}> = [
  { key: 'view', label: 'Ver' },
  { key: 'create', label: 'Criar' },
  { key: 'update', label: 'Editar' },
  { key: 'delete', label: 'Excluir' }
]

const employeeDeletableModules: PermissionModuleKey[] = ['checklists']

export function isEmployeeDeleteAllowed(module: PermissionModuleKey): boolean {
  return employeeDeletableModules.includes(module)
}

export function getPermissionActionsForModule(module: PermissionModuleKey) {
  return permissionActions.filter(
    action => action.key !== 'delete' || isEmployeeDeleteAllowed(module)
  )
}

export function getPermissionPreset(
  role: 'manager' | 'technician'
): EmployeePermissions {
  if (role === 'manager') {
    return {
      companies: { view: true, create: false, update: true, delete: false },
      customers: { view: true, create: true, update: true, delete: false },
      vehicles: { view: true, create: true, update: true, delete: false },
      checklist_templates: {
        view: true,
        create: true,
        update: true,
        delete: false
      },
      checklists: { view: true, create: true, update: true, delete: true },
      employees: { view: true, create: true, update: true, delete: false }
    }
  }
  return {
    companies: { view: true, create: false, update: false, delete: false },
    customers: { view: true, create: true, update: true, delete: false },
    vehicles: { view: true, create: true, update: true, delete: false },
    checklist_templates: {
      view: true,
      create: false,
      update: false,
      delete: false
    },
    checklists: { view: true, create: true, update: true, delete: true },
    employees: { view: false, create: false, update: false, delete: false }
  }
}

export function sanitizeEmployeePermissions(
  permissions: EmployeePermissions
): EmployeePermissions {
  const sanitized = JSON.parse(JSON.stringify(permissions)) as EmployeePermissions

  permissionModules.forEach((module) => {
    if (!isEmployeeDeleteAllowed(module.key)) {
      sanitized[module.key].delete = false
    }
  })

  return sanitized
}

export function detectRoleFromPermissions(
  permissions: EmployeePermissions
): 'manager' | 'technician' | 'custom' {
  const sanitized = sanitizeEmployeePermissions(permissions)

  if (
    JSON.stringify(sanitized)
    === JSON.stringify(getPermissionPreset('manager'))
  )
    return 'manager'
  if (
    JSON.stringify(sanitized)
    === JSON.stringify(getPermissionPreset('technician'))
  )
    return 'technician'
  return 'custom'
}

// ─── Employee types ──────────────────────────────────────────────────
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
  role: 'manager' | 'technician' | 'custom';
  preset_label?: string;
  permissions: EmployeePermissions;
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
  permissions: EmployeePermissions;
}

type EmployeeUpdatePayload = {
  name?: string;
  username?: string;
  role?: 'manager' | 'technician' | 'custom';
  permissions?: EmployeePermissions;
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

    return employeesResolved.value.filter(
      emp =>
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
          role: payload.role,
          permissions: payload.permissions
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
    await useApiFetch(`/companies/${companyId}/employees/${employeeId}`, {
      method: 'DELETE'
    })

    setEmployees(
      employeesResolved.value.map(emp =>
        emp.id === employeeId ? { ...emp, is_active: false } : emp
      )
    )
  }

  const removeEmployeeFromCompany = async (
    companyId: number,
    employeeId: number
  ): Promise<void> => {
    await useApiFetch(`/companies/${companyId}/employees/${employeeId}/company-link`, {
      method: 'DELETE'
    })

    setEmployees(
      employeesResolved.value.filter(emp => emp.id !== employeeId)
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
    removeEmployeeFromCompany,
    resetPassword
  }
}
