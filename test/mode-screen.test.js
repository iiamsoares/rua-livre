import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const garage = readFileSync("js/garage.js", "utf8");
const css = readFileSync("css/garage.css", "utf8");
const server = readFileSync("tools/dev-server.mjs", "utf8");

test("escolha de modo usa o novo fundo e os dois cards fornecidos", () => {
  const assets = [
    "assets/tela_modo/tela_modo_background.png",
    "assets/tela_modo/botao_corrida_modo_solo.jpg",
    "assets/tela_modo/botao_corrida_coop.jpg",
  ];
  for (const asset of assets) assert.ok(existsSync(asset), `asset ausente: ${asset}`);
  assert.match(css, /assets\/tela_modo\/tela_modo_background\.png/);
  assert.match(garage, /assets\/tela_modo\/botao_corrida_modo_solo\.jpg/);
  assert.match(garage, /assets\/tela_modo\/botao_corrida_coop\.jpg/);
  assert.match(server, /"\.jpg": "image\/jpeg"/);
});

test("cards mantêm as ações solo e versus local", () => {
  assert.match(garage, /data-action="solo"[\s\S]*botao_corrida_modo_solo/);
  assert.match(garage, /data-action="versus"[\s\S]*botao_corrida_coop/);
});
