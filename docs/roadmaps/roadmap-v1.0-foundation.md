# Roadmap V1.0 — Fundação (Mecanix Client)

> **Status**: Concluído ✅ — Fases 1–10 implementadas  
> **Referência app mobile**: `mecanix-app/` — todas as funcionalidades abaixo espelham o app, exceto assinatura/pagamento

## Objetivo

App web (Nuxt 4 + Nuxt UI v4) para donos de oficina acompanharem dados e realizarem operações via navegador desktop/mobile, consumindo a mesma API REST do `mecanix-core`. A assinatura/pagamento permanece exclusiva do app mobile via RevenueCat.

## Stack técnica

| Camada          | Tecnologia                                                                       |
| --------------- | -------------------------------------------------------------------------------- |
| Framework       | Nuxt 4 + Vue 3                                                                   |
| UI              | Nuxt UI v4 + TailwindCSS v4                                                      |
| Ícones          | `@iconify-json/lucide` + `@iconify-json/simple-icons`                            |
| HTTP            | `$fetch` nativo do Nuxt + composables personalizados                             |
| Auth            | Google OAuth iniciado no frontend + token Sanctum persistido para consumo da API |
| Package manager | yarn                                                                             |

## Premissas de arquitetura

- O `mecanix-client` é um **app fechado e autenticado**, sem landing pública neste projeto
- Estratégia de render principal: **SPA autenticada**
- A página `/` é protegida e não deve ser prerenderizada
- Apenas **owners** acessam o client web
- Funcionários devem ser barrados mesmo que autentiquem com sucesso no fluxo técnico

## Variáveis de ambiente

```env
NUXT_PUBLIC_API_URL=http://localhost:8000/api
NUXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Fase 1 — Autenticação

> Apenas **donos de loja** acessam o mecanix-client. Funcionários usam o app mobile.

### Composable `useAuth()`

- [x] `user` — estado reativo do usuário autenticado (`Ref<User | null>`)
- [x] `token` — token Sanctum persistido em cookie
- [x] `login(googleToken)` — chama `POST /api/auth/google`, persiste token
- [x] `logout()` — chama `POST /api/logout`, apaga cookie e redireciona para `/login`
- [x] `refresh()` — chama `GET /api/me` para reidratar usuário ao recarregar página
- [x] Reidratação centralizada no fluxo atual de auth/middleware — executa `refresh()` quando houver sessão válida, sem plugin duplicado
- [x] Regra adicional: se `user.is_employee === true`, impedir acesso ao client web e encerrar sessão/redirect

### Páginas

- [x] `/login` — tela de login:
  - Botão "Entrar com Google"
  - OAuth iniciado no frontend Nuxt e finalizado contra `POST /api/auth/google`
  - Estado de loading durante autenticação
- [x] `/oauthredirect` — rota de compatibilidade/retorno para o fluxo de acesso
- [x] Middleware global `auth.global.ts` — redireciona para `/login` se não autenticado; redireciona para `/` se já autenticado e tentar acessar `/login`
- [x] Regra de owner-only embutida no fluxo de auth — bloqueia funcionário autenticado

### Tipos base

```ts
interface User {
  id: number
  name: string
  email: string | null
  is_admin: boolean
  is_employee: false // client web só para owners
  created_at: string
  updated_at: string
}
```

---

## Fase 2 — Layout base

### `layouts/default.vue` (autenticado)

- [x] Sidebar de navegação com itens:
  - Dashboard (`/`)
  - Checklists (`/checklists`)
  - Empresas (`/companies`)
  - Clientes (`/customers`)
  - Funcionários (`/employees`)
  - Perfil (`/profile`)
- [x] Colapsável em telas menores (hamburguer + `USlideover`)
- [x] Avatar + nome do usuário no rodapé do sidebar
- [x] Botão de logout
- [x] Toggle de tema (light / dark / system) via Nuxt UI `useColorMode()`

### `layouts/auth.vue` (não autenticado)

- [x] Tela cheia centralizada, sem sidebar
- [x] Logo do Mecanix

### Componentes globais

- [x] `AppToast` — feedback de sucesso/erro usando `useToast()` do Nuxt UI
- [x] `AppConfirm` — modal de confirmação de exclusão reutilizável
- [x] `AppEmpty` — estado vazio padrão (para listas sem resultado)
- [x] `AppLoading` — spinner de carregamento de página
- [x] Página `error.vue` — erros 404/500 com botão de voltar ao início

> Situação atual da fase 2: concluída. O shell autenticado, o menu mobile, os componentes-base de UI e a página global de erro já existem.

---

## Fase 3 — Dashboard

> **API**: `GET /api/dashboard?employee_user_id={id}`  
> **Referência**: `mecanix-app/app/(tabs)/index.tsx`

- [x] Página `/` (home):
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
- [x] Filtro de funcionário (select) — retorna stats filtradas do mesmo endpoint
- [x] Botão de atualizar (refresh)
- [x] Composable `useDashboard()` com `data`, `loading`, `refresh()`

> Observação: como o projeto é uma SPA autenticada, o dashboard deve depender de fetch client-side / hydrated data, não de prerender.

> Situação atual da fase 3: concluída. O dashboard já consome `GET /api/dashboard`, suporta filtro por funcionário e reaproveita a estrutura conceitual do app mobile em uma composição web mobile first.

---

## Fase 4 — Empresas

> **API**: `GET|POST /api/companies` · `GET|PUT|DELETE /api/companies/{id}` · `DELETE /api/companies/{id}/logo`  
> **Referência**: `mecanix-app/app/(tabs)/manage/companies/`

- [x] Página `/companies` — listagem:
  - Grid de cards com logo, nome, CNPJ
  - Busca em tempo real por nome ou CNPJ
  - Botão "Nova empresa"
  - Ações por card: editar, excluir (com confirmação)
- [x] Drawer (ou modal) "Criar empresa":
  - Campos: nome (obrigatório), CNPJ (obrigatório, com formatação e validação)
  - Upload de logo: imagem, máx 2 MB, preview antes de salvar
- [x] Drawer "Editar empresa":
  - Editar nome e CNPJ
  - Substituir / remover logo
- [x] Composable `useCompanies()` — `list`, `create()`, `update()`, `remove()`, `removeLogo()`

### Campos exibidos

| Campo  | Descrição                           |
| ------ | ----------------------------------- |
| `name` | Nome da empresa                     |
| `cnpj` | CNPJ formatado (XX.XXX.XXX/XXXX-XX) |
| `logo` | URL da logo ou avatar com iniciais  |

> Situação atual da fase 4: concluída. A tela web já permite buscar, criar, editar, excluir e gerenciar a logo das empresas em uma experiência mobile first com slideover.

---

## Fase 5 — Clientes

> **API**: `GET|POST /api/customers` · `GET|PUT|DELETE /api/customers/{id}`  
> **Referência**: `mecanix-app/app/(tabs)/manage/customers/`

- [x] Página `/customers` — listagem:
  - Busca por nome, CPF/CNPJ, telefone, e-mail
  - Lista ordenada alfabeticamente
  - Cada item: nome, CPF/CNPJ formatado, telefone (link WhatsApp direto se disponível)
  - Botão "Novo cliente"
  - Ações: editar, excluir (com confirmação)
- [x] Drawer "Criar cliente":
  - Campos: nome (obrigatório), CPF ou CNPJ (obrigatório, com validação), telefone (opcional, DDD + número), e-mail (opcional)
- [x] Drawer "Editar cliente"
- [x] Página `/customers/{id}` — detalhes do cliente:
  - Dados cadastrais
  - Lista de veículos do cliente com link para cada um
  - Botão "Novo veículo para este cliente"
- [x] Composable `useCustomers()` — `list`, `search`, `create()`, `update()`, `remove()`

### Campos exibidos

| Campo    | Descrição                                            |
| -------- | ---------------------------------------------------- |
| `name`   | Nome completo ou razão social                        |
| `tax_id` | CPF (XXX.XXX.XXX-XX) ou CNPJ formatado               |
| `phone`  | Telefone com link WhatsApp (`wa.me/55{ddd}{number}`) |
| `email`  | E-mail com link `mailto:`                            |

> Situação atual da fase 5: concluída. A listagem, os formulários, o detalhe do cliente e a integração com veículos já estão implantados no client web com o mesmo padrão-base adotado nos módulos anteriores.

---

## Fase 6 — Veículos

> **API**: `GET /api/vehicles/paginated` · `POST /api/vehicles` · `GET|PUT|DELETE /api/vehicles/{id}` · `GET /api/customers/{id}/vehicles`  
> **Mileage**: `GET|POST|PUT|DELETE /api/vehicle-mileage-history` · `GET /api/vehicles/{id}/mileage-history`  
> **Referência**: `mecanix-app/app/(tabs)/manage/customers/[id]/vehicles/`

- [x] Página `/vehicles` — listagem inicial:
  - Busca por placa, modelo e nome do cliente
  - Botão "Novo veículo"
  - Ações por card: editar, excluir (com confirmação) e ver detalhes
  - Botão "Carregar mais" no frontend para ampliar a lista visível
- [x] Drawer "Criar veículo":
  - Campos: cliente, placa, modelo, ano, cor
- [x] Drawer "Editar veículo"
- [x] Página `/vehicles/{id}` — detalhes:
  - Dados do veículo + cliente
  - **Histórico de quilometragem**:
    - Lista de registros com data, quilometragem, tipo e notas
    - Botão "Registrar quilometragem" para `source_type = 'manual'`
    - Editar e excluir registros manuais
- [x] Composable `useVehicles()` — `list`, `create()`, `update()`, `remove()`
- [x] Composable `useMileageHistory(vehicleId)` — `list`, `create()`, `update()`, `remove()`
- [x] Composable `useVehiclesPaginated()` — paginação cursor com busca remota (min 4 chars)
- [x] Migrar a listagem de veículos para paginação cursor real — implementado em `/checklists` via `GET /api/vehicles/paginated`
- [ ] Adicionar select de cliente com busca remota, se a base crescer a ponto de tornar o select local insuficiente
- [x] Exibir últimos checklists do veículo no detalhe

### Campos exibidos

| Campo                                | Descrição                             |
| ------------------------------------ | ------------------------------------- |
| `license_plate`                      | Placa formatada (ABC-1234 ou ABC1D23) |
| `model`                              | Modelo do veículo                     |
| `model_year`                         | Ano (se disponível)                   |
| `color`                              | Cor (se disponível)                   |
| `latest_mileage`                     | Última km registrada                  |
| `checklists_done / checklists_total` | Progresso de checklists               |

> Fase 6 concluída. `useVehiclesPaginated()` implementado, vehicle_type_id adicionado ao tipo Vehicle, paginação cursor usada em `/checklists`. O select de cliente com busca remota permanece como melhoria futura condicional ao crescimento da base.

---

## Fase 7 — Templates de Checklist

> **API**: `GET|POST /api/checklist-templates` · `GET|PUT|DELETE /api/checklist-templates/{id}` · `GET|POST /api/checklist-templates/{id}/items` · `GET|PUT|DELETE /api/checklist-items/{id}` · `GET /api/vehicle-types`  
> **Referência**: `mecanix-app/app/(tabs)/manage/checklists/`

### Templates

- [x] Página `/checklists` — listagem inicial de templates:
  - Cards com nome e tipo de veículo (ou "Todos os tipos")
  - Busca por nome
  - Botão "Novo template"
  - Ações: editar, excluir (com confirmação), ver itens
- [x] Drawer "Criar template":
  - Campos: nome (obrigatório), tipo de veículo (select opcional)
- [x] Drawer "Editar template"
- [x] Integração no menu lateral como módulo `Templates`

### Itens do template

- [x] Página `/checklists/templates/{templateId}` — detalhe + itens (redesenhada com card de resumo, infoBlocks tipo/contagem/data, itens compactos com badge obrigatório, ações inline, opções aninhadas)
  - Lista de itens ordenada por `order_index`
  - Ações por item: editar, excluir (com confirmação)
  - Opções de resposta renderizadas no card do item
  - Exclusão do template a partir do detalhe
  - Lista de itens ordenada por `order_index`
  - Ações por item: editar, excluir (com confirmação)
  - Opções de resposta renderizadas no card do item
  - Exclusão do template a partir do detalhe
- [x] Drawer "Criar item":
  - Campos: nome (obrigatório), descrição, ordem, is_completable, is_required, allows_multiple_responses
  - Seção de opções de resposta
- [x] Drawer "Editar item"
- [x] Reordenação drag-and-drop dos itens
- [x] Composable `useChecklistTemplates()` — `list`, `create()`, `update()`, `remove()`
- [x] Composable `useChecklistItems(templateId)` — `list`, `create()`, `update()`, `remove()`, `reorderItems()`
- [x] Reorder / `reorder()` para alinhar ao roadmap final

> Fase 7 concluída. Drag-and-drop nativo HTML5 implementado em `/checklists/templates/{templateId}` com `localItems`, `reorderItems()` nos composables e alerta de reordenamento.

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

- [x] Página `/checklists` — seleção inicial de veículo:
  - Busca com debounce mínimo de 4 caracteres
  - Paginação real via `GET /api/vehicles/paginated`
  - Lista com placa, modelo, cliente, última km e progresso de checklists
  - Botão "Iniciar checklist" por veículo com seletor de template
  - Botão "Histórico" por veículo
- [x] Evoluir `/checklists` para o contrato final do roadmap:
  - Debounce com mínimo de 4 caracteres
  - Paginação real via `GET /api/vehicles/paginated`
  - Link explícito para detalhes do veículo na própria listagem
- [x] Drawer seletor de template:
  - Lista templates disponíveis e inicia nova execução
  - Filtra templates por tipo de veículo quando `vehicle_type_id` estiver disponível no payload
- [x] Filtrar templates por tipo de veículo quando o payload do veículo expuser essa informação
- [x] Página `/checklists/vehicles/{vehicleId}` — histórico de execuções do veículo:
  - Lista nome, data, executado por e status
  - Botão "Novo checklist"
  - Ação de exclusão
- [x] Página `/checklists/{checklistId}` — detalhe / execução inicial:
  - Exibe status da execução e dados do veículo
  - Permite marcar itens completáveis
  - Permite selecionar opções de resposta
  - Permite editar notas por item
  - Exibe executado por
  - Exporta PDF
  - Permite excluir a execução
- [x] Fechar o detalhe `/checklists/{checklistId}` conforme o roadmap final:
  - Campo de quilometragem no topo com registro via `POST /api/vehicle-mileage-history`
  - Indicação visual de item obrigatório não preenchido (ring vermelho no card)
  - Modo somente leitura quando o checklist estiver concluído
- [x] Composables para execução implementados:
  - `useVehicleChecklists(vehicleId)` para listagem do histórico (`useChecklistHistory` depreciado)
  - `useChecklistDetail(checklistId)` para detalhe da execução
  - `useChecklistActions()` para criar execução, atualizar itens, atualizar notas, excluir, gerar PDF e registrar quilometragem
- [x] Consolidar ou renomear a camada de composables para refletir o contrato final planejado de `useVehicleChecklists()`
- [x] Geração de PDF implementada via `generatePdf(checklistId)`

> Fase 8 concluída. Paginação real com debounce min-4 implementada em `/checklists`, templates filtrados por tipo de veículo, campo de quilometragem no detalhe do checklist, modo somente leitura para checklists concluídos, indicador visual de itens obrigatórios não preenchidos e consolidação para `useVehicleChecklists()`.

---

## Fase 9 — Funcionários

> **API**: `GET|POST /api/companies/{id}/employees` · `PATCH /api/companies/{id}/employees/{id}` · `DELETE /api/companies/{id}/employees/{id}` · `PUT /api/companies/{id}/employees/{id}/reset-password`  
> **Referência**: `mecanix-app/app/(tabs)/manage/employees/` · `mecanix-core/docs/roadmaps/roadmap-v1.9-company-employees.md`

- [x] Página `/employees` — listagem:
  - Cards agrupados por empresa
  - Cada card: nome, username, label do cargo (Gerente / Técnico), badges ativo/inativo + aviso de troca de senha pendente
  - Botão "Novo funcionário"
  - Ações: editar, desativar (com confirmação), redefinir senha
- [x] Drawer "Criar funcionário":
  - Select de empresa
  - Campos: nome, username (validação: 3–50 chars, letras minúsculas + números + `.`, `_`, `-`), senha temporária
  - Seletor de cargo: Gerente / Técnico (com descrição de cada um)
  - `must_change_password = true` automático no backend
- [x] Drawer "Editar funcionário":
  - Editar nome, username, cargo
  - Toggle ativo/inativo
- [x] Modal "Redefinir senha" (nova senha + confirmação; revoga tokens)
- [x] Composable `useEmployees()` — `list`, `create()`, `update()`, `deactivateEmployee()`, `resetPassword()`
- [ ] Grade de permissões granulares por módulo/ação (evolução futura, v2.0)

> Fase 9 concluída. A grade de permissões granulares não foi implementada pois depende da evolução do backend descrita em `roadmap-v1.9-company-employees.md` e está planejada para v2.0.

---

## Fase 10 — Perfil e Configurações

> **API**: `GET /api/me` · `PUT /api/user` · `PUT /api/user/password`  
> **Referência**: `mecanix-app/app/(tabs)/profile/`

- [x] Página `/profile`:
  - Avatar com iniciais do nome
  - Seção "Dados pessoais": editar nome e e-mail (form inline com save)
  - Seção "Alterar senha": senha atual + nova senha (mín. 8 chars) + confirmação
  - Seção "Aparência": toggle light / dark / system via `useColorMode()`
  - Botão "Sair" com confirmação via `AppConfirm`
- [x] Nota informativa: "Para gerenciar sua assinatura, acesse o app Mecanix no Android."
- [x] Composable `useProfile()` — `updateInfo()`, `updatePassword()`

> Fase 10 concluída.

---

## Referências

- `mecanix-core/` — API backend (Laravel)
- `mecanix-app/` — App mobile de referência de funcionalidades
- `mecanix-core/docs/new_road.md` — Roadmap master do produto
- `mecanix-core/docs/roadmaps/roadmap-v1.9-company-employees.md` — Modelo de funcionários e permissões
- `mecanix-core/docs/roadmaps/roadmap-v1.8-revenuecat.md` — Assinaturas (somente leitura no client web)
