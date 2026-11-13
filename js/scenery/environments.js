import { BRASILIA_ATLAS } from "./manifest.js";

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
    atlas: BRASILIA_ATLAS,
    quality: "high",
    densities: Object.freeze({
      trees: 0.82,
      ground: 0.9,
      signs: 0.34,
      architecture: 0.08,
    }),
  }),
  rio: placeholder("rio", "assets/scenery/rio-night-panorama.png"),
  salvador: placeholder("salvador", null),
  manaus: placeholder("manaus", null),
});

export function environmentFor(id = "rio") {
  return ENVIRONMENTS[id] || ENVIRONMENTS.rio;
}
