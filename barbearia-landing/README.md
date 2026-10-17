# Barbearia Navalha — landing page (projeto-piloto)

Landing page de uma **barbearia fictícia**, criada para validar um fluxo profissional de criação,
publicação, teste e documentação de sites para pequenos comerciantes.

- **Site publicado:** <https://barbearia-navalha.pages.dev>
- **Relatório técnico:** [`reports/relatorio-tecnico.md`](reports/relatorio-tecnico.md) (também em PDF: [`reports/relatorio-tecnico.pdf`](reports/relatorio-tecnico.pdf))

> Todo o conteúdo comercial (preços, equipe, avaliações, endereço, telefone e e-mail) é
> **demonstrativo** e está identificado como tal na própria página.

## Estrutura

```
barbearia-landing/
├── index.html            Página principal (todas as seções)
├── creditos.html         Créditos e licenças das imagens e fontes
├── 404.html              Página de erro própria (a Cloudflare Pages responde 404 com ela)
├── favicon.svg
├── robots.txt            Bloqueia indexação (empresa fictícia)
├── _headers              Cabeçalhos de segurança e cache para a Cloudflare Pages
├── css/style.css         Estilos (sem framework)
├── js/config.js          ← CONFIGURAÇÕES DO COMERCIANTE (WhatsApp, horários)
├── js/main.js            Comportamento: menu móvel, formulário, WhatsApp, horário
├── assets/img/           Imagens WebP otimizadas (várias larguras) + ícones
├── assets/fonts/         Fontes Playfair Display e Inter (woff2) + licenças OFL
├── tests/                Ferramentas de teste (NÃO são publicadas como parte do site)
│   ├── serve.mjs             Servidor estático local, sem dependências
│   ├── functional.mjs        Testes funcionais com Chrome headless (puppeteer-core)
│   ├── availability-check.mjs Verificação de disponibilidade por amostragem
│   └── load-test.k6.js       Teste de carga leve com k6
└── reports/
    ├── relatorio-tecnico.md
    ├── relatorio-tecnico.pdf
    └── evidencias/           Capturas de tela, logs JSON e saídas dos testes
```

O site é **estático**: HTML, CSS e JavaScript puro, sem etapa de build e sem dependências em
tempo de execução. Nenhum recurso é carregado de domínios externos.

## Executar localmente

Requer Node.js 18 ou superior.

```bash
cd barbearia-landing
node tests/serve.mjs 8080
# abra http://127.0.0.1:8080
```

Também funciona com qualquer servidor estático (por exemplo, `npx serve .`). Abrir o
`index.html` direto pelo explorador de arquivos funciona em parte, mas alguns navegadores
restringem fontes em `file://`. Prefira um servidor.

## Publicar na Cloudflare Pages

Configuração usada neste projeto:

| Item | Valor |
|---|---|
| Tipo de projeto | Pages, *Direct Upload* (via Wrangler) |
| Nome do projeto | `barbearia-navalha` |
| Diretório publicado | `barbearia-landing/` (a pasta inteira) |
| Comando de build | nenhum |
| Branch de produção | `main` (rótulo da implantação de produção no Wrangler) |

### Opção A — Wrangler (como foi feito aqui)

```bash
npx wrangler@4 login                          # autoriza no navegador
npx wrangler@4 pages project create barbearia-navalha --production-branch main   # só na 1ª vez
npx wrangler@4 pages deploy barbearia-landing --project-name barbearia-navalha --branch main
npx wrangler@4 logout                         # opcional: revoga o acesso deste computador
```

O comando de deploy publica a pasta inteira. A pasta `tests/` contém `node_modules` depois de
`npm install`: **rode o deploy a partir de um clone limpo** ou apague `tests/node_modules` antes
(o Wrangler ignora `node_modules` por padrão, mas é melhor não depender disso).

### Opção B — Integração com GitHub (deploy automático a cada push)

No painel: **Workers & Pages → Create → Pages → Connect to Git** e selecione o repositório.

- Production branch: `main` (ou a branch onde a pasta estiver)
- Framework preset: *None*
- Build command: *(vazio)*
- Build output directory: `barbearia-landing`

> Um projeto criado por *Direct Upload* não pode ser convertido em projeto Git depois.
> Para usar a opção B, crie um projeto novo.

## Testes

```bash
cd barbearia-landing/tests
npm install                     # instala apenas puppeteer-core (usa o Chrome já instalado)

# 1. Testes funcionais (layout em 360/768/1366 px, links, menu, formulário, acessibilidade básica)
node functional.mjs                         # contra um servidor local temporário
TAG=producao node functional.mjs https://SEU-SITE.pages.dev    # contra o site publicado

# 2. Disponibilidade: 10 minutos, uma rodada por minuto
node availability-check.mjs https://SEU-SITE.pages.dev 10 60

# 3. Carga leve com k6 (https://grafana.com/docs/k6/latest/set-up/install-k6/)
#    Um cenário por vez, com pausa entre eles:
k6 run -e BASE_URL=https://SEU-SITE.pages.dev -e VUS=1 -e ITERATIONS=1 load-test.k6.js
k6 run -e BASE_URL=https://SEU-SITE.pages.dev -e VUS=1 -e DURATION=60s load-test.k6.js
k6 run -e BASE_URL=https://SEU-SITE.pages.dev -e VUS=2 -e DURATION=60s load-test.k6.js
k6 run -e BASE_URL=https://SEU-SITE.pages.dev -e VUS=5 -e DURATION=60s load-test.k6.js
```

Se o Chrome não estiver no caminho padrão, informe-o em `CHROME_PATH`.
O script do k6 **recusa** alvos que não sejam `*.pages.dev` ou `localhost`, mais de 5 usuários
virtuais ou mais de 60 s por cenário. Teste apenas sites que você controla.

### Como interpretar os resultados

- **Testes funcionais:** cada linha mostra `PASSOU` ou `FALHOU`. O resultado completo fica em
  `reports/evidencias/testes-funcionais-<tag>.json` e as capturas de tela, na mesma pasta.
- **Disponibilidade:** cada rodada é classificada como `disponivel`, `instabilidade_recuperada`
  (uma falha seguida de sucesso na nova tentativa) ou `indisponivel_confirmado` (duas falhas
  seguidas). Um `404` na rota inexistente e um `301/308` de HTTP para HTTPS são
  **comportamentos esperados**, não falhas.
- **k6:** observe `http_req_failed` (taxa de erro), `http_req_duration` (latência: média,
  mediana, p90, p95) e `http_reqs` (volume). Os limites (`thresholds`) marcados com ✓ foram
  atendidos. Se algum limite for violado, o k6 interrompe o teste e retorna código de saída ≠ 0.
- Um teste curto mostra o comportamento **naquele momento**. Não é garantia de disponibilidade
  futura nem medida da capacidade máxima do site.

## O que trocar para um comerciante real

1. **`js/config.js`**: preencha `whatsapp.numero` (só dígitos, com 55 + DDD, ex.: `5511912345678`)
   e `whatsapp.exibicao`. Com o número definido, o botão e o formulário passam a abrir o WhatsApp
   de verdade, em vez da janela de demonstração. Ajuste `funcionamento` aos horários reais.
2. **`index.html`**:
   - remova a faixa `demo-banner` e os avisos "fictício/demonstrativo";
   - troque nomes, textos da equipe, preços, endereço, e-mail e horários do rodapé;
   - substitua as avaliações por avaliações **reais**, com autorização dos clientes;
   - troque o mapa ilustrativo (SVG) por um mapa real. Um `<iframe>` do Google Maps exige
     liberar `frame-src` na CSP do `_headers`;
   - remova `<meta name="robots" content="noindex, nofollow">`;
   - adicione `<link rel="canonical">` e use URLs absolutas em `og:image`.
3. **`_headers`**: remova a linha `X-Robots-Tag: noindex`.
4. **`robots.txt`**: troque `Disallow: /` por `Allow: /` (e, se quiser, indique um sitemap).
5. **Fotos**: use fotos da própria barbearia. As atuais são de bancos de imagens livres e retratam
   outros estabelecimentos. Mantenha `creditos.html` atualizado.
6. **Domínio próprio**: em *Custom domains* no projeto Pages. Isso altera DNS e deve ser feito
   pelo responsável pelo domínio.
7. **Formulário**: hoje ele só gera a mensagem de WhatsApp. Para receber dados por e-mail ou
   salvar em planilha, é preciso uma integração (por exemplo, Cloudflare Pages Functions) e uma
   política de privacidade compatível com a LGPD.

## Licenças de terceiros

- Fotografias: Wikimedia Commons (CC0 e CC BY 2.0). Detalhes em [`creditos.html`](creditos.html).
- Fontes: Playfair Display e Inter, sob SIL Open Font License 1.1 (`assets/fonts/OFL-*.txt`).
