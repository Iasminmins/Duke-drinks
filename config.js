// Configuração do site do Comandou. Só mexa aqui.
window.COMANDOU = {
  // Endereço do cadastro no sistema (quando o domínio estiver no ar), ex.: "https://comandou.app/cadastro".
  // Enquanto estiver vazio, os botões "Testar grátis" abrem o WhatsApp.
  cadastroUrl: "",

  // Cadastro usado quando o site está aberto no seu computador (ABRIR-TESTE.cmd). Não aparece no site publicado.
  cadastroUrlTeste: "http://localhost:3000/cadastro",

  // Login único (e-mail + senha) do sistema, usado no botão "Entrar". Ex.: "https://comandou.app/acessar".
  entrarUrl: "",
  // O mesmo, quando o site está aberto no seu computador (ABRIR-TESTE.cmd).
  entrarUrlTeste: "http://localhost:3000/acessar",

  // WhatsApp de vendas: só números, com 55 + DDD. Ex.: "5524999998888".
  whatsapp: "",

  // Mensagem que já vem escrita quando a pessoa abre o WhatsApp.
  mensagemWhatsapp: "Oi! Vi o site do Comandou e quero saber mais.",

  // E-mail de contato que aparece nos termos e na política de privacidade.
  email: "contato@comandou.com.br",
};
