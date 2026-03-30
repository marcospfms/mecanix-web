<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    icon?: string;
  }>(),
  {
    description: 'Não há dados para exibir neste momento.',
    icon: 'i-lucide-inbox'
  }
)
</script>

<template>
  <div class="rounded-2xl border border-default bg-default px-6 py-10">
    <div class="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
      <div class="rounded-2xl bg-primary/10 p-3 text-primary">
        <UIcon
          :name="icon"
          class="size-6"
        />
      </div>

      <div class="space-y-1">
        <p class="text-base font-semibold text-highlighted">
          {{ title }}
        </p>
        <p class="text-sm leading-6 text-toned">
          {{ description }}
        </p>
      </div>

      <slot />
    </div>
  </div>
</template>
