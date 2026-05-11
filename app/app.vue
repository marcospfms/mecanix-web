<script setup lang="ts">
useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  htmlAttrs: { lang: 'pt-BR' }
})

useSeoMeta({
  titleTemplate: title =>
    title ? `${title} · Mecanix Client` : 'Mecanix Client',
  description:
    'App web para owners gerenciarem a operação da oficina via navegador.'
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
