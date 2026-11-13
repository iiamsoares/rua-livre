import test from "node:test";
import assert from "node:assert/strict";
import { GameAudio, engineProfile, engineTelemetry } from "../js/audio.js";

test("cada carro possui uma assinatura de motor e o fallback usa o perfil do UP", () => {
  assert.notEqual(engineProfile("opala").pitch, engineProfile("uno-mille").pitch);
  assert.deepEqual(engineProfile("não-existe"), engineProfile("up"));
});

test("a rotação cai ao trocar de marcha e distribui o som entre três camadas", () => {
  const beforeShift = engineTelemetry(33, "up");
  const afterShift = engineTelemetry(35, "up");
  assert.equal(beforeShift.gear, 1);
  assert.equal(afterShift.gear, 2);
  assert.ok(afterShift.rpm < beforeShift.rpm);
  assert.ok(Math.abs(afterShift.layers.reduce((sum, value) => sum + value, 0) - 1) < 1e-9);
  assert.ok(engineTelemetry(210, "opala", true).pitch > engineTelemetry(210, "opala", false).pitch);
});

test("o carregador prepara três loops e mantém todos inicialmente silenciados", async (context) => {
  const previousFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = previousFetch; });
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(16) });
  const audio = new GameAudio();
  const makeGain = () => ({ gain: { value: 1 }, connect(target) { return target; }, disconnect() {} });
  audio.engineBus = makeGain();
  audio.context = {
    decodeAudioData: async () => ({ duration: 0.5 }),
    createGain: makeGain,
    createBufferSource: () => ({
      loop: false,
      playbackRate: { value: 0 },
      connect(target) { return target; },
      disconnect() {},
      start() {},
      stop() {},
    }),
  };
  assert.equal(await audio.loadEngineSamples(), true);
  assert.equal(audio.samplesReady, true);
  assert.equal(audio.engineLayers.length, 3);
  assert.ok(audio.engineLayers.every((layer) => layer.source.loop && layer.gain.gain.value === 0));
});

test("a trilha original gera notas limitadas e repete a cada quatro compassos", () => {
  const audio = new GameAudio();
  let notes = [];
  audio.scheduleTone = (...note) => notes.push(note);
  audio.scheduleMusic(0, 1);
  const first = notes;
  notes = [];
  audio.scheduleMusic(64, 1);
  assert.deepEqual(notes, first);
  for (let step = 1; step < 64; step++) audio.scheduleMusic(step, 1);
  assert.ok(notes.every(([midi, time, duration, volume]) => midi > 0 && midi < 100 && time === 1 && duration > 0 && duration < 1 && volume <= 0.34));
});

test("pausa e som desligado silenciam motor e música sem agendar notas", () => {
  const audio = new GameAudio();
  const volumes = [];
  const parameter = { setTargetAtTime: (value) => volumes.push(value) };
  audio.context = { currentTime: 5 };
  audio.engine = { frequency: { setTargetAtTime() {} } };
  audio.engineGain = { gain: parameter };
  audio.engineBus = { gain: parameter };
  audio.musicGain = { gain: parameter };
  audio.scheduleMusic = () => assert.fail("Não deve agendar áudio durante pausa ou mute");
  audio.update(190, false);
  audio.enabled = false;
  audio.update(190, true);
  assert.ok(volumes.every((volume) => volume === 0));
  assert.equal(audio.nextBeat, 5);
});
