<script setup lang="ts">
import { getErrorMessage } from '../../../composables/useAppToast'
import type { VehicleChecklist } from '../../../composables/useVehicles'
import type { ChecklistTemplate } from '../../../composables/useChecklistTemplates'

definePageMeta({
  title: 'Histórico de checklists'
})

const route = useRoute('checklists-vehicles-vehicleId')
const toast = useAppToast()
const vehicleId = computed(() => Number(route.params.vehicleId))
const manualRefreshing = ref(false)
const confirmOpen = ref(false)
const confirmLoading = ref(false)
const checklistPendingDeletion = ref<VehicleChecklist | null>(null)

const templateSelectorOpen = ref(false)
const templateSelectorSubmitting = ref(false)
const selectedTemplateId = ref<number | undefined>()

const { data: vehicle, status: vehicleStatus } = useVehicle(vehicleId)
const {
  data: checklists,
  status,
  error,
  refresh
} = useChecklistHistory(vehicleId)
const { templates, status: templatesStatus } = useChecklistTemplates()
const { createChecklist, deleteChecklist } = useChecklistActions()

const isLoading = computed(
  () =>
    (vehicleStatus.value === 'pending' && !vehicle.value)
    || (status.value === 'pending'
      && (!checklists.value
        || (checklists.value as VehicleChecklist[]).length === 0))
)
const checklistList = computed(() =>
  Array.isArray(checklists.value)
    ? (checklists.value as VehicleChecklist[])
    : []
)
const hasChecklists = computed(() => checklistList.value.length > 0)

const templateOptions = computed(() =>
  (Array.isArray(templates.value) ? templates.value : []).map(
    (t: ChecklistTemplate) => ({
      label: t.name,
      value: t.id
    })
  )
)

const openTemplateSelector = () => {
  selectedTemplateId.value = undefined
  templateSelectorOpen.value = true
}

const handleStartChecklist = async () => {
  if (!selectedTemplateId.value || templateSelectorSubmitting.value) return

  templateSelectorSubmitting.value = true

  try {
    const checklist = await createChecklist(
      vehicleId.value,
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

const openChecklist = async (checklist: VehicleChecklist) => {
  await navigateTo({
    name: 'checklists-checklistId',
    params: { checklistId: String(checklist.id) }
  })
}

const askDelete = (checklist: VehicleChecklist) => {
  checklistPendingDeletion.value = checklist
  confirmOpen.value = true
}

const handleDelete = async () => {
  if (!checklistPendingDeletion.value) return

  confirmLoading.value = true

  try {
    await deleteChecklist(checklistPendingDeletion.value.id)
    toast.success({
      title: 'Checklist removido',
      description: 'O checklist foi excluído com sucesso.'
    })
    confirmOpen.value = false
    checklistPendingDeletion.value = null
    await refresh()
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao excluir',
      description: getErrorMessage(err, 'Não foi possível excluir o checklist.')
    })
  } finally {
    confirmLoading.value = false
  }
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
            Histórico de inspeções
          </h1>
          <p class="max-w-2xl text-sm leading-6 text-toned">
            Todas as inspeções realizadas para este veículo.
          </p>
        </div>

        <div class="flex gap-2 self-start sm:self-auto">
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-refresh-cw"
            size="xl"
            aria-label="Atualizar"
            :loading="manualRefreshing"
            @click="handleRefresh"
          />
          <UButton
            color="primary"
            icon="i-lucide-plus"
            @click="openTemplateSelector"
          >
            Novo checklist
          </UButton>
        </div>
      </div>
    </section>

    <AppLoading
      v-if="isLoading || manualRefreshing"
      title="Carregando histórico"
      description="Buscando as inspeções realizadas para este veículo."
    />

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Falha ao carregar histórico"
      description="Atualize a página ou tente novamente em instantes."
    />

    <template v-else>
      <!-- Vehicle info -->
      <UCard
        v-if="vehicle"
        class="rounded-2xl border-default"
      >
        <div class="flex flex-wrap items-center gap-4">
          <div
            class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-default bg-[linear-gradient(180deg,rgba(0,193,106,0.14)_0%,rgba(0,161,85,0.08)_100%)]"
          >
            <UIcon
              name="i-lucide-car-front"
              class="size-6 text-primary"
            />
          </div>

          <div class="space-y-1">
            <p class="text-lg font-semibold text-highlighted">
              {{ formatLicensePlate(vehicle.license_plate) }}
            </p>
            <p class="text-sm text-toned">
              {{ vehicle.model || 'Modelo não informado' }}
              <template v-if="vehicle.model_year">
                · {{ vehicle.model_year }}
              </template>
            </p>
            <p
              v-if="vehicle.customer"
              class="text-sm text-toned"
            >
              {{ vehicle.customer.name }}
            </p>
          </div>

          <div class="ml-auto">
            <NuxtLink
              :to="{
                name: 'vehicles-vehicleId',
                params: { vehicleId: String(vehicleId) }
              }"
              class="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <UIcon
                name="i-lucide-external-link"
                class="size-4"
              />
              Detalhes do veículo
            </NuxtLink>
          </div>
        </div>
      </UCard>

      <!-- Checklist list -->
      <AppEmpty
        v-if="!hasChecklists"
        title="Nenhuma inspeção registrada"
        description="Clique em 'Novo checklist' para iniciar a primeira inspeção deste veículo."
        icon="i-lucide-clipboard-check"
      >
        <div class="pt-2">
          <UButton
            color="primary"
            icon="i-lucide-plus"
            @click="openTemplateSelector"
          >
            Novo checklist
          </UButton>
        </div>
      </AppEmpty>

      <div
        v-else
        class="grid gap-3"
      >
        <UCard
          v-for="checklist in checklistList"
          :key="checklist.id"
          class="w-full rounded-2xl border-default"
        >
          <div
            class="space-y-4 cursor-pointer rounded-xl transition-colors hover:bg-muted/20"
            role="button"
            tabindex="0"
            @click="openChecklist(checklist)"
            @keydown.enter.prevent="openChecklist(checklist)"
            @keydown.space.prevent="openChecklist(checklist)"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0 space-y-2">
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
                    {{ checklist.is_completed ? 'Concluído' : 'Em andamento' }}
                  </span>
                </div>

                <div class="flex flex-wrap gap-3 text-xs text-toned">
                  <span
                    v-if="checklist.executed_by"
                    class="inline-flex items-center gap-1.5"
                  >
                    <UIcon
                      name="i-lucide-user"
                      class="size-3.5"
                    />
                    {{ checklist.executed_by.name }}
                  </span>
                  <span class="inline-flex items-center gap-1.5">
                    <UIcon
                      name="i-lucide-calendar"
                      class="size-3.5"
                    />
                    <NuxtTime
                      :datetime="checklist.created_at"
                      year="numeric"
                      month="2-digit"
                      day="2-digit"
                      hour="2-digit"
                      minute="2-digit"
                    />
                  </span>
                  <span
                    v-if="checklist.stats"
                    class="inline-flex items-center gap-1.5"
                  >
                    <UIcon
                      name="i-lucide-list-checks"
                      class="size-3.5"
                    />
                    {{ checklist.stats.completed }}/{{ checklist.stats.total }}
                    itens
                  </span>
                </div>
              </div>
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
                <span>Abrir inspeção</span>
              </div>

              <UButton
                color="error"
                variant="soft"
                icon="i-lucide-trash"
                @click.stop="askDelete(checklist)"
              >
                Excluir
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
    </template>

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

    <AppConfirm
      v-model:open="confirmOpen"
      title="Excluir checklist"
      :description="
        checklistPendingDeletion
          ? `Você está removendo '${checklistPendingDeletion.name}'. Esta ação não pode ser desfeita.`
          : 'Esta ação não pode ser desfeita.'
      "
      confirm-label="Excluir"
      :loading="confirmLoading"
      @confirm="handleDelete"
    />
  </div>
</template>
