<script setup lang="ts">
import type { ChecklistItem } from '../../composables/useChecklistTemplates';
import {
  useChecklistItems,
  useChecklistTemplate,
  useChecklistTemplateActions,
  useVehicleTypes
} from '../../composables/useChecklistTemplates';

definePageMeta({
  title: 'Itens do template'
});

type ItemFormMode = 'create' | 'edit';

const route = useRoute('checklists-templateId');
const toast = useAppToast();
const templateId = computed(() => Number(route.params.templateId));
const manualRefreshing = ref(false);

const { data: template, status, error, refresh } = useChecklistTemplate(templateId);
const {
  items,
  status: itemsStatus,
  error: itemsError,
  refresh: refreshItems,
  createItem,
  updateItem,
  deleteItem
} = useChecklistItems(templateId);
const { types } = useVehicleTypes();
const { deleteTemplate } = useChecklistTemplateActions();

const itemFormOpen = ref(false);
const itemFormMode = ref<ItemFormMode>('create');
const itemFormSubmitting = ref(false);
const itemPendingDeletion = ref<ChecklistItem | null>(null);
const itemConfirmOpen = ref(false);
const itemConfirmLoading = ref(false);
const templateConfirmOpen = ref(false);
const templateConfirmLoading = ref(false);

const editingItem = ref<ChecklistItem | null>(null);
const itemName = ref('');
const itemDescription = ref('');
const orderIndex = ref('');
const isCompletable = ref(false);
const allowsMultipleResponses = ref(false);
const isRequired = ref(false);
const options = ref<Array<{ id?: number; label: string; order_index: number }>>([]);
const itemFormErrors = ref<{ name?: string; options?: string }>({});

const isLoading = computed(
  () =>
    (status.value === 'pending' && !template.value) ||
    (itemsStatus.value === 'pending' && items.value.length === 0)
);
const isDataRefreshing = computed(() => manualRefreshing.value && !!template.value);
const hasItems = computed(() => items.value.length > 0);

const itemFormTitle = computed(() =>
  itemFormMode.value === 'create' ? 'Novo item' : 'Editar item'
);
const itemFormDescription = computed(() =>
  itemFormMode.value === 'create'
    ? 'Adicione um novo item ao template.'
    : 'Atualize os dados do item selecionado.'
);

const resolveVehicleTypeName = (value?: number | null) => {
  if (!value) {
    return 'Todos os tipos';
  }

  return types.value?.find((type) => type.id === value)?.name ?? 'Tipo não encontrado';
};

const resetItemForm = () => {
  itemName.value = '';
  itemDescription.value = '';
  orderIndex.value = '';
  isCompletable.value = false;
  allowsMultipleResponses.value = false;
  isRequired.value = false;
  options.value = [];
  editingItem.value = null;
  itemFormErrors.value = {};
};

const addOption = () => {
  options.value.push({
    label: '',
    order_index: options.value.length
  });
};

const removeOption = (index: number) => {
  options.value.splice(index, 1);
  options.value = options.value.map((option, position) => ({
    ...option,
    order_index: position
  }));
};

const openCreate = () => {
  resetItemForm();
  itemFormMode.value = 'create';
  itemFormOpen.value = true;
};

const openEdit = (item: ChecklistItem) => {
  resetItemForm();
  itemFormMode.value = 'edit';
  editingItem.value = item;
  itemName.value = item.name;
  itemDescription.value = item.description ?? '';
  orderIndex.value = String(item.order_index);
  isCompletable.value = item.is_completable;
  allowsMultipleResponses.value = item.allows_multiple_responses;
  isRequired.value = item.is_required;
  options.value = (item.options ?? []).map((option) => ({
    id: option.id,
    label: option.label,
    order_index: option.order_index
  }));
  itemFormOpen.value = true;
};

const validateItemForm = () => {
  const errors: { name?: string; options?: string } = {};

  if (!itemName.value.trim()) {
    errors.name = 'Informe o nome do item.';
  }

  const hasBlankOption = options.value.some((option) => option.label.trim().length === 0);
  if (hasBlankOption) {
    errors.options = 'Preencha ou remova as opções vazias.';
  }

  itemFormErrors.value = errors;
  return Object.keys(errors).length === 0;
};

const handleItemSubmit = async () => {
  if (!validateItemForm() || itemFormSubmitting.value) {
    return;
  }

  itemFormSubmitting.value = true;

  try {
    const payload = {
      name: itemName.value,
      description: itemDescription.value,
      order_index: orderIndex.value.trim() ? Number(orderIndex.value) : null,
      is_completable: isCompletable.value,
      allows_multiple_responses: allowsMultipleResponses.value,
      is_required: isRequired.value,
      options: options.value.map((option, index) => ({
        label: option.label,
        order_index: index
      }))
    };

    if (itemFormMode.value === 'create') {
      await createItem(payload);
      toast.success({
        title: 'Item criado',
        description: 'O novo item foi adicionado ao template.'
      });
    } else if (editingItem.value) {
      await updateItem(editingItem.value.id, payload);
      toast.success({
        title: 'Item atualizado',
        description: 'Os dados do item foram salvos.'
      });
    }

    itemFormOpen.value = false;
    resetItemForm();
  } catch (err: any) {
    toast.error({
      title: 'Falha ao salvar',
      description: err?.data?.message ?? err?.message ?? 'Não foi possível salvar o item.'
    });
  } finally {
    itemFormSubmitting.value = false;
  }
};

const askItemDelete = (item: ChecklistItem) => {
  itemPendingDeletion.value = item;
  itemConfirmOpen.value = true;
};

const handleItemDelete = async () => {
  if (!itemPendingDeletion.value) return;

  itemConfirmLoading.value = true;

  try {
    await deleteItem(itemPendingDeletion.value.id);
    toast.success({
      title: 'Item removido',
      description: 'O item foi excluído com sucesso.'
    });
    itemConfirmOpen.value = false;
    itemPendingDeletion.value = null;
  } catch (err: any) {
    toast.error({
      title: 'Falha ao excluir',
      description: err?.data?.message ?? err?.message ?? 'Não foi possível excluir o item.'
    });
  } finally {
    itemConfirmLoading.value = false;
  }
};

const handleTemplateDelete = async () => {
  if (!template.value) return;

  templateConfirmLoading.value = true;

  try {
    await deleteTemplate(template.value.id);
    toast.success({
      title: 'Template removido',
      description: 'O template foi excluído com sucesso.'
    });
    templateConfirmOpen.value = false;
    await navigateTo({ name: 'checklists' });
  } catch (err: any) {
    toast.error({
      title: 'Falha ao excluir',
      description: err?.data?.message ?? err?.message ?? 'Não foi possível excluir o template.'
    });
  } finally {
    templateConfirmLoading.value = false;
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
      refreshItems(),
      new Promise((resolve) => setTimeout(resolve, 1000))
    ]);
  } catch {
    toast.error({
      title: 'Falha ao atualizar',
      description: 'Não foi possível recarregar o template.'
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
            {{ template?.name || 'Itens do template' }}
          </h1>
          <p class="max-w-2xl text-sm leading-6 text-toned">
            Gerencie os itens e as opções de resposta deste template de checklist.
          </p>
        </div>

        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-refresh-cw"
          size="xl"
          aria-label="Atualizar template"
          @click="handleRefresh"
        />
      </div>
    </section>

    <AppLoading
      v-if="isLoading || isDataRefreshing"
      title="Carregando template"
      description="Buscando os dados do template e seus itens."
    />

    <UAlert
      v-else-if="error || itemsError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Falha ao carregar template"
      description="Atualize a página ou tente novamente em instantes."
    />

    <template v-else-if="template">
      <UCard class="rounded-2xl border-default">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {{ resolveVehicleTypeName(template.vehicle_type_id) }}
              </span>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Nome</p>
                <p class="mt-1 text-base text-highlighted">{{ template.name }}</p>
              </div>

              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Atualizado em</p>
                <p class="mt-1 text-base text-highlighted">
                  <NuxtTime
                    :datetime="template.updated_at"
                    year="numeric"
                    month="2-digit"
                    day="2-digit"
                    hour="2-digit"
                    minute="2-digit"
                  />
                </p>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-2 sm:justify-end">
            <UButton color="primary" icon="i-lucide-plus" @click="openCreate">
              Novo item
            </UButton>
            <UButton color="error" variant="soft" icon="i-lucide-trash" @click="templateConfirmOpen = true">
              Excluir template
            </UButton>
          </div>
        </div>
      </UCard>

      <section class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-highlighted">Itens do template</h2>
        </div>

        <AppEmpty
          v-if="!hasItems"
          title="Nenhum item cadastrado"
          description="Adicione o primeiro item para começar a estruturar este template."
          icon="i-lucide-list-checks"
        >
          <div class="pt-2">
            <UButton color="primary" icon="i-lucide-plus" @click="openCreate">
              Criar primeiro item
            </UButton>
          </div>
        </AppEmpty>

        <div v-else class="grid gap-3">
          <UCard
            v-for="item in items"
            :key="item.id"
            class="rounded-2xl border-default"
          >
            <div class="space-y-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div class="space-y-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded-full border border-default px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-toned">
                      #{{ item.order_index }}
                    </span>
                    <p class="text-base font-semibold text-highlighted">{{ item.name }}</p>
                  </div>

                  <p v-if="item.description" class="text-sm leading-6 text-toned">
                    {{ item.description }}
                  </p>

                  <div class="flex flex-wrap gap-2 text-xs">
                    <span
                      class="rounded-full px-2.5 py-1 font-semibold uppercase tracking-[0.14em]"
                      :class="item.is_required ? 'bg-error/10 text-error' : 'bg-muted text-toned'"
                    >
                      {{ item.is_required ? 'Obrigatório' : 'Opcional' }}
                    </span>
                    <span
                      class="rounded-full px-2.5 py-1 font-semibold uppercase tracking-[0.14em]"
                      :class="item.is_completable ? 'bg-primary/10 text-primary' : 'bg-muted text-toned'"
                    >
                      {{ item.is_completable ? 'Completável' : 'Sem check' }}
                    </span>
                    <span
                      class="rounded-full px-2.5 py-1 font-semibold uppercase tracking-[0.14em]"
                      :class="item.allows_multiple_responses ? 'bg-warning/10 text-warning' : 'bg-muted text-toned'"
                    >
                      {{ item.allows_multiple_responses ? 'Múltipla escolha' : 'Resposta única' }}
                    </span>
                  </div>
                </div>

                <div class="flex gap-2 sm:justify-end">
                  <UButton
                    color="neutral"
                    variant="soft"
                    icon="i-lucide-pencil"
                    @click="openEdit(item)"
                  >
                    Editar
                  </UButton>
                  <UButton
                    color="error"
                    variant="soft"
                    icon="i-lucide-trash"
                    @click="askItemDelete(item)"
                  >
                    Excluir
                  </UButton>
                </div>
              </div>

              <div v-if="(item.options?.length ?? 0) > 0" class="rounded-2xl border border-default bg-muted/20 px-4 py-3">
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Opções de resposta</p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <span
                    v-for="option in item.options"
                    :key="option.id"
                    class="rounded-full border border-default bg-default px-3 py-1.5 text-sm text-toned"
                  >
                    {{ option.label }}
                  </span>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </section>
    </template>

    <USlideover
      v-model:open="itemFormOpen"
      side="right"
      :title="itemFormTitle"
      :description="itemFormDescription"
      :ui="{ body: 'px-3 py-4 sm:px-4 sm:py-5', footer: 'justify-end px-3 sm:px-4' }"
    >
      <template #body>
        <div class="space-y-4">
          <div class="space-y-2">
            <label class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Nome
            </label>
            <UInput
              v-model="itemName"
              placeholder="Ex.: Freios dianteiros"
              size="xl"
              class="w-full"
              :maxlength="255"
            />
            <p v-if="itemFormErrors.name" class="text-sm text-error">
              {{ itemFormErrors.name }}
            </p>
          </div>

          <div class="space-y-2">
            <label class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Descrição
            </label>
            <UTextarea
              v-model="itemDescription"
              placeholder="Opcional"
              class="w-full"
              :rows="4"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Ordem
            </label>
            <UInput
              v-model="orderIndex"
              placeholder="Ex.: 0"
              size="xl"
              class="w-full"
              inputmode="numeric"
            />
          </div>

          <div class="space-y-3 rounded-2xl border border-default bg-muted/20 p-4">
            <label class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Comportamento
            </label>

            <label class="flex items-center gap-3 text-sm text-highlighted">
              <input v-model="isRequired" type="checkbox" class="size-4 rounded border-default" />
              Item obrigatório
            </label>

            <label class="flex items-center gap-3 text-sm text-highlighted">
              <input v-model="isCompletable" type="checkbox" class="size-4 rounded border-default" />
              Permite marcação de conclusão
            </label>

            <label class="flex items-center gap-3 text-sm text-highlighted">
              <input
                v-model="allowsMultipleResponses"
                type="checkbox"
                class="size-4 rounded border-default"
              />
              Permite múltiplas respostas
            </label>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <label class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Opções de resposta
              </label>
              <UButton
                color="neutral"
                variant="soft"
                size="sm"
                icon="i-lucide-plus"
                @click="addOption"
              >
                Adicionar opção
              </UButton>
            </div>

            <p v-if="itemFormErrors.options" class="text-sm text-error">
              {{ itemFormErrors.options }}
            </p>

            <div v-if="options.length === 0" class="rounded-2xl border border-dashed border-default px-4 py-6 text-sm text-toned">
              Sem opções configuradas. Use isso para itens com resposta fechada.
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="(option, index) in options"
                :key="`${index}-${option.id ?? 'new'}`"
                class="rounded-2xl border border-default bg-muted/20 p-4"
              >
                <div class="flex items-start gap-3">
                  <UInput
                    v-model="option.label"
                    placeholder="Ex.: Aprovado"
                    size="lg"
                    class="flex-1"
                  />
                  <UButton
                    color="error"
                    variant="soft"
                    icon="i-lucide-trash"
                    @click="removeOption(index)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <UButton color="neutral" variant="ghost" @click="itemFormOpen = false">
          Cancelar
        </UButton>
        <UButton color="primary" :loading="itemFormSubmitting" @click="handleItemSubmit">
          {{ itemFormMode === 'create' ? 'Criar item' : 'Salvar alterações' }}
        </UButton>
      </template>
    </USlideover>

    <AppConfirm
      v-model:open="itemConfirmOpen"
      title="Excluir item"
      :description="itemPendingDeletion ? `Você está removendo ${itemPendingDeletion.name}. Esta ação não pode ser desfeita.` : 'Esta ação não pode ser desfeita.'"
      confirm-label="Excluir"
      :loading="itemConfirmLoading"
      @confirm="handleItemDelete"
    />

    <AppConfirm
      v-model:open="templateConfirmOpen"
      title="Excluir template"
      :description="template ? `Você está removendo ${template.name}. Esta ação não pode ser desfeita.` : 'Esta ação não pode ser desfeita.'"
      confirm-label="Excluir"
      :loading="templateConfirmLoading"
      @confirm="handleTemplateDelete"
    />
  </div>
</template>
