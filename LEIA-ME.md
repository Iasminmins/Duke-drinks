# Site do Comandou

Página de venda do Comandou. É um site estático (HTML, CSS e um pouco de JS), separado do sistema do Duke.
Não precisa instalar nada nem rodar build.

## Arquivos

- `index.html`: página de venda
- `termos.html` e `privacidade.html`: termos de uso e política de privacidade (modelos, revisar antes de publicar)
- `style.css`: visual (cores e fontes no começo do arquivo)
- `config.js`: **o único arquivo que precisa editar**: WhatsApp de vendas, endereço do cadastro e e-mail
- `site.js`: liga os botões ao WhatsApp/cadastro

## Antes de publicar

1. Em `config.js`, coloque o WhatsApp de vendas (55 + DDD + número).
2. Quando o cadastro do sistema estiver no ar, coloque o endereço em `cadastroUrl`. Até lá, "Testar grátis" abre o WhatsApp.
3. Em `termos.html` e `privacidade.html`, preencha os dados entre colchetes (razão social, CNPJ, cidade, encarregado) e apague o aviso amarelo.
4. Os preços estão escritos no `index.html` (seção Planos). Se mudar em `src/lib/planos.ts` do sistema, mude aqui também.

## Testar tudo no computador (site + cadastro + sistema)

Dê dois cliques em **`ABRIR-TESTE.cmd`**. Ele abre duas janelas (sistema e site) e o navegador em http://localhost:5500.

- Usa o **banco de TESTE** (`.env.teste.local` do projeto do sistema). O Duke que está no ar não é tocado.
- O projeto `C:\Duke drinks` precisa estar na branch `saas-multitenant`.
- Caminho completo: site → "Testar grátis" → cadastro → "Entrar no meu sistema" → painel com os primeiros passos.
- Quem já tem conta: site → "Entrar" → e-mail e senha → painel (o sistema descobre o negócio sozinho).
- Painel da plataforma (seus clientes): http://localhost:3000/plataforma, senha `teste-local-123`.
- Para parar, feche as duas janelas.

Só para ver a página, sem o sistema: abra o `index.html` no navegador.

## Publicar na Vercel

Crie um projeto novo na Vercel apontando para esta pasta (ou para um repositório só dela), sem framework.
Use o domínio principal (ex.: `comandou.com.br`). O sistema do Duke continua no endereço dele.
