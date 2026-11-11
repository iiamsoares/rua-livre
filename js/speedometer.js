import { clamp } from "./config.js";

const GLYPHS = {
  "0": [7, 5, 5, 5, 7], "1": [2, 6, 2, 2, 7], "2": [7, 1, 7, 4, 7],
  "3": [7, 1, 7, 1, 7], "4": [5, 5, 7, 1, 1], "5": [7, 4, 7, 1, 7],
  "6": [7, 4, 7, 5, 7], "7": [7, 1, 2, 2, 2], "8": [7, 5, 7, 5, 7],
  "9": [7, 5, 7, 1, 7], K: [5, 5, 6, 5, 5], M: [5, 7, 7, 5, 5],
  H: [5, 5, 7, 5, 5], N: [5, 7, 7, 7, 5], "/": [1, 1, 2, 4, 4],
};

export function gaugeAngle(speed) {
  return (135 + clamp(Number.isFinite(speed) ? speed : 0, 0, 260) / 260 * 270) * Math.PI / 180;
}

function text(ctx, value, x, y, scale, color) {
  ctx.fillStyle = color;
  [...String(value)].forEach((character, index) => {
    (GLYPHS[character] || []).forEach((row, dy) => {
      for (let dx = 0; dx < 3; dx++) {
        if (row & (1 << (2 - dx))) ctx.fillRect(x + (index * 4 + dx) * scale, y + dy * scale, scale, scale);
      }
    });
  });
}

// Integer raster line: ticks and needle have true stepped pixel edges.
function line(ctx, x0, y0, x1, y1, color, thickness = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  ctx.fillStyle = color;
  for (;;) {
    ctx.fillRect(x0, y0, thickness, thickness);
    if (x0 === x1 && y0 === y1) break;
    const twice = 2 * error;
    if (twice >= dy) { error += dy; x0 += sx; }
    if (twice <= dx) { error += dx; y0 += sy; }
  }
}

export class PixelSpeedometer {
  constructor(canvas) {
    this.context = canvas.getContext("2d");
    this.context.imageSmoothingEnabled = false;
    this.lastFrame = "";
  }

  draw(speed, gear, boosting = false) {
    const value = Math.round(clamp(Number.isFinite(speed) ? speed : 0, 0, 999));
    const key = `${value}:${gear}:${boosting}`;
    if (this.lastFrame === key) return;
    this.lastFrame = key;
    const ctx = this.context;
    ctx.clearRect(0, 0, 96, 104);
    // Rasterized circle, without Canvas antialiasing or external font assets.
    for (let y = 0; y <= 88; y++) {
      const dy = y - 44;
      const outer = Math.floor(Math.sqrt(Math.max(0, 44 * 44 - dy * dy)));
      ctx.fillStyle = boosting ? "#f5c84c" : "#8d99b4";
      ctx.fillRect(48 - outer, y + 1, outer * 2 + 1, 1);
      if (Math.abs(dy) <= 41) {
        const inner = Math.floor(Math.sqrt(41 * 41 - dy * dy));
        ctx.fillStyle = "#101725";
        ctx.fillRect(48 - inner, y + 1, inner * 2 + 1, 1);
      }
    }
    for (let tick = 0; tick <= 260; tick += 20) {
      const angle = gaugeAngle(tick);
      const major = tick % 60 === 0;
      line(ctx, 48 + Math.cos(angle) * (major ? 31 : 34), 45 + Math.sin(angle) * (major ? 31 : 34),
        48 + Math.cos(angle) * 38, 45 + Math.sin(angle) * 38, tick >= 220 ? "#ff785b" : "#50e9bc");
      if (major) {
        const label = String(tick);
        text(ctx, label, Math.round(48 + Math.cos(angle) * 24 - (label.length * 4 - 1) / 2), Math.round(45 + Math.sin(angle) * 24 - 2), 1, "#e9f2ff");
      }
    }
    const angle = gaugeAngle(value);
    line(ctx, 48 - Math.cos(angle) * 5, 45 - Math.sin(angle) * 5, 48 + Math.cos(angle) * 30, 45 + Math.sin(angle) * 30, "#ff483e", 2);
    ctx.fillStyle = "#e8e9ef"; ctx.fillRect(46, 43, 5, 5);
    ctx.fillStyle = "#7f8ba5"; ctx.fillRect(7, 75, 82, 28);
    ctx.fillStyle = "#080f1d"; ctx.fillRect(9, 77, 78, 24);
    const digits = String(value).padStart(3, "0");
    text(ctx, digits, 18, 80, 2, boosting ? "#ffe56b" : "#50e9bc");
    text(ctx, "KM/H", 21, 93, 1, "#c2d1e5");
    ctx.fillStyle = "#34445c"; ctx.fillRect(56, 80, 1, 18);
    text(ctx, String(gear), 67, 82, 2, "#ffe56b");
  }
}
