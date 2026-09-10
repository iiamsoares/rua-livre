/** Basic placeholder car. Replace the drawing code with a sprite when art is available. */
export class Player {
  constructor(canvasWidth, canvasHeight) {
    this.width = 54;
    this.height = 100;
    this.x = canvasWidth / 2 - this.width / 2;
    this.y = canvasHeight - this.height - 48;
    this.speed = 0;
    this.maxSpeed = 620;
    this.acceleration = 500;
    this.turnSpeed = 360;
  }

  update(delta, input, bounds) {
    if (input.isDown("ArrowUp")) this.speed += this.acceleration * delta;
    else if (input.isDown("ArrowDown")) this.speed -= this.acceleration * delta;
    else this.speed *= 0.985;

    this.speed = Math.max(0, Math.min(this.speed, this.maxSpeed));
    const steering = (input.isDown("ArrowRight") ? 1 : 0) - (input.isDown("ArrowLeft") ? 1 : 0);
    this.x += steering * this.turnSpeed * delta * (0.45 + this.speed / this.maxSpeed);
    this.x = Math.max(bounds.left, Math.min(this.x, bounds.right - this.width));
  }

  draw(context) {
    context.fillStyle = "#e63e35";
    context.fillRect(this.x, this.y, this.width, this.height);
    context.fillStyle = "#ffd166";
    context.fillRect(this.x + 8, this.y + 14, this.width - 16, 25);
    context.fillStyle = "#19202a";
    context.fillRect(this.x - 6, this.y + 18, 6, 24);
    context.fillRect(this.x + this.width, this.y + 18, 6, 24);
    context.fillRect(this.x - 6, this.y + 64, 6, 24);
    context.fillRect(this.x + this.width, this.y + 64, 6, 24);
  }
}
