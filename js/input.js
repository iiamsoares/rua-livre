/** Tracks keys held by the player without coupling them to a specific scene. */
export class Input {
  constructor(target = window) {
    this.keys = new Set();
    target.addEventListener("keydown", (event) => this.onKeyDown(event));
    target.addEventListener("keyup", (event) => this.keys.delete(event.code));
  }

  onKeyDown(event) {
    const gameKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"];
    if (gameKeys.includes(event.code)) event.preventDefault();
    this.keys.add(event.code);
  }

  isDown(key) { return this.keys.has(key); }
}
