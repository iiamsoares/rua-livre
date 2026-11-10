/**
 * Adapted from Jake Gordon's javascript-racer: Util.project / easing (common.js)
 * and addRoad / render (v4.final.html). Copyright 2012–2016 Jake Gordon and
 * contributors, MIT; see ../../vendor/javascript-racer/LICENSE.
 *
 * ES module extraction, explicit state and near-plane handling by Rua Livre.
 * No DOM, audio, artwork, save data or global game loop is imported.
 * This is the integration foundation; the current renderer is still active.
 */
export const interpolate = (a, b, percent) => a + (b - a) * percent;
export const easeIn = (a, b, percent) => a + (b - a) * percent ** 2;
export const easeInOut = (a, b, percent) => a + (b - a) * ((-Math.cos(percent * Math.PI) / 2) + 0.5);
const wrap = (value, length) => ((value % length) + length) % length;

export function projectPoint(world, camera, viewport) {
  const x = (world.x || 0) - camera.x;
  const y = (world.y || 0) - camera.y;
  const z = world.z - camera.z;
  // The upstream renderer rejects these points after projection. Reject them
  // before dividing so Infinity/NaN can never reach Canvas or sprite scaling.
  if (z <= camera.depth) return null;
  const scale = camera.depth / z;
  return {
    x: Math.round(viewport.width / 2 + scale * x * viewport.width / 2),
    y: Math.round(viewport.height / 2 - scale * y * viewport.height / 2),
    half: Math.round(scale * viewport.roadWidth * viewport.width / 2),
    scale,
    cameraZ: z,
  };
}

export function createRoad(segmentLength = 200) {
  if (!Number.isFinite(segmentLength) || segmentLength <= 0) throw new RangeError("Comprimento de segmento inválido");
  return { segmentLength, segments: [], length: 0 };
}

export function addRoad(road, enter, hold, leave, curve = 0, hill = 0) {
  if (![enter, hold, leave].every((count) => Number.isInteger(count) && count >= 0) || enter + hold + leave === 0) {
    throw new RangeError("A seção precisa conter segmentos válidos");
  }
  if (![curve, hill].every(Number.isFinite)) throw new RangeError("Curva ou relevo inválido");
  const startY = road.segments.at(-1)?.p2.y || 0;
  const endY = startY + hill * road.segmentLength;
  const total = enter + hold + leave;
  for (let n = 0; n < total; n++) {
    const index = road.segments.length;
    const bend = n < enter ? easeIn(0, curve, n / enter)
      : n < enter + hold ? curve : easeInOut(curve, 0, (n - enter - hold) / leave);
    road.segments.push({
      index,
      p1: { x: 0, y: road.segments.at(-1)?.p2.y || 0, z: index * road.segmentLength },
      // Include the endpoint, so adjoining sections and the lap seam match exactly.
      p2: { x: 0, y: easeInOut(startY, endY, (n + 1) / total), z: (index + 1) * road.segmentLength },
      curve: bend,
    });
  }
  road.length = road.segments.length * road.segmentLength;
  return road;
}

export function segmentAt(road, distance) {
  if (!road.segments.length) throw new RangeError("A pista está vazia");
  return road.segments[Math.floor(wrap(distance, road.length) / road.segmentLength)];
}

export function elevationAt(road, distance) {
  const segment = segmentAt(road, distance);
  const fraction = wrap(distance, road.segmentLength) / road.segmentLength;
  return interpolate(segment.p1.y, segment.p2.y, fraction);
}

/** Near-to-far road projection, including accumulated curvature and hill clipping. */
export function projectRoad(road, camera, viewport, drawDistance = 200) {
  if (!Number.isInteger(drawDistance) || drawDistance < 1) throw new RangeError("Distância de desenho inválida");
  const position = wrap(camera.z, road.length);
  const base = segmentAt(road, position);
  const percent = wrap(position, road.segmentLength) / road.segmentLength;
  const output = [];
  let x = 0;
  let dx = -(base.curve * percent);
  let clipY = viewport.height;
  for (let n = 0; n < drawDistance; n++) {
    const absoluteIndex = base.index + n;
    const segment = road.segments[absoluteIndex % road.segments.length];
    const loopOffset = Math.floor(absoluteIndex / road.segments.length) * road.length;
    const cameraZ = position - loopOffset;
    const p1 = projectPoint(segment.p1, { ...camera, x: camera.x - x, z: cameraZ }, viewport);
    const p2 = projectPoint(segment.p2, { ...camera, x: camera.x - x - dx, z: cameraZ }, viewport);
    const visible = Boolean(p1 && p2 && p2.y < p1.y && p2.y < clipY);
    output.push({ index: segment.index, p1, p2, clipY, visible });
    x += dx;
    dx += segment.curve;
    if (visible) clipY = Math.min(clipY, p1.y);
  }
  return output;
}
