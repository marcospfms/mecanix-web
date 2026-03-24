<script setup lang="ts">
definePageMeta({
  title: 'Detalhes do cliente'
});

const route = useRoute();
const customerId = computed(() => Number(route.params.customerId));
const { data: customer, status, error, refresh } = useCustomer(customerId);
const { data: vehicles, status: vehiclesStatus, error: vehiclesError, refresh: refreshVehicles } =
  useCustomerVehicles(customerId);
const toast = useAppToast();

const isLoading = computed(
  () =>
    (status.value === 'pending' && !customer.value) ||
    (vehiclesStatus.value === 'pending' && !vehicles.value)
);

const customerVehicles = computed(() => vehicles.value ?? []);

const handleRefresh = async () => {
  try {
    await Promise.all([refresh(), refreshVehicles()]);
  } catch {
    toast.error({
      title: 'Falha ao atualizar',
      description: 'Não foi possível recarregar os dados do cliente.'
    });
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
            {{ customer?.name || 'Detalhes do cliente' }}
          </h1>
          <p class="max-w-2xl text-sm leading-6 text-toned">
            Consulte dados cadastrais, contatos e os veículos vinculados a este cliente.
          </p>
        </div>

        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-refresh-cw"
          @click="handleRefresh"
        >
          Atualizar
        </UButton>
      </div>
    </section>

    <AppLoading
      v-if="isLoading"
      title="Carregando cliente"
      description="Buscando os dados cadastrais e os veículos vinculados."
    />

    <UAlert
      v-else-if="error || vehiclesError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Falha ao carregar cliente"
      description="Atualize a página ou tente novamente em instantes."
    />

    <template v-else-if="customer">
      <UCard class="rounded-2xl border-default">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Documento</p>
            <p class="mt-1 text-base text-highlighted">{{ formatTaxId(customer.tax_id) }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Telefone</p>
            <p class="mt-1 text-base text-highlighted">{{ formatBrPhone(customer.phone) }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">E-mail</p>
            <p class="mt-1 text-base text-highlighted">{{ customer.email || '-' }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Cadastro</p>
            <p class="mt-1 text-base text-highlighted">
              {{ new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(customer.created_at)) }}
            </p>
          </div>
        </div>
      </UCard>

      <section class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-highlighted">Veículos vinculados</h2>
          <UButton
            color="primary"
            icon="i-lucide-plus"
            :to="{ name: 'vehicles', query: { open: 'create', customerId: String(customer.id) } }"
          >
            Novo veículo
          </UButton>
        </div>

        <AppEmpty
          v-if="customerVehicles.length === 0"
          title="Nenhum veículo cadastrado"
          description="Os veículos vinculados a este cliente aparecerão aqui."
          icon="i-lucide-car-front"
        />

        <div v-else class="grid gap-3">
          <UCard
            v-for="vehicle in customerVehicles"
            :key="vehicle.id"
            class="rounded-2xl border-default"
          >
            <div class="space-y-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-base font-semibold text-highlighted">{{ vehicle.model }}</p>
                  <p class="text-sm text-toned">{{ formatLicensePlate(vehicle.license_plate) }}</p>
                </div>

                <div
                  v-if="typeof vehicle.latest_mileage === 'number'"
                  class="rounded-2xl bg-primary/10 px-4 py-2 text-center"
                >
                  <p class="text-xs font-medium uppercase tracking-[0.2em] text-primary">Km</p>
                  <p class="text-lg font-semibold text-primary">
                    {{ vehicle.latest_mileage.toLocaleString('pt-BR') }}
                  </p>
                </div>
              </div>

              <div class="grid gap-3 text-sm text-toned sm:grid-cols-3">
                <div>
                  <p class="font-medium text-highlighted">Ano</p>
                  <p>{{ vehicle.model_year || '-' }}</p>
                </div>
                <div>
                  <p class="font-medium text-highlighted">Cor</p>
                  <p>{{ vehicle.color || '-' }}</p>
                </div>
                <div>
                  <p class="font-medium text-highlighted">Checklists</p>
                  <p>{{ vehicle.checklists_done ?? 0 }}/{{ vehicle.checklists_total ?? 0 }}</p>
                </div>
              </div>

              <div class="flex justify-end border-t border-default/70 pt-3">
                <UButton
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-arrow-up-right"
                  :to="{ name: 'vehicles-vehicleId', params: { vehicleId: String(vehicle.id) } }"
                >
                  Ver veículo
                </UButton>
              </div>
            </div>
          </UCard>
        </div>
      </section>
    </template>
  </div>
</template>
