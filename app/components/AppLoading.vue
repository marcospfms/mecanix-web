<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    inline?: boolean;
  }>(),
  {
    title: 'Carregando',
    description: 'Aguarde enquanto os dados são preparados.',
    inline: false
  }
)
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-3 text-center"
    :class="
      inline
        ? 'py-2'
        : 'rounded-2xl border border-default bg-default px-6 py-10'
    "
  >
    <UIcon
      name="i-lucide-loader-circle"
      class="size-6 animate-spin text-primary"
    />
    <div class="space-y-1">
      <p class="text-sm font-semibold text-highlighted">
        {{ title }}
      </p>
      <p class="text-sm text-toned">
        {{ description }}
      </p>
    </div>
  </div>
</template>
