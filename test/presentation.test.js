import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const htmlPath = new URL("../apresentacao/index.html", import.meta.url);
const cssPath = new URL("../apresentacao/apresentacao.css", import.meta.url);
const scriptPath = new URL("../apresentacao/apresentacao.js", import.meta.url);

test("apresentação cobre o jogo atual, as mecânicas e a evolução do protótipo", async () => {
  const html = await readFile(htmlPath, "utf8");
  assert.equal((html.match(/class="slide(?:\s|\")/g) || []).length, 12);
  for (const topic of ["O jogo hoje", "Mecânicas de pilotagem", "Desafio e progressão", "Solo e versus local", "Do protótipo ao jogo atual"]) {
    assert.match(html, new RegExp(topic));
  }
  assert.match(html, /10 modelos/);
  assert.match(html, /Brasília em cinco trechos/);
});

test("apresentação oferece navegação por teclado, toque, tela cheia e impressão", async () => {
  const [css, script] = await Promise.all([readFile(cssPath, "utf8"), readFile(scriptPath, "utf8")]);
  assert.match(script, /ArrowRight/);
  assert.match(script, /requestFullscreen/);
  assert.match(script, /touchstart/);
  assert.match(css, /@media print/);
  assert.match(css, /aspect-ratio: 16 \/ 9/);
});
