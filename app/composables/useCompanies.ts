import { useAuth } from './useAuth'
import { useAPI, useApiFetch } from './useAPI'

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

  const companiesState = useAPI<Company[], ApiEnvelope<Company[]>>(
    '/companies',
    {
      key: 'companies:list',
      immediate: false,
      server: false,
      default: (): Company[] => [],
      transform: response => response.data
    }
  )

  watch(
    [() => auth.hydrated.value, () => auth.token.value],
    async ([hydrated, token]) => {
      if (!hydrated) return

      if (!token) {
        companiesState.data.value = []
        companiesState.clear()
        return
      }

      await companiesState.refresh()
    },
    { immediate: true }
  )

  const filteredCompanies = computed(() => {
    const term = search.value.trim().toLowerCase()

    if (!term) {
      return companiesState.data.value ?? []
    }

    return (companiesState.data.value ?? []).filter((company) => {
      const cnpjDigits = normalizeCnpj(company.cnpj)

      return (
        company.name.toLowerCase().includes(term)
        || company.cnpj.toLowerCase().includes(term)
        || cnpjDigits.includes(normalizeCnpj(term))
      )
    })
  })

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
      await companiesState.refresh()
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
      await useApiFetch<ApiEnvelope<Company>>(`/companies/${id}`, {
        method: 'PUT',
        body: {
          name: payload.name.trim(),
          cnpj: normalizeCnpj(payload.cnpj)
        }
      })
    }

    await companiesState.refresh()
  }

  const deleteCompany = async (id: number) => {
    await useApiFetch(`/companies/${id}`, { method: 'DELETE' })
    await companiesState.refresh()
  }

  const removeLogo = async (id: number) => {
    await useApiFetch(`/companies/${id}/logo`, { method: 'DELETE' })
    await companiesState.refresh()
  }

  return {
    search,
    companies: filteredCompanies,
    rawCompanies: companiesState.data,
    status: companiesState.status,
    error: companiesState.error,
    refresh: companiesState.refresh,
    createCompany,
    updateCompany,
    deleteCompany,
    removeLogo
  }
}
