# Comanda Digital — SaaS de pedidos para bares, restaurantes e lanchonetes

Cardápio digital via QR code, pedidos direto na produção (cozinha/bar/chapa), garçom e caixa.
Multi-tenant: cada negócio tem o próprio endereço (`duke.seudominio.com.br`) e só enxerga os próprios dados.
O Duke (Shopping Belvedere, Volta Redonda) é o primeiro cliente (`slug: duke`).

Next.js com front-end e API no mesmo projeto, usando Postgres (Neon). As telas chamam `POST /api/rpc/<operação>`;
a regra de negócio, a autorização e o acesso ao banco ficam todos no servidor (`src/server`).

## Multi-tenant em uma página

- **Endereço → negócio.** `src/lib/host.ts` lê o subdomínio. O domínio principal é o site do produto
  (`/`, `/cadastro`, `/plataforma`); qualquer subdomínio é um negócio.
- **Isolamento no banco (RLS).** Toda requisição roda numa transação com `app.eid = <negócio>` e
  `set local role app_rls` (`comTenant` em `src/server/db.ts`). As policies de cada tabela filtram por
  `estabelecimento_id`, então mesmo uma query sem `where` só vê o negócio certo. FKs compostas impedem
  apontar para registro de outro negócio. Os handlers não precisam saber de tenant.
- **Sessão presa ao negócio.** O cookie leva o `eid`; cookie de um negócio não vale em outro subdomínio.
- **Assinatura.** `tenants.status` (trial/ativo/suspenso/cancelado) + `trial_ate`/`pago_ate`. Vencido ou
  suspenso → a API responde 402 e a equipe cai em `/assinatura`. 5 dias de tolerância após `pago_ate`.
- **Planos e tipos de negócio** ficam em `src/lib/planos.ts` (preços, limite de usuários, categorias e
  setores iniciais por tipo).
- **Painel da plataforma** (`/plataforma` no domínio principal): lista os negócios, uso, receita mensal,
  e o botão "recebi o pagamento: liberar +1 mês".

Regra para código novo: use sempre `query`/`um`/`tx` de `src/server/db.ts`. Só a camada de plataforma
(`handlers/plataforma.ts`, `tenant.ts`) usa `poolPlataforma()`, que ignora o RLS.

## Como rodar

Pré-requisito: um arquivo `.env.local` na raiz (não vai para o git) com:

```
DATABASE_URL=postgresql://...           # connection string do Neon
SESSION_SECRET=<string aleatória, 32+ caracteres>
NEXT_PUBLIC_APP_DOMAIN=localhost:3000    # em produção: seudominio.com.br
DEFAULT_TENANT_SLUG=                     # opcional: negócio usado em endereços fora do domínio (ex.: URL antiga da Vercel)
PLATAFORMA_SENHA=<senha forte, 12+>      # entra no /plataforma
PLATAFORMA_PIX_CHAVE=                    # aparece na tela de assinatura
PLATAFORMA_WHATSAPP=5524999999999        # botão de WhatsApp da tela de assinatura
NEXT_PUBLIC_PRODUTO_NOME=Comanda Digital # nome do produto
ALLOW_DEMO_RESET=false                   # true permite o admin APAGAR o movimento do próprio negócio
```

```bash
npm install
npm run dev
# site do produto:  http://localhost:3000
# um negócio:       http://duke.localhost:3000   (o Chrome resolve *.localhost sozinho)
```

### Banco

- `db/schema.sql`: esquema original (single-tenant).
- `db/migrations/001_multitenant.sql`: transforma em multi-tenant. Aplicar uma vez:
  `node db/migrar.mjs db/migrations/001_multitenant.sql`

### Deploy (Vercel)

1. Domínio próprio na Vercel com o principal **e** o curinga: `seudominio.com.br` e `*.seudominio.com.br`
   (o curinga exige os nameservers da Vercel).
2. Variáveis de ambiente acima, com `NEXT_PUBLIC_APP_DOMAIN=seudominio.com.br`.
3. Enquanto o domínio não estiver pronto, `DEFAULT_TENANT_SLUG=duke` mantém o Duke funcionando na URL atual.

Para testar no celular, rode `npm run dev -- -H 0.0.0.0` e acesse pelo IP do computador na mesma rede (o link do cliente é o da comanda: `/c/<token>`, que o garçom mostra em “Mostrar QR”).

> Os dados ficam no banco Neon (Postgres). O esquema está em `db/schema.sql`. As telas se atualizam sozinhas (consulta a cada 5 s com a aba visível e logo após cada ação).

## Stack

Next.js 15 (App Router) · Postgres (Neon) via `pg` · React 19 · TypeScript · Tailwind CSS 4 · TanStack Query · Zustand · Zod · Recharts · qrcode.react · sonner · lucide-react

## Rotas e papéis

| Rota | Quem acessa | O que faz |
|---|---|---|
| `/` | todos | painel da demo |
| `/c/[token]` | cliente (sem login) | cardápio, carrinho, pedido, minha comanda, chamar garçom, pedir a conta |
| `/login` | equipe | login mockado por papel |
| `/garcom` | garçom | lista de comandas, abrir comanda (número + QR), lançar pedido, prontos, chamados |
| `/kds/cozinha`, `/kds/bar` | cozinha / bar | produção em 3 colunas com timer e alerta sonoro |
| `/caixa` | caixa | comandas, baixa de pagamento, estorno, caixa do dia, histórico |
| `/admin` | admin | dashboard, cardápio, setores, mesas (opcionais), usuários, configurações |
| `/imprimir/comanda/[numero]` | garçom / caixa | cartão da comanda com número e QR para imprimir |
| `/403`, `/sessao-expirada`, `/offline`, 404 | — | telas de sistema |

O **admin** acessa todas as áreas. A sessão da equipe expira em 12h (um expediente).

## Como funciona (comanda individual, sem mesa)

A unidade do sistema é a **comanda**, não a mesa. Cada comanda tem um **número** (como a equipe chama) e um **QR** próprio.

1. O garçom (ou o caixa) toca em **Nova comanda** e informa nome e celular. Número do cartão e mesa são opcionais; sem número, o sistema usa o próximo livre.
2. Em **Mostrar QR**, o cliente aponta a câmera: o cardápio abre direto na comanda dele, sem digitar código. Também dá para **copiar o link** (WhatsApp) ou **imprimir o cartão**.
3. O cliente pede de qualquer lugar do bar. O pedido aparece no KDS (cozinha/bar) com o número da comanda, e o garçom recebe o aviso de pronto, chamado e conta.
4. O cliente pede a conta pelo celular; o caixa busca pelo número ou nome da comanda e dá baixa. Paga a conta, o QR passa a mostrar “Conta paga” e o número volta a ficar livre.

## Segurança do QR

O QR leva um **token secreto** (24 caracteres aleatórios) por comanda, não adivinhável. O pedido só é aceito quando a comanda está aberta e o token confere. A validação roda no servidor (`src/server/handlers`), com limite de tentativas. Comanda encerrada ou cancelada não aceita pedidos.

## Estrutura

```
src/
  app/            rotas (App Router)
  components/
    ui/           Button, Dialog, MoneyInput, StatusBadge, EmptyState, ConfirmDialog…
    brand/        Logo, Mascote, Coroa (placeholders)
    layout/       PainelShell (sidebar), RoleGuard, UserMenu, banners
    cliente/      CardapioLista, ProductCard, ProdutoSheet, ClienteApp
    kds/ garcom/ caixa/ admin/
  services/       wrappers finos: cada função chama a API (`rpc`)
  server/         regras, autorização e SQL (só roda no servidor)
  app/api/rpc/    rota única que atende as operações
  stores/         Zustand (sessão, carrinho)
  hooks/          atualização periódica, relógio, online/offline
  lib/            formatação pt-BR, cálculos, rótulos, som
  types/          entidades
```

## Identidade visual

Tokens em `src/app/globals.css` (bloco `@theme`). Nenhum componente usa hex solto.
Logo e mascote: coloque os arquivos em `public/brand` e aponte em `src/lib/brand.ts`.

## Back-end

Veja `src/services/README.md` (arquitetura, autorização e limites conhecidos) e `db/schema.sql`.
