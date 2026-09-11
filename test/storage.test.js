import test from "node:test";
import assert from "node:assert/strict";
import { defaultSave, migrateLegacy, sanitizeSave } from "../js/storage.js";

test("save inválido volta para limites seguros", () => {
  const save = sanitizeSave({ credits: -80, paint: "não existe", preparation: 99, bestPosition: 20, bestTime: -1, audio: false });
  assert.equal(save.credits, 0);
  assert.equal(save.paint, defaultSave().paint);
  assert.equal(save.preparation, 3);
  assert.equal(save.bestPosition, 4);
  assert.equal(save.bestTime, null);
  assert.equal(save.audio, false);
});

test("save legado preserva créditos, pintura e nível do motor", () => {
  const save = migrateLegacy({ credits: 2450, paint: "#e83d45", upgrades: { engine: 2 } });
  assert.equal(save.version, 3);
  assert.equal(save.credits, 2450);
  assert.equal(save.paint, "#e83d45");
  assert.equal(save.preparation, 2);
});
