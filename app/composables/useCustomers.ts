export type Customer = {
  id: number;
  name: string;
  tax_id: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export type CustomerVehicle = {
  id: number;
  customer_id: number;
  license_plate: string;
  model: string;
  model_year?: number | null;
  color?: string | null;
  latest_mileage?: number | null;
  checklists_total?: number | null;
  checklists_done?: number | null;
  created_at: string;
  updated_at: string;
}

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
}

type CustomerFormPayload = {
  name: string;
  tax_id: string;
  phone?: string | null;
  email?: string | null;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

export function formatTaxId(value: string) {
  const digits = onlyDigits(value)

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2')
  }

  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function formatBrPhone(value?: string | null) {
  if (!value) return '-'

  const digits = onlyDigits(value)

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }

  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

export function useCustomers() {
  const auth = useAuth()
  const search = ref('')
  const customersState = ref<Customer[]>([])
  const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
  const error = ref<unknown>(null)

  const refresh = async () => {
    if (!auth.token.value) {
      customersState.value = []
      status.value = 'idle'
      error.value = null
      return customersState.value
    }

    status.value = 'pending'
    error.value = null

    try {
      const response = await useApiFetch<ApiEnvelope<Customer[]>>('/customers')
      customersState.value = response.data
      status.value = 'success'
      return customersState.value
    } catch (err) {
      customersState.value = []
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
        customersState.value = []
        status.value = 'idle'
        error.value = null
        return
      }

      await refresh()
    },
    { immediate: true }
  )

  const customersResolved = computed<Customer[]>(() => {
    const source = customersState.value
    return Array.isArray(source) ? source : []
  })

  const filteredCustomers = computed(() => {
    const term = search.value.trim().toLowerCase()

    if (!term) {
      return customersResolved.value
    }

    return customersResolved.value.filter((customer) => {
      const taxDigits = onlyDigits(customer.tax_id)
      const phoneDigits = onlyDigits(customer.phone ?? '')

      return (
        customer.name.toLowerCase().includes(term)
        || customer.tax_id.toLowerCase().includes(term)
        || taxDigits.includes(onlyDigits(term))
        || phoneDigits.includes(onlyDigits(term))
        || (customer.email ?? '').toLowerCase().includes(term)
      )
    })
  })

  const setCustomers = (nextCustomers: Customer[]) => {
    customersState.value = nextCustomers
    status.value = 'success'
    error.value = null
  }

  const createCustomer = async (payload: CustomerFormPayload) => {
    const response = await useApiFetch<ApiEnvelope<Customer>>('/customers', {
      method: 'POST',
      body: {
        name: payload.name.trim(),
        tax_id: onlyDigits(payload.tax_id).slice(0, 14),
        phone: payload.phone ? onlyDigits(payload.phone).slice(0, 13) : null,
        email: payload.email?.trim() || null
      }
    })

    setCustomers([response.data, ...customersResolved.value])
    return response.data
  }

  const updateCustomer = async (id: number, payload: CustomerFormPayload) => {
    const response = await useApiFetch<ApiEnvelope<Customer>>(
      `/customers/${id}`,
      {
        method: 'PUT',
        body: {
          name: payload.name.trim(),
          tax_id: onlyDigits(payload.tax_id).slice(0, 14),
          phone: payload.phone ? onlyDigits(payload.phone).slice(0, 13) : null,
          email: payload.email?.trim() || null
        }
      }
    )

    setCustomers(
      customersResolved.value.map(customer =>
        customer.id === id ? response.data : customer
      )
    )
    return response.data
  }

  const deleteCustomer = async (id: number) => {
    await useApiFetch(`/customers/${id}`, { method: 'DELETE' })
    setCustomers(customersResolved.value.filter(customer => customer.id !== id))
  }

  return {
    search,
    customers: filteredCustomers,
    rawCustomers: customersResolved,
    status,
    error,
    refresh,
    createCustomer,
    updateCustomer,
    deleteCustomer
  }
}

export function useCustomerActions() {
  const updateCustomer = async (id: number, payload: CustomerFormPayload) => {
    const response = await useApiFetch<ApiEnvelope<Customer>>(
      `/customers/${id}`,
      {
        method: 'PUT',
        body: {
          name: payload.name.trim(),
          tax_id: onlyDigits(payload.tax_id).slice(0, 14),
          phone: payload.phone ? onlyDigits(payload.phone).slice(0, 13) : null,
          email: payload.email?.trim() || null
        }
      }
    )

    return response.data
  }

  const deleteCustomer = async (id: number) => {
    await useApiFetch(`/customers/${id}`, { method: 'DELETE' })
  }

  return {
    updateCustomer,
    deleteCustomer
  }
}

export function useCustomer(
  customerId: Ref<number | null> | ComputedRef<number | null>
) {
  const auth = useAuth()

  const customer = useAPI<Customer | null, ApiEnvelope<Customer>>(
    () => `/customers/${customerId.value}`,
    {
      key: () => `customers:${customerId.value ?? 'none'}`,
      immediate: false,
      server: false,
      default: (): Customer | null => null,
      transform: response => response.data
    }
  )

  watch(
    [() => auth.hydrated.value, () => auth.token.value, () => customerId.value],
    async ([hydrated, token, id]) => {
      if (!hydrated || !id) return

      if (!token) {
        customer.data.value = null
        customer.clear()
        return
      }

      await customer.refresh()
    },
    { immediate: true }
  )

  return customer
}

export function useCustomerVehicles(
  customerId: Ref<number | null> | ComputedRef<number | null>
) {
  const auth = useAuth()

  const vehicles = useAPI<CustomerVehicle[], ApiEnvelope<CustomerVehicle[]>>(
    () => `/customers/${customerId.value}/vehicles`,
    {
      key: () => `customers:${customerId.value ?? 'none'}:vehicles`,
      immediate: false,
      server: false,
      default: (): CustomerVehicle[] => [],
      transform: response => response.data
    }
  )

  watch(
    [() => auth.hydrated.value, () => auth.token.value, () => customerId.value],
    async ([hydrated, token, id]) => {
      if (!hydrated || !id) return

      if (!token) {
        vehicles.data.value = []
        vehicles.clear()
        return
      }

      await vehicles.refresh()
    },
    { immediate: true }
  )

  return vehicles
}
