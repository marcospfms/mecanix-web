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

  const vehiclesState = useAPI<Vehicle[], ApiEnvelope<Vehicle[]>>('/vehicles', {
    key: 'vehicles:list',
    immediate: false,
    server: false,
    default: (): Vehicle[] => [],
    transform: response => response.data
  })

  watch(
    [() => auth.hydrated.value, () => auth.token.value],
    async ([hydrated, token]) => {
      if (!hydrated) return

      if (!token) {
        vehiclesState.data.value = []
        vehiclesState.clear()
        return
      }

      await vehiclesState.refresh()
    },
    { immediate: true }
  )

  const filteredVehicles = computed(() => {
    const term = search.value.trim().toLowerCase()
    const source = Array.isArray(vehiclesState.data.value)
      ? vehiclesState.data.value
      : []
    const list = [...source].sort((a, b) => b.id - a.id)

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

  const createAndRefreshVehicle = async (payload: VehicleFormPayload) => {
    const vehicle = await createVehicle(payload)
    await vehiclesState.refresh()
    return vehicle
  }

  const updateAndRefreshVehicle = async (
    id: number,
    payload: Omit<VehicleFormPayload, 'customer_id'>
  ) => {
    const vehicle = await updateVehicle(id, payload)
    await vehiclesState.refresh()
    return vehicle
  }

  const deleteAndRefreshVehicle = async (id: number) => {
    await deleteVehicle(id)
    await vehiclesState.refresh()
  }

  return {
    search,
    vehicles: filteredVehicles,
    rawVehicles: vehiclesState.data,
    status: vehiclesState.status,
    error: vehiclesState.error,
    refresh: vehiclesState.refresh,
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
