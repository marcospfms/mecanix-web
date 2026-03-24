<script setup lang="ts">
definePageMeta({
  layout: 'auth'
});

const auth = useAuth();
const runtimeConfig = useRuntimeConfig();
const googleButton = ref<HTMLDivElement | null>(null);
const errorMessage = ref<string | null>(null);
const googleLoading = ref(true);

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const handleCredential = async (response: { credential?: string }) => {
  const credential = response.credential;

  if (!credential) {
    errorMessage.value = 'Não foi possível validar sua conta Google.';
    googleLoading.value = false;
    return;
  }

  errorMessage.value = null;

  try {
    await auth.loginWithGoogle({ id_token: credential });
    await navigateTo('/');
  } catch (error: any) {
    errorMessage.value = error?.data?.message ?? error?.message ?? 'Falha ao autenticar.';
    googleLoading.value = false;
  }
};

const ensureGoogleScript = async () => {
  if (window.google?.accounts?.id) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-identity="true"]'
    );

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('google-script-error')), {
        once: true
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('google-script-error'));
    document.head.appendChild(script);
  });
};

onMounted(async () => {
  googleLoading.value = true;

  if (!runtimeConfig.public.googleClientId) {
    errorMessage.value = 'O acesso não está configurado neste ambiente.';
    googleLoading.value = false;
    return;
  }

  try {
    await ensureGoogleScript();

    if (!window.google?.accounts?.id || !googleButton.value) {
      throw new Error('google-unavailable');
    }

    window.google.accounts.id.initialize({
      client_id: runtimeConfig.public.googleClientId,
      callback: handleCredential
    });

    googleButton.value.innerHTML = '';
    window.google.accounts.id.renderButton(googleButton.value, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      width: Math.min(320, Math.max(220, googleButton.value.clientWidth || 0)),
      text: 'signin_with',
      shape: 'pill'
    });
    googleLoading.value = false;
  } catch {
    errorMessage.value = 'Não foi possível carregar o acesso neste momento.';
    googleLoading.value = false;
  }
});
</script>

<template>
  <div class="w-full min-w-0 space-y-4 sm:space-y-6">
    <UCard class="w-full min-w-0 overflow-hidden rounded-[1.75rem] border-default bg-default/92 shadow-lg sm:rounded-[2rem] sm:shadow-xl">
      <template #header>
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.32em] text-primary">
                Acesso
              </p>
              <h2 class="mt-2 text-[1.65rem] font-semibold tracking-tight text-highlighted sm:text-2xl">
                Entre na sua conta
              </h2>
            </div>

            <div class="rounded-2xl bg-primary/10 p-3 text-primary">
              <UIcon name="i-lucide-key-round" class="size-5" />
            </div>
          </div>

          <p class="text-sm leading-6 text-toned">
            Continue de onde parou e acompanhe a oficina com mais contexto e organização.
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

        <div class="rounded-[1.5rem] border border-default bg-muted/55 p-4 sm:p-5">
          <div class="mb-4 flex items-start gap-3 sm:mb-5">
            <div class="rounded-xl bg-primary/10 p-2 text-primary">
              <UIcon name="i-lucide-badge-check" class="size-4.5" />
            </div>
            <div class="space-y-0.5">
              <p class="text-sm font-semibold text-highlighted">Entrada protegida</p>
              <p class="text-xs leading-5 text-toned">
                Use a mesma conta cadastrada no app.
              </p>
            </div>
          </div>

          <div class="flex flex-col items-center overflow-hidden rounded-2xl">
            <div
              v-if="googleLoading"
              class="flex h-11 w-[220px] items-center justify-center rounded-full border border-default bg-default"
            >
              <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-primary" />
            </div>
            <div ref="googleButton" class="flex justify-center" />
          </div>
        </div>

        <div class="hidden gap-2.5 text-sm text-toned sm:grid">
          <div class="flex items-center gap-3 rounded-2xl border border-default bg-elevated/80 px-4 py-3">
            <div class="rounded-xl bg-primary/10 p-2 text-primary">
              <UIcon name="i-lucide-panel-top" class="size-4" />
            </div>
            <span>Ambiente pensado para acompanhamento e gestão.</span>
          </div>

          <div class="flex items-center gap-3 rounded-2xl border border-default bg-elevated/80 px-4 py-3">
            <div class="rounded-xl bg-primary/10 p-2 text-primary">
              <UIcon name="i-lucide-refresh-cw" class="size-4" />
            </div>
            <span>Tudo permanece na mesma base operacional do Mecanix.</span>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
