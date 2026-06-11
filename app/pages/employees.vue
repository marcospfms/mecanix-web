<script setup lang="ts">
import { getErrorMessage } from '../composables/useAppToast'
import {
  roleLabel,
  permissionModules,
  getPermissionActionsForModule,
  getPermissionPreset,
  detectRoleFromPermissions,
  sanitizeEmployeePermissions
} from '../composables/useEmployees'
import type {
  Employee,
  EmployeePermissions,
  PermissionModuleKey,
  PermissionActionKey
} from '../composables/useEmployees'
import type { Company } from '../composables/useCompanies'

definePageMeta({
  title: 'Funcionários'
})

type FormMode = 'create' | 'edit'

const toast = useAppToast()
const manualRefreshing = ref(false)

const {
  search,
  employees,
  status,
  error,
  refresh,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
  removeEmployeeFromCompany,
  resetPassword
} = useEmployees()

const { rawCompanies, status: companiesStatus } = useCompanies()

// ─── Form ───────────────────────────────────────────────────────────
const formOpen = ref(false)
const formMode = ref<FormMode>('create')
const formSubmitting = ref(false)
const editingEmployee = ref<Employee | null>(null)

const formCompanyId = ref<number | undefined>()
const formName = ref('')
const formUsername = ref('')
const formPassword = ref('')
const formRole = ref<'manager' | 'technician' | 'custom'>('technician')
const formIsActive = ref(true)
const formPermissions = ref<EmployeePermissions>(
  getPermissionPreset('technician')
)
const formErrors = ref<{
  company_id?: string;
  name?: string;
  username?: string;
  password?: string;
}>({})

const togglePermission = (
  module: PermissionModuleKey,
  action: PermissionActionKey
) => {
  formPermissions.value[module][action] = !formPermissions.value[module][action]
  formPermissions.value = sanitizeEmployeePermissions(formPermissions.value)
  formRole.value = detectRoleFromPermissions(formPermissions.value)
}
// ─── Password reset ──────────────────────────────────────────────────
const resetOpen = ref(false)
const resetSubmitting = ref(false)
const resetTarget = ref<Employee | null>(null)
const resetNewPassword = ref('')
const resetConfirmPassword = ref('')
const resetErrors = ref<{ password?: string; confirm?: string }>({})

// ─── Deactivate confirm ──────────────────────────────────────────────
const confirmOpen = ref(false)
const confirmLoading = ref(false)
const confirmTarget = ref<Employee | null>(null)

const removeCompanyLinkOpen = ref(false)
const removeCompanyLinkLoading = ref(false)
const removeCompanyLinkTarget = ref<Employee | null>(null)

// ─── Computed ────────────────────────────────────────────────────────
const isLoading = computed(
  () => status.value === 'pending' && employees.value.length === 0
)
const hasEmployees = computed(() => employees.value.length > 0)

const companiesOptions = computed(() =>
  (Array.isArray(rawCompanies.value) ? rawCompanies.value : []).map(
    (c: Company) => ({ label: c.name, value: c.id })
  )
)

// Agrupa por empresa
const groupedByCompany = computed(() => {
  const groups: Record<
    number,
    { company: Employee['company']; items: Employee[] }
  > = {}
  for (const emp of employees.value) {
    if (!groups[emp.company_id]) {
      groups[emp.company_id] = { company: emp.company, items: [] }
    }
    groups[emp.company_id]!.items.push(emp)
  }
  return Object.values(groups)
})

const formTitle = computed(() =>
  formMode.value === 'create' ? 'Novo funcionário' : 'Editar funcionário'
)
const formDescription = computed(() =>
  formMode.value === 'create'
    ? 'Adicione um funcionário a uma das suas empresas.'
    : 'Atualize os dados do funcionário selecionado.'
)

// ─── Form helpers ────────────────────────────────────────────────────
const resetForm = () => {
  formCompanyId.value = undefined
  formName.value = ''
  formUsername.value = ''
  formPassword.value = ''
  formRole.value = 'technician'
  formIsActive.value = true
  formPermissions.value = getPermissionPreset('technician')
  editingEmployee.value = null
  formErrors.value = {}
}

const openCreate = () => {
  resetForm()
  formMode.value = 'create'
  formOpen.value = true
}

const openEdit = (emp: Employee) => {
  resetForm()
  formMode.value = 'edit'
  editingEmployee.value = emp
  formCompanyId.value = emp.company_id
  formName.value = emp.user.name
  formUsername.value = emp.user.username ?? ''
  formRole.value = emp.role
  formIsActive.value = emp.is_active
  formPermissions.value = JSON.parse(
    JSON.stringify(
      emp.permissions
      ?? getPermissionPreset(emp.role === 'custom' ? 'technician' : emp.role)
    )
  )
  formPermissions.value = sanitizeEmployeePermissions(formPermissions.value)
  formOpen.value = true
}

const validateForm = () => {
  const errors: typeof formErrors.value = {}
  if (formMode.value === 'create' && !formCompanyId.value) {
    errors.company_id = 'Selecione a empresa.'
  }
  if (!formName.value.trim()) {
    errors.name = 'Informe o nome do funcionário.'
  }
  if (!formUsername.value.trim()) {
    errors.username = 'Informe o nome de usuário.'
  } else if (!/^[a-z0-9._-]{3,50}$/.test(formUsername.value.trim())) {
    errors.username
      = 'Use apenas letras minúsculas, números, "_", "-" e "." (3–50 caracteres).'
  }
  if (formMode.value === 'create' && !formPassword.value) {
    errors.password = 'Informe a senha temporária.'
  }
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleSubmit = async () => {
  if (!validateForm() || formSubmitting.value) return
  formSubmitting.value = true

  try {
    if (formMode.value === 'create') {
      const createRole
        = formRole.value === 'custom' ? 'technician' : formRole.value
      await createEmployee(formCompanyId.value!, {
        name: formName.value,
        username: formUsername.value,
        password: formPassword.value,
        role: createRole,
        permissions: formPermissions.value
      })
      toast.success({
        title: 'Funcionário criado',
        description: 'O acesso foi gerado com sucesso.'
      })
    } else if (editingEmployee.value) {
      await updateEmployee(
        editingEmployee.value.company_id,
        editingEmployee.value.id,
        {
          name: formName.value,
          username: formUsername.value,
          role: formRole.value,
          permissions: formPermissions.value,
          is_active: formIsActive.value
        }
      )
      toast.success({
        title: 'Funcionário atualizado',
        description: 'Os dados foram salvos.'
      })
    }
    formOpen.value = false
    resetForm()
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao salvar',
      description: getErrorMessage(
        err,
        'Não foi possível salvar o funcionário.'
      )
    })
  } finally {
    formSubmitting.value = false
  }
}

// ─── Deactivate ──────────────────────────────────────────────────────
const askDeactivate = (emp: Employee) => {
  confirmTarget.value = emp
  confirmOpen.value = true
}

const askRemoveFromCompany = (emp: Employee) => {
  removeCompanyLinkTarget.value = emp
  removeCompanyLinkOpen.value = true
}

const handleDeactivate = async () => {
  if (!confirmTarget.value) return
  confirmLoading.value = true
  try {
    await deactivateEmployee(
      confirmTarget.value.company_id,
      confirmTarget.value.id
    )
    toast.success({
      title: 'Funcionário desativado',
      description: 'O acesso foi revogado.'
    })
    confirmOpen.value = false
    confirmTarget.value = null
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao desativar',
      description: getErrorMessage(
        err,
        'Não foi possível desativar o funcionário.'
      )
    })
  } finally {
    confirmLoading.value = false
  }
}

const handleRemoveFromCompany = async () => {
  if (!removeCompanyLinkTarget.value) return
  removeCompanyLinkLoading.value = true
  try {
    await removeEmployeeFromCompany(
      removeCompanyLinkTarget.value.company_id,
      removeCompanyLinkTarget.value.id
    )
    toast.success({
      title: 'Vínculo removido',
      description: 'O usuário foi removido apenas desta loja.'
    })
    removeCompanyLinkOpen.value = false
    removeCompanyLinkTarget.value = null
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao remover vínculo',
      description: getErrorMessage(
        err,
        'Não foi possível remover o funcionário desta loja.'
      )
    })
  } finally {
    removeCompanyLinkLoading.value = false
  }
}

// ─── Password reset ──────────────────────────────────────────────────
const openResetPassword = (emp: Employee) => {
  resetTarget.value = emp
  resetNewPassword.value = ''
  resetConfirmPassword.value = ''
  resetErrors.value = {}
  resetOpen.value = true
}

const validateReset = () => {
  const errors: typeof resetErrors.value = {}
  if (!resetNewPassword.value) {
    errors.password = 'Informe a nova senha.'
  } else if (resetNewPassword.value.length < 6) {
    errors.password = 'A senha deve ter ao menos 6 caracteres.'
  }
  if (resetNewPassword.value !== resetConfirmPassword.value) {
    errors.confirm = 'As senhas não coincidem.'
  }
  resetErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleResetPassword = async () => {
  if (!validateReset() || resetSubmitting.value || !resetTarget.value) return
  resetSubmitting.value = true
  try {
    await resetPassword(
      resetTarget.value.company_id,
      resetTarget.value.id,
      resetNewPassword.value
    )
    toast.success({
      title: 'Senha redefinida',
      description: 'O funcionário deverá trocar a senha no próximo acesso.'
    })
    resetOpen.value = false
    resetTarget.value = null
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao redefinir senha',
      description: getErrorMessage(err, 'Não foi possível redefinir a senha.')
    })
  } finally {
    resetSubmitting.value = false
  }
}

// ─── Refresh ─────────────────────────────────────────────────────────
const handleRefresh = async () => {
  if (manualRefreshing.value) return
  manualRefreshing.value = true
  try {
    await Promise.all([
      refresh(),
      new Promise(resolve => setTimeout(resolve, 1000))
    ])
  } catch (err: unknown) {
    toast.error({
      title: 'Falha ao atualizar',
      description: getErrorMessage(err, 'Não foi possível atualizar a lista.')
    })
  } finally {
    manualRefreshing.value = false
  }
}
</script>

<template>
  <div class="space-y-5 sm:space-y-6">
    <!-- Cabeçalho -->
    <section class="space-y-3">
      <p class="text-xs font-semibold uppercase tracking-[0.32em] text-primary">
        Funcionários
      </p>

      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div class="space-y-2">
          <h1 class="text-3xl font-semibold tracking-tight text-highlighted">
            Equipe
          </h1>
          <p class="max-w-2xl text-sm leading-6 text-toned">
            Gerencie os funcionários das suas empresas, controle cargos e
            acessos.
          </p>
        </div>

        <UButton
          color="primary"
          icon="i-lucide-plus"
          class="self-start sm:self-auto"
          @click="openCreate"
        >
          Novo funcionário
        </UButton>
      </div>
    </section>

    <div class="space-y-4">
      <!-- Busca + refresh -->
      <div class="flex items-center gap-2">
        <UInput
          v-model="search"
          placeholder="Buscar por nome, username ou empresa"
          icon="i-lucide-search"
          size="xl"
          class="flex-1"
        >
          <template
            v-if="search"
            #trailing
          >
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
          aria-label="Atualizar"
          :loading="manualRefreshing"
          @click="handleRefresh"
        />
      </div>

      <!-- Estados -->
      <AppLoading
        v-if="isLoading || manualRefreshing"
        title="Carregando funcionários"
        description="Buscando a equipe das suas empresas."
      />

      <UAlert
        v-else-if="error"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="Falha ao carregar funcionários"
        description="Atualize a página ou tente novamente em instantes."
      />

      <AppEmpty
        v-else-if="!hasEmployees"
        title="Nenhum funcionário cadastrado"
        description="Adicione o primeiro funcionário para começar a montar sua equipe."
        icon="i-lucide-user-round-cog"
      >
        <div class="pt-2">
          <UButton
            color="primary"
            icon="i-lucide-plus"
            @click="openCreate"
          >
            Criar primeiro funcionário
          </UButton>
        </div>
      </AppEmpty>

      <!-- Lista agrupada por empresa -->
      <template v-else>
        <div
          v-for="group in groupedByCompany"
          :key="group.company.id"
          class="space-y-3"
        >
          <!-- Label da empresa -->
          <div class="flex items-center gap-3">
            <div
              class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10"
            >
              <UIcon
                name="i-lucide-building-2"
                class="size-4 text-primary"
              />
            </div>
            <h2 class="text-base font-semibold text-highlighted">
              {{ group.company.name }}
            </h2>
            <span
              class="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-toned"
            >
              {{ group.items.length }}
            </span>
          </div>

          <div class="grid gap-3">
            <UCard
              v-for="emp in group.items"
              :key="emp.id"
              class="rounded-2xl border-default"
            >
              <div class="flex flex-col gap-3">
                <!-- Avatar + info -->
                <div class="flex min-w-0 items-start gap-4">
                  <div
                    class="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-default bg-[linear-gradient(180deg,rgba(0,193,106,0.14)_0%,rgba(0,161,85,0.08)_100%)]"
                  >
                    <span
                      class="text-sm font-semibold uppercase tracking-[0.08em] text-primary"
                    >
                      {{ emp.user.name.slice(0, 2) }}
                    </span>
                  </div>

                  <div class="min-w-0 space-y-1.5">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="text-base font-semibold text-highlighted">
                        {{ emp.user.name }}
                      </p>
                      <!-- Role badge -->
                      <span
                        class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
                        :class="
                          emp.role === 'manager'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-toned'
                        "
                      >
                        {{ roleLabel(emp.role) }}
                      </span>
                      <!-- Active badge -->
                      <span
                        class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
                        :class="
                          emp.is_active
                            ? 'bg-success/10 text-success'
                            : 'bg-error/10 text-error'
                        "
                      >
                        {{ emp.is_active ? 'Ativo' : 'Inativo' }}
                      </span>
                    </div>

                    <p class="font-mono text-sm tracking-[0.04em] text-toned">
                      @{{ emp.user.username || '—' }}
                    </p>

                    <p
                      v-if="emp.user.must_change_password"
                      class="flex items-center gap-1.5 text-xs text-warning"
                    >
                      <UIcon
                        name="i-lucide-alert-triangle"
                        class="size-3.5"
                      />
                      Troca de senha pendente
                    </p>
                  </div>
                </div>

                <!-- Ações -->
                <div
                  class="flex flex-wrap gap-2 border-t border-default/70 pt-3"
                >
                  <UButton
                    color="neutral"
                    variant="soft"
                    icon="i-lucide-pencil"
                    size="sm"
                    @click="openEdit(emp)"
                  >
                    Editar
                  </UButton>
                  <UButton
                    color="neutral"
                    variant="soft"
                    icon="i-lucide-key-round"
                    size="sm"
                    @click="openResetPassword(emp)"
                  >
                    Senha
                  </UButton>
                  <UButton
                    v-if="emp.is_active"
                    color="error"
                    variant="soft"
                    icon="i-lucide-user-x"
                    size="sm"
                    @click="askDeactivate(emp)"
                  >
                    Desativar
                  </UButton>
                  <UButton
                    color="error"
                    variant="outline"
                    icon="i-lucide-trash-2"
                    size="sm"
                    @click="askRemoveFromCompany(emp)"
                  >
                    Remover da loja
                  </UButton>
                </div>
              </div>
            </UCard>
          </div>
        </div>
      </template>
    </div>

    <!-- ── FORM SLIDEOVER ─────────────────────────────────────────── -->
    <USlideover
      v-model:open="formOpen"
      side="right"
      :title="formTitle"
      :description="formDescription"
      :ui="{
        body: 'px-3 py-4 sm:px-4 sm:py-5',
        footer: 'justify-end px-3 sm:px-4'
      }"
    >
      <template #body>
        <div class="space-y-5">
          <!-- Empresa (só no create) -->
          <div
            v-if="formMode === 'create'"
            class="space-y-2"
          >
            <label
              class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary"
            >
              Empresa
            </label>
            <AppLoading
              v-if="companiesStatus === 'pending'"
              title="Carregando empresas"
              description=""
            />
            <USelect
              v-else
              v-model="formCompanyId"
              :items="companiesOptions"
              placeholder="Selecione a empresa"
              size="xl"
              class="w-full"
            />
            <p
              v-if="formErrors.company_id"
              class="text-sm text-error"
            >
              {{ formErrors.company_id }}
            </p>
          </div>

          <!-- Nome -->
          <div class="space-y-2">
            <label
              class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary"
            >
              Nome
            </label>
            <UInput
              v-model="formName"
              placeholder="Nome completo"
              size="xl"
              class="w-full"
              :maxlength="255"
              @update:model-value="formErrors.name = undefined"
            />
            <p
              v-if="formErrors.name"
              class="text-sm text-error"
            >
              {{ formErrors.name }}
            </p>
          </div>

          <!-- Username -->
          <div class="space-y-2">
            <label
              class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary"
            >
              Usuário
            </label>
            <UInput
              v-model="formUsername"
              placeholder="ex.: carlos.mec"
              size="xl"
              class="w-full"
              :maxlength="50"
              @update:model-value="formErrors.username = undefined"
            />
            <p class="text-xs text-toned">
              Letras minúsculas, números, ponto, hífen ou underscore (3–50
              caracteres).
            </p>
            <p
              v-if="formErrors.username"
              class="text-sm text-error"
            >
              {{ formErrors.username }}
            </p>
          </div>

          <!-- Senha temporária (só no create) -->
          <div
            v-if="formMode === 'create'"
            class="space-y-2"
          >
            <label
              class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary"
            >
              Senha temporária
            </label>
            <UInput
              v-model="formPassword"
              type="password"
              placeholder="Senha inicial de acesso"
              size="xl"
              class="w-full"
              @update:model-value="formErrors.password = undefined"
            />
            <p class="text-xs text-toned">
              O funcionário será obrigado a trocar no primeiro acesso.
            </p>
            <p
              v-if="formErrors.password"
              class="text-sm text-error"
            >
              {{ formErrors.password }}
            </p>
          </div>

          <!-- Cargo -->
          <div
            class="space-y-3 rounded-2xl border border-default bg-muted/20 p-4"
          >
            <div class="flex items-center justify-between">
              <label
                class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary"
              >
                Cargo
              </label>
              <span
                v-if="formRole === 'custom'"
                class="rounded-full bg-warning/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-warning"
              >
                Personalizado
              </span>
            </div>
            <label
              class="flex cursor-pointer items-center gap-3 text-sm text-highlighted"
            >
              <input
                v-model="formRole"
                type="radio"
                value="technician"
                class="accent-primary"
                @change="formPermissions = getPermissionPreset('technician')"
              >
              <div>
                <p class="font-medium">Técnico</p>
                <p class="text-xs text-toned">
                  Executa checklists, sem acesso a configurações.
                </p>
              </div>
            </label>
            <label
              class="flex cursor-pointer items-center gap-3 text-sm text-highlighted"
            >
              <input
                v-model="formRole"
                type="radio"
                value="manager"
                class="accent-primary"
                @change="formPermissions = getPermissionPreset('manager')"
              >
              <div>
                <p class="font-medium">Gerente</p>
                <p class="text-xs text-toned">
                  Acesso expandido à operação da loja.
                </p>
              </div>
            </label>
          </div>

          <!-- Permissões -->
          <div class="space-y-3">
            <div>
              <label
                class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary"
              >
                Permissões
              </label>
              <p class="mt-1 text-xs text-toned">
                Ajuste individualmente o que este funcionário pode fazer em cada
                módulo.
              </p>
            </div>

            <div class="space-y-3">
              <div
                v-for="mod in permissionModules"
                :key="mod.key"
                class="rounded-2xl border border-default bg-muted/20 p-4"
              >
                <div class="mb-3">
                  <p class="text-sm font-semibold text-highlighted">
                    {{ mod.label }}
                  </p>
                  <p class="text-xs text-toned">
                    {{ mod.description }}
                  </p>
                </div>

                <div class="space-y-0">
                  <div
                    v-for="action in getPermissionActionsForModule(mod.key)"
                    :key="action.key"
                    class="flex items-center justify-between border-t border-default py-2.5"
                  >
                    <span class="text-sm font-medium text-highlighted">{{
                      action.label
                    }}</span>
                    <input
                      type="checkbox"
                      :checked="formPermissions[mod.key][action.key]"
                      class="size-4 cursor-pointer rounded accent-primary"
                      @change="togglePermission(mod.key, action.key)"
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Toggle ativo/inativo (só no edit) -->
          <div
            v-if="formMode === 'edit'"
            class="flex items-center justify-between rounded-2xl border border-default bg-muted/20 px-4 py-3"
          >
            <div>
              <p class="text-sm font-medium text-highlighted">
                Status
              </p>
              <p class="text-xs text-toned">
                {{ formIsActive ? 'Funcionário ativo' : 'Acesso revogado' }}
              </p>
            </div>
            <input
              v-model="formIsActive"
              type="checkbox"
              class="size-5 cursor-pointer rounded accent-primary"
            >
          </div>
        </div>
      </template>

      <template #footer="{ close }">
        <UButton
          color="neutral"
          variant="soft"
          @click="close()"
        >
          Cancelar
        </UButton>
        <UButton
          color="primary"
          :loading="formSubmitting"
          @click="handleSubmit"
        >
          {{ formMode === 'create' ? 'Criar funcionário' : 'Salvar' }}
        </UButton>
      </template>
    </USlideover>

    <!-- ── RESET PASSWORD MODAL ───────────────────────────────────── -->
    <UModal
      v-model:open="resetOpen"
      title="Redefinir senha"
      :description="
        resetTarget ? `Definir nova senha para ${resetTarget.user.name}` : ''
      "
      :close="false"
    >
      <template #content>
        <div class="space-y-5 p-6">
          <div class="space-y-2">
            <label
              class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary"
            >
              Nova senha
            </label>
            <UInput
              v-model="resetNewPassword"
              type="password"
              placeholder="Mínimo 6 caracteres"
              size="xl"
              class="w-full"
              @update:model-value="resetErrors.password = undefined"
            />
            <p
              v-if="resetErrors.password"
              class="text-sm text-error"
            >
              {{ resetErrors.password }}
            </p>
          </div>

          <div class="space-y-2">
            <label
              class="block text-xs font-semibold uppercase tracking-[0.24em] text-primary"
            >
              Confirmar senha
            </label>
            <UInput
              v-model="resetConfirmPassword"
              type="password"
              placeholder="Repita a nova senha"
              size="xl"
              class="w-full"
              @update:model-value="resetErrors.confirm = undefined"
            />
            <p
              v-if="resetErrors.confirm"
              class="text-sm text-error"
            >
              {{ resetErrors.confirm }}
            </p>
          </div>

          <p class="text-xs text-toned">
            Todos os tokens ativos do funcionário serão revogados e ele
            precisará trocar a senha no próximo acesso.
          </p>

          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <UButton
              color="neutral"
              variant="soft"
              @click="resetOpen = false"
            >
              Cancelar
            </UButton>
            <UButton
              color="primary"
              :loading="resetSubmitting"
              @click="handleResetPassword"
            >
              Redefinir senha
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ── DEACTIVATE CONFIRM ─────────────────────────────────────── -->
    <AppConfirm
      v-model:open="confirmOpen"
      title="Desativar funcionário"
      :description="
        confirmTarget
          ? `Você está revogando o acesso de ${confirmTarget.user.name}. Todos os tokens ativos serão invalidados.`
          : 'Esta ação não pode ser desfeita facilmente.'
      "
      confirm-label="Desativar"
      :loading="confirmLoading"
      @confirm="handleDeactivate"
    />

    <!-- ── REMOVE FROM COMPANY CONFIRM ──────────────────────────── -->
    <AppConfirm
      v-model:open="removeCompanyLinkOpen"
      title="Remover da loja"
      :description="
        removeCompanyLinkTarget
          ? `${removeCompanyLinkTarget.user.name} será desvinculado apenas desta loja. O histórico de checklists continuará preservado.`
          : 'O usuário será removido apenas desta loja.'
      "
      confirm-label="Remover"
      :loading="removeCompanyLinkLoading"
      @confirm="handleRemoveFromCompany"
    />
  </div>
</template>
