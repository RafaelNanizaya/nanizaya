// Servidor estático mínimo para testes locais (sem dependências).
// Uso: node tests/serve.mjs [porta]   → serve a pasta barbearia-landing/
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORT = Number(process.argv[2] || process.env.PORT || 8080);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg",
  ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".json": "application/json"
};
// Arquivos e pastas que existem no repositório mas não fazem parte do site publicado.
const PRIVADO = /^\/(tests|reports|node_modules|README\.md|_headers)(\/|$)/;

export function startServer(port = PORT) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT) || PRIVADO.test(path)) return send404(res);
    try {
      if ((await stat(file)).isDirectory()) file = join(file, "index.html");
      const body = await readFile(file);
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
      res.end(body);
    } catch {
      send404(res);
    }
  });
  async function send404(res) {
    res.writeHead(404, { "Content-Type": TYPES[".html"] });
    res.end(await readFile(join(ROOT, "404.html")).catch(() => "404"));
  }
  return new Promise((ok) => server.listen(port, "127.0.0.1", () => ok(server)));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await startServer();
  console.log(`Servindo ${ROOT} em http://127.0.0.1:${PORT}`);
}
