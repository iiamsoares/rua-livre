import { RACE_RULES, VIEW, clamp, mod } from "./config.js";
import { curveAt, segmentAt } from "./track.js";

const ROAD_STEPS = 44;

function loadImage(source) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });
}

export async function loadGameAssets() {
  const [background, playerSprite, npcCars] = await Promise.all([
    loadImage("assets/scenery/rio-night-panorama.png"),
    loadImage("assets/cars/player/spritesheet_up.png"),
    loadImage("assets/cars/player/npcs_carro.png"),
  ]);
  return { background, playerSprite, npcCars };
}

export class RaceRenderer {
  constructor(canvas, mapCanvas, assets) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.mapCanvas = mapCanvas;
    this.mapContext = mapCanvas.getContext("2d");
    this.assets = assets;
    this.paint = "#d7dde5";
    this.tintedCar = document.createElement("canvas");
    this.tintedCar.width = assets.playerSprite?.width || 1254;
    this.tintedCar.height = assets.playerSprite?.height || 1254;
    this.context.imageSmoothingEnabled = false;
  }

  setPaint(paint) {
    this.paint = paint;
    const image = this.assets.playerSprite;
    const context = this.tintedCar.getContext("2d");
    context.clearRect(0, 0, this.tintedCar.width, this.tintedCar.height);
    if (!image) return;
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0, this.tintedCar.width, this.tintedCar.height);
    context.globalCompositeOperation = "source-atop";
    context.globalAlpha = 0.3;
    context.fillStyle = paint;
    context.fillRect(0, 0, this.tintedCar.width, this.tintedCar.height);
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = 0.62;
    context.drawImage(image, 0, 0, this.tintedCar.width, this.tintedCar.height);
    context.globalAlpha = 1;
  }

  makeRoad(race) {
    const points = [];
    let heading = 0;
    let bend = 0;
    for (let index = 0; index <= ROAD_STEPS; index += 1) {
      const depth = index / ROAD_STEPS;
      const distance = depth * RACE_RULES.visibleDistance;
      const perspective = 1 - depth;
      heading += curveAt(race.track, race.player.distance + distance) * 0.014;
      bend += heading * 2.35;
      const half = 13 + perspective * perspective * 274;
      const cameraOffset = race.player.lateral * half * 0.62;
      points.push({
        distance,
        depth,
        y: VIEW.horizon + perspective * perspective * (VIEW.roadBottom - VIEW.horizon),
        center: VIEW.width / 2 - cameraOffset + bend * depth,
        half,
      });
    }
    return points;
  }

  project(road, distance, lane = 0) {
    const depth = clamp(distance / RACE_RULES.visibleDistance, 0, 1);
    const exact = depth * ROAD_STEPS;
    const lower = road[Math.floor(exact)];
    const upper = road[Math.min(ROAD_STEPS, Math.ceil(exact))];
    const mix = exact - Math.floor(exact);
    const center = lower.center + (upper.center - lower.center) * mix;
    const half = lower.half + (upper.half - lower.half) * mix;
    return {
      x: center + lane * half * 0.62,
      y: lower.y + (upper.y - lower.y) * mix,
      half,
      scale: 0.08 + Math.pow(1 - depth, 1.35) * 0.92,
    };
  }

  drawBackground(race) {
    const context = this.context;
    const image = this.assets.background;
    if (image) {
      const drift = Math.sin(race.player.distance * 0.0004) * 5;
      context.drawImage(image, 0, 0, image.width, image.height, drift - 5, 0, VIEW.width + 10, 126);
    } else {
      const gradient = context.createLinearGradient(0, 0, 0, VIEW.horizon);
      gradient.addColorStop(0, "#080d2a");
      gradient.addColorStop(0.58, "#372070");
      gradient.addColorStop(1, "#ff5b55");
      context.fillStyle = gradient;
      context.fillRect(0, 0, VIEW.width, VIEW.horizon + 10);
    }
    context.fillStyle = "#09101b";
    context.fillRect(0, VIEW.horizon, VIEW.width, VIEW.height - VIEW.horizon);
  }

  drawRoad(race, road) {
    const context = this.context;
    for (let index = ROAD_STEPS - 1; index >= 0; index -= 1) {
      const far = road[index + 1];
      const near = road[index];
      const segment = segmentAt(race.track, race.player.distance + near.distance);
      context.fillStyle = segment.stripe ? "#101d28" : "#0b1821";
      context.fillRect(0, far.y, VIEW.width, near.y - far.y + 1);

      context.beginPath();
      context.moveTo(far.center - far.half, far.y);
      context.lineTo(far.center + far.half, far.y);
      context.lineTo(near.center + near.half, near.y);
      context.lineTo(near.center - near.half, near.y);
      context.closePath();
      context.fillStyle = segment.stripe ? "#2b303d" : "#252b36";
      context.fill();

      const shoulderFar = Math.max(1, far.half * 0.055);
      const shoulderNear = Math.max(1, near.half * 0.055);
      for (const side of [-1, 1]) {
        context.beginPath();
        context.moveTo(far.center + side * far.half, far.y);
        context.lineTo(far.center + side * (far.half - shoulderFar), far.y);
        context.lineTo(near.center + side * (near.half - shoulderNear), near.y);
        context.lineTo(near.center + side * near.half, near.y);
        context.closePath();
        context.fillStyle = segment.stripe ? "#f1eef2" : "#f04b45";
        context.fill();
      }

      if (index % 5 < 2) {
        for (const lane of [-1 / 3, 1 / 3]) {
          context.beginPath();
          context.moveTo(far.center + lane * far.half, far.y);
          context.lineTo(near.center + lane * near.half, near.y);
          context.strokeStyle = "#e8edf5c9";
          context.lineWidth = Math.max(0.5, near.scale * 3);
          context.stroke();
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
    for (let distance = 640; distance >= 70; distance -= 58) {
      const segment = segmentAt(race.track, race.player.distance + distance);
      const side = segment.index % 2 ? -1 : 1;
      const point = this.project(road, distance, side * 1.77);
      if (point.x < -35 || point.x > VIEW.width + 35) continue;
      if (segment.decor === "palms" || segment.decor === "bay") this.drawPalm(point.x, point.y, point.scale * 0.78);
      else if (segment.decor === "tunnel") this.drawLamp(point.x, point.y, point.scale);
      else if (segment.index % 3 === 0) this.drawSign(point.x, point.y, point.scale, side);
      else this.drawLamp(point.x, point.y, point.scale);
    }
  }

  drawPalm(x, y, scale) {
    const context = this.context;
    context.save(); context.translate(x, y); context.scale(scale, scale);
    context.strokeStyle = "#432919"; context.lineWidth = 4; context.beginPath(); context.moveTo(0, 2); context.quadraticCurveTo(-3, -28, 3, -53); context.stroke();
    context.strokeStyle = "#113c2b"; context.lineWidth = 5;
    for (let index = 0; index < 7; index += 1) { const angle = -2.7 + index * 0.47; context.beginPath(); context.moveTo(3, -51); context.lineTo(3 + Math.cos(angle) * 24, -51 + Math.sin(angle) * 16); context.stroke(); }
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
      const frameWidth = sheet.width / 4;
      const frameHeight = sheet.height / 4;
      const column = entity.spriteIndex % 4;
      const row = Math.floor(entity.spriteIndex / 4);
      const size = (entity.kind === "van" ? 64 : 58) * point.scale;
      context.save();
      context.translate(point.x, point.y);
      context.drawImage(sheet, column * frameWidth, row * frameHeight, frameWidth, frameHeight, -size / 2, -size * 0.88, size, size);
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
      if (item.delta < 5 || item.delta > RACE_RULES.visibleDistance) continue;
      this.drawWorldCar(this.project(road, item.delta, item.entity.lane), item.entity, item.rival);
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
    context.translate(VIEW.width / 2 + shake, 233 + shake);
    if (player.boosting) {
      context.fillStyle = "#ff6b21"; context.beginPath(); context.moveTo(-8, 8); context.lineTo(0, 39 + Math.random() * 9); context.lineTo(8, 8); context.fill();
      context.fillStyle = "#fff5a3"; context.beginPath(); context.moveTo(-3, 9); context.lineTo(0, 28 + Math.random() * 5); context.lineTo(3, 9); context.fill();
    }
    if (this.assets.playerSprite) {
      const frameWidth = this.tintedCar.width / 4;
      const frameHeight = this.tintedCar.height / 4;
      const row = player.steerVisual < -0.45 ? 0 : player.steerVisual < -0.08 ? 1 : player.steerVisual > 0.45 ? 3 : 2;
      const column = player.boosting ? Math.floor(race.elapsed * 12) % 4 : 2;
      context.rotate((player.drifting ? -0.045 : 0) * Math.sign(player.steerVisual || 1));
      context.drawImage(this.tintedCar, column * frameWidth, row * frameHeight, frameWidth, frameHeight, -68, -73, 136, 136);
    } else {
      context.fillStyle = this.paint; context.fillRect(-36, -35, 72, 57);
      context.fillStyle = "#111928"; context.fillRect(-24, -29, 48, 22);
      context.fillStyle = "#ff3d49"; context.fillRect(-28, 8, 14, 7); context.fillRect(14, 8, 14, 7);
    }
    context.restore();
  }

  drawAtmosphere(race) {
    const context = this.context;
    const vignette = context.createRadialGradient(240, 142, 75, 240, 142, 290);
    vignette.addColorStop(0.5, "#0000"); vignette.addColorStop(1, "#0009");
    context.fillStyle = vignette; context.fillRect(0, 0, VIEW.width, VIEW.height);
    if (race.player.speed > 178) {
      context.strokeStyle = "#d9efff50";
      for (let index = 0; index < 13; index += 1) {
        const y = 120 + ((index * 37 + race.elapsed * 210) % 145);
        const x = (index * 83) % VIEW.width;
        context.beginPath(); context.moveTo(x, y); context.lineTo(x + (x < 240 ? -13 : 13), y + 3); context.stroke();
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
