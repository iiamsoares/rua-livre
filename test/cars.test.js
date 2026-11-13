import test from "node:test";
import assert from "node:assert/strict";
import { PLAYER_CARS } from "../js/config.js";
import { carPreviewMarkup } from "../js/car-preview.js";
import { peerCarFrameIndex, playerCarFrameIndex } from "../js/renderer.js";
import { sanitizeSave } from "../js/storage.js";

const addedIds = ["civic-g8", "gol-quadrado", "jetta", "marea", "opala", "santana", "uno-mille"];

test("catálogo registra os sete carros novos com sprites e recortes válidos", () => {
  assert.equal(PLAYER_CARS.length, 10);
  assert.equal(new Set(PLAYER_CARS.map((car) => car.id)).size, PLAYER_CARS.length);
  for (const id of addedIds) {
    const car = PLAYER_CARS.find((item) => item.id === id);
    assert.ok(car, `carro ausente: ${id}`);
    assert.equal(car.spriteLayout, "direction-columns");
    assert.equal(car.spriteRows, 2);
    assert.equal(car.spriteFrames.length, 8);
    assert.ok(car.spriteAsset.startsWith("assets/cars/player/"));
    for (const [x, y, width, height] of car.spriteFrames) {
      assert.ok(x >= 0 && y >= 0 && width > 0 && height > 0);
      assert.ok(x + width <= 1254 && y + height <= 1254);
    }
  }
});

test("carros novos permanecem selecionados no save e ganham recorte na interface", () => {
  for (const id of addedIds) assert.equal(sanitizeSave({ carId: id }).carId, id);
  const car = PLAYER_CARS.find((item) => item.id === "opala");
  const markup = carPreviewMarkup(car, "vehicle-thumbnail", "Opala na oficina");
  assert.match(markup, /car-preview-crop vehicle-thumbnail/);
  assert.match(markup, /spritsheet_opala\.png/);
  assert.match(markup, /aria-label="Opala na oficina"/);
});

test("layout novo escolhe direção traseira e versão com nitro", () => {
  const car = PLAYER_CARS.find((item) => item.id === "civic-g8");
  const player = { steerVisual: 0, boosting: false, speed: 0, distance: 0 };
  assert.equal(playerCarFrameIndex(car, player), 3);
  assert.equal(playerCarFrameIndex(car, { ...player, steerVisual: -0.5 }), 1);
  assert.equal(playerCarFrameIndex(car, { ...player, steerVisual: 0.5 }), 2);
  assert.equal(playerCarFrameIndex(car, { ...player, boosting: true }), 7);
  assert.equal(peerCarFrameIndex(car), 3);
});

test("seleção de quadros dos carros anteriores continua inalterada", () => {
  const chevette = PLAYER_CARS.find((item) => item.id === "chevette");
  const up = PLAYER_CARS.find((item) => item.id === "up");
  assert.equal(playerCarFrameIndex(chevette, { steerVisual: 0, speed: 0, distance: 0 }), 6);
  assert.equal(playerCarFrameIndex(up, { steerVisual: 0, speed: 0, distance: 0 }), 10);
  assert.equal(peerCarFrameIndex(chevette), 6);
  assert.equal(peerCarFrameIndex(up), 10);
});
