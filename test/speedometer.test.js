import test from "node:test";
import assert from "node:assert/strict";
import { gaugeAngle, PixelSpeedometer } from "../js/speedometer.js";

test("o ponteiro cobre 0 a 260 km/h sem ultrapassar o mostrador", () => {
  assert.equal(gaugeAngle(-10), gaugeAngle(0));
  assert.equal(gaugeAngle(NaN), gaugeAngle(0));
  assert.equal(gaugeAngle(999), gaugeAngle(260));
  assert.ok(gaugeAngle(190) > gaugeAngle(100));
  assert.ok(Math.abs(gaugeAngle(260) - gaugeAngle(0) - Math.PI * 1.5) < 1e-10);
});

test("o velocímetro desenha pixels inteiros e atualiza velocidade, marcha e nitro", () => {
  let clears = 0;
  let pixels = 0;
  const ctx = {
    clearRect() { clears++; },
    fillRect(...values) { pixels++; assert.ok(values.every(Number.isInteger)); },
  };
  const gauge = new PixelSpeedometer({ getContext: () => ctx });
  gauge.draw(0, "N");
  assert.ok(pixels > 200);
  gauge.draw(0, "N");
  assert.equal(clears, 1);
  gauge.draw(190, 6);
  gauge.draw(190, 6, true);
  gauge.draw(0, "N");
  assert.equal(clears, 4);
  assert.equal(ctx.imageSmoothingEnabled, false);
});
