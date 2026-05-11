# Roadmap V1.1 — Correções e Completude (Mecanix Client)

> **Status**: Concluído ✅  
> **Originado por**: Auditoria cruzada entre `mecanix-core/routes/api.php` e `mecanix-client` (todas as rotas do owner)  
> **Referência app mobile**: `mecanix-app/` — guia de funcionalidades esperadas  
> **Pré-requisito**: Roadmap v1.0 completo (Fases 1–10)

---

## Metodologia da auditoria

Comparação linha a linha entre:

- `mecanix-core/routes/api.php` — todas as rotas do grupo `auth` (owner + employee), excluindo as exclusivas de employee
- `mecanix-client/app/composables/` + `app/pages/` — implementação atual do client web
- `mecanix-app/features/` + `app/(tabs)/` — funcionalidades existentes no app mobile como referência de UX

Critérios de inclusão no v1.1:

- Rotas usadas pelo **owner** no app mobile que ainda não existem no client web
- Bugs confirmados onde o client chama uma URL incorreta
- Gaps de UX em páginas que existem mas estão incompletas vs. app

---

## Resumo executivo dos gaps encontrados

| #   | Tipo           | Módulo                                                  | Severidade |
| --- | -------------- | ------------------------------------------------------- | ---------- | --- |
| 1   | 🐛 BUG         | Funcionários — reset de senha                           | Alta       | ✅  |
| 2   | ❌ MISSING     | Assinatura — dados do plano no perfil do owner          | Média      | ✅  |
| 3   | ~~DESCARTADO~~ | ~~Assinatura — histórico de assinaturas~~               | ~~Baixa~~  | —   |
| 4   | ❌ MISSING     | Veículos — edição de registro de quilometragem          | Média      | ✅  |
| 5   | ⚠️ INCOMPLETO  | Veículos — exclusão de registro de quilometragem        | Média      | ✅  |
| 6   | ❌ MISSING     | Checklists — quilometragem vinculada ao checklist       | Baixa      | ✅  |
| 7   | ~~DESCARTADO~~ | ~~Funcionários — indicador `must_change_password`~~     | ~~Baixa~~  | —   |
| 8   | ❌ MISSING     | Veículos — endpoint seletor leve (`/vehicles/selector`) | Baixa      | ✅  |

> **Fases 3 e 7 descartadas**: histórico de assinatura será gerenciado pelo app com Play Store/App Store; indicador `must_change_password` permanece exclusivo do app mobile.

> **Nota sobre "Parts"**: O app mobile possui um diretório `features/parts/` e rotas `manage/parts/[id]/` mas os hooks estão vazios e a pasta `[id]/` está vazia. Não há nenhuma rota `/api/parts` em `api.php`. Concluímos que o módulo de peças **não está implementado no backend** e **não deve ser incluído no v1.1**.

---

## Fase 1 — Bug: URL errada no reset de senha de funcionário

### Problema

O composable `useEmployees.ts` chama a rota:

```ts
// ATUAL (incorreto)
;`/companies/${companyId}/employees/${employeeId}/reset-password`
```

Mas a rota real definida em `mecanix-core/routes/api.php` é:

```php
// CORRETO
Route::put('companies/{company}/employees/{employee}/password', ...)
```

Isso causaria um erro HTTP 404 toda vez que o owner tentar redefinir a senha de um funcionário.

### Correção

- [x] Em `app/composables/useEmployees.ts`, função `resetPassword`:
  - Substituir `/reset-password` por `/password` no final da URL

### Impacto

- Funcionalidade completamente quebrada sem essa correção
- Prioridade: **Alta — deve ser o primeiro item a corrigir**

---

## Fase 2 — Assinatura: dados do plano no perfil do owner

### Contexto

O owner acessa o mecanix-client exclusivamente via login social Google. Logo, a seção de **Alterar Senha** em `profile.vue` não faz sentido e deve ser removida.

Na mesma página de perfil, exibir os dados da assinatura vindos de `GET /subscription`, mantendo o `UAlert` que informa que o gerenciamento (upgrade/cancel) é feito pelo app mobile.

Endpoint:

```
GET /subscription
```

Retorno:

```ts
{
  subscription: Subscription // nome, status, datas, auto_renews
  period: {
    year: number
    month: number
  }
  usage: SubscriptionUsage // companies/customers/vehicles/templates/checklists_per_month
}
```

### O que falta no client

- Nenhuma chamada à rota `GET /subscription` existe no client
- A seção de "Alterar Senha" existe em `profile.vue` mas não se aplica ao login via Google

### Tarefas

- [x] Criar `app/composables/useSubscription.ts`
  - Tipos: `Subscription`, `SubscriptionUsage`, `UsageItem`, `ScheduledChange`, `SubscriptionLimits`
  - `useSubscription()`: composable ref-based, `GET /subscription`, padrão `useAPI` + watch em `[auth.hydrated, auth.token]`
  - Tratar resposta vazia/null (plano free ou sem assinatura ativa)
- [x] Em `app/pages/profile.vue`:
  - **Remover** completamente a seção "Alterar Senha" (campos: senha atual, nova senha, confirmar) — owner usa apenas Google OAuth
  - **Remover** `updatePassword` do import de `useProfile`
  - Adicionar seção "Assinatura" ao final do perfil, antes ou depois do UAlert existente:
    - Card com nome do plano, badge de status (`active`→verde, `expired`→vermelho, `canceled`→cinza, `pending`→amarelo)
    - Datas de início e renovação/expiração
    - Lista de uso do período (cada recurso: usado / limite ou "ilimitado")
    - Manter o `UAlert` existente informando que upgrade/cancelamento é feito no app mobile
  - Tratar estado de carregamento e ausência de assinatura ativa

---

## ~~Fase 3 — Assinatura: histórico de assinaturas~~ _(Descartado)_

> Histórico de assinaturas será gerenciado pelo app mobile via Play Store / App Store. Não há necessidade de exibição no client web.

---

## Fase 4 — Veículos: edição e exclusão de registro de quilometragem

### Contexto

O app mobile possui telas dedicadas:

- `manage/customers/[id]/vehicles/[vehicleId]/mileage/edit.tsx` — editar registro
- `manage/customers/[id]/vehicles/[vehicleId]/mileage/add.tsx` — adicionar registro

Os endpoints já existem no backend:

```
PUT  /vehicle-mileage-history/{id}
DELETE /vehicle-mileage-history/{id}
```

O composable `useMileageHistory` no client **já implementa** `updateMileage` e `deleteMileage`, portanto a camada de dados está pronta.

### Gap identificado

A página `vehicles/[vehicleId].vue` no client **já consome** `updateMileage` e `deleteMileage` nos scripts, e declara as refs `mileageMode`, `editingMileage`, etc. Porém, ao revisar o template HTML, é preciso confirmar se o botão de edição e o botão de exclusão aparecem na lista de histórico de quilometragem.

### Tarefas

- [x] Revisar o template de `app/pages/vehicles/[vehicleId].vue` — seção de histórico de quilometragem
  - Verificar se cada item da lista possui ações "Editar" e "Excluir" acessíveis
  - Se os botões não existem: adicionar menu de contexto (dropdown `UDropdownMenu`) em cada linha do histórico
  - Ao clicar em editar: abrir o drawer `mileageFormOpen` com `mileageMode = 'edit'` e `editingMileage` populado
  - Ao clicar em excluir: abrir `mileageConfirmOpen` com confirmação (`AppConfirm`)
- [x] Garantir que o formulário do drawer respeite `mileageMode`:
  - Mode `create`: envia `createMileage(payload)`
  - Mode `edit`: envia `updateMileage(editingMileage.id, payload)`
- [x] Testar fluxo ponta a ponta: adicionar → editar → excluir um registro

---

## Fase 5 — Checklists: quilometragem vinculada ao checklist

### Contexto

O app mobile usa a rota:

```
GET /vehicle-checklists/{id}/mileage-history
```

Para exibir a quilometragem que foi registrada durante a execução daquele checklist específico, dentro da tela de detalhe do checklist.

### Gap atual

O composable `useChecklists.ts` do client **não consome** esta rota. A tela de execução do checklist (`checklists/[checklistId].vue`) mostra os itens do checklist e permite registrar quilometragem, mas **não exibe** a quilometragem já registrada naquele checklist.

### Tarefas

- [x] Adicionar `useChecklistMileage(checklistId)` em `useChecklists.ts`:
  - `GET /vehicle-checklists/${checklistId}/mileage-history`
  - Retorna `VehicleMileageHistory | null`
- [x] Em `checklists/[checklistId].vue`:
  - Pre-popular `localMileage` e `mileageSaved = true` se já houver registro vinculado
  - Campo e botão desabilitados quando `mileageSaved === true`
  - Exibir data do registro existente abaixo do campo

---

## ~~Fase 6 — Funcionários: indicador `must_change_password`~~ _(Descartado)_

> Fluxo de troca de senha temporária permanece exclusivo do app mobile. Nenhuma ação necessária no client web.

---

## Fase 7 — Veículos: endpoint seletor leve

### Contexto

A rota `GET /vehicles/selector` retorna uma lista enxuta de veículos (sem todos os campos) para uso em selects/dropdowns, com suporte a `?q=` e `?limit=`. O app mobile usa isso no `useVehicleSelector.ts`.

### Gap

O client web não consome este endpoint. Atualmente os selects de veículo (ex: ao iniciar um checklist em `checklists/index.vue` ou ao associar um veículo a um checklist) usam a listagem completa `GET /vehicles`, que retorna todos os campos e pode ser pesada.

### Tarefas

- [x] Adicionar `useVehiclesSelector()` em `useVehicles.ts`:
  - `GET /vehicles/selector?q=...&limit=50`
  - Retorna `Vehicle[]` (subset dos campos)
  - Suporte a debounce de search
- [x] Composable disponível para uso em seletores futuros
  - `checklists/index.vue` já usa `useVehiclesPaginated()` (adequado para listagem paginada)

---

## Priorização recomendada

```
Sprint 1 (bugs críticos):
  → Fase 1: Fix URL reset de senha funcionário                    [30 min]

Sprint 2 (funcionalidade de maior valor para o owner):
  → Fase 2: Dados de assinatura + remoção de "Alterar Senha"      [2–3h]
  → Fase 4: Edit/delete de km na tela de veículo                  [2h]

Sprint 3 (completude):
  → Fase 5: Km vinculada ao checklist                             [1–2h]

Sprint 4 (otimização de performance):
  → Fase 7: Endpoint seletor leve de veículos                     [1–2h]
```

---

## Rotas API cobertas no client (referência)

| Rota                                       | Método            | Composable              | Status                       |
| ------------------------------------------ | ----------------- | ----------------------- | ---------------------------- |
| `/me`                                      | GET               | `useAuth`               | ✅                           |
| `/logout`                                  | POST              | `useAuth`               | ✅                           |
| `/user`                                    | PUT               | `useProfile`            | ✅                           |
| `/user/password`                           | PUT               | `useProfile`            | N/A — owner usa Google OAuth |
| `/dashboard`                               | GET               | `useDashboard`          | ✅                           |
| `/subscription`                            | GET               | `useSubscription`       | ✅                           |
| `/subscription/history`                    | GET               | —                       | N/A — descartado             |
| `/companies`                               | CRUD + logo       | `useCompanies`          | ✅                           |
| `/employees`                               | GET               | `useEmployees`          | ✅                           |
| `/companies/{id}/employees`                | POST/PATCH/DELETE | `useEmployees`          | ✅                           |
| `/companies/{id}/employees/{id}/password`  | PUT               | `useEmployees`          | ✅                           |
| `/customers`                               | CRUD              | `useCustomers`          | ✅                           |
| `/customers/{id}/vehicles`                 | GET               | `useCustomers`          | ✅                           |
| `/vehicles/paginated`                      | GET               | `useVehicles`           | ✅                           |
| `/vehicles/selector`                       | GET               | `useVehicles`           | ✅                           |
| `/vehicles`                                | CRUD              | `useVehicles`           | ✅                           |
| `/vehicle-mileage-history`                 | POST              | `useVehicles`           | ✅                           |
| `/vehicle-mileage-history/{id}`            | PUT               | `useVehicles`           | ✅                           |
| `/vehicle-mileage-history/{id}`            | DELETE            | `useVehicles`           | ✅                           |
| `/vehicle-types`                           | GET               | `useVehicles`           | ✅                           |
| `/checklist-templates`                     | CRUD + items      | `useChecklistTemplates` | ✅                           |
| `/vehicles/{id}/checklists`                | GET/POST          | `useChecklists`         | ✅                           |
| `/vehicle-checklists/{id}`                 | GET/DELETE        | `useChecklists`         | ✅                           |
| `/vehicle-checklists/{id}/pdf`             | GET               | `useChecklists`         | ✅                           |
| `/vehicle-checklists/{id}/mileage-history` | GET               | `useChecklists`         | ✅                           |
| `/vehicle-checklist-items/{id}`            | PUT               | `useChecklists`         | ✅                           |
| `/vehicle-checklist-items/{id}/notes`      | PUT               | `useChecklists`         | ✅                           |
