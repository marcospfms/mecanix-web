<script setup lang="ts">
const auth = useAuth();
const mobileMenuOpen = ref(false);
const runtimeConfig = useRuntimeConfig();
const brandIconSrc = `${runtimeConfig.app.baseURL}branding/icon-transparent-sm.png`;
const userName = computed(() => auth.user.value?.name ?? '');
const userEmail = computed(() => auth.user.value?.email ?? '');

const navigation = [
  { label: 'Dashboard', to: '/', icon: 'i-lucide-layout-dashboard' },
  { label: 'Checklists', to: '/checklists', icon: 'i-lucide-clipboard-check' },
  { label: 'Empresas', to: '/companies', icon: 'i-lucide-building-2' },
  { label: 'Clientes', to: '/customers', icon: 'i-lucide-users' },
  { label: 'Funcionários', to: '/employees', icon: 'i-lucide-user-round-cog' },
  { label: 'Perfil', to: '/profile', icon: 'i-lucide-user-circle-2' }
];
</script>

<template>
  <div class="min-h-screen bg-default">
    <div class="flex min-h-screen">
      <aside class="hidden w-72 shrink-0 border-r border-default bg-muted/30 lg:flex lg:flex-col">
        <div class="border-b border-default px-6 py-5">
          <div class="flex items-center gap-3">
            <img
              :src="brandIconSrc"
              alt="Mecanix"
              class="h-9 w-9 rounded-xl object-contain"
            />
            <span class="text-lg font-semibold tracking-[-0.02em] text-highlighted">Mecanix</span>
          </div>
        </div>

        <nav class="flex-1 px-4 py-5">
          <ul class="space-y-2">
            <li v-for="item in navigation" :key="item.to">
              <UButton
                :to="item.to"
                variant="ghost"
                color="neutral"
                class="w-full justify-start rounded-xl px-3 py-2.5"
                :icon="item.icon"
              >
                {{ item.label }}
              </UButton>
            </li>
          </ul>
        </nav>

        <div class="border-t border-default px-4 py-4">
          <div class="rounded-2xl border border-default bg-default p-4">
            <ClientOnly>
              <div>
                <p class="text-sm font-medium text-highlighted">{{ userName }}</p>
                <p class="mt-1 text-xs text-toned">{{ userEmail }}</p>
              </div>

              <template #fallback>
                <div class="space-y-2">
                  <div class="h-4 w-28 rounded bg-muted" />
                  <div class="h-3 w-40 rounded bg-muted" />
                </div>
              </template>
            </ClientOnly>
            <div class="mt-3 flex items-center justify-between gap-2">
              <UColorModeButton />
              <UButton
                color="neutral"
                variant="soft"
                icon="i-lucide-log-out"
                @click="auth.logout"
              >
                Sair
              </UButton>
            </div>
          </div>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header class="border-b border-default bg-default px-4 py-3 lg:hidden">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <img
                :src="brandIconSrc"
                alt="Mecanix"
                class="h-8 w-8 rounded-lg object-contain"
              />
              <span class="text-base font-semibold tracking-[-0.02em] text-highlighted">Mecanix</span>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-menu"
                @click="mobileMenuOpen = true"
              />
              <UColorModeButton />
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-log-out"
                @click="auth.logout"
              />
            </div>
          </div>
        </header>

        <main class="flex-1">
          <div class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <slot />
          </div>
        </main>
      </div>
    </div>

    <USlideover
      v-model:open="mobileMenuOpen"
      side="left"
      title="Menu de navegação"
      description="Acesse as áreas principais do Mecanix."
    >
      <template #content="{ close }">
        <div class="flex h-full flex-col bg-default">
          <div class="flex items-center justify-between border-b border-default px-4 py-4">
            <div class="flex items-center gap-3">
              <img
                :src="brandIconSrc"
                alt="Mecanix"
                class="h-8 w-8 rounded-lg object-contain"
              />
              <span class="text-base font-semibold tracking-[-0.02em] text-highlighted">Mecanix</span>
            </div>

            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              @click="close()"
            />
          </div>

          <nav class="flex-1 px-3 py-4">
            <ul class="space-y-2">
              <li v-for="item in navigation" :key="item.to">
                <UButton
                  :to="item.to"
                  variant="ghost"
                  color="neutral"
                  class="w-full justify-start rounded-xl px-3 py-2.5"
                  :icon="item.icon"
                  @click="close()"
                >
                  {{ item.label }}
                </UButton>
              </li>
            </ul>
          </nav>

          <div class="border-t border-default px-4 py-4">
            <div class="rounded-2xl border border-default bg-default p-4">
              <ClientOnly>
                <div>
                  <p class="text-sm font-medium text-highlighted">{{ userName }}</p>
                  <p class="mt-1 text-xs text-toned">{{ userEmail }}</p>
                </div>

                <template #fallback>
                  <div class="space-y-2">
                    <div class="h-4 w-28 rounded bg-muted" />
                    <div class="h-3 w-40 rounded bg-muted" />
                  </div>
                </template>
              </ClientOnly>
            </div>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
