import test from "node:test";
import assert from "node:assert/strict";
import { RACE_RULES } from "../js/config.js";
import { ENVIRONMENTS } from "../js/scenery/environments.js";
import { generateScenery, sceneryForTrack } from "../js/scenery/generator.js";
import { BRASILIA_SPRITES, SCENERY_ATLASES } from "../js/scenery/manifest.js";
import { BRASILIA_ZONES, zoneAtProgress, zoneBlendAt } from "../js/scenery/brasilia-zones.js";
import { createBrasiliaTrack } from "../js/track.js";

test("o atlas de Brasília usa apenas recortes válidos e sem sobreposição", () => {
  const entries = Object.entries(BRASILIA_SPRITES);
  for (const [id, sprite] of entries) {
    const { x, y, width, height } = sprite.source;
    const atlas = SCENERY_ATLASES[sprite.atlas];
    assert.ok(atlas, `${id}: atlas`);
    assert.ok(width > 0 && height > 0, id);
    assert.ok(x >= 0 && y >= 0, id);
    assert.ok(x + width <= atlas.width, id);
    assert.ok(y + height <= atlas.height, id);
    assert.ok(sprite.anchor.x >= 0 && sprite.anchor.x <= 1, id);
    assert.ok(sprite.anchor.y >= 0 && sprite.anchor.y <= 1, id);
  }
  for (let first = 0; first < entries.length; first += 1) {
    for (let second = first + 1; second < entries.length; second += 1) {
      const [firstId, a] = entries[first];
      const [secondId, b] = entries[second];
      const overlap = a.atlas === b.atlas
        && a.source.x < b.source.x + b.source.width
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
  assert.ok(objects.some((object) => object.type.includes("Guardrail") || object.type === "guardrail"));
  assert.ok(objects.some((object) => object.type.startsWith("eixo")));
  assert.ok(objects.some((object) => object.type.startsWith("lago")));
  assert.ok(objects.some((object) => object.type.startsWith("reta")));
  for (const object of objects) {
    if (object.render.layer === "overhead") assert.equal(object.lane, 0);
    else assert.ok(Math.abs(object.lane) >= 1.68);
    assert.equal(object.collision.enabled, false);
    assert.ok(["left", "right", "center"].includes(object.side));
    assert.ok(Number.isFinite(object.distance));
  }
});

test("as cinco zonas cobrem a volta e mudam nos limites declarados", () => {
  assert.equal(BRASILIA_ZONES.length, 5);
  assert.equal(BRASILIA_ZONES[0].start, 0);
  assert.equal(BRASILIA_ZONES.at(-1).end, 1);
  for (let index = 1; index < BRASILIA_ZONES.length; index += 1) {
    assert.equal(BRASILIA_ZONES[index - 1].end, BRASILIA_ZONES[index].start);
  }
  assert.equal(zoneAtProgress(0.05).id, "cerrado");
  assert.equal(zoneAtProgress(0.18).id, "ipes");
  assert.equal(zoneAtProgress(0.4).id, "monumental");
  assert.equal(zoneAtProgress(0.65).id, "paranoa");
  assert.equal(zoneAtProgress(0.85).id, "capital");
  assert.equal(zoneAtProgress(1.181).id, "ipes");
});

test("os últimos vinte por cento de cada trecho misturam a zona seguinte", () => {
  const stable = zoneBlendAt(0.1);
  const transition = zoneBlendAt(0.17);
  assert.equal(stable.current.id, "cerrado");
  assert.equal(stable.blend, 0);
  assert.equal(transition.next.id, "ipes");
  assert.ok(transition.blend > 0 && transition.blend < 1);
  const loopTransition = zoneBlendAt(0.99);
  assert.equal(loopTransition.current.id, "capital");
  assert.equal(loopTransition.next.id, "cerrado");
  assert.ok(loopTransition.blend > 0);
});

test("pórtico e zonas se repetem sem alterar a quantidade configurada de voltas", () => {
  const track = createBrasiliaTrack();
  const fiveLaps = generateScenery(track, ENVIRONMENTS.brasilia, "high", 5);
  const base = fiveLaps.filter((object) => object.distance < track.length);
  assert.equal(fiveLaps.length, base.length * 5);
  assert.equal(fiveLaps.filter((object) => object.type === "retaFinishArch").length, 5);
  for (let lap = 1; lap < 5; lap += 1) {
    const previous = fiveLaps.filter((object) => object.distance >= (lap - 1) * track.length && object.distance < lap * track.length);
    const current = fiveLaps.filter((object) => object.distance >= lap * track.length && object.distance < (lap + 1) * track.length);
    assert.deepEqual(current.map((object) => object.type), previous.map((object) => object.type));
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
