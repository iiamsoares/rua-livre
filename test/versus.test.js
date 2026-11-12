import test from "node:test";
import assert from "node:assert/strict";
import { createVersus, updateVersus } from "../js/versus.js";
import { createRioTrack } from "../js/track.js";
import { InputController } from "../js/input.js";

const idle = { accelerate: false, brake: false, steer: 0, nitro: false };
const make = () => createVersus({ preparation: 1 }, createRioTrack(), 42, ["up", "chevette"]);
test("versus compartilha trânsito e três rivais, mas separa integridade e itens", () => {
  const { races: [a, b] } = make();
  assert.equal(a.traffic, b.traffic);
  assert.equal(a.rivals, b.rivals);
  assert.equal(a.rivals.length, 3);
  assert.notEqual(a.player, b.player);
  assert.notEqual(a.potholes, b.potholes);
  assert.notEqual(a.pickups, b.pickups);
});
test("teclado separa aceleração, direção e nitro dos jogadores", () => {
  const input = Object.create(InputController.prototype);
  input.keys = new Set(["w", "d", " "]);
  assert.deepEqual(input.snapshot(1), { accelerate: true, brake: false, steer: 1, nitro: true });
  assert.deepEqual(input.snapshot(2), idle);
  input.keys = new Set(["arrowup", "arrowleft", "enter"]);
  assert.deepEqual(input.snapshot(1), idle);
  assert.deepEqual(input.snapshot(2), { accelerate: true, brake: false, steer: -1, nitro: true });
});
test("simulação avança trânsito uma vez e pausa os dois jogadores", () => {
  const match = make();
  match.races.forEach((race) => { race.countdown = 0; });
  const car = match.races[0].traffic[0];
  const distance = car.distance;
  updateVersus(match, [{ ...idle, accelerate: true }, idle], 1 / 60);
  assert.ok(Math.abs(car.distance - distance - car.speed / 216) < 1e-8);
  assert.ok(match.races[0].player.speed > 0);
  assert.equal(match.races[1].player.speed, 0);
  match.races[1].paused = true;
  const before = JSON.stringify(match);
  updateVersus(match, [idle, idle], 1 / 60);
  assert.equal(JSON.stringify(match), before);
});
test("primeiro a terminar vence; destruição concede vitória ao outro", () => {
  for (const finish of ["complete", "wrecked"]) {
    const match = make();
    match.races.forEach((race) => { race.countdown = 0; race.traffic = []; race.rivals = []; });
    const a = match.races[0];
    if (finish === "complete") { a.player.distance = a.totalDistance - 0.1; a.player.speed = 100; }
    else a.player.health = 0;
    updateVersus(match, [idle, idle], 1 / 60);
    assert.equal(match.winner, finish === "complete" ? 0 : 1);
    assert.ok(match.races.every((race) => race.finished));
  }
});

test("os jogadores colidem entre si e não atravessam o carro à frente", () => {
  const match = make();
  match.races.forEach((race) => { race.countdown = 0; race.traffic = []; race.rivals = []; race.player.lateral = 0; });
  match.races[0].player.distance = 40;
  match.races[0].player.speed = 190;
  match.races[1].player.distance = 45;
  updateVersus(match, [idle, idle], 1 / 60);
  assert.equal(match.races[0].player.health, 92);
  assert.ok(match.races[0].player.distance <= match.races[1].player.distance - 4.19);
  assert.equal(match.races[1].player.health, 100);
});
