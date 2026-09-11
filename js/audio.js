export class GameAudio {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.context = null;
    this.engine = null;
    this.engineGain = null;
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
    }
    if (this.context.state === "suspended") this.context.resume();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled) this.unlock();
    if (!enabled && this.engineGain && this.context) this.engineGain.gain.setTargetAtTime(0, this.context.currentTime, 0.03);
  }

  update(speed, active) {
    if (!this.context || !this.engine || !this.engineGain) return;
    const now = this.context.currentTime;
    this.engine.frequency.setTargetAtTime(52 + speed * 1.28, now, 0.035);
    this.engineGain.gain.setTargetAtTime(this.enabled && active ? 0.024 : 0, now, 0.05);
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
