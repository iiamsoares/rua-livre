/** Draws the temporary road and exposes its safe horizontal limits. */
export class Track {
  constructor(canvas) {
    this.canvas = canvas;
    this.roadWidth = 620;
    this.bounds = {
      left: (canvas.width - this.roadWidth) / 2 + 16,
      right: (canvas.width + this.roadWidth) / 2 - 16,
    };
  }

  draw(context, distance) {
    const { width, height } = this.canvas;
    context.fillStyle = "#4a7b44";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#36383d";
    context.fillRect((width - this.roadWidth) / 2, 0, this.roadWidth, height);
    context.fillStyle = "#f7f2e8";
    const offset = (distance * 2) % 80;
    for (let y = -80 + offset; y < height; y += 80) context.fillRect(width / 2 - 7, y, 14, 42);
    context.fillStyle = "#f9b233";
    context.fillRect((width - this.roadWidth) / 2, 0, 9, height);
    context.fillRect((width + this.roadWidth) / 2 - 9, 0, 9, height);
  }
}
