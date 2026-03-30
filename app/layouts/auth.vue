<template>
  <div class="min-h-screen bg-[#e1e4e1] dark:bg-default">
    <div
      class="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-6 sm:px-6 sm:py-10"
    >
      <div class="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        <div
          class="rounded-[1.75rem] border border-default bg-elevated/70 p-5 shadow-lg sm:p-6 sm:shadow-xl lg:hidden"
        >
          <div class="space-y-5">
            <NuxtImg
              src="/branding/logo-transparent.png"
              alt="Mecanix"
              class="h-10 w-auto"
              loading="eager"
            />

            <div class="space-y-2">
              <p
                class="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary"
              >
                Gestão na web
              </p>
              <h1
                class="text-2xl font-semibold tracking-tight text-highlighted"
              >
                Seu dia de oficina começa aqui.
              </h1>
              <p class="text-sm leading-6 text-toned">
                Acompanhe a operação com mais contexto, organização e leitura em
                tela grande.
              </p>
            </div>

            <div class="hidden gap-2.5">
              <div
                class="flex items-start gap-3 rounded-2xl border border-default bg-default px-4 py-3 text-sm text-toned"
              >
                <UIcon
                  name="i-lucide-layout-panel-top"
                  class="mt-0.5 size-4 text-primary"
                />
                <span>Empresas, clientes, veículos e checklists em um só
                  ambiente.</span>
              </div>
              <div
                class="flex items-start gap-3 rounded-2xl border border-default bg-default px-4 py-3 text-sm text-toned"
              >
                <UIcon
                  name="i-lucide-briefcase-business"
                  class="mt-0.5 size-4 text-primary"
                />
                <span>Feito para acompanhar a rotina administrativa da
                  oficina.</span>
              </div>
            </div>
          </div>
        </div>

        <div
          class="hidden lg:flex flex-col justify-between rounded-3xl border border-default bg-elevated/65 p-10 shadow-xl"
        >
          <div class="space-y-6">
            <NuxtImg
              src="/branding/logo-transparent.png"
              alt="Mecanix"
              class="h-11 w-auto"
              loading="eager"
            />
            <div class="space-y-3">
              <p
                class="text-xs font-semibold uppercase tracking-[0.32em] text-primary"
              >
                Gestão na web
              </p>
              <h1
                class="max-w-xl text-4xl font-semibold tracking-tight text-highlighted"
              >
                Seu dia de oficina começa aqui.
              </h1>
              <p class="max-w-lg text-sm leading-6 text-toned">
                Acompanhe a operação com mais contexto, organização e leitura em
                tela grande.
              </p>
            </div>
          </div>

          <div class="hidden gap-3 sm:grid">
            <div
              class="flex items-start gap-3 rounded-2xl border border-default bg-default/85 px-4 py-3 text-sm text-toned"
            >
              <UIcon
                name="i-lucide-layout-panel-top"
                class="mt-0.5 size-4 text-primary"
              />
              <span>Empresas, clientes, veículos e checklists em um só
                ambiente.</span>
            </div>
            <div
              class="flex items-start gap-3 rounded-2xl border border-default bg-default/85 px-4 py-3 text-sm text-toned"
            >
              <UIcon
                name="i-lucide-briefcase-business"
                class="mt-0.5 size-4 text-primary"
              />
              <span>Feito para acompanhar a rotina administrativa da oficina.</span>
            </div>
            <div
              class="flex items-start gap-3 rounded-2xl border border-default bg-default/85 px-4 py-3 text-sm text-toned"
            >
              <UIcon
                name="i-lucide-smartphone"
                class="mt-0.5 size-4 text-primary"
              />
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
