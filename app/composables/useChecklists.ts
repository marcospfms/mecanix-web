import { useAuth } from './useAuth'
import { useAPI, useApiFetch } from './useAPI'
import type { VehicleChecklist } from './useVehicles'

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
}

export type ChecklistPdfResponse = {
  url: string;
  filename: string;
  customer_phone: string | null;
  expires_in_seconds: number;
}

export type ChecklistItemUpdatePayload = {
  is_checked?: boolean;
  selected_option_ids?: number[];
}

export function useChecklistHistory(
  vehicleId: Ref<number | null> | ComputedRef<number | null>
) {
  const auth = useAuth()

  const state = useAPI<VehicleChecklist[], ApiEnvelope<VehicleChecklist[]>>(
    () => `/vehicles/${vehicleId.value}/checklists`,
    {
      key: () => `checklists:vehicle:${vehicleId.value ?? 'none'}`,
      immediate: false,
      server: false,
      default: (): VehicleChecklist[] => [],
      transform: r => r.data
    }
  )

  watch(
    [() => auth.hydrated.value, () => auth.token.value, () => vehicleId.value],
    async ([hydrated, token, id]) => {
      if (!hydrated || !id) return

      if (!token) {
        state.data.value = []
        state.clear()
        return
      }

      await state.refresh()
    },
    { immediate: true }
  )

  return state
}

export function useChecklistDetail(
  checklistId: Ref<number | null> | ComputedRef<number | null>
) {
  const auth = useAuth()

  const state = useAPI<VehicleChecklist | null, ApiEnvelope<VehicleChecklist>>(
    () => `/vehicle-checklists/${checklistId.value}`,
    {
      key: () => `checklists:detail:${checklistId.value ?? 'none'}`,
      immediate: false,
      server: false,
      default: (): VehicleChecklist | null => null,
      transform: r => r.data
    }
  )

  watch(
    [
      () => auth.hydrated.value,
      () => auth.token.value,
      () => checklistId.value
    ],
    async ([hydrated, token, id]) => {
      if (!hydrated || !id) return

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

export function useChecklistActions() {
  const createChecklist = async (
    vehicleId: number,
    templateId: number
  ): Promise<VehicleChecklist> => {
    const response = await useApiFetch<ApiEnvelope<VehicleChecklist>>(
      `/vehicles/${vehicleId}/checklists`,
      {
        method: 'POST',
        body: { checklist_template_id: templateId }
      }
    )

    return response.data
  }

  const deleteChecklist = async (id: number): Promise<void> => {
    await useApiFetch(`/vehicle-checklists/${id}`, { method: 'DELETE' })
  }

  const updateChecklistItem = async (
    itemId: number,
    payload: ChecklistItemUpdatePayload
  ): Promise<void> => {
    await useApiFetch(`/vehicle-checklist-items/${itemId}`, {
      method: 'PUT',
      body: payload
    })
  }

  const updateChecklistItemNotes = async (
    itemId: number,
    notes: string | null
  ): Promise<void> => {
    await useApiFetch(`/vehicle-checklist-items/${itemId}/notes`, {
      method: 'PUT',
      body: { notes }
    })
  }

  const generatePdf = async (
    checklistId: number
  ): Promise<ChecklistPdfResponse> => {
    const response = await useApiFetch<ApiEnvelope<ChecklistPdfResponse>>(
      `/vehicle-checklists/${checklistId}/pdf`
    )

    return response.data
  }

  return {
    createChecklist,
    deleteChecklist,
    updateChecklistItem,
    updateChecklistItemNotes,
    generatePdf
  }
}
