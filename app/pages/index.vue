<script setup lang="ts">
import type { SelectItem } from '@nuxt/ui'

definePageMeta({
  title: 'Dashboard'
})

const auth = useAuth()
const toast = useAppToast()
const selectedEmployeeUserId = ref<number | null>(null)
const manualRefreshing = ref(false)

const { data: stats, status, refresh } = useDashboard(selectedEmployeeUserId)

const emptyStats = (): NonNullable<typeof stats.value> => ({
  total_companies: 0,
  total_customers: 0,
  total_vehicles: 0,
  checklists_total: 0,
  checklists_completed: 0,
  checklists_draft: 0,
  checklists_templates: 0,
  checklists_month_total: 0,
  checklists_vehicles_inspected_this_month: 0,
  checklists_completion_rate: 0,
  recent_executions: [],
  checklists_by_employee: [],
  subscription_plan: null,
  subscription_status: null
})

const statsResolved = computed(() => stats.value ?? emptyStats())

const isAuthReady = computed(() => auth.hydrated.value)
const isLoading = computed(() => status.value === 'pending' && !stats.value)
const isRefreshing = computed(
  () => manualRefreshing.value || (status.value === 'pending' && !!stats.value)
)
const isDataRefreshing = computed(() => manualRefreshing.value && !!stats.value)

const firstName = computed(
  () => auth.user.value?.name?.split(' ')[0] ?? 'Equipe'
)

const employeeFilterItems = computed<SelectItem[]>(() => {
  const items: SelectItem[] = [{ label: 'Toda a equipe', value: 'all' }]

  for (const employee of statsResolved.value.checklists_by_employee ?? []) {
    items.push({
      label:
        employee.name ??
        employee.username ??
        `Funcionário #${employee.user_id}`,
      value: String(employee.user_id)
    })
  }

  return items
})

const selectedEmployeeValue = computed({
  get: () =>
    selectedEmployeeUserId.value ? String(selectedEmployeeUserId.value) : 'all',
  set: (value: string) => {
    selectedEmployeeUserId.value = value === 'all' ? null : Number(value)
  }
})

const monthlyCards = computed(() => [
  {
    key: 'checklists',
    label: 'Checklists no mês',
    value: statsResolved.value.checklists_month_total,
    icon: 'i-lucide-clipboard-check'
  },
  {
    key: 'vehicles',
    label: 'Veículos vistoriados',
    value: statsResolved.value.checklists_vehicles_inspected_this_month,
    icon: 'i-lucide-car-front'
  }
])

const summaryCards = computed(() =>
  [
    statsResolved.value.total_companies !== undefined
      ? {
          key: 'companies',
          label: 'Empresas',
          value: statsResolved.value.total_companies,
          icon: 'i-lucide-building-2'
        }
      : null,
    statsResolved.value.total_customers !== undefined
      ? {
          key: 'customers',
          label: 'Clientes',
          value: statsResolved.value.total_customers,
          icon: 'i-lucide-users'
        }
      : null,
    statsResolved.value.total_vehicles !== undefined
      ? {
          key: 'vehicles',
          label: 'Veículos',
          value: statsResolved.value.total_vehicles,
          icon: 'i-lucide-car-front'
        }
      : null,
    statsResolved.value.checklists_templates !== undefined
      ? {
          key: 'templates',
          label: 'Templates',
          value: statsResolved.value.checklists_templates,
          icon: 'i-lucide-layers-3'
        }
      : null
  ].filter((item): item is NonNullable<typeof item> => item !== null)
)

const recentExecutions = computed(
  () => statsResolved.value.recent_executions ?? []
)
const employeeStats = computed(
  () => statsResolved.value.checklists_by_employee ?? []
)
const isEmptyDashboard = computed(() => {
  return (
    (statsResolved.value.total_companies ?? 0) === 0 &&
    (statsResolved.value.total_customers ?? 0) === 0 &&
    (statsResolved.value.total_vehicles ?? 0) === 0 &&
    (statsResolved.value.checklists_templates ?? 0) === 0 &&
    statsResolved.value.checklists_total === 0 &&
    statsResolved.value.checklists_month_total === 0 &&
    statsResolved.value.checklists_vehicles_inspected_this_month === 0 &&
    recentExecutions.value.length === 0 &&
    employeeStats.value.length === 0
  )
})

const progressValue = computed(() =>
  Math.min(Math.max(statsResolved.value.checklists_completion_rate, 0), 100)
)

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
  } catch {
    toast.error({
      title: 'Falha ao atualizar',
      description: 'Não foi possível recarregar o dashboard agora.'
    })
  } finally {
    manualRefreshing.value = false
  }
}
</script>

<template>
  <div class="space-y-5 sm:space-y-6">
    <AppLoading
      v-if="!isAuthReady"
      title="Preparando dashboard"
      description="Aguarde enquanto a sua sessão é carregada."
    />

    <template v-else>
      <section class="space-y-3">
        <p
          class="text-xs font-semibold uppercase tracking-[0.32em] text-primary"
        >
          Dashboard
        </p>
        <div
          class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <div class="space-y-2">
            <h1 class="text-3xl font-semibold tracking-tight text-highlighted">
              Olá, {{ firstName }}
            </h1>
            <p class="max-w-2xl text-sm leading-6 text-toned">
              Acompanhe o ritmo da oficina, os cadastros principais e as últimas
              execuções em um só lugar.
            </p>
          </div>
        </div>
      </section>

      <AppLoading
        v-if="isLoading"
        title="Carregando dashboard"
        description="Buscando o panorama mais recente da operação."
      />

      <AppLoading
        v-else-if="isDataRefreshing"
        title="Atualizando dashboard"
        description="Buscando os dados mais recentes da operação."
      />

      <template v-else>
        <UAlert
          v-if="isEmptyDashboard"
          color="primary"
          variant="soft"
          icon="i-lucide-info"
          title="Dashboard ainda sem dados"
          description="Os indicadores estão zerados porque ainda não existem cadastros ou execuções suficientes para compor o painel."
        />

        <UCard class="rounded-[1.75rem] border-default bg-default">
          <div class="space-y-5">
            <div
              class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
            >
              <div class="space-y-2">
                <p class="text-sm font-medium text-highlighted">
                  Painel do período
                </p>
                <p class="text-sm leading-6 text-toned">
                  Consolidação do mês com foco em volume, inspeções realizadas e
                  ritmo de execução.
                </p>
              </div>

              <div
                v-if="employeeStats.length > 0"
                class="flex w-full items-center gap-2 lg:w-auto"
              >
                <USelect
                  v-model="selectedEmployeeValue"
                  :items="employeeFilterItems"
                  class="flex-1 lg:w-72"
                />
                <UButton
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-refresh-cw"
                  size="xl"
                  aria-label="Atualizar dashboard"
                  :loading="isRefreshing"
                  @click="handleRefresh"
                />
              </div>
              <UButton
                v-else
                color="neutral"
                variant="soft"
                icon="i-lucide-refresh-cw"
                size="xl"
                aria-label="Atualizar dashboard"
                :loading="isRefreshing"
                @click="handleRefresh"
              />
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <div
                v-for="card in monthlyCards"
                :key="card.key"
                class="rounded-2xl border border-default bg-muted/35 p-4"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="space-y-1">
                    <p class="text-sm text-toned">
                      {{ card.label }}
                    </p>
                    <p
                      class="text-2xl font-semibold tracking-tight text-highlighted"
                    >
                      {{ card.value }}
                    </p>
                  </div>

                  <div class="rounded-xl bg-primary/10 p-2 text-primary">
                    <UIcon :name="card.icon" class="size-5" />
                  </div>
                </div>
              </div>
            </div>

            <div class="rounded-2xl border border-default bg-muted/25 p-4">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-medium text-highlighted">
                    Concluídos no período
                  </p>
                  <p class="text-sm text-toned">
                    {{ statsResolved.checklists_completed }}/{{
                      statsResolved.checklists_total
                    }}
                    checklists finalizados
                  </p>
                </div>

                <p class="text-lg font-semibold text-highlighted">
                  {{ progressValue }}%
                </p>
              </div>

              <div class="mt-4 h-2.5 overflow-hidden rounded-full bg-elevated">
                <div
                  class="h-full rounded-full bg-primary transition-all"
                  :style="{ width: `${progressValue}%` }"
                />
              </div>

              <p class="mt-3 text-sm text-toned">
                {{ statsResolved.checklists_draft }} checklist(s) ainda em
                andamento.
              </p>
            </div>
          </div>
        </UCard>

        <section class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold text-highlighted">
              Base operacional
            </h2>
            <p
              v-if="statsResolved.subscription_plan"
              class="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              {{ statsResolved.subscription_plan }}
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <UCard
              v-for="card in summaryCards"
              :key="card.key"
              class="rounded-2xl border-default"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-1">
                  <p class="text-sm text-toned">
                    {{ card.label }}
                  </p>
                  <p
                    class="text-2xl font-semibold tracking-tight text-highlighted"
                  >
                    {{ card.value }}
                  </p>
                </div>

                <div class="rounded-xl bg-muted/60 p-2 text-primary">
                  <UIcon :name="card.icon" class="size-5" />
                </div>
              </div>
            </UCard>
          </div>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg font-semibold text-highlighted">
            Últimas execuções
          </h2>

          <AppEmpty
            v-if="recentExecutions.length === 0"
            title="Sem execuções recentes"
            description="As próximas inspeções concluídas aparecerão aqui."
            icon="i-lucide-clipboard-check"
          />

          <div v-else class="grid gap-3">
            <UCard
              v-for="execution in recentExecutions"
              :key="execution.id"
              class="rounded-2xl border-default"
            >
              <div class="space-y-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="space-y-1">
                    <p class="text-base font-semibold text-highlighted">
                      {{ execution.name }}
                    </p>
                    <p class="text-sm text-toned">
                      {{
                        execution.vehicle?.customer_name ||
                        'Cliente não identificado'
                      }}
                    </p>
                  </div>

                  <span
                    class="rounded-full px-3 py-1 text-xs font-medium"
                    :class="
                      execution.status === 'completed'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-orange-100 text-orange-700'
                    "
                  >
                    {{
                      execution.status === 'completed'
                        ? 'Concluído'
                        : 'Rascunho'
                    }}
                  </span>
                </div>

                <div class="grid gap-3 text-sm text-toned sm:grid-cols-3">
                  <div>
                    <p class="font-medium text-highlighted">Placa</p>
                    <p>{{ execution.vehicle?.license_plate || '-' }}</p>
                  </div>
                  <div>
                    <p class="font-medium text-highlighted">Executado por</p>
                    <p>
                      {{ execution.executed_by?.name || 'Sem responsável' }}
                    </p>
                  </div>
                  <div>
                    <p class="font-medium text-highlighted">Data</p>
                    <NuxtTime
                      :datetime="execution.executed_at ?? execution.created_at"
                      locale="pt-BR"
                      day="2-digit"
                      month="2-digit"
                      year="numeric"
                      hour="2-digit"
                      minute="2-digit"
                    />
                  </div>
                </div>
              </div>
            </UCard>
          </div>
        </section>

        <section v-if="employeeStats.length > 0" class="space-y-3">
          <h2 class="text-lg font-semibold text-highlighted">
            Por funcionário
          </h2>

          <div class="grid gap-3">
            <UCard
              v-for="employee in employeeStats"
              :key="employee.user_id"
              class="rounded-2xl border-default"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="space-y-1">
                  <p class="text-base font-semibold text-highlighted">
                    {{
                      employee.name ||
                      employee.username ||
                      `Funcionário #${employee.user_id}`
                    }}
                  </p>
                  <p class="text-sm text-toned">
                    {{
                      employee.username
                        ? `@${employee.username}`
                        : 'Equipe da operação'
                    }}
                  </p>
                </div>

                <div class="rounded-2xl bg-primary/10 px-4 py-2 text-center">
                  <p
                    class="text-xs font-medium uppercase tracking-[0.2em] text-primary"
                  >
                    Total
                  </p>
                  <p class="text-lg font-semibold text-primary">
                    {{ employee.total }}
                  </p>
                </div>
              </div>
            </UCard>
          </div>
        </section>
      </template>
    </template>
  </div>
</template>
