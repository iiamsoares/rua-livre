const ENGINE_SAMPLE_URLS = Object.freeze([
  "assets/audio/engine/engine-low.wav",
  "assets/audio/engine/engine-mid.wav",
  "assets/audio/engine/engine-high.wav",
]);

export const ENGINE_PROFILES = Object.freeze({
  up: Object.freeze({ pitch: 1.08, volume: 0.52, tone: 1.08 }),
  chevette: Object.freeze({ pitch: 0.84, volume: 0.64, tone: 0.86 }),
  vectra: Object.freeze({ pitch: 0.94, volume: 0.58, tone: 0.96 }),
  "civic-g8": Object.freeze({ pitch: 1.06, volume: 0.54, tone: 1.08 }),
  "gol-quadrado": Object.freeze({ pitch: 0.88, volume: 0.62, tone: 0.9 }),
  jetta: Object.freeze({ pitch: 0.98, volume: 0.58, tone: 1.04 }),
  marea: Object.freeze({ pitch: 0.92, volume: 0.62, tone: 1 }),
  opala: Object.freeze({ pitch: 0.73, volume: 0.7, tone: 0.78 }),
  santana: Object.freeze({ pitch: 0.85, volume: 0.63, tone: 0.88 }),
  "uno-mille": Object.freeze({ pitch: 1.14, volume: 0.5, tone: 1.12 }),
});

const GEAR_STARTS = Object.freeze([0, 34, 70, 108, 147, 185]);

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

export function engineProfile(carId) {
  return ENGINE_PROFILES[carId] || ENGINE_PROFILES.up;
}

export function engineTelemetry(speed, carId = "up", boosting = false) {
  const velocity = Math.max(0, Number(speed) || 0);
  const profile = engineProfile(carId);
  let gear = 0;
  if (velocity >= 4) {
    gear = 1;
    for (let index = 1; index < GEAR_STARTS.length; index++) {
      if (velocity >= GEAR_STARTS[index]) gear = index + 1;
    }
  }

  const start = gear > 0 ? GEAR_STARTS[gear - 1] : 0;
  const end = gear > 0 && gear < GEAR_STARTS.length ? GEAR_STARTS[gear] : 228;
  const rpm = gear === 0 ? 0.14 : clamp((velocity - start) / Math.max(1, end - start), 0.14, 1);
  const low = clamp((0.66 - rpm) / 0.52);
  const mid = clamp(1 - Math.abs(rpm - 0.55) / 0.45);
  const high = clamp((rpm - 0.44) / 0.5);
  const total = Math.max(0.001, low + mid + high);
  const pitch = profile.pitch * (0.92 + rpm * 0.16 + (boosting ? 0.055 : 0));

  return {
    gear,
    rpm,
    pitch,
    volume: profile.volume * (0.86 + rpm * 0.14 + (boosting ? 0.08 : 0)),
    filterFrequency: (1750 + rpm * 4550 + (boosting ? 650 : 0)) * profile.tone,
    layers: [low / total, mid / total, high / total],
  };
}

export class GameAudio {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.context = null;
    this.engine = null;
    this.engineGain = null;
    this.engineBus = null;
    this.engineFilter = null;
    this.engineLayers = [];
    this.engineLoadPromise = null;
    this.samplesReady = false;
    this.carId = "up";
    this.musicGain = null;
    this.nextBeat = 0;
    this.musicStep = 0;
  }

  setCar(carId) {
    this.carId = ENGINE_PROFILES[carId] ? carId : "up";
  }

  unlock() {
    if (!this.enabled) return;
    if (!this.context) {
      const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContextClass) return;
      this.context = new AudioContextClass();
      this.engineBus = this.context.createGain();
      this.engineBus.gain.value = 0;
      if (typeof this.context.createBiquadFilter === "function") {
        this.engineFilter = this.context.createBiquadFilter();
        this.engineFilter.type = "lowpass";
        this.engineFilter.frequency.value = 2400;
        this.engineBus.connect(this.engineFilter).connect(this.context.destination);
      } else {
        this.engineBus.connect(this.context.destination);
      }

      this.engine = this.context.createOscillator();
      this.engineGain = this.context.createGain();
      this.engine.type = "sawtooth";
      this.engineGain.gain.value = 0;
      this.engine.connect(this.engineGain).connect(this.engineBus);
      this.engine.start();

      this.musicGain = this.context.createGain();
      this.musicGain.gain.value = 0;
      this.musicGain.connect(this.context.destination);
      this.engineLoadPromise = this.loadEngineSamples();
    }
    if (this.context.state === "suspended") void this.context.resume();
  }

  async loadEngineSamples() {
    const context = this.context;
    if (!context || typeof fetch !== "function" || typeof context.decodeAudioData !== "function") return false;
    try {
      const buffers = await Promise.all(ENGINE_SAMPLE_URLS.map(async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Falha ao carregar ${url}`);
        return context.decodeAudioData(await response.arrayBuffer());
      }));
      if (this.context !== context || !this.engineBus) return false;
      this.startEngineLayers(buffers);
      this.samplesReady = true;
      return true;
    } catch (error) {
      console.warn("Rua Livre: usando motor sintetizado de segurança.", error);
      return false;
    }
  }

  startEngineLayers(buffers) {
    this.stopEngineLayers();
    this.engineLayers = buffers.map((buffer) => {
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      source.buffer = buffer;
      source.loop = true;
      source.loopStart = 0;
      source.loopEnd = buffer.duration;
      source.playbackRate.value = 1;
      gain.gain.value = 0;
      source.connect(gain).connect(this.engineBus);
      source.start();
      return { source, gain };
    });
  }

  stopEngineLayers() {
    for (const layer of this.engineLayers) {
      try { layer.source.stop(); } catch { /* A fonte já pode ter sido encerrada. */ }
      layer.source.disconnect();
      layer.gain.disconnect();
    }
    this.engineLayers = [];
    this.samplesReady = false;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled) this.unlock();
    if (!enabled && this.context) {
      const now = this.context.currentTime;
      if (this.engineBus) this.engineBus.gain.setTargetAtTime(0, now, 0.03);
      if (this.engineGain) this.engineGain.gain.setTargetAtTime(0, now, 0.03);
      if (this.musicGain) this.musicGain.gain.setTargetAtTime(0, now, 0.03);
    }
  }

  update(speed, active, state = {}) {
    if (!this.context || !this.engine || !this.engineGain) return;
    const now = this.context.currentTime;
    const motorActive = state.engineActive ?? active;
    const telemetry = engineTelemetry(speed, this.carId, Boolean(state.boosting));
    this.engine.frequency.setTargetAtTime(45 + telemetry.rpm * 92 + telemetry.gear * 4, now, 0.035);
    this.engineGain.gain.setTargetAtTime(this.enabled && motorActive && !this.samplesReady ? 0.035 : 0, now, 0.08);
    if (this.engineBus) this.engineBus.gain.setTargetAtTime(this.enabled && motorActive ? telemetry.volume : 0, now, 0.07);
    if (this.engineFilter) this.engineFilter.frequency.setTargetAtTime(telemetry.filterFrequency, now, 0.06);

    this.engineLayers.forEach((layer, index) => {
      const rateCorrection = [1, 0.985, 0.96][index] || 1;
      layer.source.playbackRate.setTargetAtTime(telemetry.pitch * rateCorrection, now, 0.045);
      layer.gain.gain.setTargetAtTime(this.enabled && motorActive ? telemetry.layers[index] * 0.78 : 0, now, 0.055);
    });

    this.musicGain.gain.setTargetAtTime(this.enabled && active ? 0.12 : 0, now, 0.025);
    if (!this.enabled || !active) { this.nextBeat = now; return; }
    if (this.nextBeat < now - 0.15) this.nextBeat = now;
    while (this.nextBeat < now + 0.08) {
      this.scheduleMusic(this.musicStep++, this.nextBeat);
      this.nextBeat += 60 / 136 / 4;
    }
  }

  scheduleTone(midi, time, duration, volume, type = "square") {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    oscillator.connect(gain).connect(this.musicGain);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.01);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  scheduleMusic(step, time) {
    // Original four-bar loop: no samples or melodies taken from commercial games.
    const roots = [40, 36, 43, 38];
    const melody = [12, 7, 10, 14, 7, 12, 15, 10, 19, 14, 12, 7, 10, 15, 14, 7];
    const root = roots[Math.floor(step / 16) % roots.length];
    if (step % 2 === 0) this.scheduleTone(root + (step % 8 === 6 ? 12 : 0), time, 0.17, 0.34, "triangle");
    this.scheduleTone(root + 12 + melody[step % 16], time, 0.085, step % 4 === 0 ? 0.14 : 0.075);
    if (step % 4 === 0) this.scheduleTone(step % 8 === 0 ? 28 : 51, time, 0.06, 0.25, "triangle");
  }

  beep(frequency, duration = 0.08, volume = 0.05, type = "square") {
    if (!this.enabled) return;
    this.unlock();
    if (!this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
    oscillator.stop(this.context.currentTime + duration);
  }
}
