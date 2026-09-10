/** A traffic car used by the race controller. */
export class Enemy {
  constructor(x, y, speed = 180) {
    this.x = x;
    this.y = y;
    this.width = 52;
    this.height = 94;
    this.speed = speed;
  }

  update(delta) { this.y += this.speed * delta; }
  draw(context) {
    context.fillStyle = "#5aa6dd";
    context.fillRect(this.x, this.y, this.width, this.height);
    context.fillStyle = "#1c2d3d";
    context.fillRect(this.x + 8, this.y + 15, this.width - 16, 24);
  }
}
