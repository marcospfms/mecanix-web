<template>
  <div class="min-h-screen bg-default">
    <div class="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-10">
      <div class="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="hidden lg:flex flex-col justify-between rounded-3xl border border-default bg-muted/40 p-10">
          <div class="space-y-6">
            <img
              src="/branding/logo-transparent.png"
              alt="Mecanix"
              class="h-11 w-auto"
            />
            <div class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-[0.32em] text-primary">
                Gestão na web
              </p>
              <h1 class="max-w-xl text-4xl font-semibold tracking-tight text-highlighted">
                Seu dia de oficina começa aqui, com visão mais ampla e leitura mais clara.
              </h1>
              <p class="max-w-lg text-sm leading-6 text-toned">
                Acompanhe empresas, clientes, veículos, checklists e equipe na mesma base do
                Mecanix, em uma experiência pensada para a rotina administrativa.
              </p>
            </div>
          </div>

          <div class="grid gap-3">
            <div class="flex items-start gap-3 rounded-2xl border border-default bg-default px-4 py-3 text-sm text-toned">
              <UIcon name="i-lucide-layout-panel-top" class="mt-0.5 size-4 text-primary" />
              <span>Empresas, clientes, veículos e checklists em um só ambiente.</span>
            </div>
            <div class="flex items-start gap-3 rounded-2xl border border-default bg-default px-4 py-3 text-sm text-toned">
              <UIcon name="i-lucide-briefcase-business" class="mt-0.5 size-4 text-primary" />
              <span>Ideal para acompanhar pendências, histórico e organização da oficina.</span>
            </div>
            <div class="flex items-start gap-3 rounded-2xl border border-default bg-default px-4 py-3 text-sm text-toned">
              <UIcon name="i-lucide-smartphone" class="mt-0.5 size-4 text-primary" />
              <span>A equipe continua operando pelo app quando necessário.</span>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-center">
          <div class="w-full max-w-md">
            <slot />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
