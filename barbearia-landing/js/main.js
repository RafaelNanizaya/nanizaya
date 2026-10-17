/* Barbearia Navalha — comportamento da página (sem dependências). */
(function () {
  "use strict";

  var cfg = window.NAVALHA_CONFIG;
  var root = document.documentElement;
  root.classList.add("js");

  var DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

  /* ---------- Utilidades ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function paraMinutos(hhmm) {
    var p = hhmm.split(":");
    return Number(p[0]) * 60 + Number(p[1]);
  }
  function deMinutos(min) {
    return String(Math.floor(min / 60)).padStart(2, "0") + ":" + String(min % 60).padStart(2, "0");
  }

  // Data/hora atuais no fuso da barbearia, independente do fuso do visitante.
  function agoraNaBarbearia() {
    var partes = {};
    new Intl.DateTimeFormat("en-CA", {
      timeZone: cfg.fusoHorario, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short"
    }).formatToParts(new Date()).forEach(function (p) { partes[p.type] = p.value; });
    var iso = partes.year + "-" + partes.month + "-" + partes.day;
    return {
      dataISO: iso,
      diaSemana: new Date(iso + "T12:00:00Z").getUTCDay(),
      minutos: Number(partes.hour) * 60 + Number(partes.minute)
    };
  }

  function diaDaSemanaISO(iso) {
    return new Date(iso + "T12:00:00Z").getUTCDay();
  }

  /* ---------- Cabeçalho e menu móvel ---------- */
  var header = $(".site-header");
  var nav = $("#menu-principal");
  var toggle = $(".menu-toggle");
  var mqDesktop = window.matchMedia("(min-width: 1024px)");

  function definirMenu(aberto) {
    if (aberto) nav.style.setProperty("--nav-top", header.getBoundingClientRect().bottom + "px");
    nav.classList.toggle("is-open", aberto);
    toggle.setAttribute("aria-expanded", String(aberto));
    toggle.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
  }

  toggle.addEventListener("click", function () {
    definirMenu(toggle.getAttribute("aria-expanded") !== "true");
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) definirMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("is-open")) {
      definirMenu(false);
      toggle.focus();
    }
  });
  document.addEventListener("click", function (e) {
    if (nav.classList.contains("is-open") && !header.contains(e.target)) definirMenu(false);
  });
  mqDesktop.addEventListener("change", function () { definirMenu(false); });

  function aoRolar() { header.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", aoRolar, { passive: true });
  aoRolar();

  /* ---------- Destaque do link da seção atual ---------- */
  var linksNav = $all('.nav a[href^="#"]:not(.btn)');
  if ("IntersectionObserver" in window) {
    var porId = {};
    linksNav.forEach(function (a) { porId[a.getAttribute("href").slice(1)] = a; });
    var obsSecao = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        linksNav.forEach(function (a) { a.removeAttribute("aria-current"); });
        if (!porId[en.target.id]) return;
        porId[en.target.id].setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $all("main section[id]").forEach(function (s) { obsSecao.observe(s); });
  }

  /* ---------- Animação de entrada ---------- */
  var semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var animaveis = $all(".section-head, .service-card, .price-card, .team-card, .review, .about-media, .about-text, .gallery li");
  if ("IntersectionObserver" in window && !semMovimento) {
    var obsReveal = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-visible");
          obsReveal.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    animaveis.forEach(function (el) { el.classList.add("reveal"); obsReveal.observe(el); });
  }

  /* ---------- Horário de funcionamento ---------- */
  (function statusFuncionamento() {
    var el = $("#status-funcionamento");
    var agora = agoraNaBarbearia();
    var hoje = cfg.funcionamento[agora.diaSemana];

    $all(".hours-table tr[data-dias]").forEach(function (tr) {
      if (tr.dataset.dias.split(",").map(Number).indexOf(agora.diaSemana) !== -1) tr.classList.add("is-today");
    });

    var aberto = hoje && agora.minutos >= paraMinutos(hoje[0]) && agora.minutos < paraMinutos(hoje[1]);
    if (aberto) {
      el.textContent = "Aberto agora · fecha às " + hoje[1];
      el.classList.add("is-open");
    } else {
      // Procura o próximo horário de abertura nos próximos 7 dias.
      for (var i = 0; i < 8; i++) {
        var dia = (agora.diaSemana + i) % 7;
        var h = cfg.funcionamento[dia];
        if (!h || (i === 0 && agora.minutos >= paraMinutos(h[0]))) continue;
        var quando = i === 0 ? "hoje" : i === 1 ? "amanhã" : DIAS[dia];
        el.textContent = "Fechado agora · abre " + quando + " às " + h[0];
        break;
      }
      el.classList.add("is-closed");
    }
  })();

  /* ---------- WhatsApp ---------- */
  var dialogo = $("#dialogo-whatsapp");
  var dialogoMsg = $("#dialogo-mensagem");

  $all("[data-whatsapp-exibicao]").forEach(function (el) { el.textContent = cfg.whatsapp.exibicao; });

  function abrirWhatsApp(mensagem) {
    if (cfg.whatsapp.numero) {
      var url = "https://wa.me/" + cfg.whatsapp.numero + "?text=" + encodeURIComponent(mensagem);
      window.open(url, "_blank", "noopener");
      return true;
    }
    // Modo demonstrativo: mostra a mensagem que seria enviada.
    dialogoMsg.textContent = mensagem;
    if (typeof dialogo.showModal === "function") dialogo.showModal();
    else dialogo.setAttribute("open", "");
    return false;
  }

  $all("[data-whatsapp]").forEach(function (btn) {
    btn.addEventListener("click", function () { abrirWhatsApp(cfg.whatsapp.mensagemPadrao); });
  });

  /* ---------- Botões de preço preenchem o serviço ---------- */
  var form = $("#form-agendamento");
  var campoServico = $("#servico");
  $all("[data-servico]").forEach(function (a) {
    a.addEventListener("click", function () {
      campoServico.value = a.dataset.servico;
      limparErro(campoServico);
    });
  });

  /* ---------- Formulário de agendamento ---------- */
  var campoData = $("#data");
  var campoHorario = $("#horario-pref");
  var campoTel = $("#telefone");
  var campoObs = $("#obs");
  var contadorObs = $("#obs-contador");
  var status = $("#form-status");
  var botaoEnviar = $('button[type="submit"]', form);
  var rotuloEnviar = $(".btn-label", botaoEnviar);

  var hojeISO = agoraNaBarbearia().dataISO;
  campoData.min = hojeISO;
  var limite = new Date(hojeISO + "T12:00:00Z");
  limite.setUTCDate(limite.getUTCDate() + 60);
  campoData.max = limite.toISOString().slice(0, 10);

  function preencherHorarios() {
    var anterior = campoHorario.value;
    campoHorario.length = 1;
    var iso = campoData.value;
    var faixa = iso ? cfg.funcionamento[diaDaSemanaISO(iso)] : null;
    campoHorario.options[0].textContent = !iso ? "Escolha a data primeiro" : faixa ? "Selecione…" : "Fechado neste dia";
    campoHorario.disabled = !faixa;
    if (!faixa) return;

    var inicio = paraMinutos(faixa[0]);
    var fim = paraMinutos(faixa[1]) - cfg.intervaloAgenda;
    var agora = agoraNaBarbearia();
    for (var m = inicio; m <= fim; m += cfg.intervaloAgenda) {
      if (iso === agora.dataISO && m <= agora.minutos + 30) continue;
      campoHorario.add(new Option(deMinutos(m), deMinutos(m)));
    }
    if (campoHorario.length === 1) {
      campoHorario.options[0].textContent = "Sem horários restantes hoje";
      campoHorario.disabled = true;
    }
    if (anterior) campoHorario.value = anterior;
  }
  campoData.addEventListener("change", function () { preencherHorarios(); validarCampo(campoData); });
  preencherHorarios();

  // Máscara simples de telefone brasileiro: (00) 00000-0000
  campoTel.addEventListener("input", function () {
    var d = campoTel.value.replace(/\D/g, "").slice(0, 11);
    var v = d;
    if (d.length > 2) v = "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length > 6) v = "(" + d.slice(0, 2) + ") " + d.slice(2, d.length - 4) + "-" + d.slice(d.length - 4);
    campoTel.value = v;
  });

  campoObs.addEventListener("input", function () {
    contadorObs.textContent = campoObs.value.length + "/" + campoObs.maxLength + " caracteres";
  });

  var regras = {
    nome: function (v) {
      if (!v.trim()) return "Informe seu nome.";
      if (v.trim().length < 3) return "O nome deve ter pelo menos 3 letras.";
      return "";
    },
    telefone: function (v) {
      var d = v.replace(/\D/g, "");
      if (!d) return "Informe um telefone para contato.";
      if (d.length < 10 || d.length > 11) return "Use o formato (00) 00000-0000, com DDD.";
      return "";
    },
    servico: function (v) { return v ? "" : "Escolha um serviço."; },
    data: function (v) {
      if (!v) return "Escolha uma data.";
      if (v < campoData.min) return "Escolha uma data a partir de hoje.";
      if (v > campoData.max) return "Agendamos com até 60 dias de antecedência.";
      if (!cfg.funcionamento[diaDaSemanaISO(v)]) return "Não abrimos neste dia. Escolha outra data.";
      return "";
    },
    horario: function (v) {
      if (campoHorario.disabled && campoData.value) return "Não há horários disponíveis nesta data.";
      return v ? "" : "Escolha um horário.";
    }
  };

  function erroDe(campo) { return document.getElementById(campo.getAttribute("aria-describedby")); }
  function limparErro(campo) {
    campo.removeAttribute("aria-invalid");
    var e = erroDe(campo);
    if (e) e.textContent = "";
  }
  function validarCampo(campo) {
    var regra = regras[campo.name];
    if (!regra) return true;
    var msg = regra(campo.value);
    var e = erroDe(campo);
    if (msg) {
      campo.setAttribute("aria-invalid", "true");
      if (e) e.textContent = msg;
      return false;
    }
    limparErro(campo);
    return true;
  }

  $all("input, select", form).forEach(function (campo) {
    campo.addEventListener("blur", function () { if (campo.value) validarCampo(campo); });
    campo.addEventListener("input", function () {
      if (campo.getAttribute("aria-invalid") === "true") validarCampo(campo);
    });
  });

  function definirEnviando(enviando) {
    botaoEnviar.disabled = enviando;
    botaoEnviar.setAttribute("aria-busy", String(enviando));
    rotuloEnviar.textContent = enviando ? "Preparando mensagem…" : "Preparar mensagem de agendamento";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    status.className = "form-status";
    status.textContent = "";

    var invalidos = $all("[name]", form).filter(function (c) { return !validarCampo(c); });
    if (invalidos.length) {
      status.classList.add("is-error");
      status.textContent = invalidos.length === 1
        ? "Corrija o campo destacado para continuar."
        : "Corrija os " + invalidos.length + " campos destacados para continuar.";
      invalidos[0].focus();
      return;
    }

    definirEnviando(true);
    var dados = new FormData(form);
    var dataBR = dados.get("data").split("-").reverse().join("/");
    var linhas = [
      "Olá! Gostaria de agendar um horário na Barbearia Navalha.",
      "",
      "Nome: " + dados.get("nome").trim(),
      "Telefone: " + dados.get("telefone"),
      "Serviço: " + dados.get("servico"),
      "Profissional: " + (dados.get("profissional") || "sem preferência"),
      "Data: " + dataBR + " (" + DIAS[diaDaSemanaISO(dados.get("data"))] + ")",
      "Horário: " + dados.get("horario")
    ];
    var obs = dados.get("obs").trim();
    if (obs) linhas.push("Observações: " + obs);

    // requestAnimationFrame garante que o estado de carregamento seja renderizado.
    requestAnimationFrame(function () {
      var abriu = abrirWhatsApp(linhas.join("\n"));
      definirEnviando(false);
      status.classList.add("is-success");
      status.textContent = abriu
        ? "Mensagem pronta! Confirme o envio na conversa do WhatsApp que foi aberta."
        : "Prévia gerada. Como este site é demonstrativo, nenhum dado foi enviado ou armazenado.";
    });
  });

  /* ---------- Ano do rodapé ---------- */
  $("#ano").textContent = String(new Date().getFullYear());
})();
