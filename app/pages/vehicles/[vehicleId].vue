<script setup lang="ts">
import { getErrorMessage } from '../../composables/useAppToast'
import type { VehicleMileageHistory } from '../../composables/useVehicles'

definePageMeta({
  title: 'Detalhes do veículo'
})

type MileageFormMode = 'create' | 'edit'

const route = useRoute()
const toast = useAppToast()
const vehicleId = computed(() => Number(route.params.vehicleId))
const manualRefreshing = ref(false)

const { data: vehicle, status, error, refresh } = useVehicle(vehicleId)
const {
  history,
  latestMileage,
  status: mileageStatus,
  error: mileageError,
  refresh: refreshMileage,
  createMileage,
  updateMileage,
  deleteMileage
} = useMileageHistory(vehicleId)
const {
  recentChecklists,
  status: checklistsStatus,
  error: checklistsError,
  refresh: refreshChecklists
} = useVehicleChecklists(vehicleId)
const { updateVehicle, deleteVehicle } = useVehicleActions()

const vehicleFormOpen = ref(false)
const mileageFormOpen = ref(false)
const vehicleFormSubmitting = ref(false)
const mileageFormSubmitting = ref(false)
const vehicleConfirmOpen = ref(false)
const mileageConfirmOpen = ref(false)
const vehicleConfirmLoading = ref(false)
const mileageConfirmLoading = ref(false)

const licensePlate = ref('')
const model = ref('')
const modelYear = ref('')
const color = ref('')
const vehicleFormErrors = ref<{ license_plate?: string; model_year?: string }>(
  {}
)

const mileageMode = ref<MileageFormMode>('create')
const editingMileage = ref<VehicleMileageHistory | null>(null)
const mileageValue = ref('')
const mileageNotes = ref('')
const mileageFormErrors = ref<{ mileage?: string }>({})

const isLoading = computed(
  () =>
    (status.value === 'pending' && !vehicle.value)
    || (mileageStatus.value === 'pending' && !history.value)
    || (checklistsStatus.value === 'pending' && !recentChecklists.value)
)
const isDataRefreshing = computed(
  () => manualRefreshing.value && !!vehicle.value
)
const mileageItems = computed(() => history.value ?? [])
const latestMileageValue = computed(() => latestMileage.value?.mileage ?? null)

const vehicleFormDescription = computed(
  () => 'Atualize os dados principais deste veículo.'
)

const mileageFormTitle = computed(() =>
  mileageMode.value === 'create'
    ? 'Registrar quilometragem'
    : 'Editar quilometragem'
)
const mileageFormDescription = computed(() =>
  mileageMode.value === 'create'
    ? 'Adicione um registro manual ao histórico deste veículo.'
    : 'Ajuste o registro manual selecionado.'
)

const resetVehicleForm = () => {
  licensePlate.value = vehicle.value?.license_plate
    ? formatLicensePlate(vehicle.value.license_plate)
    : ''
  model.value = vehicle.value?.model ?? ''
  modelYear.value = vehicle.value?.model_year
    ? String(vehicle.value.model_year)
    : ''
  color.value = vehicle.value?.color ?? ''
  vehicleFormErrors.value = {}
}

const resetMileageForm = () => {
  mileageValue.value = ''
  mileageNotes.value = ''
  editingMileage.value = null
  mileageFormErrors.value = {}
}

const openVehicleEdit = () => {
  resetVehicleForm()
  vehicleFormOpen.value = true
}

const openMileageCreate = () => {
  resetMileageForm()
  mileageMode.value = 'create'
  mileageFormOpen.value = true
}

const openMileageEdit = (item: VehicleMileageHistory) => {
  resetMileageForm()
  mileageMode.value = 'edit'
  editingMileage.value = item
  mileageValue.value = String(item.mileage)
  mileageNotes.value = item.notes ?? ''
  mileageFormOpen.value = true
}

const askVehicleDelete = () => {
  vehicleConfirmOpen.value = true
}

const askMileageDelete = (item: VehicleMileageHistory) => {
  editingMileage.value = item
  mileageConfirmOpen.value = true
}

const validateVehicleForm = () => {
  const errors: { license_plate?: string; model_year?: string } = {}
  const normalizedPlate = licensePlate.value.replace(/[^a-zA-Z0-9]/g, '')

  if (normalizedPlate.length !== 7) {
    errors.license_plate = 'Informe uma placa válida com 7 caracteres.'
  }

  if (modelYear.value.trim()) {
    const year = Number(modelYear.value)

    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      errors.model_year = 'Informe um ano entre 1900 e 2100.'
    }
  }

  vehicleFormErrors.value = errors
  return Object.keys(errors).length === 0
}

const validateMileageForm = () => {
  const errors: { mileage?: string } = {}
  const parsedMileage = Number(mileageValue.value)

  if (!Number.isInteger(parsedMileage) || parsedMileage < 0) {
    errors.mileage = 'Informe uma quilometragem válida.'
  }

  mileageFormErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleVehicleSubmit = async () => {
  if (!vehicle.value || !validateVehicleForm() || vehicleFormSubmitting.value) {
    return
  }

  vehicleFormSubmitting.value = true

  try {
    await updateVehicle(vehicle.value.id, {
      license_plate: licensePlate.value,
      model: model.value,
      model_year: modelYear.value.trim() ? Number(modelYear.value) : null,
      color: color.value
    })

    await refresh()

    toast.success({
      title: 'Veículo atualizado',
      description: 'Os dados do veículo foram salvos.'
    })

    vehicleFormOpen.value = false
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao salvar',
      description: getErrorMessage(err, 'Não foi possível atualizar o veículo.')
    })
  } finally {
    vehicleFormSubmitting.value = false
  }
}

const handleMileageSubmit = async () => {
  if (!validateMileageForm() || mileageFormSubmitting.value) {
    return
  }

  mileageFormSubmitting.value = true

  try {
    if (mileageMode.value === 'create') {
      await createMileage({
        mileage: Number(mileageValue.value),
        notes: mileageNotes.value
      })

      toast.success({
        title: 'Quilometragem registrada',
        description: 'O novo registro foi adicionado ao histórico.'
      })
    } else if (editingMileage.value) {
      await updateMileage(editingMileage.value.id, {
        mileage: Number(mileageValue.value),
        notes: mileageNotes.value
      })

      toast.success({
        title: 'Quilometragem atualizada',
        description: 'O registro manual foi atualizado.'
      })
    }

    await refresh()
    mileageFormOpen.value = false
    resetMileageForm()
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao salvar',
      description: getErrorMessage(
        err,
        'Não foi possível salvar a quilometragem.'
      )
    })
  } finally {
    mileageFormSubmitting.value = false
  }
}

const handleVehicleDelete = async () => {
  if (!vehicle.value) return

  vehicleConfirmLoading.value = true

  try {
    await deleteVehicle(vehicle.value.id)
    toast.success({
      title: 'Veículo removido',
      description: 'O veículo foi excluído com sucesso.'
    })
    vehicleConfirmOpen.value = false
    await navigateTo({ name: 'vehicles' })
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao excluir',
      description: getErrorMessage(err, 'Não foi possível excluir o veículo.')
    })
  } finally {
    vehicleConfirmLoading.value = false
  }
}

const handleMileageDelete = async () => {
  if (!editingMileage.value) return

  mileageConfirmLoading.value = true

  try {
    await deleteMileage(editingMileage.value.id)
    await refresh()
    toast.success({
      title: 'Quilometragem removida',
      description: 'O registro manual foi excluído.'
    })
    mileageConfirmOpen.value = false
    resetMileageForm()
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao excluir',
      description: getErrorMessage(err, 'Não foi possível excluir o registro.')
    })
  } finally {
    mileageConfirmLoading.value = false
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
      refreshMileage(),
      refreshChecklists(),
      new Promise(resolve => setTimeout(resolve, 1000))
    ])
  } catch {
    toast.error({
      title: 'Falha ao atualizar',
      description: 'Não foi possível recarregar os dados do veículo.'
    })
  } finally {
    manualRefreshing.value = false
  }
}
</script>

<template>
  <div class="space-y-5 sm:space-y-6">
    <section class="space-y-3">
      <p class="text-xs font-semibold uppercase tracking-[0.32em] text-primary">
        Veículos
      </p>

      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div class="space-y-2">
          <h1 class="text-3xl font-semibold tracking-tight text-highlighted">
            {{
              vehicle
                ? formatLicensePlate(vehicle.license_plate)
                : 'Detalhes do veículo'
            }}
          </h1>
          <p class="max-w-2xl text-sm leading-6 text-toned">
            Consulte o cadastro do veículo, acompanhe o cliente vinculado e
            mantenha o histórico manual de quilometragem atualizado.
          </p>
        </div>

        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-refresh-cw"
          size="xl"
          aria-label="Atualizar veículo"
          @click="handleRefresh"
        />
      </div>
    </section>

    <AppLoading
      v-if="isLoading || isDataRefreshing"
      title="Carregando veículo"
      description="Buscando os dados cadastrais e o histórico de quilometragem."
    />

    <UAlert
      v-else-if="error || mileageError || checklistsError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Falha ao carregar veículo"
      description="Atualize a página ou tente novamente em instantes."
    />

    <template v-else-if="vehicle">
      <UCard class="rounded-2xl border-default">
        <div class="space-y-5">
          <div
            class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div class="space-y-3">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary"
                >
                  {{ vehicle.customer?.name || 'Sem cliente vinculado' }}
                </span>
                <span
                  class="rounded-full border border-default px-3 py-1 text-xs font-medium text-toned"
                >
                  {{ vehicle.model || 'Modelo não informado' }}
                </span>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <p
                    class="text-xs font-semibold uppercase tracking-[0.24em] text-primary"
                  >
                    Placa
                  </p>
                  <p class="mt-1 text-base text-highlighted">
                    {{ formatLicensePlate(vehicle.license_plate) }}
                  </p>
                </div>

                <div>
                  <p
                    class="text-xs font-semibold uppercase tracking-[0.24em] text-primary"
                  >
                    Última quilometragem
                  </p>
                  <p class="mt-1 text-base text-highlighted">
                    {{ formatMileage(latestMileageValue) }}
                  </p>
                </div>

                <div>
                  <p
                    class="text-xs font-semibold uppercase tracking-[0.24em] text-primary"
                  >
                    Ano
                  </p>
                  <p class="mt-1 text-base text-highlighted">
                    {{ vehicle.model_year || '-' }}
                  </p>
                </div>

                <div>
                  <p
                    class="text-xs font-semibold uppercase tracking-[0.24em] text-primary"
                  >
                    Cor
                  </p>
                  <p class="mt-1 text-base text-highlighted">
                    {{ vehicle.color || '-' }}
                  </p>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap gap-2 sm:justify-end">
              <UButton
                color="neutral"
                variant="soft"
                icon="i-lucide-pencil"
                @click="openVehicleEdit"
              >
                Editar
              </UButton>
              <UButton
                color="primary"
                icon="i-lucide-gauge"
                @click="openMileageCreate"
              >
                Registrar km
              </UButton>
              <UButton
                color="error"
                variant="soft"
                icon="i-lucide-trash"
                @click="askVehicleDelete"
              >
                Excluir
              </UButton>
            </div>
          </div>

          <div
            v-if="vehicle.customer"
            class="rounded-2xl border border-default bg-muted/20 px-4 py-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p
                  class="text-xs font-semibold uppercase tracking-[0.24em] text-primary"
                >
                  Cliente
                </p>
                <p class="mt-1 text-base font-medium text-highlighted">
                  {{ vehicle.customer.name }}
                </p>
                <p class="mt-1 text-sm text-toned">
                  {{ formatTaxId(vehicle.customer.tax_id) }}
                </p>
              </div>

              <UButton
                color="neutral"
                variant="soft"
                icon="i-lucide-arrow-up-right"
                :to="{
                  name: 'customers-customerId',
                  params: { customerId: String(vehicle.customer.id) }
                }"
              >
                Ver cliente
              </UButton>
            </div>
          </div>
        </div>
      </UCard>

      <section class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-highlighted">
              Histórico de quilometragem
            </h2>
            <p class="text-sm text-toned">
              Registros manuais e leituras geradas por checklist aparecem nesta
              linha do tempo.
            </p>
          </div>
        </div>

        <AppEmpty
          v-if="mileageItems.length === 0"
          title="Nenhuma quilometragem registrada"
          description="Os registros manuais e automáticos aparecerão aqui."
          icon="i-lucide-gauge"
        >
          <div class="pt-2">
            <UButton
              color="primary"
              icon="i-lucide-plus"
              @click="openMileageCreate"
            >
              Registrar primeira quilometragem
            </UButton>
          </div>
        </AppEmpty>

        <div
          v-else
          class="grid gap-3"
        >
          <UCard
            v-for="item in mileageItems"
            :key="item.id"
            class="rounded-2xl border-default"
          >
            <div class="space-y-4">
              <div
                class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div class="space-y-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <p
                      class="text-xl font-semibold tracking-tight text-highlighted"
                    >
                      {{ formatMileage(item.mileage) }}
                    </p>
                    <span
                      class="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary"
                    >
                      {{ mileageSourceLabel(item.source_type) }}
                    </span>
                  </div>

                  <p class="text-sm text-toned">
                    <NuxtTime
                      :datetime="item.created_at"
                      year="numeric"
                      month="2-digit"
                      day="2-digit"
                      hour="2-digit"
                      minute="2-digit"
                    />
                  </p>
                </div>

                <div
                  v-if="item.source_type === 'manual'"
                  class="flex gap-2 sm:justify-end"
                >
                  <UButton
                    color="neutral"
                    variant="soft"
                    icon="i-lucide-pencil"
                    @click="openMileageEdit(item)"
                  >
                    Editar
                  </UButton>
                  <UButton
                    color="error"
                    variant="soft"
                    icon="i-lucide-trash"
                    @click="askMileageDelete(item)"
                  >
                    Excluir
                  </UButton>
                </div>
              </div>

              <div
                v-if="item.notes"
                class="rounded-2xl border border-default bg-muted/20 px-4 py-3"
              >
                <p
                  class="text-xs font-semibold uppercase tracking-[0.24em] text-primary"
                >
                  Observações
                </p>
                <p class="mt-2 text-sm leading-6 text-toned">
                  {{ item.notes }}
                </p>
              </div>
            </div>
          </UCard>
        </div>
      </section>

      <section class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-highlighted">
              Últimos checklists
            </h2>
            <p class="text-sm text-toned">
              As execuções mais recentes deste veículo aparecem aqui para
              consulta rápida.
            </p>
          </div>
        </div>

        <AppEmpty
          v-if="recentChecklists.length === 0"
          title="Nenhum checklist executado"
          description="As próximas execuções deste veículo aparecerão aqui."
          icon="i-lucide-clipboard-check"
        />

        <div
          v-else
          class="grid gap-3"
        >
          <UCard
            v-for="checklist in recentChecklists"
            :key="checklist.id"
            class="rounded-2xl border-default"
          >
            <div class="space-y-4">
              <div
                class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div class="space-y-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="text-base font-semibold text-highlighted">
                      {{ checklist.name }}
                    </p>
                    <span
                      class="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                      :class="
                        checklist.is_completed
                          ? 'bg-primary/10 text-primary'
                          : 'bg-warning/10 text-warning'
                      "
                    >
                      {{ checklist.is_completed ? 'Concluído' : 'Rascunho' }}
                    </span>
                  </div>

                  <div class="flex flex-wrap gap-4 text-sm text-toned">
                    <div class="inline-flex items-center gap-2">
                      <UIcon
                        name="i-lucide-calendar-clock"
                        class="size-4 text-primary"
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

                    <div class="inline-flex items-center gap-2">
                      <UIcon
                        name="i-lucide-user-round"
                        class="size-4 text-primary"
                      />
                      <span>{{
                        checklist.executed_by?.name
                          || 'Sem executor identificado'
                      }}</span>
                    </div>
                  </div>
                </div>

                <div
                  v-if="checklist.stats"
                  class="rounded-2xl border border-default bg-muted/20 px-4 py-3"
                >
                  <p
                    class="text-xs font-semibold uppercase tracking-[0.18em] text-primary"
                  >
                    Progresso
                  </p>
                  <p class="mt-1 text-sm font-medium text-highlighted">
                    {{ checklist.stats.completed }}/{{ checklist.stats.total }}
                    itens
                  </p>
                  <p class="mt-1 text-xs text-toned">
                    {{ checklist.stats.open }} em aberto
                  </p>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </section>
    </template>

    <USlideover
      v-model:open="vehicleFormOpen"
      side="right"
      title="Editar veículo"
      :description="vehicleFormDescription"
      :ui="{
        body: 'px-3 py-4 sm:px-4 sm:py-5',
        footer: 'justify-end px-3 sm:px-4'
      }"
    >
      <template #body>
        <div class="space-y-4">
          <div class="space-y-2">
            <label
              class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary"
            >
              Placa
            </label>
            <UInput
              v-model="licensePlate"
              placeholder="ABC-1234"
              size="xl"
              class="w-full"
              :maxlength="8"
            />
            <p
              v-if="vehicleFormErrors.license_plate"
              class="text-sm text-error"
            >
              {{ vehicleFormErrors.license_plate }}
            </p>
          </div>

          <div class="space-y-2">
            <label
              class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary"
            >
              Modelo
            </label>
            <UInput
              v-model="model"
              placeholder="Ex.: Onix LT"
              size="xl"
              class="w-full"
            />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <label
                class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary"
              >
                Ano
              </label>
              <UInput
                v-model="modelYear"
                placeholder="2024"
                size="xl"
                class="w-full"
                inputmode="numeric"
                :maxlength="4"
              />
              <p
                v-if="vehicleFormErrors.model_year"
                class="text-sm text-error"
              >
                {{ vehicleFormErrors.model_year }}
              </p>
            </div>

            <div class="space-y-2">
              <label
                class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary"
              >
                Cor
              </label>
              <UInput
                v-model="color"
                placeholder="Ex.: Preto"
                size="xl"
                class="w-full"
              />
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <UButton
          color="neutral"
          variant="ghost"
          @click="vehicleFormOpen = false"
        >
          Cancelar
        </UButton>
        <UButton
          color="primary"
          :loading="vehicleFormSubmitting"
          @click="handleVehicleSubmit"
        >
          Salvar alterações
        </UButton>
      </template>
    </USlideover>

    <USlideover
      v-model:open="mileageFormOpen"
      side="right"
      :title="mileageFormTitle"
      :description="mileageFormDescription"
      :ui="{
        body: 'px-3 py-4 sm:px-4 sm:py-5',
        footer: 'justify-end px-3 sm:px-4'
      }"
    >
      <template #body>
        <div class="space-y-4">
          <div class="space-y-2">
            <label
              class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary"
            >
              Quilometragem
            </label>
            <UInput
              v-model="mileageValue"
              placeholder="Ex.: 52340"
              size="xl"
              class="w-full"
              inputmode="numeric"
            />
            <p
              v-if="mileageFormErrors.mileage"
              class="text-sm text-error"
            >
              {{ mileageFormErrors.mileage }}
            </p>
          </div>

          <div class="space-y-2">
            <label
              class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary"
            >
              Observações
            </label>
            <UTextarea
              v-model="mileageNotes"
              placeholder="Opcional"
              class="w-full"
              :rows="5"
              :maxlength="1000"
            />
          </div>
        </div>
      </template>

      <template #footer>
        <UButton
          color="neutral"
          variant="ghost"
          @click="mileageFormOpen = false"
        >
          Cancelar
        </UButton>
        <UButton
          color="primary"
          :loading="mileageFormSubmitting"
          @click="handleMileageSubmit"
        >
          {{
            mileageMode === 'create'
              ? 'Registrar quilometragem'
              : 'Salvar alterações'
          }}
        </UButton>
      </template>
    </USlideover>

    <AppConfirm
      v-model:open="vehicleConfirmOpen"
      title="Excluir veículo"
      :description="
        vehicle
          ? `Você está removendo ${formatLicensePlate(vehicle.license_plate)}. Esta ação não pode ser desfeita.`
          : 'Esta ação não pode ser desfeita.'
      "
      confirm-label="Excluir"
      :loading="vehicleConfirmLoading"
      @confirm="handleVehicleDelete"
    />

    <AppConfirm
      v-model:open="mileageConfirmOpen"
      title="Excluir registro"
      description="Este registro manual será removido do histórico. Esta ação não pode ser desfeita."
      confirm-label="Excluir"
      :loading="mileageConfirmLoading"
      @confirm="handleMileageDelete"
    />
  </div>
</template>
