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
| Package manager | yarn                                                  |

## Variáveis de ambiente

Copie o arquivo de exemplo e ajuste os valores:

```bash
cp .env.example .env
```

Ver [.env.example](.env.example) para as variáveis disponíveis.

## Desenvolvimento

```bash
yarn install
yarn dev          # http://localhost:3000
```

## Outros comandos

```bash
yarn build        # build de produção
yarn preview      # preview do build local
yarn lint         # ESLint
yarn typecheck    # vue-tsc
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

## Deploy

Os ambientes devem receber as variáveis públicas do Nuxt no serviço do `mecanix-web`.
