import { Game } from "./game.js";
import { Input } from "./input.js";
import { Race } from "./race.js";
import { Track } from "./track.js";

const canvas = document.querySelector("#game-canvas");
const game = new Game(canvas, new Input(), new Track(canvas), new Race());
game.start();
