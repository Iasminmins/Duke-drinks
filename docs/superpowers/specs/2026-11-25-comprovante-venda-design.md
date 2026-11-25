# Comprovante de venda

- **Objetivo:** permitir entregar ao cliente um comprovante simples das vendas registradas no caixa de balcão, no visual aprovado.
- **Abordagens:** criar uma rota de impressão independente ou imprimir a venda selecionada na própria tela do caixa. A segunda opção foi escolhida por reutilizar os dados já carregados e permitir reimpressão sem nova consulta/aba.
- **Escopo:** imprimir automaticamente após registrar venda e permitir reimpressão nas vendas recentes; mostrar estabelecimento, número/data, itens e quantidades, subtotal, desconto, total, forma de pagamento e troco quando houver. Usar papel térmico de 80 mm.
- **Limites:** é somente um comprovante de venda; não deve parecer NFC-e, conter QR fiscal, chave de acesso ou alegar autorização da SEFAZ. A emissão fiscal existente permanece separada.
- **Decisões de implementação:** usar os dados persistidos retornados pela venda, os dados de `getEstabelecimento()` e o navegador (`window.print`) com CSS de impressão.
