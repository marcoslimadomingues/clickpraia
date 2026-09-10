(function () {
  "use strict";

  var lista = document.getElementById("lista-hub");
  var inputCapacidade = document.getElementById("filtro-capacidade");
  var inputPiscina = document.getElementById("filtro-piscina");
  var inputPreco = document.getElementById("filtro-preco");

  if (!lista || !inputCapacidade || !inputPiscina || !inputPreco) {
    return;
  }

  var cards = Array.prototype.slice.call(lista.querySelectorAll(".card-hub"));

  function aplicarFiltro() {
    var capMin = Number(inputCapacidade.value) || 0;
    var soPiscina = inputPiscina.checked;
    var precoMax = Number(inputPreco.value) || Infinity;

    cards.forEach(function (card) {
      var cap = Number(card.getAttribute("data-capacidade")) || 0;
      var piscina = card.getAttribute("data-piscina") === "1";
      var preco = Number(card.getAttribute("data-preco")) || 0;

      var passa =
        cap >= capMin &&
        (!soPiscina || piscina) &&
        (preco === 0 || preco <= precoMax);

      card.hidden = !passa;
    });
  }

  inputCapacidade.addEventListener("input", aplicarFiltro);
  inputPiscina.addEventListener("change", aplicarFiltro);
  inputPreco.addEventListener("input", aplicarFiltro);
})();
