import { BRASILIA_ZONES } from "./brasilia-zones.js";
import { SCENERY_ATLASES } from "./manifest.js";

const placeholder = (id, panorama) => Object.freeze({ id, enabled: false, panorama, atlas: null });

export const SCENERY_QUALITY = Object.freeze({
  low: Object.freeze({ density: 0.45, details: false }),
  medium: Object.freeze({ density: 0.72, details: true }),
  high: Object.freeze({ density: 1, details: true }),
});

export const ENVIRONMENTS = Object.freeze({
  brasilia: Object.freeze({
    id: "brasilia",
    enabled: true,
    seed: 0x61a51a,
    panorama: "assets/scenery/brasilia_cenario.png",
    atlases: Object.freeze(Object.values(SCENERY_ATLASES)),
    zones: BRASILIA_ZONES,
    quality: "high",
  }),
  rio: placeholder("rio", "assets/scenery/rio-night-panorama.png"),
  salvador: placeholder("salvador", null),
  manaus: placeholder("manaus", null),
});

export function environmentFor(id = "rio") {
  return ENVIRONMENTS[id] || ENVIRONMENTS.rio;
}
