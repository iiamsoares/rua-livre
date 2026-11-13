import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const css = readFileSync("css/style.css", "utf8");
const main = readFileSync("js/main.js", "utf8");

test("tela inicial usa o novo fundo e exibe Jogar antes de Garagem", () => {
  assert.match(css, /assets\/tela_inicial\/background\.png/);
  const play = html.indexOf("assets/tela_inicial/botao_jogar.png");
  const garage = html.indexOf("assets/tela_inicial/botao_garagem.png");
  assert.ok(play >= 0 && garage > play);
  assert.match(css, /body\[data-screen="title"\] \.topbar \{ display: none; \}/);
});

test("Jogar abre os modos e Garagem entra diretamente no fluxo solo", () => {
  assert.match(main, /#playButton[\s\S]*showScreen\("mode"\)/);
  assert.match(main, /#garageButton[\s\S]*garage\.act\("solo"\)/);
});
