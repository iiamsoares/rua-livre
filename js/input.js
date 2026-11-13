const CONTROL_KEYS = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "shift"]);

export class InputController {
  constructor(onPause) {
    this.keys = new Set();
    this.onPause = onPause;
    this.onKeyDown = (event) => {
      if (this.enabled === false) return;
      const key = event.key.toLowerCase();
      if (CONTROL_KEYS.has(key) || (key === "enter" && this.multiplayer)) event.preventDefault();
      if ((key === "p" || key === "escape") && !event.repeat) this.onPause();
      this.keys.add(key);
    };
    this.onKeyUp = (event) => this.keys.delete(event.key.toLowerCase());
    this.onBlur = () => this.keys.clear();
    addEventListener("keydown", this.onKeyDown, { passive: false });
    addEventListener("keyup", this.onKeyUp);
    addEventListener("blur", this.onBlur);
  }

  snapshot(player = 0) {
    if (player) {
      const [up, down, left, right, nitro] = player === 1 ? ["w", "s", "a", "d", " "] : ["arrowup", "arrowdown", "arrowleft", "arrowright", "enter"];
      return { accelerate: this.keys.has(up), brake: this.keys.has(down), steer: Number(this.keys.has(right)) - Number(this.keys.has(left)), nitro: this.keys.has(nitro) };
    }
    return {
      accelerate: this.keys.has("arrowup") || this.keys.has("w"),
      brake: this.keys.has("arrowdown") || this.keys.has("s"),
      steer: (this.keys.has("arrowright") || this.keys.has("d") ? 1 : 0) - (this.keys.has("arrowleft") || this.keys.has("a") ? 1 : 0),
      nitro: this.keys.has(" ") || this.keys.has("shift"),
    };
  }

  clear() { this.keys.clear(); }
}
