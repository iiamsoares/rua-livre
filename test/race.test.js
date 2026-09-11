import test from "node:test";
import assert from "node:assert/strict";
import { calculateReward, carStats, createRace, updateRace } from "../js/race.js";
import { createRioTrack, curveAt, segmentAt } from "../js/track.js";

const idle = { accelerate: false, brake: false, steer: 0, nitro: false };

test("a pista possui 2,4 km e segmentos navegáveis em loop", () => {
  const track = createRioTrack();
  assert.equal(track.segments.length, 120);
  assert.equal(track.length, 2400);
  assert.equal(segmentAt(track, 0).index, segmentAt(track, track.length).index);
  assert.equal(typeof curveAt(track, 700), "number");
  assert.equal(track.mapPoints.length, track.segments.length);
});

test("preparação aumenta desempenho sem ultrapassar três estágios", () => {
  assert.deepEqual(carStats(1), { topSpeed: 190, acceleration: 52, steering: 1.04 });
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

test("uma corrida pausada não altera o estado", () => {
  const race = createRace({ preparation: 1 }, createRioTrack(), 11);
  race.countdown = 0;
  race.paused = true;
  updateRace(race, { ...idle, accelerate: true }, 1);
  assert.equal(race.elapsed, 0);
  assert.equal(race.player.speed, 0);
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
  assert.deepEqual(calculateReward(8, 0, false), { base: 100, clean: 0, total: 100 });
});
