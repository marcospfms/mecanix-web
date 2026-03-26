<script setup lang="ts">
import type { ChecklistTemplate } from '../../composables/useChecklistTemplates';
import { useChecklistTemplates, useVehicleTypes } from '../../composables/useChecklistTemplates';

definePageMeta({
  title: 'Templates de checklist'
});

type FormMode = 'create' | 'edit';

const toast = useAppToast();
const manualRefreshing = ref(false);
const {
  search,
  templates,
  status,
  error,
  refresh,
  createTemplate,
  updateTemplate,
  deleteTemplate
} = useChecklistTemplates();
const { types } = useVehicleTypes();

const formOpen = ref(false);
const formMode = ref<FormMode>('create');
const formSubmitting = ref(false);
const confirmOpen = ref(false);
const confirmLoading = ref(false);
const templatePendingDeletion = ref<ChecklistTemplate | null>(null);
const editingTemplate = ref<ChecklistTemplate | null>(null);

const name = ref('');
const vehicleTypeId = ref<number | undefined>();
const formErrors = ref<{ name?: string }>({});

const isLoading = computed(() => status.value === 'pending' && templates.value.length === 0);
const isListRefreshing = computed(() => manualRefreshing.value);
const hasTemplates = computed(() => templates.value.length > 0);
const formTitle = computed(() =>
  formMode.value === 'create' ? 'Novo template' : 'Editar template'
);
const formDescription = computed(() =>
  formMode.value === 'create'
    ? 'Crie um novo template para padronizar as inspeções.'
    : 'Atualize o nome e o tipo de veículo do template.'
);
const vehicleTypeOptions = computed(() => [
  { label: 'Todos os tipos', value: undefined },
  ...((Array.isArray(types.value) ? types.value : []).map((type) => ({
    label: type.name,
    value: type.id
  })))
]);

const resolveVehicleTypeName = (value?: number | null) => {
  if (!value) {
    return 'Todos os tipos';
  }

  return types.value?.find((type) => type.id === value)?.name ?? 'Tipo não encontrado';
};

const resetForm = () => {
  name.value = '';
  vehicleTypeId.value = undefined;
  editingTemplate.value = null;
  formErrors.value = {};
};

const openCreate = () => {
  resetForm();
  formMode.value = 'create';
  formOpen.value = true;
};

const openEdit = (template: ChecklistTemplate) => {
  resetForm();
  formMode.value = 'edit';
  editingTemplate.value = template;
  name.value = template.name;
  vehicleTypeId.value = template.vehicle_type_id ?? undefined;
  formOpen.value = true;
};

const openDetails = async (template: ChecklistTemplate) => {
  await navigateTo({
    name: 'checklists-templateId',
    params: { templateId: String(template.id) }
  });
};

const validateForm = () => {
  const errors: { name?: string } = {};

  if (!name.value.trim()) {
    errors.name = 'Informe o nome do template.';
  }

  formErrors.value = errors;
  return Object.keys(errors).length === 0;
};

const handleSubmit = async () => {
  if (!validateForm() || formSubmitting.value) {
    return;
  }

  formSubmitting.value = true;

  try {
    if (formMode.value === 'create') {
      const created = await createTemplate({
        name: name.value,
        vehicle_type_id: vehicleTypeId.value ?? null
      });

      toast.success({
        title: 'Template criado',
        description: 'O novo template foi adicionado com sucesso.'
      });

      formOpen.value = false;
      resetForm();

      await navigateTo({
        name: 'checklists-templateId',
        params: { templateId: String(created.id) }
      });
      return;
    }

    if (editingTemplate.value) {
      await updateTemplate(editingTemplate.value.id, {
        name: name.value,
        vehicle_type_id: vehicleTypeId.value ?? null
      });

      toast.success({
        title: 'Template atualizado',
        description: 'Os dados do template foram salvos.'
      });
    }

    formOpen.value = false;
    resetForm();
  } catch (err: any) {
    toast.error({
      title: 'Falha ao salvar',
      description: err?.data?.message ?? err?.message ?? 'Não foi possível salvar o template.'
    });
  } finally {
    formSubmitting.value = false;
  }
};

const askDelete = (template: ChecklistTemplate) => {
  templatePendingDeletion.value = template;
  confirmOpen.value = true;
};

const handleDelete = async () => {
  if (!templatePendingDeletion.value) return;

  confirmLoading.value = true;

  try {
    await deleteTemplate(templatePendingDeletion.value.id);
    toast.success({
      title: 'Template removido',
      description: 'O template foi excluído com sucesso.'
    });
    confirmOpen.value = false;
    templatePendingDeletion.value = null;
  } catch (err: any) {
    toast.error({
      title: 'Falha ao excluir',
      description: err?.data?.message ?? err?.message ?? 'Não foi possível excluir o template.'
    });
  } finally {
    confirmLoading.value = false;
  }
};

const handleRefresh = async () => {
  if (manualRefreshing.value) {
    return;
  }

  manualRefreshing.value = true;

  try {
    await Promise.all([
      refresh(),
      new Promise((resolve) => setTimeout(resolve, 1000))
    ]);
  } catch (err: any) {
    toast.error({
      title: 'Falha ao atualizar',
      description: err?.data?.message ?? err?.message ?? 'Não foi possível atualizar a lista.'
    });
  } finally {
    manualRefreshing.value = false;
  }
};
</script>

<template>
  <div class="space-y-5 sm:space-y-6">
    <section class="space-y-3">
      <p class="text-xs font-semibold uppercase tracking-[0.32em] text-primary">Checklists</p>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="space-y-2">
          <h1 class="text-3xl font-semibold tracking-tight text-highlighted">
            Templates de checklist
          </h1>
          <p class="max-w-2xl text-sm leading-6 text-toned">
            Estruture os modelos de inspeção usados pela operação e mantenha os itens prontos
            para execução no app.
          </p>
        </div>

        <UButton color="primary" icon="i-lucide-plus" class="self-start sm:self-auto" @click="openCreate">
          Novo template
        </UButton>
      </div>
    </section>

    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <UInput
          v-model="search"
          placeholder="Buscar por nome do template"
          icon="i-lucide-search"
          size="xl"
          class="flex-1"
        >
          <template v-if="search" #trailing>
            <UButton
              color="neutral"
              variant="link"
              size="sm"
              icon="i-lucide-circle-x"
              aria-label="Limpar busca"
              @click="search = ''"
            />
          </template>
        </UInput>

        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-refresh-cw"
          size="xl"
          aria-label="Atualizar templates"
          @click="handleRefresh"
        />
      </div>

      <AppLoading
        v-if="isLoading || isListRefreshing"
        title="Carregando templates"
        description="Buscando os templates de checklist da sua operação."
      />

      <UAlert
        v-else-if="error"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="Falha ao carregar templates"
        description="Atualize a página ou tente novamente em instantes."
      />

      <AppEmpty
        v-else-if="!hasTemplates"
        title="Nenhum template cadastrado"
        description="Adicione o primeiro template para começar a padronizar as inspeções."
        icon="i-lucide-clipboard-list"
      >
        <div class="pt-2">
          <UButton color="primary" icon="i-lucide-plus" @click="openCreate">
            Criar primeiro template
          </UButton>
        </div>
      </AppEmpty>

      <div v-else class="grid gap-3">
        <UCard
          v-for="template in templates"
          :key="template.id"
          class="w-full rounded-2xl border-default"
        >
          <div
            class="space-y-4 cursor-pointer rounded-xl transition-colors hover:bg-muted/20"
            role="button"
            tabindex="0"
            @click="openDetails(template)"
            @keydown.enter.prevent="openDetails(template)"
            @keydown.space.prevent="openDetails(template)"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex min-w-0 items-start gap-4">
                <div class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-default bg-[linear-gradient(180deg,rgba(0,193,106,0.14)_0%,rgba(0,161,85,0.08)_100%)]">
                  <UIcon name="i-lucide-clipboard-list" class="size-6 text-primary" />
                </div>

                <div class="min-w-0 space-y-2">
                  <div class="flex min-w-0 flex-wrap items-center gap-2">
                    <p class="truncate text-base font-semibold text-highlighted">{{ template.name }}</p>
                    <span class="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      {{ resolveVehicleTypeName(template.vehicle_type_id) }}
                    </span>
                  </div>

                  <p class="text-sm text-toned">
                    Atualizado em
                    <NuxtTime
                      :datetime="template.updated_at"
                      year="numeric"
                      month="2-digit"
                      day="2-digit"
                    />
                  </p>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between gap-3 border-t border-default/70 pt-3">
              <div class="inline-flex items-center gap-2 text-sm font-medium text-primary">
                <UIcon name="i-lucide-panel-top" class="size-4" />
                <span>Ver itens do template</span>
              </div>

              <div class="flex gap-2 sm:justify-end">
                <UButton
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-pencil"
                  @click.stop="openEdit(template)"
                >
                  Editar
                </UButton>
                <UButton
                  color="error"
                  variant="soft"
                  icon="i-lucide-trash"
                  @click.stop="askDelete(template)"
                >
                  Excluir
                </UButton>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <USlideover
      v-model:open="formOpen"
      side="right"
      :title="formTitle"
      :description="formDescription"
      :ui="{ body: 'px-3 py-4 sm:px-4 sm:py-5', footer: 'justify-end px-3 sm:px-4' }"
    >
      <template #body>
        <div class="space-y-4">
          <div class="space-y-2">
            <label class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Nome
            </label>
            <UInput
              v-model="name"
              placeholder="Ex.: Checklist de entrega"
              size="xl"
              class="w-full"
              :maxlength="255"
            />
            <p v-if="formErrors.name" class="text-sm text-error">
              {{ formErrors.name }}
            </p>
          </div>

          <div class="space-y-2">
            <label class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Tipo de veículo
            </label>
            <USelect
              v-model="vehicleTypeId"
              :items="vehicleTypeOptions"
              size="xl"
              class="w-full"
            />
          </div>
        </div>
      </template>

      <template #footer>
        <UButton color="neutral" variant="ghost" @click="formOpen = false">
          Cancelar
        </UButton>
        <UButton color="primary" :loading="formSubmitting" @click="handleSubmit">
          {{ formMode === 'create' ? 'Criar template' : 'Salvar alterações' }}
        </UButton>
      </template>
    </USlideover>

    <AppConfirm
      v-model:open="confirmOpen"
      title="Excluir template"
      :description="templatePendingDeletion ? `Você está removendo ${templatePendingDeletion.name}. Esta ação não pode ser desfeita.` : 'Esta ação não pode ser desfeita.'"
      confirm-label="Excluir"
      :loading="confirmLoading"
      @confirm="handleDelete"
    />
  </div>
</template>
