# Duke | Drinks e Choperia — Front-end

Cardápio digital via QR code e gestão de pedidos do Duke (Shopping Belvedere, Volta Redonda - RJ).
Next.js com front-end e API no mesmo projeto, usando Postgres (Neon). As telas chamam `POST /api/rpc/<operação>`; a regra de negócio, a autorização e o acesso ao banco ficam todos no servidor (`src/server`).

## Como rodar

Pré-requisito: um arquivo `.env.local` na raiz (não vai para o git) com:

```
DATABASE_URL=postgresql://...           # connection string do Neon (projeto duke-drinks)
SESSION_SECRET=<string aleatória, 32+ caracteres>
ALLOW_DEMO_RESET=false                   # true permite o admin APAGAR o movimento (comandas/pedidos/pagamentos)
```

```bash
npm install
npm run dev          # desenvolvimento, em http://localhost:3000
# ou, para produção local:
npm run build && npm run start
```

A página inicial é um painel de demonstração com atalhos para todas as telas. Acessos de demonstração (senha `duke123`): `admin`, `rafael`/`bruna` (garçom), `marcos` (cozinha), `leo` (bar), `juliana` (caixa). **Troque as senhas antes de usar de verdade** (Admin → Usuários).

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
