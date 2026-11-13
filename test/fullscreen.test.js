import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { enterFullscreen, exitFullscreen } from "../js/fullscreen.js";

test("corrida ocupa todo o viewport e oculta elementos externos", () => {
  const css = readFileSync("css/style.css", "utf8");
  assert.match(css, /body\[data-screen="race"\] \.topbar[\s\S]*display: none/);
  assert.match(css, /body\[data-screen="race"\] \.race-screen[\s\S]*width: 100vw;[\s\S]*height: 100dvh/);
  assert.match(css, /body\[data-screen="race"\] \.race-shell[\s\S]*width: 100%;[\s\S]*height: 100%/);
});

test("fullscreen entra e sai sem quebrar quando a API está disponível", async () => {
  let entered = 0;
  let exited = 0;
  const documentRef = {
    fullscreenElement: null,
    documentElement: { requestFullscreen: async () => { entered += 1; } },
    exitFullscreen: async () => { exited += 1; },
  };
  assert.equal(await enterFullscreen(documentRef), true);
  assert.equal(entered, 1);
  documentRef.fullscreenElement = documentRef.documentElement;
  assert.equal(await exitFullscreen(documentRef), true);
  assert.equal(exited, 1);
});

test("fullscreen usa fallback silencioso quando o navegador bloqueia a API", async () => {
  assert.equal(await enterFullscreen({ documentElement: {} }), false);
  assert.equal(await exitFullscreen({ fullscreenElement: null }), false);
  assert.equal(await enterFullscreen({ documentElement: { requestFullscreen: () => Promise.reject(new Error("bloqueado")) } }), false);
});
