import { useAuth } from './useAuth'
import { useAPI, useApiFetch } from './useAPI'

export type VehicleCustomer = {
  id: number;
  name: string;
  tax_id: string;
  phone: string | null;
}

export type Vehicle = {
  id: number;
  customer_id: number;
  license_plate: string;
  model: string | null;
  model_year: number | null;
  color: string | null;
  vehicle_type_id?: number | null;
  latest_mileage?: number | null;
  checklists_total?: number | null;
  checklists_done?: number | null;
  customer?: VehicleCustomer;
  created_at: string;
  updated_at: string;
}

export type VehicleMileageHistory = {
  id: number;
  vehicle_id: number;
  mileage: number;
  source_type: 'checklist' | 'manual';
  source_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  checklist?: {
    id: number;
    name: string;
    is_completed: boolean;
    completed_at: string | null;
    created_at: string;
    executed_by: { id: number; name: string } | null;
  } | null;
}

export type VehicleChecklistExecutor = {
  id: number;
  name: string;
  username: string | null;
} | null

export type VehicleChecklistStats = {
  total: number;
  completed: number;
  open: number;
}

export type VehicleChecklistItemOption = {
  id: number;
  vehicle_checklist_item_id: number;
  label: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export type VehicleChecklistItemSelection = {
  id: number;
  vehicle_checklist_item_id: number;
  vehicle_checklist_item_option_id: number;
  created_at: string;
  updated_at: string;
}

export type VehicleChecklistItem = {
  id: number;
  name: string;
  description: string | null;
  is_completable: boolean;
  allows_multiple_responses: boolean;
  is_required: boolean;
  is_checked: boolean;
  notes: string | null;
  options?: VehicleChecklistItemOption[];
  selections?: VehicleChecklistItemSelection[];
  created_at: string;
  updated_at: string;
}

export type VehicleChecklist = {
  id: number;
  vehicle_id: number;
  user_id?: number | null;
  name: string;
  is_completed: boolean;
  completed_at: string | null;
  executed_by?: VehicleChecklistExecutor;
  stats?: VehicleChecklistStats;
  items?: VehicleChecklistItem[];
  created_at: string;
  updated_at: string;
}

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
}

type VehicleFormPayload = {
  customer_id: number;
  license_plate: string;
  model?: string | null;
  model_year?: number | null;
  color?: string | null;
}

type MileageFormPayload = {
  mileage: number;
  notes?: string | null;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function normalizePlate(value: string) {
  return value
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 7)
}

export function formatLicensePlate(value: string) {
  const clean = normalizePlate(value)

  if (clean.length === 7) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`
  }

  return clean
}

export function formatMileage(value?: number | null) {
  if (typeof value !== 'number') {
    return '-'
  }

  return `${value.toLocaleString('pt-BR')} km`
}

export function mileageSourceLabel(
  value: VehicleMileageHistory['source_type']
) {
  return value === 'manual' ? 'Manual' : 'Checklist'
}

export function useVehicles() {
  const auth = useAuth()
  const search = ref('')
  const vehiclesState = ref<Vehicle[]>([])
  const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
  const error = ref<unknown>(null)

  const refresh = async () => {
    if (!auth.token.value) {
      vehiclesState.value = []
      status.value = 'idle'
      error.value = null
      return vehiclesState.value
    }

    status.value = 'pending'
    error.value = null

    try {
      const response = await useApiFetch<ApiEnvelope<Vehicle[]>>('/vehicles')
      vehiclesState.value = response.data
      status.value = 'success'
      return vehiclesState.value
    } catch (err) {
      vehiclesState.value = []
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
        vehiclesState.value = []
        status.value = 'idle'
        error.value = null
        return
      }

      await refresh()
    },
    { immediate: true }
  )

  const vehiclesResolved = computed<Vehicle[]>(() => {
    const source = vehiclesState.value
    return Array.isArray(source) ? source : []
  })

  const filteredVehicles = computed(() => {
    const term = search.value.trim().toLowerCase()
    const list = [...vehiclesResolved.value].sort((a, b) => b.id - a.id)

    if (!term) {
      return list
    }

    const searchDigits = onlyDigits(term)

    return list.filter((vehicle) => {
      const plate = vehicle.license_plate.toLowerCase()
      const model = (vehicle.model ?? '').toLowerCase()
      const customerName = (vehicle.customer?.name ?? '').toLowerCase()
      const customerTaxId = onlyDigits(vehicle.customer?.tax_id ?? '')

      return (
        plate.includes(term)
        || normalizePlate(vehicle.license_plate)
          .toLowerCase()
          .includes(term.replace(/\s+/g, ''))
          || model.includes(term)
          || customerName.includes(term)
          || (searchDigits.length > 0 && customerTaxId.includes(searchDigits))
      )
    })
  })

  const { createVehicle, updateVehicle, deleteVehicle } = useVehicleActions()

  const setVehicles = (nextVehicles: Vehicle[]) => {
    vehiclesState.value = nextVehicles
    status.value = 'success'
    error.value = null
  }

  const createAndRefreshVehicle = async (payload: VehicleFormPayload) => {
    const vehicle = await createVehicle(payload)
    setVehicles([vehicle, ...vehiclesResolved.value])
    return vehicle
  }

  const updateAndRefreshVehicle = async (
    id: number,
    payload: Omit<VehicleFormPayload, 'customer_id'>
  ) => {
    const vehicle = await updateVehicle(id, payload)
    setVehicles(
      vehiclesResolved.value.map(currentVehicle =>
        currentVehicle.id === id ? vehicle : currentVehicle
      )
    )
    return vehicle
  }

  const deleteAndRefreshVehicle = async (id: number) => {
    await deleteVehicle(id)
    setVehicles(vehiclesResolved.value.filter(vehicle => vehicle.id !== id))
  }

  return {
    search,
    vehicles: filteredVehicles,
    rawVehicles: vehiclesResolved,
    status,
    error,
    refresh,
    createVehicle: createAndRefreshVehicle,
    updateVehicle: updateAndRefreshVehicle,
    deleteVehicle: deleteAndRefreshVehicle
  }
}

export function useVehicleActions() {
  const createVehicle = async (payload: VehicleFormPayload) => {
    const response = await useApiFetch<ApiEnvelope<Vehicle>>('/vehicles', {
      method: 'POST',
      body: {
        customer_id: payload.customer_id,
        license_plate: normalizePlate(payload.license_plate),
        model: payload.model?.trim() || null,
        model_year: payload.model_year ?? null,
        color: payload.color?.trim() || null
      }
    })

    return response.data
  }

  const updateVehicle = async (
    id: number,
    payload: Omit<VehicleFormPayload, 'customer_id'>
  ) => {
    const response = await useApiFetch<ApiEnvelope<Vehicle>>(
      `/vehicles/${id}`,
      {
        method: 'PUT',
        body: {
          license_plate: normalizePlate(payload.license_plate),
          model: payload.model?.trim() || null,
          model_year: payload.model_year ?? null,
          color: payload.color?.trim() || null
        }
      }
    )

    return response.data
  }

  const deleteVehicle = async (id: number) => {
    await useApiFetch(`/vehicles/${id}`, { method: 'DELETE' })
  }

  return {
    createVehicle,
    updateVehicle,
    deleteVehicle
  }
}

export function useVehicle(
  vehicleId: Ref<number | null> | ComputedRef<number | null>
) {
  const auth = useAuth()

  const vehicle = useAPI<Vehicle | null, ApiEnvelope<Vehicle>>(
    () => `/vehicles/${vehicleId.value}`,
    {
      key: () => `vehicles:${vehicleId.value ?? 'none'}`,
      immediate: false,
      server: false,
      default: (): Vehicle | null => null,
      transform: response => response.data
    }
  )

  watch(
    [() => auth.hydrated.value, () => auth.token.value, () => vehicleId.value],
    async ([hydrated, token, id]) => {
      if (!hydrated || !id) return

      if (!token) {
        vehicle.data.value = null
        vehicle.clear()
        return
      }

      await vehicle.refresh()
    },
    { immediate: true }
  )

  return vehicle
}

export function useMileageHistory(
  vehicleId: Ref<number | null> | ComputedRef<number | null>
) {
  const auth = useAuth()

  const mileageState = useAPI<
    VehicleMileageHistory[],
    ApiEnvelope<VehicleMileageHistory[]>
  >(() => `/vehicles/${vehicleId.value}/mileage-history`, {
    key: () => `vehicles:${vehicleId.value ?? 'none'}:mileage-history`,
    immediate: false,
    server: false,
    default: (): VehicleMileageHistory[] => [],
    transform: response => response.data
  })

  watch(
    [() => auth.hydrated.value, () => auth.token.value, () => vehicleId.value],
    async ([hydrated, token, id]) => {
      if (!hydrated || !id) return

      if (!token) {
        mileageState.data.value = []
        mileageState.clear()
        return
      }

      await mileageState.refresh()
    },
    { immediate: true }
  )

  const latestMileage = computed(() => {
    const history = Array.isArray(mileageState.data.value)
      ? mileageState.data.value
      : []
    return history[0] ?? null
  })

  const createMileage = async (payload: MileageFormPayload) => {
    const response = await useApiFetch<ApiEnvelope<VehicleMileageHistory>>(
      '/vehicle-mileage-history',
      {
        method: 'POST',
        body: {
          vehicle_id: vehicleId.value,
          mileage: payload.mileage,
          source_type: 'manual',
          notes: payload.notes?.trim() || null
        }
      }
    )

    await mileageState.refresh()
    return response.data
  }

  const updateMileage = async (id: number, payload: MileageFormPayload) => {
    const response = await useApiFetch<ApiEnvelope<VehicleMileageHistory>>(
      `/vehicle-mileage-history/${id}`,
      {
        method: 'PUT',
        body: {
          mileage: payload.mileage,
          source_type: 'manual',
          notes: payload.notes?.trim() || null
        }
      }
    )

    await mileageState.refresh()
    return response.data
  }

  const deleteMileage = async (id: number) => {
    await useApiFetch(`/vehicle-mileage-history/${id}`, { method: 'DELETE' })
    await mileageState.refresh()
  }

  return {
    history: mileageState.data,
    latestMileage,
    status: mileageState.status,
    error: mileageState.error,
    refresh: mileageState.refresh,
    createMileage,
    updateMileage,
    deleteMileage
  }
}

type PaginatedVehiclesResponse = {
  items: Vehicle[];
  next_cursor: string | null;
  has_more: boolean;
  per_page: number;
}

type PaginatedEnvelope = {
  success: boolean;
  data: PaginatedVehiclesResponse;
}

export function useVehiclesPaginated() {
  const auth = useAuth()

  const search = ref('')
  const vehicles = ref<Vehicle[]>([])
  const nextCursor = ref<string | null>(null)
  const hasMore = ref(false)
  const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
  const error = ref<unknown>(null)
  const isLoadingMore = ref(false)

  const fetchPage = async (cursor: string | null = null, append = false) => {
    if (!auth.token.value) {
      vehicles.value = []
      status.value = 'idle'
      return
    }

    const params: Record<string, string> = { per_page: '20' }
    if (search.value.trim()) params.q = search.value.trim()
    if (cursor) params.cursor = cursor

    const query = new URLSearchParams(params).toString()

    try {
      const response = await useApiFetch<PaginatedEnvelope>(`/vehicles/paginated?${query}`)
      const page = response.data

      if (append) {
        vehicles.value = [...vehicles.value, ...(page.items ?? [])]
      }
      else {
        vehicles.value = page.items ?? []
      }

      nextCursor.value = page.next_cursor ?? null
      hasMore.value = page.has_more ?? !!page.next_cursor
      status.value = 'success'
    }
    catch (err) {
      if (!append) vehicles.value = []
      status.value = 'error'
      error.value = err
      throw err
    }
  }

  const refresh = async () => {
    status.value = 'pending'
    error.value = null
    nextCursor.value = null
    await fetchPage(null, false)
  }

  const loadMore = async () => {
    if (!nextCursor.value || isLoadingMore.value) return
    isLoadingMore.value = true
    try {
      await fetchPage(nextCursor.value, true)
    }
    finally {
      isLoadingMore.value = false
    }
  }

  watch(
    [() => auth.hydrated.value, () => auth.token.value],
    async ([hydrated, token]) => {
      if (!hydrated) return
      if (!token) {
        vehicles.value = []
        status.value = 'idle'
        error.value = null
        return
      }
      await refresh()
    },
    { immediate: true }
  )

  return {
    search,
    vehicles,
    nextCursor,
    hasMore,
    isLoadingMore,
    status,
    error,
    refresh,
    loadMore
  }
}

export function useVehicleChecklists(
  vehicleId: Ref<number | null> | ComputedRef<number | null>
) {
  const auth = useAuth()

  const checklistsState = useAPI<
    VehicleChecklist[],
    ApiEnvelope<VehicleChecklist[]>
  >(() => `/vehicles/${vehicleId.value}/checklists`, {
    key: () => `vehicles:${vehicleId.value ?? 'none'}:checklists`,
    immediate: false,
    server: false,
    default: (): VehicleChecklist[] => [],
    transform: response => response.data
  })

  watch(
    [() => auth.hydrated.value, () => auth.token.value, () => vehicleId.value],
    async ([hydrated, token, id]) => {
      if (!hydrated || !id) return

      if (!token) {
        checklistsState.data.value = []
        checklistsState.clear()
        return
      }

      await checklistsState.refresh()
    },
    { immediate: true }
  )

  const recentChecklists = computed(() => {
    const items = Array.isArray(checklistsState.data.value)
      ? checklistsState.data.value
      : []
    return items.slice(0, 5)
  })

  return {
    checklists: checklistsState.data,
    recentChecklists,
    status: checklistsState.status,
    error: checklistsState.error,
    refresh: checklistsState.refresh
  }
}

export function useVehiclesSelector() {
  const auth = useAuth()

  const search = ref('')
  const vehicles = ref<Vehicle[]>([])
  const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
  const error = ref<unknown>(null)

  let searchTimer: ReturnType<typeof setTimeout> | null = null

  const fetchSelector = async (query?: string) => {
    if (!auth.token.value) {
      vehicles.value = []
      status.value = 'idle'
      return
    }

    status.value = 'pending'
    error.value = null

    try {
      const params = new URLSearchParams({ limit: '50' })
      if (query?.trim()) params.set('q', query.trim())
      const response = await useApiFetch<ApiEnvelope<Vehicle[]>>(
        `/vehicles/selector?${params.toString()}`
      )
      vehicles.value = response.data
      status.value = 'success'
    }
    catch (err) {
      vehicles.value = []
      status.value = 'error'
      error.value = err
    }
  }

  watch(
    () => search.value,
    (value) => {
      if (searchTimer) clearTimeout(searchTimer)
      searchTimer = setTimeout(() => fetchSelector(value), 300)
    }
  )

  watch(
    [() => auth.hydrated.value, () => auth.token.value],
    async ([hydrated, token]) => {
      if (!hydrated || !token) {
        vehicles.value = []
        status.value = 'idle'
        return
      }

      await fetchSelector()
    },
    { immediate: true }
  )

  return {
    search,
    vehicles,
    status,
    error,
    refresh: () => fetchSelector(search.value)
  }
}
