(function () {
  var cfg = window.COMANDOU || {};
  var zap = (cfg.whatsapp || "").replace(/\D/g, "");
  var linkZap = zap ? "https://wa.me/" + zap + "?text=" + encodeURIComponent(cfg.mensagemWhatsapp || "") : "";

  // no computador (localhost ou arquivo aberto direto) usa o cadastro de teste
  var local = location.protocol === "file:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var cadastro = local ? cfg.cadastroUrlTeste || cfg.cadastroUrl : cfg.cadastroUrl;
  var entrar = local ? cfg.entrarUrlTeste || cfg.entrarUrl : cfg.entrarUrl;

  // "comecar" vai para o cadastro; sem cadastro configurado, vai para o WhatsApp; sem nenhum, para a seção final
  var destinos = {
    comecar: cadastro || linkZap || "#comecar",
    whatsapp: linkZap || (cfg.email ? "mailto:" + cfg.email : "#comecar"),
    // sem login configurado ainda, quem clica em Entrar fala com a gente
    entrar: entrar || linkZap || "#comecar",
  };

  document.querySelectorAll("[data-acao]").forEach(function (a) {
    var url = destinos[a.getAttribute("data-acao")];
    if (!url) return;
    a.setAttribute("href", url);
    // WhatsApp abre em outra aba; o cadastro abre na mesma
    if (/wa\.me\//.test(url)) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    }
  });

  var flutuante = document.querySelector(".zap");
  if (flutuante && linkZap) flutuante.hidden = false;

  document.querySelectorAll("[data-email]").forEach(function (el) {
    if (!cfg.email) return;
    el.textContent = cfg.email;
    if (el.tagName === "A") el.setAttribute("href", "mailto:" + cfg.email);
  });

  document.querySelectorAll("[data-ano]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  var topo = document.getElementById("topo");
  if (topo) {
    var marcar = function () { topo.classList.toggle("rolou", window.scrollY > 8); };
    marcar();
    window.addEventListener("scroll", marcar, { passive: true });
  }
})();
