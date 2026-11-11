import test from "node:test";
import assert from "node:assert/strict";
import { calculateReward, carStats, createRace, updateRace } from "../js/race.js";
import { createRioTrack, curveAt, elevationAt, segmentAt } from "../js/track.js";

const idle = { accelerate: false, brake: false, steer: 0, nitro: false };

test("a pista possui 1,68 km e segmentos navegáveis em loop", () => {
  const track = createRioTrack();
  assert.equal(track.segments.length, 120);
  assert.equal(track.length, 1680);
  assert.equal(segmentAt(track, 0).index, segmentAt(track, track.length).index);
  assert.equal(typeof curveAt(track, 700), "number");
  assert.equal(track.mapPoints.length, track.segments.length);
});

test("preparação aumenta desempenho sem ultrapassar três estágios", () => {
  assert.deepEqual(carStats(1), { topSpeed: 190, acceleration: 68, steering: 1.28 });
  assert.equal(carStats(3).topSpeed, 206);
  assert.deepEqual(carStats(99), carStats(3));
});

test("contagem regressiva bloqueia o movimento e emite a largada", () => {
  const race = createRace({ preparation: 1 }, createRioTrack(), 10);
  const start = race.player.distance;
  let events = [];
  for (let index = 0; index < 190; index += 1) events = events.concat(updateRace(race, { ...idle, accelerate: true }, 1 / 60));
  assert.equal(start, 0);
  assert.ok(events.some((event) => event.type === "go"));
  assert.ok(race.player.distance > 0);
});

test("rivais e trânsito recebem modelos válidos da folha de NPCs", () => {
  const race = createRace({ preparation: 1 }, createRioTrack(), 22);
  assert.equal(race.rivals.length, 3);
  assert.equal(race.position, 4);
  assert.equal(new Set(race.rivals.map((rival) => rival.spriteIndex)).size, 3);
  assert.ok(race.rivals.every((rival) => rival.spriteIndex >= 0 && rival.spriteIndex < 16));
  assert.ok(race.traffic.every((vehicle) => vehicle.spriteIndex >= 0 && vehicle.spriteIndex < 16));
});

test("uma corrida pausada não altera o estado", () => {
  const race = createRace({ preparation: 1 }, createRioTrack(), 11);
  race.countdown = 0;
  race.paused = true;
  updateRace(race, { ...idle, accelerate: true }, 1);
  assert.equal(race.elapsed, 0);
  assert.equal(race.player.speed, 0);
});

test("o trânsito tem doze carros com velocidades variadas sem aumentar os rivais", () => {
  const race = createRace({ preparation: 1 }, createRioTrack(), 50);
  assert.equal(race.rivals.length, 3);
  assert.equal(race.position, 4);
  assert.equal(race.traffic.length, 12);
  assert.ok(race.traffic.filter((car) => car.distance <= 500).length >= 8);
  assert.ok(race.traffic.every((car) => car.speed >= 60 && car.speed < 147));
  assert.ok(new Set(race.traffic.map((car) => Math.floor(car.speed / 25))).size >= 4);
  assert.ok(Math.max(...race.traffic.map((car) => car.speed)) - Math.min(...race.traffic.map((car) => car.speed)) > 65);
});

test("carros civis percorrem distâncias diferentes e não contam para a classificação", () => {
  const race = createRace({ preparation: 1 }, createRioTrack(), 51);
  race.countdown = 0;
  const before = race.traffic.map((car) => car.distance);
  updateRace(race, idle, 1 / 60);
  race.traffic.forEach((car, index) => {
    assert.ok(Math.abs(car.distance - before[index] - car.speed / 3.6 / 60) < 0.00001);
  });
  assert.equal(race.position, 4);
});

test("o trânsito reaparece fora da câmera sem sobrepor carros na mesma faixa", () => {
  const race = createRace({ preparation: 1 }, createRioTrack(), 52);
  race.countdown = 0;
  race.player.distance = 1000;
  race.traffic.forEach((car) => { car.distance = 0; });
  updateRace(race, idle, 1 / 60);
  assert.equal(race.traffic.length, 12);
  assert.ok(race.traffic.every((car) => car.distance > race.player.distance + 500 && car.speed >= 60 && car.speed < 147));
  for (let i = 0; i < race.traffic.length; i++) {
    for (let j = i + 1; j < race.traffic.length; j++) {
      const a = race.traffic[i];
      const b = race.traffic[j];
      if (a.lane === b.lane) assert.ok(Math.abs(a.distance - b.distance) > 23);
    }
  }
});

test("o jogador não atravessa um veículo na mesma faixa", () => {
  const race = createRace({ preparation: 1 }, createRioTrack(), 30);
  race.countdown = 0;
  race.player.distance = 35;
  race.player.speed = 180;
  const obstacle = race.traffic[0];
  obstacle.distance = 42;
  obstacle.speed = 65;
  obstacle.lane = 0;
  race.traffic.slice(1).forEach((vehicle, index) => { vehicle.distance = 500 + index * 80; vehicle.lane = 0.62; });
  race.rivals.forEach((rival, index) => { rival.distance = 700 + index * 30; rival.lane = -0.62; });

  for (let index = 0; index < 90; index += 1) updateRace(race, { ...idle, accelerate: true }, 1 / 60);
  assert.ok(race.player.distance <= obstacle.distance - 4.19);
  assert.equal(race.player.collisions, 1);

  race.player.lateral = 0.62;
  // Check before the passed traffic car falls 65 m behind and is respawned ahead.
  for (let index = 0; index < 120; index += 1) updateRace(race, { ...idle, accelerate: true }, 1 / 60);
  assert.ok(race.player.distance > obstacle.distance);
});

test("chegar atrás de dois rivais concede terceiro lugar e bônus limpo", () => {
  const race = createRace({ preparation: 1 }, createRioTrack(), 12);
  race.countdown = 0;
  race.elapsed = 100;
  race.player.distance = race.totalDistance - 0.1;
  race.player.speed = 100;
  race.traffic.forEach((vehicle) => { vehicle.distance = race.player.distance + 400; vehicle.lane = -0.62; });
  race.rivals.forEach((rival, index) => {
    rival.distance = index < 2 ? race.totalDistance : race.totalDistance - 100;
    rival.finishedAt = index < 2 ? 90 + index : null;
  });
  const events = updateRace(race, { ...idle, accelerate: true }, 1 / 60);
  assert.equal(race.finished, true);
  assert.equal(race.position, 3);
  assert.equal(race.won, true);
  assert.equal(race.reward, 850);
  assert.ok(events.some((event) => event.type === "finish"));
});

test("premiação diferencia pódio, corrida limpa e abandono", () => {
  assert.deepEqual(calculateReward(1, 0), { base: 1000, clean: 250, total: 1250 });
  assert.deepEqual(calculateReward(4, 2), { base: 400, clean: 0, total: 400 });
  assert.deepEqual(calculateReward(4, 0, false), { base: 100, clean: 0, total: 100 });
});

test("rivais largam parados e aceleram sem saltar para a velocidade máxima", () => {
  const race = createRace({ preparation: 1 }, createRioTrack(), 44);
  assert.ok(race.rivals.every((rival) => rival.speed === 0));
  race.countdown = 0;
  const initial = race.rivals.map((rival) => rival.distance);
  updateRace(race, idle, 1 / 60);
  race.rivals.forEach((rival, index) => {
    assert.ok(rival.speed > 0 && rival.speed < 2);
    assert.ok(rival.distance - initial[index] < 0.01);
  });
});

test("relevo e curvas são contínuos inclusive na passagem de volta", () => {
  const track = createRioTrack();
  assert.equal(elevationAt(track, 0), elevationAt(track, track.length));
  assert.ok(Math.abs(elevationAt(track, 200)) > 5);
  for (let distance = 0; distance <= track.length; distance += track.segmentLength) {
    assert.ok(Math.abs(curveAt(track, distance - 0.001) - curveAt(track, distance + 0.001)) < 0.001);
  }
});

test("a força da curva empurra para fora e a direção permite compensar", () => {
  const race = createRace({ preparation: 1 }, createRioTrack(), 45);
  race.countdown = 0;
  race.player.distance = 240;
  race.player.speed = 190;
  race.rivals = [];
  race.traffic = [];
  updateRace(race, { ...idle, accelerate: true }, 1 / 60);
  assert.ok(race.player.lateral < 0);
  updateRace(race, { ...idle, accelerate: true, steer: 1 }, 1 / 60);
  assert.ok(race.player.lateral > 0);
  assert.ok(race.player.heading > 0);
});

test("a corrida ainda permite completar três voltas com o novo controle", () => {
  const race = createRace({ preparation: 1 }, createRioTrack(), 46);
  race.countdown = 0;
  race.traffic = [];
  race.rivals = [];
  for (let frame = 0; frame < 60 * 120 && !race.finished; frame++) {
    const steer = Math.abs(race.player.lateral) > 0.03 ? -Math.sign(race.player.lateral) : 0;
    updateRace(race, { ...idle, accelerate: true, steer }, 1 / 60);
  }
  assert.equal(race.finishReason, "complete");
  assert.equal(race.lap, 3);
  assert.equal(race.player.collisions, 0);
});
