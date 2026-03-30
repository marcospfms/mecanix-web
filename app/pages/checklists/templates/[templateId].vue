<script setup lang="ts">
import { getErrorMessage } from '../../../composables/useAppToast'
import type { ChecklistItem } from '../../../composables/useChecklistTemplates'

definePageMeta({
  title: 'Itens do template'
})

type ItemFormMode = 'create' | 'edit'

const route = useRoute('checklists-templates-templateId')
const toast = useAppToast()
const templateId = computed(() => Number(route.params.templateId))
const manualRefreshing = ref(false)

const {
  data: template,
  status,
  error,
  refresh
} = useChecklistTemplate(templateId)
const {
  items,
  status: itemsStatus,
  error: itemsError,
  refresh: refreshItems,
  createItem,
  updateItem,
  deleteItem,
  reorderItems
} = useChecklistItems(templateId)
const { types } = useVehicleTypes()
const { deleteTemplate } = useChecklistTemplateActions()

const itemFormOpen = ref(false)
const itemFormMode = ref<ItemFormMode>('create')
const itemFormSubmitting = ref(false)
const itemPendingDeletion = ref<ChecklistItem | null>(null)
const itemConfirmOpen = ref(false)
const itemConfirmLoading = ref(false)
const templateConfirmOpen = ref(false)
const templateConfirmLoading = ref(false)

const editingItem = ref<ChecklistItem | null>(null)
const itemName = ref('')
const itemDescription = ref('')
const orderIndex = ref('')
const isCompletable = ref(false)
const allowsMultipleResponses = ref(false)
const isRequired = ref(false)
const options = ref<Array<{ id?: number; label: string; order_index: number }>>(
  []
)
const itemFormErrors = ref<{ name?: string; options?: string }>({})

// Cobre tanto 'idle' (antes da hidratação) quanto 'pending' (durante fetch)
const isLoading = computed(
  () =>
    (['idle', 'pending'].includes(status.value) && !template.value)
    || (['idle', 'pending'].includes(itemsStatus.value) && items.value.length === 0 && !template.value)
)
const isDataRefreshing = computed(
  () => manualRefreshing.value && !!template.value
)
const hasItems = computed(() => items.value.length > 0)
const itemCount = computed(() => items.value.length)

const itemFormTitle = computed(() =>
  itemFormMode.value === 'create' ? 'Novo item' : 'Editar item'
)
const itemFormDescription = computed(() =>
  itemFormMode.value === 'create'
    ? 'Adicione um novo item ao template.'
    : 'Atualize os dados do item selecionado.'
)

const resolveVehicleTypeName = (value?: number | null) => {
  if (!value) {
    return 'Todos os tipos'
  }

  return (
    types.value?.find(type => type.id === value)?.name ?? 'Tipo não encontrado'
  )
}

const resetItemForm = () => {
  itemName.value = ''
  itemDescription.value = ''
  orderIndex.value = ''
  isCompletable.value = false
  allowsMultipleResponses.value = false
  isRequired.value = false
  options.value = []
  editingItem.value = null
  itemFormErrors.value = {}
}

const addOption = () => {
  options.value.push({
    label: '',
    order_index: options.value.length
  })
}

const removeOption = (index: number) => {
  options.value.splice(index, 1)
  options.value = options.value.map((option, position) => ({
    ...option,
    order_index: position
  }))
}

const openCreate = () => {
  resetItemForm()
  itemFormMode.value = 'create'
  itemFormOpen.value = true
}

const openEdit = (item: ChecklistItem) => {
  resetItemForm()
  itemFormMode.value = 'edit'
  editingItem.value = item
  itemName.value = item.name
  itemDescription.value = item.description ?? ''
  orderIndex.value = String(item.order_index)
  isCompletable.value = item.is_completable
  allowsMultipleResponses.value = item.allows_multiple_responses
  isRequired.value = item.is_required
  options.value = (item.options ?? []).map(option => ({
    id: option.id,
    label: option.label,
    order_index: option.order_index
  }))
  itemFormOpen.value = true
}

const validateItemForm = () => {
  const errors: { name?: string; options?: string } = {}

  if (!itemName.value.trim()) {
    errors.name = 'Informe o nome do item.'
  }

  const hasBlankOption = options.value.some(
    option => option.label.trim().length === 0
  )
  if (hasBlankOption) {
    errors.options = 'Preencha ou remova as opções vazias.'
  }

  itemFormErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleItemSubmit = async () => {
  if (!validateItemForm() || itemFormSubmitting.value) {
    return
  }

  itemFormSubmitting.value = true

  try {
    const payload = {
      name: itemName.value,
      description: itemDescription.value,
      order_index: orderIndex.value.trim() ? Number(orderIndex.value) : null,
      is_completable: isCompletable.value,
      allows_multiple_responses: allowsMultipleResponses.value,
      is_required: isRequired.value,
      options: options.value.map((option, index) => ({
        label: option.label,
        order_index: index
      }))
    }

    if (itemFormMode.value === 'create') {
      await createItem(payload)
      toast.success({
        title: 'Item criado',
        description: 'O novo item foi adicionado ao template.'
      })
    } else if (editingItem.value) {
      await updateItem(editingItem.value.id, payload)
      toast.success({
        title: 'Item atualizado',
        description: 'Os dados do item foram salvos.'
      })
    }

    itemFormOpen.value = false
    resetItemForm()
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao salvar',
      description: getErrorMessage(err, 'Não foi possível salvar o item.')
    })
  } finally {
    itemFormSubmitting.value = false
  }
}

const askItemDelete = (item: ChecklistItem) => {
  itemPendingDeletion.value = item
  itemConfirmOpen.value = true
}

const handleItemDelete = async () => {
  if (!itemPendingDeletion.value) return

  itemConfirmLoading.value = true

  try {
    await deleteItem(itemPendingDeletion.value.id)
    toast.success({
      title: 'Item removido',
      description: 'O item foi excluído com sucesso.'
    })
    itemConfirmOpen.value = false
    itemPendingDeletion.value = null
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao excluir',
      description: getErrorMessage(err, 'Não foi possível excluir o item.')
    })
  } finally {
    itemConfirmLoading.value = false
  }
}

const handleTemplateDelete = async () => {
  if (!template.value) return

  templateConfirmLoading.value = true

  try {
    await deleteTemplate(template.value.id)
    toast.success({
      title: 'Template removido',
      description: 'O template foi excluído com sucesso.'
    })
    templateConfirmOpen.value = false
    await navigateTo({ name: 'checklists-templates' })
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao excluir',
      description: getErrorMessage(err, 'Não foi possível excluir o template.')
    })
  } finally {
    templateConfirmLoading.value = false
  }
}

const handleRefresh = async () => {
  if (manualRefreshing.value) {
    return
  }

  manualRefreshing.value = true

  try {
    await Promise.all([
      refresh(),
      refreshItems(),
      new Promise(resolve => setTimeout(resolve, 1000))
    ])
  } catch {
    toast.error({
      title: 'Falha ao atualizar',
      description: 'Não foi possível recarregar o template.'
    })
  } finally {
    manualRefreshing.value = false
  }
}

// Drag-and-drop reorder
const localItems = ref<ChecklistItem[]>([])
const draggedIndex = ref(-1)
const dragOverIndex = ref(-1)
const isReordering = ref(false)

watch(() => items.value, (newItems) => {
  localItems.value = [...(newItems ?? [])]
}, { immediate: true })

const onDragStart = (index: number) => {
  draggedIndex.value = index
}

const onDragOver = (index: number) => {
  if (draggedIndex.value !== -1) {
    dragOverIndex.value = index
  }
}

const onDragEnd = () => {
  draggedIndex.value = -1
  dragOverIndex.value = -1
}

const onDrop = async (dropIndex: number) => {
  const from = draggedIndex.value
  onDragEnd()

  if (from === -1 || from === dropIndex) return

  const newItems = [...localItems.value]
  const [moved] = newItems.splice(from, 1)
  newItems.splice(dropIndex, 0, moved)
  localItems.value = newItems

  if (isReordering.value) return
  isReordering.value = true

  try {
    await reorderItems(localItems.value)
  } catch (err: unknown) {
    localItems.value = [...(items.value ?? [])]
    toast.error({
      title: 'Falha ao reordenar',
      description: getErrorMessage(err, 'Não foi possível salvar a nova ordem.')
    })
  } finally {
    isReordering.value = false
  }
}
</script>

<template>
  <div class="space-y-5 sm:space-y-6">
    <!-- Cabeçalho da página -->
    <section class="space-y-3">
      <p class="text-xs font-semibold uppercase tracking-[0.32em] text-primary">
        Templates de checklist
      </p>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="space-y-1.5">
          <NuxtLink
            :to="{ name: 'checklists-templates' }"
            class="inline-flex items-center gap-1.5 text-sm text-toned transition-colors hover:text-highlighted"
          >
            <UIcon name="i-lucide-arrow-left" class="size-4" />
            Templates
          </NuxtLink>
          <h1 class="text-3xl font-semibold tracking-tight text-highlighted">
            {{ template?.name || 'Detalhes do template' }}
          </h1>
        </div>

        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-refresh-cw"
          size="xl"
          :loading="isDataRefreshing"
          aria-label="Atualizar template"
          @click="handleRefresh"
        />
      </div>
    </section>

    <!-- Estado de carregamento inicial -->
    <AppLoading
      v-if="isLoading"
      title="Carregando template"
      description="Buscando os dados do template e seus itens."
    />

    <!-- Erro -->
    <UAlert
      v-else-if="error || itemsError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Falha ao carregar template"
      description="Atualize a página ou tente novamente em instantes."
    />

    <!-- Conteúdo principal -->
    <template v-else-if="template">
      <!-- Card de resumo do template (inspirado no infoCard do app) -->
      <UCard class="rounded-2xl border-default">
        <div class="space-y-5">
          <!-- Header do card -->
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <UIcon name="i-lucide-clipboard-list" class="size-5 text-primary" />
              </div>
              <div>
                <p class="text-base font-semibold text-highlighted">
                  {{ template.name }}
                </p>
                <p class="text-xs text-toned">
                  ID #{{ template.id }}
                </p>
              </div>
            </div>

            <div class="flex shrink-0 gap-2">
              <UButton
                color="primary"
                icon="i-lucide-plus"
                size="sm"
                @click="openCreate"
              >
                Novo item
              </UButton>
              <UButton
                color="error"
                variant="soft"
                icon="i-lucide-trash"
                size="sm"
                @click="templateConfirmOpen = true"
              >
                Excluir
              </UButton>
            </div>
          </div>

          <!-- Info blocks (padrão infoRow/infoBlock do app mobile) -->
          <div class="grid grid-cols-3 gap-3 rounded-xl border border-default bg-muted/20 p-4">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-toned">
                Tipo de veículo
              </p>
              <p class="mt-1 text-sm font-medium text-highlighted">
                {{ resolveVehicleTypeName(template.vehicle_type_id) }}
              </p>
            </div>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-toned">
                Itens
              </p>
              <p class="mt-1 text-sm font-medium text-highlighted">
                {{ itemCount }}
              </p>
            </div>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-toned">
                Atualizado
              </p>
              <p class="mt-1 text-sm font-medium text-highlighted">
                <NuxtTime
                  :datetime="template.updated_at"
                  year="numeric"
                  month="2-digit"
                  day="2-digit"
                />
              </p>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Seção de itens -->
      <section class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-highlighted">
              Itens do checklist
            </h2>
            <p class="text-sm text-toned">
              Gerencie os pontos que devem ser verificados durante a inspeção.
            </p>
          </div>
        </div>

        <AppEmpty
          v-if="!hasItems"
          title="Nenhum item cadastrado"
          description="Adicione o primeiro item para começar a estruturar este template."
          icon="i-lucide-list-checks"
        >
          <div class="pt-2">
            <UButton color="primary" icon="i-lucide-plus" @click="openCreate">
              Criar primeiro item
            </UButton>
          </div>
        </AppEmpty>

        <div v-else class="grid gap-3">
          <p class="flex items-center gap-1 text-xs text-toned">
            <UIcon name="i-lucide-grip-vertical" class="size-3.5" />
            Arraste os itens para reordenar
          </p>
          <UCard
            v-for="(item, index) in localItems"
            :key="item.id"
            draggable="true"
            :class="[
              'rounded-2xl cursor-grab active:cursor-grabbing transition-all',
              draggedIndex === index ? 'opacity-40 scale-95 border-default' : '',
              dragOverIndex === index && draggedIndex !== index ? 'ring-2 ring-primary ring-offset-2' : 'border-default'
            ]"
            @dragstart="onDragStart(index)"
            @dragover.prevent="onDragOver(index)"
            @drop.prevent="onDrop(index)"
            @dragend="onDragEnd"
          >
            <div class="space-y-3">
              <!-- Linha principal: ordem, nome, ações -->
              <div class="flex items-start gap-3">
                <!-- Alça de arrasto + Índice -->
                <div class="flex items-center gap-1.5">
                  <UIcon name="i-lucide-grip-vertical" class="size-4 shrink-0 text-muted" />
                  <div class="flex size-8 shrink-0 items-center justify-center rounded-lg border border-default bg-muted/40 text-xs font-semibold text-toned">
                    {{ item.order_index }}
                  </div>
                </div>

                <!-- Conteúdo -->
                <div class="min-w-0 flex-1 space-y-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="text-sm font-semibold text-highlighted">
                      {{ item.name }}
                    </p>
                    <span
                      v-if="item.is_required"
                      class="rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-error"
                    >
                      Obrigatório
                    </span>
                  </div>
                  <p v-if="item.description" class="text-sm leading-5 text-toned">
                    {{ item.description }}
                  </p>

                  <!-- Tags de comportamento -->
                  <div class="flex flex-wrap gap-1.5 pt-0.5">
                    <span
                      class="rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
                      :class="item.is_completable ? 'bg-primary/10 text-primary' : 'bg-muted text-toned'"
                    >
                      {{ item.is_completable ? 'Completável' : 'Sem check' }}
                    </span>
                    <span
                      v-if="item.allows_multiple_responses"
                      class="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-warning"
                    >
                      Múltipla escolha
                    </span>
                  </div>
                </div>

                <!-- Ações -->
                <div class="flex shrink-0 gap-1.5">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-pencil"
                    size="sm"
                    aria-label="Editar item"
                    @click="openEdit(item)"
                  />
                  <UButton
                    color="error"
                    variant="ghost"
                    icon="i-lucide-trash"
                    size="sm"
                    aria-label="Excluir item"
                    @click="askItemDelete(item)"
                  />
                </div>
              </div>

              <!-- Opções de resposta -->
              <div
                v-if="(item.options?.length ?? 0) > 0"
                class="ml-11 rounded-xl border border-default bg-muted/20 px-3 py-2.5"
              >
                <p class="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-toned">
                  Opções
                </p>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="option in item.options"
                    :key="option.id"
                    class="rounded-full border border-default bg-default px-2.5 py-1 text-xs text-toned"
                  >
                    {{ option.label }}
                  </span>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </section>
    </template>

    <!-- Formulário de item (slideover) -->
    <USlideover
      v-model:open="itemFormOpen"
      side="right"
      :title="itemFormTitle"
      :description="itemFormDescription"
      :ui="{
        body: 'px-3 py-4 sm:px-4 sm:py-5',
        footer: 'justify-end px-3 sm:px-4'
      }"
    >
      <template #body>
        <div class="space-y-4">
          <div class="space-y-2">
            <label class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Nome
            </label>
            <UInput
              v-model="itemName"
              placeholder="Ex.: Freios dianteiros"
              size="xl"
              class="w-full"
              :maxlength="255"
            />
            <p v-if="itemFormErrors.name" class="text-sm text-error">
              {{ itemFormErrors.name }}
            </p>
          </div>

          <div class="space-y-2">
            <label class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Descrição
            </label>
            <UTextarea
              v-model="itemDescription"
              placeholder="Opcional"
              class="w-full"
              :rows="3"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Ordem
            </label>
            <UInput
              v-model="orderIndex"
              placeholder="Ex.: 0"
              size="xl"
              class="w-full"
              inputmode="numeric"
            />
          </div>

          <div class="space-y-3 rounded-2xl border border-default bg-muted/20 p-4">
            <label class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Comportamento
            </label>

            <label class="flex cursor-pointer items-center gap-3 text-sm text-highlighted">
              <input
                v-model="isRequired"
                type="checkbox"
                class="size-4 rounded border-default accent-primary"
              >
              Item obrigatório para concluir o checklist
            </label>

            <label class="flex cursor-pointer items-center gap-3 text-sm text-highlighted">
              <input
                v-model="isCompletable"
                type="checkbox"
                class="size-4 rounded border-default accent-primary"
              >
              Permite marcação de conclusão
            </label>

            <label class="flex cursor-pointer items-center gap-3 text-sm text-highlighted">
              <input
                v-model="allowsMultipleResponses"
                type="checkbox"
                class="size-4 rounded border-default accent-primary"
              >
              Permite múltiplas respostas
            </label>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <label class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Opções de resposta
              </label>
              <UButton
                color="neutral"
                variant="soft"
                size="sm"
                icon="i-lucide-plus"
                @click="addOption"
              >
                Adicionar opção
              </UButton>
            </div>

            <p v-if="itemFormErrors.options" class="text-sm text-error">
              {{ itemFormErrors.options }}
            </p>

            <div
              v-if="options.length === 0"
              class="rounded-2xl border border-dashed border-default px-4 py-6 text-center text-sm text-toned"
            >
              Sem opções. Use para itens com respostas fechadas.
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="(option, index) in options"
                :key="`${index}-${option.id ?? 'new'}`"
                class="flex items-center gap-2"
              >
                <UInput
                  v-model="option.label"
                  placeholder="Ex.: Aprovado"
                  size="lg"
                  class="flex-1"
                />
                <UButton
                  color="error"
                  variant="soft"
                  icon="i-lucide-trash"
                  @click="removeOption(index)"
                />
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <UButton color="neutral" variant="ghost" @click="itemFormOpen = false">
          Cancelar
        </UButton>
        <UButton color="primary" :loading="itemFormSubmitting" @click="handleItemSubmit">
          {{ itemFormMode === 'create' ? 'Criar item' : 'Salvar alterações' }}
        </UButton>
      </template>
    </USlideover>

    <AppConfirm
      v-model:open="itemConfirmOpen"
      title="Excluir item"
      :description="
        itemPendingDeletion
          ? `Você está removendo '${itemPendingDeletion.name}'. Esta ação não pode ser desfeita.`
          : 'Esta ação não pode ser desfeita.'
      "
      confirm-label="Excluir"
      :loading="itemConfirmLoading"
      @confirm="handleItemDelete"
    />

    <AppConfirm
      v-model:open="templateConfirmOpen"
      title="Excluir template"
      :description="
        template
          ? `Você está removendo '${template.name}'. Esta ação não pode ser desfeita.`
          : 'Esta ação não pode ser desfeita.'
      "
      confirm-label="Excluir"
      :loading="templateConfirmLoading"
      @confirm="handleTemplateDelete"
    />
  </div>
</template>
