<script setup lang="ts">
definePageMeta({
  title: 'Detalhes do cliente'
})

const route = useRoute('customers-customerId')
const customerId = computed(() => Number(route.params.customerId))
const { data: customer, status, error, refresh } = useCustomer(customerId)
const {
  data: vehicles,
  status: vehiclesStatus,
  error: vehiclesError,
  refresh: refreshVehicles
} = useCustomerVehicles(customerId)
const { updateCustomer, deleteCustomer } = useCustomerActions()
const { createVehicle } = useVehicleActions()
const toast = useAppToast()

const isLoading = computed(
  () =>
    (status.value === 'pending' && !customer.value)
    || (vehiclesStatus.value === 'pending' && !vehicles.value)
)

const customerVehicles = computed(() => vehicles.value ?? [])

const handleRefresh = async () => {
  try {
    await Promise.all([refresh(), refreshVehicles()])
  } catch {
    toast.error({
      title: 'Falha ao atualizar',
      description: 'Não foi possível recarregar os dados do cliente.'
    })
  }
}

// ── Edit ──────────────────────────────────────────────────────────────────
const editFormOpen = ref(false)
const formSubmitting = ref(false)
const name = ref('')
const taxId = ref('')
const phone = ref('')
const email = ref('')
const formErrors = ref<{
  name?: string;
  tax_id?: string;
  phone?: string;
  email?: string;
}>({})

const taxIdDigitsCount = computed(() => taxId.value.replace(/\D/g, '').length)
const phoneDigitsCount = computed(() => phone.value.replace(/\D/g, '').length)

const openEdit = () => {
  if (!customer.value) return
  name.value = customer.value.name
  taxId.value = formatTaxId(customer.value.tax_id)
  phone.value = customer.value.phone ? formatBrPhone(customer.value.phone) : ''
  email.value = customer.value.email ?? ''
  formErrors.value = {}
  editFormOpen.value = true
}

const validateForm = () => {
  const errors: {
    name?: string;
    tax_id?: string;
    phone?: string;
    email?: string;
  } = {}
  const taxDigits = taxId.value.replace(/\D/g, '')
  const phoneDigits = phone.value.replace(/\D/g, '')

  if (!name.value.trim()) {
    errors.name = 'Informe o nome do cliente.'
  }

  if (!(taxDigits.length === 11 || taxDigits.length === 14)) {
    errors.tax_id = 'Informe um CPF ou CNPJ válido.'
  }

  if (phoneDigits && phoneDigits.length < 10) {
    errors.phone = 'Informe um telefone com DDD válido.'
  }

  if (
    email.value.trim()
    && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())
  ) {
    errors.email = 'Informe um e-mail válido.'
  }

  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleEdit = async () => {
  if (!validateForm() || formSubmitting.value || !customer.value) return

  formSubmitting.value = true
  try {
    await updateCustomer(customer.value.id, {
      name: name.value,
      tax_id: taxId.value,
      phone: phone.value,
      email: email.value
    })
    await refresh()
    toast.success({
      title: 'Cliente atualizado',
      description: 'Os dados do cliente foram salvos.'
    })
    editFormOpen.value = false
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao salvar',
      description: getErrorMessage(err, 'Não foi possível salvar o cliente.')
    })
  } finally {
    formSubmitting.value = false
  }
}

// ── Delete ────────────────────────────────────────────────────────────────
const confirmOpen = ref(false)
const confirmLoading = ref(false)

const handleDelete = async () => {
  if (!customer.value) return
  confirmLoading.value = true
  try {
    await deleteCustomer(customer.value.id)
    toast.success({
      title: 'Cliente removido',
      description: 'O cliente foi excluído com sucesso.'
    })
    confirmOpen.value = false
    await navigateTo({ name: 'customers' })
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao excluir',
      description: getErrorMessage(err, 'Não foi possível excluir o cliente.')
    })
  } finally {
    confirmLoading.value = false
  }
}

// ── New vehicle form ─────────────────────────────────────────────────────
const vehicleFormOpen = ref(false)
const vehicleFormSubmitting = ref(false)
const vehicleLicensePlate = ref('')
const vehicleModel = ref('')
const vehicleModelYear = ref('')
const vehicleColor = ref('')
const vehicleFormErrors = ref<{ license_plate?: string; model_year?: string }>(
  {}
)

const vehiclePlateCharsCount = computed(
  () => vehicleLicensePlate.value.replace(/[^a-zA-Z0-9]/g, '').length
)

const resetVehicleForm = () => {
  vehicleLicensePlate.value = ''
  vehicleModel.value = ''
  vehicleModelYear.value = ''
  vehicleColor.value = ''
  vehicleFormErrors.value = {}
}

const openVehicleCreate = () => {
  resetVehicleForm()
  vehicleFormOpen.value = true
}

const validateVehicleForm = () => {
  const errors: { license_plate?: string; model_year?: string } = {}
  const normalizedPlate = vehicleLicensePlate.value.replace(/[^a-zA-Z0-9]/g, '')

  if (normalizedPlate.length !== 7) {
    errors.license_plate = 'Informe uma placa válida com 7 caracteres.'
  }

  if (vehicleModelYear.value.trim()) {
    const year = Number(vehicleModelYear.value)
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      errors.model_year = 'Informe um ano entre 1900 e 2100.'
    }
  }

  vehicleFormErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleVehicleCreate = async () => {
  if (!validateVehicleForm() || vehicleFormSubmitting.value || !customer.value)
    return

  vehicleFormSubmitting.value = true
  try {
    await createVehicle({
      customer_id: customer.value.id,
      license_plate: vehicleLicensePlate.value,
      model: vehicleModel.value,
      model_year: vehicleModelYear.value.trim()
        ? Number(vehicleModelYear.value)
        : null,
      color: vehicleColor.value
    })
    toast.success({
      title: 'Veículo criado',
      description: 'O novo veículo foi adicionado com sucesso.'
    })
    vehicleFormOpen.value = false
    resetVehicleForm()
    await refreshVehicles()
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao criar',
      description: getErrorMessage(err, 'Não foi possível criar o veículo.')
    })
  } finally {
    vehicleFormSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-5 sm:space-y-6">
    <section class="space-y-3">
      <p class="text-xs font-semibold uppercase tracking-[0.32em] text-primary">
        Clientes
      </p>

      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div class="space-y-1.5">
          <NuxtLink
            :to="{ name: 'customers' }"
            class="inline-flex items-center gap-1.5 text-sm text-toned transition-colors hover:text-highlighted"
          >
            <UIcon
              name="i-lucide-arrow-left"
              class="size-4"
            />
            Clientes
          </NuxtLink>
          <h1 class="text-3xl font-semibold tracking-tight text-highlighted">
            {{ customer?.name || 'Detalhes do cliente' }}
          </h1>
        </div>

        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-refresh-cw"
          class="self-start sm:self-auto"
          aria-label="Atualizar cliente"
          @click="handleRefresh"
        >
          Atualizar
        </UButton>
      </div>
    </section>

    <AppLoading
      v-if="isLoading"
      title="Carregando cliente"
      description="Buscando os dados cadastrais e os veículos vinculados."
    />

    <UAlert
      v-else-if="error || vehiclesError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Falha ao carregar cliente"
      description="Atualize a página ou tente novamente em instantes."
    />

    <template v-else-if="customer">
      <UCard class="rounded-2xl border-default">
        <div class="space-y-5">
          <!-- Header: ícone + nome + ações -->
          <div
            class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(180deg,rgba(0,193,106,0.14)_0%,rgba(0,161,85,0.08)_100%)]"
              >
                <span
                  class="text-sm font-semibold uppercase tracking-[0.08em] text-primary"
                >
                  {{ customer.name.slice(0, 2) }}
                </span>
              </div>
              <div>
                <p class="text-base font-semibold text-highlighted">
                  {{ customer.name }}
                </p>
                <p class="text-xs text-toned">
                  ID #{{ customer.id }}
                </p>
              </div>
            </div>

            <div class="flex flex-wrap gap-2 sm:justify-end">
              <UButton
                color="neutral"
                variant="soft"
                icon="i-lucide-pencil"
                @click="openEdit"
              >
                Editar
              </UButton>
              <UButton
                color="error"
                variant="soft"
                icon="i-lucide-trash-2"
                @click="confirmOpen = true"
              >
                Excluir
              </UButton>
            </div>
          </div>

          <!-- Info blocks -->
          <div
            class="grid gap-3 rounded-xl border border-default bg-muted/20 p-4 sm:grid-cols-2"
          >
            <div>
              <p
                class="text-[11px] font-semibold uppercase tracking-[0.22em] text-toned"
              >
                Documento
              </p>
              <p class="mt-1 text-sm font-medium text-highlighted">
                {{ formatTaxId(customer.tax_id) }}
              </p>
            </div>
            <div>
              <p
                class="text-[11px] font-semibold uppercase tracking-[0.22em] text-toned"
              >
                Telefone
              </p>
              <p class="mt-1 text-sm font-medium text-highlighted">
                {{ formatBrPhone(customer.phone) }}
              </p>
            </div>
            <div>
              <p
                class="text-[11px] font-semibold uppercase tracking-[0.22em] text-toned"
              >
                E-mail
              </p>
              <p class="mt-1 text-sm font-medium text-highlighted">
                {{ customer.email || '-' }}
              </p>
            </div>
            <div>
              <p
                class="text-[11px] font-semibold uppercase tracking-[0.22em] text-toned"
              >
                Cadastro
              </p>
              <NuxtTime
                class="mt-1 text-sm font-medium text-highlighted"
                :datetime="customer.created_at"
                locale="pt-BR"
                day="2-digit"
                month="2-digit"
                year="numeric"
              />
            </div>
          </div>
        </div>
      </UCard>

      <section class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-highlighted">
            Veículos vinculados
          </h2>
          <UButton
            color="primary"
            icon="i-lucide-plus"
            @click="openVehicleCreate"
          >
            Novo veículo
          </UButton>
        </div>

        <AppEmpty
          v-if="customerVehicles.length === 0"
          title="Nenhum veículo cadastrado"
          description="Os veículos vinculados a este cliente aparecerão aqui."
          icon="i-lucide-car-front"
        />

        <div
          v-else
          class="grid gap-3"
        >
          <UCard
            v-for="vehicle in customerVehicles"
            :key="vehicle.id"
            class="rounded-2xl border-default"
          >
            <div class="space-y-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-base font-semibold text-highlighted">
                    {{ vehicle.model }}
                  </p>
                  <p class="text-sm text-toned">
                    {{ formatLicensePlate(vehicle.license_plate) }}
                  </p>
                </div>

                <div
                  v-if="typeof vehicle.latest_mileage === 'number'"
                  class="rounded-2xl bg-primary/10 px-4 py-2 text-center"
                >
                  <p
                    class="text-xs font-medium uppercase tracking-[0.2em] text-primary"
                  >
                    Km
                  </p>
                  <p class="text-lg font-semibold text-primary">
                    {{ vehicle.latest_mileage.toLocaleString('pt-BR') }}
                  </p>
                </div>
              </div>

              <div class="grid gap-3 text-sm text-toned sm:grid-cols-3">
                <div>
                  <p class="font-medium text-highlighted">
                    Ano
                  </p>
                  <p>{{ vehicle.model_year || '-' }}</p>
                </div>
                <div>
                  <p class="font-medium text-highlighted">
                    Cor
                  </p>
                  <p>{{ vehicle.color || '-' }}</p>
                </div>
                <div>
                  <p class="font-medium text-highlighted">
                    Checklists
                  </p>
                  <p>
                    {{ vehicle.checklists_done ?? 0 }}/{{
                      vehicle.checklists_total ?? 0
                    }}
                  </p>
                </div>
              </div>

              <div class="flex justify-end border-t border-default/70 pt-3">
                <UButton
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-arrow-up-right"
                  :to="{
                    name: 'vehicles-vehicleId',
                    params: { vehicleId: String(vehicle.id) }
                  }"
                >
                  Ver veículo
                </UButton>
              </div>
            </div>
          </UCard>
        </div>
      </section>
    </template>

    <!-- Edit slideover -->
    <USlideover
      v-model:open="editFormOpen"
      side="right"
      title="Editar cliente"
      description="Atualize os dados do cliente selecionado."
      :ui="{
        body: 'px-3 py-4 sm:px-4 sm:py-5',
        footer: 'justify-end px-3 sm:px-4'
      }"
    >
      <template #body>
        <div class="space-y-5">
          <div class="space-y-2">
            <label
              class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary"
            >Nome</label>
            <UInput
              v-model="name"
              placeholder="Nome do cliente"
              size="xl"
              class="w-full"
              :maxlength="255"
              @update:model-value="formErrors.name = undefined"
            />
            <p
              v-if="formErrors.name"
              class="text-sm text-error"
            >
              {{ formErrors.name }}
            </p>
          </div>

          <div class="space-y-2">
            <label
              class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary"
            >Documento</label>
            <UInput
              :model-value="taxId"
              placeholder="CPF ou CNPJ"
              size="xl"
              class="w-full"
              :maxlength="18"
              @update:model-value="
                value => {
                  formErrors.tax_id = undefined
                  taxId = formatTaxId(String(value ?? ''))
                }
              "
            />
            <p class="text-right text-xs text-toned">
              {{ taxIdDigitsCount }}/14
            </p>
            <p
              v-if="formErrors.tax_id"
              class="text-sm text-error"
            >
              {{ formErrors.tax_id }}
            </p>
          </div>

          <div class="space-y-2">
            <label
              class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary"
            >Telefone</label>
            <UInput
              :model-value="phone"
              placeholder="(11) 91234-5678"
              size="xl"
              class="w-full"
              :maxlength="15"
              @update:model-value="
                value => {
                  formErrors.phone = undefined
                  phone = formatBrPhone(String(value ?? ''))
                }
              "
            />
            <p class="text-right text-xs text-toned">
              {{ phoneDigitsCount }}/11
            </p>
            <p
              v-if="formErrors.phone"
              class="text-sm text-error"
            >
              {{ formErrors.phone }}
            </p>
          </div>

          <div class="space-y-2">
            <label
              class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary"
            >E-mail</label>
            <UInput
              v-model="email"
              type="email"
              placeholder="cliente@email.com"
              size="xl"
              class="w-full"
              @update:model-value="formErrors.email = undefined"
            />
            <p
              v-if="formErrors.email"
              class="text-sm text-error"
            >
              {{ formErrors.email }}
            </p>
          </div>
        </div>
      </template>

      <template #footer>
        <UButton
          color="neutral"
          variant="ghost"
          @click="editFormOpen = false"
        >
          Cancelar
        </UButton>
        <UButton
          color="primary"
          :loading="formSubmitting"
          @click="handleEdit"
        >
          Salvar alterações
        </UButton>
      </template>
    </USlideover>

    <AppConfirm
      v-model:open="confirmOpen"
      title="Excluir cliente"
      description="Esta ação remove o cliente e os dados vinculados a ele. Deseja continuar?"
      confirm-label="Excluir cliente"
      cancel-label="Cancelar"
      :loading="confirmLoading"
      @confirm="handleDelete"
    />

    <!-- New vehicle slideover -->
    <USlideover
      v-model:open="vehicleFormOpen"
      side="right"
      title="Novo veículo"
      description="Cadastre um novo veículo para este cliente."
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
            >Placa</label>
            <UInput
              v-model="vehicleLicensePlate"
              placeholder="ABC-1234"
              size="xl"
              class="w-full"
              :maxlength="8"
              @update:model-value="vehicleFormErrors.license_plate = undefined"
            />
            <p class="text-right text-xs text-toned">
              {{ vehiclePlateCharsCount }}/7
            </p>
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
            >Modelo</label>
            <UInput
              v-model="vehicleModel"
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
              >Ano</label>
              <UInput
                v-model="vehicleModelYear"
                placeholder="2024"
                size="xl"
                class="w-full"
                inputmode="numeric"
                :maxlength="4"
                @update:model-value="vehicleFormErrors.model_year = undefined"
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
              >Cor</label>
              <UInput
                v-model="vehicleColor"
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
          @click="vehicleFormOpen = false"
        >
          Cancelar
        </UButton>
        <UButton
          color="primary"
          :loading="vehicleFormSubmitting"
          @click="handleVehicleCreate"
        >
          Criar veículo
        </UButton>
      </template>
    </USlideover>
  </div>
</template>
