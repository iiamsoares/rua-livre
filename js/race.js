import { overlaps } from "./collision.js";
import { Enemy } from "./enemy.js";

/** Controls race progress, traffic and finish conditions. */
export class Race {
  constructor() {
    this.goalDistance = 1500;
    this.distance = 0;
    this.enemies = [];
    this.isFinished = false;
  }

  start() {
    this.distance = 0;
    this.isFinished = false;
    this.enemies = [new Enemy(540, -130), new Enemy(690, -430, 240)];
  }

  update(delta, player) {
    this.distance += player.speed * delta * 0.08;
    this.enemies.forEach((enemy) => enemy.update(delta));
    this.enemies = this.enemies.filter((enemy) => enemy.y < 760);
    if (this.enemies.length < 2) this.enemies.push(new Enemy(500 + Math.random() * 260, -110, 180 + Math.random() * 150));
    if (this.enemies.some((enemy) => overlaps(player, enemy))) player.speed *= 0.92;
    if (this.distance >= this.goalDistance) this.isFinished = true;
  }

  draw(context) { this.enemies.forEach((enemy) => enemy.draw(context)); }
}
