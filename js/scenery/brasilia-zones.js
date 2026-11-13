const weights = (entries) => Object.freeze(entries.map(([id, weight]) => Object.freeze([id, weight])));
const zone = (definition) => Object.freeze({
  ...definition,
  density: Object.freeze(definition.density),
  weights: Object.freeze(Object.fromEntries(Object.entries(definition.weights).map(([key, value]) => [key, weights(value)]))),
  minimumSpacing: Object.freeze(definition.minimumSpacing),
  environment: Object.freeze(definition.environment),
  landmarks: Object.freeze((definition.landmarks || []).map(Object.freeze)),
  effects: Object.freeze(definition.effects),
});

export const BRASILIA_ZONES = Object.freeze([
  zone({
    id: "cerrado",
    name: "Cerrado",
    start: 0,
    end: 0.18,
    transitionFraction: 0.2,
    density: { trees: 0.9, ground: 0.88, roadside: 0.14, signs: 0.08, barriers: 0.12, competition: 0 },
    weights: {
      trees: [["cerradoSmall", 46], ["cerradoWide", 40], ["ipeYellowSmall", 7], ["ipePurpleSmall", 2]],
      ground: [["grassLow", 26], ["grassTall", 25], ["agave", 18], ["rocksSmall", 12], ["rocksLarge", 7], ["termiteMound", 8], ["cactus", 4]],
      roadside: [["lampShort", 4], ["lampTall", 1]],
      signs: [["woodSign", 3], ["winding", 2], ["speed80", 1]],
      barriers: [["guardrail", 3], ["concrete", 1]],
      competition: [],
    },
    minimumSpacing: { trees: 23, ground: 11, roadside: 62, signs: 190, barriers: 34, competition: 200 },
    environment: { lateralMin: 0.35, lateralMax: 1.7, regularity: 0.15, openness: 0.95 },
    effects: { petals: 0, dust: 0.35, lighting: 0.08 },
  }),
  zone({
    id: "ipes",
    name: "Avenida dos Ipês",
    start: 0.18,
    end: 0.4,
    transitionFraction: 0.2,
    density: { trees: 0.96, ground: 0.95, roadside: 0.62, signs: 0.08, barriers: 0.1, competition: 0 },
    weights: {
      trees: [["ipeYellowSmall", 42], ["ipePurpleSmall", 17], ["ipePurpleMedium", 13], ["ipePurpleLarge", 7], ["cerradoSmall", 7]],
      ground: [["flowerYellow", 35], ["flowerPurple", 24], ["flowersEdge", 18], ["grassLow", 12], ["agave", 4]],
      roadside: [["lampTall", 8], ["eixoOrnateLamp", 3]],
      signs: [["signBrasiliaIcon", 2], ["speed80", 1]],
      barriers: [["greenWall", 2], ["guardrail", 1]],
      competition: [],
    },
    minimumSpacing: { trees: 20, ground: 9, roadside: 38, signs: 210, barriers: 40, competition: 200 },
    environment: { lateralMin: 0.28, lateralMax: 1.25, regularity: 0.68, openness: 0.55 },
    effects: { petals: 0.72, dust: 0.05, lighting: 0.15 },
  }),
  zone({
    id: "monumental",
    name: "Eixo Monumental",
    start: 0.4,
    end: 0.65,
    transitionFraction: 0.2,
    density: { trees: 0.2, ground: 0.56, roadside: 0.88, signs: 0.68, barriers: 0.82, competition: 0.08 },
    weights: {
      trees: [["cerradoSmall", 3], ["ipeYellowSmall", 1]],
      ground: [["eixoFlowerbed", 30], ["flowerYellow", 8], ["grassLow", 5]],
      roadside: [["eixoModernLamp", 38], ["eixoOrnateLamp", 16], ["eixoBusStop", 4]],
      signs: [["eixoGreenGantry", 14], ["eixoBrownGantry", 9], ["eixoBlueDirections", 12], ["signEixo", 6], ["signPlano", 6]],
      barriers: [["eixoGuardrail", 24], ["eixoFence", 13], ["eixoFenceWide", 9], ["eixoConcrete", 6], ["eixoStriped", 4]],
      competition: [["eixoBillboard", 1]],
    },
    minimumSpacing: { trees: 42, ground: 14, roadside: 31, signs: 78, barriers: 18, competition: 160 },
    environment: { lateralMin: 0.18, lateralMax: 0.82, regularity: 0.82, openness: 0.42 },
    landmarks: [
      { type: "eixoGreenGantry", progress: 0.48, side: 1, lateralOffset: 0.24, scale: 1.08, layer: "landmark" },
      { type: "eixoBillboard", progress: 0.605, side: -1, lateralOffset: 0.58, scale: 1.1, layer: "landmark" },
    ],
    effects: { petals: 0.08, dust: 0, lighting: 0.2 },
  }),
  zone({
    id: "paranoa",
    name: "Orla do Paranoá",
    start: 0.65,
    end: 0.85,
    transitionFraction: 0.2,
    density: { trees: 0.28, ground: 0.82, roadside: 0.52, signs: 0.42, barriers: 0.9, competition: 0 },
    weights: {
      trees: [["cerradoSmall", 4], ["cerradoWide", 3], ["ipeYellowSmall", 1]],
      ground: [["lagoHedge", 24], ["lagoFlowerbed", 13], ["grassLow", 20], ["agave", 8], ["rocksSmall", 4]],
      roadside: [["lagoBench", 8], ["lagoWoodDock", 2], ["lagoWoodDockWide", 1], ["lampShort", 4]],
      signs: [["lagoTouristSign", 11], ["lagoBikeSign", 8], ["signBrasiliaIcon", 3]],
      barriers: [["lagoGlassRailing", 25], ["lagoStoneRailing", 18], ["lagoGuardrail", 10]],
      competition: [],
    },
    minimumSpacing: { trees: 36, ground: 12, roadside: 44, signs: 92, barriers: 16, competition: 200 },
    environment: { lateralMin: 0.16, lateralMax: 1.05, regularity: 0.58, openness: 0.88 },
    landmarks: [
      { type: "lagoTouristSign", progress: 0.7, side: -1, lateralOffset: 0.32, scale: 1.05, layer: "landmark" },
    ],
    effects: { petals: 0.04, dust: 0, lighting: 0.24 },
  }),
  zone({
    id: "capital",
    name: "Reta da Capital",
    start: 0.85,
    end: 1,
    transitionFraction: 0.2,
    density: { trees: 0.08, ground: 0.76, roadside: 0.5, signs: 0.86, barriers: 0.96, competition: 0.9 },
    weights: {
      trees: [["ipeYellowSmall", 2], ["cerradoSmall", 1]],
      ground: [["eixoFlowerbed", 18], ["flowerYellow", 10], ["flowerPurple", 7], ["lagoHedge", 8]],
      roadside: [["eixoModernLamp", 8], ["lagoFlags", 5]],
      signs: [["retaDistance200", 7], ["retaDistance100", 7], ["retaDistance50", 7], ["retaFinishSign", 4]],
      barriers: [["retaBarrier", 22], ["eixoStriped", 6], ["eixoConcrete", 5]],
      competition: [["retaGrandstandSmall", 10], ["retaGrandstandMedium", 8], ["retaGrandstandLarge", 5], ["retaFloodlights", 5], ["retaBunting", 5], ["retaFlagCheckeredLeft", 4], ["retaFlagCapitalGreen", 4]],
    },
    minimumSpacing: { trees: 48, ground: 11, roadside: 32, signs: 34, barriers: 15, competition: 28 },
    environment: { lateralMin: 0.16, lateralMax: 0.85, regularity: 0.88, openness: 0.5 },
    landmarks: [
      { type: "retaGrandstandSmall", progress: 0.875, side: -1, lateralOffset: 0.9, scale: 1.05, layer: "competition" },
      { type: "retaGrandstandLarge", progress: 0.915, side: 1, lateralOffset: 1.05, scale: 1.08, layer: "competition" },
      { type: "retaFlagCheckeredRight", progress: 0.95, side: -1, lateralOffset: 0.22, scale: 1, layer: "competition" },
      { type: "retaFlagCapitalWhite", progress: 0.95, side: 1, lateralOffset: 0.22, scale: 1, layer: "competition" },
      { type: "retaFinishArch", progress: 0.985, side: 0, lateralOffset: 0, lane: 0, scale: 1.18, layer: "overhead" },
    ],
    effects: { petals: 0.12, dust: 0.04, lighting: 0.32 },
  }),
]);

export function zoneAtProgress(progress, zones = BRASILIA_ZONES) {
  const normalized = progress - Math.floor(progress);
  return zones.find((item) => normalized >= item.start && normalized < item.end) || zones[zones.length - 1];
}

export function zoneBlendAt(progress, zones = BRASILIA_ZONES) {
  const current = zoneAtProgress(progress, zones);
  const index = zones.indexOf(current);
  const next = zones[(index + 1) % zones.length];
  const span = current.end - current.start;
  const transitionStart = current.end - span * current.transitionFraction;
  const normalized = progress - Math.floor(progress);
  const raw = normalized >= transitionStart ? (normalized - transitionStart) / Math.max(0.0001, current.end - transitionStart) : 0;
  const blend = raw * raw * (3 - 2 * raw);
  return Object.freeze({ current, next, blend });
}
