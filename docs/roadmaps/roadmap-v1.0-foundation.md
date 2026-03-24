# Roadmap V1.0 — Fundação (Mecanix Client)

> **Status**: Projeto iniciado · Zero funcionalidades implementadas  
> **Referência app mobile**: `mecanix-app/` — todas as funcionalidades abaixo espelham o app, exceto assinatura/pagamento

## Objetivo

App web (Nuxt 4 + Nuxt UI v4) para donos de oficina acompanharem dados e realizarem operações via navegador desktop/mobile, consumindo a mesma API REST do `mecanix-core`. A assinatura/pagamento permanece exclusiva do app mobile via RevenueCat.

## Stack técnica

| Camada          | Tecnologia                                                   |
| --------------- | ------------------------------------------------------------ |
| Framework       | Nuxt 4 + Vue 3                                               |
| UI              | Nuxt UI v4 + TailwindCSS v4                                  |
| Ícones          | `@iconify-json/lucide` + `@iconify-json/simple-icons`        |
| HTTP            | `$fetch` nativo do Nuxt + composables personalizados         |
| Auth            | Token Sanctum persistido em cookie (owners via Google OAuth) |
| Package manager | pnpm                                                         |

## Variáveis de ambiente

```env
NUXT_PUBLIC_API_URL=http://localhost:8000/api
NUXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Fase 1 — Autenticação

> Apenas **donos de loja** acessam o mecanix-client. Funcionários usam o app mobile.

### Composable `useAuth()`

- [ ] `user` — estado reativo do usuário autenticado (`Ref<User | null>`)
- [ ] `token` — token Sanctum (persistido em cookie seguro)
- [ ] `login(googleToken)` — chama `POST /api/auth/google`, persiste token
- [ ] `logout()` — chama `POST /api/logout`, apaga cookie e redireciona para `/login`
- [ ] `refresh()` — chama `GET /api/me` para reidratar usuário ao recarregar página
- [ ] Plugin `auth.client.ts` — executa `refresh()` no startup do app

### Páginas

- [ ] `/login` — tela de login:
  - Botão "Entrar com Google" (redireciona para OAuth do Google via mecanix-core)
  - Estado de loading durante autenticação
- [ ] `/oauthredirect` — recebe o token do Google OAuth, persiste e redireciona para `/`
- [ ] Middleware global `auth.ts` — redireciona para `/login` se não autenticado; redireciona para `/` se já autenticado e tentar acessar `/login`

### Tipos base

```ts
interface User {
	id: number;
	name: string;
	email: string | null;
	is_admin: boolean;
	is_employee: false; // client web só para owners
	created_at: string;
	updated_at: string;
}
```

---

## Fase 2 — Layout base

### `layouts/default.vue` (autenticado)

- [ ] Sidebar de navegação com itens:
  - Dashboard (`/`)
  - Checklists (`/checklists`)
  - Empresas (`/companies`)
  - Clientes (`/customers`)
  - Funcionários (`/employees`)
  - Perfil (`/profile`)
- [ ] Colapsável em telas menores (hamburguer)
- [ ] Avatar + nome do usuário no rodapé do sidebar
- [ ] Botão de logout
- [ ] Toggle de tema (light / dark / system) via Nuxt UI `useColorMode()`

### `layouts/auth.vue` (não autenticado)

- [ ] Tela cheia centralizada, sem sidebar
- [ ] Logo do Mecanix

### Componentes globais

- [ ] `AppToast` — feedback de sucesso/erro usando `useToast()` do Nuxt UI
- [ ] `AppConfirm` — modal de confirmação de exclusão reutilizável
- [ ] `AppEmpty` — estado vazio padrão (para listas sem resultado)
- [ ] `AppLoading` — spinner de carregamento de página
- [ ] Página `error.vue` — erros 404/500 com botão de voltar ao início

---

## Fase 3 — Dashboard

> **API**: `GET /api/dashboard?employee_user_id={id}`  
> **Referência**: `mecanix-app/app/(tabs)/index.tsx`

- [ ] Página `/` (home):
  - Card "Checklists este mês" (count)
  - Card "Veículos vistoriados este mês" (count)
  - Cards de totais: Clientes, Empresas, Veículos, Templates de checklist
  - Tabela "Execuções recentes":
    - Nome do checklist
    - Placa do veículo + nome do cliente
    - Executado por (funcionário)
    - Data de execução
    - Status (concluído / rascunho)
  - Seção "Checklists por funcionário" (lista/gráfico de barras) — visível se houver funcionários
- [ ] Filtro de funcionário (select) — retorna stats filtradas do mesmo endpoint
- [ ] Botão de atualizar (refresh)
- [ ] Composable `useDashboard()` com `data`, `loading`, `refresh()`

---

## Fase 4 — Empresas

> **API**: `GET|POST /api/companies` · `GET|PUT|DELETE /api/companies/{id}` · `DELETE /api/companies/{id}/logo`  
> **Referência**: `mecanix-app/app/(tabs)/manage/companies/`

- [ ] Página `/companies` — listagem:
  - Grid de cards com logo, nome, CNPJ
  - Busca em tempo real por nome ou CNPJ
  - Botão "Nova empresa"
  - Ações por card: editar, excluir (com confirmação)
- [ ] Drawer (ou modal) "Criar empresa":
  - Campos: nome (obrigatório), CNPJ (obrigatório, com formatação e validação)
  - Upload de logo: imagem, máx 2 MB, preview antes de salvar
- [ ] Drawer "Editar empresa":
  - Editar nome e CNPJ
  - Substituir / remover logo
- [ ] Composable `useCompanies()` — `list`, `create()`, `update()`, `remove()`, `removeLogo()`

### Campos exibidos

| Campo  | Descrição                           |
| ------ | ----------------------------------- |
| `name` | Nome da empresa                     |
| `cnpj` | CNPJ formatado (XX.XXX.XXX/XXXX-XX) |
| `logo` | URL da logo ou avatar com iniciais  |

---

## Fase 5 — Clientes

> **API**: `GET|POST /api/customers` · `GET|PUT|DELETE /api/customers/{id}`  
> **Referência**: `mecanix-app/app/(tabs)/manage/customers/`

- [ ] Página `/customers` — listagem:
  - Busca por nome, CPF/CNPJ, telefone, e-mail
  - Lista ordenada alfabeticamente
  - Cada item: nome, CPF/CNPJ formatado, telefone (link WhatsApp direto se disponível)
  - Botão "Novo cliente"
  - Ações: editar, excluir (com confirmação)
- [ ] Drawer "Criar cliente":
  - Campos: nome (obrigatório), CPF ou CNPJ (obrigatório, com validação), telefone (opcional, DDD + número), e-mail (opcional)
- [ ] Drawer "Editar cliente"
- [ ] Página `/customers/{id}` — detalhes do cliente:
  - Dados cadastrais
  - Lista de veículos do cliente com link para cada um
  - Botão "Novo veículo para este cliente"
- [ ] Composable `useCustomers()` — `list`, `search`, `create()`, `update()`, `remove()`

### Campos exibidos

| Campo    | Descrição                                            |
| -------- | ---------------------------------------------------- |
| `name`   | Nome completo ou razão social                        |
| `tax_id` | CPF (XXX.XXX.XXX-XX) ou CNPJ formatado               |
| `phone`  | Telefone com link WhatsApp (`wa.me/55{ddd}{number}`) |
| `email`  | E-mail com link `mailto:`                            |

---

## Fase 6 — Veículos

> **API**: `GET /api/vehicles/paginated` · `POST /api/vehicles` · `GET|PUT|DELETE /api/vehicles/{id}` · `GET /api/customers/{id}/vehicles`  
> **Mileage**: `GET|POST|PUT|DELETE /api/vehicle-mileage-history` · `GET /api/vehicles/{id}/mileage-history`  
> **Referência**: `mecanix-app/app/(tabs)/manage/customers/[id]/vehicles/`

- [ ] Página `/vehicles` — listagem paginada:
  - Busca com debounce por placa, modelo, nome do cliente
  - Paginação com cursor (20/página) + botão "Carregar mais"
  - Cada item: placa formatada, modelo, cliente, última quilometragem, barra de progresso de checklists
  - Botão "Novo veículo"
  - Ações: editar, excluir (com confirmação)
- [ ] Drawer "Criar veículo":
  - Campos: placa (obrigatório, com formatação), modelo, ano, cor
  - Select "Cliente" com busca (`GET /api/customers?q=`)
- [ ] Drawer "Editar veículo"
- [ ] Página `/vehicles/{id}` — detalhes:
  - Dados do veículo + cliente
  - **Histórico de quilometragem**:
    - Tabela: data, quilometragem, tipo (manual/checklist), notas
    - Botão "Registrar quilometragem" (somente `source_type = 'manual'`)
    - Editar e excluir registros manuais
  - Lista dos últimos checklists executados (link para `/checklists/{id}`)
- [ ] Composable `useVehicles()` — `list`, `paginated`, `byCustomer`, `create()`, `update()`, `remove()`
- [ ] Composable `useMileageHistory(vehicleId)` — `list`, `create()`, `update()`, `remove()`

### Campos exibidos

| Campo                                | Descrição                             |
| ------------------------------------ | ------------------------------------- |
| `license_plate`                      | Placa formatada (ABC-1234 ou ABC1D23) |
| `model`                              | Modelo do veículo                     |
| `model_year`                         | Ano (se disponível)                   |
| `color`                              | Cor (se disponível)                   |
| `latest_mileage`                     | Última km registrada                  |
| `checklists_done / checklists_total` | Progresso de checklists               |

---

## Fase 7 — Templates de Checklist

> **API**: `GET|POST /api/checklist-templates` · `GET|PUT|DELETE /api/checklist-templates/{id}` · `GET|POST /api/checklist-templates/{id}/items` · `GET|PUT|DELETE /api/checklist-items/{id}` · `GET /api/vehicle-types`  
> **Referência**: `mecanix-app/app/(tabs)/manage/checklists/`

### Templates

- [ ] Página `/checklists/templates` — listagem:
  - Cards com nome e tipo de veículo (ou "Todos os tipos")
  - Busca por nome
  - Botão "Novo template"
  - Ações: editar, excluir (com confirmação), ver itens
- [ ] Drawer "Criar template":
  - Campos: nome (obrigatório), tipo de veículo (select opcional)
- [ ] Drawer "Editar template"

### Itens do template

- [ ] Página `/checklists/templates/{id}` — detalhe + itens:
  - Lista de itens ordenada por `order_index`
  - Drag-and-drop para reordenar (atualiza `order_index` via `PUT /api/checklist-items/{id}`)
  - Cada item exibe: nome, descrição, badges de flags (obrigatório, completável, múltipla resposta), opções de resposta
  - Botão "Novo item"
  - Ações por item: editar, excluir (com confirmação)
- [ ] Drawer "Criar item":
  - Campos: nome (obrigatório), descrição, is_completable, is_required, allows_multiple_responses
  - Seção de opções de resposta: adicionar opções com label e ordenação
- [ ] Drawer "Editar item"
- [ ] Composable `useChecklistTemplates()` — `list`, `create()`, `update()`, `remove()`
- [ ] Composable `useChecklistItems(templateId)` — `list`, `create()`, `update()`, `remove()`, `reorder()`

### Campos de item

| Campo                       | Tipo                     | Descrição                              |
| --------------------------- | ------------------------ | -------------------------------------- |
| `name`                      | string                   | Nome do item                           |
| `description`               | string \| null           | Descrição opcional                     |
| `order_index`               | number                   | Posição na lista                       |
| `is_completable`            | boolean                  | Item pode ser marcado como concluído   |
| `is_required`               | boolean                  | Item obrigatório para fechar checklist |
| `allows_multiple_responses` | boolean                  | Permite selecionar múltiplas opções    |
| `options`                   | `{label, order_index}[]` | Opções de resposta                     |

---

## Fase 8 — Execuções de Checklist

> **API**: `GET /api/vehicles/paginated` · `POST /api/vehicles/{id}/checklists` · `GET /api/vehicle-checklists/{id}` · `PUT /api/vehicle-checklist-items/{id}` · `GET /api/vehicle-checklists/{id}/pdf`  
> **Referência**: `mecanix-app/app/(tabs)/checklists/`

- [ ] Página `/checklists` — seleção de veículo:
  - Campo de busca com debounce (mín 4 chars)
  - Lista paginada: placa, modelo, cliente, última km, progresso de checklists
  - Botão "Iniciar checklist" por veículo → abre seletor de template
  - Link para detalhes do veículo
- [ ] Drawer seletor de template — lista templates disponíveis (filtrado por tipo de veículo se o veículo tiver tipo)
- [ ] Página `/checklists/vehicles/{vehicleId}` — histórico de execuções do veículo:
  - Lista: nome, data, executado por, status (concluído/rascunho)
  - Botão "Novo checklist"
- [ ] Página `/checklists/{checklistId}` — detalhe / execução:
  - Campo de quilometragem no topo
  - Lista de itens agrupados (se houver categorias)
  - Por item: checkbox (is_checked), select de opções, campo de nota
  - Indicação visual de item obrigatório não preenchido
  - Status atual (rascunho / concluído) — modo somente leitura se concluído
  - Botão "Exportar PDF" (baixar PDF do checklist)
  - Executado por: nome do funcionário (ou owner)
- [ ] Composable `useVehicleChecklists()` — `list`, `create()`, `getDetail()`, `updateItem()`
- [ ] Função `downloadChecklistPdf(checklistId)` — chama `/api/vehicle-checklists/{id}/pdf`, faz download do arquivo

---

## Fase 9 — Funcionários

> **API**: `GET|POST /api/companies/{id}/employees` · `PATCH /api/companies/{id}/employees/{id}` · `PUT /api/companies/{id}/employees/{id}/password`  
> **Referência**: `mecanix-app/app/(tabs)/manage/employees/` · `mecanix-core/docs/roadmaps/roadmap-v1.9-company-employees.md`

- [ ] Página `/employees` — listagem:
  - Cards agrupados por empresa
  - Cada card: nome, username, label do cargo (Gerente / Técnico / Personalizado), badge ativo/inativo
  - Botão "Novo funcionário"
  - Ações: editar, desativar, redefinir senha
- [ ] Drawer "Criar funcionário":
  - Select de empresa
  - Campos: nome, username (validação: 3–50 chars, alfanumérico + `_` e `-`), senha temporária
  - Seletor de cargo: Gerente / Técnico
  - Grade de permissões editável por módulo/ação (modules: companies, customers, vehicles, checklist_templates, checklists, employees; actions: view, create, update, delete)
  - Badge "Personalizado" ao divergir do preset
- [ ] Drawer "Editar funcionário":
  - Editar nome, username, cargo, permissões
  - Confirmação ao trocar preset: "Vai redefinir todas as permissões para [Gerente/Técnico]. Confirmar?"
  - Toggle ativo/inativo
- [ ] Modal "Redefinir senha" (nova senha + confirmação)
- [ ] Composable `useEmployees()` — `list`, `create()`, `update()`, `resetPassword()`

### Grade de permissões

| Módulo              | view   | create | update | delete |
| ------------------- | ------ | ------ | ------ | ------ |
| companies           | toggle | toggle | toggle | toggle |
| customers           | toggle | toggle | toggle | toggle |
| vehicles            | toggle | toggle | toggle | toggle |
| checklist_templates | toggle | toggle | toggle | toggle |
| checklists          | toggle | toggle | toggle | toggle |
| employees           | toggle | toggle | toggle | toggle |

---

## Fase 10 — Perfil e Configurações

> **API**: `GET /api/me` · `PUT /api/user` · `PUT /api/user/password`  
> **Referência**: `mecanix-app/app/(tabs)/profile/`

- [ ] Página `/profile`:
  - Avatar com iniciais do nome
  - Seção "Dados pessoais": editar nome e e-mail (form inline com save)
  - Seção "Alterar senha": senha atual + nova senha + confirmação
  - Seção "Aparência": toggle light / dark / system
  - Botão "Sair" (logout com confirmação)
- [ ] Nota informativa: "Para gerenciar sua assinatura, acesse o app Mecanix no Android."
- [ ] Composable `useProfile()` — `updateInfo()`, `updatePassword()`

---

## Referências

- `mecanix-core/` — API backend (Laravel)
- `mecanix-app/` — App mobile de referência de funcionalidades
- `mecanix-core/docs/new_road.md` — Roadmap master do produto
- `mecanix-core/docs/roadmaps/roadmap-v1.9-company-employees.md` — Modelo de funcionários e permissões
- `mecanix-core/docs/roadmaps/roadmap-v1.8-revenuecat.md` — Assinaturas (somente leitura no client web)
