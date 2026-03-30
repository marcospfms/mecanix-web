<script setup lang="ts">
import { getErrorMessage } from '../composables/useAppToast'
import {
  subscriptionStatusColor,
  subscriptionStatusLabel
} from '../composables/useSubscription'

definePageMeta({
  title: 'Perfil'
})

const auth = useAuth()
const toast = useAppToast()
const colorMode = useColorMode()
const { updateInfo } = useProfile()
const { data: subscriptionData, status: subscriptionStatus } = useSubscription()

// ─── Info form ───────────────────────────────────────────────────────
const infoSubmitting = ref(false)
const infoName = ref(auth.user.value?.name ?? '')
const infoEmail = ref(auth.user.value?.email ?? '')
const infoErrors = ref<{ name?: string; email?: string }>({})

watch(
  () => auth.user.value,
  (user) => {
    if (user) {
      infoName.value = user.name
      infoEmail.value = user.email ?? ''
    }
  }
)

const validateInfo = () => {
  const errors: typeof infoErrors.value = {}
  if (!infoName.value.trim()) {
    errors.name = 'Informe o seu nome.'
  }
  if (
    infoEmail.value.trim()
    && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(infoEmail.value.trim())
  ) {
    errors.email = 'Informe um e-mail válido.'
  }
  infoErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleSaveInfo = async () => {
  if (!validateInfo() || infoSubmitting.value) return
  infoSubmitting.value = true
  try {
    await updateInfo(infoName.value, infoEmail.value)
    toast.success({
      title: 'Dados atualizados',
      description: 'Seu perfil foi salvo com sucesso.'
    })
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao salvar',
      description: getErrorMessage(err, 'Não foi possível atualizar os dados.')
    })
  } finally {
    infoSubmitting.value = false
  }
}

// ─── Logout confirm ──────────────────────────────────────────────────
const logoutOpen = ref(false)
const logoutLoading = ref(false)

const handleLogout = async () => {
  logoutLoading.value = true
  try {
    await auth.logout()
  } finally {
    logoutLoading.value = false
  }
}

// ─── Aparência ───────────────────────────────────────────────────────
const colorModeOptions = [
  { value: 'system', label: 'Sistema', icon: 'i-lucide-monitor' },
  { value: 'light', label: 'Claro', icon: 'i-lucide-sun' },
  { value: 'dark', label: 'Escuro', icon: 'i-lucide-moon' }
] as const

const userInitials = computed(() => {
  const name = auth.user.value?.name ?? ''
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
})

const usageRows = [
  { key: 'companies' as const, label: 'Empresas' },
  { key: 'customers' as const, label: 'Clientes' },
  { key: 'vehicles' as const, label: 'Veículos' },
  { key: 'checklist_templates' as const, label: 'Modelos de checklist' },
  { key: 'checklists_per_month' as const, label: 'Checklists no mês' }
]
</script>

<template>
  <div class="space-y-5 sm:space-y-6">
    <!-- Cabeçalho -->
    <section class="space-y-3">
      <p class="text-xs font-semibold uppercase tracking-[0.32em] text-primary">
        Conta
      </p>
      <h1 class="text-3xl font-semibold tracking-tight text-highlighted">
        Perfil
      </h1>
    </section>

    <ClientOnly>
      <div class="space-y-5">
        <!-- Resumo do perfil -->
        <UCard class="rounded-2xl border-default">
          <div class="flex items-center gap-4">
            <div
              class="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-default bg-[linear-gradient(180deg,rgba(0,193,106,0.14)_0%,rgba(0,161,85,0.08)_100%)]"
            >
              <span
                class="text-xl font-semibold uppercase tracking-[0.06em] text-primary"
              >
                {{ userInitials }}
              </span>
            </div>
            <div class="min-w-0">
              <p class="truncate text-lg font-semibold text-highlighted">
                {{ auth.user.value?.name }}
              </p>
              <p class="truncate text-sm text-toned">
                {{ auth.user.value?.email || 'Sem e-mail' }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- Dados pessoais -->
        <UCard class="rounded-2xl border-default">
          <div class="space-y-5">
            <div class="flex items-center gap-3">
              <div
                class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"
              >
                <UIcon
                  name="i-lucide-user"
                  class="size-4 text-primary"
                />
              </div>
              <h2 class="text-base font-semibold text-highlighted">
                Dados pessoais
              </h2>
            </div>

            <div class="space-y-4">
              <div class="space-y-2">
                <label
                  class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary"
                >
                  Nome
                </label>
                <UInput
                  v-model="infoName"
                  placeholder="Seu nome completo"
                  size="xl"
                  class="w-full"
                  :maxlength="255"
                  @update:model-value="infoErrors.name = undefined"
                />
                <p
                  v-if="infoErrors.name"
                  class="text-sm text-error"
                >
                  {{ infoErrors.name }}
                </p>
              </div>

              <div class="space-y-2">
                <label
                  class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary"
                >
                  E-mail
                </label>
                <UInput
                  v-model="infoEmail"
                  type="email"
                  placeholder="seu@email.com"
                  size="xl"
                  class="w-full"
                  :maxlength="255"
                  @update:model-value="infoErrors.email = undefined"
                />
                <p
                  v-if="infoErrors.email"
                  class="text-sm text-error"
                >
                  {{ infoErrors.email }}
                </p>
              </div>
            </div>

            <div class="flex justify-end">
              <UButton
                color="primary"
                :loading="infoSubmitting"
                icon="i-lucide-save"
                @click="handleSaveInfo"
              >
                Salvar dados
              </UButton>
            </div>
          </div>
        </UCard>

        <!-- Aparência -->
        <UCard class="rounded-2xl border-default">
          <div class="space-y-4">
            <div class="flex items-center gap-3">
              <div
                class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"
              >
                <UIcon
                  name="i-lucide-palette"
                  class="size-4 text-primary"
                />
              </div>
              <h2 class="text-base font-semibold text-highlighted">
                Aparência
              </h2>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="opt in colorModeOptions"
                :key="opt.value"
                type="button"
                class="flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-sm font-medium transition-colors"
                :class="
                  colorMode.preference === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-default bg-muted/20 text-toned hover:border-primary/40 hover:text-highlighted'
                "
                @click="colorMode.preference = opt.value"
              >
                <UIcon
                  :name="opt.icon"
                  class="size-5"
                />
                {{ opt.label }}
              </button>
            </div>
          </div>
        </UCard>

        <!-- Assinatura -->
        <UCard class="rounded-2xl border-default">
          <div class="space-y-5">
            <div class="flex items-center gap-3">
              <div
                class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"
              >
                <UIcon
                  name="i-lucide-crown"
                  class="size-4 text-primary"
                />
              </div>
              <h2 class="text-base font-semibold text-highlighted">
                Assinatura
              </h2>
            </div>

            <div
              v-if="subscriptionStatus === 'pending' && !subscriptionData"
              class="flex items-center gap-2 text-sm text-toned"
            >
              <UIcon
                name="i-lucide-loader"
                class="size-4 animate-spin"
              />
              <span>Carregando assinatura…</span>
            </div>

            <div
              v-else-if="!subscriptionData"
              class="text-sm text-toned"
            >
              Nenhuma assinatura ativa encontrada.
            </div>

            <template v-else>
              <div class="flex flex-wrap items-center gap-3">
                <p class="text-lg font-semibold text-highlighted">
                  {{ subscriptionData.subscription.plan_name }}
                </p>
                <UBadge
                  :color="
                    subscriptionStatusColor(
                      subscriptionData.subscription.status
                    )
                  "
                  variant="soft"
                  size="sm"
                >
                  {{
                    subscriptionStatusLabel(
                      subscriptionData.subscription.status
                    )
                  }}
                </UBadge>
                <UBadge
                  v-if="subscriptionData.subscription.auto_renews"
                  color="neutral"
                  variant="soft"
                  size="sm"
                  icon="i-lucide-refresh-cw"
                >
                  Renovação automática
                </UBadge>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <div>
                  <p
                    class="text-xs font-semibold uppercase tracking-[0.24em] text-primary"
                  >
                    Início
                  </p>
                  <p class="mt-1 text-sm text-highlighted">
                    <NuxtTime
                      :datetime="subscriptionData.subscription.starts_at"
                      year="numeric"
                      month="2-digit"
                      day="2-digit"
                    />
                  </p>
                </div>
                <div
                  v-if="
                    subscriptionData.subscription.renews_at
                      || subscriptionData.subscription.ends_at
                  "
                >
                  <p
                    class="text-xs font-semibold uppercase tracking-[0.24em] text-primary"
                  >
                    {{
                      subscriptionData.subscription.renews_at
                        ? 'Próxima renovação'
                        : 'Expira em'
                    }}
                  </p>
                  <p class="mt-1 text-sm text-highlighted">
                    <NuxtTime
                      :datetime="
                        (subscriptionData.subscription.renews_at
                          ?? subscriptionData.subscription.ends_at)!
                      "
                      year="numeric"
                      month="2-digit"
                      day="2-digit"
                    />
                  </p>
                </div>
              </div>

              <div class="space-y-3">
                <p
                  class="text-xs font-semibold uppercase tracking-[0.24em] text-primary"
                >
                  Uso em
                  {{
                    subscriptionData.period.month.toString().padStart(2, '0')
                  }}/{{ subscriptionData.period.year }}
                </p>
                <div class="space-y-2">
                  <div
                    v-for="row in usageRows"
                    :key="row.key"
                    class="flex items-center gap-3"
                  >
                    <p class="w-44 shrink-0 text-sm text-toned">
                      {{ row.label }}
                    </p>
                    <div class="flex flex-1 items-center gap-2">
                      <div
                        v-if="!subscriptionData.usage[row.key].is_unlimited"
                        class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                      >
                        <div
                          class="h-full rounded-full bg-primary transition-all"
                          :style="`width: ${subscriptionData.usage[row.key].limit ? Math.min(100, Math.round((subscriptionData.usage[row.key].used / subscriptionData.usage[row.key].limit!) * 100)) : 0}%`"
                        />
                      </div>
                      <p class="shrink-0 text-sm font-medium text-highlighted">
                        {{
                          subscriptionData.usage[row.key].is_unlimited
                            ? '∞'
                            : `${subscriptionData.usage[row.key].used} / ${subscriptionData.usage[row.key].limit}`
                        }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <UAlert
              color="neutral"
              variant="soft"
              icon="i-lucide-smartphone"
              title="Gerenciamento pelo app"
              description="Para alterar ou cancelar sua assinatura, acesse o app Mecanix no Android."
            />
          </div>
        </UCard>

        <!-- Logout -->
        <UCard class="rounded-2xl border-default">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-highlighted">
                Encerrar sessão
              </p>
              <p class="text-xs text-toned">
                Você será desconectado e redirecionado para o login.
              </p>
            </div>
            <UButton
              color="error"
              variant="soft"
              icon="i-lucide-log-out"
              @click="logoutOpen = true"
            >
              Sair
            </UButton>
          </div>
        </UCard>
      </div>

      <template #fallback>
        <AppLoading
          title="Carregando perfil"
          description="Aguarde um instante."
        />
      </template>
    </ClientOnly>

    <!-- Confirm logout -->
    <AppConfirm
      v-model:open="logoutOpen"
      title="Sair da conta"
      description="Você será desconectado e redirecionado para a tela de login."
      confirm-label="Sair"
      color="error"
      :loading="logoutLoading"
      @confirm="handleLogout"
    />
  </div>
</template>
