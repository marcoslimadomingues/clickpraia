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

Isso recria `index.html`, todas as páginas em `/<praia>/<slug>/`, os hubs de
praia (`/<praia>/`, só quando há 2+ imóveis ativos na mesma praia), os 5 guias em
`/guias/`, e atualiza `sitemap.xml`.

Quando `capacidade` for 20 ou mais, a página do imóvel entra automaticamente no
posicionamento "aluguel para grupos" (título, H1, FAQ e badge ajustados para esse
nicho). Abaixo de 20, usa o formato padrão de imóvel.

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

## Configuração já aplicada

GA4 (`G-KDPDEB6KVY`) e a tag de verificação do Google Search Console já estão
preenchidos em todas as páginas.

Veja o relatório de auditoria da conversa que gerou este site para a lista
completa do que falta preencher (dados reais dos imóveis, fotos, etc).
