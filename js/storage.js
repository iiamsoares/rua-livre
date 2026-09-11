import { PAINTS, RACE_RULES, clamp } from "./config.js";

export const SAVE_KEY = "ruaLivre_save_v3";
export const LEGACY_KEY = "ruaLivre2D_deluxe_v2";

export function defaultSave() {
  return { version: 3, credits: 0, paint: PAINTS[0].value, preparation: 1, bestPosition: null, bestTime: null, audio: true };
}

export function sanitizeSave(candidate = {}) {
  const base = defaultSave();
  const paint = PAINTS.some((item) => item.value === candidate.paint) ? candidate.paint : base.paint;
  return {
    version: 3,
    credits: clamp(Number.isFinite(Number(candidate.credits)) ? Math.floor(Number(candidate.credits)) : 0, 0, 9999999),
    paint,
    preparation: clamp(Number.isFinite(Number(candidate.preparation)) ? Math.floor(Number(candidate.preparation)) : 1, 1, 3),
    bestPosition: candidate.bestPosition == null ? null : clamp(Math.floor(Number(candidate.bestPosition)) || RACE_RULES.opponents + 1, 1, RACE_RULES.opponents + 1),
    bestTime: Number(candidate.bestTime) > 0 ? Number(candidate.bestTime) : null,
    audio: candidate.audio !== false,
  };
}

export function migrateLegacy(legacy = {}) {
  return sanitizeSave({
    credits: legacy.credits,
    paint: legacy.paint,
    preparation: legacy.upgrades?.engine,
    audio: legacy.audio,
  });
}

export function loadSave(storage = globalThis.localStorage) {
  try {
    const current = storage.getItem(SAVE_KEY);
    if (current) return sanitizeSave(JSON.parse(current));
    const legacy = storage.getItem(LEGACY_KEY);
    if (legacy) return migrateLegacy(JSON.parse(legacy));
  } catch { /* A corrida deve iniciar mesmo com armazenamento bloqueado ou inválido. */ }
  return defaultSave();
}

export function writeSave(save, storage = globalThis.localStorage) {
  const clean = sanitizeSave(save);
  try { storage.setItem(SAVE_KEY, JSON.stringify(clean)); } catch { /* modo privado */ }
  return clean;
}

export function clearSave(storage = globalThis.localStorage) {
  try { storage.removeItem(SAVE_KEY); storage.removeItem(LEGACY_KEY); } catch { /* modo privado */ }
  return defaultSave();
}
