export class GameAudio {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.context = null;
    this.engine = null;
    this.engineGain = null;
    this.musicGain = null;
    this.nextBeat = 0;
    this.musicStep = 0;
  }

  unlock() {
    if (!this.enabled) return;
    if (!this.context) {
      const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContextClass) return;
      this.context = new AudioContextClass();
      this.engine = this.context.createOscillator();
      this.engineGain = this.context.createGain();
      this.engine.type = "sawtooth";
      this.engineGain.gain.value = 0;
      this.engine.connect(this.engineGain).connect(this.context.destination);
      this.engine.start();
      this.musicGain = this.context.createGain();
      this.musicGain.gain.value = 0;
      this.musicGain.connect(this.context.destination);
    }
    if (this.context.state === "suspended") this.context.resume();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled) this.unlock();
    if (!enabled && this.engineGain && this.context) this.engineGain.gain.setTargetAtTime(0, this.context.currentTime, 0.03);
    if (!enabled && this.musicGain && this.context) this.musicGain.gain.setTargetAtTime(0, this.context.currentTime, 0.03);
  }

  update(speed, active) {
    if (!this.context || !this.engine || !this.engineGain) return;
    const now = this.context.currentTime;
    const gear = Math.min(5, Math.floor(speed / 36));
    const revs = speed - gear * 32;
    this.engine.frequency.setTargetAtTime(48 + revs * 2.5 + gear * 7, now, 0.035);
    this.engineGain.gain.setTargetAtTime(this.enabled && active ? 0.018 : 0, now, 0.05);
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
