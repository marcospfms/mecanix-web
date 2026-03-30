import { useAuth } from './useAuth'
import { useAPI, useApiFetch } from './useAPI'

export type VehicleType = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export type ChecklistTemplate = {
  id: number;
  user_id: number;
  vehicle_type_id: number | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export type ChecklistItemOption = {
  id: number;
  checklist_item_id: number;
  label: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export type ChecklistItem = {
  id: number;
  checklist_template_id: number;
  name: string;
  description: string | null;
  order_index: number;
  is_completable: boolean;
  allows_multiple_responses: boolean;
  is_required: boolean;
  options?: ChecklistItemOption[];
  created_at: string;
  updated_at: string;
}

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
}

type ChecklistTemplatePayload = {
  name: string;
  vehicle_type_id?: number | null;
}

type ChecklistItemPayload = {
  name: string;
  description?: string | null;
  order_index?: number | null;
  is_completable?: boolean;
  allows_multiple_responses?: boolean;
  is_required?: boolean;
  options?: Array<{
    label: string;
    order_index?: number | null;
  }> | null;
}

export function useVehicleTypes() {
  const auth = useAuth()
  const vehicleTypesState = ref<VehicleType[]>([])
  const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
  const error = ref<unknown>(null)

  const refresh = async () => {
    if (!auth.token.value) {
      vehicleTypesState.value = []
      status.value = 'idle'
      error.value = null
      return vehicleTypesState.value
    }

    status.value = 'pending'
    error.value = null

    try {
      const response = await useApiFetch<ApiEnvelope<VehicleType[]>>('/vehicle-types')
      vehicleTypesState.value = response.data
      status.value = 'success'
      return vehicleTypesState.value
    } catch (err) {
      vehicleTypesState.value = []
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
        vehicleTypesState.value = []
        status.value = 'idle'
        error.value = null
        return
      }

      await refresh()
    },
    { immediate: true }
  )

  const types = computed(() => {
    const source = vehicleTypesState.value
    return Array.isArray(source) ? source : []
  })

  return {
    types,
    status,
    error,
    refresh
  }
}

export function useChecklistTemplates() {
  const auth = useAuth()
  const search = ref('')
  const templatesState = ref<ChecklistTemplate[]>([])
  const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
  const error = ref<unknown>(null)

  const refresh = async () => {
    if (!auth.token.value) {
      templatesState.value = []
      status.value = 'idle'
      error.value = null
      return templatesState.value
    }

    status.value = 'pending'
    error.value = null

    try {
      const response = await useApiFetch<ApiEnvelope<ChecklistTemplate[]>>('/checklist-templates')
      templatesState.value = response.data
      status.value = 'success'
      return templatesState.value
    } catch (err) {
      templatesState.value = []
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
        templatesState.value = []
        status.value = 'idle'
        error.value = null
        return
      }

      await refresh()
    },
    { immediate: true }
  )

  const templatesResolved = computed<ChecklistTemplate[]>(() => {
    const source = templatesState.value
    return Array.isArray(source) ? source : []
  })

  const templates = computed(() => {
    const term = search.value.trim().toLowerCase()
    const list = [...templatesResolved.value].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR')
    )

    if (!term) {
      return list
    }

    return list.filter(template => template.name.toLowerCase().includes(term))
  })

  const { createTemplate, updateTemplate, deleteTemplate }
    = useChecklistTemplateActions()

  const setTemplates = (nextTemplates: ChecklistTemplate[]) => {
    templatesState.value = nextTemplates
    status.value = 'success'
    error.value = null
  }

  const createAndRefreshTemplate = async (
    payload: ChecklistTemplatePayload
  ) => {
    const template = await createTemplate(payload)
    setTemplates([template, ...templatesResolved.value])
    return template
  }

  const updateAndRefreshTemplate = async (
    id: number,
    payload: ChecklistTemplatePayload
  ) => {
    const template = await updateTemplate(id, payload)
    setTemplates(
      templatesResolved.value.map(currentTemplate =>
        currentTemplate.id === id ? template : currentTemplate
      )
    )
    return template
  }

  const deleteAndRefreshTemplate = async (id: number) => {
    await deleteTemplate(id)
    setTemplates(templatesResolved.value.filter(template => template.id !== id))
  }

  return {
    search,
    templates,
    rawTemplates: templatesResolved,
    status,
    error,
    refresh,
    createTemplate: createAndRefreshTemplate,
    updateTemplate: updateAndRefreshTemplate,
    deleteTemplate: deleteAndRefreshTemplate
  }
}

export function useChecklistTemplate(
  templateId: Ref<number | null> | ComputedRef<number | null>
) {
  const auth = useAuth()

  const templateState = useAPI<
    ChecklistTemplate | null,
    ApiEnvelope<ChecklistTemplate>
  >(() => `/checklist-templates/${templateId.value}`, {
    key: () => `checklist-templates:${templateId.value ?? 'none'}`,
    immediate: false,
    server: false,
    default: (): ChecklistTemplate | null => null,
    transform: (response: ApiEnvelope<ChecklistTemplate>) => response.data
  })

  watch(
    [() => auth.hydrated.value, () => auth.token.value, () => templateId.value],
    async ([hydrated, token, id]) => {
      if (!hydrated || !id) return

      if (!token) {
        templateState.data.value = null
        templateState.clear()
        return
      }

      await templateState.refresh()
    },
    { immediate: true }
  )

  return templateState
}

export function useChecklistItems(
  templateId: Ref<number | null> | ComputedRef<number | null>
) {
  const auth = useAuth()

  const itemsState = useAPI<ChecklistItem[], ApiEnvelope<ChecklistItem[]>>(
    () => `/checklist-templates/${templateId.value}/items`,
    {
      key: () => `checklist-templates:${templateId.value ?? 'none'}:items`,
      immediate: false,
      server: false,
      default: (): ChecklistItem[] => [],
      transform: (response: ApiEnvelope<ChecklistItem[]>) => response.data
    }
  )

  watch(
    [() => auth.hydrated.value, () => auth.token.value, () => templateId.value],
    async ([hydrated, token, id]) => {
      if (!hydrated || !id) return

      if (!token) {
        itemsState.data.value = []
        itemsState.clear()
        return
      }

      await itemsState.refresh()
    },
    { immediate: true }
  )

  const items = computed(() => {
    const source = Array.isArray(itemsState.data.value)
      ? itemsState.data.value
      : []
    return [...source].sort((a, b) => a.order_index - b.order_index)
  })

  const { createItem, updateItem, deleteItem, reorderItems }
    = useChecklistItemActions(templateId)

  const createAndRefreshItem = async (payload: ChecklistItemPayload) => {
    const item = await createItem(payload)
    await itemsState.refresh()
    return item
  }

  const updateAndRefreshItem = async (
    id: number,
    payload: ChecklistItemPayload
  ) => {
    const item = await updateItem(id, payload)
    await itemsState.refresh()
    return item
  }

  const deleteAndRefreshItem = async (id: number) => {
    await deleteItem(id)
    await itemsState.refresh()
  }

  const reorderAndRefreshItems = async (orderedItems: ChecklistItem[]) => {
    await reorderItems(orderedItems)
    await itemsState.refresh()
  }

  return {
    items,
    rawItems: itemsState.data,
    status: itemsState.status,
    error: itemsState.error,
    refresh: itemsState.refresh,
    createItem: createAndRefreshItem,
    updateItem: updateAndRefreshItem,
    deleteItem: deleteAndRefreshItem,
    reorderItems: reorderAndRefreshItems
  }
}

export function useChecklistTemplateActions() {
  const createTemplate = async (payload: ChecklistTemplatePayload) => {
    const response = await useApiFetch<ApiEnvelope<ChecklistTemplate>>(
      '/checklist-templates',
      {
        method: 'POST',
        body: {
          name: payload.name.trim(),
          vehicle_type_id: payload.vehicle_type_id ?? null
        }
      }
    )

    return response.data
  }

  const updateTemplate = async (
    id: number,
    payload: ChecklistTemplatePayload
  ) => {
    const response = await useApiFetch<ApiEnvelope<ChecklistTemplate>>(
      `/checklist-templates/${id}`,
      {
        method: 'PUT',
        body: {
          name: payload.name.trim(),
          vehicle_type_id: payload.vehicle_type_id ?? null
        }
      }
    )

    return response.data
  }

  const deleteTemplate = async (id: number) => {
    await useApiFetch(`/checklist-templates/${id}`, { method: 'DELETE' })
  }

  return {
    createTemplate,
    updateTemplate,
    deleteTemplate
  }
}

export function useChecklistItemActions(
  templateId: Ref<number | null> | ComputedRef<number | null>
) {
  const normalizeOptions = (options?: ChecklistItemPayload['options']) => {
    if (!Array.isArray(options)) {
      return []
    }

    return options
      .map((option, index) => ({
        label: option.label.trim(),
        order_index: option.order_index ?? index
      }))
      .filter(option => option.label.length > 0)
  }

  const createItem = async (payload: ChecklistItemPayload) => {
    const response = await useApiFetch<ApiEnvelope<ChecklistItem>>(
      `/checklist-templates/${templateId.value}/items`,
      {
        method: 'POST',
        body: {
          name: payload.name.trim(),
          description: payload.description?.trim() || null,
          order_index: payload.order_index ?? null,
          is_completable: payload.is_completable ?? false,
          allows_multiple_responses: payload.allows_multiple_responses ?? false,
          is_required: payload.is_required ?? false,
          options: normalizeOptions(payload.options)
        }
      }
    )

    return response.data
  }

  const updateItem = async (id: number, payload: ChecklistItemPayload) => {
    const response = await useApiFetch<ApiEnvelope<ChecklistItem>>(
      `/checklist-items/${id}`,
      {
        method: 'PUT',
        body: {
          name: payload.name.trim(),
          description: payload.description?.trim() || null,
          order_index: payload.order_index ?? null,
          is_completable: payload.is_completable ?? false,
          allows_multiple_responses: payload.allows_multiple_responses ?? false,
          is_required: payload.is_required ?? false,
          options: normalizeOptions(payload.options)
        }
      }
    )

    return response.data
  }

  const deleteItem = async (id: number) => {
    await useApiFetch(`/checklist-items/${id}`, { method: 'DELETE' })
  }

  const reorderItems = async (orderedItems: ChecklistItem[]): Promise<void> => {
    const updates = orderedItems
      .map((item, index) => ({ item, newIndex: index }))
      .filter(({ item, newIndex }) => item.order_index !== newIndex)

    await Promise.all(
      updates.map(({ item, newIndex }) =>
        useApiFetch(`/checklist-items/${item.id}`, {
          method: 'PUT',
          body: {
            name: item.name,
            description: item.description,
            order_index: newIndex,
            is_completable: item.is_completable,
            allows_multiple_responses: item.allows_multiple_responses,
            is_required: item.is_required,
            options: (item.options ?? []).map(o => ({
              label: o.label,
              order_index: o.order_index
            }))
          }
        })
      )
    )
  }

  return {
    createItem,
    updateItem,
    deleteItem,
    reorderItems
  }
}
