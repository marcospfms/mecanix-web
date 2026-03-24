export type Customer = {
  id: number;
  name: string;
  tax_id: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

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
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type CustomerFormPayload = {
  name: string;
  tax_id: string;
  phone?: string | null;
  email?: string | null;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function formatTaxId(value: string) {
  const digits = onlyDigits(value);

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  }

  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function formatBrPhone(value?: string | null) {
  if (!value) return '-';

  const digits = onlyDigits(value);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function formatLicensePlate(value: string) {
  const clean = value.replace(/\s+/g, '').toUpperCase();

  if (clean.length === 7) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }

  return clean;
}

export function useCustomers() {
  const auth = useAuth();
  const search = ref('');

  const customersState = useAPI<ApiEnvelope<Customer[]>>('/customers', {
    key: 'customers:list',
    immediate: false,
    server: false,
    default: () => ({ success: true, data: [] }),
    transform: (response) => response.data
  });

  watch(
    [() => auth.hydrated.value, () => auth.token.value],
    async ([hydrated, token]) => {
      if (!hydrated) return;

      if (!token) {
        customersState.data.value = [];
        customersState.clear();
        return;
      }

      await customersState.refresh();
    },
    { immediate: true }
  );

  const filteredCustomers = computed(() => {
    const term = search.value.trim().toLowerCase();

    if (!term) {
      return customersState.data.value ?? [];
    }

    return (customersState.data.value ?? []).filter((customer) => {
      const taxDigits = onlyDigits(customer.tax_id);
      const phoneDigits = onlyDigits(customer.phone ?? '');

      return (
        customer.name.toLowerCase().includes(term) ||
        customer.tax_id.toLowerCase().includes(term) ||
        taxDigits.includes(onlyDigits(term)) ||
        phoneDigits.includes(onlyDigits(term)) ||
        (customer.email ?? '').toLowerCase().includes(term)
      );
    });
  });

  const createCustomer = async (payload: CustomerFormPayload) => {
    const response = await useApiFetch<ApiEnvelope<Customer>>('/customers', {
      method: 'POST',
      body: {
        name: payload.name.trim(),
        tax_id: onlyDigits(payload.tax_id).slice(0, 14),
        phone: payload.phone ? onlyDigits(payload.phone).slice(0, 13) : null,
        email: payload.email?.trim() || null
      }
    });

    await customersState.refresh();
    return response.data;
  };

  const updateCustomer = async (id: number, payload: CustomerFormPayload) => {
    const response = await useApiFetch<ApiEnvelope<Customer>>(`/customers/${id}`, {
      method: 'PUT',
      body: {
        name: payload.name.trim(),
        tax_id: onlyDigits(payload.tax_id).slice(0, 14),
        phone: payload.phone ? onlyDigits(payload.phone).slice(0, 13) : null,
        email: payload.email?.trim() || null
      }
    });

    await customersState.refresh();
    return response.data;
  };

  const deleteCustomer = async (id: number) => {
    await useApiFetch(`/customers/${id}`, { method: 'DELETE' });
    await customersState.refresh();
  };

  return {
    search,
    customers: filteredCustomers,
    rawCustomers: customersState.data,
    status: customersState.status,
    error: customersState.error,
    refresh: customersState.refresh,
    createCustomer,
    updateCustomer,
    deleteCustomer
  };
}

export function useCustomer(customerId: Ref<number | null> | ComputedRef<number | null>) {
  const auth = useAuth();

  const customer = useAPI<ApiEnvelope<Customer>>(
    () => `/customers/${customerId.value}`,
    {
      key: () => `customers:${customerId.value ?? 'none'}`,
      immediate: false,
      server: false,
      default: () => ({ success: true, data: null as unknown as Customer }),
      transform: (response) => response.data
    }
  );

  watch(
    [() => auth.hydrated.value, () => auth.token.value, () => customerId.value],
    async ([hydrated, token, id]) => {
      if (!hydrated || !id) return;

      if (!token) {
        customer.data.value = null;
        customer.clear();
        return;
      }

      await customer.refresh();
    },
    { immediate: true }
  );

  return customer;
}

export function useCustomerVehicles(customerId: Ref<number | null> | ComputedRef<number | null>) {
  const auth = useAuth();

  const vehicles = useAPI<ApiEnvelope<CustomerVehicle[]>>(
    () => `/customers/${customerId.value}/vehicles`,
    {
      key: () => `customers:${customerId.value ?? 'none'}:vehicles`,
      immediate: false,
      server: false,
      default: () => ({ success: true, data: [] }),
      transform: (response) => response.data
    }
  );

  watch(
    [() => auth.hydrated.value, () => auth.token.value, () => customerId.value],
    async ([hydrated, token, id]) => {
      if (!hydrated || !id) return;

      if (!token) {
        vehicles.data.value = [];
        vehicles.clear();
        return;
      }

      await vehicles.refresh();
    },
    { immediate: true }
  );

  return vehicles;
}
