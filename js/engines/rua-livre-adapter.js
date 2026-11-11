import { RACE_RULES, VIEW, clamp, mod } from "../config.js";
import { curveAt, elevationAt } from "../track.js";
import { createRoad, projectRoad, interpolate } from "./jake-gordon.js";

// The simulation stays in metres and km/h. Only the renderer uses upstream units.
export const ENGINE = Object.freeze({ unitsPerMetre: 100, segmentLength: 200, roadWidth: 2000, depth: 1 / Math.tan(100 * Math.PI / 360) });
const NEAR_HALF = 287;
const PLAYER_Z = ENGINE.depth * ENGINE.roadWidth * VIEW.width / 2 / NEAR_HALF;
const tracks = new WeakMap();

export function engineTrack(track) {
  if (tracks.has(track)) return tracks.get(track);
  const road = createRoad(ENGINE.segmentLength);
  const count = Math.round(track.length * ENGINE.unitsPerMetre / road.segmentLength);
  for (let index = 0; index < count; index++) {
    const z = index * road.segmentLength;
    const nextZ = z + road.segmentLength;
    road.segments.push({
      index,
      p1: { x: 0, y: elevationAt(track, z / ENGINE.unitsPerMetre) * ENGINE.unitsPerMetre, z },
      p2: { x: 0, y: elevationAt(track, nextZ / ENGINE.unitsPerMetre) * ENGINE.unitsPerMetre, z: nextZ },
      curve: curveAt(track, z / ENGINE.unitsPerMetre) * 3,
    });
  }
  road.length = count * road.segmentLength;
  tracks.set(track, road);
  return road;
}

export function roadHorizon(race) {
  const grade = (elevationAt(race.track, race.player.distance + 60) - elevationAt(race.track, race.player.distance)) / 60;
  return VIEW.horizon + grade * 42;
}

export function buildRoadFrame(race) {
  const track = engineTrack(race.track);
  const horizon = roadHorizon(race);
  const playerWorld = race.player.distance * ENGINE.unitsPerMetre;
  const cameraPosition = mod(playerWorld - PLAYER_Z, track.length);
  const fraction = mod(cameraPosition, track.segmentLength);
  const cameraHeight = (VIEW.roadBottom - horizon) * PLAYER_Z / (ENGINE.depth * VIEW.height / 2);
  const viewport = { width: VIEW.width, height: VIEW.height, roadWidth: ENGINE.roadWidth, horizon };
  const camera = {
    x: race.player.lateral * (ENGINE.roadWidth * 0.62 - 34 * ENGINE.roadWidth / NEAR_HALF),
    y: elevationAt(race.track, race.player.distance) * ENGINE.unitsPerMetre + cameraHeight,
    z: cameraPosition,
    depth: ENGINE.depth,
  };
  const count = Math.ceil((PLAYER_Z + RACE_RULES.visibleDistance * ENGINE.unitsPerMetre) / track.segmentLength) + 2;
  const segments = projectRoad(track, camera, viewport, count);
  return { segments, fraction, horizon, playerDistance: race.player.distance, segmentLength: track.segmentLength };
}

export function projectEntity(frame, distance, lane = 0) {
  const delta = clamp(distance, 0, RACE_RULES.visibleDistance);
  const z = frame.fraction + PLAYER_Z + delta * ENGINE.unitsPerMetre;
  const index = Math.floor(z / frame.segmentLength);
  const segment = frame.segments[index];
  const mix = mod(z, frame.segmentLength) / frame.segmentLength;
  const half = interpolate(segment.p1.half, segment.p2.half, mix);
  return {
    x: interpolate(segment.p1.x, segment.p2.x, mix) + lane * half * 0.62,
    y: interpolate(segment.p1.y, segment.p2.y, mix),
    half,
    scale: half / NEAR_HALF,
    clipY: segment.clipY,
  };
}

export function worldDistanceAt(frame, index, mix) {
  return frame.playerDistance + (index * frame.segmentLength + mix * frame.segmentLength - frame.fraction - PLAYER_Z) / ENGINE.unitsPerMetre;
}
