<script setup lang="ts">
const auth = useAuth();
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <p class="text-xs font-semibold uppercase tracking-[0.32em] text-primary">
        Dashboard
      </p>
      <h1 class="text-3xl font-semibold tracking-tight text-highlighted">
        Olá, {{ auth.user.value?.name?.split(' ')[0] }}
      </h1>
      <p class="max-w-2xl text-sm leading-6 text-toned">
        A fundação de autenticação do Mecanix Client está pronta. O próximo passo é conectar os
        módulos operacionais do owner à API do mecanix-core.
      </p>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <UCard v-for="item in [
          { label: 'Empresas', value: 'Em breve', icon: 'i-lucide-building-2' },
          { label: 'Clientes', value: 'Em breve', icon: 'i-lucide-users' },
          { label: 'Veículos', value: 'Em breve', icon: 'i-lucide-car-front' },
          { label: 'Checklists', value: 'Em breve', icon: 'i-lucide-clipboard-check' }
      ]" :key="item.label">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm text-toned">{{ item.label }}</p>
            <p class="mt-2 text-lg font-semibold text-highlighted">{{ item.value }}</p>
          </div>
          <div class="rounded-xl border border-default bg-muted/30 p-2">
            <UIcon :name="item.icon" class="size-5 text-primary" />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
