<script setup lang="ts">
import { getErrorMessage } from '../composables/useAppToast'

definePageMeta({
  layout: 'auth'
})

const auth = useAuth()
const runtimeConfig = useRuntimeConfig()
const googleButton = ref<HTMLDivElement | null>(null)
const errorMessage = ref<string | null>(null)
const googleLoading = ref(true)
const devLoginEnabled = ref(false)
const devLoginOpen = ref(false)
const devUsers = ref<DevLoginUser[]>([])
const devQuery = ref('')
const devLoading = ref(false)
const devLoginUserId = ref<number | null>(null)

type PublicSettings = {
  allow_open_registration: boolean;
  push_token_check_hours?: number;
  environment?: string;
  dev_login_enabled?: boolean;
}

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
}

type DevLoginUser = {
  id: number;
  name: string;
  email: string | null;
  username: string | null;
  is_employee: boolean;
  employee_role: 'manager' | 'technician' | 'custom' | null;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: Record<string, unknown>
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const handleCredential = async (response: { credential?: string }) => {
  const credential = response.credential

  if (!credential) {
    errorMessage.value = 'Não foi possível validar sua conta Google.'
    googleLoading.value = false
    return
  }

  errorMessage.value = null

  try {
    await auth.loginWithGoogle({ id_token: credential })
    await navigateTo({ name: 'index' })
  } catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, 'Falha ao autenticar.')
    googleLoading.value = false
  }
}

const ensureGoogleScript = async () => {
  if (window.google?.accounts?.id) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-identity="true"]'
    )

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () => reject(new Error('google-script-error')),
        {
          once: true
        }
      )
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.googleIdentity = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('google-script-error'))
    document.head.appendChild(script)
  })
}

const loadDevUsers = async () => {
  devLoading.value = true
  errorMessage.value = null

  try {
    const response = await useApiFetch<ApiEnvelope<DevLoginUser[]>>(
      `/dev-login/users${devQuery.value.trim() ? `?q=${encodeURIComponent(devQuery.value.trim())}` : ''}`
    )
    devUsers.value = response.data
  } catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, 'Falha ao carregar usuários de teste.')
  } finally {
    devLoading.value = false
  }
}

const openDevLogin = async () => {
  devLoginOpen.value = true
  await loadDevUsers()
}

const loginAsDevUser = async (user: DevLoginUser) => {
  devLoginUserId.value = user.id
  errorMessage.value = null

  try {
    await auth.loginWithDevUser(user.id)
    devLoginOpen.value = false
    await navigateTo({ name: 'index' })
  } catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, 'Falha ao entrar como usuário de teste.')
  } finally {
    devLoginUserId.value = null
  }
}

onMounted(async () => {
  googleLoading.value = true

  try {
    const response = await useApiFetch<ApiEnvelope<PublicSettings>>('/settings/public')
    devLoginEnabled.value = Boolean(response.data.dev_login_enabled)
  } catch {
    devLoginEnabled.value = false
  }

  if (!runtimeConfig.public.googleClientId) {
    errorMessage.value = 'O acesso não está configurado neste ambiente.'
    googleLoading.value = false
    return
  }

  try {
    await ensureGoogleScript()

    if (!window.google?.accounts?.id || !googleButton.value) {
      throw new Error('google-unavailable')
    }

    window.google.accounts.id.initialize({
      client_id: runtimeConfig.public.googleClientId,
      callback: handleCredential
    })

    googleButton.value.innerHTML = ''
    window.google.accounts.id.renderButton(googleButton.value, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      width: Math.min(320, Math.max(220, googleButton.value.clientWidth || 0)),
      text: 'signin_with',
      shape: 'pill'
    })
    googleLoading.value = false
  } catch {
    errorMessage.value = 'Não foi possível carregar o acesso neste momento.'
    googleLoading.value = false
  }
})
</script>

<template>
  <div class="w-full min-w-0 space-y-4 sm:space-y-6">
    <UCard
      class="w-full min-w-0 overflow-hidden rounded-[1.75rem] border-default bg-default/92 shadow-lg sm:shadow-xl"
    >
      <template #header>
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p
                class="text-xs font-semibold uppercase tracking-[0.32em] text-primary"
              >
                Acesso
              </p>
              <h2
                class="mt-2 text-[1.65rem] font-semibold tracking-tight text-highlighted sm:text-2xl"
              >
                Entre na sua conta
              </h2>
            </div>

            <div class="rounded-2xl bg-primary/10 p-3 text-primary">
              <UIcon
                name="i-lucide-key-round"
                class="size-5"
              />
            </div>
          </div>

          <p class="text-sm leading-6 text-toned">
            Continue de onde parou e acompanhe a oficina com mais contexto e
            organização.
          </p>
        </div>
      </template>

      <div class="space-y-4 sm:space-y-5">
        <UAlert
          v-if="errorMessage"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          :description="errorMessage"
        />

        <div
          class="rounded-[1.5rem] border border-default bg-muted/55 p-4 sm:p-5"
        >
          <div class="mb-4 flex items-start gap-3 sm:mb-5">
            <div class="rounded-xl bg-primary/10 p-2 text-primary">
              <UIcon
                name="i-lucide-badge-check"
                class="size-4.5"
              />
            </div>
            <div class="space-y-0.5">
              <p class="text-sm font-semibold text-highlighted">
                Entrada protegida
              </p>
              <p class="text-xs leading-5 text-toned">
                Use a mesma conta cadastrada no app.
              </p>
            </div>
          </div>

          <div class="flex flex-col items-center overflow-hidden rounded-2xl">
            <div
              v-if="googleLoading"
              class="flex h-11 items-center justify-center rounded-full border border-default bg-default"
            >
              <UIcon
                name="i-lucide-loader-circle"
                class="size-5 animate-spin text-primary"
              />
            </div>
            <div
              ref="googleButton"
              class="flex justify-center"
            />
          </div>
        </div>

        <UButton
          v-if="devLoginEnabled"
          block
          variant="soft"
          color="primary"
          icon="i-lucide-terminal"
          label="Entrar como usuário de teste"
          @click="openDevLogin"
        />

        <div class="hidden gap-2.5 text-sm text-toned sm:grid">
          <div
            class="flex items-center gap-3 rounded-2xl border border-default bg-elevated/80 px-4 py-3"
          >
            <div class="rounded-xl bg-primary/10 p-2 text-primary">
              <UIcon
                name="i-lucide-panel-top"
                class="size-4"
              />
            </div>
            <span>Ambiente pensado para acompanhamento e gestão.</span>
          </div>

          <div
            class="flex items-center gap-3 rounded-2xl border border-default bg-elevated/80 px-4 py-3"
          >
            <div class="rounded-xl bg-primary/10 p-2 text-primary">
              <UIcon
                name="i-lucide-refresh-cw"
                class="size-4"
              />
            </div>
            <span>Tudo permanece na mesma base operacional do Mecanix.</span>
          </div>
        </div>
      </div>
    </UCard>

    <UModal
      v-model:open="devLoginOpen"
      title="Usuários de teste"
      description="Disponível apenas em desenvolvimento."
    >
      <template #body>
        <div class="space-y-4">
          <div class="flex gap-2">
            <UInput
              v-model="devQuery"
              class="min-w-0 flex-1"
              placeholder="Nome, email ou usuário"
              icon="i-lucide-search"
              @keyup.enter="loadDevUsers"
            />
            <UButton
              icon="i-lucide-search"
              :loading="devLoading"
              @click="loadDevUsers"
            />
          </div>

          <div
            v-if="devLoading"
            class="flex min-h-32 items-center justify-center"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="size-6 animate-spin text-primary"
            />
          </div>

          <div
            v-else
            class="max-h-[420px] space-y-2 overflow-y-auto"
          >
            <button
              v-for="item in devUsers"
              :key="item.id"
              type="button"
              class="flex w-full items-center gap-3 rounded-xl border border-default bg-default px-3 py-3 text-left transition hover:border-primary hover:bg-primary/5"
              :disabled="devLoginUserId !== null"
              @click="loginAsDevUser(item)"
            >
              <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {{ item.name.slice(0, 1) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-highlighted">
                  {{ item.name }}
                </p>
                <p class="truncate text-xs text-toned">
                  {{ item.email || item.username || 'Sem identificador' }}
                </p>
              </div>
              <UBadge
                :color="item.is_employee ? 'warning' : 'primary'"
                variant="soft"
              >
                {{ item.is_employee ? 'Funcionário' : 'Cliente' }}
              </UBadge>
              <UIcon
                v-if="devLoginUserId === item.id"
                name="i-lucide-loader-circle"
                class="size-4 animate-spin text-primary"
              />
            </button>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
