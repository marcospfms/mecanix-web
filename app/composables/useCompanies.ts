import { useAuth } from './useAuth'
import { useApiFetch } from './useAPI'

export type Company = {
  id: number;
  name: string;
  cnpj: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
}

type CompanyFormPayload = {
  name: string;
  cnpj: string;
  logo?: File | null;
}

function normalizeCnpj(value: string) {
  return value.replace(/\D/g, '').slice(0, 14)
}

export function formatCnpj(value: string) {
  const digits = normalizeCnpj(value)

  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function useCompanies() {
  const auth = useAuth()
  const search = ref('')
  const companiesState = ref<Company[]>([])
  const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
  const error = ref<unknown>(null)

  const refresh = async () => {
    if (!auth.token.value) {
      companiesState.value = []
      status.value = 'idle'
      error.value = null
      return companiesState.value
    }

    status.value = 'pending'
    error.value = null

    try {
      const response = await useApiFetch<ApiEnvelope<Company[]>>('/companies')
      companiesState.value = response.data
      status.value = 'success'
      return companiesState.value
    } catch (err) {
      companiesState.value = []
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
        companiesState.value = []
        status.value = 'idle'
        error.value = null
        return
      }

      await refresh()
    },
    { immediate: true }
  )

  const companiesResolved = computed<Company[]>(() => {
    const source = companiesState.value
    return Array.isArray(source) ? source : []
  })

  const filteredCompanies = computed(() => {
    const term = search.value.trim().toLowerCase()

    if (!term) {
      return companiesResolved.value
    }

    return companiesResolved.value.filter((company) => {
      const cnpjDigits = normalizeCnpj(company.cnpj)

      return (
        company.name.toLowerCase().includes(term)
        || company.cnpj.toLowerCase().includes(term)
        || cnpjDigits.includes(normalizeCnpj(term))
      )
    })
  })

  const setCompanies = (nextCompanies: Company[]) => {
    companiesState.value = nextCompanies
    status.value = 'success'
    error.value = null
  }

  const createCompany = async (payload: CompanyFormPayload) => {
    const company = await useApiFetch<ApiEnvelope<Company>>('/companies', {
      method: 'POST',
      body: {
        name: payload.name.trim(),
        cnpj: normalizeCnpj(payload.cnpj)
      }
    })

    if (payload.logo) {
      await updateCompany(company.data.id, payload)
    } else {
      setCompanies([company.data, ...companiesResolved.value])
    }
  }

  const updateCompany = async (id: number, payload: CompanyFormPayload) => {
    if (payload.logo) {
      const formData = new FormData()
      formData.append('_method', 'PUT')
      formData.append('name', payload.name.trim())
      formData.append('cnpj', normalizeCnpj(payload.cnpj))
      formData.append('logo', payload.logo)

      await useApiFetch<ApiEnvelope<Company>>(`/companies/${id}`, {
        method: 'POST',
        body: formData
      })
    } else {
      const response = await useApiFetch<ApiEnvelope<Company>>(`/companies/${id}`, {
        method: 'PUT',
        body: {
          name: payload.name.trim(),
          cnpj: normalizeCnpj(payload.cnpj)
        }
      })

      setCompanies(
        companiesResolved.value.map(company =>
          company.id === id ? response.data : company
        )
      )
      return
    }

    await refresh()
  }

  const deleteCompany = async (id: number) => {
    await useApiFetch(`/companies/${id}`, { method: 'DELETE' })
    setCompanies(companiesResolved.value.filter(company => company.id !== id))
  }

  const removeLogo = async (id: number) => {
    await useApiFetch(`/companies/${id}/logo`, { method: 'DELETE' })
    setCompanies(
      companiesResolved.value.map(company =>
        company.id === id ? { ...company, logo_url: null } : company
      )
    )
  }

  return {
    search,
    companies: filteredCompanies,
    rawCompanies: companiesResolved,
    status,
    error,
    refresh,
    createCompany,
    updateCompany,
    deleteCompany,
    removeLogo
  }
}
