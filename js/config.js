export const VIEW = Object.freeze({ width: 480, height: 270, horizon: 105, roadBottom: 286 });

export const RACE_RULES = Object.freeze({
  laps: 3,
  fixedStep: 1 / 60,
  visibleDistance: 500,
  podiumSize: 3,
  opponents: 3,
});

export const CAR = Object.freeze({
  baseTopSpeed: 190,
  baseAcceleration: 52,
  brakePower: 102,
  steering: 1.04,
  nitroTopSpeed: 38,
  nitroAcceleration: 62,
});

export const PLAYER_CARS = Object.freeze([
  { id: "up", name: "UP TSI", description: "1.0 TURBO · TRAÇÃO DIANTEIRA", frontAsset: "assets/cars/player/up_frente.png", spriteAsset: "assets/cars/player/spritesheet_up.png", spriteRows: 4 },
  { id: "chevette", name: "CHEVETTE", description: "CLÁSSICO NACIONAL · TRAÇÃO TRASEIRA", frontAsset: "assets/cars/player/chevette_frente.png", spriteAsset: "assets/cars/player/spritesheet_chevette.png", spriteRows: 3 },
  { id: "vectra", name: "VECTRA GLS", description: "SEDÃ ESPORTIVO · TRAÇÃO DIANTEIRA", frontAsset: "assets/cars/player/vectra_frente.png", spriteAsset: "assets/cars/player/spritesheet_vectra.png", spriteRows: 3 },
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
