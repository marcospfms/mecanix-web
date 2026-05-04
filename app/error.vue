<script setup lang="ts">
const props = defineProps<{
  error: {
    statusCode?: number;
    statusMessage?: string;
    message?: string;
  };
}>()

const title = computed(() => {
  if (props.error?.statusCode === 404) return 'Página não encontrada'
  if (props.error?.statusCode === 401) return 'Acesso não autorizado'
  return 'Algo saiu do esperado'
})

const description = computed(
  () =>
    props.error?.statusMessage
    || props.error?.message
    || 'Tente voltar para o início e repetir a ação.'
)

const handleClear = async () => {
  await clearError({ redirect: '/' })
}
</script>

<template>
  <!-- Sem segundo UApp: o app já envolve tudo em app.vue; duplicar quebra o contexto de slots do Vue. -->
  <div class="flex min-h-screen items-center justify-center bg-default px-4 text-default">
    <div class="w-full max-w-lg">
      <UCard class="rounded-3xl">
        <div class="space-y-6 p-2">
          <div class="space-y-3 text-center">
            <div
              class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"
            >
              <UIcon
                name="i-lucide-triangle-alert"
                class="size-7"
              />
            </div>
            <div class="space-y-1">
              <p
                class="text-xs font-semibold uppercase tracking-[0.32em] text-primary"
              >
                Erro {{ error?.statusCode ?? 500 }}
              </p>
              <h1
                class="text-2xl font-semibold tracking-tight text-highlighted"
              >
                {{ title }}
              </h1>
              <p class="text-sm leading-6 text-toned">
                {{ description }}
              </p>
            </div>
          </div>

          <div class="flex justify-center">
            <UButton
              color="primary"
              variant="solid"
              icon="i-lucide-house"
              label="Voltar ao início"
              @click="handleClear"
            />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
