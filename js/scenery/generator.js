import { RACE_RULES, createRandom, mod } from "../config.js";
import { SCENERY_QUALITY } from "./environments.js";

const cache = new WeakMap();
const TREE_POOL = Object.freeze([
  ["cerradoSmall", 34], ["cerradoWide", 28], ["ipeYellowSmall", 21],
  ["ipePurpleSmall", 8], ["ipePurpleMedium", 6], ["ipePurpleLarge", 3],
]);
const GROUND_POOL = Object.freeze([
  ["grassLow", 25], ["grassTall", 20], ["agave", 14], ["flowerYellow", 10],
  ["flowerPurple", 5], ["rocksSmall", 10], ["rocksLarge", 6], ["termiteMound", 4], ["cactus", 6],
]);
const SIGN_POOL = Object.freeze([
  ["signBrasiliaIcon", 4], ["signPlano", 5], ["signEixo", 4], ["speed80", 5],
  ["noPass", 3], ["winding", 3], ["woodSign", 2],
]);

function hash(value) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function weighted(random, pool) {
  const total = pool.reduce((sum, item) => sum + item[1], 0);
  let choice = random() * total;
  for (const [id, weight] of pool) {
    choice -= weight;
    if (choice <= 0) return id;
  }
  return pool[pool.length - 1][0];
}

function circularGap(a, b, length) {
  const gap = Math.abs(a - b);
  return Math.min(gap, length - gap);
}

function buildBaseScenery(track, environment, qualityName) {
  if (!environment.enabled || !environment.atlas) return [];
  const quality = SCENERY_QUALITY[qualityName] || SCENERY_QUALITY.high;
  const random = createRandom((environment.seed ^ hash(track.id)) >>> 0);
  const objects = [];
  let serial = 0;

  const place = (type, distance, side, lateralOffset, options = {}) => {
    const normalized = mod(distance, track.length);
    const minimumGap = options.minimumGap ?? 5;
    const blocked = !options.allowOverlap && objects.some((object) =>
      object.side === side
      && Math.abs(object.lateralOffset - lateralOffset) < 0.62
      && circularGap(object.baseDistance, normalized, track.length) < minimumGap
    );
    if (blocked) return null;
    const object = Object.freeze({
      id: `${environment.id}-${serial++}`,
      type,
      baseDistance: normalized,
      distance: normalized,
      side: side < 0 ? "left" : "right",
      sideSign: side,
      lateralOffset,
      lane: side * (1.68 + lateralOffset),
      scale: options.scale ?? 1,
      anchor: Object.freeze({ x: 0.5, y: 1 }),
      collision: Object.freeze({ enabled: false }),
      render: Object.freeze({ layer: options.layer || "world", variation: options.variation || 0 }),
    });
    objects.push(object);
    return object;
  };

  const treeStep = 30 / quality.density;
  for (let distance = 18; distance < track.length; distance += treeStep) {
    if (random() > environment.densities.trees) continue;
    const side = random() < 0.5 ? -1 : 1;
    place(weighted(random, TREE_POOL), distance + (random() - 0.5) * treeStep * 0.55, side, 0.55 + random() * 1.25, {
      minimumGap: 13,
      scale: 0.86 + random() * 0.28,
      variation: Math.floor(random() * 4),
    });
  }

  if (quality.details) {
    const groundStep = 15 / quality.density;
    for (let distance = 8; distance < track.length; distance += groundStep) {
      if (random() > environment.densities.ground) continue;
      const side = random() < 0.5 ? -1 : 1;
      place(weighted(random, GROUND_POOL), distance + (random() - 0.5) * groundStep * 0.7, side, 0.22 + random() * 0.92, {
        minimumGap: 4,
        scale: 0.82 + random() * 0.34,
        layer: "near",
        variation: Math.floor(random() * 4),
      });
    }
  }

  // Iluminação regular cria referência de velocidade sem ficar perfeitamente repetitiva.
  for (let distance = 28; distance < track.length; distance += 52 + random() * 8) {
    for (const side of [-1, 1]) {
      place(random() < 0.78 ? "lampTall" : "lampShort", distance + random() * 3, side, 0.3, {
        minimumGap: 11,
        scale: 0.94 + random() * 0.1,
      });
    }
  }

  const signStep = 150 / Math.max(0.1, environment.densities.signs);
  for (let distance = 95; distance < track.length; distance += signStep * (0.72 + random() * 0.45)) {
    const side = random() < 0.5 ? -1 : 1;
    place(weighted(random, SIGN_POOL), distance, side, 0.38 + random() * 0.3, { minimumGap: 22 });
  }

  // Defensas acompanham o lado externo das curvas e usam a própria geometria da pista.
  for (const segment of track.segments) {
    if (Math.abs(segment.curve) < 0.4) continue;
    const side = Math.sign(segment.curve);
    place("guardrail", (segment.index + 0.5) * track.segmentLength, side, 0.12, {
      allowOverlap: true,
      layer: "road-edge",
      scale: 1.02,
    });
    if (segment.index % 5 === 0) {
      place(segment.curve > 0 ? "curveRight" : "curveLeft", segment.index * track.segmentLength, side, 0.28, {
        allowOverlap: true,
        layer: "road-edge",
      });
    }
  }

  // Poucos marcos arquitetônicos ficam afastados e só dominam o horizonte à distância.
  const landmarkCount = Math.max(2, Math.round(track.length / 700 * environment.densities.architecture * 12));
  for (let index = 0; index < landmarkCount; index += 1) {
    place("architecture", track.length * (index + 0.38) / landmarkCount, index % 2 ? -1 : 1, 2.65 + random() * 0.65, {
      minimumGap: 80,
      layer: "distant",
      scale: 1.1 + random() * 0.18,
    });
  }

  return objects.sort((a, b) => a.baseDistance - b.baseDistance);
}

export function generateScenery(track, environment, qualityName = environment.quality || "high", laps = RACE_RULES.laps) {
  const base = buildBaseScenery(track, environment, qualityName);
  const expanded = [];
  for (let lap = 0; lap < laps; lap += 1) {
    for (const object of base) {
      expanded.push(Object.freeze({ ...object, id: `${object.id}-lap-${lap}`, distance: object.baseDistance + lap * track.length }));
    }
  }
  return Object.freeze(expanded.sort((a, b) => a.distance - b.distance));
}

export function sceneryForTrack(track, environment, qualityName = environment.quality || "high") {
  let variants = cache.get(track);
  if (!variants) {
    variants = new Map();
    cache.set(track, variants);
  }
  const key = `${environment.id}:${qualityName}`;
  if (!variants.has(key)) variants.set(key, generateScenery(track, environment, qualityName));
  return variants.get(key);
}
