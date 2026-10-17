// Gera reports/relatorio-tecnico.pdf a partir de reports/relatorio-tecnico.md.
// Uso: node tests/build-report-pdf.mjs   (requer npm install em tests/ e Chrome/Edge instalado)
import puppeteer from "puppeteer-core";
import { marked } from "marked";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REPORTS = fileURLToPath(new URL("../reports/", import.meta.url));
const CHROME = process.env.CHROME_PATH || [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].find(existsSync);

const md = await readFile(REPORTS + "relatorio-tecnico.md", "utf8");
const css = `
  @page { size: A4; margin: 18mm 16mm 20mm; }
  html, body { background: #fff; }
  body { font: 10.5pt/1.55 "Segoe UI", Arial, sans-serif; color: #1d1b18; }
  h1 { font: 700 21pt/1.2 Georgia, serif; margin: 0 0 6pt; color: #0e0d0c; }
  h2 { font: 700 14pt/1.25 Georgia, serif; margin: 20pt 0 6pt; padding-bottom: 3pt; border-bottom: 1.5pt solid #c9a45c; break-after: avoid; }
  h3 { font-size: 11.5pt; margin: 14pt 0 4pt; break-after: avoid; }
  table { border-collapse: collapse; width: 100%; margin: 6pt 0 10pt; font-size: 9pt; break-inside: avoid; }
  th, td { border: 0.5pt solid #cfc7b8; padding: 3.5pt 5pt; text-align: left; vertical-align: top; }
  th { background: #f3eee4; }
  code { font: 8.6pt Consolas, monospace; background: #f4f2ee; padding: 0 2pt; border-radius: 2pt; }
  pre { background: #f4f2ee; border: 0.5pt solid #ddd6ca; padding: 6pt 8pt; white-space: pre-wrap; word-break: break-word; font-size: 8.2pt; break-inside: avoid; }
  pre code { background: none; padding: 0; }
  blockquote { margin: 8pt 0; padding: 4pt 10pt; border-left: 3pt solid #c9a45c; background: #faf7f0; }
  img { max-width: 100%; max-height: 120mm; display: block; margin: 6pt auto; border: 0.5pt solid #ccc; }
  a { color: #7a5a1c; }
`;
// Imagens embutidas em base64: uma página criada com setContent não pode ler arquivos file://.
const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
let corpo = marked.parse(md);
for (const [, src] of corpo.matchAll(/<img src="([^"]+)"/g)) {
  const dados = await readFile(REPORTS + src);
  corpo = corpo.replace(`src="${src}"`, `src="data:${MIME[extname(src)]};base64,${dados.toString("base64")}"`);
}
const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>${css}</style></head><body>${corpo}</body></html>`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
await page.pdf({
  path: REPORTS + "relatorio-tecnico.pdf",
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: `<div style="font:8px Arial;color:#777;width:100%;padding:0 16mm;display:flex;justify-content:space-between"><span>Barbearia Navalha — Relatório técnico (avaliação pontual)</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`
});
await browser.close();
console.log("PDF gerado em reports/relatorio-tecnico.pdf");
