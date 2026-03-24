<script setup lang="ts">
definePageMeta({
  layout: 'auth'
});

onMounted(async () => {
  await navigateTo('/login', { replace: true });
});
</script>

<template>
  <AppLoading
    title="Redirecionando"
    description="Você será levado para a tela de acesso."
  />
</template>
