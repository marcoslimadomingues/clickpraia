#!/usr/bin/env node
"use strict";
/*
 * Gerador estatico ClickPraia (Silus).
 * Le dados/imoveis.json, gera:
 *   - /<praia-slug>/<slug>/index.html      (uma pagina por imovel)
 *   - /<praia-slug>/index.html             (hub por praia, 2+ imoveis)
 *   - sitemap.xml (home + hubs + imoveis + guias fixos)
 * Sem dependencias externas. Rodar: node gerador/gerar.js
 */

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const DOMINIO = "https://clickpraia.com.br";
const WHATSAPP_PADRAO = "558599428060";

function slugPraia(praia) {
  return String(praia || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escHtml(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtBRL(valor) {
  if (valor == null) return null;
  return "R$ " + Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 0 });
}

function fmtDist(metros) {
  if (metros == null) return null;
  return metros >= 1000 ? (metros / 1000).toFixed(1).replace(".0", "") + " km" : metros + " m";
}

function waLink(numero, texto) {
  const tel = String(numero || WHATSAPP_PADRAO).replace(/\D/g, "");
  return "https://wa.me/" + tel + "?text=" + encodeURIComponent(texto);
}

function campoFicha(label, valor) {
  if (valor == null || valor === "") return "";
  return `<li><strong>${escHtml(label)}</strong><span>${escHtml(valor)}</span></li>`;
}

function tipoLabel(tipo) {
  const map = { casa: "Casa", apartamento: "Apartamento", chale: "Chalé", "chalé": "Chalé" };
  return map[tipo] || (tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : "Imóvel");
}

function gerarFAQ(imovel) {
  const perguntas = [
    {
      q: `Como funciona o pagamento da ${imovel.nome}?`,
      a: "Reserva combinada direto com o anfitriao pelo WhatsApp. Peca a forma de pagamento e as condicoes na conversa antes de confirmar a data."
    },
    {
      q: "Qual o horario de check-in e check-out?",
      a: "Horarios de entrada e saida sao confirmados na reserva pelo WhatsApp, pois podem variar conforme a temporada."
    },
    {
      q: imovel.aceita_pet == null ? "O imovel aceita animais de estimacao?" : `A ${imovel.nome} aceita pet?`,
      a: imovel.aceita_pet === true
        ? "Sim, este imovel aceita pet. Confirme regras e taxas eventuais direto no WhatsApp."
        : imovel.aceita_pet === false
        ? "Este imovel nao aceita pet."
        : "Confirme a politica de pets direto no WhatsApp antes de reservar."
    },
    {
      q: "Tem vaga de estacionamento?",
      a: imovel.vagas_garagem
        ? `Sim, ${imovel.vagas_garagem} vaga(s) de garagem inclusas.`
        : "Confirme a disponibilidade de vaga de garagem direto no WhatsApp."
    },
    {
      q: "Como chegar a Canoa Quebrada saindo de Fortaleza?",
      a: "Canoa Quebrada fica a cerca de 160 km de Fortaleza, geralmente entre 2h e 3h de carro pela CE-040, ou por onibus/transfer com saida de Fortaleza. Veja o guia \"Como ir de Fortaleza a Canoa Quebrada\" para detalhes."
    },
    {
      q: `Qual a distancia da ${imovel.nome} até a praia?`,
      a: imovel.distancia_praia_metros != null
        ? `Fica a aproximadamente ${fmtDist(imovel.distancia_praia_metros)} da praia, a pe.`
        : "Confirme a distancia exata direto no WhatsApp."
    }
  ];
  return perguntas;
}

function paginaImovel(imovel, outrosDaMesmaPraia) {
  const hoje = new Date().toISOString().slice(0, 10);
  const praiaSlug = slugPraia(imovel.praia);
  const url = `${DOMINIO}/${praiaSlug}/${imovel.slug}/`;
  const tipo = tipoLabel(imovel.tipo);
  const capacidadeTxt = imovel.capacidade ? `para ${imovel.capacidade} pessoas` : "";
  const distanciaTxt = imovel.distancia_praia_metros != null ? `${fmtDist(imovel.distancia_praia_metros)} da praia` : "";
  const tituloPartes = [`${tipo}${imovel.tem_piscina ? " com piscina" : ""} em ${imovel.praia}`, capacidadeTxt, imovel.quartos ? `${imovel.quartos} quartos` : "", distanciaTxt]
    .filter(Boolean);
  const titulo = tituloPartes.join(" — ").replace(" — " + capacidadeTxt, capacidadeTxt ? ` para ${imovel.capacidade} pessoas` : "");
  const h1 = `${tipo}${imovel.tem_piscina ? " com piscina" : ""} em ${imovel.praia}${capacidadeTxt ? " para " + imovel.capacidade + " pessoas" : ""}${imovel.quartos ? " — " + imovel.quartos + " quartos" : ""}${distanciaTxt ? ", " + distanciaTxt : ""}`;
  const descMeta = imovel.descricao_curta || `${tipo} em ${imovel.praia}, Aracati/CE. Fale direto no WhatsApp para disponibilidade e valores.`;
  const waMsg = `Ola! Tenho interesse no imovel: ${imovel.nome} (${imovel.praia}).`;
  const waHref = waLink(imovel.whatsapp || WHATSAPP_PADRAO, waMsg);
  const faq = gerarFAQ(imovel);

  const fichaItens = [
    campoFicha("Capacidade", imovel.capacidade ? `${imovel.capacidade} pessoas` : null),
    campoFicha("Quartos", imovel.quartos),
    campoFicha("Camas", imovel.camas),
    campoFicha("Banheiros", imovel.banheiros),
    campoFicha("Vagas de garagem", imovel.vagas_garagem),
    campoFicha("Distância da praia", fmtDist(imovel.distancia_praia_metros)),
    campoFicha("Distância da Broadway", fmtDist(imovel.distancia_broadway_metros))
  ].filter(Boolean).join("\n        ");

  const comodidades = [
    imovel.tem_piscina === true ? "Piscina" : null,
    imovel.aceita_pet === true ? "Aceita pet" : null,
    imovel.tem_ar === true ? "Ar-condicionado" : null,
    imovel.tem_wifi === true ? "Wi-Fi" : null,
    imovel.tem_churrasqueira === true ? "Churrasqueira" : null,
    imovel.tem_gerador === true ? "Gerador" : null
  ].filter(Boolean);

  const galeriaFotos = (imovel.fotos && imovel.fotos.length ? imovel.fotos : []).slice(0, 12);
  const temFotosReais = galeriaFotos.length > 0;
  const galeriaHtml = temFotosReais
    ? galeriaFotos
        .map((f, i) => {
          const eager = i === 0;
          return `<figure><picture>
          <source srcset="${escHtml(f.arquivo_webp || f.arquivo)}" type="image/webp">
          <img src="${escHtml(f.arquivo)}" alt="${escHtml(f.alt)}" width="800" height="600" loading="${eager ? "eager" : "lazy"}" fetchpriority="${eager ? "high" : "low"}" decoding="async" onerror="this.onerror=null;this.src='/assets/images/placeholder.svg';">
        </picture></figure>`;
        })
        .join("\n        ")
    : `<figure><img src="/assets/images/placeholder.svg" alt="Foto ainda não cadastrada de ${escHtml(imovel.nome)}" width="800" height="600" loading="eager"></figure>
        <!-- SILUS: substituir antes de publicar - fotos reais do imovel -->`;

  const diariaBaixa = fmtBRL(imovel.diaria_baixa);
  const diariaAlta = fmtBRL(imovel.diaria_alta);
  const tabelaDiarias = (diariaBaixa || diariaAlta || imovel.minimo_noites)
    ? `<div class="tabela-diarias-wrap"><table class="tabela-diarias">
        <caption>Diárias e mínimo de noites</caption>
        <thead><tr><th scope="col">Temporada</th><th scope="col">Valor</th></tr></thead>
        <tbody>
          <tr><th scope="row">Baixa temporada</th><td>${diariaBaixa ? diariaBaixa + " / noite" : "Consultar no WhatsApp"}</td></tr>
          <tr><th scope="row">Alta temporada</th><td>${diariaAlta ? diariaAlta + " / noite" : "Consultar no WhatsApp"}</td></tr>
          ${imovel.minimo_noites ? `<tr><th scope="row">Mínimo de noites</th><td>${escHtml(imovel.minimo_noites)}</td></tr>` : ""}
        </tbody>
      </table></div>`
    : `<p class="aviso-pendente"><!-- SILUS: substituir antes de publicar - precos --> Valores de diária a confirmar direto no WhatsApp.</p>`;

  const pontosProximos = [];
  if (imovel.distancia_praia_metros != null) pontosProximos.push(`Praia de ${imovel.praia}: ${fmtDist(imovel.distancia_praia_metros)}`);
  if (imovel.distancia_broadway_metros != null) pontosProximos.push(`Broadway (rua principal de Canoa Quebrada): ${fmtDist(imovel.distancia_broadway_metros)}`);
  const blocoProximo = pontosProximos.length
    ? `<ul class="lista-proximo">${pontosProximos.map((p) => `<li>${escHtml(p)}</li>`).join("")}</ul>`
    : `<p class="aviso-pendente"><!-- SILUS: substituir antes de publicar - pontos de referencia --> Distâncias a pé de mercado, farmácia e praia ainda não cadastradas.</p>`;

  const outrosHtml = outrosDaMesmaPraia
    .slice(0, 3)
    .map(
      (o) => `<li><a href="/${slugPraia(o.praia)}/${o.slug}/">${escHtml(o.nome)}</a></li>`
    )
    .join("\n        ");

  const breadcrumbJsonLd = {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ClickPraia", item: `${DOMINIO}/` },
      { "@type": "ListItem", position: 2, name: imovel.praia, item: `${DOMINIO}/${praiaSlug}/` },
      { "@type": "ListItem", position: 3, name: imovel.nome, item: url }
    ]
  };

  const faqJsonLd = {
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a }
    }))
  };

  const vacationRentalJsonLd = {
    "@type": "VacationRental",
    "@id": `${url}#imovel`,
    name: imovel.nome,
    description: imovel.descricao_longa || imovel.descricao_curta || null,
    url: url,
    dateModified: hoje,
    telephone: "+55" + (imovel.whatsapp || WHATSAPP_PADRAO).replace(/^55/, ""),
    address: {
      "@type": "PostalAddress",
      addressLocality: imovel.cidade || "Aracati",
      addressRegion: "CE",
      addressCountry: "BR"
    },
    geo: imovel.lat != null && imovel.lng != null ? { "@type": "GeoCoordinates", latitude: imovel.lat, longitude: imovel.lng } : undefined,
    numberOfRooms: imovel.quartos || undefined,
    petsAllowed: imovel.aceita_pet == null ? undefined : imovel.aceita_pet,
    amenityFeature: comodidades.length ? comodidades.map((c) => ({ "@type": "LocationFeatureSpecification", name: c, value: true })) : undefined,
    image: temFotosReais ? galeriaFotos.map((f) => `${DOMINIO}${f.arquivo}`) : undefined,
    isPartOf: { "@id": `${DOMINIO}/#negocio` }
  };

  const jsonLd = JSON.parse(
    JSON.stringify(
      {
        "@context": "https://schema.org",
        "@graph": [
          vacationRentalJsonLd,
          {
            "@type": "LodgingBusiness",
            "@id": `${DOMINIO}/#negocio`,
            name: "ClickPraia",
            url: `${DOMINIO}/`,
            areaServed: "Canoa Quebrada, Aracati - CE"
          },
          breadcrumbJsonLd,
          faqJsonLd
        ]
      },
      (k, v) => (v === null ? undefined : v)
    )
  );

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escHtml(h1)} | ClickPraia</title>
  <meta name="description" content="${escHtml(descMeta)}">
  <meta name="robots" content="${imovel.ativo ? "index, follow, max-image-preview:large" : "noindex, follow"}">
  <meta name="theme-color" content="#0a5c8a">
  <meta name="format-detection" content="telephone=no">
  <link rel="canonical" href="${url}">
  <link rel="preconnect" href="https://wa.me">

  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' https://www.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; img-src 'self' data: https://www.google-analytics.com https://*.googletagmanager.com; style-src 'self' 'unsafe-inline'; font-src 'self'; base-uri 'self'; form-action 'self'">

  <link rel="stylesheet" href="/styles.css">
  <link rel="icon" href="/assets/images/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="/assets/images/apple-touch-icon.png">

  <meta property="og:type" content="website">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="ClickPraia">
  <meta property="og:title" content="${escHtml(h1)}">
  <meta property="og:description" content="${escHtml(descMeta)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${temFotosReais ? DOMINIO + escHtml(galeriaFotos[0].arquivo) : DOMINIO + "/assets/images/capa-og.jpg"}">
  <meta property="article:modified_time" content="${hoje}">

  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <div class="page">
    <header class="site-header">
      <div class="brand-row">
        <a href="/"><img src="/assets/images/logo-clickpraia-header.png" alt="ClickPraia" width="32" height="32" class="logo-brand"></a>
        <p class="brand">clickpraia.com.br</p>
      </div>
    </header>

    <nav class="breadcrumb" aria-label="Trilha de navegação">
      <ol>
        <li><a href="/">ClickPraia</a></li>
        <li><a href="/${praiaSlug}/">${escHtml(imovel.praia)}</a></li>
        <li aria-current="page">${escHtml(imovel.nome)}</li>
      </ol>
    </nav>

    <main class="detail-page">
      <div class="detail-galeria" aria-label="Galeria de fotos">
        ${galeriaHtml}
      </div>

      <span class="badge">${escHtml(imovel.praia)}</span>
      <h1>${escHtml(h1)}</h1>
      <p class="descricao">${escHtml(imovel.descricao_curta || "Descrição completa em breve.")}</p>

      <h2>Ficha técnica</h2>
      <ul class="lista">
        ${fichaItens || "<li><!-- SILUS: substituir antes de publicar - dados do imovel --></li>"}
      </ul>

      ${comodidades.length ? `<h2>Comodidades</h2><ul class="lista-comodidades">${comodidades.map((c) => `<li>${escHtml(c)}</li>`).join("")}</ul>` : ""}

      <h2>Diárias</h2>
      ${tabelaDiarias}

      <h2>O que tem perto</h2>
      ${blocoProximo}

      <h2>Perguntas frequentes</h2>
      <div class="faq">
        ${faq.map((f) => `<details><summary>${escHtml(f.q)}</summary><p>${escHtml(f.a)}</p></details>`).join("\n        ")}
      </div>

      ${outrosHtml ? `<h2>Outros imóveis em ${escHtml(imovel.praia)}</h2><ul class="lista-outros">${outrosHtml}</ul>` : ""}

      <div class="cta-group">
        <a class="cta" href="${waHref}" target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
      </div>
    </main>

    <footer>
      <p>ClickPraia | Atendimento direto por WhatsApp</p>
      <p>Canoa Quebrada, Aracati - CE</p>
      <p class="atualizado">Página atualizada em <time datetime="${hoje}">${hoje.split("-").reverse().join("/")}</time></p>
    </footer>

    <div class="sticky-cta">
      <a class="cta" href="${waHref}" target="_blank" rel="noopener noreferrer">
        Falar no WhatsApp sobre ${escHtml(imovel.nome)}
      </a>
    </div>
  </div>

  <!-- SILUS: substituir antes de publicar - GA4 (ver fase 5 / snippets.md) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id={{GA4_ID}}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '{{GA4_ID}}');
  </script>
</body>
</html>
`;
  return { html, url, praiaSlug };
}

function paginaHub(praia, imoveisDaPraia) {
  const hoje = new Date().toISOString().slice(0, 10);
  const praiaSlug = slugPraia(praia);
  const url = `${DOMINIO}/${praiaSlug}/`;
  const cards = imoveisDaPraia
    .map((im) => {
      const foto = im.fotos && im.fotos[0] ? im.fotos[0] : null;
      return `<article class="card-hub" data-capacidade="${im.capacidade || 0}" data-piscina="${im.tem_piscina ? 1 : 0}" data-preco="${im.diaria_baixa || 0}">
        <a href="/${praiaSlug}/${im.slug}/">
          <img src="${foto ? escHtml(foto.arquivo) : "/assets/images/placeholder.svg"}" alt="${foto ? escHtml(foto.alt) : "Foto ainda não cadastrada de " + escHtml(im.nome)}" width="400" height="300" loading="lazy">
          <h3>${escHtml(im.nome)}</h3>
        </a>
        <p>${escHtml(im.descricao_curta || "Descrição em breve.")}</p>
      </article>`;
    })
    .join("\n      ");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Aluguel de temporada em ${escHtml(praia)} | ClickPraia</title>
  <meta name="description" content="Casas e imóveis para alugar em ${escHtml(praia)}, Aracati/CE. Fotos, preços e reserva direto no WhatsApp.">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#0a5c8a">
  <link rel="canonical" href="${url}">

  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' https://www.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; img-src 'self' data: https://www.google-analytics.com https://*.googletagmanager.com; style-src 'self' 'unsafe-inline'; font-src 'self'; base-uri 'self'; form-action 'self'">

  <link rel="stylesheet" href="/styles.css">
  <link rel="icon" href="/assets/images/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="/assets/images/apple-touch-icon.png">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="ClickPraia">
  <meta property="og:title" content="Aluguel de temporada em ${escHtml(praia)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${DOMINIO}/assets/images/capa-og.jpg">
  <meta property="article:modified_time" content="${hoje}">
</head>
<body>
  <div class="page">
    <header class="site-header">
      <div class="brand-row"><a href="/"><img src="/assets/images/logo-clickpraia-header.png" alt="ClickPraia" width="32" height="32" class="logo-brand"></a><p class="brand">clickpraia.com.br</p></div>
      <div class="hero">
        <h1>Aluguel de temporada em ${escHtml(praia)}</h1>
        <p class="subtitle">Casas e imóveis selecionados em ${escHtml(praia)}, Aracati/CE. Fale direto no WhatsApp.</p>
      </div>
    </header>

    <main>
      <div class="section-intro">
        <p>${escHtml(praia)} é um dos destinos mais procurados do litoral do Ceará, conhecido pelas falésias, dunas e pela vida noturna da Broadway. Veja abaixo os imóveis disponíveis para sua temporada.</p>
      </div>

      <div class="filtros" aria-label="Filtrar imóveis">
        <label>Capacidade mínima <input type="number" id="filtro-capacidade" min="0" value="0"></label>
        <label><input type="checkbox" id="filtro-piscina"> Só com piscina</label>
        <label>Preço máximo (diária) <input type="number" id="filtro-preco" min="0" placeholder="Sem limite"></label>
      </div>

      <section id="lista-hub" aria-label="Imóveis em ${escHtml(praia)}">
        ${cards}
      </section>
    </main>

    <footer>
      <p>ClickPraia | Atendimento direto por WhatsApp</p>
      <p><a href="/">Voltar para a página inicial</a></p>
      <p class="atualizado">Página atualizada em <time datetime="${hoje}">${hoje.split("-").reverse().join("/")}</time></p>
    </footer>

    <div class="sticky-cta">
      <a class="cta" href="${waLink(WHATSAPP_PADRAO, "Ola! Quero saber mais sobre os imoveis em " + praia + ".")}" target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
    </div>
  </div>

  <script src="/hub-filtro.js"></script>

  <!-- SILUS: substituir antes de publicar - GA4 (ver fase 5 / snippets.md) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id={{GA4_ID}}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '{{GA4_ID}}');
  </script>
</body>
</html>
`;
  return { html, url, praiaSlug };
}

function paginaHome(imoveis, porPraia) {
  const hoje = new Date().toISOString().slice(0, 10);
  const cards = imoveis
    .map((im) => {
      const praiaSlug = slugPraia(im.praia);
      const foto = im.fotos && im.fotos[0] ? im.fotos[0] : null;
      const waHref = waLink(im.whatsapp || WHATSAPP_PADRAO, `Ola! Tenho interesse no imovel: ${im.nome} (${im.praia}).`);
      return `<article class="card" id="${escHtml(im.slug)}">
        <header class="card-header">
          <h3><a href="/${praiaSlug}/${im.slug}/">${escHtml(im.nome)}</a></h3>
          <span class="badge">${escHtml(im.praia)}</span>
        </header>
        <div class="galeria" aria-label="Galeria de fotos">
          <figure><a href="/${praiaSlug}/${im.slug}/"><img src="${foto ? escHtml(foto.arquivo) : "/assets/images/placeholder.svg"}" alt="${foto ? escHtml(foto.alt) : "Foto ainda não cadastrada de " + escHtml(im.nome)}" width="800" height="600" loading="lazy" decoding="async"></a></figure>
        </div>
        <div class="info">
          <p class="descricao">${escHtml(im.descricao_curta || "Descrição em breve.")}</p>
          <div class="cta-group">
            <a class="cta secondary" href="/${praiaSlug}/${im.slug}/">Ver detalhes</a>
            <a class="cta" href="${waHref}" target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
          </div>
        </div>
      </article>`;
    })
    .join("\n      ");

  const hubsLinks = Object.keys(porPraia)
    .filter((ps) => porPraia[ps].itens.length >= 2)
    .map((ps) => `<li><a href="/${ps}/">Imóveis em ${escHtml(porPraia[ps].praia)}</a></li>`)
    .join("\n        ");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": `${DOMINIO}/#negocio`,
    name: "ClickPraia",
    url: `${DOMINIO}/`,
    areaServed: "Canoa Quebrada, Aracati - CE",
    knowsLanguage: "pt-BR",
    dateModified: hoje,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "reservas",
      availableLanguage: ["Portuguese"],
      telephone: "+55" + WHATSAPP_PADRAO.replace(/^55/, "")
    }
  };

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>ClickPraia | Aluguel de Temporada em Canoa Quebrada - CE</title>
  <meta name="description" content="Casas e imóveis para aluguel de temporada em Canoa Quebrada, Aracati/CE. Preços e disponibilidade direto no WhatsApp.">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#0a5c8a">
  <meta name="format-detection" content="telephone=no">
  <link rel="canonical" href="${DOMINIO}/">
  <link rel="preconnect" href="https://wa.me">

  <!-- SILUS: substituir antes de publicar - token de verificacao do Search Console -->
  <meta name="google-site-verification" content="{{GSC_TOKEN}}">

  <!-- CSP via meta: GitHub Pages nao permite header HTTP customizado.
       Nao cobre frame-ancestors (so funciona como header real). -->
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' https://www.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; img-src 'self' data: https://www.google-analytics.com https://*.googletagmanager.com; style-src 'self' 'unsafe-inline'; font-src 'self'; base-uri 'self'; form-action 'self'">

  <link rel="stylesheet" href="/styles.css">
  <link rel="icon" href="/assets/images/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="/assets/images/apple-touch-icon.png">

  <meta property="og:type" content="website">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="ClickPraia">
  <meta property="og:title" content="ClickPraia | Aluguel de Temporada em Canoa Quebrada - CE">
  <meta property="og:description" content="Casas e imóveis em Canoa Quebrada, Aracati/CE. Reserva rápida no WhatsApp.">
  <meta property="og:url" content="${DOMINIO}/">
  <meta property="og:image" content="${DOMINIO}/assets/images/capa-og.jpg">
  <meta property="article:modified_time" content="${hoje}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="ClickPraia | Aluguel de Temporada em Canoa Quebrada - CE">
  <meta name="twitter:description" content="Casas e imóveis em Canoa Quebrada, Aracati/CE. Reserva rápida no WhatsApp.">
  <meta name="twitter:image" content="${DOMINIO}/assets/images/capa-og.jpg">

  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <a class="skip-link" href="#lista-imoveis">Pular para lista de imóveis</a>

  <div class="page">
    <header class="site-header">
      <div class="brand-row">
        <a href="/"><img src="/assets/images/logo-clickpraia-header.png" alt="ClickPraia" width="32" height="32" class="logo-brand"></a>
        <p class="brand">clickpraia.com.br</p>
      </div>
      <div class="hero">
        <h1>Aluguel de temporada em Canoa Quebrada</h1>
        <p class="subtitle">Escolha seu imóvel, veja fotos e informações completas, e reserve direto no WhatsApp.</p>
      </div>
      <ul class="trust-row">
        <li>Resposta rápida no WhatsApp</li>
        <li>Preços e regras claros</li>
        <li>${imoveis.length} imóve${imoveis.length === 1 ? "l" : "is"} cadastrados</li>
      </ul>
    </header>

    <main id="conteudo">
      <div class="section-intro">
        <h2>Imóveis em Canoa Quebrada</h2>
        <p>Casas e apartamentos com contato direto para reserva.</p>
      </div>
      <section id="lista-imoveis" aria-label="Lista de imóveis">
      ${cards}
      </section>

      ${hubsLinks ? `<div class="section-intro"><h2>Explore por praia</h2></div><ul class="lista-outros">\n        ${hubsLinks}\n      </ul>` : ""}

      <section class="guia-conteudo" aria-label="Sobre Canoa Quebrada">
        <h2>Canoa Quebrada fica onde?</h2>
        <p>Canoa Quebrada é um distrito do município de Aracati, no litoral leste do Ceará, a cerca de 160 km de Fortaleza — geralmente entre 2h e 3h de carro pela CE-040. É conhecida pelas falésias coloridas, pelas dunas e pela rua da Broadway, o centro de bares e restaurantes da vila.</p>

        <h2>Quantos km de Fortaleza até Canoa Quebrada?</h2>
        <p>A distância aproximada é de 160 km. De carro, o trajeto costuma levar entre 2h e 2h30. De ônibus, saindo do terminal rodoviário de Fortaleza até Aracati, o trajeto dura entre 2h30 e 3h30, mais cerca de 15 a 20 minutos de mototáxi ou táxi até a vila. Veja o guia completo com todas as opções de transporte.</p>

        <h2>O que é a Broadway de Canoa Quebrada?</h2>
        <p>Broadway é o nome dado à rua principal de bares, restaurantes e música ao vivo de Canoa Quebrada. É onde se concentra a vida noturna da vila, com movimento praticamente todas as noites em alta temporada.</p>

        <h2>Canoa Quebrada é pousada ou aluguel de temporada?</h2>
        <p>Existem as duas opções na vila. A ClickPraia trabalha com aluguel de temporada — casas e apartamentos completos, reservados direto com o anfitrião pelo WhatsApp, sem taxa de plataforma e sem formulário.</p>

        <h2>Quantos imóveis a ClickPraia tem em Canoa Quebrada?</h2>
        <p>${imoveis.length} imóve${imoveis.length === 1 ? "l" : "is"} cadastrado${imoveis.length === 1 ? "" : "s"} atualmente, todos em Canoa Quebrada, Aracati/CE.</p>
      </section>

      <div class="section-intro">
        <h2>Guias de Canoa Quebrada</h2>
      </div>
      <ul class="lista-outros">
        <li><a href="/guias/como-ir-de-fortaleza-a-canoa-quebrada/">Como ir de Fortaleza a Canoa Quebrada</a></li>
        <li><a href="/guias/o-que-fazer-em-canoa-quebrada-em-3-dias/">O que fazer em Canoa Quebrada em 3 dias</a></li>
        <li><a href="/guias/reveillon-e-carnaval-em-canoa-quebrada/">Réveillon e Carnaval em Canoa Quebrada</a></li>
        <li><a href="/guias/canoa-quebrada-com-criancas/">Canoa Quebrada com crianças</a></li>
        <li><a href="/guias/onde-ficar-em-canoa-quebrada/">Onde ficar em Canoa Quebrada</a></li>
      </ul>
    </main>

    <footer>
      <p>ClickPraia | Atendimento direto por WhatsApp</p>
      <p>Canoa Quebrada, Aracati - CE</p>
      <p class="atualizado">Página atualizada em <time datetime="${hoje}">${hoje.split("-").reverse().join("/")}</time></p>
    </footer>

    <div class="sticky-cta">
      <a class="cta" href="${waLink(WHATSAPP_PADRAO, "Ola! Quero saber mais sobre os imoveis do ClickPraia.")}" target="_blank" rel="noopener noreferrer">
        Falar no WhatsApp
      </a>
    </div>

    <noscript>
      <section class="noscript-box">
        <h2>Conteúdo disponível sem JavaScript</h2>
        <p>Esta página funciona mesmo sem JavaScript ativado.</p>
      </section>
    </noscript>
  </div>

  <!-- SILUS: substituir antes de publicar - GA4 (ver fase 5 / snippets.md) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id={{GA4_ID}}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '{{GA4_ID}}');
  </script>
</body>
</html>
`;
  return html;
}

function paginaGuia(guia, imoveisDestaque) {
  const hoje = new Date().toISOString().slice(0, 10);
  const url = `${DOMINIO}/guias/${guia.slug}/`;
  const corpoHtml = guia.corpo
    .map((bloco) => {
      if (bloco.tipo === "h2") return `<h2>${escHtml(bloco.texto)}</h2>`;
      if (bloco.tipo === "ul") return `<ul>${bloco.itens.map((i) => `<li>${escHtml(i)}</li>`).join("")}</ul>`;
      return `<p>${bloco.texto.replace(/&/g, "&amp;").replace(/<(?!\/?(?:!--| SILUS))/g, "&lt;")}</p>`;
    })
    .join("\n      ");

  const blocoImoveis = imoveisDestaque
    .slice(0, 3)
    .map((im) => `<li><a href="/${slugPraia(im.praia)}/${im.slug}/">${escHtml(im.nome)}</a> — ${escHtml(im.praia)}</li>`)
    .join("\n        ");

  const jsonLd = JSON.parse(
    JSON.stringify(
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Article",
            "@id": `${url}#artigo`,
            headline: guia.titulo,
            description: guia.descricao,
            url: url,
            inLanguage: "pt-BR",
            dateModified: hoje,
            publisher: { "@id": `${DOMINIO}/#negocio` }
          },
          {
            "@type": "BreadcrumbList",
            "@id": `${url}#breadcrumb`,
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "ClickPraia", item: `${DOMINIO}/` },
              { "@type": "ListItem", position: 2, name: "Guias", item: `${DOMINIO}/guias/` },
              { "@type": "ListItem", position: 3, name: guia.titulo, item: url }
            ]
          }
        ]
      },
      (k, v) => (v === null ? undefined : v)
    )
  );

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escHtml(guia.titulo)} | ClickPraia</title>
  <meta name="description" content="${escHtml(guia.descricao)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#0a5c8a">
  <link rel="canonical" href="${url}">

  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' https://www.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; img-src 'self' data: https://www.google-analytics.com https://*.googletagmanager.com; style-src 'self' 'unsafe-inline'; font-src 'self'; base-uri 'self'; form-action 'self'">

  <link rel="stylesheet" href="/styles.css">
  <link rel="icon" href="/assets/images/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="/assets/images/apple-touch-icon.png">

  <meta property="og:type" content="article">
  <meta property="og:site_name" content="ClickPraia">
  <meta property="og:title" content="${escHtml(guia.titulo)}">
  <meta property="og:description" content="${escHtml(guia.descricao)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${DOMINIO}/assets/images/capa-og.jpg">
  <meta property="article:modified_time" content="${hoje}">

  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <div class="page">
    <header class="site-header">
      <div class="brand-row"><a href="/"><img src="/assets/images/logo-clickpraia-header.png" alt="ClickPraia" width="32" height="32" class="logo-brand"></a><p class="brand">clickpraia.com.br</p></div>
    </header>

    <nav class="breadcrumb" aria-label="Trilha de navegação">
      <ol>
        <li><a href="/">ClickPraia</a></li>
        <li><a href="/guias/">Guias</a></li>
        <li aria-current="page">${escHtml(guia.titulo)}</li>
      </ol>
    </nav>

    <main class="guia-conteudo">
      <h1>${escHtml(guia.titulo)}</h1>
      ${corpoHtml}

      <div class="bloco-imoveis-guia">
        <h2>Imóveis em Canoa Quebrada</h2>
        <ul class="lista-outros">
        ${blocoImoveis}
        </ul>
      </div>

      <div class="cta-group">
        <a class="cta" href="${waLink(WHATSAPP_PADRAO, "Ola! Vi o guia " + guia.titulo + " e quero saber mais sobre os imoveis.")}" target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
      </div>
    </main>

    <footer>
      <p>ClickPraia | Atendimento direto por WhatsApp</p>
      <p><a href="/">Voltar para a página inicial</a></p>
      <p class="atualizado">Página atualizada em <time datetime="${hoje}">${hoje.split("-").reverse().join("/")}</time></p>
    </footer>

    <div class="sticky-cta">
      <a class="cta" href="${waLink(WHATSAPP_PADRAO, "Ola! Vi o guia " + guia.titulo + " e quero saber mais sobre os imoveis.")}" target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
    </div>
  </div>

  <!-- SILUS: substituir antes de publicar - GA4 (ver fase 5 / snippets.md) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id={{GA4_ID}}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '{{GA4_ID}}');
  </script>
</body>
</html>
`;
  return { html, url };
}

function main() {
  const dados = JSON.parse(fs.readFileSync(path.join(RAIZ, "dados", "imoveis.json"), "utf8"));
  const imoveis = dados.imoveis;

  const porPraia = {};
  imoveis.forEach((im) => {
    const ps = slugPraia(im.praia);
    porPraia[ps] = porPraia[ps] || { praia: im.praia, itens: [] };
    porPraia[ps].itens.push(im);
  });

  const urlsGeradas = [];

  imoveis.forEach((im) => {
    const outros = porPraia[slugPraia(im.praia)].itens.filter((o) => o.slug !== im.slug);
    const { html, url, praiaSlug } = paginaImovel(im, outros);
    const dir = path.join(RAIZ, praiaSlug, im.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
    urlsGeradas.push({ url, prioridade: "0.8" });
    console.log("gerado:", path.relative(RAIZ, path.join(dir, "index.html")));
  });

  Object.keys(porPraia).forEach((ps) => {
    const grupo = porPraia[ps];
    if (grupo.itens.length < 2) {
      console.log("hub pulado (menos de 2 imoveis):", ps);
      return;
    }
    const { html, url } = paginaHub(grupo.praia, grupo.itens);
    const dir = path.join(RAIZ, ps);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
    urlsGeradas.push({ url, prioridade: "0.9" });
    console.log("gerado:", path.relative(RAIZ, path.join(dir, "index.html")));
  });

  fs.writeFileSync(path.join(RAIZ, "index.html"), paginaHome(imoveis, porPraia), "utf8");
  console.log("gerado: index.html");

  const guias = require(path.join(RAIZ, "dados", "guias.js"));
  guias.forEach((guia) => {
    const { html, url } = paginaGuia(guia, imoveis);
    const dir = path.join(RAIZ, "guias", guia.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
    urlsGeradas.push({ url, prioridade: "0.6" });
    console.log("gerado:", path.relative(RAIZ, path.join(dir, "index.html")));
  });

  fs.writeFileSync(path.join(RAIZ, "dados", "urls-geradas.json"), JSON.stringify(urlsGeradas, null, 2), "utf8");
  console.log("\nTotal de paginas geradas:", urlsGeradas.length);
  console.log("Rode node gerador/gerar-sitemap.js para atualizar o sitemap.xml.");
}

main();
