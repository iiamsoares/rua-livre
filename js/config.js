export const VIEW = Object.freeze({ width: 480, height: 270, horizon: 88, roadBottom: 286, pixelWidth: 320, pixelHeight: 180 });

export const RACE_RULES = Object.freeze({
  laps: 3,
  fixedStep: 1 / 60,
  visibleDistance: 500,
  podiumSize: 3,
  opponents: 3,
  trafficCars: 12,
});

export const CAR = Object.freeze({
  baseTopSpeed: 190,
  baseAcceleration: 68,
  brakePower: 102,
  steering: 1.28,
  nitroTopSpeed: 38,
  nitroAcceleration: 62,
});

export const PLAYER_CARS = Object.freeze([
  { id: "up", name: "UP TSI", description: "1.0 TURBO · TRAÇÃO DIANTEIRA", frontAsset: "assets/cars/player/up_frente.png", spriteAsset: "assets/cars/player/spritesheet_up.png", spriteRows: 4 },
  { id: "chevette", name: "CHEVETTE", description: "CLÁSSICO NACIONAL · TRAÇÃO TRASEIRA", frontAsset: "assets/cars/player/chevette_frente.png", spriteAsset: "assets/cars/player/spritesheet_chevette.png", spriteRows: 3 },
  { id: "vectra", name: "VECTRA GLS", description: "SEDÃ ESPORTIVO · TRAÇÃO DIANTEIRA", frontAsset: "assets/cars/player/vectra_frente.png", spriteAsset: "assets/cars/player/spritesheet_vectra.png", spriteRows: 3 },
  {
    id: "civic-g8", name: "CIVIC G8", description: "SEDÃ ESPORTIVO · TRAÇÃO DIANTEIRA",
    frontAsset: "assets/cars/player/civic_frente.png", spriteAsset: "assets/cars/player/spritsheet_civicg8.png", spriteRows: 2, spriteLayout: "direction-columns",
    previewCrop: { x: 8, y: 365, width: 306, height: 206, sheetWidth: 1254, sheetHeight: 1254 },
    spriteFrames: [[8,365,306,206],[314,342,313,225],[627,343,313,221],[940,340,291,227],[8,718,306,208],[314,700,313,225],[627,701,313,223],[940,699,291,229]],
  },
  {
    id: "gol-quadrado", name: "GOL QUADRADO", description: "CLÁSSICO NACIONAL · TRAÇÃO DIANTEIRA",
    frontAsset: "assets/cars/player/golQuadrado_frente.png", spriteAsset: "assets/cars/player/spritsheet_golquadrado.png", spriteRows: 2, spriteLayout: "direction-columns",
    previewCrop: { x: 7, y: 313, width: 307, height: 240, sheetWidth: 1254, sheetHeight: 1254 },
    spriteFrames: [[7,313,307,240],[314,307,313,237],[627,310,313,225],[940,302,299,237],[8,675,306,240],[314,665,313,241],[627,670,313,228],[940,663,299,237]],
  },
  {
    id: "jetta", name: "JETTA", description: "SEDÃ TURBO · TRAÇÃO DIANTEIRA",
    frontAsset: "assets/cars/player/jetta_frente.png", spriteAsset: "assets/cars/player/spritsheet_jetta.png", spriteRows: 2, spriteLayout: "direction-columns",
    previewCrop: { x: 13, y: 334, width: 301, height: 225, sheetWidth: 1254, sheetHeight: 1254 },
    spriteFrames: [[13,334,301,225],[314,333,313,215],[627,333,313,214],[940,333,297,214],[13,673,301,223],[314,672,313,216],[627,672,313,216],[940,672,297,219]],
  },
  {
    id: "marea", name: "MAREA", description: "TURBO ITALIANO · TRAÇÃO DIANTEIRA",
    frontAsset: "assets/cars/player/marea_frente.png", spriteAsset: "assets/cars/player/spritsheet_marea.png", spriteRows: 2, spriteLayout: "direction-columns",
    previewCrop: { x: 7, y: 357, width: 307, height: 212, sheetWidth: 1254, sheetHeight: 1254 },
    spriteFrames: [[7,357,307,212],[314,359,313,208],[627,359,313,209],[940,358,296,208],[7,676,307,212],[314,678,313,208],[627,678,313,208],[940,677,296,210]],
  },
  {
    id: "opala", name: "OPALA", description: "SEIS CILINDROS · TRAÇÃO TRASEIRA",
    frontAsset: "assets/cars/player/opala_frente.png", spriteAsset: "assets/cars/player/spritsheet_opala.png", spriteRows: 2, spriteLayout: "direction-columns",
    previewCrop: { x: 8, y: 363, width: 306, height: 206, sheetWidth: 1254, sheetHeight: 1254 },
    spriteFrames: [[8,363,306,206],[314,359,313,194],[627,362,313,192],[940,363,303,190],[8,707,306,205],[314,702,313,197],[627,703,313,195],[940,707,303,195]],
  },
  {
    id: "santana", name: "SANTANA", description: "SEDÃ CLÁSSICO · TRAÇÃO DIANTEIRA",
    frontAsset: "assets/cars/player/santana_frente.png", spriteAsset: "assets/cars/player/spritsheet_santana.png", spriteRows: 2, spriteLayout: "direction-columns",
    previewCrop: { x: 10, y: 393, width: 304, height: 203, sheetWidth: 1254, sheetHeight: 1254 },
    spriteFrames: [[10,393,304,203],[314,387,313,206],[627,387,313,206],[940,383,298,210],[10,669,304,205],[314,664,313,206],[627,663,313,207],[940,660,298,210]],
  },
  {
    id: "uno-mille", name: "UNO MILLE", description: "LEVE E VALENTE · TRAÇÃO DIANTEIRA",
    frontAsset: "assets/cars/player/unoMile_frente.png", spriteAsset: "assets/cars/player/spritsheet_unoMile.png", spriteRows: 2, spriteLayout: "direction-columns",
    previewCrop: { x: 13, y: 301, width: 301, height: 260, sheetWidth: 1254, sheetHeight: 1254 },
    spriteFrames: [[13,301,301,260],[314,297,313,254],[627,298,313,253],[940,292,292,255],[13,676,301,259],[314,670,313,256],[627,675,313,251],[940,667,292,257]],
  },
]);

export const UPGRADE_COSTS = Object.freeze([0, 500, 900]);
export const POSITION_REWARDS = Object.freeze([1000, 750, 600, 400]);

export function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
export function mod(value, divisor) { return ((value % divisor) + divisor) % divisor; }

export function formatMoney(value) {
  return `R$ ${Math.max(0, Math.floor(value)).toLocaleString("pt-BR")}`;
}

export function formatTime(seconds) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60).toString().padStart(2, "0");
  const remainder = Math.floor(safe % 60).toString().padStart(2, "0");
  const milliseconds = Math.floor((safe % 1) * 1000).toString().padStart(3, "0");
  return `${minutes}:${remainder}.${milliseconds}`;
}

export function createRandom(seed = 1) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}
