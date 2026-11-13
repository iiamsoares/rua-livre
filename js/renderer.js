import { PLAYER_CARS, RACE_RULES, VIEW, clamp, mod } from "./config.js";
import { segmentAt } from "./track.js";
import { CAMERA, buildRoadFrame, projectEntity, roadHorizon, worldDistanceAt } from "./engines/rua-livre-adapter.js";
import { environmentFor } from "./scenery/environments.js";
import { sceneryForTrack } from "./scenery/generator.js";
import { scenerySprite } from "./scenery/manifest.js";
import { zoneAtProgress } from "./scenery/brasilia-zones.js";

export function sceneryPositions(playerDistance, spacing = 28) {
  const first = Math.floor(playerDistance / spacing) + 1;
  const last = Math.floor((playerDistance + RACE_RULES.visibleDistance) / spacing);
  return Array.from({ length: Math.max(0, last - first + 1) }, (_, index) => (last - index) * spacing);
}
export const SCENERY_RENDER_SCALE = 2;
const NPC_GRID = Object.freeze({
  columns: [0, 308, 629, 944, 1254],
  rows: [0, 368, 652, 930, 1254],
});
const INDICATOR_CROPS = Object.freeze({
  rival: { x: 400, y: 330, width: 460, height: 570 },
  player: { x: 330, y: 285, width: 590, height: 920 },
});
const PARTICLE_FRAME = 181;
const PARTICLE_COLUMNS = 8;
const PARTICLE_ROWS = 6;
const POTHOLE_CROP = Object.freeze({ x: 300, y: 320, width: 950, height: 400 });
const TURBO_CROP = Object.freeze({ x: 427, y: 38, width: 400, height: 1161 });
const MINIMAP_PATH = Object.freeze([
  [0.25, 0.73], [0.42, 0.63], [0.77, 0.58], [0.63, 0.45],
  [0.75, 0.36], [0.67, 0.3], [0.24, 0.19],
]);

function spriteCell(sheet, index, grid = null, rows = 4) {
  const column = index % 4;
  const row = Math.floor(index / 4);
  const x0 = grid ? grid.columns[column] : Math.round(column * sheet.width / 4);
  const x1 = grid ? grid.columns[column + 1] : Math.round((column + 1) * sheet.width / 4);
  const y0 = grid ? grid.rows[row] : Math.round(row * sheet.height / rows);
  const y1 = grid ? grid.rows[row + 1] : Math.round((row + 1) * sheet.height / rows);
  const inset = 2;
  return { x: x0 + inset, y: y0 + inset, width: x1 - x0 - inset * 2, height: y1 - y0 - inset * 2 };
}

export function playerCarFrameIndex(car, player) {
  if (car.spriteLayout === "direction-columns") {
    const column = player.steerVisual < -0.12 ? 1 : player.steerVisual > 0.12 ? 2 : 3;
    return (player.boosting ? 4 : 0) + column;
  }
  const row = car.spriteRows === 3
    ? (player.steerVisual < -0.12 ? 0 : player.steerVisual > 0.12 ? 2 : 1)
    : (player.steerVisual < -0.45 ? 0 : player.steerVisual < -0.08 ? 1 : player.steerVisual > 0.45 ? 3 : 2);
  const column = player.speed > 10 ? Math.floor(player.distance * 0.8) % 4 : 2;
  return row * 4 + column;
}

export function peerCarFrameIndex(car) {
  return car.spriteLayout === "direction-columns" ? 3 : car.spriteRows === 3 ? 6 : 10;
}

function carSpriteFrame(sheet, car, index) {
  const configured = car.spriteFrames?.[index];
  return configured
    ? { x: configured[0], y: configured[1], width: configured[2], height: configured[3] }
    : spriteCell(sheet, index, null, car.spriteRows);
}

function loadImage(source) {
  if (!source) return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });
}

function processImage(image, processPixel) {
  if (!image || typeof document === "undefined") return image;
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let offset = 0; offset < pixels.data.length; offset += 4) processPixel(pixels.data, offset);
  context.putImageData(pixels, 0, 0);
  return canvas;
}

function preparePetals(image) {
  return processImage(image, (data, offset) => {
    if (data[offset + 3] < 80) data[offset + 3] = 0;
  });
}

function prepareMiniMap(image) {
  return processImage(image, (data, offset) => {
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    if (red > 175 && red > green * 1.45 && red > blue * 1.35) {
      data[offset] = 246;
      data[offset + 1] = 247;
      data[offset + 2] = 252;
    }
  });
}

export async function loadGameAssets(environmentId = "rio") {
  const environment = environmentFor(environmentId);
  const atlasDefinitions = environment.atlases || (environment.atlas ? [environment.atlas] : []);
  const [background, sceneryImages, npcCars, rivalIndicator, playerIndicator, pothole, turboPickup, petalsSource, dustParticles, speedometerFace, miniMapSource, ...playerSprites] = await Promise.all([
    loadImage(environment.panorama),
    Promise.all(atlasDefinitions.map((atlas) => loadImage(atlas.source))),
    loadImage("assets/cars/player/npcs_carro.png"),
    loadImage("assets/ui/seta_inimigo.png"),
    loadImage("assets/ui/seta_jogador.png"),
    loadImage("assets/scenery/buraco_estrada.png"),
    loadImage("assets/scenery/turbo.png"),
    loadImage("assets/scenery/sprite_folhas.png"),
    loadImage("assets/scenery/sprite_poeira.png"),
    loadImage("assets/ui/velocimetro.png"),
    loadImage("assets/ui/mini_mapa.png"),
    ...PLAYER_CARS.map((car) => loadImage(car.spriteAsset)),
  ]);
  const sceneryAtlases = Object.fromEntries(atlasDefinitions.map((atlas, index) => [atlas.id, sceneryImages[index]]));
  const playerCars = Object.fromEntries(PLAYER_CARS.map((car, index) => [car.id, playerSprites[index]]));
  return {
    background,
    sceneryAtlases,
    sceneryAtlas: sceneryImages[0] || null,
    environmentId,
    playerCars,
    npcCars,
    rivalIndicator,
    playerIndicator,
    pothole,
    turboPickup,
    petals: preparePetals(petalsSource),
    dustParticles,
    speedometerFace,
    miniMap: prepareMiniMap(miniMapSource),
  };
}

export class RaceRenderer {
  constructor(canvas, mapCanvas, assets) {
    this.canvas = canvas;
    canvas.width = VIEW.pixelWidth;
    canvas.height = VIEW.pixelHeight;
    this.context = canvas.getContext("2d");
    this.context.setTransform(VIEW.pixelWidth / VIEW.width, 0, 0, VIEW.pixelHeight / VIEW.height, 0, 0);
    this.mapCanvas = mapCanvas;
    this.mapContext = mapCanvas.getContext("2d");
    this.mapContext.imageSmoothingEnabled = false;
    this.assets = assets;
    this.hasSceneryAtlases = Object.values(assets.sceneryAtlases || {}).some(Boolean);
    this.playerCar = PLAYER_CARS[0];
    this.playerSprite = assets.playerCars[this.playerCar.id];
    this.debugScenery = typeof location !== "undefined" && new URLSearchParams(location.search).get("debugScenery") === "1";
    this.visibleScenery = 0;
    this.debugFps = 0;
    this.lastRenderTime = 0;
    this.context.imageSmoothingEnabled = false;
  }

  setPlayerCar(carId) {
    this.playerCar = PLAYER_CARS.find((car) => car.id === carId) || PLAYER_CARS[0];
    this.playerSprite = this.assets.playerCars[this.playerCar.id] || this.assets.playerCars[PLAYER_CARS[0].id];
  }

  makeRoad(race) {
    return buildRoadFrame(race);
  }

  project(road, distance, lane = 0) {
    return projectEntity(road, distance, lane);
  }

  drawBackground(race) {
    const context = this.context;
    const image = this.assets.background;
    const horizon = roadHorizon(race);
    context.fillStyle = "#161c46";
    context.fillRect(0, 0, VIEW.width, VIEW.height);
    if (image) {
      const drift = -mod((race.player.heading || 0) * 55, VIEW.width);
      // Two copies wrap continuously; turning scrolls the skyline, stopping freezes it.
      for (let tile = 0; tile < 2; tile++) {
        context.drawImage(image, 0, 0, image.width, image.height, Math.floor(drift + tile * VIEW.width), horizon - 112, VIEW.width + 1, 114);
      }
    } else {
      const gradient = context.createLinearGradient(0, 0, 0, VIEW.horizon);
      gradient.addColorStop(0, "#080d2a");
      gradient.addColorStop(0.58, "#372070");
      gradient.addColorStop(1, "#ff5b55");
      context.fillStyle = gradient;
      context.fillRect(0, 0, VIEW.width, VIEW.horizon + 10);
    }
    context.fillStyle = "#124435";
    context.fillRect(0, horizon, VIEW.width, VIEW.height - horizon);
  }

  drawRoad(race, road) {
    const context = this.context;
    const pixel = VIEW.height / VIEW.pixelHeight;
    // One opaque strip per native pixel row: no antialiased green seams between polygons.
    for (let index = 0; index < road.segments.length; index++) {
      const segment = road.segments[index];
      if (!segment.visible) continue;
      const near = segment.p1;
      const far = segment.p2;
      const bottom = Math.min(VIEW.height, segment.clipY, near.y);
      for (let y = Math.max(0, Math.ceil(far.y / pixel) * pixel); y < bottom; y += pixel) {
        const mix = clamp((y - near.y) / (far.y - near.y), 0, 1);
        const center = near.x + (far.x - near.x) * mix;
        const half = near.half + (far.half - near.half) * mix;
        const worldDistance = worldDistanceAt(road, index, mix);
        const left = Math.floor((center - half) / pixel) * pixel;
        const right = Math.ceil((center + half) / pixel) * pixel;
        const stripe = Math.floor(worldDistance / 10) % 2;
        context.fillStyle = stripe ? "#196344" : "#124c36";
        context.fillRect(0, y, VIEW.width, pixel);
        context.fillStyle = stripe ? "#fff4d9" : "#ed493e";
        context.fillRect(left, y, right - left, pixel);
        const shoulder = Math.max(pixel, Math.round(half * 0.075 / pixel) * pixel);
        context.fillStyle = stripe ? "#66647c" : "#5b5970";
        context.fillRect(left + shoulder, y, right - left - shoulder * 2, pixel);
        const laneStripe = Math.floor(worldDistance / 10) % 3;
        if (laneStripe < 2) {
          context.fillStyle = "#e8edf5";
          const width = Math.max(pixel, Math.round(half / 100) * pixel);
          for (const lane of [-1 / 3, 1 / 3]) {
            context.fillRect(Math.round((center + lane * half) / pixel) * pixel, y, width, pixel);
          }
        }
      }
    }
    this.drawFinishLines(race, road);
  }

  drawFinishLines(race, road) {
    for (let lap = 1; lap <= RACE_RULES.laps; lap += 1) {
      const delta = race.track.length * lap - race.player.distance;
      if (delta <= 0 || delta >= RACE_RULES.visibleDistance) continue;
      const point = this.project(road, delta);
      if (point.y > point.clipY) continue;
      const height = Math.max(1, point.scale * 8);
      const width = point.half * 2;
      const cell = width / 14;
      for (let index = 0; index < 14; index += 1) {
        this.context.fillStyle = index % 2 ? "#10131c" : "#f5f1e8";
        this.context.fillRect(point.x - point.half + index * cell, point.y - height, cell + 1, height);
      }
    }
  }

  drawScenery(race, road) {
    const environment = environmentFor(race.track.environmentId);
    if (!environment.enabled || !this.hasSceneryAtlases) {
      this.drawLegacyScenery(race, road);
      this.visibleScenery = 0;
      return 0;
    }
    const laps = Math.max(1, Math.ceil((race.totalDistance || race.track.length * RACE_RULES.laps) / race.track.length));
    const objects = sceneryForTrack(race.track, environment, environment.quality, laps);
    const context = this.context;
    const pixel = VIEW.height / VIEW.pixelHeight;
    let visible = 0;

    // A lista é estável e ordenada: percorrê-la ao contrário desenha do horizonte para a câmera.
    for (let index = objects.length - 1; index >= 0; index -= 1) {
      const object = objects[index];
      const distance = object.distance - race.player.distance;
      if (distance > RACE_RULES.visibleDistance) continue;
      if (distance < 1.5) break;
      const sprite = scenerySprite(object.type);
      if (!sprite) continue;
      const atlas = this.assets.sceneryAtlases[sprite.atlas];
      if (!atlas) continue;
      const point = this.project(road, distance, object.lane);
      const height = Math.max(pixel, Math.round(sprite.referenceHeight * object.scale * point.scale * SCENERY_RENDER_SCALE / pixel) * pixel);
      const width = Math.max(pixel, Math.round(height * sprite.source.width / sprite.source.height / pixel) * pixel);
      const x = Math.round((point.x - width * sprite.anchor.x) / pixel) * pixel;
      const y = Math.round((point.y - height * sprite.anchor.y) / pixel) * pixel;
      if (x > VIEW.width || x + width < 0 || y > point.clipY) continue;

      context.save();
      context.beginPath();
      context.rect(0, 0, VIEW.width, Math.max(0, point.clipY));
      context.clip();
      context.drawImage(
        atlas,
        sprite.source.x, sprite.source.y, sprite.source.width, sprite.source.height,
        x, y, width, height,
      );
      context.restore();
      visible += 1;
    }
    this.visibleScenery = visible;
    return visible;
  }

  drawLegacyScenery(race, road) {
    for (const worldDistance of sceneryPositions(race.player.distance)) {
      const distance = worldDistance - race.player.distance;
      const segment = segmentAt(race.track, worldDistance);
      const side = Math.floor(worldDistance / 28) % 2 ? -1 : 1;
      const point = this.project(road, distance, side * 1.9);
      if (point.x < -35 || point.x > VIEW.width + 35) continue;
      const context = this.context;
      context.save(); context.beginPath(); context.rect(0, 0, VIEW.width, Math.max(0, point.clipY)); context.clip();
      if (Math.abs(segment.curve) > 0.35 && Math.floor(worldDistance / 28) % 3 === 0) this.drawChevron(point.x, point.y, point.scale, Math.sign(segment.curve));
      else if (segment.decor === "palms" || segment.decor === "bay") this.drawPalm(point.x, point.y, point.scale * 1.3);
      else if (segment.decor === "tunnel") this.drawLamp(point.x, point.y, point.scale);
      else if (segment.index % 3 === 0) this.drawSign(point.x, point.y, point.scale, side);
      else this.drawLamp(point.x, point.y, point.scale);
      context.restore();
    }
  }

  drawPalm(x, y, scale) {
    const context = this.context;
    context.save(); context.translate(x, y); context.scale(scale, scale);
    context.strokeStyle = "#bd7c48"; context.lineWidth = 5; context.beginPath(); context.moveTo(0, 2); context.quadraticCurveTo(-3, -28, 3, -53); context.stroke();
    context.strokeStyle = "#3ea04b"; context.lineWidth = 6;
    for (let index = 0; index < 7; index += 1) { const angle = -2.7 + index * 0.47; context.beginPath(); context.moveTo(3, -51); context.lineTo(3 + Math.cos(angle) * 24, -51 + Math.sin(angle) * 16); context.stroke(); }
    context.restore();
  }

  drawChevron(x, y, scale, direction) {
    const context = this.context;
    context.save(); context.translate(x, y); context.scale(scale, scale);
    context.fillStyle = "#c5c6d1"; context.fillRect(-2, -27, 4, 28);
    context.fillStyle = "#ffe85b"; context.fillRect(-17, -48, 34, 24);
    context.fillStyle = "#252441";
    for (const offset of [-8, 6]) {
      context.beginPath(); context.moveTo(offset - direction * 5, -45); context.lineTo(offset + direction * 4, -36);
      context.lineTo(offset - direction * 5, -27); context.lineTo(offset, -27);
      context.lineTo(offset + direction * 9, -36); context.lineTo(offset, -45); context.fill();
    }
    context.restore();
  }

  drawLamp(x, y, scale) {
    const context = this.context;
    context.save(); context.translate(x, y); context.scale(scale, scale);
    context.fillStyle = "#172232"; context.fillRect(-2, -44, 4, 46);
    context.fillStyle = "#ffe597"; context.fillRect(-5, -46, 10, 5);
    context.fillStyle = "#ffd34c18"; context.beginPath(); context.arc(0, -43, 17, 0, Math.PI * 2); context.fill();
    context.restore();
  }

  drawSign(x, y, scale, side) {
    const context = this.context;
    context.save(); context.translate(x, y); context.scale(scale, scale);
    context.fillStyle = "#182536"; context.fillRect(-2, -34, 4, 36);
    context.fillStyle = "#17634f"; context.fillRect(side < 0 ? -32 : -1, -48, 33, 18);
    context.strokeStyle = "#d9e5df"; context.lineWidth = 1.5; context.strokeRect(side < 0 ? -32 : -1, -48, 33, 18);
    context.fillStyle = "#eff9f4"; context.fillRect(side < 0 ? -27 : 4, -43, 21, 2); context.fillRect(side < 0 ? -27 : 4, -38, 15, 2);
    context.restore();
  }

  drawWorldCar(point, entity, isRival = false) {
    const context = this.context;
    if (this.assets.npcCars && Number.isInteger(entity.spriteIndex)) {
      const sheet = this.assets.npcCars;
      const frame = spriteCell(sheet, entity.spriteIndex, NPC_GRID);
      const size = (entity.kind === "van" ? 70 : 64) * point.scale;
      context.save();
      context.translate(point.x, point.y);
      context.drawImage(sheet, frame.x, frame.y, frame.width, frame.height, -size / 2, -size * 0.88, size, size);
      if (isRival && this.assets.rivalIndicator) {
        const crop = INDICATOR_CROPS.rival;
        const width = Math.max(3, 11 * point.scale);
        const height = width * crop.height / crop.width;
        context.drawImage(this.assets.rivalIndicator, crop.x, crop.y, crop.width, crop.height, -width / 2, -size * 0.88 - height - Math.max(1, point.scale * 2), width, height);
      }
      context.restore();
      return;
    }
    const width = (entity.kind === "van" ? 28 : 23) * point.scale;
    const height = (entity.kind === "van" ? 35 : 27) * point.scale;
    context.save(); context.translate(point.x, point.y);
    context.fillStyle = "#0008"; context.beginPath(); context.ellipse(0, 1, width * 0.62, height * 0.22, 0, 0, Math.PI * 2); context.fill();
    context.fillStyle = entity.color; context.fillRect(-width / 2, -height, width, height * 0.86);
    context.fillStyle = "#101827"; context.fillRect(-width * 0.34, -height * 0.84, width * 0.68, height * 0.34);
    context.fillStyle = "#ff4148"; context.fillRect(-width * 0.39, -height * 0.24, width * 0.2, height * 0.12); context.fillRect(width * 0.19, -height * 0.24, width * 0.2, height * 0.12);
    if (isRival) { context.fillStyle = "#f4f6ff"; context.fillRect(-width * 0.26, -height * 0.42, width * 0.52, Math.max(1, height * 0.08)); }
    context.restore();
  }

  drawPotholes(race, road) {
    const context = this.context;
    // Project each edge onto the asphalt so holes follow slopes and curves.
    const outline = [[-0.5, -1], [0.35, -1], [1, -0.45], [0.85, 0.6], [0.25, 1], [-0.65, 0.8], [-1, 0.15], [-0.85, -0.6]];
    for (const pothole of [...race.potholes].reverse()) {
      const delta = pothole.distance - race.player.distance;
      if (delta < 0 || delta > RACE_RULES.visibleDistance - 2) continue;
      const center = this.project(road, delta, pothole.lane);
      if (center.y > center.clipY) continue;
      context.save();
      context.beginPath(); context.rect(0, 0, VIEW.width, Math.max(0, center.clipY)); context.clip();
      if (this.assets?.pothole) {
        const width = Math.max(3, Math.round(62 * center.scale / 1.5) * 1.5);
        const height = Math.max(1.5, Math.round(width * 0.34 / 1.5) * 1.5);
        context.drawImage(
          this.assets.pothole,
          POTHOLE_CROP.x, POTHOLE_CROP.y, POTHOLE_CROP.width, POTHOLE_CROP.height,
          Math.round((center.x - width / 2) / 1.5) * 1.5,
          Math.round((center.y - height / 2) / 1.5) * 1.5,
          width, height,
        );
        context.restore();
        continue;
      }
      for (const [size, color] of [[1.25, "#77706a"], [1, "#12131b"], [0.65, "#080a10"]]) {
        context.fillStyle = color;
        context.beginPath();
        outline.forEach(([x, z], index) => {
          const point = this.project(road, Math.max(0, delta + z * 1.5 * size), pothole.lane + x * 0.15 * size);
          const px = Math.round(point.x / 1.5) * 1.5;
          const py = Math.round(point.y / 1.5) * 1.5;
          if (index === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        });
        context.closePath(); context.fill();
      }
      context.restore();
    }
  }

  drawEntities(race, road) {
    const visible = [];
    for (const entity of race.traffic) visible.push({ entity, rival: false, delta: entity.distance - race.player.distance });
    for (const entity of race.rivals) visible.push({ entity, rival: true, delta: entity.distance - race.player.distance });
    for (const entity of race.peers || []) visible.push({ entity, rival: false, delta: entity.distance - race.player.distance });
    visible.sort((a, b) => b.delta - a.delta);
    for (const item of visible) {
      if (item.delta < -1 || item.delta > RACE_RULES.visibleDistance) continue;
      const point = this.project(road, Math.max(0, item.delta), item.entity.lane);
      if (point.y - 72 * point.scale > point.clipY) continue;
      this.context.save(); this.context.beginPath(); this.context.rect(0, 0, VIEW.width, Math.max(0, point.clipY)); this.context.clip();
      this.context.translate(point.x, point.y);
      this.context.scale(1, this.spriteHeightScale || 1);
      this.context.translate(-point.x, -point.y);
      if (item.entity.carId) {
        const car = PLAYER_CARS.find((car) => car.id === item.entity.carId) || PLAYER_CARS[0];
        const sheet = this.assets.playerCars[car.id];
        if (sheet) {
          const frame = carSpriteFrame(sheet, car, peerCarFrameIndex(car));
          const size = 64 * point.scale;
          const height = car.spriteLayout === "direction-columns" ? size * frame.height / frame.width : size;
          this.context.drawImage(sheet, frame.x, frame.y, frame.width, frame.height, point.x - size / 2, point.y - height, size, height);
        }
      } else this.drawWorldCar(point, item.entity, item.rival);
      this.context.restore();
    }
    for (const pickup of race.pickups) {
      const delta = pickup.distance - race.player.distance;
      if (pickup.collected || delta < 4 || delta > RACE_RULES.visibleDistance) continue;
      const point = this.project(road, delta, pickup.lane);
      if (point.y > point.clipY) continue;
      const size = Math.max(2, 12 * point.scale);
      if (this.assets.turboPickup) {
        const height = size * 4.7;
        const width = height * TURBO_CROP.width / TURBO_CROP.height;
        this.context.drawImage(
          this.assets.turboPickup,
          TURBO_CROP.x, TURBO_CROP.y, TURBO_CROP.width, TURBO_CROP.height,
          point.x - width / 2, point.y - height, width, height,
        );
      } else {
        this.context.fillStyle = "#ff6a27"; this.context.fillRect(point.x - size / 2, point.y - size * 1.8, size, size * 1.8);
        this.context.fillStyle = "#fff16b"; this.context.fillRect(point.x - size * 0.18, point.y - size * 1.55, size * 0.36, size * 0.8);
      }
    }
  }

  drawPlayer(race) {
    const context = this.context;
    const player = race.player;
    context.save();
    const shake = race.impactTimer > 0 ? (Math.random() - 0.5) * 5 : 0;
    const vibration = Math.sin(race.player.distance * 1.8) * Math.min(0.65, player.speed / 280);
    context.translate(VIEW.width / 2 + player.lateral * 34 + shake, 267 + shake + vibration);
    context.scale(CAMERA.zoom, CAMERA.zoom * (this.spriteHeightScale || 1));
    if (this.assets.playerIndicator) {
      const crop = INDICATOR_CROPS.player;
      const width = 10;
      const height = width * crop.height / crop.width;
      context.drawImage(this.assets.playerIndicator, crop.x, crop.y, crop.width, crop.height, -width / 2, -61 - height, width, height);
    }
    if (player.boosting) {
      context.fillStyle = "#ff6b21"; context.fillRect(-14, -12, 8, 10 + Math.floor(race.elapsed * 20) % 5);
      context.fillStyle = "#fff5a3"; context.fillRect(-12, -12, 4, 9);
    }
    if (player.drifting || (Math.abs(player.lateral) > 0.93 && player.speed > 30)) {
      if (this.assets.dustParticles) {
        const frame = Math.floor(race.elapsed * 13) % (PARTICLE_COLUMNS * PARTICLE_ROWS);
        const column = frame % PARTICLE_COLUMNS;
        const row = Math.min(PARTICLE_ROWS - 1, Math.floor(frame / PARTICLE_COLUMNS));
        const width = 105 + Math.min(35, player.speed * 0.13);
        context.globalAlpha = player.drifting ? 0.78 : 0.62;
        context.drawImage(
          this.assets.dustParticles,
          column * PARTICLE_FRAME, row * PARTICLE_FRAME, PARTICLE_FRAME, PARTICLE_FRAME,
          -width / 2 + player.steerVisual * 5, -45, width, 48,
        );
        context.globalAlpha = 1;
      } else {
        context.fillStyle = player.drifting ? "#c5c3d8" : "#d7b373";
        for (let index = 0; index < 4; index++) {
          const phase = mod(player.distance * 0.2 + index * 0.25, 1);
          context.fillRect((index % 2 ? 25 : -30) + player.steerVisual * phase * 10, -8 + phase * 8, 2 + phase * 6, 2 + phase * 3);
        }
      }
    }
    if (this.playerSprite) {
      const frame = carSpriteFrame(this.playerSprite, this.playerCar, playerCarFrameIndex(this.playerCar, player));
      const height = this.playerCar.spriteLayout === "direction-columns" ? 64 * frame.height / frame.width : 64;
      context.rotate((player.drifting ? -0.045 : 0) * Math.sign(player.steerVisual || 1));
      context.drawImage(this.playerSprite, frame.x, frame.y, frame.width, frame.height, -32, -height, 64, height);
    } else {
      context.fillStyle = "#d7dde5"; context.fillRect(-36, -35, 72, 57);
      context.fillStyle = "#111928"; context.fillRect(-24, -29, 48, 22);
      context.fillStyle = "#ff3d49"; context.fillRect(-28, 8, 14, 7); context.fillRect(14, 8, 14, 7);
    }
    context.restore();
  }

  drawAtmosphere(race) {
    const context = this.context;
    // Nitro is an accent, not floating streaks across normal driving.
    if (race.player.boosting) {
      context.strokeStyle = "#a3eeff";
      context.lineWidth = 1;
      for (let index = 0; index < 8; index += 1) {
        const phase = mod(race.player.distance * 0.035 + index / 8, 1);
        const side = index % 2 ? -1 : 1;
        const x = 240 + side * (160 + phase * 90);
        const y = 130 + phase * 125;
        context.beginPath(); context.moveTo(x, y); context.lineTo(x + side * 12, y + 16); context.stroke();
      }
    }
  }

  drawEnvironmentalParticles(race, road) {
    if (!this.assets.petals) return;
    const environment = environmentFor(race.track.environmentId);
    const progress = mod(race.player.distance, race.track.length) / race.track.length;
    const zone = environment.zones?.length ? zoneAtProgress(progress, environment.zones) : null;
    const intensity = zone?.effects?.petals || 0;
    const count = Math.min(6, Math.round(intensity * 8));
    if (!count) return;

    const spacing = 22;
    const first = Math.floor(race.player.distance / spacing) + 1;
    for (let index = 0; index < count; index += 1) {
      const worldDistance = (first + index * 2) * spacing;
      const distance = worldDistance - race.player.distance;
      if (distance <= 2 || distance >= RACE_RULES.visibleDistance) continue;
      const laneSeed = (first * 13 + index * 17) % 23;
      const lane = (laneSeed / 22 - 0.5) * 3.1;
      const point = this.project(road, distance, lane);
      if (point.y > point.clipY) continue;
      const frame = mod(Math.floor(race.elapsed * 9) + first + index * 7, PARTICLE_COLUMNS * PARTICLE_ROWS);
      const column = frame % PARTICLE_COLUMNS;
      const row = Math.floor(frame / PARTICLE_COLUMNS);
      const size = Math.max(2, 12 * point.scale);
      const drift = Math.sin(race.elapsed * 2.1 + index * 1.7) * size * 0.65;
      this.context.save();
      this.context.beginPath(); this.context.rect(0, 0, VIEW.width, Math.max(0, point.clipY)); this.context.clip();
      this.context.globalAlpha = 0.55 + intensity * 0.38;
      this.context.drawImage(
        this.assets.petals,
        column * PARTICLE_FRAME, row * PARTICLE_FRAME, PARTICLE_FRAME, PARTICLE_FRAME,
        point.x - size / 2 + drift, point.y - size * 1.4, size, size,
      );
      this.context.restore();
    }
  }

  drawSceneryDebug(race) {
    if (!this.debugScenery) return;
    const environment = environmentFor(race.track.environmentId);
    const progress = mod(race.player.distance, race.track.length) / race.track.length;
    const zone = environment.zones?.length ? zoneAtProgress(progress, environment.zones) : null;
    const context = this.context;
    context.save();
    context.fillStyle = "#080b16dc";
    context.fillRect(5, 5, 154, 45);
    context.strokeStyle = "#9cff31";
    context.lineWidth = 1.5;
    context.strokeRect(5, 5, 154, 45);
    context.fillStyle = "#f7f4e8";
    context.font = "7px monospace";
    context.textBaseline = "top";
    context.fillText(`TRECHO: ${zone?.name || "PADRÃO"}`, 10, 10);
    context.fillText(`VOLTA: ${(progress * 100).toFixed(1)}%`, 10, 20);
    context.fillText(`OBJETOS: ${this.visibleScenery}`, 10, 30);
    context.fillText(`FPS: ${Math.round(this.debugFps)}`, 92, 30);
    context.restore();
  }

  drawMap(race) {
    const context = this.mapContext;
    const points = race.track.mapPoints;
    context.clearRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);
    if (this.assets.miniMap) {
      context.drawImage(this.assets.miniMap, 0, 0, this.mapCanvas.width, this.mapCanvas.height);
      const fraction = mod(race.player.distance, race.track.length) / race.track.length;
      const pathPosition = fraction * (MINIMAP_PATH.length - 1);
      const pathIndex = Math.min(MINIMAP_PATH.length - 2, Math.floor(pathPosition));
      const mix = pathPosition - pathIndex;
      const from = MINIMAP_PATH[pathIndex];
      const to = MINIMAP_PATH[pathIndex + 1];
      const x = (from[0] + (to[0] - from[0]) * mix) * this.mapCanvas.width;
      const y = (from[1] + (to[1] - from[1]) * mix) * this.mapCanvas.height;
      const radius = Math.max(2, this.mapCanvas.width * 0.038);
      context.fillStyle = "#ff413c";
      context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.fill();
      context.fillStyle = "#fff6e8";
      context.fillRect(Math.round(x - radius * 0.35), Math.round(y - radius * 0.35), Math.max(1, Math.round(radius * 0.7)), Math.max(1, Math.round(radius * 0.7)));
      return;
    }
    context.beginPath();
    points.forEach((point, index) => { const x = 7 + point.x * 78; const y = 5 + point.y * 48; if (index === 0) context.moveTo(x, y); else context.lineTo(x, y); });
    context.strokeStyle = "#ecf2ff"; context.lineWidth = 3; context.lineJoin = "round"; context.stroke();
    const fraction = mod(race.player.distance, race.track.length) / race.track.length;
    const playerPoint = points[Math.min(points.length - 1, Math.floor(fraction * points.length))];
    context.fillStyle = "#ff4f45"; context.beginPath(); context.arc(7 + playerPoint.x * 78, 5 + playerPoint.y * 48, 3.5, 0, Math.PI * 2); context.fill();
  }

  render(race) {
    const context = this.context;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (this.lastRenderTime > 0) {
      const sample = 1000 / Math.max(1, now - this.lastRenderTime);
      this.debugFps = this.debugFps ? this.debugFps * 0.9 + sample * 0.1 : sample;
    }
    this.lastRenderTime = now;
    context.save();
    if (race.impactTimer > 0) context.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
    this.drawBackground(race);
    const road = this.makeRoad(race);
    this.drawRoad(race, road);
    this.drawPotholes(race, road);
    this.drawScenery(race, road);
    this.drawEnvironmentalParticles(race, road);
    this.drawEntities(race, road);
    this.drawPlayer(race);
    this.drawAtmosphere(race);
    context.restore();
    this.drawSceneryDebug(race);
    this.drawMap(race);
  }
}
