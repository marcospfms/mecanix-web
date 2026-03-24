<script setup lang="ts">
const auth = useAuth();

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
          <AppLogo class="h-7 w-auto" />
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
            <p class="text-sm font-medium text-highlighted">{{ auth.user.value?.name }}</p>
            <p class="mt-1 text-xs text-toned">{{ auth.user.value?.email }}</p>
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
            <AppLogo class="h-6 w-auto" />
            <div class="flex items-center gap-2">
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
  </div>
</template>
