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

Para testar no celular, rode `npm run dev -- -H 0.0.0.0` e acesse pelo IP do computador na mesma rede (ex.: `http://192.168.0.10:3000/m/12`).

> Os dados ficam no banco Neon (Postgres). O esquema está em `db/schema.sql`. As telas se atualizam sozinhas (consulta a cada 5 s com a aba visível e logo após cada ação).

## Stack

Next.js 15 (App Router) · Postgres (Neon) via `pg` · React 19 · TypeScript · Tailwind CSS 4 · TanStack Query · Zustand · Zod · Recharts · qrcode.react · sonner · lucide-react

## Rotas e papéis

| Rota | Quem acessa | O que faz |
|---|---|---|
| `/` | todos | painel da demo |
| `/m/[mesa]` | cliente (sem login) | cardápio, carrinho, pedido, minha comanda, chamar garçom, pedir a conta |
| `/login` | equipe | login mockado por papel |
| `/garcom` | garçom | mapa de mesas, abrir comanda, lançar pedido, prontos, chamados |
| `/kds/cozinha`, `/kds/bar` | cozinha / bar | produção em 3 colunas com timer e alerta sonoro |
| `/caixa` | caixa | comandas, baixa de pagamento, estorno, caixa do dia, histórico |
| `/admin` | admin | dashboard, cardápio, setores, mesas & QR, usuários, configurações |
| `/imprimir/qr` | admin | folha A4 com os QR codes das mesas |
| `/403`, `/sessao-expirada`, `/offline`, 404 | — | telas de sistema |

O **admin** acessa todas as áreas. A sessão da equipe expira em 12h (um expediente).

## Fluxo completo em duas abas

1. Aba 1: abra `/m/11` (cliente). Aba 2: entre como **Cozinha** e abra `/kds/cozinha`. Clique em **Ativar som**.
2. No cliente, adicione um petisco e envie. Quando pedir o código da mesa, use **3302**.
3. O pedido aparece no KDS na hora, com destaque dourado e alerta. Avance: *Iniciar preparo → Marcar pronto*.
4. Entre como **Garçom** em outra aba: o pedido aparece em *Prontos*. Marque como entregue.
5. No cliente, abra *Minha comanda* → **Pedir a conta**.
6. Entre como **Caixa**: a mesa aparece no topo. Registre um ou mais pagamentos (ex.: Pix + dinheiro com troco). Quando o total é quitado, a comanda fecha e a mesa é liberada.

Mesas já em uso na demo: 2 (código 4821), 4 (chamando, 1937), 8 (pediu a conta), 11 (3302), 16 (6610).

## Segurança do QR

O QR impresso é fixo (`/m/12`). Para evitar pedidos de fora do bar, o pedido só é aceito quando:
- o garçom **abriu a comanda** da mesa; e
- o cliente informou o **código de 4 dígitos** gerado na abertura (pedido uma vez por celular).

Essa validação roda no servidor (`src/server/handlers`), com limite de tentativas contra quem tenta adivinhar o código. Nome e celular do cliente são obrigatórios.

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
