# Relatório técnico — Landing page Barbearia Navalha

**Publicação, disponibilidade e teste de carga básico**

> **Avaliação pontual.** Este relatório descreve o que foi observado entre 01:20 e 01:40 (horário de
> Brasília) de 17/10/2026. Ele **não garante** disponibilidade ou desempenho futuros e **não mede** a
> capacidade máxima do site.

---

## A. Identificação

| Item | Valor |
|---|---|
| Projeto | Landing page da Barbearia Navalha (empresa fictícia, projeto-piloto) |
| Endereço testado | `https://barbearia-navalha.pages.dev` |
| Hospedagem | Cloudflare Pages, plano gratuito, projeto `barbearia-navalha` (*Direct Upload*) |
| Implantação testada | `83af21af-0fe5-4616-b90a-4d33077120b6`, ambiente *Production* |
| Código-fonte | GitHub `RafaelNanizaya/nanizaya`, branch `barbearia-landing`, pasta `barbearia-landing/` |
| Data | 17/10/2026 |
| Janela de testes no site publicado | 04:20–04:40 UTC (01:20–01:40 em Brasília) |
| Ambiente de execução | Windows 11 Pro (10.0.26200), Intel Core i5-12450H, 15,7 GB de RAM, conexão residencial; requisições atendidas pela borda Cloudflare **GRU (São Paulo)** |
| Ferramentas | k6 v2.3.0 · Node.js v24.21.0 · Chrome 155 headless via puppeteer-core 24.10.0 · Wrangler 4.151.1 · curl 8.21.0 |

Detalhes do ambiente: [`evidencias/ambiente.txt`](evidencias/ambiente.txt).

## B. Objetivo

**O que se pretendia verificar**

1. Se a landing page funciona corretamente depois de publicada: carregamento, links, menu móvel,
   formulário e responsividade.
2. Se o endereço público responde de forma estável durante uma janela curta de observação
   (disponibilidade observada).
3. Como o site se comporta sob **carga leve**: 1, 2 e 5 visitantes simultâneos.

**O que NÃO fazia parte do teste**

- Teste de estresse, de pico ou de capacidade máxima. Nenhuma tentativa de "derrubar" o site.
- Medição a partir de outras cidades, operadoras ou redes móveis (4G/5G).
- Disponibilidade de longo prazo. Isso exige monitoramento contínuo por dias ou semanas.
- Serviços de terceiros: WhatsApp, mapas e agendamento. Nenhum deles é chamado pelo site.
- Domínio próprio, DNS e e-mail. O site usa apenas o endereço gratuito `*.pages.dev`.

## C. Metodologia

### C.1 Publicação

O site é estático (HTML, CSS e JavaScript, sem build). A publicação seguiu estes passos:

```bash
wrangler login                                                   # autorização OAuth no navegador
wrangler pages project list --json                               # resultado: [] (nenhum projeto existente)
wrangler pages project create barbearia-navalha --production-branch main --force
wrangler pages deploy dist --project-name barbearia-navalha --branch main \
  --commit-hash 959ee1a… --commit-message "Barbearia Navalha - primeira publicacao" --commit-dirty=true
```

`dist/` é uma cópia apenas dos arquivos do site: sem testes, relatórios ou README.

> Observação: o Wrangler 4.151 tenta redirecionar a criação de projetos "Pages" para o novo modelo
> Workers. Essa tentativa falhou sem criar nada (confirmado com `project list` e `deployments list`).
> A flag `--force`, indicada pela própria ferramenta, criou o projeto no Cloudflare Pages tradicional.

### C.2 Testes funcionais

O script [`tests/functional.mjs`](../tests/functional.mjs) abre o site no Chrome headless,
**sem cache**, em três larguras (celular 360 px, tablet 768 px e desktop 1366 px) e executa
64 verificações automáticas. Ele foi executado contra a versão local e contra a versão publicada:

```bash
node tests/functional.mjs                                                  # local
TAG=producao node tests/functional.mjs https://barbearia-navalha.pages.dev  # publicado
```

### C.3 Disponibilidade

O script [`tests/availability-check.mjs`](../tests/availability-check.mjs) faz uma rodada por minuto,
com requisições **sequenciais** e timeout de 10 s. Cada rodada contém 9 requisições:

| Verificação | Resultado esperado |
|---|---|
| `GET https://…/` (página principal) | 200 |
| `GET http://…/` (sem HTTPS) | redirecionamento 301/302/307/308 para `https://` |
| CSS, 2 arquivos JS, imagem principal e 2 fontes (6 recursos) | 200 |
| `GET https://…/rota-inexistente-N` | 404 (comportamento correto) |

Cada resposta foi classificada como *sucesso*, *redirecionamento esperado*, *erro HTTP* (o servidor
respondeu com status inesperado), *falha de conexão* (DNS/TLS/conexão, sem resposta HTTP) ou
*timeout*. Uma rodada só seria considerada **indisponível confirmada** se a página principal
falhasse duas vezes seguidas (nova tentativa após 5 s).

```bash
node tests/availability-check.mjs https://barbearia-navalha.pages.dev 10 60
```

### C.4 Teste de carga

O script [`tests/load-test.k6.js`](../tests/load-test.k6.js) usa o k6. Cada **iteração** simula a
visita de uma pessoa: carrega o HTML e 5 recursos (CSS, 2 JS, imagem principal, fonte dos títulos)
e depois espera de 2 a 4 s antes da visita seguinte.

**Limites de segurança** (autorizados previamente pelo responsável pelo site):

| Limite | Valor |
|---|---|
| Alvo permitido | somente `*.pages.dev` deste projeto (o script recusa outros domínios) |
| Usuários virtuais (VUs) | 1 → 2 → 5, nunca mais de 5 |
| Duração por cenário | até 60 s |
| Teto de requisições | 10 req/s (opção `rps` do k6) |
| Timeout por requisição | 10 s |
| Pausa entre cenários | 30 s após a verificação individual; 60 s entre os demais |
| Interrupção automática | taxa de erro > 5 %, qualquer resposta 429/503 ou p95 > 3 s |

**Critério de sucesso de cada cenário:** taxa de erro < 5 %, p95 < 3 s, nenhuma resposta 429/503 e
mais de 99 % das verificações de conteúdo aprovadas.

```bash
k6 run -e BASE_URL=https://barbearia-navalha.pages.dev -e VUS=1 -e ITERATIONS=1 tests/load-test.k6.js
k6 run -e BASE_URL=https://barbearia-navalha.pages.dev -e VUS=1 -e DURATION=60s tests/load-test.k6.js
k6 run -e BASE_URL=https://barbearia-navalha.pages.dev -e VUS=2 -e DURATION=60s tests/load-test.k6.js
k6 run -e BASE_URL=https://barbearia-navalha.pages.dev -e VUS=5 -e DURATION=60s tests/load-test.k6.js
# + repetição diagnóstica do cenário de 2 VUs (ver seção E), com --out csv
```

Os comandos foram executados com `--summary-export` para gerar os arquivos JSON de evidência.

## D. Resultados

### D.1 Publicação

| Verificação | Resultado |
|---|---|
| Status da implantação informado pela Cloudflare | *Deployment complete*, ambiente **Production** |
| Arquivos enviados | 32 arquivos + `_headers` |
| DNS de `barbearia-navalha.pages.dev` | resolve para 172.66.44.214, 172.66.47.42 e 2 endereços IPv6 |
| HTTPS | certificado válido, sem erros (Chrome e curl) |
| `http://` → `https://` | **301 Moved Permanently** |
| Cabeçalhos de segurança do `_headers` | aplicados (CSP, `X-Content-Type-Options`, `X-Robots-Tag: noindex` e outros) |
| Rota inexistente | **404** com a página de erro própria |

### D.2 Testes funcionais

| Ambiente | Verificações | Aprovadas | Reprovadas |
|---|---|---|---|
| Local (`127.0.0.1`) | 64 | 64 | 0 |
| Publicado (`barbearia-navalha.pages.dev`) | 64 | 64 | 0 |

O que foi verificado, em todas as larguras quando aplicável:

- Página responde 200; nenhum erro de JavaScript; nenhum erro ou aviso no console, incluindo
  violações da CSP; nenhuma requisição com falha ou HTTP ≥ 400.
- Todas as 8 imagens e as 2 fontes carregadas; nenhuma rolagem horizontal em 360, 768 ou 1366 px.
- Menu móvel: abre e fecha (inclusive com Esc, devolvendo o foco ao botão), encosta no cabeçalho
  sem deixar faixa vazia, e o link rola até a seção certa.
- Metadados: `lang="pt-BR"`, título, descrição, viewport, favicon e Open Graph; um único `<h1>`;
  landmarks `header`/`nav`/`main`/`footer`; texto alternativo em todas as imagens; rótulos em todos
  os campos; nenhum ID duplicado.
- Links: todas as âncoras internas e os 17 recursos relativos respondem 200; nenhum recurso de
  domínio externo.
- Teclado: o primeiro Tab foca o link "Pular para o conteúdo".
- Formulário: envio vazio bloqueado, com 5 campos marcados; erro específico para telefone
  incompleto; domingo recusado; horários das 09:00 às 19:30 em dia útil; máscara de telefone;
  envio válido gera a prévia da mensagem e informa que **nenhum dado foi enviado ou armazenado**.
- Botão de WhatsApp em modo demonstrativo abre a prévia sem sair do site, e o número aparece
  identificado como demonstrativo.

Desempenho de uma carga inicial **sem cache**, sem limitação de rede, medido no Chrome:

| Medida | Celular (360 px) | Desktop (1366 px) |
|---|---|---|
| Tempo até o primeiro byte (TTFB) | 133 ms | 58 ms |
| DOMContentLoaded | 311 ms | 266 ms |
| Evento `load` | 338 ms | 303 ms |
| Maior elemento visível (LCP) | 436 ms | 328 ms |
| Requisições na carga inicial | 9 | 8 |
| Dados transferidos na carga inicial | 136 KB | 150 KB |
| Protocolo | HTTP/2 | HTTP/3 |

Peso total do site publicado: 547 KB (todas as imagens em todas as larguras, fontes e código).

### D.3 Disponibilidade

Janela: **04:22:22 a 04:31:22 UTC** (01:22–01:31 em Brasília). 10 rodadas, uma por minuto, com
**90 requisições** no total.

| Indicador | Resultado |
|---|---|
| Rodadas "disponível" | **10 de 10** |
| Rodadas com instabilidade recuperada | 0 |
| Rodadas indisponíveis confirmadas | 0 |
| Sucessos (status esperado) | 80 |
| Redirecionamentos esperados (HTTP → HTTPS, 301) | 10 |
| Erros HTTP inesperados | **0** |
| Falhas de conexão | **0** |
| Timeouts | **0** |
| Página principal: status | 200 em 10 de 10 |
| Recursos principais: status | 200 em 60 de 60 |
| Rota inexistente: status | 404 em 10 de 10 (esperado) |

Tempo total de resposta da página principal (10 amostras):

| Mínimo | Média | Mediana | p90 | p95 | Máximo |
|---|---|---|---|---|---|
| 98,2 ms | 281,2 ms | 133,7 ms | 181,0 ms | 1.605,6 ms | 1.605,6 ms |

O máximo (1.605,6 ms) é a **primeira** requisição da janela, que inclui resolução DNS, abertura de
conexão e TLS. As 9 rodadas seguintes ficaram entre 98 e 181 ms. Com apenas 10 amostras, o p95
coincide com o valor máximo. Os 60 recursos tiveram mediana de 53,1 ms e máximo de 141,5 ms.

### D.4 Teste de carga

Período: **04:31:36 a 04:38:52 UTC** (01:31–01:38 em Brasília). Latências em milissegundos,
considerando **todas** as requisições: HTML e recursos.

| Cenário | VUs | Duração | Visitas | Requisições | Req/s | Falhas | Média | Mediana | p90 | p95 | Máx. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0. Verificação individual | 1 | 1 iteração | 1 | 6 | 1,81 | 0 (0 %) | 61,1 | 60,3 | 71,8 | 75,4 | 78,9 |
| 1. Um usuário | 1 | 60 s | 16 | 96 | 1,60 | 0 (0 %) | 42,9 | 39,9 | 58,6 | 60,5 | 74,7 |
| 2. Dois usuários | 2 | 60 s | 31 | 186 | 2,97 | 0 (0 %) | 201,9 | 46,3 | 732,4 | 1.014,9 | 1.486,2 |
| 2b. Dois usuários (repetição) | 2 | 60 s | 34 | 204 | 3,25 | 0 (0 %) | 43,3 | 39,8 | 59,2 | 68,7 | 100,1 |
| 3. Cinco usuários | 5 | 60 s | 78 | 468 | 7,36 | 0 (0 %) | 41,2 | 36,7 | 56,1 | 63,3 | 198,6 |
| **Total** | | | **160** | **960** | | **0 (0 %)** | | | | | |

| Indicador (todos os cenários) | Resultado |
|---|---|
| Verificações de conteúdo aprovadas (status 200 e título presente) | 100 % em todos os cenários (1.120 de 1.120) |
| Respostas 429 (limite de requisições) ou 503 | **0** |
| Timeouts | **0** |
| Limites (*thresholds*) violados | **nenhum**; nenhum cenário foi interrompido |
| Maior taxa de requisições observada | 7,36 req/s (teto configurado: 10 req/s) |
| Dados recebidos no cenário de 5 VUs | 10 MB em ~60 s (158 kB/s) |

Fases da requisição no cenário 2 (primeira execução) e na repetição 2b:

| Fase | Cenário 2: mediana / p95 / máx. | Cenário 2b: mediana / p95 / máx. |
|---|---|---|
| Espera pela resposta (TTFB) | 41,6 / 953,0 / 1.486,2 ms | 33,8 / 63,8 / 83,5 ms |
| Recebimento do conteúdo | 3,3 / 14,8 / 1.231,4 ms | 4,2 / 17,4 / 24,9 ms |
| Conexão TCP (máx.) | 25,8 ms | 31,5 ms |
| Handshake TLS (máx.) | 53,1 ms | 47,5 ms |

**Resultados que não puderam ser obtidos**

- Tempo de cada requisição individual no cenário 2 original: a gravação por requisição só foi
  ativada na repetição. Por isso não é possível saber exatamente quando ocorreu a lentidão nem
  quais arquivos foram afetados.
- Métricas internas da Cloudflare (uso de CPU, cache na borda). O plano gratuito do Pages não
  expõe esses dados por requisição, e o cabeçalho `cf-cache-status` não veio nas respostas.
- Desempenho em rede móvel e a partir de outras regiões: não testados.

## E. Análise

**Disponibilidade observada.** Durante os 9 minutos de observação, o site respondeu em todas as
rodadas, sem erro, falha de conexão ou timeout. O redirecionamento para HTTPS e a página 404 se
comportaram como esperado. Uma janela de 9 minutos **não permite** afirmar nada sobre
disponibilidade mensal, nem dizer que o site tem "alta disponibilidade".

**Desempenho sob carga leve.** Com 1 e 5 visitantes simultâneos, as respostas ficaram rápidas e
estáveis (mediana em torno de 37–40 ms, p95 em torno de 60–63 ms) e **não pioraram** ao passar de 1
para 5 usuários. Esse comportamento é esperado para arquivos estáticos servidos pela rede da
Cloudflare a partir de São Paulo.

**Anomalia no cenário de 2 usuários.** Na primeira execução, cerca de 10 % das requisições demoraram
entre ~0,7 s e 1,5 s. O atraso ocorreu na **espera pela resposta**, e não na abertura de conexão,
que permaneceu rápida. A repetição do mesmo cenário, minutos depois, voltou ao padrão (p95 de
68,7 ms), e o cenário seguinte, com **mais** carga (5 usuários), também foi rápido. Isso indica uma
**oscilação transitória**, sem relação com o número de usuários. As causas possíveis são a rede
local ou residencial, o trajeto até a Cloudflare ou a própria borda. Os dados coletados **não
permitem determinar** qual delas foi. Mesmo nesse momento, nenhuma requisição falhou e o critério de
p95 < 3 s foi cumprido.

**Limitações do teste.**

- Um único ponto de origem (uma máquina, uma conexão residencial, uma região).
- Janelas curtas: 9 min de disponibilidade e 60 s por cenário de carga.
- Carga muito baixa por desenho: até 7,4 req/s.
- O k6 não executa JavaScript nem renderiza a página. A experiência visual foi medida
  separadamente, com o Chrome, em uma única carga.
- As medições com Chrome não simularam rede móvel lenta.

**Capacidade máxima.** **Não foi medida e não deve ser inferida.** Os resultados mostram apenas que
o site atendeu bem até 5 visitantes simultâneos, durante 60 s, a partir de um único ponto. Não
mostram quantos visitantes ele suportaria. A Cloudflare Pages tem infraestrutura própria de
distribuição, mas confirmar números maiores exigiria um teste planejado especificamente para isso,
com autorização e monitoramento.

## F. Conclusão

Durante a janela de teste, o site **funcionou conforme todos os critérios definidos**:

- publicação confirmada pela Cloudflare e endereço público respondendo com HTTPS;
- 64 de 64 verificações funcionais aprovadas na versão publicada;
- 10 de 10 rodadas de disponibilidade bem-sucedidas, sem falhas nem timeouts;
- 960 requisições de carga leve (1 a 5 usuários) com **0 % de erro**, nenhuma limitação (429/503)
  e p95 dentro do limite em todos os cenários.

**Problemas encontrados**

| # | Problema | Situação |
|---|---|---|
| 1 | Menu móvel abria com uma faixa vazia abaixo do cabeçalho (efeito do `backdrop-filter` sobre o `position: fixed`) | **Corrigido** antes da publicação; verificação automática incluída |
| 2 | Campo inválido com foco exibia borda dourada em vez de vermelha | **Corrigido** antes da publicação |
| 3 | Galeria com espaços vazios no grid e título do hero quebrando em 3 linhas no desktop | **Corrigido** antes da publicação |
| 4 | Lentidão transitória (p95 ≈ 1 s) em uma execução do cenário de 2 usuários | Não se repetiu; causa não determinada; sem erros |
| 5 | Primeira requisição de cada nova conexão ≈ 1,6 s (DNS + TLS) | Comportamento normal de conexão nova; acompanhar em monitoramento real |

Nenhum problema crítico permanece aberto. Este resultado **não indica** que o site esteja preparado
para milhares de usuários; isso não foi testado.

## G. Evidências

Todos os arquivos estão em [`reports/evidencias/`](evidencias/):

| Arquivo | Conteúdo |
|---|---|
| `deploy-cloudflare-pages.txt` | Saída do deploy, lista de projetos e de implantações (ID da conta ocultado) |
| `testes-funcionais-producao.json` / `.txt` | 64 verificações na versão publicada |
| `testes-funcionais-local.json` / `.txt` | 64 verificações na versão local |
| `producao-*.jpg`, `local-*.jpg` | Capturas de tela: página inteira e primeira dobra em 360/768/1366 px, menu aberto, erros do formulário, prévia do WhatsApp |
| `desempenho-carregamento.txt` | TTFB, DCL, `load`, LCP, requisições e bytes da carga inicial |
| `disponibilidade-console.txt` | Saída da verificação de disponibilidade |
| `disponibilidade-2026-10-17T04-22-22.jsonl` | Log detalhado de cada requisição (status, tempos, `cf-ray`) |
| `disponibilidade-2026-10-17T04-22-22-resumo.json` | Resumo calculado |
| `k6-<cenário>.txt` | Saída completa do k6 de cada cenário (linhas de progresso removidas) |
| `k6-<cenário>-resumo.json` | Métricas exportadas pelo k6 (`--summary-export`) |
| `ambiente.txt` | Sistema operacional, hardware e versões das ferramentas |

Trecho do registro de implantação:

```
✨ Success! Uploaded 32 files (1.84 sec)
✨ Uploading _headers
🌎 Deploying...
✨ Deployment complete! Take a peek over at https://83af21af.barbearia-navalha.pages.dev

"Id": "83af21af-0fe5-4616-b90a-4d33077120b6", "Environment": "Production", "Branch": "main", "Source": "959ee1a"
```

Trecho do resultado do k6, cenário de 5 usuários:

```
█ THRESHOLDS
  checks                       ✓ 'rate>0.99'   rate=100.00%
  http_req_duration            ✓ 'p(95)<3000'  p(95)=63.25ms
  http_req_failed              ✓ 'rate<0.05'   rate=0.00%
  respostas_limitacao_429_503  ✓ 'count<1'     count=0
```

Site publicado, primeira dobra (desktop e celular):

![Site publicado em desktop, 1366 px](evidencias/producao-desktop-1366px-dobra.jpg)

![Site publicado em celular, 360 px](evidencias/producao-celular-360px-dobra.jpg)

Nenhum log contém senhas, tokens ou dados pessoais. Os dados digitados no formulário durante o
teste são fictícios ("Cliente Teste", "(11) 98765-4321").

## H. Recomendações

1. **Monitoramento contínuo:** configurar um verificador externo gratuito (UptimeRobot, Better Stack
   ou um *Cron Trigger* da Cloudflare) para checar a página a cada 1–5 minutos e alertar por e-mail.
   Só assim é possível falar em disponibilidade mensal.
2. **Medir a experiência real:** ativar o *Web Analytics* gratuito da Cloudflare para acompanhar
   tempos de carregamento de visitantes reais, especialmente em celulares e redes móveis.
3. **Acompanhamento de erros:** registrar erros de JavaScript de visitantes reais. O Web Analytics
   não faz isso; seria preciso um serviço como Sentry, plano gratuito.
4. **Backups e versões:** o código está versionado no GitHub. Recomenda-se integrar a branch `main`
   e, se desejar deploy automático, criar um projeto Pages conectado ao Git. Projetos *Direct Upload*
   não podem ser convertidos. A Cloudflare mantém o histórico de implantações, o que permite voltar a
   uma versão anterior pelo painel.
5. **Imagens:** já estão em WebP com várias larguras (hero de 1920 px com 30 KB). Para um cliente
   real, usar fotos próprias com o mesmo processo de otimização e, opcionalmente, oferecer AVIF.
6. **Repetir os testes após mudanças** (`node tests/functional.mjs <url>`) e, antes de campanhas de
   divulgação, repetir o teste de carga com gravação por requisição ativada (`--out csv`), para
   investigar qualquer oscilação como a observada no cenário 2.
7. **Antes de usar para um comerciante real:** configurar o número de WhatsApp em `js/config.js`,
   remover o `noindex`, trocar o conteúdo demonstrativo e revisar a política de privacidade (LGPD),
   caso o formulário passe a coletar dados. Veja a lista completa no `README.md`.
8. **Segurança da conta:** o login do Wrangler pediu permissões amplas, como é o padrão da
   ferramenta. Revogue o acesso deste computador com `wrangler logout` quando não for mais publicar
   por ele, ou use um *API Token* restrito a "Cloudflare Pages: Edit".

---

*Relatório elaborado a partir dos dados coletados nos testes descritos acima. Os números
apresentados foram medidos e não estimados; onde um dado não pôde ser obtido, isso está indicado.*
