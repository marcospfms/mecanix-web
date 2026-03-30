# Napkin Runbook

## Curation Rules

- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)

1. **[2026-03-24] Owner-only web app**
   Do instead: bloquear funcionário no middleware e nas telas sensíveis; assumir que o `mecanix-client` existe só para o dono da operação.

## Design & Product Guardrails

1. **[2026-03-24] Identidade visual deve seguir o ecossistema Mecanix**
   Do instead: usar como base a linguagem da tela de welcome/login do `mecanix-core`, com branding azul, acentos de marca e ícones consistentes.

2. **[2026-03-24] Formulários em slideover seguem padrão enxuto**
   Do instead: usar label em bloco acima do input, evitar subtítulo redundante, contador abaixo do campo alinhado à direita e padding lateral moderado no drawer.

## Framework & Stack

1. **[2026-03-24] Sempre usar a skill `nuxt`**
   Do instead: consultar primeiro os padrões de Nuxt 4 antes de editar rotas, layouts, middleware, plugins ou composables do `mecanix-client`.

2. **[2026-03-26] `useAPI` com `transform` exige shape coerente no `default`**
   Do instead: quando `transform` devolve `response.data`, tipar o composable pelo shape transformado (`T`) e usar `default` compatível (`[]`, `null`, `{}`), sem manter envelope no estado final.

3. **[2026-03-26] Auto-import do Nuxt colide helpers com o mesmo nome**
   Do instead: manter helpers compartilhados em um único composable de domínio ou importar explicitamente a origem quando houver risco de duplicidade, em vez de exportar o mesmo nome em múltiplos arquivos.

4. **[2026-03-26] Typed router ligado exige `useRoute()` tipado e navegação nomeada**
   Do instead: com `typedPages` ativo, preferir `useRoute('nome-da-rota')` e `navigateTo({ name: 'rota', params })`, evitando rota genérica/string quando a rota já existe no mapa tipado.

5. **[2026-03-26] Rotas pai com filhos precisam de `NuxtPage`**
   Do instead: quando existir `app/pages/foo.vue` junto com `app/pages/foo/...`, transformar `foo.vue` em wrapper com `<NuxtPage />` e mover a tela real para `foo/index.vue`.

6. **[2026-03-24] Componentes Nuxt UI precisam seguir contrato acessível**
   Do instead: ao usar `USlideover`, `UModal` e afins, sempre fornecer `title` e `description` ou slots equivalentes compatíveis com a versão atual.

7. **[2026-03-24] SPA autenticada consumindo o `mecanix-core`**
   Do instead: iniciar Google no frontend, trocar token em `POST /api/auth/google` e tratar o app como painel fechado sem prerender da home.

8. **[2026-03-24] Refresh manual deve dar feedback visível**
   Do instead: quando houver botão de atualizar em listas, usar loading na área de conteúdo por pelo menos 1 segundo para o usuário perceber a ação.

9. **[2026-03-28] Volar sofre com wrappers genéricos demais sobre `useAsyncData`**
   Do instead: em wrappers Nuxt como `useAPI`, preferir um contrato de opções pequeno e explícito (`key`, `default`, `watch`, `transform`) e devolver composables já normalizados por domínio em vez de depender dos tipos internos `PickFrom<...>`.

10. **[2026-03-28] Formatter do Vue briga com lint do projeto**
    Do instead: no `mecanix-web`, usar ESLint como formatter padrão para `vue`, `javascript` e `typescript`, deixando o Prettier para arquivos auxiliares.
