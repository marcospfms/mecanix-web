<script setup lang="ts">
definePageMeta({
  layout: 'auth'
});

const auth = useAuth();
const runtimeConfig = useRuntimeConfig();
const googleButton = ref<HTMLDivElement | null>(null);
const errorMessage = ref<string | null>(null);

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
    return;
  }

  errorMessage.value = null;

  try {
    await auth.loginWithGoogle({ id_token: credential });
    await navigateTo('/');
  } catch (error: any) {
    errorMessage.value = error?.data?.message ?? error?.message ?? 'Falha ao autenticar.';
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
  if (!runtimeConfig.public.googleClientId) {
    errorMessage.value = 'O acesso não está configurado neste ambiente.';
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
      width: 320,
      text: 'signin_with',
      shape: 'pill'
    });
  } catch {
    errorMessage.value = 'Não foi possível carregar o acesso neste momento.';
  }
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-center lg:hidden">
      <div class="rounded-3xl border border-default bg-default px-5 py-4">
        <img
          src="/branding/logo-transparent.png"
          alt="Mecanix"
          class="h-10 w-auto"
        />
      </div>
    </div>

    <UCard class="rounded-[2rem] border-default bg-default shadow-xl">
      <template #header>
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.32em] text-primary">
                Acesso
              </p>
              <h2 class="mt-2 text-2xl font-semibold tracking-tight text-highlighted">
                Entre na sua conta
              </h2>
            </div>

            <div class="rounded-2xl bg-primary/10 p-3 text-primary">
              <UIcon name="i-lucide-key-round" class="size-5" />
            </div>
          </div>

          <p class="text-sm leading-6 text-toned">
            Continue de onde parou e acompanhe a operação da oficina com uma visão mais ampla.
          </p>
        </div>
      </template>

      <div class="space-y-5">
        <UAlert
          v-if="errorMessage"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          :description="errorMessage"
        />

        <div class="rounded-[1.5rem] border border-default bg-muted/30 p-5">
          <div class="mb-5 flex items-start gap-3">
            <div class="rounded-2xl bg-primary/10 p-2.5 text-primary">
              <UIcon name="i-lucide-badge-check" class="size-5" />
            </div>
            <div class="space-y-1">
              <p class="text-sm font-semibold text-highlighted">Entrada protegida</p>
              <p class="text-sm leading-6 text-toned">
                Use a mesma conta do Mecanix para continuar com segurança e manter seus dados
                sincronizados.
              </p>
            </div>
          </div>

          <div class="flex justify-center">
            <div ref="googleButton" />
          </div>
        </div>

        <div class="grid gap-3 text-sm text-toned">
          <div class="flex items-center gap-3 rounded-2xl border border-default bg-muted/20 px-4 py-3">
            <div class="rounded-xl bg-primary/10 p-2 text-primary">
              <UIcon name="i-lucide-panel-top" class="size-4" />
            </div>
            <span>Ambiente pensado para acompanhamento e gestão.</span>
          </div>

          <div class="flex items-center gap-3 rounded-2xl border border-default bg-muted/20 px-4 py-3">
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
