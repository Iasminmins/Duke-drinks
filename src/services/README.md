# Services: camada que as telas usam

As telas só chamam as funções desta pasta. Cada uma é um wrapper fino sobre `rpc()` (`_rpc.ts`), que faz
`POST /api/rpc/<nome>` com os argumentos. **Não há regra de negócio aqui.**

Onde as coisas moram:

| O quê | Onde |
|---|---|
| Registro das operações expostas ao navegador | `src/server/registry.ts` |
| Rota única que atende as chamadas (sessão, origem, erros) | `src/app/api/rpc/[fn]/route.ts` |
| Regras, autorização e SQL de cada área | `src/server/handlers/*.ts` |
| Conexão com o Postgres (Neon) | `src/server/db.ts` |
| Sessão (cookie assinado, 12h) | `src/server/sessao.ts` |
| Esquema do banco | `db/schema.sql` |

## Como acrescentar uma operação

1. Escreva a função em `src/server/handlers/<area>.ts` (primeiro argumento `ctx`; chame `exigir(ctx, "papel")`
   para equipe, ou confira o código da comanda para o cliente).
2. Registre em `src/server/registry.ts`.
3. Acrescente o wrapper em `src/services/<area>.service.ts`: `return rpc("nome", ...args)`.

## Autorização

- **Equipe:** login com usuário e senha gera um cookie `httpOnly` assinado. A cada chamada o servidor confere se o
  usuário ainda existe e está ativo. O admin acessa tudo.
- **Cliente (QR):** sem login. Acessa só a própria comanda, com o código de 4 dígitos. Tentativas erradas são limitadas.
- O servidor **ignora** qualquer `usuarioId` enviado pelo navegador e usa o usuário da sessão.

## Limites conhecidos

- O limitador de tentativas (login e código) fica em memória: vale por instância do servidor. Em hospedagem com várias
  instâncias, troque por um armazenamento compartilhado.
- Fotos de produto enviadas pelo admin são gravadas como texto no banco (limite ~1,5 MB). Para muitas fotos, passe a usar
  um armazenamento de arquivos e guardar só a URL.
- As telas atualizam por consulta periódica (5 s). Para tempo real instantâneo, troque `useRealtimeSync` por SSE/WebSocket.
