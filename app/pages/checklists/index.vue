<script setup lang="ts">
import { getErrorMessage } from '../../composables/useAppToast'
import type { Vehicle } from '../../composables/useVehicles'
import type { ChecklistTemplate } from '../../composables/useChecklistTemplates'

definePageMeta({
  title: 'Checklists'
})

const toast = useAppToast()
const visibleCount = ref(20)
const manualRefreshing = ref(false)

const templateSelectorOpen = ref(false)
const templateSelectorSubmitting = ref(false)
const selectedVehicle = ref<Vehicle | null>(null)
const selectedTemplateId = ref<number | undefined>()

const { search, vehicles, status, error, refresh } = useVehicles()
const { templates, status: templatesStatus } = useChecklistTemplates()
const { createChecklist } = useChecklistActions()

const displayedVehicles = computed(() =>
  vehicles.value.slice(0, visibleCount.value)
)
const hasMoreVehicles = computed(
  () => vehicles.value.length > visibleCount.value
)
const isLoading = computed(
  () => status.value === 'pending' && vehicles.value.length === 0
)
const hasVehicles = computed(() => vehicles.value.length > 0)

const templateOptions = computed(() =>
  (Array.isArray(templates.value) ? templates.value : []).map(
    (t: ChecklistTemplate) => ({
      label: t.name,
      value: t.id
    })
  )
)

watch(
  () => search.value,
  () => {
    visibleCount.value = 20
  }
)

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

const loadMore = () => {
  visibleCount.value += 20
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
          <h1 class="text-3xl font-semibold tracking-tight text-highlighted">
            Executar checklist
          </h1>
          <p class="max-w-2xl text-sm leading-6 text-toned">
            Selecione um veículo para iniciar uma nova inspeção ou visualizar o
            histórico de execuções.
          </p>
        </div>
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
          :loading="manualRefreshing"
          @click="handleRefresh"
        />
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
        v-else-if="!hasVehicles"
        title="Nenhum veículo disponível"
        description="Cadastre veículos para começar a realizar inspeções."
        icon="i-lucide-car-front"
      >
        <div class="pt-2">
          <UButton
            color="primary"
            icon="i-lucide-plus"
            :to="{ name: 'vehicles' }"
          >
            Cadastrar veículo
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
            <div class="space-y-4">
              <div class="flex items-start gap-4">
                <div
                  class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-default bg-[linear-gradient(180deg,rgba(0,193,106,0.14)_0%,rgba(0,161,85,0.08)_100%)]"
                >
                  <UIcon
                    name="i-lucide-car-front"
                    class="size-6 text-primary"
                  />
                </div>

                <div class="min-w-0 flex-1 space-y-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="text-base font-semibold text-highlighted">
                      {{ formatLicensePlate(vehicle.license_plate) }}
                    </p>
                    <span
                      class="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary"
                    >
                      {{ vehicle.customer?.name || 'Sem cliente' }}
                    </span>
                  </div>

                  <p class="text-sm text-toned">
                    {{ vehicle.model || 'Modelo não informado' }}
                    <template v-if="vehicle.model_year">
                      · {{ vehicle.model_year }}
                    </template>
                  </p>

                  <div class="flex flex-wrap gap-2 pt-1 text-xs text-toned">
                    <span class="inline-flex items-center gap-1.5">
                      <UIcon
                        name="i-lucide-gauge"
                        class="size-3.5 text-primary"
                      />
                      {{ formatMileage(vehicle.latest_mileage) }}
                    </span>
                    <span class="inline-flex items-center gap-1.5">
                      <UIcon
                        name="i-lucide-clipboard-check"
                        class="size-3.5 text-primary"
                      />
                      {{ vehicle.checklists_done ?? 0 }}/{{
                        vehicle.checklists_total ?? 0
                      }}
                      checklists
                    </span>
                  </div>
                </div>
              </div>

              <div
                class="flex flex-wrap items-center gap-2 border-t border-default/70 pt-3"
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
