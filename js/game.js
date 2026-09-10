import { Player } from "./player.js";

export const GameState = Object.freeze({ MENU: "menu", RACING: "racing", FINISHED: "finished" });

/** Owns the canvas loop and routes each frame to the current game state. */
export class Game {
  constructor(canvas, input, track, race) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.input = input;
    this.track = track;
    this.race = race;
    this.player = new Player(canvas.width, canvas.height);
    this.state = GameState.MENU;
    this.lastFrame = 0;
    this.frame = this.frame.bind(this);
  }

  start() { requestAnimationFrame(this.frame); }

  frame(timestamp) {
    const delta = Math.min((timestamp - this.lastFrame) / 1000 || 0, 0.05);
    this.lastFrame = timestamp;
    this.update(delta);
    this.draw();
    requestAnimationFrame(this.frame);
  }

  update(delta) {
    if ((this.state === GameState.MENU || this.state === GameState.FINISHED) && this.input.isDown("Enter")) this.beginRace();
    if (this.state !== GameState.RACING) return;

    this.player.update(delta, this.input, this.track.bounds);
    this.race.update(delta, this.player);
    if (this.race.isFinished) this.state = GameState.FINISHED;
  }

  beginRace() {
    this.player = new Player(this.canvas.width, this.canvas.height);
    this.race.start();
    this.state = GameState.RACING;
  }

  draw() {
    this.track.draw(this.context, this.race.distance);
    this.race.draw(this.context);
    this.player.draw(this.context);
    this.drawHud();
  }

  drawHud() {
    const { context: ctx } = this;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px Arial";
    ctx.fillText(`VELOCIDADE ${Math.round(this.player.speed)} km/h`, 28, 42);
    ctx.fillText(`DISTÂNCIA ${Math.round(this.race.distance)} m`, 28, 72);
    if (this.state === GameState.MENU || this.state === GameState.FINISHED) {
      ctx.fillStyle = "#101722cc";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "bold 48px Arial";
      ctx.fillText(this.state === GameState.MENU ? "RUA LIVRE" : "CORRIDA ENCERRADA", this.canvas.width / 2, 310);
      ctx.font = "24px Arial";
      ctx.fillText("Pressione Enter para correr", this.canvas.width / 2, 355);
      ctx.textAlign = "left";
    }
  }
}
