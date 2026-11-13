import { RACE_RULES, createRandom, mod } from "../config.js";
import { zoneBlendAt } from "./brasilia-zones.js";
import { SCENERY_QUALITY } from "./environments.js";

const cache = new WeakMap();
const CATEGORY_STYLE = Object.freeze({
  trees: Object.freeze({ layer: "world", scaleMin: 0.86, scaleMax: 1.15 }),
  ground: Object.freeze({ layer: "near", scaleMin: 0.82, scaleMax: 1.16 }),
  roadside: Object.freeze({ layer: "world", scaleMin: 0.92, scaleMax: 1.08 }),
  signs: Object.freeze({ layer: "world", scaleMin: 0.94, scaleMax: 1.08 }),
  barriers: Object.freeze({ layer: "road-edge", scaleMin: 0.96, scaleMax: 1.06 }),
  competition: Object.freeze({ layer: "competition", scaleMin: 0.96, scaleMax: 1.12 }),
});

function hash(value) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function weighted(random, entries) {
  const total = entries.reduce((sum, item) => sum + item[1], 0);
  if (total <= 0) return null;
  let choice = random() * total;
  for (const [id, weight] of entries) {
    choice -= weight;
    if (choice <= 0) return id;
  }
  return entries[entries.length - 1][0];
}

function mixedWeights(mix, category) {
  const merged = new Map();
  for (const [id, weight] of mix.current.weights[category] || []) merged.set(id, (merged.get(id) || 0) + weight * (1 - mix.blend));
  for (const [id, weight] of mix.next.weights[category] || []) merged.set(id, (merged.get(id) || 0) + weight * mix.blend);
  return [...merged.entries()].filter((entry) => entry[1] > 0.001);
}

function circularGap(a, b, length) {
  const gap = Math.abs(a - b);
  return Math.min(gap, length - gap);
}

function buildBaseScenery(track, environment, qualityName) {
  if (!environment.enabled || !environment.atlases?.length || !environment.zones?.length) return [];
  const quality = SCENERY_QUALITY[qualityName] || SCENERY_QUALITY.high;
  const random = createRandom((environment.seed ^ hash(track.id)) >>> 0);
  const objects = [];
  let serial = 0;

  const place = (type, distance, side, lateralOffset, options = {}) => {
    if (!type) return null;
    const normalized = mod(distance, track.length);
    const lane = Number.isFinite(options.lane) ? options.lane : side * (1.68 + lateralOffset);
    const sideName = side < 0 ? "left" : side > 0 ? "right" : "center";
    const minimumGap = options.minimumGap ?? 5;
    const blocked = !options.allowOverlap && objects.some((object) =>
      object.side === sideName
      && Math.abs(object.lateralOffset - lateralOffset) < 0.62
      && circularGap(object.baseDistance, normalized, track.length) < minimumGap
    );
    if (blocked) return null;
    const object = Object.freeze({
      id: `${environment.id}-${serial++}`,
      type,
      zoneId: options.zoneId || zoneBlendAt(normalized / track.length, environment.zones).current.id,
      baseDistance: normalized,
      distance: normalized,
      side: sideName,
      sideSign: side,
      lateralOffset,
      lane,
      scale: options.scale ?? 1,
      anchor: Object.freeze({ x: 0.5, y: 1 }),
      collision: Object.freeze({ enabled: false }),
      render: Object.freeze({ layer: options.layer || "world", variation: options.variation || 0 }),
    });
    objects.push(object);
    return object;
  };

  // Marcos são posicionados uma única vez na volta e nunca dependem da câmera de um jogador.
  for (const zone of environment.zones) {
    for (const landmark of zone.landmarks) {
      place(landmark.type, landmark.progress * track.length, landmark.side, landmark.lateralOffset, {
        zoneId: zone.id,
        lane: landmark.lane,
        scale: landmark.scale,
        layer: landmark.layer,
        minimumGap: 18,
      });
    }
  }

  for (const [category, style] of Object.entries(CATEGORY_STYLE)) {
    let distance = 6 + random() * 5;
    let slot = 0;
    while (distance < track.length) {
      const progress = distance / track.length;
      const mix = zoneBlendAt(progress, environment.zones);
      const spacing = lerp(mix.current.minimumSpacing[category], mix.next.minimumSpacing[category], mix.blend) / quality.density;
      const density = lerp(mix.current.density[category], mix.next.density[category], mix.blend);
      const regularity = lerp(mix.current.environment.regularity, mix.next.environment.regularity, mix.blend);
      const lateralMin = lerp(mix.current.environment.lateralMin, mix.next.environment.lateralMin, mix.blend);
      const lateralMax = lerp(mix.current.environment.lateralMax, mix.next.environment.lateralMax, mix.blend);
      const jitter = lerp(0.58 + random() * 0.76, 0.9 + random() * 0.2, regularity);

      if ((quality.details || !["ground", "competition"].includes(category)) && random() < density) {
        const type = weighted(random, mixedWeights(mix, category));
        const side = regularity > 0.62 ? (slot % 2 ? -1 : 1) : (random() < 0.5 ? -1 : 1);
        let lateralOffset = lateralMin + random() * Math.max(0, lateralMax - lateralMin);
        if (category === "barriers") lateralOffset = Math.min(0.3, lateralOffset);
        if (category === "competition") lateralOffset = Math.max(0.55, lateralOffset);
        place(type, distance, side, lateralOffset, {
          zoneId: mix.blend > 0.5 ? mix.next.id : mix.current.id,
          minimumGap: Math.max(4, spacing * 0.42),
          scale: lerp(style.scaleMin, style.scaleMax, random()),
          layer: style.layer,
          variation: Math.floor(random() * 4),
        });
      }

      distance += Math.max(5, spacing * jitter);
      slot += 1;
    }
  }

  // Nas curvas, as defensas seguem o lado externo usando os segmentos reais da pista.
  for (const segment of track.segments) {
    if (Math.abs(segment.curve) < 0.4) continue;
    const distance = (segment.index + 0.5) * track.segmentLength;
    const mix = zoneBlendAt(distance / track.length, environment.zones);
    if (random() > lerp(mix.current.density.barriers, mix.next.density.barriers, mix.blend) * 0.82) continue;
    place(weighted(random, mixedWeights(mix, "barriers")), distance, Math.sign(segment.curve), 0.12, {
      zoneId: mix.blend > 0.5 ? mix.next.id : mix.current.id,
      allowOverlap: true,
      layer: "road-edge",
      scale: 1.02,
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

export function sceneryForTrack(track, environment, qualityName = environment.quality || "high", laps = RACE_RULES.laps) {
  let variants = cache.get(track);
  if (!variants) {
    variants = new Map();
    cache.set(track, variants);
  }
  const key = `${environment.id}:${qualityName}:${laps}`;
  if (!variants.has(key)) variants.set(key, generateScenery(track, environment, qualityName, laps));
  return variants.get(key);
}
