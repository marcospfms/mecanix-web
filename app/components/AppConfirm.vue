<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false });

withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
    color?: 'error' | 'primary' | 'neutral' | 'success' | 'warning';
  }>(),
  {
    title: 'Confirmar ação',
    description: 'Revise esta ação antes de continuar.',
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    loading: false,
    color: 'error'
  }
);

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const handleCancel = () => {
  open.value = false;
  emit('cancel');
};

const handleConfirm = () => {
  emit('confirm');
};
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="description"
    :close="false"
  >
    <template #content>
      <div class="space-y-6 p-6">
        <div class="space-y-2">
          <p class="text-lg font-semibold text-highlighted">{{ title }}</p>
          <p class="text-sm leading-6 text-toned">{{ description }}</p>
        </div>

        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <UButton
            color="neutral"
            variant="soft"
            :label="cancelLabel"
            @click="handleCancel"
          />
          <UButton
            :color="color"
            variant="solid"
            :loading="loading"
            :label="confirmLabel"
            @click="handleConfirm"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
