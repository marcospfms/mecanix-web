<script setup lang="ts">
import { getErrorMessage } from '../../composables/useAppToast'
import type {
  VehicleChecklistItem,
  VehicleChecklistItemOption
} from '../../composables/useVehicles'

definePageMeta({
  title: 'Execução de checklist'
})

const route = useRoute('checklists-checklistId')
const toast = useAppToast()
const checklistId = computed(() => Number(route.params.checklistId))

const {
  data: checklist,
  status,
  error,
  refresh
} = useChecklistDetail(checklistId)
const {
  updateChecklistItem,
  updateChecklistItemNotes,
  deleteChecklist,
  generatePdf,
  recordChecklistMileage
} = useChecklistActions()

const vehicleId = computed(() => checklist.value?.vehicle_id ?? null)
const { data: vehicle } = useVehicle(vehicleId)
const { data: checklistMileage } = useChecklistMileage(checklistId)

const localChecked = reactive<Record<number, boolean>>({})
const localNotes = reactive<Record<number, string>>({})
const localSelections = reactive<Record<number, number[]>>({})
const savingItems = reactive<Record<number, boolean>>({})
const noteTimers: Record<number, ReturnType<typeof setTimeout> | null> = {}

watch(
  () => checklist.value?.items,
  (items) => {
    if (!items) return

    for (const item of items) {
      if (!(item.id in localChecked)) {
        localChecked[item.id] = item.is_checked
        localNotes[item.id] = item.notes ?? ''
        localSelections[item.id] = (item.selections ?? []).map(
          s => s.vehicle_checklist_item_option_id
        )
        savingItems[item.id] = false
        noteTimers[item.id] = null
      }
    }
  },
  { immediate: true }
)

const handleCheckChange = async (
  item: VehicleChecklistItem,
  checked: boolean
) => {
  localChecked[item.id] = checked
  savingItems[item.id] = true

  try {
    await updateChecklistItem(item.id, { is_checked: checked })
    await refresh()
  } catch {
    localChecked[item.id] = !checked
    toast.error({
      title: 'Falha ao salvar',
      description: 'Não foi possível atualizar o item.'
    })
  } finally {
    savingItems[item.id] = false
  }
}

const handleOptionChange = async (
  item: VehicleChecklistItem,
  optionId: number,
  checked: boolean
) => {
  const prev = localSelections[item.id] ?? []
  let newIds: number[]

  if (item.allows_multiple_responses) {
    newIds = checked ? [...prev, optionId] : prev.filter(id => id !== optionId)
  } else {
    newIds = checked ? [optionId] : []
  }

  localSelections[item.id] = newIds
  savingItems[item.id] = true

  try {
    await updateChecklistItem(item.id, { selected_option_ids: newIds })
    await refresh()
  } catch {
    localSelections[item.id] = prev
    toast.error({
      title: 'Falha ao salvar',
      description: 'Não foi possível atualizar a seleção.'
    })
  } finally {
    savingItems[item.id] = false
  }
}

const handleNotesChange = (item: VehicleChecklistItem, notes: string) => {
  localNotes[item.id] = notes

  const existing = noteTimers[item.id]
  if (existing !== null && existing !== undefined) {
    clearTimeout(existing)
  }

  noteTimers[item.id] = setTimeout(async () => {
    savingItems[item.id] = true

    try {
      await updateChecklistItemNotes(item.id, notes || null)
    } catch {
      toast.error({
        title: 'Falha ao salvar nota',
        description: 'Não foi possível salvar a nota.'
      })
    } finally {
      savingItems[item.id] = false
    }
  }, 1500)
}

const localMileage = ref('')
const mileageSaved = ref(false)
const mileageSaving = ref(false)

// Pre-populate from existing checklist mileage record (priority)
watch(
  () => checklistMileage.value,
  (km) => {
    if (km) {
      localMileage.value = String(km.mileage)
      mileageSaved.value = true
    }
  },
  { immediate: true }
)

// Fallback: use vehicle's latest mileage only if no checklist record yet
watch(
  () => vehicle.value?.latest_mileage,
  (v) => {
    if (v != null && !localMileage.value && !checklistMileage.value) {
      localMileage.value = String(v)
    }
  },
  { immediate: true }
)

const isReadonly = computed(() => checklist.value?.is_completed ?? false)

const isRequiredAndUnfilled = (item: VehicleChecklistItem): boolean => {
  if (!item.is_required) return false
  if (item.is_completable) return !localChecked[item.id]
  if ((item.options?.length ?? 0) > 0) return (localSelections[item.id]?.length ?? 0) === 0
  return false
}

const handleSaveMileage = async () => {
  const mileage = Number(localMileage.value)
  if (!mileage || !vehicleId.value || mileageSaving.value) return

  mileageSaving.value = true
  try {
    await recordChecklistMileage(vehicleId.value, checklistId.value, mileage)
    mileageSaved.value = true
    toast.success({ title: 'Quilometragem registrada' })
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao salvar quilometragem',
      description: getErrorMessage(err, 'Não foi possível registrar a quilometragem.')
    })
  } finally {
    mileageSaving.value = false
  }
}

const pdfLoading = ref(false)

const handleExportPdf = async () => {
  if (pdfLoading.value) return

  pdfLoading.value = true

  try {
    const result = await generatePdf(checklistId.value)
    await navigateTo(result.url, {
      external: true,
      open: {
        target: '_blank'
      }
    })
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao gerar PDF',
      description: getErrorMessage(err, 'Não foi possível gerar o PDF.')
    })
  } finally {
    pdfLoading.value = false
  }
}

const confirmOpen = ref(false)
const confirmLoading = ref(false)

const handleDelete = async () => {
  confirmLoading.value = true

  try {
    await deleteChecklist(checklistId.value)
    toast.success({
      title: 'Checklist removido',
      description: 'O checklist foi excluído.'
    })
    confirmOpen.value = false

    if (vehicleId.value) {
      await navigateTo({
        name: 'checklists-vehicles-vehicleId',
        params: { vehicleId: String(vehicleId.value) }
      })
    } else {
      await navigateTo({ name: 'checklists' })
    }
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao excluir',
      description: getErrorMessage(err, 'Não foi possível excluir o checklist.')
    })
  } finally {
    confirmLoading.value = false
  }
}

const isLoading = computed(() => status.value === 'pending' && !checklist.value)

const localStats = computed(() => {
  const items = checklist.value?.items ?? []
  const total = items.length
  const completed = items.filter((item) => {
    if (item.is_completable && localChecked[item.id]) return true
    if (
      (item.options?.length ?? 0) > 0
      && (localSelections[item.id]?.length ?? 0) > 0
    )
      return true
    return false
  }).length
  return { total, completed, open: total - completed }
})

const isOptionSelected = (itemId: number, optionId: number) =>
  (localSelections[itemId] ?? []).includes(optionId)

const getTypeLabel = (item: VehicleChecklistItem) => {
  if (item.is_completable) return 'Marcação'
  if ((item.options?.length ?? 0) > 0) {
    return item.allows_multiple_responses
      ? 'Múltipla escolha'
      : 'Resposta única'
  }
  return 'Livre'
}
</script>

<template>
  <div class="space-y-5 sm:space-y-6">
    <section class="space-y-3">
      <p class="text-xs font-semibold uppercase tracking-[0.32em] text-primary">
        Checklists
      </p>

      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div class="space-y-2">
          <NuxtLink
            v-if="vehicleId"
            :to="{
              name: 'checklists-vehicles-vehicleId',
              params: { vehicleId: String(vehicleId) }
            }"
            class="inline-flex items-center gap-1.5 text-sm text-toned transition-colors hover:text-highlighted"
          >
            <UIcon
              name="i-lucide-arrow-left"
              class="size-4"
            />
            Histórico do veículo
          </NuxtLink>
          <NuxtLink
            v-else
            :to="{ name: 'checklists' }"
            class="inline-flex items-center gap-1.5 text-sm text-toned transition-colors hover:text-highlighted"
          >
            <UIcon
              name="i-lucide-arrow-left"
              class="size-4"
            />
            Checklists
          </NuxtLink>

          <h1 class="text-3xl font-semibold tracking-tight text-highlighted">
            {{ checklist?.name || 'Execução de checklist' }}
          </h1>
        </div>

        <div class="flex flex-wrap gap-2 self-start sm:self-auto">
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-file-text"
            :loading="pdfLoading"
            @click="handleExportPdf"
          >
            Exportar PDF
          </UButton>
          <UButton
            color="error"
            variant="soft"
            icon="i-lucide-trash"
            @click="confirmOpen = true"
          >
            Excluir
          </UButton>
        </div>
      </div>
    </section>

    <AppLoading
      v-if="isLoading"
      title="Carregando checklist"
      description="Buscando os dados da inspeção."
    />

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Falha ao carregar checklist"
      description="Atualize a página ou tente novamente em instantes."
    />

    <template v-else-if="checklist">
      <div class="grid gap-3 sm:grid-cols-2">
        <UCard class="rounded-2xl border-default">
          <div class="space-y-3">
            <p
              class="text-xs font-semibold uppercase tracking-[0.24em] text-primary"
            >
              Status
            </p>

            <div class="flex items-center gap-3">
              <span
                class="rounded-full px-3 py-1.5 text-sm font-semibold"
                :class="
                  checklist.is_completed
                    ? 'bg-primary/10 text-primary'
                    : 'bg-warning/10 text-warning'
                "
              >
                {{ checklist.is_completed ? 'Concluído' : 'Em andamento' }}
              </span>
            </div>

            <div class="flex items-center gap-3 text-sm text-toned">
              <div class="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  class="h-full rounded-full bg-primary transition-all"
                  :style="`width: ${localStats.total > 0 ? Math.round((localStats.completed / localStats.total) * 100) : 0}%`"
                />
              </div>
              <span class="shrink-0 font-medium text-highlighted">
                {{ localStats.completed }}/{{ localStats.total }}
              </span>
            </div>

            <div
              v-if="checklist.executed_by"
              class="flex items-center gap-2 text-sm text-toned"
            >
              <UIcon
                name="i-lucide-user"
                class="size-4 shrink-0"
              />
              <span>{{ checklist.executed_by.name }}</span>
            </div>

            <div class="flex items-center gap-2 text-sm text-toned">
              <UIcon
                name="i-lucide-calendar"
                class="size-4 shrink-0"
              />
              <NuxtTime
                :datetime="checklist.created_at"
                year="numeric"
                month="2-digit"
                day="2-digit"
                hour="2-digit"
                minute="2-digit"
              />
            </div>
          </div>
        </UCard>

        <UCard
          v-if="vehicle"
          class="rounded-2xl border-default"
        >
          <div class="space-y-3">
            <p
              class="text-xs font-semibold uppercase tracking-[0.24em] text-primary"
            >
              Veículo
            </p>

            <div class="flex items-center gap-3">
              <div
                class="flex size-10 shrink-0 items-center justify-center rounded-xl border border-default bg-[linear-gradient(180deg,rgba(0,193,106,0.14)_0%,rgba(0,161,85,0.08)_100%)]"
              >
                <UIcon
                  name="i-lucide-car-front"
                  class="size-5 text-primary"
                />
              </div>
              <div>
                <p class="font-semibold text-highlighted">
                  {{ formatLicensePlate(vehicle.license_plate) }}
                </p>
                <p class="text-sm text-toned">
                  {{ vehicle.model || 'Modelo não informado' }}
                </p>
              </div>
            </div>

            <div
              v-if="vehicle.customer"
              class="flex items-center gap-2 text-sm text-toned"
            >
              <UIcon
                name="i-lucide-users"
                class="size-4 shrink-0"
              />
              <span>{{ vehicle.customer.name }}</span>
            </div>

            <NuxtLink
              :to="{
                name: 'vehicles-vehicleId',
                params: { vehicleId: String(vehicle.id) }
              }"
              class="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <UIcon
                name="i-lucide-external-link"
                class="size-4"
              />
              Ver detalhes
            </NuxtLink>
          </div>
        </UCard>
      </div>

      <!-- Quilometragem -->
      <UCard class="rounded-2xl border-default">
        <div class="space-y-3">
          <div class="flex items-end gap-3">
            <div class="flex-1 space-y-2">
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Quilometragem atual
              </p>
              <UInput
                v-model="localMileage"
                placeholder="Ex.: 85000"
                inputmode="numeric"
                size="xl"
                class="w-full"
                :disabled="isReadonly || mileageSaved"
              />
            </div>
            <UButton
              color="primary"
              variant="soft"
              icon="i-lucide-gauge"
              size="xl"
              :loading="mileageSaving"
              :disabled="isReadonly || mileageSaved || !localMileage"
              @click="handleSaveMileage"
            >
              {{ mileageSaved ? 'Registrado' : 'Registrar' }}
            </UButton>
          </div>
          <p
            v-if="mileageSaved && checklistMileage"
            class="flex items-center gap-1.5 text-xs text-toned"
          >
            <UIcon
              name="i-lucide-check-circle-2"
              class="size-3.5 text-success"
            />
            Quilometragem registrada em
            <NuxtTime
              :datetime="checklistMileage.created_at"
              month="2-digit"
              day="2-digit"
              year="numeric"
            />
          </p>
        </div>
      </UCard>

      <section class="space-y-3">
        <h2 class="text-lg font-semibold text-highlighted">
          Itens da inspeção
        </h2>

        <UAlert
          v-if="isReadonly"
          color="success"
          variant="soft"
          icon="i-lucide-check-circle-2"
          title="Inspeção concluída"
          description="Este checklist está concluído. Os itens são exibidos em modo leitura."
        />

        <AppEmpty
          v-if="!checklist.items?.length"
          title="Nenhum item neste checklist"
          description="Este checklist não possui itens cadastrados."
          icon="i-lucide-list-checks"
        />

        <div
          v-else
          class="grid gap-3"
        >
          <UCard
            v-for="item in checklist.items"
            :key="item.id"
            :class="[
              'rounded-2xl',
              isRequiredAndUnfilled(item) && !isReadonly
                ? 'border-error/60 ring-1 ring-error/20'
                : 'border-default'
            ]"
          >
            <div class="space-y-4">
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-1.5">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="text-base font-semibold text-highlighted">
                      {{ item.name }}
                    </p>
                    <span
                      v-if="item.is_required"
                      class="rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-error"
                    >
                      Obrigatório
                    </span>
                    <span
                      class="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-toned"
                    >
                      {{ getTypeLabel(item) }}
                    </span>
                  </div>

                  <p
                    v-if="item.description"
                    class="text-sm leading-6 text-toned"
                  >
                    {{ item.description }}
                  </p>
                </div>

                <UIcon
                  v-if="savingItems[item.id]"
                  name="i-lucide-loader"
                  class="size-4 shrink-0 animate-spin text-toned"
                />
              </div>

              <div
                v-if="item.is_completable"
                class="flex items-center gap-3"
              >
                <UButton
                  size="sm"
                  :color="localChecked[item.id] ? 'primary' : 'neutral'"
                  :variant="localChecked[item.id] ? 'solid' : 'soft'"
                  :icon="
                    localChecked[item.id]
                      ? 'i-lucide-check-circle-2'
                      : 'i-lucide-circle'
                  "
                  :loading="savingItems[item.id]"
                  :disabled="isReadonly"
                  @click="handleCheckChange(item, !localChecked[item.id])"
                >
                  {{
                    localChecked[item.id]
                      ? 'Concluído'
                      : 'Marcar como concluído'
                  }}
                </UButton>
              </div>

              <div
                v-if="(item.options?.length ?? 0) > 0"
                class="space-y-2"
              >
                <p
                  class="text-xs font-semibold uppercase tracking-[0.24em] text-primary"
                >
                  {{
                    item.allows_multiple_responses
                      ? 'Opções (múltipla escolha)'
                      : 'Opções (escolha única)'
                  }}
                </p>

                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="option in item.options as VehicleChecklistItemOption[]"
                    :key="option.id"
                    type="button"
                    class="rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    :class="
                      isOptionSelected(item.id, option.id)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-default bg-muted/20 text-toned hover:border-primary/50 hover:text-highlighted'
                    "
                    :disabled="isReadonly"
                    @click="
                      !isReadonly && handleOptionChange(
                        item,
                        option.id,
                        !isOptionSelected(item.id, option.id)
                      )
                    "
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>

              <div class="space-y-1.5">
                <p
                  class="text-xs font-semibold uppercase tracking-[0.24em] text-primary"
                >
                  Observações
                </p>
                <UTextarea
                  :model-value="localNotes[item.id]"
                  placeholder="Adicione observações sobre este item..."
                  class="w-full"
                  :rows="2"
                  :disabled="isReadonly"
                  @update:model-value="
                    val => handleNotesChange(item, String(val ?? ''))
                  "
                />
              </div>
            </div>
          </UCard>
        </div>
      </section>
    </template>

    <AppConfirm
      v-model:open="confirmOpen"
      title="Excluir checklist"
      :description="
        checklist
          ? `Você está removendo '${checklist.name}'. Esta ação não pode ser desfeita.`
          : 'Esta ação não pode ser desfeita.'
      "
      confirm-label="Excluir"
      :loading="confirmLoading"
      @confirm="handleDelete"
    />
  </div>
</template>
