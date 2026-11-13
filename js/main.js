import { PLAYER_CARS, RACE_RULES, formatMoney, formatTime } from "./config.js";
import { GameAudio } from "./audio.js";
import { InputController } from "./input.js";
import { RaceRenderer, loadGameAssets } from "./renderer.js";
import { createRace, updateRace } from "./race.js";
import { clearSave, loadSave, writeSave } from "./storage.js";
import { createBrasiliaTrack } from "./track.js";
import { PixelSpeedometer } from "./speedometer.js";
import { createVersus, updateVersus } from "./versus.js";
import { GarageUI } from "./garage.js";
import { canStart, selectedIds } from "./garage-model.js";

const element = (selector) => document.querySelector(selector);
const elements = (selector) => [...document.querySelectorAll(selector)];
const screens = Object.fromEntries(["title", "mode", "garage", "preparation", "race"].map((name) => [name, element(`#${name}Screen`)]));

let save = loadSave();
let activeScreen = "title";
let race = null;
let accumulator = 0;
let messageTimer = 0;
let resultStored = false;
let versus = null;
const garage = new GarageUI({ getSave: () => save, setSave: (next) => { save = writeSave(next); updateProfile(); }, navigate: (screen) => showScreen(screen), start: () => startRace(), onPurchase: () => audio.beep(650, 0.14, 0.05) });

const track = createBrasiliaTrack();
const audio = new GameAudio(save.audio);
const assets = await loadGameAssets(track.environmentId);
const shell = element(".race-shell");
const firstView = document.createElement("div");
firstView.className = "race-view";
for (const child of [...shell.children].slice(0, 5)) firstView.append(child);
shell.prepend(firstView);
const secondView = firstView.cloneNode(true);
secondView.querySelectorAll("[id]").forEach((node) => { node.id += "Two"; });
secondView.classList.add("second-view");
firstView.after(secondView);
for (const [index, view] of [firstView, secondView].entries()) {
  const label = document.createElement("span");
  label.className = "player-label";
  label.textContent = `JOGADOR ${index + 1}`;
  view.append(label);
}
const renderer = new RaceRenderer(element("#gameCanvas"), element("#mapCanvas"), assets);
const speedometer = new PixelSpeedometer(element("#speedGauge"));
const rendererTwo = new RaceRenderer(element("#gameCanvasTwo"), element("#mapCanvasTwo"), assets);
const speedometerTwo = new PixelSpeedometer(element("#speedGaugeTwo"));
renderer.setPlayerCar(save.carId);

function showScreen(name) {
  activeScreen = name;
  Object.entries(screens).forEach(([key, screen]) => screen.classList.toggle("active", key === name));
  document.body.dataset.screen = name;
  if (name !== "race") audio.update(0, false);
  input.clear();
  input.enabled = name === "race";
  garage.render(name);
  const heading = screens[name].querySelector("h1, h2");
  if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  scrollTo({ top: 0, behavior: "smooth" });
}

function ordinal(position) { return `${position}º`; }

function updateProfile() {
  const car = PLAYER_CARS.find((item) => item.id === save.carId) || PLAYER_CARS[0];
  element(".title-car").src = car.frontAsset;
  element(".title-car").alt = `${car.name}, o carro do jogador`;
  element("#creditsLabel").textContent = formatMoney(save.credits);
  element("#bestLabel").textContent = save.bestPosition == null ? "—" : `${ordinal(save.bestPosition)} · ${formatTime(save.bestTime || 0)}`;
  element("#soundButton").textContent = save.audio ? "SOM ON" : "SOM OFF";
}

function showMessage(text, duration = 680) {
  const target = element("#raceMessage");
  target.textContent = text;
  target.classList.add("show");
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => target.classList.remove("show"), duration);
}

function startRace() {
  if (!canStart(save, garage.state.mode)) { showScreen("garage"); return; }
  const localMode = garage.state.mode === "versus";
  audio.unlock();
  input.clear();
  race = createRace(save, track, Math.floor(performance.now() * 1000));
  versus = localMode ? createVersus(save, track, race.seed, selectedIds(save)) : null;
  if (versus) race = versus.races[0];
  shell.classList.toggle("split", localMode);
  input.multiplayer = localMode;
  renderer.spriteHeightScale = localMode ? 2 : 1;
  rendererTwo.spriteHeightScale = 2;
  element(".controls-strip").textContent = localMode ? "J1: WASD · ESPAÇO NITRO     |     J2: SETAS · ENTER NITRO     |     P / ESC PAUSAR" : "↑ / W ACELERAR · ↓ / S FREAR · ← → / A D VIRAR · ESPAÇO / SHIFT NITRO · P / ESC PAUSAR";
  rendererTwo.setPlayerCar(save.playerTwoCarId);
  resultStored = false;
  accumulator = 0;
  renderer.setPlayerCar(save.carId);
  element("#pauseOverlay").classList.add("hidden");
  element("#resultOverlay").classList.add("hidden");
  showScreen("race");
  showMessage("3", 820);
  renderer.render(race);
  updateHud();
}

function togglePause(force) {
  if (!race || race.finished || activeScreen !== "race") return;
  race.paused = typeof force === "boolean" ? force : !race.paused;
  if (versus) versus.races[1].paused = race.paused;
  input.clear();
  element("#pauseOverlay").classList.toggle("hidden", !race.paused);
}

function storeResult() {
  if (!race || resultStored) return;
  resultStored = true;
  if (versus) {
    element("#resultTitle").textContent = versus.winner === null ? "EMPATE!" : `JOGADOR ${versus.winner + 1} VENCEU!`;
    element("#resultPosition").textContent = versus.winner === null ? "=" : `J${versus.winner + 1}`;
    element("#resultTime").textContent = formatTime(race.elapsed);
    element("#resultReward").textContent = "AMISTOSO";
    element("#resultClean").textContent = "—";
    element("#resultOverlay").classList.remove("hidden");
    return;
  }
  save.credits += race.reward;
  if (race.finishReason === "complete") {
    if (save.bestPosition == null || race.position < save.bestPosition) save.bestPosition = race.position;
    if (save.bestTime == null || race.elapsed < save.bestTime) save.bestTime = race.elapsed;
  }
  save = writeSave(save);
  updateProfile();
  element("#resultTitle").textContent = race.won ? "PÓDIO DA NOITE!" : race.finishReason === "wrecked" ? "FIM DE CORRIDA" : "QUASE LÁ";
  element("#resultPosition").textContent = race.finishReason === "wrecked" ? "DNF" : ordinal(race.position);
  element("#resultTime").textContent = formatTime(race.elapsed);
  element("#resultReward").textContent = formatMoney(race.reward - race.cleanBonus);
  element("#resultClean").textContent = formatMoney(race.cleanBonus);
  element("#resultOverlay").classList.remove("hidden");
}

function handleEvents(events) {
  for (const event of events) {
    if (event.type === "countdown") { showMessage(String(event.value)); audio.beep(330 + event.value * 60); }
    if (event.type === "go") { showMessage("VAI!", 900); audio.beep(690, 0.2, 0.07); }
    if (event.type === "lap") { showMessage(`VOLTA ${event.value}`, 1100); audio.beep(760, 0.17, 0.06); }
    if (event.type === "pickup") { showMessage("NITRO +", 520); audio.beep(590, 0.08, 0.045); }
    if (event.type === "collision") audio.beep(84, 0.2, 0.085, "sawtooth");
    if (event.type === "barrier") audio.beep(110, 0.12, 0.06, "sawtooth");
    if (event.type === "pothole") { showMessage(`BURACO! −${event.damage}`, 650); audio.beep(65, 0.14, 0.07, "sawtooth"); }
    if (event.type === "finish") { audio.beep(event.won ? 880 : 150, 0.32, 0.075); storeResult(); }
  }
}

function updateHud(current = race, suffix = "", gauge = speedometer) {
  if (!current) return;
  element(`#positionHud${suffix}`).innerHTML = `${current.position}<em>/${RACE_RULES.opponents + (versus ? 2 : 1)}</em>`;
  element(`#lapHud${suffix}`).textContent = `${current.lap}/${RACE_RULES.laps}`;
  element(`#timeHud${suffix}`).textContent = formatTime(current.elapsed);
  element(`#speedHud${suffix}`).textContent = Math.round(current.player.speed);
  const gear = current.player.speed < 5 ? "N" : Math.min(6, Math.max(1, Math.ceil(current.player.speed / 35)));
  element(`#gearHud${suffix}`).textContent = gear;
  gauge.draw(current.player.speed, gear, current.player.boosting);
  element(`#nitroBar${suffix}`).style.width = `${current.player.nitro}%`;
  element(`#healthBar${suffix}`).style.width = `${current.player.health}%`;
}

const input = new InputController(() => togglePause());

elements("[data-screen]").forEach((button) => button.addEventListener("click", () => showScreen(button.dataset.screen)));
element("#playButton").addEventListener("click", () => { audio.unlock(); showScreen("mode"); });
element("#pauseButton").addEventListener("click", () => togglePause(true));
element("#resumeButton").addEventListener("click", () => togglePause(false));
element("#restartButton").addEventListener("click", startRace);
element("#againButton").addEventListener("click", startRace);
elements(".quit-button").forEach((button) => button.addEventListener("click", () => { input.clear(); race = null; showScreen("garage"); }));


element("#soundButton").addEventListener("click", () => {
  save.audio = !save.audio;
  save = writeSave(save);
  audio.setEnabled(save.audio);
  updateProfile();
});

const howDialog = element("#howDialog");
element("#howButton").addEventListener("click", () => howDialog.showModal());
element("#closeHowButton").addEventListener("click", () => howDialog.close());
element("#resetSaveButton").addEventListener("click", () => {
  if (!confirm("Apagar créditos, preparação e recordes do Rua Livre?")) return;
  save = clearSave();
  audio.setEnabled(save.audio);
  renderer.setPlayerCar(save.carId);
  howDialog.close();
  garage.reset();
  garage.render(activeScreen);
});

let previousFrame = performance.now();
function frame(now) {
  const delta = Math.min(0.1, Math.max(0, (now - previousFrame) / 1000));
  previousFrame = now;
  if (race && activeScreen === "race") {
    if (!race.paused && !race.finished) {
      accumulator += delta;
      while (accumulator >= RACE_RULES.fixedStep) {
        if (versus) {
          const events = updateVersus(versus, [input.snapshot(1), input.snapshot(2)], RACE_RULES.fixedStep);
          events.forEach((list, index) => handleEvents(list.filter((event) => event.type !== "finish" && (index === 0 || !["countdown", "go"].includes(event.type)))));
          if (versus.finished) storeResult();
        } else handleEvents(updateRace(race, input.snapshot(), RACE_RULES.fixedStep));
        accumulator -= RACE_RULES.fixedStep;
        if (race.finished) break;
      }
    }
    renderer.render(race);
    if (versus) {
      rendererTwo.render(versus.races[1]);
      updateHud(versus.races[1], "Two", speedometerTwo);
    }
    updateHud();
    audio.update(race.player.speed, !race.paused && !race.finished && race.countdown === 0);
  }
  requestAnimationFrame(frame);
}

updateProfile();
showScreen("title");
requestAnimationFrame(frame);
