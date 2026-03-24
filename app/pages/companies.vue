<script setup lang="ts">
import type { Company } from '../composables/useCompanies';

definePageMeta({
  title: 'Empresas'
});

type FormMode = 'create' | 'edit';

const toast = useAppToast();
const {
  search,
  companies,
  status,
  error,
  refresh,
  createCompany,
  updateCompany,
  deleteCompany,
  removeLogo
} = useCompanies();

const formOpen = ref(false);
const formMode = ref<FormMode>('create');
const formSubmitting = ref(false);
const confirmOpen = ref(false);
const confirmLoading = ref(false);
const companyPendingDeletion = ref<Company | null>(null);
const manualRefreshing = ref(false);

const editingCompany = ref<Company | null>(null);
const name = ref('');
const cnpj = ref('');
const logoFile = ref<File | null>(null);
const logoPreview = ref<string | null>(null);
const formErrors = ref<{ name?: string; cnpj?: string }>({});

const isLoading = computed(() => status.value === 'pending' && companies.value.length === 0);
const isListRefreshing = computed(() => manualRefreshing.value);
const hasCompanies = computed(() => companies.value.length > 0);
const formTitle = computed(() =>
  formMode.value === 'create' ? 'Nova empresa' : 'Editar empresa'
);
const formDescription = computed(() =>
  formMode.value === 'create'
    ? 'Cadastre uma nova oficina ou unidade.'
    : 'Atualize os dados da empresa selecionada.'
);
const currentLogoUrl = computed(() => editingCompany.value?.logo_url ?? null);
const resolvedLogoPreview = computed(() => logoPreview.value || currentLogoUrl.value);
const cnpjDigitsCount = computed(() => cnpj.value.replace(/\D/g, '').length);

const resetForm = () => {
  name.value = '';
  cnpj.value = '';
  logoFile.value = null;
  logoPreview.value = null;
  editingCompany.value = null;
  formErrors.value = {};
};

const openCreate = () => {
  resetForm();
  formMode.value = 'create';
  formOpen.value = true;
};

const openEdit = (company: Company) => {
  resetForm();
  formMode.value = 'edit';
  editingCompany.value = company;
  name.value = company.name;
  cnpj.value = formatCnpj(company.cnpj);
  formOpen.value = true;
};

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;

  logoFile.value = file;

  if (!file) {
    logoPreview.value = null;
    return;
  }

  logoPreview.value = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('file-read-error'));
    reader.readAsDataURL(file);
  });
};

const validateForm = () => {
  const errors: { name?: string; cnpj?: string } = {};

  if (!name.value.trim()) {
    errors.name = 'Informe o nome da empresa.';
  }

  if (cnpj.value.replace(/\D/g, '').length !== 14) {
    errors.cnpj = 'Informe um CNPJ válido com 14 dígitos.';
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
      await createCompany({
        name: name.value,
        cnpj: cnpj.value,
        logo: logoFile.value
      });

      toast.success({
        title: 'Empresa criada',
        description: 'A nova empresa foi adicionada com sucesso.'
      });
    } else if (editingCompany.value) {
      await updateCompany(editingCompany.value.id, {
        name: name.value,
        cnpj: cnpj.value,
        logo: logoFile.value
      });

      toast.success({
        title: 'Empresa atualizada',
        description: 'Os dados da empresa foram salvos.'
      });
    }

    formOpen.value = false;
    resetForm();
  } catch (err: any) {
    toast.error({
      title: 'Falha ao salvar',
      description: err?.data?.message ?? err?.message ?? 'Não foi possível salvar a empresa.'
    });
  } finally {
    formSubmitting.value = false;
  }
};

const askDelete = (company: Company) => {
  companyPendingDeletion.value = company;
  confirmOpen.value = true;
};

const handleDelete = async () => {
  if (!companyPendingDeletion.value) return;

  confirmLoading.value = true;

  try {
    await deleteCompany(companyPendingDeletion.value.id);
    toast.success({
      title: 'Empresa removida',
      description: 'A empresa foi excluída com sucesso.'
    });
    confirmOpen.value = false;
    companyPendingDeletion.value = null;
  } catch (err: any) {
    toast.error({
      title: 'Falha ao excluir',
      description: err?.data?.message ?? err?.message ?? 'Não foi possível excluir a empresa.'
    });
  } finally {
    confirmLoading.value = false;
  }
};

const handleRemoveLogo = async () => {
  if (!editingCompany.value?.logo_url || !editingCompany.value) {
    logoFile.value = null;
    logoPreview.value = null;
    return;
  }

  try {
    await removeLogo(editingCompany.value.id);
    editingCompany.value = {
      ...editingCompany.value,
      logo_url: null
    };
    logoFile.value = null;
    logoPreview.value = null;
    toast.success({
      title: 'Logo removida',
      description: 'A logo da empresa foi removida.'
    });
  } catch (err: any) {
    toast.error({
      title: 'Falha ao remover logo',
      description: err?.data?.message ?? err?.message ?? 'Não foi possível remover a logo.'
    });
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
        Empresas
      </p>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="space-y-2">
          <h1 class="text-3xl font-semibold tracking-tight text-highlighted">
            Oficinas e unidades
          </h1>
          <p class="max-w-2xl text-sm leading-6 text-toned">
            Organize as empresas vinculadas à sua operação, mantenha os dados atualizados e
            acompanhe cada unidade da base.
          </p>
        </div>

        <div class="flex gap-2">
          <UButton color="primary" icon="i-lucide-plus" @click="openCreate">
            Nova empresa
          </UButton>
        </div>
      </div>
    </section>

    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <UInput
          v-model="search"
          placeholder="Buscar por nome ou CNPJ"
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
          aria-label="Atualizar empresas"
          @click="handleRefresh"
        />
      </div>

      <AppLoading
        v-if="isLoading || isListRefreshing"
        title="Carregando empresas"
        description="Buscando as unidades da sua operação."
      />

      <UAlert
        v-else-if="error"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="Falha ao carregar empresas"
        description="Atualize a página ou tente novamente em instantes."
      />

      <AppEmpty
        v-else-if="!hasCompanies"
        title="Nenhuma empresa cadastrada"
        description="Adicione sua primeira empresa para começar a organizar a operação."
        icon="i-lucide-building-2"
      >
        <div class="pt-2">
          <UButton color="primary" icon="i-lucide-plus" @click="openCreate">
            Criar primeira empresa
          </UButton>
        </div>
      </AppEmpty>

      <div v-else class="grid gap-3">
        <UCard
          v-for="company in companies"
          :key="company.id"
          class="w-full rounded-2xl border-default"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex items-start gap-4">
              <div class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-default bg-muted/30">
                <NuxtImg
                  v-if="company.logo_url"
                  :src="company.logo_url"
                  :alt="company.name"
                  class="h-full w-full object-cover"
                />
                <span
                  v-else
                  class="text-base font-semibold uppercase tracking-[0.08em] text-primary"
                >
                  {{ company.name.slice(0, 2) }}
                </span>
              </div>

              <div class="space-y-1">
                <p class="text-base font-semibold text-highlighted">{{ company.name }}</p>
                <p class="text-sm text-toned">{{ formatCnpj(company.cnpj) }}</p>
              </div>
            </div>

            <div class="flex gap-2 sm:justify-end">
              <UButton
                color="neutral"
                variant="soft"
                icon="i-lucide-pencil"
                @click="openEdit(company)"
              >
                Editar
              </UButton>
              <UButton
                color="error"
                variant="soft"
                icon="i-lucide-trash"
                @click="askDelete(company)"
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
              placeholder="Nome da empresa"
              size="xl"
              class="w-full"
              :maxlength="255"
              @update:model-value="formErrors.name = undefined"
            />
            <p v-if="formErrors.name" class="text-sm text-error">{{ formErrors.name }}</p>
          </div>

          <div class="space-y-2">
            <label class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary">CNPJ</label>
            <UInput
              :model-value="cnpj"
              placeholder="00.000.000/0000-00"
              size="xl"
              class="w-full"
              :maxlength="18"
              @update:model-value="
                (value) => {
                  formErrors.cnpj = undefined;
                  cnpj = formatCnpj(String(value ?? ''));
                }
              "
            />
            <p class="text-right text-xs text-toned">{{ cnpjDigitsCount }}/14</p>
            <p v-if="formErrors.cnpj" class="text-sm text-error">{{ formErrors.cnpj }}</p>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <label class="text-sm font-medium text-highlighted">Logo</label>
              <UButton
                v-if="resolvedLogoPreview"
                color="neutral"
                variant="soft"
                size="sm"
                icon="i-lucide-trash"
                @click="handleRemoveLogo"
              >
                Remover
              </UButton>
            </div>

            <div class="rounded-2xl border border-default bg-muted/20 p-4">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div class="flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-default bg-default">
                  <NuxtImg
                    v-if="resolvedLogoPreview"
                    :src="resolvedLogoPreview"
                    alt="Preview da logo"
                    class="h-full w-full object-cover"
                  />
                  <UIcon v-else name="i-lucide-image" class="size-8 text-primary" />
                </div>

                <div class="space-y-2">
                  <p class="text-sm text-toned">
                    Envie uma imagem JPG, PNG, GIF ou WebP com até 2 MB.
                  </p>
                  <label class="inline-flex cursor-pointer">
                    <span class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white">
                      <UIcon name="i-lucide-upload" class="size-4" />
                      Escolher arquivo
                    </span>
                    <input class="hidden" type="file" accept="image/*" @change="handleFileChange" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer="{ close }">
        <UButton color="neutral" variant="soft" @click="close()">
          Cancelar
        </UButton>
        <UButton color="primary" :loading="formSubmitting" @click="handleSubmit">
          {{ formMode === 'create' ? 'Criar empresa' : 'Salvar alterações' }}
        </UButton>
      </template>
    </USlideover>

    <AppConfirm
      v-model:open="confirmOpen"
      title="Excluir empresa"
      description="Esta ação remove a empresa e os dados vinculados a ela. Deseja continuar?"
      confirm-label="Excluir empresa"
      cancel-label="Cancelar"
      :loading="confirmLoading"
      @confirm="handleDelete"
    />
  </div>
</template>
