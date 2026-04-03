<script setup lang="ts">
import { getErrorMessage } from '../../composables/useAppToast'
import type { Vehicle } from '../../composables/useVehicles'

definePageMeta({
  title: 'Veículos'
})

type FormMode = 'create' | 'edit'

const route = useRoute('vehicles')
const toast = useAppToast()
const manualRefreshing = ref(false)
const queryHandled = ref(false)
const visibleCount = ref(20)

const {
  search,
  vehicles,
  status,
  error,
  refresh,
  createVehicle,
  updateVehicle,
  deleteVehicle
} = useVehicles()

const { rawCustomers, status: customersStatus } = useCustomers()

const formOpen = ref(false)
const formMode = ref<FormMode>('create')
const formSubmitting = ref(false)
const confirmOpen = ref(false)
const confirmLoading = ref(false)
const vehiclePendingDeletion = ref<Vehicle | null>(null)
const editingVehicle = ref<Vehicle | null>(null)

const customerId = ref<number | undefined>()
const licensePlate = ref('')
const model = ref('')
const modelYear = ref('')
const color = ref('')
const formErrors = ref<{
  customer_id?: string;
  license_plate?: string;
  model_year?: string;
}>({})

const isLoading = computed(
  () => status.value === 'pending' && vehicles.value.length === 0
)
const isListRefreshing = computed(() => manualRefreshing.value)
const hasVehicles = computed(() => vehicles.value.length > 0)
const displayedVehicles = computed(() =>
  vehicles.value.slice(0, visibleCount.value)
)
const hasMoreVehicles = computed(
  () => vehicles.value.length > visibleCount.value
)
const formTitle = computed(() =>
  formMode.value === 'create' ? 'Novo veículo' : 'Editar veículo'
)
const formDescription = computed(() =>
  formMode.value === 'create'
    ? 'Cadastre um novo veículo para acompanhar a operação.'
    : 'Atualize os dados do veículo selecionado.'
)
const plateCharsCount = computed(
  () => licensePlate.value.replace(/[^a-zA-Z0-9]/g, '').length
)
const customerOptions = computed(() => {
  const customers = Array.isArray(rawCustomers.value) ? rawCustomers.value : []

  return customers.map(customer => ({
    label: customer.name,
    value: customer.id
  }))
})

watch(
  () => vehicles.value.length,
  () => {
    if (visibleCount.value < 20) {
      visibleCount.value = 20
    }
  }
)

const resetForm = () => {
  customerId.value = undefined
  licensePlate.value = ''
  model.value = ''
  modelYear.value = ''
  color.value = ''
  editingVehicle.value = null
  formErrors.value = {}
}

const openCreate = () => {
  const preselectedCustomerId = customerId.value
  resetForm()
  formMode.value = 'create'
  if (preselectedCustomerId) {
    customerId.value = preselectedCustomerId
  }
  formOpen.value = true
}

const openEdit = (vehicle: Vehicle) => {
  resetForm()
  formMode.value = 'edit'
  editingVehicle.value = vehicle
  customerId.value = vehicle.customer_id
  licensePlate.value = formatLicensePlate(vehicle.license_plate)
  model.value = vehicle.model ?? ''
  modelYear.value = vehicle.model_year ? String(vehicle.model_year) : ''
  color.value = vehicle.color ?? ''
  formOpen.value = true
}

const openDetails = async (vehicle: Vehicle) => {
  await navigateTo({
    name: 'vehicles-vehicleId',
    params: { vehicleId: String(vehicle.id) }
  })
}

// Watch para query params DEPOIS que openCreate já está definido
watch(
  () => route.query,
  (query) => {
    if (queryHandled.value) {
      return
    }

    if (query.open === 'create') {
      customerId.value = query.customerId ? Number(query.customerId) : undefined
      openCreate()
      queryHandled.value = true
    }
  },
  { immediate: true }
)

const validateForm = () => {
  const errors: {
    customer_id?: string;
    license_plate?: string;
    model_year?: string;
  } = {}

  const normalizedPlate = licensePlate.value.replace(/[^a-zA-Z0-9]/g, '')

  if (formMode.value === 'create' && !customerId.value) {
    errors.customer_id = 'Selecione o cliente do veículo.'
  }

  if (normalizedPlate.length !== 7) {
    errors.license_plate = 'Informe uma placa válida com 7 caracteres.'
  }

  if (modelYear.value.trim()) {
    const year = Number(modelYear.value)

    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      errors.model_year = 'Informe um ano entre 1900 e 2100.'
    }
  }

  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleSubmit = async () => {
  if (!validateForm() || formSubmitting.value) {
    return
  }

  formSubmitting.value = true

  try {
    if (formMode.value === 'create' && customerId.value) {
      const created = await createVehicle({
        customer_id: customerId.value,
        license_plate: licensePlate.value,
        model: model.value,
        model_year: modelYear.value.trim() ? Number(modelYear.value) : null,
        color: color.value
      })

      toast.success({
        title: 'Veículo criado',
        description: 'O novo veículo foi adicionado com sucesso.'
      })

      formOpen.value = false
      resetForm()

      await navigateTo({
        name: 'vehicles-vehicleId',
        params: { vehicleId: String(created.id) }
      })

      return
    }

    if (formMode.value === 'edit' && editingVehicle.value) {
      await updateVehicle(editingVehicle.value.id, {
        license_plate: licensePlate.value,
        model: model.value,
        model_year: modelYear.value.trim() ? Number(modelYear.value) : null,
        color: color.value
      })

      toast.success({
        title: 'Veículo atualizado',
        description: 'Os dados do veículo foram salvos.'
      })
    }

    formOpen.value = false
    resetForm()
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao salvar',
      description: getErrorMessage(err, 'Não foi possível salvar o veículo.')
    })
  } finally {
    formSubmitting.value = false
  }
}

const askDelete = (vehicle: Vehicle) => {
  vehiclePendingDeletion.value = vehicle
  confirmOpen.value = true
}

const handleDelete = async () => {
  if (!vehiclePendingDeletion.value) return

  confirmLoading.value = true

  try {
    await deleteVehicle(vehiclePendingDeletion.value.id)
    toast.success({
      title: 'Veículo removido',
      description: 'O veículo foi excluído com sucesso.'
    })
    confirmOpen.value = false
    vehiclePendingDeletion.value = null
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao excluir',
      description: getErrorMessage(err, 'Não foi possível excluir o veículo.')
    })
  } finally {
    confirmLoading.value = false
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
      new Promise(resolve => setTimeout(resolve, 1000))
    ])
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao atualizar',
      description: getErrorMessage(err, 'Não foi possível atualizar a lista.')
    })
  } finally {
    manualRefreshing.value = false
  }
}

const loadMore = () => {
  visibleCount.value += 20
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
            Base de veículos
          </h1>
          <p class="max-w-2xl text-sm leading-6 text-toned">
            Centralize os veículos cadastrados, acompanhe o vínculo com cada
            cliente e mantenha a base operacional pronta para novas inspeções.
          </p>
        </div>

        <UButton
          color="primary"
          icon="i-lucide-plus"
          class="self-start sm:self-auto"
          @click="openCreate"
        >
          Novo veículo
        </UButton>
      </div>
    </section>

    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <UInput
          v-model="search"
          placeholder="Buscar por placa, modelo ou cliente"
          icon="i-lucide-search"
          size="xl"
          class="flex-1"
        >
          <template
            v-if="search"
            #trailing
          >
            <UButton
              color="neutral"
              variant="link"
              size="sm"
              icon="i-lucide-circle-x"
              aria-label="Limpar busca"
              @click="search = ''"
            />
          </template>
        </UInput>

        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-refresh-cw"
          size="xl"
          aria-label="Atualizar veículos"
          @click="handleRefresh"
        />
      </div>

      <AppLoading
        v-if="isLoading || isListRefreshing"
        title="Carregando veículos"
        description="Buscando os veículos cadastrados na operação."
      />

      <UAlert
        v-else-if="error"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="Falha ao carregar veículos"
        description="Atualize a página ou tente novamente em instantes."
      />

      <AppEmpty
        v-else-if="!hasVehicles"
        title="Nenhum veículo cadastrado"
        description="Adicione o primeiro veículo para começar a organizar a base."
        icon="i-lucide-car-front"
      >
        <div class="pt-2">
          <UButton
            color="primary"
            icon="i-lucide-plus"
            @click="openCreate"
          >
            Criar primeiro veículo
          </UButton>
        </div>
      </AppEmpty>

      <template v-else>
        <div class="grid gap-3">
          <UCard
            v-for="vehicle in displayedVehicles"
            :key="vehicle.id"
            class="w-full rounded-2xl border-default"
          >
            <div
              class="space-y-4 cursor-pointer rounded-xl transition-colors hover:bg-muted/20"
              role="button"
              tabindex="0"
              @click="openDetails(vehicle)"
              @keydown.enter.prevent="openDetails(vehicle)"
              @keydown.space.prevent="openDetails(vehicle)"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="flex min-w-0 items-start gap-4">
                  <div
                    class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-default bg-[linear-gradient(180deg,rgba(0,193,106,0.14)_0%,rgba(0,161,85,0.08)_100%)]"
                  >
                    <UIcon
                      name="i-lucide-car-front"
                      class="size-6 text-primary"
                    />
                  </div>

                  <div class="min-w-0 space-y-2">
                    <p
                      class="truncate text-base font-semibold text-highlighted"
                    >
                      {{ formatLicensePlate(vehicle.license_plate) }}
                    </p>

                    <p class="text-sm text-toned">
                      {{ vehicle.model || 'Modelo não informado' }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap gap-2 text-sm">
                <div
                  class="inline-flex max-w-full items-center gap-2 rounded-full border border-default bg-muted/25 px-3 py-2 text-toned"
                >
                  <UIcon
                    name="i-lucide-calendar-range"
                    class="size-4 shrink-0 text-primary"
                  />
                  <span class="truncate">{{
                    vehicle.model_year || 'Ano não informado'
                  }}</span>
                </div>

                <div
                  class="inline-flex max-w-full items-center gap-2 rounded-full border border-default bg-muted/25 px-3 py-2 text-toned"
                >
                  <UIcon
                    name="i-lucide-palette"
                    class="size-4 shrink-0 text-primary"
                  />
                  <span class="truncate">{{
                    vehicle.color || 'Cor não informada'
                  }}</span>
                </div>
              </div>

              <div
                v-if="vehicle.customer"
                class="rounded-2xl border border-default bg-muted/20 px-4 py-3"
              >
                <p
                  class="text-xs font-semibold uppercase tracking-[0.18em] text-primary"
                >
                  Cliente
                </p>
                <p class="mt-1 text-sm font-medium text-highlighted">
                  {{ vehicle.customer.name }}
                </p>
                <p class="mt-1 text-xs text-toned">
                  {{ formatTaxId(vehicle.customer.tax_id) }}
                </p>
              </div>

              <div
                class="flex items-center justify-between gap-3 border-t border-default/70 pt-3"
              >
                <div
                  class="inline-flex items-center gap-2 text-sm font-medium text-primary"
                >
                  <UIcon
                    name="i-lucide-panel-top"
                    class="size-4"
                  />
                  <span>Ver detalhes</span>
                </div>

                <div class="flex gap-2 sm:justify-end">
                  <UButton
                    color="neutral"
                    variant="soft"
                    icon="i-lucide-pencil"
                    @click.stop="openEdit(vehicle)"
                  >
                    Editar
                  </UButton>
                  <UButton
                    color="error"
                    variant="soft"
                    icon="i-lucide-trash"
                    @click.stop="askDelete(vehicle)"
                  >
                    Excluir
                  </UButton>
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <div
          v-if="hasMoreVehicles"
          class="flex justify-center pt-2"
        >
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-chevron-down"
            @click="loadMore"
          >
            Carregar mais
          </UButton>
        </div>
      </template>
    </div>

    <USlideover
      v-model:open="formOpen"
      side="right"
      :title="formTitle"
      :description="formDescription"
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
              Cliente
            </label>
            <USelect
              v-model="customerId"
              :items="customerOptions"
              :disabled="formMode === 'edit' || customersStatus === 'pending'"
              placeholder="Selecione o cliente"
              size="xl"
              class="w-full"
            />
            <p
              v-if="formErrors.customer_id"
              class="text-sm text-error"
            >
              {{ formErrors.customer_id }}
            </p>
          </div>

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
            <p class="text-right text-xs text-toned">
              {{ plateCharsCount }}/7
            </p>
            <p
              v-if="formErrors.license_plate"
              class="text-sm text-error"
            >
              {{ formErrors.license_plate }}
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
              :maxlength="100"
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
                v-if="formErrors.model_year"
                class="text-sm text-error"
              >
                {{ formErrors.model_year }}
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
                :maxlength="50"
              />
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <UButton
          color="neutral"
          variant="ghost"
          @click="formOpen = false"
        >
          Cancelar
        </UButton>
        <UButton
          color="primary"
          :loading="formSubmitting"
          @click="handleSubmit"
        >
          {{ formMode === 'create' ? 'Criar veículo' : 'Salvar alterações' }}
        </UButton>
      </template>
    </USlideover>

    <AppConfirm
      v-model:open="confirmOpen"
      title="Excluir veículo"
      :description="
        vehiclePendingDeletion
          ? `Você está removendo ${formatLicensePlate(vehiclePendingDeletion.license_plate)}. Esta ação não pode ser desfeita.`
          : 'Esta ação não pode ser desfeita.'
      "
      confirm-label="Excluir"
      :loading="confirmLoading"
      @confirm="handleDelete"
    />
  </div>
</template>
