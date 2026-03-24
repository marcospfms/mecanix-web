<script setup lang="ts">
definePageMeta({
  layout: 'auth'
});

onMounted(async () => {
  await navigateTo('/login', { replace: true });
});
</script>

<template>
  <UCard class="rounded-3xl">
    <div class="flex flex-col items-center justify-center gap-3 py-10">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
      <p class="text-sm text-toned">Redirecionando para o login...</p>
    </div>
  </UCard>
</template>
