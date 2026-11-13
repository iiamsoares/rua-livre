const sprite = (x, y, width, height, referenceHeight, category, anchorX = 0.5, anchorY = 1) => Object.freeze({
  source: Object.freeze({ x, y, width, height }),
  referenceHeight,
  category,
  anchor: Object.freeze({ x: anchorX, y: anchorY }),
});

export const BRASILIA_ATLAS = Object.freeze({
  id: "brasilia-cerrado",
  source: "assets/scenery/brasilia_spritesheet.png",
  width: 1774,
  height: 887,
});

// Recortes medidos no canal alfa do PNG original. As regiões não se sobrepõem.
export const BRASILIA_SPRITES = Object.freeze({
  ipeYellowSmall: sprite(19, 154, 99, 96, 94, "tree"),
  ipePurpleSmall: sprite(606, 144, 112, 105, 98, "tree"),
  ipePurpleMedium: sprite(719, 119, 124, 130, 108, "tree"),
  ipePurpleLarge: sprite(844, 92, 152, 159, 120, "tree"),
  cerradoSmall: sprite(1234, 141, 134, 106, 90, "tree"),

  agave: sprite(47, 287, 159, 87, 25, "ground"),
  flowerYellow: sprite(256, 284, 176, 90, 27, "ground"),
  flowerPurple: sprite(483, 286, 173, 88, 26, "ground"),
  grassLow: sprite(710, 320, 164, 53, 17, "ground"),
  grassTall: sprite(922, 281, 175, 91, 28, "ground"),
  rocksLarge: sprite(1145, 290, 172, 82, 24, "ground"),
  rocksSmall: sprite(1364, 305, 127, 64, 18, "ground"),
  termiteMound: sprite(1525, 275, 198, 95, 30, "ground"),

  lampShort: sprite(42, 494, 53, 91, 55, "roadside"),
  lampTall: sprite(302, 405, 89, 182, 92, "roadside"),
  woodSign: sprite(441, 409, 130, 177, 68, "sign"),
  cactus: sprite(606, 445, 121, 132, 48, "ground"),
  cerradoWide: sprite(750, 454, 231, 124, 72, "tree"),
  signBrasiliaIcon: sprite(1002, 435, 202, 150, 64, "sign"),
  signPlano: sprite(1223, 416, 314, 175, 68, "sign"),
  signEixo: sprite(1553, 439, 203, 146, 62, "sign"),

  curveRight: sprite(22, 618, 95, 95, 42, "sign"),
  curveLeft: sprite(131, 618, 96, 97, 42, "sign"),
  winding: sprite(242, 618, 98, 95, 42, "sign"),
  speed80: sprite(352, 619, 96, 93, 42, "sign"),
  noPass: sprite(464, 621, 96, 95, 42, "sign"),
  chevron: sprite(584, 631, 146, 90, 30, "barrier"),
  guardrail: sprite(788, 650, 273, 67, 18, "barrier"),
  concrete: sprite(1089, 649, 187, 60, 20, "barrier"),
  stripedBarrier: sprite(1310, 647, 247, 62, 21, "barrier"),
  bollard: sprite(1614, 647, 25, 63, 23, "roadside"),

  flowersEdge: sprite(11, 803, 284, 55, 16, "ground"),
  greenWall: sprite(659, 785, 302, 74, 26, "barrier"),
  architecture: sprite(987, 747, 770, 120, 75, "distant"),
});

export function scenerySprite(id) {
  return BRASILIA_SPRITES[id] || null;
}
