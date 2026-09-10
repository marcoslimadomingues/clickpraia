#!/usr/bin/env node
"use strict";
/* Gera sitemap.xml a partir de dados/urls-geradas.json + paginas fixas. Roda apos gerar.js. */

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const DOMINIO = "https://clickpraia.com.br";
const HOJE = new Date().toISOString().slice(0, 10);

function main() {
  const urlsPath = path.join(RAIZ, "dados", "urls-geradas.json");
  const geradas = fs.existsSync(urlsPath) ? JSON.parse(fs.readFileSync(urlsPath, "utf8")) : [];

  const urls = [{ url: `${DOMINIO}/`, prioridade: "1.0" }].concat(geradas);

  const body = urls
    .map(
      (u) => `  <url>
    <loc>${u.url}</loc>
    <lastmod>${HOJE}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${u.prioridade}</priority>
  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
  fs.writeFileSync(path.join(RAIZ, "sitemap.xml"), xml, "utf8");
  console.log("sitemap.xml atualizado com", urls.length, "URLs.");
}

main();
