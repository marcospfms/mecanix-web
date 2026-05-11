<script setup lang="ts">
import { getErrorMessage } from '../../composables/useAppToast'
import type { Vehicle } from '../../composables/useVehicles'
import type { ChecklistTemplate } from '../../composables/useChecklistTemplates'

definePageMeta({
  title: 'Checklists'
})

const toast = useAppToast()
const manualRefreshing = ref(false)

const vehicleSelectorOpen = ref(false)
const templateSelectorOpen = ref(false)
const templateSelectorSubmitting = ref(false)
const selectedVehicle = ref<Vehicle | null>(null)
const selectedTemplateId = ref<number | undefined>()
const checklistStatusFilter = ref<'all' | 'completed' | 'in_progress'>('all')

const {
  search,
  vehicles,
  status,
  error,
  refresh,
  loadMore,
  hasMore,
  filterCounts,
  isLoadingMore
} = useVehiclesPaginated(checklistStatusFilter)
const { templates, status: templatesStatus } = useChecklistTemplates()
const { createChecklist } = useChecklistActions()

const isLoading = computed(
  () => status.value === 'pending' && vehicles.value.length === 0
)
const checklistFilterOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Checklists finalizados', value: 'completed' },
  { label: 'Checklists em andamento', value: 'in_progress' }
] as const

const hasVehicles = computed(() => vehicles.value.length > 0)
const isFiltering = computed(
  () => search.value.length > 0 || checklistStatusFilter.value !== 'all'
)
const needsMoreChars = computed(
  () => search.value.length > 0 && search.value.length < 4
)

const templateOptions = computed(() => {
  const all = Array.isArray(templates.value) ? templates.value : []
  const filtered = selectedVehicle.value?.vehicle_type_id
    ? all.filter(
        (t: ChecklistTemplate) =>
          t.vehicle_type_id === null
          || t.vehicle_type_id === selectedVehicle.value!.vehicle_type_id
      )
    : all
  return filtered.map((t: ChecklistTemplate) => ({
    label: t.name,
    value: t.id
  }))
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => search.value,
  (value) => {
    if (searchTimer) clearTimeout(searchTimer)
    if (value.length === 0 || value.length >= 4) {
      searchTimer = setTimeout(() => refresh(), 300)
    }
  }
)

const openVehicleSelector = () => {
  vehicleSelectorOpen.value = true
}

const handleVehicleSelected = (vehicle: Vehicle) => {
  vehicleSelectorOpen.value = false
  selectedVehicle.value = vehicle
  selectedTemplateId.value = undefined
  templateSelectorOpen.value = true
}

const openTemplateSelector = (vehicle: Vehicle) => {
  selectedVehicle.value = vehicle
  selectedTemplateId.value = undefined
  templateSelectorOpen.value = true
}

const handleStartChecklist = async () => {
  if (
    !selectedVehicle.value
    || !selectedTemplateId.value
    || templateSelectorSubmitting.value
  )
    return

  templateSelectorSubmitting.value = true

  try {
    const checklist = await createChecklist(
      selectedVehicle.value.id,
      selectedTemplateId.value
    )
    toast.success({
      title: 'Checklist criado',
      description: 'O checklist foi iniciado com sucesso.'
    })
    templateSelectorOpen.value = false
    await navigateTo({
      name: 'checklists-checklistId',
      params: { checklistId: String(checklist.id) }
    })
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao criar checklist',
      description: getErrorMessage(err, 'Não foi possível iniciar o checklist.')
    })
  } finally {
    templateSelectorSubmitting.value = false
  }
}

const openHistory = async (vehicle: Vehicle) => {
  await navigateTo({
    name: 'checklists-vehicles-vehicleId',
    params: { vehicleId: String(vehicle.id) }
  })
}

const handleRefresh = async () => {
  if (manualRefreshing.value) return

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

const handleLoadMore = async () => await loadMore()
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
          <h1 class="text-3xl font-semibold tracking-tight text-highlighted">
            Executar checklist
          </h1>
          <p class="max-w-2xl text-sm leading-6 text-toned">
            Selecione um veículo para iniciar uma nova inspeção ou visualizar o
            histórico de execuções.
          </p>
        </div>

        <UButton
          color="primary"
          icon="i-lucide-plus"
          size="lg"
          class="shrink-0"
          @click="openVehicleSelector"
        >
          Novo checklist
        </UButton>
      </div>
    </section>

    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <UInput
          v-model="search"
          placeholder="Buscar por placa ou cliente"
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
          :loading="manualRefreshing"
          @click="handleRefresh"
        />
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in checklistFilterOptions"
          :key="option.value"
          type="button"
          class="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
          :class="
            checklistStatusFilter === option.value
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-default bg-default text-toned hover:bg-muted/60'
          "
          @click="checklistStatusFilter = option.value"
        >
          <span>{{ option.label }}</span>
          <span
            class="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] leading-none text-warning"
          >
            {{ filterCounts[option.value] }}
          </span>
        </button>
      </div>

      <AppLoading
        v-if="isLoading || manualRefreshing"
        title="Carregando veículos"
        description="Buscando os veículos disponíveis para inspeção."
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
        v-else-if="needsMoreChars"
        title="Continue digitando"
        description="Digite ao menos 4 caracteres para buscar veículos."
        icon="i-lucide-search"
      />

      <AppEmpty
        v-else-if="!hasVehicles && isFiltering"
        title="Nenhum veículo encontrado"
        description="Tente buscar com termos diferentes."
        icon="i-lucide-car-front"
      />

      <AppEmpty
        v-else-if="!hasVehicles"
        title="Nenhum veículo disponível"
        description="Cadastre primeiro um cliente e depois vincule um veículo para começar a realizar inspeções."
        icon="i-lucide-car-front"
      >
        <div class="pt-2">
          <UButton
            color="primary"
            icon="i-lucide-plus"
            :to="{ name: 'customers' }"
          >
            Cadastrar cliente
          </UButton>
        </div>
      </AppEmpty>

      <template v-else>
        <div class="grid gap-2.5">
          <UCard
            v-for="vehicle in vehicles"
            :key="vehicle.id"
            class="w-full rounded-2xl border-default"
          >
            <div class="space-y-3">
              <div
                class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div class="flex min-w-0 items-start gap-3">
                  <div
                    class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-default bg-[linear-gradient(180deg,rgba(0,193,106,0.14)_0%,rgba(0,161,85,0.08)_100%)]"
                  >
                    <UIcon
                      name="i-lucide-car-front"
                      class="size-5 text-primary"
                    />
                  </div>

                  <div class="min-w-0 space-y-1">
                    <p class="text-base font-semibold text-highlighted">
                      {{ formatLicensePlate(vehicle.license_plate) }}
                    </p>

                    <p class="text-sm text-toned">
                      {{ vehicle.model || 'Modelo não informado' }}
                      <template v-if="vehicle.model_year">
                        · {{ vehicle.model_year }}
                      </template>
                    </p>
                  </div>
                </div>

                <div
                  v-if="vehicle.customer"
                  class="rounded-xl border border-default bg-muted/20 px-3 py-2 sm:max-w-xs sm:text-right"
                >
                  <p
                    class="text-xs font-semibold uppercase tracking-[0.18em] text-primary"
                  >
                    Cliente
                  </p>
                  <p class="mt-0.5 truncate text-sm font-medium text-highlighted">
                    {{ vehicle.customer.name }}
                  </p>
                </div>
              </div>

              <div class="flex flex-wrap gap-2 text-sm">
                <div
                  class="inline-flex max-w-full items-center gap-2 rounded-full border border-default bg-muted/25 px-3 py-1.5 text-toned"
                >
                  <UIcon
                    name="i-lucide-gauge"
                    class="size-4 shrink-0 text-primary"
                  />
                  <span class="truncate">{{
                    formatMileage(vehicle.latest_mileage)
                  }}</span>
                </div>

                <div
                  class="inline-flex max-w-full items-center gap-2 rounded-full border border-default bg-muted/25 px-3 py-1.5 text-toned"
                >
                  <UIcon
                    name="i-lucide-clipboard-check"
                    class="size-4 shrink-0 text-primary"
                  />
                  <span class="truncate">
                    {{ vehicle.checklists_done ?? 0 }}/{{
                      vehicle.checklists_total ?? 0
                    }}
                    checklists
                  </span>
                </div>
              </div>

              <div
                class="flex flex-wrap items-center gap-2 border-t border-default/70 pt-2.5"
              >
                <UButton
                  color="primary"
                  icon="i-lucide-play-circle"
                  class="flex-1 sm:flex-none"
                  @click="openTemplateSelector(vehicle)"
                >
                  Iniciar checklist
                </UButton>
                <UButton
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-history"
                  class="flex-1 sm:flex-none"
                  @click="openHistory(vehicle)"
                >
                  Histórico
                </UButton>
              </div>
            </div>
          </UCard>
        </div>

        <div
          v-if="hasMore || isLoadingMore"
          class="flex justify-center pt-2"
        >
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-chevron-down"
            :loading="isLoadingMore"
            @click="handleLoadMore"
          >
            {{ isFiltering ? 'Carregar mais (Filtrado)' : 'Carregar mais' }}
          </UButton>
        </div>
      </template>
    </div>

    <!-- Vehicle selector -->
    <USlideover
      v-model:open="vehicleSelectorOpen"
      side="right"
      title="Selecionar veículo"
      description="Escolha o veículo para iniciar o checklist."
      :ui="{
        body: 'px-3 py-4 sm:px-4 sm:py-5'
      }"
    >
      <template #body>
        <div class="space-y-4">
          <UInput
            v-model="search"
            placeholder="Buscar por placa ou cliente"
            icon="i-lucide-search"
            size="xl"
            class="w-full"
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

          <AppLoading
            v-if="isLoading"
            title="Carregando veículos"
            description=""
          />

          <AppEmpty
            v-else-if="needsMoreChars"
            title="Continue digitando"
            description="Digite ao menos 4 caracteres para buscar."
            icon="i-lucide-search"
          />

          <AppEmpty
            v-else-if="!hasVehicles"
            title="Nenhum veículo encontrado"
            :description="
              search.length > 0
                ? 'Tente buscar com termos diferentes.'
                : 'Nenhum veículo cadastrado ainda.'
            "
            icon="i-lucide-car-front"
          />

          <div
            v-else
            class="space-y-2"
          >
            <button
              v-for="vehicle in vehicles"
              :key="vehicle.id"
              type="button"
              class="w-full rounded-2xl border border-default bg-default p-4 text-left transition-colors hover:bg-muted/60 active:bg-muted"
              @click="handleVehicleSelected(vehicle)"
            >
              <div class="flex items-center gap-3">
                <div
                  class="flex size-10 shrink-0 items-center justify-center rounded-xl border border-default bg-[linear-gradient(180deg,rgba(0,193,106,0.14)_0%,rgba(0,161,85,0.08)_100%)]"
                >
                  <UIcon
                    name="i-lucide-car-front"
                    class="size-5 text-primary"
                  />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-highlighted">
                    {{ formatLicensePlate(vehicle.license_plate) }}
                  </p>
                  <p class="truncate text-xs text-toned">
                    {{ vehicle.model || 'Modelo não informado' }}
                    <template v-if="vehicle.customer?.name">
                      · {{ vehicle.customer.name }}
                    </template>
                  </p>
                </div>
                <UIcon
                  name="i-lucide-chevron-right"
                  class="size-4 shrink-0 text-muted"
                />
              </div>
            </button>

            <div
              v-if="hasMore || isLoadingMore"
              class="flex justify-center pt-1"
            >
              <UButton
                color="neutral"
                variant="soft"
                icon="i-lucide-chevron-down"
                size="sm"
                :loading="isLoadingMore"
                @click="loadMore"
              >
                Carregar mais
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </USlideover>

    <!-- Template selector -->
    <USlideover
      v-model:open="templateSelectorOpen"
      side="right"
      title="Selecionar template"
      description="Escolha o template de checklist para esta inspeção."
      :ui="{
        body: 'px-3 py-4 sm:px-4 sm:py-5',
        footer: 'justify-end px-3 sm:px-4'
      }"
    >
      <template #body>
        <div class="space-y-4">
          <div
            v-if="selectedVehicle"
            class="rounded-2xl border border-default bg-muted/30 px-4 py-3"
          >
            <p
              class="text-xs font-semibold uppercase tracking-[0.24em] text-primary"
            >
              Veículo selecionado
            </p>
            <p class="mt-1 text-base font-semibold text-highlighted">
              {{ formatLicensePlate(selectedVehicle.license_plate) }}
            </p>
            <p class="text-sm text-toned">
              {{ selectedVehicle.model || 'Modelo não informado' }}
            </p>
          </div>

          <div class="space-y-2">
            <label
              class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary"
            >
              Template de checklist
            </label>

            <AppLoading
              v-if="templatesStatus === 'pending'"
              title="Carregando templates"
              description=""
            />

            <AppEmpty
              v-else-if="templateOptions.length === 0"
              title="Nenhum template disponível"
              description="Crie templates antes de iniciar uma inspeção."
              icon="i-lucide-clipboard-list"
            />

            <USelect
              v-else
              v-model="selectedTemplateId"
              :items="templateOptions"
              placeholder="Selecione o template"
              size="xl"
              class="w-full"
            />
          </div>
        </div>
      </template>

      <template #footer>
        <UButton
          color="neutral"
          variant="ghost"
          @click="templateSelectorOpen = false"
        >
          Cancelar
        </UButton>
        <UButton
          color="primary"
          icon="i-lucide-play-circle"
          :loading="templateSelectorSubmitting"
          :disabled="!selectedTemplateId"
          @click="handleStartChecklist"
        >
          Iniciar checklist
        </UButton>
      </template>
    </USlideover>
  </div>
</template>
