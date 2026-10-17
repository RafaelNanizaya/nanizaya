// Testes funcionais da landing page com Chrome headless (puppeteer-core).
// Uso:
//   node tests/functional.mjs                       → sobe servidor local e testa
//   node tests/functional.mjs https://exemplo.dev    → testa um endereço publicado
// Variáveis: CHROME_PATH (caminho do Chrome/Edge), TAG (sufixo dos arquivos de evidência)
import puppeteer from "puppeteer-core";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { startServer } from "./serve.mjs";

const EVID = fileURLToPath(new URL("../reports/evidencias/", import.meta.url));
const CHROME = process.env.CHROME_PATH || [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].find(existsSync);

let server = null;
let BASE = process.argv[2];
if (!BASE) {
  server = await startServer(8089);
  BASE = "http://127.0.0.1:8089";
}
BASE = BASE.replace(/\/$/, "");
const TAG = process.env.TAG || (server ? "local" : "producao");

const VIEWPORTS = [
  { nome: "celular", width: 360, height: 740, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { nome: "tablet", width: 768, height: 1024, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { nome: "desktop", width: 1366, height: 768, deviceScaleFactor: 1 }
];

const resultados = [];
function registrar(grupo, nome, ok, detalhe = "") {
  resultados.push({ grupo, nome, ok: !!ok, detalhe: String(detalhe) });
  console.log(`${ok ? "PASSOU" : "FALHOU"}  [${grupo}] ${nome}${detalhe ? " — " + detalhe : ""}`);
}

await mkdir(EVID, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--lang=pt-BR"] });
const versao = await browser.version();

async function novaPagina(vp) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  // Cada página carrega tudo do zero; sem isso a 2ª largura recebe 304 (revalidação de cache).
  await page.setCacheEnabled(false);
  const problemas = { console: [], paginaErros: [], rede: [] };
  page.on("console", (m) => { if (["error", "warn"].includes(m.type())) problemas.console.push(`${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => problemas.paginaErros.push(e.message));
  page.on("requestfailed", (r) => problemas.rede.push(`${r.url()} → ${r.failure()?.errorText}`));
  page.on("response", (r) => { if (r.status() >= 400) problemas.rede.push(`${r.url()} → HTTP ${r.status()}`); });
  return { page, problemas };
}

// Rola a página aos poucos para disparar o carregamento das imagens lazy.
async function rolarAteOFim(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForNetworkIdle({ idleTime: 400, timeout: 15000 }).catch(() => {});
}

try {
  // ---------- 1. Carregamento, recursos e layout em cada largura ----------
  for (const vp of VIEWPORTS) {
    const { page, problemas } = await novaPagina(vp);
    const resp = await page.goto(BASE + "/", { waitUntil: "networkidle0", timeout: 30000 });
    const g = `layout ${vp.nome} ${vp.width}px`;
    registrar(g, "página inicial responde 200", resp.status() === 200, `HTTP ${resp.status()}`);
    await rolarAteOFim(page);

    const info = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      imagens: [...document.images].map((i) => ({ src: i.currentSrc, ok: i.complete && i.naturalWidth > 0 })),
      fontes: [document.fonts.check('600 16px "Playfair Display"'), document.fonts.check('400 16px "Inter"')],
      menuVisivel: getComputedStyle(document.querySelector(".menu-toggle")).display !== "none",
      navVisivel: getComputedStyle(document.querySelector(".nav")).visibility !== "hidden"
    }));
    registrar(g, "sem rolagem horizontal", info.overflow <= 0, `excesso ${info.overflow}px`);
    const quebradas = info.imagens.filter((i) => !i.ok);
    registrar(g, "todas as imagens carregadas", quebradas.length === 0, `${info.imagens.length - quebradas.length}/${info.imagens.length}` + (quebradas.length ? " quebradas: " + quebradas.map((i) => i.src).join(", ") : ""));
    registrar(g, "fontes Playfair Display e Inter carregadas", info.fontes.every(Boolean), JSON.stringify(info.fontes));
    if (vp.width < 1024) registrar(g, "botão de menu móvel visível e menu recolhido", info.menuVisivel && !info.navVisivel);
    else registrar(g, "navegação completa visível e botão de menu oculto", !info.menuVisivel && info.navVisivel);

    await page.screenshot({ path: `${EVID}${TAG}-${vp.nome}-${vp.width}px.jpg`, fullPage: true, type: "jpeg", quality: 70 });
    await page.screenshot({ path: `${EVID}${TAG}-${vp.nome}-${vp.width}px-dobra.jpg`, type: "jpeg", quality: 75 });
    registrar(g, "sem erros de JavaScript", problemas.paginaErros.length === 0, problemas.paginaErros.join(" | "));
    registrar(g, "sem erros/avisos no console", problemas.console.length === 0, problemas.console.join(" | "));
    registrar(g, "sem falhas de rede ou HTTP ≥ 400", problemas.rede.length === 0, problemas.rede.join(" | "));
    await page.close();
  }

  // ---------- 2. Metadados, semântica e acessibilidade básica ----------
  {
    const { page } = await novaPagina(VIEWPORTS[2]);
    await page.goto(BASE + "/", { waitUntil: "networkidle0" });
    const m = await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
      return {
        lang: document.documentElement.lang,
        title: document.title,
        description: q('meta[name="description"]')?.content || "",
        viewport: !!q('meta[name="viewport"]'),
        favicon: !!q('link[rel="icon"]'),
        og: !!q('meta[property="og:title"]') && !!q('meta[property="og:image"]'),
        h1: document.querySelectorAll("h1").length,
        landmarks: ["header", "nav", "main", "footer"].filter((t) => !document.querySelector(t)),
        semAlt: [...document.images].filter((i) => !i.hasAttribute("alt") || !i.alt.trim()).map((i) => i.src),
        idsDuplicados: ids.filter((id, i) => ids.indexOf(id) !== i),
        ancoras: [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute("href")).filter((h) => h.length > 1 && !document.getElementById(h.slice(1))),
        relativos: [...new Set([...document.querySelectorAll("a[href], link[href], img[src], script[src]")]
          .map((e) => e.getAttribute("href") || e.getAttribute("src"))
          .filter((h) => !/^(#|https?:|mailto:|tel:|data:)/.test(h)))],
        externos: [...document.querySelectorAll("a[href^='http'], link[href^='http'], script[src^='http'], img[src^='http']")].map((e) => e.href || e.src),
        camposSemRotulo: [...document.querySelectorAll("input, select, textarea")].filter((c) => !document.querySelector(`label[for="${c.id}"]`)).map((c) => c.name),
        botoesSemNome: [...document.querySelectorAll("button, a")].filter((b) => !(b.textContent.trim() || b.getAttribute("aria-label"))).length,
        primeiroFoco: null
      };
    });
    const g = "metadados e acessibilidade";
    registrar(g, "lang=pt-BR", m.lang === "pt-BR", m.lang);
    registrar(g, "título definido", m.title.length > 10, m.title);
    registrar(g, "meta description (50–170 caracteres)", m.description.length >= 50 && m.description.length <= 170, `${m.description.length} caracteres`);
    registrar(g, "meta viewport, favicon e Open Graph", m.viewport && m.favicon && m.og);
    registrar(g, "exatamente um <h1>", m.h1 === 1, `${m.h1}`);
    registrar(g, "landmarks header/nav/main/footer", m.landmarks.length === 0, m.landmarks.join(", "));
    registrar(g, "todas as imagens com texto alternativo", m.semAlt.length === 0, m.semAlt.join(", "));
    registrar(g, "sem IDs duplicados", m.idsDuplicados.length === 0, m.idsDuplicados.join(", "));
    registrar(g, "campos de formulário com <label>", m.camposSemRotulo.length === 0, m.camposSemRotulo.join(", "));
    registrar(g, "links e botões com nome acessível", m.botoesSemNome === 0, `${m.botoesSemNome} sem nome`);
    registrar(g, "âncoras internas apontam para IDs existentes", m.ancoras.length === 0, m.ancoras.join(", ") || "todas válidas");
    registrar(g, "nenhum recurso de domínio externo carregado", m.externos.length === 0, m.externos.join(", "));

    const quebrados = [];
    for (const rel of m.relativos) {
      const r = await fetch(new URL(rel, BASE + "/")).catch((e) => ({ status: e.message }));
      if (r.status !== 200) quebrados.push(`${rel} → ${r.status}`);
    }
    registrar(g, "links e recursos relativos respondem 200", quebrados.length === 0, quebrados.join(", ") || `${m.relativos.length} verificados`);

    await page.keyboard.press("Tab");
    const foco = await page.evaluate(() => document.activeElement.textContent.trim());
    registrar(g, "primeiro Tab foca o link 'Pular para o conteúdo'", foco === "Pular para o conteúdo", foco);

    for (const rota of ["/creditos.html", "/404.html"]) {
      const r = await fetch(BASE + rota);
      registrar(g, `${rota} responde 200`, r.status === 200, `HTTP ${r.status}`);
    }
    const r404 = await fetch(BASE + "/rota-que-nao-existe");
    registrar(g, "rota inexistente responde 404 com página própria", r404.status === 404 && (await r404.text()).includes("Página não encontrada"), `HTTP ${r404.status}`);
    await page.close();
  }

  // ---------- 3. Menu móvel e navegação por âncoras ----------
  {
    const { page, problemas } = await novaPagina(VIEWPORTS[0]);
    await page.goto(BASE + "/", { waitUntil: "networkidle0" });
    const g = "menu móvel";
    await page.click(".menu-toggle");
    await new Promise((r) => setTimeout(r, 350));
    let s = await page.evaluate(() => ({
      exp: document.querySelector(".menu-toggle").getAttribute("aria-expanded"),
      vis: getComputedStyle(document.querySelector(".nav")).visibility,
      label: document.querySelector(".menu-toggle").getAttribute("aria-label")
    }));
    registrar(g, "abre ao tocar no botão (aria-expanded=true)", s.exp === "true" && s.vis === "visible", JSON.stringify(s));
    const encaixe = await page.evaluate(() => Math.round(document.querySelector(".nav").getBoundingClientRect().top - document.querySelector(".site-header").getBoundingClientRect().bottom));
    registrar(g, "menu aberto encosta no cabeçalho (sem faixa vazia)", Math.abs(encaixe) <= 1, `diferença ${encaixe}px`);
    await page.screenshot({ path: `${EVID}${TAG}-celular-menu-aberto.jpg`, type: "jpeg", quality: 75 });

    await page.keyboard.press("Escape");
    await new Promise((r) => setTimeout(r, 350));
    s = await page.evaluate(() => ({ exp: document.querySelector(".menu-toggle").getAttribute("aria-expanded"), foco: document.activeElement.className }));
    registrar(g, "fecha com Esc e devolve o foco ao botão", s.exp === "false" && s.foco.includes("menu-toggle"), JSON.stringify(s));

    await page.click(".menu-toggle");
    await new Promise((r) => setTimeout(r, 350));
    await page.click('.nav a[href="#precos"]');
    await new Promise((r) => setTimeout(r, 1200));
    s = await page.evaluate(() => ({
      exp: document.querySelector(".menu-toggle").getAttribute("aria-expanded"),
      hash: location.hash,
      topo: Math.round(document.getElementById("precos").getBoundingClientRect().top)
    }));
    registrar(g, "link do menu fecha o menu e rola até a seção", s.exp === "false" && s.hash === "#precos" && Math.abs(s.topo) < 140, JSON.stringify(s));
    registrar(g, "sem erros de JavaScript", problemas.paginaErros.length === 0, problemas.paginaErros.join(" | "));
    await page.close();
  }

  // ---------- 4. Botões de chamada para ação, WhatsApp e FAQ ----------
  {
    const { page } = await novaPagina(VIEWPORTS[2]);
    await page.goto(BASE + "/", { waitUntil: "networkidle0" });
    const g = "botões e interações";

    const ctas = await page.evaluate(() => [...document.querySelectorAll(".btn[href^='#']")].map((a) => ({ href: a.getAttribute("href"), ok: !!document.getElementById(a.getAttribute("href").slice(1)) })));
    registrar(g, "CTAs (botões com âncora) apontam para seções existentes", ctas.length > 0 && ctas.every((c) => c.ok), `${ctas.length} botões: ${[...new Set(ctas.map((c) => c.href))].join(" ")}`);

    await page.click('[data-servico="Corte + Barba"]');
    await new Promise((r) => setTimeout(r, 900));
    const svc = await page.$eval("#servico", (s) => s.value);
    registrar(g, "botão do card de preço pré-seleciona o serviço", svc === "Corte + Barba", svc);

    await page.click("[data-whatsapp]");
    await new Promise((r) => setTimeout(r, 300));
    const dlg = await page.evaluate(() => ({ aberto: document.getElementById("dialogo-whatsapp").open, msg: document.getElementById("dialogo-mensagem").textContent }));
    registrar(g, "botão WhatsApp em modo demo abre a prévia (sem sair do site)", dlg.aberto && dlg.msg.includes("Barbearia Navalha") && page.url().startsWith(BASE), dlg.msg);
    await page.keyboard.press("Escape");
    await new Promise((r) => setTimeout(r, 200));
    registrar(g, "diálogo fecha com Esc", !(await page.$eval("#dialogo-whatsapp", (d) => d.open)));

    const exibicao = await page.$$eval("[data-whatsapp-exibicao]", (els) => els.map((e) => e.textContent));
    registrar(g, "número exibido identificado como demonstrativo", exibicao.length >= 2 && exibicao.every((t) => t.includes("demonstrativo")), exibicao[0]);

    await page.click("#faq details summary");
    const faqAberto = await page.$eval("#faq details", (d) => d.open);
    registrar(g, "pergunta do FAQ expande ao clicar", faqAberto);

    const statusTxt = await page.$eval("#status-funcionamento", (e) => e.textContent);
    registrar(g, "indicador 'aberto/fechado agora' preenchido", /^(Aberto|Fechado) agora/.test(statusTxt), statusTxt);
    await page.close();
  }

  // ---------- 5. Formulário de agendamento ----------
  {
    const { page, problemas } = await novaPagina(VIEWPORTS[0]);
    await page.goto(BASE + "/#agendar", { waitUntil: "networkidle0" });
    const g = "formulário";

    await page.click('#form-agendamento button[type="submit"]');
    await new Promise((r) => setTimeout(r, 200));
    let f = await page.evaluate(() => ({
      invalidos: [...document.querySelectorAll('#form-agendamento [aria-invalid="true"]')].map((c) => c.name),
      status: document.getElementById("form-status").textContent,
      foco: document.activeElement.name,
      dialogo: document.getElementById("dialogo-whatsapp").open
    }));
    registrar(g, "envio vazio é bloqueado e marca os campos obrigatórios", f.invalidos.join() === "nome,telefone,servico,data,horario" && !f.dialogo, f.invalidos.join(", "));
    registrar(g, "mensagem de erro geral e foco no primeiro campo inválido", f.status.includes("Corrija") && f.foco === "nome", `${f.status} / foco: ${f.foco}`);
    await page.screenshot({ path: `${EVID}${TAG}-formulario-erros.jpg`, type: "jpeg", quality: 75, fullPage: false, captureBeyondViewport: false, clip: await page.$eval("#form-agendamento", (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, width: r.width, height: Math.min(r.height, 1400) }; }) });

    await page.type("#telefone", "1199");
    await page.click("#nome");
    f = await page.$eval("#telefone-erro", (e) => e.textContent);
    registrar(g, "telefone incompleto exibe erro específico", f.includes("DDD"), f);

    // Encontra o próximo domingo para testar dia fechado.
    const datas = await page.evaluate(() => {
      const min = document.getElementById("data").min;
      const d = new Date(min + "T12:00:00Z");
      const iso = (x) => x.toISOString().slice(0, 10);
      while (d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate() + 1);
      const domingo = iso(d);
      d.setUTCDate(d.getUTCDate() + 2); // terça-feira seguinte
      return { domingo, terca: iso(d), min };
    });
    const definirData = (v) => page.$eval("#data", (el, v) => { el.value = v; el.dispatchEvent(new Event("change", { bubbles: true })); }, v);

    await definirData(datas.domingo);
    f = await page.evaluate(() => ({ erro: document.getElementById("data-erro").textContent, hor: document.getElementById("horario-pref").disabled }));
    registrar(g, "domingo é recusado e horários ficam indisponíveis", f.erro.includes("Não abrimos") && f.hor, JSON.stringify(f));

    await definirData(datas.terca);
    const horarios = await page.$$eval("#horario-pref option", (o) => o.map((x) => x.value).filter(Boolean));
    registrar(g, "terça-feira oferece horários de 09:00 a 19:30", horarios[0] === "09:00" && horarios.at(-1) === "19:30", `${horarios.length} horários: ${horarios[0]}…${horarios.at(-1)}`);

    await page.$eval("#nome", (el) => (el.value = ""));
    await page.type("#nome", "Cliente Teste");
    await page.$eval("#telefone", (el) => (el.value = ""));
    await page.type("#telefone", "11987654321");
    const tel = await page.$eval("#telefone", (el) => el.value);
    registrar(g, "máscara de telefone aplicada", tel === "(11) 98765-4321", tel);
    await page.select("#servico", "Barboterapia");
    await page.select("#profissional", "Lucas Moreira");
    await page.select("#horario-pref", "10:30");
    await page.type("#obs", "Teste automatizado.");
    const cont = await page.$eval("#obs-contador", (e) => e.textContent);
    registrar(g, "contador de caracteres das observações", cont.startsWith("19/300"), cont);

    await page.click('#form-agendamento button[type="submit"]');
    await new Promise((r) => setTimeout(r, 400));
    f = await page.evaluate(() => ({
      invalidos: document.querySelectorAll('#form-agendamento [aria-invalid="true"]').length,
      dialogo: document.getElementById("dialogo-whatsapp").open,
      msg: document.getElementById("dialogo-mensagem").textContent,
      status: document.getElementById("form-status").textContent,
      ocupado: document.querySelector('#form-agendamento button[type="submit"]').getAttribute("aria-busy")
    }));
    registrar(g, "envio válido abre a prévia com os dados preenchidos", f.invalidos === 0 && f.dialogo && f.msg.includes("Cliente Teste") && f.msg.includes("Barboterapia") && f.msg.includes("10:30"), f.msg.replace(/\n/g, " | "));
    registrar(g, "status informa que nada foi enviado ou armazenado", f.status.includes("nenhum dado foi enviado"), f.status);
    registrar(g, "estado de carregamento é encerrado após o envio", f.ocupado === "false", `aria-busy=${f.ocupado}`);
    await page.screenshot({ path: `${EVID}${TAG}-formulario-previa.jpg`, type: "jpeg", quality: 75 });
    registrar(g, "sem erros de JavaScript", problemas.paginaErros.length === 0, problemas.paginaErros.join(" | "));
    await page.close();
  }
} finally {
  await browser.close();
  if (server) server.close();
}

const falhas = resultados.filter((r) => !r.ok);
const resumo = { alvo: BASE, data: new Date().toISOString(), navegador: versao, total: resultados.length, passou: resultados.length - falhas.length, falhou: falhas.length, resultados };
await writeFile(`${EVID}testes-funcionais-${TAG}.json`, JSON.stringify(resumo, null, 2));
console.log(`\n${resumo.passou}/${resumo.total} verificações passaram (${versao}). Evidências em reports/evidencias/`);
process.exit(falhas.length ? 1 : 0);
