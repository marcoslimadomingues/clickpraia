(function () {
  "use strict";

  var state = window.CLICKPRAIA;
  var lista = document.getElementById("lista-imoveis");

  if (!state || !Array.isArray(state.imoveis) || !lista) {
    return;
  }

  var fallbackImg = "assets/images/placeholder.svg";

  function escHtml(valor) {
    return String(valor || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escAttr(valor) {
    return escHtml(valor).replace(/"/g, "&quot;");
  }

  function montarWhatsapp(numero, nome) {
    var telefone = String(numero || state.whatsappPadrao || "").replace(/\D/g, "");
    var texto = encodeURIComponent("Ola! Tenho interesse no imovel: " + nome);
    return "https://wa.me/" + telefone + "?text=" + texto;
  }

  function montarGaleria(imovel, indiceImovel) {
    var fotos = Array.isArray(imovel.fotos) && imovel.fotos.length ? imovel.fotos : [fallbackImg];
    return fotos
      .slice(0, 6)
      .map(function (foto, indiceFoto) {
        var eager = indiceImovel === 0 && indiceFoto === 0;
        return (
          '<figure><img src="' +
          escAttr(foto) +
          '" alt="Foto ' +
          (indiceFoto + 1) +
          " do imovel " +
          escAttr(imovel.nome) +
          '" loading="' +
          (eager ? "eager" : "lazy") +
          '" fetchpriority="' +
          (eager ? "high" : "low") +
          '" decoding="async" onerror="this.onerror=null;this.src=\'' +
          fallbackImg +
          '\';"></figure>'
        );
      })
      .join("");
  }

  function montarCard(imovel, indiceImovel) {
    var linkWhatsapp = montarWhatsapp(imovel.whatsapp, imovel.nome);
    var pageLink = String(imovel.pagina || "#");
    return (
      '<article class="card" id="' +
      escAttr(imovel.id) +
      '">' +
      '<header class="card-header">' +
      "<h3>" +
      escHtml(imovel.nome) +
      "</h3>" +
      '<span class="badge">' +
      escHtml(imovel.praia) +
      "</span>" +
      "</header>" +
      '<p class="price-tag"><span class="valor">' +
      escHtml(imovel.preco) +
      '</span><span class="unidade">' +
      escHtml(imovel.unidade || "") +
      "</span></p>" +
      '<div class="galeria" aria-label="Galeria de fotos">' +
      montarGaleria(imovel, indiceImovel) +
      "</div>" +
      '<div class="info">' +
      '<p class="descricao">' +
      escHtml(imovel.descricao) +
      "</p>" +
      '<ul class="lista">' +
      "<li><strong>Tipo:</strong><span>" +
      escHtml(imovel.tipo) +
      "</span></li>" +
      "<li><strong>Capacidade:</strong><span>" +
      escHtml(imovel.capacidade) +
      "</span></li>" +
      "<li><strong>Quartos:</strong><span>" +
      escHtml(imovel.quartos) +
      "</span></li>" +
      "<li><strong>Banheiros:</strong><span>" +
      escHtml(imovel.banheiros) +
      "</span></li>" +
      "<li><strong>Vagas:</strong><span>" +
      escHtml(imovel.vagas) +
      "</span></li>" +
      "<li><strong>Locacao:</strong><span>" +
      escHtml(imovel.minimo) +
      "</span></li>" +
      "<li><strong>Check-in:</strong><span>" +
      escHtml(imovel.checkin) +
      "</span></li>" +
      "<li><strong>Check-out:</strong><span>" +
      escHtml(imovel.checkout) +
      "</span></li>" +
      "</ul>" +
      '<div class="cta-group">' +
      '<a class="cta" href="' +
      escAttr(linkWhatsapp) +
      '" target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>' +
      '<a class="cta secondary" href="' +
      escAttr(pageLink) +
      '">Ver pagina do imovel</a>' +
      "</div>" +
      "</div>" +
      "</article>"
    );
  }

  lista.innerHTML = state.imoveis
    .map(function (imovel, indiceImovel) {
      return montarCard(imovel, indiceImovel);
    })
    .join("");

  var jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: state.imoveis.map(function (imovel, idx) {
      return {
        "@type": "ListItem",
        position: idx + 1,
        item: {
          "@type": "LodgingBusiness",
          name: imovel.nome,
          description: imovel.descricao,
          areaServed: imovel.praia,
          image: (Array.isArray(imovel.fotos) ? imovel.fotos : [fallbackImg]).slice(0, 6),
          offers: {
            "@type": "Offer",
            priceCurrency: "BRL",
            price: (imovel.preco.match(/\d+/g) || ["0"]).join(""),
            availability: "https://schema.org/InStock"
          }
        }
      };
    })
  };

  var schemaTag = document.createElement("script");
  schemaTag.type = "application/ld+json";
  schemaTag.text = JSON.stringify(jsonLd);
  document.head.appendChild(schemaTag);
})();
