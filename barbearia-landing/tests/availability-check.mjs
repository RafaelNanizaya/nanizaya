// Verificação de disponibilidade por amostragem (Node 18+, sem dependências).
//
// Uso:
//   node tests/availability-check.mjs <url> [duracaoMin=10] [intervaloSeg=60]
// Exemplo:
//   node tests/availability-check.mjs https://barbearia-navalha.pages.dev 10 60
//
// A cada rodada faz poucas requisições sequenciais (nunca em paralelo):
//   1. GET https://host/            → espera 200
//   2. GET http://host/             → espera redirecionamento (301/302/307/308) para https
//   3. recursos principais          → CSS, JS, imagem do hero e fontes, esperam 200
//   4. GET https://host/<inexistente> → espera 404 (comportamento correto, não é falha)
//
// Cada resultado é classificado em:
//   sucesso                    — resposta HTTP igual à esperada
//   redirecionamento_esperado  — 3xx esperado com destino HTTPS correto
//   erro_http                  — o servidor respondeu, mas com status diferente do esperado
//   falha_conexao              — DNS, TLS ou conexão recusada/interrompida (sem resposta HTTP)
//   timeout                    — sem resposta dentro do limite
// A rodada só é considerada "indisponível confirmada" quando a página principal falha
// em 2 tentativas consecutivas dentro da mesma rodada (a segunda após 5 s).
import { mkdir, writeFile, appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const [, , alvo, duracaoMin = "10", intervaloSeg = "60"] = process.argv;
if (!alvo) {
  console.error("Uso: node tests/availability-check.mjs <url> [duracaoMin] [intervaloSeg]");
  process.exit(2);
}
const BASE = new URL(alvo);
BASE.protocol = "https:";
const ORIGEM = BASE.origin;
const TIMEOUT_MS = 10_000;
const RECURSOS = [
  "/css/style.css",
  "/js/main.js",
  "/js/config.js",
  "/assets/img/hero-1280.webp",
  "/assets/fonts/playfair-latin.woff2",
  "/assets/fonts/inter-latin.woff2"
];

const EVID = fileURLToPath(new URL("../reports/evidencias/", import.meta.url));
const carimbo = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const ARQ_LOG = `${EVID}disponibilidade-${carimbo}.jsonl`;
const ARQ_RESUMO = `${EVID}disponibilidade-${carimbo}-resumo.json`;

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function medir(url, { esperado, redirect = "manual" }) {
  const inicio = performance.now();
  const registro = { url, esperado, horario: new Date().toISOString() };
  try {
    const resp = await fetch(url, {
      redirect,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "BarbeariaNavalha-availability-check/1.0", "Cache-Control": "no-cache" }
    });
    registro.ttfb_ms = +(performance.now() - inicio).toFixed(1);
    const corpo = await resp.arrayBuffer();
    registro.total_ms = +(performance.now() - inicio).toFixed(1);
    registro.status = resp.status;
    registro.bytes = corpo.byteLength;
    registro.cf_cache = resp.headers.get("cf-cache-status");
    registro.cf_ray = resp.headers.get("cf-ray");
    const destino = resp.headers.get("location");
    if (destino) registro.location = destino;

    if (esperado === "redirect") {
      const ok = [301, 302, 307, 308].includes(resp.status) && destino && new URL(destino, url).protocol === "https:";
      registro.classe = ok ? "redirecionamento_esperado" : "erro_http";
    } else {
      registro.classe = resp.status === esperado ? "sucesso" : "erro_http";
    }
  } catch (e) {
    registro.total_ms = +(performance.now() - inicio).toFixed(1);
    const nome = e.name === "TimeoutError" || e.cause?.name === "TimeoutError" ? "timeout" : "falha_conexao";
    registro.classe = nome;
    registro.erro = `${e.name}: ${e.cause?.code || e.cause?.message || e.message}`;
  }
  return registro;
}

function percentil(valores, p) {
  if (!valores.length) return null;
  const v = [...valores].sort((a, b) => a - b);
  return v[Math.min(v.length - 1, Math.ceil((p / 100) * v.length) - 1)];
}

await mkdir(EVID, { recursive: true });
const fim = Date.now() + Number(duracaoMin) * 60_000;
const rodadas = [];
console.log(`Alvo: ${ORIGEM} | duração: ${duracaoMin} min | intervalo: ${intervaloSeg} s | timeout: ${TIMEOUT_MS} ms`);

let n = 0;
do {
  n++;
  const inicioRodada = Date.now();
  const checks = [];
  let principal = await medir(ORIGEM + "/", { esperado: 200 });
  checks.push({ tipo: "pagina_principal", ...principal });
  if (principal.classe !== "sucesso") {
    await espera(5000);
    principal = await medir(ORIGEM + "/", { esperado: 200 });
    checks.push({ tipo: "pagina_principal_retentativa", ...principal });
  }
  checks.push({ tipo: "http_para_https", ...(await medir(ORIGEM.replace("https:", "http:") + "/", { esperado: "redirect" })) });
  for (const r of RECURSOS) checks.push({ tipo: "recurso", ...(await medir(ORIGEM + r, { esperado: 200 })) });
  checks.push({ tipo: "rota_inexistente", ...(await medir(ORIGEM + "/rota-inexistente-" + n, { esperado: 404 })) });

  const falhasPrincipal = checks.filter((c) => c.tipo.startsWith("pagina_principal") && c.classe !== "sucesso").length;
  const estado = falhasPrincipal === 0 ? "disponivel" : falhasPrincipal >= 2 ? "indisponivel_confirmado" : "instabilidade_recuperada";
  const outrasFalhas = checks.filter((c) => !c.tipo.startsWith("pagina_principal") && !["sucesso", "redirecionamento_esperado"].includes(c.classe));
  const rodada = { rodada: n, inicio: new Date(inicioRodada).toISOString(), estado, checks };
  rodadas.push(rodada);
  await appendFile(ARQ_LOG, JSON.stringify(rodada) + "\n");

  const p = checks[0];
  console.log(
    `#${String(n).padStart(3)} ${rodada.inicio}  ${estado.padEnd(24)} principal: ${p.status ?? p.classe} ${p.total_ms} ms` +
    (outrasFalhas.length ? `  | ${outrasFalhas.length} verificação(ões) com problema: ${outrasFalhas.map((c) => `${c.url} → ${c.status ?? c.classe}`).join(", ")}` : "  | demais verificações OK")
  );

  const restante = Number(intervaloSeg) * 1000 - (Date.now() - inicioRodada);
  if (Date.now() + restante >= fim) break;
  await espera(Math.max(0, restante));
} while (Date.now() < fim);

// ---------- Resumo ----------
const todas = rodadas.flatMap((r) => r.checks);
const principais = rodadas.map((r) => r.checks[0]);
const tempos = principais.filter((c) => c.classe === "sucesso").map((c) => c.total_ms);
const ttfbs = principais.filter((c) => c.classe === "sucesso").map((c) => c.ttfb_ms);
const contagem = (arr, campo) => arr.reduce((acc, c) => ((acc[c[campo]] = (acc[c[campo]] || 0) + 1), acc), {});
const resumo = {
  alvo: ORIGEM,
  inicio: rodadas[0].inicio,
  fim: new Date().toISOString(),
  intervalo_s: Number(intervaloSeg),
  timeout_ms: TIMEOUT_MS,
  rodadas: rodadas.length,
  requisicoes: todas.length,
  estados_das_rodadas: contagem(rodadas, "estado"),
  classes_de_resultado: contagem(todas, "classe"),
  disponibilidade_observada_pct: +((100 * rodadas.filter((r) => r.estado !== "indisponivel_confirmado").length) / rodadas.length).toFixed(2),
  pagina_principal_total_ms: tempos.length ? {
    min: Math.min(...tempos), media: +(tempos.reduce((a, b) => a + b, 0) / tempos.length).toFixed(1),
    mediana: percentil(tempos, 50), p90: percentil(tempos, 90), p95: percentil(tempos, 95), max: Math.max(...tempos)
  } : null,
  pagina_principal_ttfb_ms: ttfbs.length ? { mediana: percentil(ttfbs, 50), p95: percentil(ttfbs, 95) } : null,
  redirecionamento_http: todas.filter((c) => c.tipo === "http_para_https").map((c) => `${c.status} → ${c.location}`).filter((v, i, a) => a.indexOf(v) === i),
  status_por_tipo: Object.fromEntries(["pagina_principal", "http_para_https", "recurso", "rota_inexistente"].map((t) => [t, contagem(todas.filter((c) => c.tipo === t), "status")])),
  cf_cache_status: contagem(todas.filter((c) => c.cf_cache), "cf_cache"),
  log: ARQ_LOG.split(/[\\/]/).slice(-3).join("/")
};
await writeFile(ARQ_RESUMO, JSON.stringify(resumo, null, 2));
console.log("\nResumo:\n" + JSON.stringify(resumo, null, 2));
