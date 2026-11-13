import { mod } from "./config.js";

const SEGMENT_LENGTH = 14;
const SECTION_DEFINITIONS = [
  { length: 12, curve: 0, decor: "city" },
  { length: 16, curve: 0.52, decor: "palms" },
  { length: 10, curve: 0.08, decor: "bay" },
  { length: 20, curve: -0.7, decor: "city" },
  { length: 12, curve: 0.2, decor: "tunnel" },
  { length: 18, curve: 0.46, decor: "bay" },
  { length: 14, curve: -0.92, decor: "palms" },
  { length: 18, curve: 0, decor: "finish" },
];

function easedCurve(target, index, length) {
  const edge = Math.min(index + 1, length - index, 5) / 5;
  return target * Math.sin(edge * Math.PI / 2);
}

function createTrack({ id, name, environmentId }) {
  const segments = [];
  for (const section of SECTION_DEFINITIONS) {
    for (let index = 0; index < section.length; index += 1) {
      segments.push({
        index: segments.length,
        curve: easedCurve(section.curve, index, section.length),
        decor: section.decor,
        stripe: Math.floor(segments.length / 3) % 2,
      });
    }
  }
  const track = {
    id,
    name,
    environmentId,
    segmentLength: SEGMENT_LENGTH,
    segments,
    length: segments.length * SEGMENT_LENGTH,
  };
  track.mapPoints = buildMapPoints(track);
  return track;
}

export function createRioTrack() {
  return createTrack({
    id: "rio-orla-noturna",
    name: "Circuito Orla da Guanabara",
    environmentId: "rio",
  });
}

export function createBrasiliaTrack() {
  return createTrack({
    id: "brasilia-circuito-cerrado",
    name: "Brasília — Circuito do Cerrado",
    environmentId: "brasilia",
  });
}

export function segmentAt(track, distance) {
  const index = Math.floor(mod(distance, track.length) / track.segmentLength);
  return track.segments[index];
}

export function curveAt(track, distance) {
  const current = segmentAt(track, distance);
  const next = track.segments[(current.index + 1) % track.segments.length];
  const fraction = mod(distance, track.segmentLength) / track.segmentLength;
  const eased = fraction * fraction * (3 - 2 * fraction);
  return current.curve + (next.curve - current.curve) * eased;
}

// Smooth, periodic elevation: the lap seam has neither a height nor a slope jump.
export function elevationAt(track, distance) {
  const phase = mod(distance, track.length) / track.length * Math.PI * 2;
  return 22 * Math.sin(phase * 2) + 9 * Math.sin(phase * 3);
}

function buildMapPoints(track) {
  let x = 0;
  let y = 0;
  let heading = -Math.PI / 2;
  const raw = track.segments.map((segment) => {
    heading += segment.curve * 0.045;
    x += Math.cos(heading);
    y += Math.sin(heading);
    return { x, y };
  });
  const xs = raw.map((point) => point.x);
  const ys = raw.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return raw.map((point) => ({
    x: (point.x - minX) / Math.max(1, maxX - minX),
    y: (point.y - minY) / Math.max(1, maxY - minY),
  }));
}
