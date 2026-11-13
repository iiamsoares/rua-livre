import test from "node:test";
import assert from "node:assert/strict";
import { RaceRenderer, SCENERY_RENDER_SCALE, sceneryPositions } from "../js/renderer.js";
import { CAMERA, ENGINE, engineTrack, roadHorizon } from "../js/engines/rua-livre-adapter.js";
import { createBrasiliaTrack, createRioTrack } from "../js/track.js";
import { VIEW } from "../js/config.js";

const renderer = Object.create(RaceRenderer.prototype);
const raceAt = (distance) => ({ track: createRioTrack(), player: { distance, lateral: 0 } });

test("buracos são projetados no asfalto e recortados atrás de morros", () => {
  const points = [];
  let fills = 0;
  const local = Object.create(RaceRenderer.prototype);
  local.context = {
    save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, closePath() {},
    moveTo: (...point) => points.push(point), lineTo: (...point) => points.push(point),
    fill: () => fills++,
  };
  const race = raceAt(0);
  race.potholes = [{ distance: 30, lane: 0 }, { distance: -10, lane: 0 }, { distance: 600, lane: 0 }];
  local.drawPotholes(race, local.makeRoad(race));
  assert.equal(fills, 3);
  assert.ok(points.every((point) => point.every(Number.isFinite)));
  assert.ok(new Set(points.map((point) => point[1])).size > 1);
  fills = 0;
  local.project = () => ({ x: 240, y: 200, clipY: 100 });
  local.drawPotholes(race, {});
  assert.equal(fills, 0);
});

test("o sprite de buraco substitui o desenho procedural sem alterar a projeção", () => {
  let draws = 0;
  const local = Object.create(RaceRenderer.prototype);
  local.assets = { pothole: {} };
  local.context = {
    save() {}, restore() {}, beginPath() {}, rect() {}, clip() {},
    drawImage: (...values) => { draws++; assert.ok(values.slice(1).every(Number.isFinite)); },
  };
  const race = raceAt(0);
  race.potholes = [{ distance: 35, lane: 0, hit: false }];
  local.drawPotholes(race, local.makeRoad(race));
  assert.equal(draws, 1);
});

test("pétalas usam a zona dos ipês e permanecem ancoradas à pista", () => {
  let draws = 0;
  const local = Object.create(RaceRenderer.prototype);
  local.assets = { petals: {} };
  local.context = {
    save() {}, restore() {}, beginPath() {}, rect() {}, clip() {},
    drawImage: () => { draws++; },
  };
  local.project = (_road, distance, lane) => ({ x: 240 + lane * 10, y: 90 + distance * 0.2, clipY: 270, scale: 0.5 });
  const track = createBrasiliaTrack();
  local.drawEnvironmentalParticles({ track, elapsed: 2, player: { distance: track.length * 0.25 } }, {});
  assert.ok(draws > 0);
  draws = 0;
  local.drawEnvironmentalParticles({ track, elapsed: 2, player: { distance: track.length * 0.05 } }, {});
  assert.equal(draws, 0);
});

test("o minimapa novo mantém um marcador dinâmico", () => {
  let images = 0;
  let markers = 0;
  const local = Object.create(RaceRenderer.prototype);
  local.assets = { miniMap: {} };
  local.mapCanvas = { width: 96, height: 96 };
  local.mapContext = {
    clearRect() {}, drawImage: () => { images++; }, beginPath() {},
    arc: (...values) => { markers++; assert.ok(values.every(Number.isFinite)); },
    fill() {}, fillRect() {},
  };
  const track = createBrasiliaTrack();
  local.drawMap({ track, player: { distance: track.length * 0.5 } });
  assert.equal(images, 1);
  assert.equal(markers, 1);
});

test("o coletável de turbo usa a garrafa fornecida", () => {
  let draws = 0;
  const local = Object.create(RaceRenderer.prototype);
  local.assets = { turboPickup: {} };
  local.context = { drawImage: (...values) => { draws++; assert.ok(values.slice(1).every(Number.isFinite)); } };
  local.project = () => ({ x: 240, y: 150, clipY: 270, scale: 0.7 });
  local.drawEntities({
    player: { distance: 0 }, traffic: [], rivals: [], peers: [],
    pickups: [{ distance: 30, lane: 0, collected: false }],
  }, {});
  assert.equal(draws, 1);
});

test("a derrapagem usa a animação de poeira fornecida", () => {
  let dustFrames = 0;
  const local = Object.create(RaceRenderer.prototype);
  local.assets = { dustParticles: {}, playerIndicator: null };
  local.playerSprite = null;
  local.context = {
    save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, fillRect() {},
    drawImage: () => { dustFrames++; },
  };
  local.drawPlayer({
    elapsed: 1.5,
    impactTimer: 0,
    player: { distance: 30, lateral: 0, speed: 90, nitro: 50, health: 100, boosting: false, drifting: true, steerVisual: 0.4 },
  });
  assert.equal(dustFrames, 1);
});

test("a projeção do motor acelera o movimento próximo à câmera", () => {
  const road = renderer.makeRoad(raceAt(0));
  const nearMotion = renderer.project(road, 10).half - renderer.project(road, 20).half;
  const farMotion = renderer.project(road, 300).half - renderer.project(road, 310).half;
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

test("o mapa de Brasília preserva a geometria e seleciona o ambiente próprio", () => {
  const brasilia = createBrasiliaTrack();
  const rio = createRioTrack();
  assert.equal(brasilia.environmentId, "brasilia");
  assert.equal(brasilia.length, rio.length);
  assert.deepEqual(brasilia.segments, rio.segments);
});

test("o renderizador usa os quatro atlas sem depender da velocidade do carro", () => {
  const local = Object.create(RaceRenderer.prototype);
  const atlases = { cerrado: {}, eixo: {}, lago: {}, reta: {} };
  const used = new Set();
  const destinations = [];
  local.assets = { sceneryAtlases: atlases };
  local.hasSceneryAtlases = true;
  local.context = {
    save() {}, restore() {}, beginPath() {}, rect() {}, clip() {},
    drawImage: (atlas, ...values) => { used.add(atlas); destinations.push(values.slice(-4)); },
  };
  const track = createBrasiliaTrack();
  for (const distance of [0, 300, 670, 1090, 1430]) {
    const race = { track, totalDistance: track.length * 3, player: { distance, lateral: 0, speed: distance % 2 ? 0 : 260 } };
    local.drawScenery(race, local.makeRoad(race));
  }
  assert.equal(used.size, 4);
  assert.ok(destinations.length > 100);
  assert.ok(destinations.flat().every(Number.isFinite));
});

test("cenários dobram de escala e o pórtico atravessa toda a pista", () => {
  assert.equal(SCENERY_RENDER_SCALE, 2);
  const calls = [];
  const local = Object.create(RaceRenderer.prototype);
  local.assets = { sceneryAtlases: { cerrado: {}, eixo: {}, lago: {}, reta: {} } };
  local.hasSceneryAtlases = true;
  local.context = {
    save() {}, restore() {}, beginPath() {}, rect() {}, clip() {},
    drawImage: (...values) => calls.push(values),
  };
  const track = createBrasiliaTrack();
  const archDistance = track.length * 0.985;
  const race = { track, totalDistance: track.length * 3, player: { distance: archDistance - 30, lateral: 0 } };
  const road = local.makeRoad(race);
  local.drawScenery(race, road);
  const arch = calls.find((values) => values[1] === 500 && values[2] === 195);
  assert.ok(arch);
  assert.ok(arch[7] > local.project(road, 30, 0).half * 2);
});

test("a malha tem profundidades ordenadas e projeções finitas em toda a volta", () => {
  for (let distance = 0; distance < 1680; distance += 13.7) {
    const road = renderer.makeRoad(raceAt(distance));
    assert.ok(Math.abs(renderer.project(road, 0).y - VIEW.roadBottom) < 3);
    for (const segment of road.segments) {
      if (segment.visible) {
        assert.ok(segment.p2.y < segment.p1.y);
        assert.ok(segment.p2.y < segment.clipY);
      }
    }
    for (const delta of [-10, 0, 4.2, 40, 250, 500, 600]) {
      const point = renderer.project(road, delta, 0.62);
      assert.ok(Object.values(point).every(Number.isFinite));
      assert.ok(point.scale > 0 && point.scale < CAMERA.zoom + 0.01);
    }
  }
});

test("o motor mantém a distância da pista e reutiliza a geometria convertida", () => {
  const track = createRioTrack();
  const converted = engineTrack(track);
  assert.equal(converted.length / ENGINE.unitsPerMetre, track.length);
  assert.equal(converted.segments.length, 840);
  assert.equal(engineTrack(track), converted);
  assert.ok(renderer.makeRoad(raceAt(0)).segments.length > 200);
});

test("a câmera aproxima pista e veículos na mesma proporção sem deslocar o jogador", () => {
  const race = raceAt(0);
  race.player.lateral = 0.62;
  const point = renderer.project(renderer.makeRoad(race), 0, race.player.lateral);
  assert.equal(CAMERA.zoom, 1.12);
  assert.ok(Math.abs(point.scale - CAMERA.zoom) < 0.01);
  assert.ok(Math.abs(point.x - (VIEW.width / 2 + race.player.lateral * 34)) < 2);
  assert.ok(Math.abs(point.y - VIEW.roadBottom) < 3);
});

test("a câmera mostra curvas pronunciadas e variação de relevo", () => {
  const road = renderer.makeRoad(raceAt(240));
  assert.ok(Math.max(...road.segments.filter((s) => s.p2).map((s) => Math.abs(s.p2.x - VIEW.width / 2))) > 40);
  assert.ok(Math.abs(roadHorizon(raceAt(0)) - roadHorizon(raceAt(400))) > 8);
});

test("o motor recorta morros e preserva a emenda da volta", () => {
  const track = createRioTrack();
  let hiddenByHill = false;
  for (let distance = 0; distance < track.length; distance += 20) {
    const frame = renderer.makeRoad({ track, player: { distance, lateral: 0 } });
    hiddenByHill ||= frame.segments.some((s) => s.p1 && s.p2 && s.p1.cameraZ > 2000 && s.p2.y > s.clipY);
  }
  assert.equal(hiddenByHill, true);
  const before = renderer.project(renderer.makeRoad(raceAt(track.length - 0.001)), 50);
  const after = renderer.project(renderer.makeRoad(raceAt(track.length + 0.001)), 50);
  assert.ok(Math.abs(before.x - after.x) < 2);
  assert.ok(Math.abs(before.y - after.y) < 2);
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
