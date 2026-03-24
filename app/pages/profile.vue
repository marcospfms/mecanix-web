<script setup lang="ts">
const auth = useAuth();
</script>

<template>
  <UCard>
    <div class="space-y-4">
      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-[0.32em] text-primary">Perfil</p>
        <h1 class="text-2xl font-semibold text-highlighted">{{ auth.user.value?.name }}</h1>
        <p class="text-sm text-toned">{{ auth.user.value?.email }}</p>
      </div>

      <div class="flex items-center justify-between rounded-2xl border border-default bg-muted/30 px-4 py-3">
        <span class="text-sm text-toned">Sessão atual</span>
        <UButton color="neutral" variant="soft" icon="i-lucide-log-out" @click="auth.logout">
          Sair
        </UButton>
      </div>
    </div>
  </UCard>
</template>
