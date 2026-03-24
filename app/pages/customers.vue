<script setup lang="ts">
import type { Customer } from '../composables/useCustomers';

definePageMeta({
  title: 'Clientes'
});

type FormMode = 'create' | 'edit';

const toast = useAppToast();
const manualRefreshing = ref(false);
const {
  search,
  customers,
  status,
  error,
  refresh,
  createCustomer,
  updateCustomer,
  deleteCustomer
} = useCustomers();

const formOpen = ref(false);
const formMode = ref<FormMode>('create');
const formSubmitting = ref(false);
const confirmOpen = ref(false);
const confirmLoading = ref(false);
const customerPendingDeletion = ref<Customer | null>(null);

const editingCustomer = ref<Customer | null>(null);
const name = ref('');
const taxId = ref('');
const phone = ref('');
const email = ref('');
const formErrors = ref<{ name?: string; tax_id?: string; phone?: string; email?: string }>({});

const isLoading = computed(() => status.value === 'pending' && customers.value.length === 0);
const hasCustomers = computed(() => customers.value.length > 0);
const formTitle = computed(() =>
  formMode.value === 'create' ? 'Novo cliente' : 'Editar cliente'
);
const formDescription = computed(() =>
  formMode.value === 'create'
    ? 'Cadastre um novo cliente para a operação.'
    : 'Atualize os dados do cliente selecionado.'
);

const isListRefreshing = computed(() => manualRefreshing.value);
const taxIdDigitsCount = computed(() => taxId.value.replace(/\D/g, '').length);
const phoneDigitsCount = computed(() => phone.value.replace(/\D/g, '').length);

const resetForm = () => {
  name.value = '';
  taxId.value = '';
  phone.value = '';
  email.value = '';
  editingCustomer.value = null;
  formErrors.value = {};
};

const openCreate = () => {
  resetForm();
  formMode.value = 'create';
  formOpen.value = true;
};

const openEdit = (customer: Customer) => {
  resetForm();
  formMode.value = 'edit';
  editingCustomer.value = customer;
  name.value = customer.name;
  taxId.value = formatTaxId(customer.tax_id);
  phone.value = customer.phone ? formatBrPhone(customer.phone) : '';
  email.value = customer.email ?? '';
  formOpen.value = true;
};

const openDetails = async (customer: Customer) => {
  await navigateTo({ path: `/customers/${customer.id}` });
};

const validateForm = () => {
  const errors: { name?: string; tax_id?: string; phone?: string; email?: string } = {};
  const taxDigits = taxId.value.replace(/\D/g, '');
  const phoneDigits = phone.value.replace(/\D/g, '');

  if (!name.value.trim()) {
    errors.name = 'Informe o nome do cliente.';
  }

  if (!(taxDigits.length === 11 || taxDigits.length === 14)) {
    errors.tax_id = 'Informe um CPF ou CNPJ válido.';
  }

  if (phoneDigits && phoneDigits.length < 10) {
    errors.phone = 'Informe um telefone com DDD válido.';
  }

  if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    errors.email = 'Informe um e-mail válido.';
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
      const created = await createCustomer({
        name: name.value,
        tax_id: taxId.value,
        phone: phone.value,
        email: email.value
      });

      toast.success({
        title: 'Cliente criado',
        description: 'O novo cliente foi adicionado com sucesso.'
      });

      formOpen.value = false;
      resetForm();
      await navigateTo({ path: `/customers/${created.id}` });
      return;
    }

    if (editingCustomer.value) {
      await updateCustomer(editingCustomer.value.id, {
        name: name.value,
        tax_id: taxId.value,
        phone: phone.value,
        email: email.value
      });

      toast.success({
        title: 'Cliente atualizado',
        description: 'Os dados do cliente foram salvos.'
      });
    }

    formOpen.value = false;
    resetForm();
  } catch (err: any) {
    toast.error({
      title: 'Falha ao salvar',
      description: err?.data?.message ?? err?.message ?? 'Não foi possível salvar o cliente.'
    });
  } finally {
    formSubmitting.value = false;
  }
};

const askDelete = (customer: Customer) => {
  customerPendingDeletion.value = customer;
  confirmOpen.value = true;
};

const handleDelete = async () => {
  if (!customerPendingDeletion.value) return;

  confirmLoading.value = true;

  try {
    await deleteCustomer(customerPendingDeletion.value.id);
    toast.success({
      title: 'Cliente removido',
      description: 'O cliente foi excluído com sucesso.'
    });
    confirmOpen.value = false;
    customerPendingDeletion.value = null;
  } catch (err: any) {
    toast.error({
      title: 'Falha ao excluir',
      description: err?.data?.message ?? err?.message ?? 'Não foi possível excluir o cliente.'
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
      <p class="text-xs font-semibold uppercase tracking-[0.32em] text-primary">
        Clientes
      </p>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="space-y-2">
          <h1 class="text-3xl font-semibold tracking-tight text-highlighted">
            Cadastro de clientes
          </h1>
          <p class="max-w-2xl text-sm leading-6 text-toned">
            Organize sua base de clientes, mantenha contatos à mão e acompanhe os veículos
            vinculados a cada cadastro.
          </p>
        </div>

        <UButton color="primary" icon="i-lucide-plus" @click="openCreate">
          Novo cliente
        </UButton>
      </div>
    </section>

    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <UInput
          v-model="search"
          placeholder="Buscar por nome, documento, telefone ou e-mail"
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
          aria-label="Atualizar clientes"
          @click="handleRefresh"
        />
      </div>

      <AppLoading
        v-if="isLoading || isListRefreshing"
        title="Carregando clientes"
        description="Buscando os cadastros da sua operação."
      />

      <UAlert
        v-else-if="error"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="Falha ao carregar clientes"
        description="Atualize a página ou tente novamente em instantes."
      />

      <AppEmpty
        v-else-if="!hasCustomers"
        title="Nenhum cliente cadastrado"
        description="Adicione o primeiro cliente para começar a organizar sua carteira."
        icon="i-lucide-users"
      >
        <div class="pt-2">
          <UButton color="primary" icon="i-lucide-plus" @click="openCreate">
            Criar primeiro cliente
          </UButton>
        </div>
      </AppEmpty>

      <div v-else class="grid gap-3">
        <UCard
          v-for="customer in customers"
          :key="customer.id"
          class="w-full rounded-2xl border-default"
        >
          <div class="flex flex-col gap-4">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-4">
                <div class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-default bg-muted/30">
                  <span class="text-base font-semibold uppercase tracking-[0.08em] text-primary">
                    {{ customer.name.slice(0, 2) }}
                  </span>
                </div>

                <div class="space-y-1">
                  <p class="text-base font-semibold text-highlighted">{{ customer.name }}</p>
                  <p class="text-sm text-toned">{{ formatTaxId(customer.tax_id) }}</p>
                </div>
              </div>

              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-chevron-right"
                aria-label="Abrir cliente"
                @click="openDetails(customer)"
              />
            </div>

            <div class="grid gap-3 text-sm text-toned sm:grid-cols-2">
              <div>
                <p class="font-medium text-highlighted">Telefone</p>
                <p>{{ formatBrPhone(customer.phone) }}</p>
              </div>
              <div>
                <p class="font-medium text-highlighted">E-mail</p>
                <p>{{ customer.email || '-' }}</p>
              </div>
            </div>

            <div class="flex gap-2 sm:justify-end">
              <UButton
                color="neutral"
                variant="soft"
                icon="i-lucide-pencil"
                @click="openEdit(customer)"
              >
                Editar
              </UButton>
              <UButton
                color="error"
                variant="soft"
                icon="i-lucide-trash"
                @click="askDelete(customer)"
              >
                Excluir
              </UButton>
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
        <div class="space-y-5">
          <div class="space-y-2">
            <label class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary">Nome</label>
            <UInput
              v-model="name"
              placeholder="Nome do cliente"
              size="xl"
              class="w-full"
              :maxlength="255"
              @update:model-value="formErrors.name = undefined"
            />
            <p v-if="formErrors.name" class="text-sm text-error">{{ formErrors.name }}</p>
          </div>

          <div class="space-y-2">
            <label class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary">Documento</label>
            <UInput
              :model-value="taxId"
              placeholder="CPF ou CNPJ"
              size="xl"
              class="w-full"
              :maxlength="18"
              @update:model-value="
                (value) => {
                  formErrors.tax_id = undefined;
                  taxId = formatTaxId(String(value ?? ''));
                }
              "
            />
            <p class="text-right text-xs text-toned">{{ taxIdDigitsCount }}/14</p>
            <p v-if="formErrors.tax_id" class="text-sm text-error">{{ formErrors.tax_id }}</p>
          </div>

          <div class="space-y-2">
            <label class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary">Telefone</label>
            <UInput
              :model-value="phone"
              placeholder="(11) 99999-9999"
              size="xl"
              class="w-full"
              :maxlength="15"
              @update:model-value="
                (value) => {
                  formErrors.phone = undefined;
                  phone = formatBrPhone(String(value ?? ''));
                }
              "
            />
            <p class="text-right text-xs text-toned">{{ phoneDigitsCount }}/11</p>
            <p v-if="formErrors.phone" class="text-sm text-error">{{ formErrors.phone }}</p>
          </div>

          <div class="space-y-2">
            <label class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary">E-mail</label>
            <UInput
              v-model="email"
              placeholder="email@cliente.com"
              size="xl"
              class="w-full"
              :maxlength="255"
              @update:model-value="formErrors.email = undefined"
            />
            <p v-if="formErrors.email" class="text-sm text-error">{{ formErrors.email }}</p>
          </div>
        </div>
      </template>

      <template #footer="{ close }">
        <UButton color="neutral" variant="soft" @click="close()">
          Cancelar
        </UButton>
        <UButton color="primary" :loading="formSubmitting" @click="handleSubmit">
          {{ formMode === 'create' ? 'Criar cliente' : 'Salvar alterações' }}
        </UButton>
      </template>
    </USlideover>

    <AppConfirm
      v-model:open="confirmOpen"
      title="Excluir cliente"
      description="Esta ação remove o cliente e os dados vinculados a ele. Deseja continuar?"
      confirm-label="Excluir cliente"
      cancel-label="Cancelar"
      :loading="confirmLoading"
      @confirm="handleDelete"
    />
  </div>
</template>
