import test from "node:test";
import assert from "node:assert/strict";
import { GameAudio } from "../js/audio.js";

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
  audio.musicGain = { gain: parameter };
  audio.scheduleMusic = () => assert.fail("Não deve agendar áudio durante pausa ou mute");
  audio.update(190, false);
  audio.enabled = false;
  audio.update(190, true);
  assert.ok(volumes.every((volume) => volume === 0));
  assert.equal(audio.nextBeat, 5);
});
