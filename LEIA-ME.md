# ClickPraia — como atualizar o site

## Adicionar ou editar um imóvel

1. Edite `dados/imoveis.json` — copie um bloco existente dentro de `"imoveis": [ ... ]`
   para adicionar um novo, ou altere os campos de um existente.
2. Marque `"ativo": true` quando todos os dados essenciais (capacidade, quartos,
   diárias, fotos) estiverem preenchidos — enquanto `false`, a página do imóvel
   é gerada como `noindex` (não aparece no Google).
3. Rode o gerador:

```bash
node gerador/gerar.js && node gerador/gerar-sitemap.js
```

Isso recria `index.html`, todas as páginas em `/canoa-quebrada/<slug>/`, os hubs de
praia (`/<praia>/`), os 5 guias em `/guias/`, e atualiza `sitemap.xml`.

4. Confira o resultado abrindo `index.html` no navegador, depois `git add`,
   `git commit` e `git push`.

## Adicionar fotos

Cada foto no JSON é um objeto `{ "arquivo": "/assets/images/.../01.webp", "alt": "..." }`.
Coloque o arquivo de imagem em `assets/images/<slug-do-imovel>/` e referencie o
caminho no array `fotos` do imóvel correspondente.

## Adicionar uma praia nova

Basta cadastrar imóveis com `"praia": "Nome da Praia"` no JSON — o gerador cria a
pasta `/nome-da-praia/` automaticamente. O hub da praia só é gerado quando há
2 ou mais imóveis ativos nela.

## Textos pendentes de configuração (marcados `SILUS` no código)

- `{{GA4_ID}}` — ID de métricas do Google Analytics 4, em todas as páginas.
- `{{GSC_TOKEN}}` — token de verificação do Google Search Console, na home.

Veja o relatório de auditoria da conversa que gerou este site para a lista
completa do que falta preencher.
