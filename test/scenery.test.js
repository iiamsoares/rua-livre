import test from "node:test";
import assert from "node:assert/strict";
import { RACE_RULES } from "../js/config.js";
import { ENVIRONMENTS } from "../js/scenery/environments.js";
import { generateScenery, sceneryForTrack } from "../js/scenery/generator.js";
import { BRASILIA_ATLAS, BRASILIA_SPRITES } from "../js/scenery/manifest.js";
import { createBrasiliaTrack } from "../js/track.js";

test("o atlas de Brasília usa apenas recortes válidos e sem sobreposição", () => {
  const entries = Object.entries(BRASILIA_SPRITES);
  for (const [id, sprite] of entries) {
    const { x, y, width, height } = sprite.source;
    assert.ok(width > 0 && height > 0, id);
    assert.ok(x >= 0 && y >= 0, id);
    assert.ok(x + width <= BRASILIA_ATLAS.width, id);
    assert.ok(y + height <= BRASILIA_ATLAS.height, id);
    assert.ok(sprite.anchor.x >= 0 && sprite.anchor.x <= 1, id);
    assert.ok(sprite.anchor.y >= 0 && sprite.anchor.y <= 1, id);
  }
  for (let first = 0; first < entries.length; first += 1) {
    for (let second = first + 1; second < entries.length; second += 1) {
      const [firstId, a] = entries[first];
      const [secondId, b] = entries[second];
      const overlap = a.source.x < b.source.x + b.source.width
        && a.source.x + a.source.width > b.source.x
        && a.source.y < b.source.y + b.source.height
        && a.source.y + a.source.height > b.source.y;
      assert.equal(overlap, false, `${firstId} e ${secondId}`);
    }
  }
});

test("o cenário de Brasília é determinístico, cacheado e repetido por volta", () => {
  const firstTrack = createBrasiliaTrack();
  const secondTrack = createBrasiliaTrack();
  const first = generateScenery(firstTrack, ENVIRONMENTS.brasilia);
  const again = generateScenery(secondTrack, ENVIRONMENTS.brasilia);
  assert.deepEqual(first, again);
  assert.equal(sceneryForTrack(firstTrack, ENVIRONMENTS.brasilia), sceneryForTrack(firstTrack, ENVIRONMENTS.brasilia));
  assert.ok(first.length > 300 && first.length < 1500);
  const baseCount = first.filter((object) => object.distance < firstTrack.length).length;
  assert.equal(first.length, baseCount * RACE_RULES.laps);
});

test("objetos ambientais ficam fora das faixas e não ativam colisão", () => {
  const track = createBrasiliaTrack();
  const objects = generateScenery(track, ENVIRONMENTS.brasilia);
  assert.ok(objects.some((object) => object.type.startsWith("ipe")));
  assert.ok(objects.some((object) => object.type === "guardrail"));
  assert.ok(objects.some((object) => object.type === "architecture"));
  for (const object of objects) {
    assert.ok(Math.abs(object.lane) >= 1.68);
    assert.equal(object.collision.enabled, false);
    assert.ok(["left", "right"].includes(object.side));
    assert.ok(Number.isFinite(object.distance));
  }
});

test("qualidade reduz densidade sem mudar a lógica da pista", () => {
  const track = createBrasiliaTrack();
  const low = generateScenery(track, ENVIRONMENTS.brasilia, "low");
  const high = generateScenery(track, ENVIRONMENTS.brasilia, "high");
  assert.ok(low.length < high.length);
  assert.equal(track.length, 1680);
  assert.equal(track.segments.length, 120);
});
