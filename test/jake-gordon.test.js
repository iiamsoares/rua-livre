import test from "node:test";
import assert from "node:assert/strict";
import { addRoad, createRoad, elevationAt, lateralStep, projectPoint, projectRoad, segmentAt } from "../js/engines/jake-gordon.js";

const viewport = { width: 480, height: 270, roadWidth: 2000 };
const camera = { x: 0, y: 1000, z: 0, depth: 1 / Math.tan(100 * Math.PI / 360) };

test("a direção importada depende da velocidade e admite compensação da curva", () => {
  assert.equal(lateralStep(1, 0, 1, 1 / 60), 0);
  assert.equal(lateralStep(0, 1, 0, 1 / 60), 0);
  assert.ok(lateralStep(0, 1, 1, 1 / 60) < 0);
  assert.ok(lateralStep(1, 1, 1, 1 / 60) > 0);
  assert.ok(Math.abs(lateralStep(0, 1, 1, 1 / 60)) > Math.abs(lateralStep(0, 0.5, 1, 1 / 60)));
});

test("motor importado projeta com perspectiva e rejeita o plano próximo", () => {
  assert.equal(projectPoint({ y: 0, z: 0 }, camera, viewport), null);
  assert.equal(projectPoint({ y: 0, z: -1 }, camera, viewport), null);
  const near = projectPoint({ y: 0, z: 2000 }, camera, viewport);
  const far = projectPoint({ y: 0, z: 4000 }, camera, viewport);
  assert.equal(near.x, 240);
  assert.ok(near.half > far.half);
  assert.ok(near.y > far.y);
  assert.ok(Object.values(near).every(Number.isFinite));
});

test("gerador adaptado une curvas e elevações sem frestas", () => {
  const road = createRoad();
  addRoad(road, 10, 10, 10, 4, 20);
  addRoad(road, 10, 10, 10, -4, -20);
  assert.equal(road.length, 12000);
  assert.equal(road.segments.at(-1).p2.y, road.segments[0].p1.y);
  for (let index = 1; index < road.segments.length; index++) {
    assert.deepEqual(road.segments[index].p1, road.segments[index - 1].p2);
  }
  assert.equal(elevationAt(road, road.length), elevationAt(road, 0));
  assert.equal(segmentAt(road, -1).index, road.segments.length - 1);
});

test("projeção do motor mantém geometria finita em curvas, morros e múltiplas voltas", () => {
  const road = createRoad();
  addRoad(road, 20, 20, 20, 4, 30);
  addRoad(road, 20, 20, 20, -4, -30);
  for (const position of [0, 199, 200, 6000, road.length - 1, road.length + 1]) {
    const projected = projectRoad(road, { ...camera, z: position, y: elevationAt(road, position) + 1000 }, viewport, 250);
    assert.equal(projected.length, 250);
    assert.ok(projected.some((segment) => segment.visible));
    for (const segment of projected) {
      for (const point of [segment.p1, segment.p2]) {
        if (point) assert.ok(Object.values(point).every(Number.isFinite));
      }
      if (segment.visible) {
        assert.ok(segment.p2.y < segment.p1.y);
        assert.ok(segment.p2.y < segment.clipY);
      }
    }
  }
});

test("o motor não altera a pista ao projetar a câmera", () => {
  const road = addRoad(createRoad(), 20, 20, 20, 2, 0);
  const before = structuredClone(road);
  projectRoad(road, camera, viewport);
  assert.deepEqual(road, before);
  assert.throws(() => createRoad(0), RangeError);
  assert.throws(() => addRoad(road, 0, 0, 0), RangeError);
  assert.throws(() => segmentAt(createRoad(), 0), RangeError);
});
