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

## Framework & Stack
1. **[2026-03-24] Sempre usar a skill `nuxt`**
   Do instead: consultar primeiro os padrões de Nuxt 4 antes de editar rotas, layouts, middleware, plugins ou composables do `mecanix-client`.

2. **[2026-03-24] Componentes Nuxt UI precisam seguir contrato acessível**
   Do instead: ao usar `USlideover`, `UModal` e afins, sempre fornecer `title` e `description` ou slots equivalentes compatíveis com a versão atual.

3. **[2026-03-24] SPA autenticada consumindo o `mecanix-core`**
   Do instead: iniciar Google no frontend, trocar token em `POST /api/auth/google` e tratar o app como painel fechado sem prerender da home.
