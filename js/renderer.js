import { PLAYER_CARS, RACE_RULES, VIEW, clamp, mod } from "./config.js";
import { curveAt, elevationAt, segmentAt } from "./track.js";

const ROAD_SLICE = 5;
const CAMERA_DEPTH = 40;

export function roadHorizon(race) {
  const grade = (elevationAt(race.track, race.player.distance + 60) - elevationAt(race.track, race.player.distance)) / 60;
  return VIEW.horizon + grade * 42;
}

// Reciprocal depth makes nearby asphalt rush past while the horizon stays distant.
export function roadPerspective(distance) {
  const far = CAMERA_DEPTH / (CAMERA_DEPTH + RACE_RULES.visibleDistance);
  return (CAMERA_DEPTH / (CAMERA_DEPTH + clamp(distance, 0, RACE_RULES.visibleDistance)) - far) / (1 - far);
}

export function sceneryPositions(playerDistance, spacing = 28) {
  const first = Math.floor(playerDistance / spacing) + 1;
  const last = Math.floor((playerDistance + RACE_RULES.visibleDistance) / spacing);
  return Array.from({ length: Math.max(0, last - first + 1) }, (_, index) => (last - index) * spacing);
}
const NPC_GRID = Object.freeze({
  columns: [0, 308, 629, 944, 1254],
  rows: [0, 368, 652, 930, 1254],
});
const INDICATOR_CROPS = Object.freeze({
  rival: { x: 400, y: 330, width: 460, height: 570 },
  player: { x: 330, y: 285, width: 590, height: 920 },
});

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

function loadImage(source) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });
}

export async function loadGameAssets() {
  const [background, npcCars, rivalIndicator, playerIndicator, ...playerSprites] = await Promise.all([
    loadImage("assets/scenery/rio-night-panorama.png"),
    loadImage("assets/cars/player/npcs_carro.png"),
    loadImage("assets/ui/seta_inimigo.png"),
    loadImage("assets/ui/seta_jogador.png"),
    ...PLAYER_CARS.map((car) => loadImage(car.spriteAsset)),
  ]);
  const playerCars = Object.fromEntries(PLAYER_CARS.map((car, index) => [car.id, playerSprites[index]]));
  return { background, playerCars, npcCars, rivalIndicator, playerIndicator };
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
    this.assets = assets;
    this.playerCar = PLAYER_CARS[0];
    this.playerSprite = assets.playerCars[this.playerCar.id];
    this.context.imageSmoothingEnabled = false;
  }

  setPlayerCar(carId) {
    this.playerCar = PLAYER_CARS.find((car) => car.id === carId) || PLAYER_CARS[0];
    this.playerSprite = this.assets.playerCars[this.playerCar.id] || this.assets.playerCars[PLAYER_CARS[0].id];
  }

  makeRoad(race) {
    const points = [];
    let heading = 0;
    let bend = 0;
    const distances = [0];
    // Anchor polygon edges to the world, not the camera, for continuous scrolling.
    for (let distance = ROAD_SLICE - mod(race.player.distance, ROAD_SLICE); distance < RACE_RULES.visibleDistance; distance += ROAD_SLICE) distances.push(distance);
    distances.push(RACE_RULES.visibleDistance);
    let previousDistance = 0;
    const horizon = roadHorizon(race);
    for (const distance of distances) {
      const depth = distance / RACE_RULES.visibleDistance;
      const perspective = roadPerspective(distance);
      const step = distance - previousDistance;
      heading += curveAt(race.track, race.player.distance + distance) * step * 0.022;
      bend += heading * step;
      previousDistance = distance;
      const half = 13 + perspective * 274;
      const cameraOffset = race.player.lateral * (half * 0.62 - 34);
      const hill = (elevationAt(race.track, race.player.distance + distance) - elevationAt(race.track, race.player.distance)) * perspective * 0.7;
      points.push({
        distance,
        depth,
        y: horizon + perspective * (VIEW.roadBottom - horizon) - hill,
        center: VIEW.width / 2 - cameraOffset + bend * CAMERA_DEPTH / (CAMERA_DEPTH + distance) * 1.1,
        half,
        scale: half / 287,
      });
    }
    return points;
  }

  project(road, distance, lane = 0) {
    const clampedDistance = clamp(distance, 0, RACE_RULES.visibleDistance);
    const upperIndex = Math.max(1, road.findIndex((point) => point.distance >= clampedDistance));
    const lower = road[upperIndex - 1];
    const upper = road[upperIndex];
    const mix = (clampedDistance - lower.distance) / (upper.distance - lower.distance);
    const center = lower.center + (upper.center - lower.center) * mix;
    const half = lower.half + (upper.half - lower.half) * mix;
    return {
      x: center + lane * half * 0.62,
      y: lower.y + (upper.y - lower.y) * mix,
      half,
      scale: half / 287,
    };
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
    for (let y = Math.ceil(road.at(-1).y / pixel) * pixel; y < VIEW.height; y += pixel) {
      const farIndex = road.findIndex((point) => point.y <= y);
      if (farIndex < 1) continue;
      const near = road[farIndex - 1];
      const far = road[farIndex];
      const mix = (y - near.y) / (far.y - near.y);
      const center = near.center + (far.center - near.center) * mix;
      const half = near.half + (far.half - near.half) * mix;
      const worldDistance = race.player.distance + near.distance + (far.distance - near.distance) * mix;
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
    this.drawFinishLines(race, road);
  }

  drawFinishLines(race, road) {
    for (let lap = 1; lap <= RACE_RULES.laps; lap += 1) {
      const delta = race.track.length * lap - race.player.distance;
      if (delta <= 0 || delta >= RACE_RULES.visibleDistance) continue;
      const point = this.project(road, delta);
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
    for (const worldDistance of sceneryPositions(race.player.distance)) {
      const distance = worldDistance - race.player.distance;
      const segment = segmentAt(race.track, worldDistance);
      const side = Math.floor(worldDistance / 28) % 2 ? -1 : 1;
      const point = this.project(road, distance, side * 1.9);
      if (point.x < -35 || point.x > VIEW.width + 35) continue;
      if (Math.abs(segment.curve) > 0.35 && Math.floor(worldDistance / 28) % 3 === 0) this.drawChevron(point.x, point.y, point.scale, Math.sign(segment.curve));
      else if (segment.decor === "palms" || segment.decor === "bay") this.drawPalm(point.x, point.y, point.scale * 1.3);
      else if (segment.decor === "tunnel") this.drawLamp(point.x, point.y, point.scale);
      else if (segment.index % 3 === 0) this.drawSign(point.x, point.y, point.scale, side);
      else this.drawLamp(point.x, point.y, point.scale);
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

  drawEntities(race, road) {
    const visible = [];
    for (const entity of race.traffic) visible.push({ entity, rival: false, delta: entity.distance - race.player.distance });
    for (const entity of race.rivals) visible.push({ entity, rival: true, delta: entity.distance - race.player.distance });
    visible.sort((a, b) => b.delta - a.delta);
    for (const item of visible) {
      if (item.delta < -1 || item.delta > RACE_RULES.visibleDistance) continue;
      const point = this.project(road, Math.max(0, item.delta), item.entity.lane);
      point.y = Math.min(point.y, 263);
      this.drawWorldCar(point, item.entity, item.rival);
    }
    for (const pickup of race.pickups) {
      const delta = pickup.distance - race.player.distance;
      if (pickup.collected || delta < 4 || delta > RACE_RULES.visibleDistance) continue;
      const point = this.project(road, delta, pickup.lane);
      const size = Math.max(2, 12 * point.scale);
      this.context.fillStyle = "#ff6a27"; this.context.fillRect(point.x - size / 2, point.y - size * 1.8, size, size * 1.8);
      this.context.fillStyle = "#fff16b"; this.context.fillRect(point.x - size * 0.18, point.y - size * 1.55, size * 0.36, size * 0.8);
    }
  }

  drawPlayer(race) {
    const context = this.context;
    const player = race.player;
    context.save();
    const shake = race.impactTimer > 0 ? (Math.random() - 0.5) * 5 : 0;
    const vibration = Math.sin(race.player.distance * 1.8) * Math.min(0.65, player.speed / 280);
    context.translate(VIEW.width / 2 + player.lateral * 34 + shake, 267 + shake + vibration);
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
      context.fillStyle = player.drifting ? "#c5c3d8" : "#d7b373";
      for (let index = 0; index < 4; index++) {
        const phase = mod(player.distance * 0.2 + index * 0.25, 1);
        context.fillRect((index % 2 ? 25 : -30) + player.steerVisual * phase * 10, -8 + phase * 8, 2 + phase * 6, 2 + phase * 3);
      }
    }
    if (this.playerSprite) {
      const row = this.playerCar.spriteRows === 3
        ? (player.steerVisual < -0.12 ? 0 : player.steerVisual > 0.12 ? 2 : 1)
        : (player.steerVisual < -0.45 ? 0 : player.steerVisual < -0.08 ? 1 : player.steerVisual > 0.45 ? 3 : 2);
      const column = player.speed > 10 ? Math.floor(player.distance * 0.8) % 4 : 2;
      const frame = spriteCell(this.playerSprite, row * 4 + column, null, this.playerCar.spriteRows);
      context.rotate((player.drifting ? -0.045 : 0) * Math.sign(player.steerVisual || 1));
      context.drawImage(this.playerSprite, frame.x, frame.y, frame.width, frame.height, -32, -64, 64, 64);
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

  drawMap(race) {
    const context = this.mapContext;
    const points = race.track.mapPoints;
    context.clearRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);
    context.beginPath();
    points.forEach((point, index) => { const x = 7 + point.x * 78; const y = 5 + point.y * 48; if (index === 0) context.moveTo(x, y); else context.lineTo(x, y); });
    context.strokeStyle = "#ecf2ff"; context.lineWidth = 3; context.lineJoin = "round"; context.stroke();
    const fraction = mod(race.player.distance, race.track.length) / race.track.length;
    const playerPoint = points[Math.min(points.length - 1, Math.floor(fraction * points.length))];
    context.fillStyle = "#ff4f45"; context.beginPath(); context.arc(7 + playerPoint.x * 78, 5 + playerPoint.y * 48, 3.5, 0, Math.PI * 2); context.fill();
  }

  render(race) {
    const context = this.context;
    context.save();
    if (race.impactTimer > 0) context.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
    this.drawBackground(race);
    const road = this.makeRoad(race);
    this.drawRoad(race, road);
    this.drawScenery(race, road);
    this.drawEntities(race, road);
    this.drawPlayer(race);
    this.drawAtmosphere(race);
    context.restore();
    this.drawMap(race);
  }
}
