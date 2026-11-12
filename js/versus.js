import { createRace, updateRace } from "./race.js";

export function createVersus(save, track, seed, carIds) {
  const races = [createRace(save, track, seed), createRace(save, track, seed)];
  races[1].traffic = races[0].traffic;
  races[1].rivals = races[0].rivals;
  races.forEach((race, index) => {
    race.player.lateral = index === 0 ? -0.4 : 0.4;
    race.peers = [{ lane: 0, distance: 0, speed: 0, carId: carIds[1 - index], playerContact: false }];
  });
  return { races, finished: false, winner: null };
}

export function updateVersus(match, inputs, dt) {
  if (match.finished || match.races.some((race) => race.paused)) return [];
  // Both collisions see the same start-of-frame positions.
  match.races.forEach((race, index) => {
    const other = match.races[1 - index].player;
    Object.assign(race.peers[0], { distance: other.distance, lane: other.lateral, speed: other.speed });
  });
  // Recycle traffic relative to the trailing camera, never in front of it.
  const leader = match.races[0].player.distance <= match.races[1].player.distance ? 0 : 1;
  const events = [[], []];
  for (const index of [leader, 1 - leader]) events[index] = updateRace(match.races[index], inputs[index], dt, index === leader);
  const done = match.races.map((race) => race.finishReason);
  if (done.some(Boolean)) {
    match.finished = true;
    if (done[0] === done[1]) match.winner = null;
    else match.winner = done[0] === "complete" || done[1] === "wrecked" ? 0 : 1;
    match.races.forEach((race) => { race.finished = true; });
  }
  match.races.forEach((race, index) => {
    race.position = 1 + race.rivals.filter((rival) => rival.distance > race.player.distance).length + Number(match.races[1 - index].player.distance > race.player.distance);
  });
  return events;
}
