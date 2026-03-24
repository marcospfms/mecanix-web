# Mecanix Client

App web para donos de oficina gerenciarem empresas, clientes, veículos, checklists e funcionários via navegador. Consome a mesma API REST do `mecanix-core`; não inclui fluxo de assinatura/pagamento (exclusivo do app mobile).

## Stack

| Camada          | Tecnologia                                            |
| --------------- | ----------------------------------------------------- |
| Framework       | Nuxt 4 + Vue 3                                        |
| UI              | Nuxt UI v4 + TailwindCSS v4                           |
| Ícones          | `@iconify-json/lucide` + `@iconify-json/simple-icons` |
| HTTP            | `$fetch` nativo do Nuxt / composables personalizados  |
| Auth            | Token Sanctum (owners via Google OAuth)               |
| Package manager | pnpm                                                  |

## Variáveis de ambiente

Crie um `.env` na raiz do projeto:

```env
NUXT_PUBLIC_API_URL=http://localhost:8000/api
NUXT_PUBLIC_APP_URL=http://localhost:3000
```

## Desenvolvimento

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

## Outros comandos

```bash
pnpm build        # build de produção
pnpm preview      # preview do build local
pnpm lint         # ESLint
pnpm typecheck    # vue-tsc
```

## Estrutura

```
app/
  pages/          # Rotas (file-based routing do Nuxt)
  components/     # Componentes Vue reutilizáveis
  assets/         # CSS global
docs/
  roadmaps/       # Roadmaps de desenvolvimento
nuxt.config.ts
```

## Autenticação

Apenas **donos de loja** (owners) acessam o client web. O login é feito via Google OAuth usando a mesma rota `POST /api/auth/google` do mecanix-core. Funcionários utilizam exclusivamente o app mobile.

## Roadmap

Ver `docs/roadmaps/`.

## API

Documentação dos endpoints disponível em `mecanix-core/docs/`.
