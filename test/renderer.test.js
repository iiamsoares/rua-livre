import test from "node:test";
import assert from "node:assert/strict";
import { RaceRenderer, roadHorizon, roadPerspective, sceneryPositions } from "../js/renderer.js";
import { createRioTrack } from "../js/track.js";
import { RACE_RULES, VIEW } from "../js/config.js";

const renderer = Object.create(RaceRenderer.prototype);
const raceAt = (distance) => ({ track: createRioTrack(), player: { distance, lateral: 0 } });

test("a perspectiva preserva os limites e acelera o movimento próximo à câmera", () => {
  assert.equal(roadPerspective(0), 1);
  assert.equal(roadPerspective(RACE_RULES.visibleDistance), 0);
  assert.equal(roadPerspective(-10), 1);
  const nearMotion = roadPerspective(10) - roadPerspective(20);
  const farMotion = roadPerspective(300) - roadPerspective(310);
  assert.ok(nearMotion > farMotion * 20);
});

test("o cenário permanece ancorado no mundo e aproxima-se ao avançar", () => {
  const before = sceneryPositions(100);
  const after = sceneryPositions(110);
  assert.ok(before.includes(112) && after.includes(112));
  const first = renderer.project(renderer.makeRoad(raceAt(100)), 112 - 100);
  const next = renderer.project(renderer.makeRoad(raceAt(110)), 112 - 110);
  assert.ok(next.y > first.y);
  assert.ok(next.scale > first.scale);
  assert.ok(!sceneryPositions(113).includes(112));
});

test("a malha tem profundidades ordenadas e projeções finitas em toda a volta", () => {
  for (let distance = 0; distance < 1680; distance += 13.7) {
    const road = renderer.makeRoad(raceAt(distance));
    assert.equal(road[0].y, VIEW.roadBottom);
    assert.equal(road.at(-1).y, roadHorizon(raceAt(distance)));
    for (let index = 1; index < road.length; index++) {
      assert.ok(road[index].distance > road[index - 1].distance);
      assert.ok(road[index].y < road[index - 1].y);
    }
    for (const delta of [-10, 0, 4.2, 40, 250, 500, 600]) {
      const point = renderer.project(road, delta, 0.62);
      assert.ok(Object.values(point).every(Number.isFinite));
      assert.ok(point.scale > 0 && point.scale <= 1);
    }
  }
});

test("as bordas das faixas não ficam presas à câmera", () => {
  const before = renderer.makeRoad(raceAt(101));
  const after = renderer.makeRoad(raceAt(102));
  assert.equal(before[1].distance + 101, after[1].distance + 102);
  assert.ok(after[1].y > before[1].y);
});

test("a câmera mostra curvas pronunciadas e variação de relevo", () => {
  const road = renderer.makeRoad(raceAt(240));
  assert.ok(Math.max(...road.map((point) => Math.abs(point.center - VIEW.width / 2))) > 40);
  assert.ok(Math.abs(roadHorizon(raceAt(0)) - roadHorizon(raceAt(400))) > 8);
});

test("o asfalto é desenhado em linhas opacas alinhadas aos pixels", () => {
  const rows = [];
  const localRenderer = Object.create(RaceRenderer.prototype);
  localRenderer.context = { fillRect: (...values) => rows.push(values) };
  localRenderer.drawFinishLines = () => {};
  const race = raceAt(240);
  localRenderer.drawRoad(race, localRenderer.makeRoad(race));
  assert.ok(rows.length > 100);
  for (const [x, y, width, height] of rows) {
    assert.ok([x, y, width, height].every(Number.isFinite));
    assert.equal(height, 1.5);
    assert.equal(y % 1.5, 0);
    assert.ok(width > 0);
  }
});
