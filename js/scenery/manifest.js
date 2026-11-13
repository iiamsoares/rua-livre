const sprite = (atlas, x, y, width, height, referenceHeight, category, anchorX = 0.5, anchorY = 1) => Object.freeze({
  atlas,
  source: Object.freeze({ x, y, width, height }),
  referenceHeight,
  category,
  anchor: Object.freeze({ x: anchorX, y: anchorY }),
});

export const SCENERY_ATLASES = Object.freeze({
  cerrado: Object.freeze({ id: "cerrado", source: "assets/scenery/brasilia_spritesheet.png", width: 1774, height: 887 }),
  eixo: Object.freeze({ id: "eixo", source: "assets/scenery/sprite_eixo_monumental.png", width: 1448, height: 1086 }),
  lago: Object.freeze({ id: "lago", source: "assets/scenery/sprite_lago.png", width: 1448, height: 1086 }),
  reta: Object.freeze({ id: "reta", source: "assets/scenery/sprite_reta_capital.png", width: 1448, height: 1086 }),
});

export const BRASILIA_ATLAS = SCENERY_ATLASES.cerrado;

// Recortes medidos no canal alfa do PNG original. As regiões não se sobrepõem.
export const BRASILIA_SPRITES = Object.freeze({
  ipeYellowSmall: sprite("cerrado", 19, 154, 99, 96, 94, "tree"),
  ipePurpleSmall: sprite("cerrado", 606, 144, 112, 105, 98, "tree"),
  ipePurpleMedium: sprite("cerrado", 719, 119, 124, 130, 108, "tree"),
  ipePurpleLarge: sprite("cerrado", 844, 92, 152, 159, 120, "tree"),
  cerradoSmall: sprite("cerrado", 1234, 141, 134, 106, 90, "tree"),

  agave: sprite("cerrado", 47, 287, 159, 87, 25, "ground"),
  flowerYellow: sprite("cerrado", 256, 284, 176, 90, 27, "ground"),
  flowerPurple: sprite("cerrado", 483, 286, 173, 88, 26, "ground"),
  grassLow: sprite("cerrado", 710, 320, 164, 53, 17, "ground"),
  grassTall: sprite("cerrado", 922, 281, 175, 91, 28, "ground"),
  rocksLarge: sprite("cerrado", 1145, 290, 172, 82, 24, "ground"),
  rocksSmall: sprite("cerrado", 1364, 305, 127, 64, 18, "ground"),
  termiteMound: sprite("cerrado", 1525, 275, 198, 95, 30, "ground"),

  lampShort: sprite("cerrado", 42, 494, 53, 91, 55, "roadside"),
  lampTall: sprite("cerrado", 302, 405, 89, 182, 92, "roadside"),
  woodSign: sprite("cerrado", 441, 409, 130, 177, 68, "sign"),
  cactus: sprite("cerrado", 606, 445, 121, 132, 48, "ground"),
  cerradoWide: sprite("cerrado", 750, 454, 231, 124, 72, "tree"),
  signBrasiliaIcon: sprite("cerrado", 1002, 435, 202, 150, 64, "sign"),
  signPlano: sprite("cerrado", 1223, 416, 314, 175, 68, "sign"),
  signEixo: sprite("cerrado", 1553, 439, 203, 146, 62, "sign"),

  curveRight: sprite("cerrado", 22, 618, 95, 95, 42, "sign"),
  curveLeft: sprite("cerrado", 131, 618, 96, 97, 42, "sign"),
  winding: sprite("cerrado", 242, 618, 98, 95, 42, "sign"),
  speed80: sprite("cerrado", 352, 619, 96, 93, 42, "sign"),
  noPass: sprite("cerrado", 464, 621, 96, 95, 42, "sign"),
  chevron: sprite("cerrado", 584, 631, 146, 90, 30, "barrier"),
  guardrail: sprite("cerrado", 788, 650, 273, 67, 18, "barrier"),
  concrete: sprite("cerrado", 1089, 649, 187, 60, 20, "barrier"),
  stripedBarrier: sprite("cerrado", 1310, 647, 247, 62, 21, "barrier"),
  bollard: sprite("cerrado", 1614, 647, 25, 63, 23, "roadside"),

  flowersEdge: sprite("cerrado", 11, 803, 284, 55, 16, "ground"),
  greenWall: sprite("cerrado", 659, 785, 302, 74, 26, "barrier"),
  architecture: sprite("cerrado", 987, 747, 770, 120, 75, "distant"),

  eixoModernLamp: sprite("eixo", 24, 335, 150, 119, 68, "roadside"),
  eixoOrnateLamp: sprite("eixo", 374, 327, 64, 128, 66, "roadside"),
  eixoGreenGantry: sprite("eixo", 758, 314, 291, 143, 62, "sign"),
  eixoBrownGantry: sprite("eixo", 1067, 325, 225, 131, 58, "sign"),
  eixoBlueDirections: sprite("eixo", 1133, 474, 282, 123, 54, "sign"),
  eixoGuardrail: sprite("eixo", 20, 623, 270, 102, 20, "barrier"),
  eixoConcrete: sprite("eixo", 290, 623, 165, 102, 22, "barrier"),
  eixoStriped: sprite("eixo", 455, 622, 247, 65, 20, "barrier"),
  eixoBusStop: sprite("eixo", 23, 725, 387, 175, 52, "roadside"),
  eixoFence: sprite("eixo", 410, 764, 240, 136, 25, "barrier"),
  eixoFenceWide: sprite("eixo", 650, 764, 390, 136, 25, "barrier"),
  eixoBillboard: sprite("eixo", 1093, 725, 324, 175, 58, "sign"),
  eixoFlowerbed: sprite("eixo", 700, 900, 364, 70, 17, "ground"),

  lagoTouristSign: sprite("lago", 820, 307, 241, 143, 58, "sign"),
  lagoBikeSign: sprite("lago", 1080, 317, 160, 133, 48, "sign"),
  lagoGuardrail: sprite("lago", 12, 450, 278, 108, 20, "barrier"),
  lagoStoneRailing: sprite("lago", 290, 450, 456, 108, 24, "barrier"),
  lagoWoodDock: sprite("lago", 774, 450, 287, 114, 26, "roadside"),
  lagoWoodDockWide: sprite("lago", 1087, 450, 347, 119, 27, "roadside"),
  lagoBench: sprite("lago", 970, 606, 270, 104, 29, "roadside"),
  lagoGlassRailing: sprite("lago", 420, 735, 250, 100, 23, "barrier"),
  lagoFlags: sprite("lago", 890, 710, 361, 125, 52, "roadside"),
  lagoHedge: sprite("lago", 773, 835, 277, 40, 15, "ground"),
  lagoFlowerbed: sprite("lago", 19, 835, 321, 40, 15, "ground"),

  retaGrandstandSmall: sprite("reta", 32, 57, 165, 133, 58, "competition"),
  retaGrandstandMedium: sprite("reta", 225, 35, 248, 155, 68, "competition"),
  retaGrandstandLarge: sprite("reta", 491, 18, 369, 142, 74, "competition"),
  retaFlagCheckeredLeft: sprite("reta", 28, 190, 112, 133, 62, "competition"),
  retaFlagCheckeredRight: sprite("reta", 140, 190, 132, 133, 62, "competition"),
  retaFlagCapitalGreen: sprite("reta", 273, 190, 115, 133, 62, "competition"),
  retaFlagCapitalWhite: sprite("reta", 400, 190, 90, 133, 62, "competition"),
  retaFinishArch: sprite("reta", 500, 195, 365, 128, 72, "competition"),
  retaDistance50: sprite("reta", 940, 348, 130, 120, 42, "sign"),
  retaDistance100: sprite("reta", 1070, 362, 120, 96, 40, "sign"),
  retaDistance200: sprite("reta", 1190, 361, 119, 98, 40, "sign"),
  retaFinishSign: sprite("reta", 1317, 361, 110, 97, 40, "sign"),
  retaBarrier: sprite("reta", 613, 625, 387, 103, 25, "barrier"),
  retaFloodlights: sprite("reta", 38, 741, 662, 134, 65, "competition"),
  retaBunting: sprite("reta", 1079, 741, 328, 126, 50, "competition"),
});

export function scenerySprite(id) {
  return BRASILIA_SPRITES[id] || null;
}
