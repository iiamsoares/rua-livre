import { CAR, POSITION_REWARDS, RACE_RULES, clamp, createRandom } from "./config.js";
import { curveAt } from "./track.js";
import { lateralStep } from "./engines/jake-gordon.js";

const RIVAL_SPEEDS = [172, 164, 156];
const RIVAL_COLORS = ["#ff4b4f", "#36a7ff", "#ffd43c"];
const TRAFFIC_COLORS = ["#e64950", "#268cd7", "#e7b82b", "#774fc4", "#43ad72", "#dedfe5"];
const RIVAL_SPRITES = [1, 2, 4];
const TRAFFIC_SPRITES = [5, 7, 8, 10, 11, 12, 13, 15];
const TRAFFIC_SPEEDS = [60, 85, 110, 135];

export function carStats(preparation = 1) {
  const level = clamp(Math.floor(preparation), 1, 3);
  return {
    topSpeed: CAR.baseTopSpeed + (level - 1) * 8,
    acceleration: CAR.baseAcceleration + (level - 1) * 5,
    steering: CAR.steering + (level - 1) * 0.025,
  };
}

function makeTraffic(random, distance, profile = Math.floor(random() * TRAFFIC_SPEEDS.length)) {
  return {
    distance,
    lane: [-0.62, 0, 0.62][Math.floor(random() * 3)],
    speed: TRAFFIC_SPEEDS[profile % TRAFFIC_SPEEDS.length] + random() * 12,
    color: TRAFFIC_COLORS[Math.floor(random() * TRAFFIC_COLORS.length)],
    spriteIndex: TRAFFIC_SPRITES[Math.floor(random() * TRAFFIC_SPRITES.length)],
    kind: random() < 0.2 ? "van" : "car",
    hitTimer: 0,
    playerContact: false,
  };
}

export function createRace(save, track, seed = Date.now()) {
  const random = createRandom(seed);
  const totalDistance = track.length * RACE_RULES.laps;
  const rivals = RIVAL_SPEEDS.map((speed, index) => ({
    id: `rival-${index}`,
    distance: 4 + (RIVAL_SPEEDS.length - 1 - index) * 4,
    lane: [-0.62, 0, 0.62][index % 3],
    laneTarget: [-0.62, 0, 0.62][index % 3],
    laneTimer: 1 + random() * 2,
    speed: 0,
    targetSpeed: speed + random() * 2,
    color: RIVAL_COLORS[index],
    spriteIndex: RIVAL_SPRITES[index],
    playerContact: false,
    finishedAt: null,
  }));
  const traffic = Array.from({ length: RACE_RULES.trafficCars }, (_, index) => makeTraffic(random, 120 + index * 42 + random() * 16, index));
  const pickups = [];
  for (let distance = 420, index = 0; distance < totalDistance; distance += 520, index += 1) {
    pickups.push({ distance, lane: [-0.62, 0, 0.62][index % 3], collected: false });
  }
  const potholes = [];
  for (let lap = 0; lap < RACE_RULES.laps; lap += 1) {
    for (let distance = 220, index = 0; distance < track.length - 120; distance += 240, index += 1) {
      potholes.push({ distance: lap * track.length + distance, lane: [0, -0.62, 0.62][index % 3], hit: false });
    }
  }

  return {
    seed,
    random,
    track,
    totalDistance,
    stats: carStats(save.preparation),
    countdown: 3.05,
    countdownShown: 3,
    elapsed: 0,
    paused: false,
    finished: false,
    finishReason: null,
    won: false,
    position: RACE_RULES.opponents + 1,
    lap: 1,
    previousLap: 1,
    reward: 0,
    cleanBonus: 0,
    impactTimer: 0,
    player: {
      distance: 0,
      lateral: 0,
      speed: 0,
      nitro: 100,
      health: 100,
      collisions: 0,
      collisionCooldown: 0,
      drifting: false,
      boosting: false,
      steerVisual: 0,
      heading: 0,
    },
    rivals,
    traffic,
    pickups,
    potholes,
  };
}

function updateRivals(race, dt) {
  for (const rival of race.rivals) {
    if (rival.finishedAt !== null) continue;
    rival.laneTimer -= dt;
    if (rival.laneTimer <= 0) {
      const lanes = [-0.62, 0, 0.62];
      rival.laneTarget = lanes[Math.floor(race.random() * lanes.length)];
      rival.laneTimer = 1.7 + race.random() * 2.7;
    }
    rival.lane += (rival.laneTarget - rival.lane) * Math.min(1, dt * 1.35);
    const curvePenalty = Math.abs(curveAt(race.track, rival.distance)) * 3.5;
    rival.speed = Math.min(rival.targetSpeed - curvePenalty, rival.speed + 62 * dt);
    rival.distance += rival.speed / 3.6 * dt;
    if (rival.distance >= race.totalDistance) {
      rival.distance = race.totalDistance;
      rival.finishedAt = race.elapsed;
    }
  }
}

function updateTraffic(race, dt) {
  for (const traffic of race.traffic) {
    traffic.distance += traffic.speed / 3.6 * dt;
    traffic.hitTimer = Math.max(0, traffic.hitTimer - dt);
    if (traffic.distance < race.player.distance - 65) {
      const replacement = makeTraffic(race.random, race.player.distance + RACE_RULES.visibleDistance + 30 + race.random() * 100);
      // Reinsert outside the camera and avoid spawning on another civilian car.
      while (race.traffic.some((other) => other !== traffic && Math.abs(other.lane - replacement.lane) < 0.25 && Math.abs(other.distance - replacement.distance) < 24)) {
        replacement.distance += 24;
      }
      Object.assign(traffic, replacement);
    }
  }
}

function collide(race, obstacle, damage, events) {
  const player = race.player;
  const delta = obstacle.distance - player.distance;
  const touching = delta > -1 && delta < 6.2 && Math.abs(obstacle.lane - player.lateral) < 0.25;
  if (!touching) {
    obstacle.playerContact = false;
    return;
  }

  const firstContact = !obstacle.playerContact;
  obstacle.playerContact = true;
  const safeGap = 4.2;
  if (delta < safeGap) {
    player.distance = Math.max(0, obstacle.distance - safeGap);
    player.speed = Math.min(player.speed, Math.max(0, obstacle.speed * 0.92));
  }
  if (!firstContact || player.collisionCooldown > 0) return;

  player.health = Math.max(0, player.health - damage);
  player.speed *= 0.72;
  player.lateral += player.lateral <= obstacle.lane ? -0.13 : 0.13;
  player.collisions += 1;
  player.collisionCooldown = 0.72;
  obstacle.hitTimer = 0.8;
  race.impactTimer = 0.35;
  events.push({ type: "collision", damage });
}

function updateCollisions(race, events) {
  for (const traffic of race.traffic) collide(race, traffic, traffic.kind === "van" ? 16 : 12, events);
  for (const rival of race.rivals) {
    if (rival.distance < race.totalDistance) collide(race, rival, 8, events);
  }
  for (const pickup of race.pickups) {
    if (pickup.collected) continue;
    const delta = pickup.distance - race.player.distance;
    if (Math.abs(delta) < 5 && Math.abs(pickup.lane - race.player.lateral) < 0.25) {
      pickup.collected = true;
      race.player.nitro = Math.min(100, race.player.nitro + 42);
      events.push({ type: "pickup" });
    }
  }
}

function updatePotholes(race, previousDistance, events) {
  const player = race.player;
  if (player.distance <= previousDistance) return;
  for (const pothole of race.potholes) {
    if (pothole.hit || pothole.distance < previousDistance || pothole.distance > player.distance) continue;
    if (Math.abs(pothole.lane - player.lateral) >= 0.24) continue;
    pothole.hit = true;
    const damage = 6;
    player.health = Math.max(0, player.health - damage);
    player.collisions += 1;
    race.impactTimer = 0.25;
    events.push({ type: "pothole", damage });
  }
}

function updatePosition(race) {
  if (race.finished && race.finishReason === "complete") return;
  race.position = 1 + race.rivals.filter((rival) => rival.distance > race.player.distance).length;
}

export function calculateReward(position, collisions, completed = true) {
  if (!completed) return { base: 100, clean: 0, total: 100 };
  const base = POSITION_REWARDS[clamp(position - 1, 0, POSITION_REWARDS.length - 1)];
  const clean = collisions === 0 ? 250 : 0;
  return { base, clean, total: base + clean };
}

function finishRace(race, reason, events) {
  if (race.finished) return;
  race.finished = true;
  race.finishReason = reason;
  if (reason === "complete") {
    race.position = 1 + race.rivals.filter((rival) => rival.finishedAt !== null && rival.finishedAt < race.elapsed).length;
  } else {
    race.position = RACE_RULES.opponents + 1;
  }
  race.won = reason === "complete" && race.position <= RACE_RULES.podiumSize;
  const prize = calculateReward(race.position, race.player.collisions, reason === "complete");
  race.reward = prize.total;
  race.cleanBonus = prize.clean;
  events.push({ type: "finish", won: race.won, reason });
}

export function updateRace(race, input, dt) {
  const events = [];
  if (race.paused || race.finished) return events;

  if (race.countdown > 0) {
    race.countdown = Math.max(0, race.countdown - dt);
    const shown = Math.ceil(race.countdown);
    if (shown > 0 && shown < race.countdownShown) {
      race.countdownShown = shown;
      events.push({ type: "countdown", value: shown });
    }
    if (race.countdown === 0) events.push({ type: "go" });
    return events;
  }

  race.elapsed += dt;
  race.impactTimer = Math.max(0, race.impactTimer - dt);
  const player = race.player;
  const previousDistance = player.distance;
  player.collisionCooldown = Math.max(0, player.collisionCooldown - dt);
  const curve = curveAt(race.track, player.distance + 22);
  const speedRatio = player.speed / Math.max(1, race.stats.topSpeed);
  player.drifting = Boolean(input.brake && input.steer && player.speed > 82);
  player.boosting = Boolean(input.nitro && player.nitro > 0 && player.speed > 55);
  player.steerVisual += (input.steer - player.steerVisual) * Math.min(1, dt * 9);

  if (input.accelerate) player.speed += race.stats.acceleration * dt;
  else player.speed -= 19 * dt;
  if (input.brake) player.speed -= CAR.brakePower * dt;
  if (player.drifting) player.speed -= 9 * dt;
  if (player.boosting) {
    player.speed += CAR.nitroAcceleration * dt;
    player.nitro = Math.max(0, player.nitro - 24 * dt);
  }

  const topSpeed = race.stats.topSpeed + (player.boosting ? CAR.nitroTopSpeed : 0);
  player.speed = clamp(player.speed, 0, topSpeed);
  const driftGrip = player.drifting ? 1.18 : 1;
  player.lateral += lateralStep(input.steer, speedRatio, curve, dt, race.stats.steering * driftGrip);
  player.heading += curve * player.speed / 3.6 * dt * 0.006;

  if (Math.abs(player.lateral) > 0.93) player.speed = Math.max(0, player.speed - 58 * dt);
  if (Math.abs(player.lateral) > 1.16 && player.collisionCooldown === 0) {
    player.lateral = Math.sign(player.lateral) * 1.12;
    player.speed *= 0.72;
    player.health = Math.max(0, player.health - 5);
    player.collisions += 1;
    player.collisionCooldown = 0.6;
    race.impactTimer = 0.25;
    events.push({ type: "barrier" });
  }
  player.lateral = clamp(player.lateral, -1.2, 1.2);
  player.distance += player.speed / 3.6 * dt;

  updateRivals(race, dt);
  updateTraffic(race, dt);
  updateCollisions(race, events);
  updatePotholes(race, previousDistance, events);
  updatePosition(race);

  race.lap = Math.min(RACE_RULES.laps, Math.floor(player.distance / race.track.length) + 1);
  if (race.lap > race.previousLap) {
    race.previousLap = race.lap;
    events.push({ type: "lap", value: race.lap });
  }

  if (player.health <= 0) finishRace(race, "wrecked", events);
  else if (player.distance >= race.totalDistance) finishRace(race, "complete", events);
  return events;
}
