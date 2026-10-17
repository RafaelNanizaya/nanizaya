// Teste de carga BÁSICO e de baixa intensidade com k6 (https://k6.io).
//
// Executa UM cenário por vez. Rode-os em sequência, com pausa entre eles:
//   k6 run -e BASE_URL=https://seu-site.pages.dev -e VUS=1 -e ITERATIONS=1 tests/load-test.k6.js   (verificação individual)
//   k6 run -e BASE_URL=https://seu-site.pages.dev -e VUS=1 -e DURATION=60s tests/load-test.k6.js
//   k6 run -e BASE_URL=https://seu-site.pages.dev -e VUS=2 -e DURATION=60s tests/load-test.k6.js
//   k6 run -e BASE_URL=https://seu-site.pages.dev -e VUS=5 -e DURATION=60s tests/load-test.k6.js
//
// Limites de segurança embutidos:
//   - no máximo 5 usuários virtuais e 60 s por cenário (valores maiores são recusados);
//   - teto global de 10 requisições por segundo (opção "rps" do k6);
//   - pausa de 2 a 4 s entre "visitas" de cada usuário virtual, como uma pessoa real;
//   - timeout de 10 s por requisição;
//   - o teste é ABORTADO automaticamente se a taxa de erro passar de 5%, se aparecer
//     qualquer resposta 429/503 (sinal de limitação) ou se o p95 passar de 3 s.
//   - só aceita alvos *.pages.dev ou localhost, para evitar testar domínios de terceiros.
import http from "k6/http";
import { check, sleep, fail } from "k6";
import { Counter } from "k6/metrics";

const BASE = (__ENV.BASE_URL || "").replace(/\/$/, "");
const VUS = Number(__ENV.VUS || 1);
const DURATION = __ENV.DURATION || "";
const ITERATIONS = Number(__ENV.ITERATIONS || 0);

if (!/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.pages\.dev$|^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE)) {
  fail(`BASE_URL inválida ou não permitida: "${BASE}". Use o endereço *.pages.dev do projeto.`);
}
if (VUS < 1 || VUS > 5) fail("VUS deve estar entre 1 e 5 neste teste básico.");
if (DURATION && !/^([1-9]|[1-5]\d|60)s$/.test(DURATION)) fail("DURATION deve ser de 1s a 60s.");

const limitacao = new Counter("respostas_limitacao_429_503");

export const options = {
  rps: 10,
  scenarios: {
    carga_leve: ITERATIONS
      ? { executor: "per-vu-iterations", vus: VUS, iterations: ITERATIONS, maxDuration: "60s" }
      : { executor: "constant-vus", vus: VUS, duration: DURATION || "60s", gracefulStop: "10s" }
  },
  thresholds: {
    http_req_failed: [{ threshold: "rate<0.05", abortOnFail: true, delayAbortEval: "5s" }],
    http_req_duration: [{ threshold: "p(95)<3000", abortOnFail: true, delayAbortEval: "10s" }],
    respostas_limitacao_429_503: [{ threshold: "count<1", abortOnFail: true }],
    checks: ["rate>0.99"]
  },
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)"],
  userAgent: "BarbeariaNavalha-load-test/1.0 (k6; teste autorizado de baixa intensidade)",
  noConnectionReuse: false
};

const PARAMS = { timeout: "10s", tags: {} };
const RECURSOS = [
  ["css", "/css/style.css"],
  ["js_config", "/js/config.js"],
  ["js_main", "/js/main.js"],
  ["img_hero", "/assets/img/hero-1280.webp"],
  ["fonte_titulos", "/assets/fonts/playfair-latin.woff2"]
];

function registrarLimitacao(res) {
  if (res.status === 429 || res.status === 503) limitacao.add(1);
}

// Cada iteração simula a visita de uma pessoa: carrega o HTML e os recursos principais.
export default function () {
  const pagina = http.get(`${BASE}/`, { ...PARAMS, tags: { recurso: "html" } });
  registrarLimitacao(pagina);
  check(pagina, {
    "html: status 200": (r) => r.status === 200,
    "html: contém o título da barbearia": (r) => typeof r.body === "string" && r.body.includes("Barbearia Navalha")
  });

  const respostas = http.batch(RECURSOS.map(([nome, caminho]) => ["GET", `${BASE}${caminho}`, null, { ...PARAMS, tags: { recurso: nome } }]));
  respostas.forEach((r, i) => {
    registrarLimitacao(r);
    check(r, { [`${RECURSOS[i][0]}: status 200`]: (x) => x.status === 200 });
  });

  sleep(2 + Math.random() * 2);
}
