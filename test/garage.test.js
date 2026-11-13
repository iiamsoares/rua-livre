import test from "node:test";
import assert from "node:assert/strict";
import { buyPreparation, buyVehicle, canStart, createSelection, ownsCar, selectVehicle } from "../js/garage-model.js";
import { defaultSave, sanitizeSave, writeSave, loadSave } from "../js/storage.js";
import { carStats } from "../js/race.js";

test("seleção independente preserva J1 ao selecionar J2 e sobrevive ao armazenamento", () => {
  let save = defaultSave();
  const state = createSelection(save);
  state.previewId = "vectra";
  save = selectVehicle(save, state);
  state.player = 1; state.previewId = "up";
  save = selectVehicle(save, state);
  assert.equal(save.carId, "vectra");
  assert.equal(save.playerTwoCarId, "up");
  const values = new Map();
  const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
  writeSave(save, storage);
  assert.deepEqual(loadSave(storage), save);
  assert.ok(canStart(save, "solo") && canStart(save, "versus"));
});
test("save anterior preserva saldo, preparação e recordes ao receber seleção de J2", () => {
  const save = sanitizeSave({ credits: 1500, preparation: 2, carId: "vectra", bestPosition: 1, bestTime: 99 });
  assert.equal(save.playerTwoCarId, "chevette");
  assert.equal(save.credits, 1500);
  assert.equal(save.preparation, 2);
  assert.equal(save.bestTime, 99);
  assert.equal(save.bestPosition, 1);
});
test("compra de preparação desconta o preço existente e rejeita confirmação duplicada", () => {
  const save = { ...defaultSave(), credits: 1400 };
  const next = buyPreparation(save, 1);
  assert.equal(next.credits, 900);
  assert.equal(next.preparation, 2);
  assert.equal(buyPreparation(next, 1), next);
  const max = buyPreparation(next, 2);
  assert.equal(max.credits, 0);
  assert.equal(carStats(max.preparation).topSpeed, 206);
  assert.equal(buyPreparation(max, 3), max);
  assert.equal(buyPreparation(save, null), save);
  assert.equal(buyPreparation(defaultSave(), 1).preparation, 1);
});
test("catálogo futuro bloqueia compra sem saldo e uso de carro não adquirido", () => {
  const catalog = [{ id: "up" }, { id: "future", price: 500 }];
  let save = { ...defaultSave(), credits: 499, playerTwoCarId: "future" };
  assert.equal(buyVehicle(save, "future", catalog), save);
  assert.equal(selectVehicle(save, { player: 0, previewId: "future" }, catalog), save);
  assert.equal(canStart(save, "versus", catalog), false);
  assert.equal(canStart(save, "solo", catalog), true);
  save = buyVehicle({ ...save, credits: 500 }, "future", catalog);
  assert.equal(save.credits, 0);
  assert.ok(ownsCar(save, catalog[1]));
  assert.ok(canStart(save, "versus", catalog));
  assert.equal(buyVehicle(save, "future", catalog), save);
});
