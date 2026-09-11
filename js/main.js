import { PAINTS, RACE_RULES, UPGRADE_COSTS, formatMoney, formatTime } from "./config.js";
import { GameAudio } from "./audio.js";
import { InputController } from "./input.js";
import { RaceRenderer, loadGameAssets } from "./renderer.js";
import { carStats, createRace, updateRace } from "./race.js";
import { clearSave, loadSave, writeSave } from "./storage.js";
import { createRioTrack } from "./track.js";

const element = (selector) => document.querySelector(selector);
const elements = (selector) => [...document.querySelectorAll(selector)];
const screens = { title: element("#titleScreen"), garage: element("#garageScreen"), race: element("#raceScreen") };

let save = loadSave();
let activeScreen = "title";
let race = null;
let accumulator = 0;
let messageTimer = 0;
let resultStored = false;

const track = createRioTrack();
const audio = new GameAudio(save.audio);
const assets = await loadGameAssets();
const renderer = new RaceRenderer(element("#gameCanvas"), element("#mapCanvas"), assets);
renderer.setPaint(save.paint);

function showScreen(name) {
  activeScreen = name;
  Object.entries(screens).forEach(([key, screen]) => screen.classList.toggle("active", key === name));
  document.body.dataset.screen = name;
  if (name !== "race") audio.update(0, false);
  if (name === "garage") updateGarage();
  scrollTo({ top: 0, behavior: "smooth" });
}

function ordinal(position) { return `${position}º`; }

function updateProfile() {
  element("#creditsLabel").textContent = formatMoney(save.credits);
  element("#bestLabel").textContent = save.bestPosition == null ? "—" : `${ordinal(save.bestPosition)} · ${formatTime(save.bestTime || 0)}`;
  element("#soundButton").textContent = save.audio ? "SOM ON" : "SOM OFF";
}

function renderPaints() {
  const container = element("#paintOptions");
  container.replaceChildren();
  for (const paint of PAINTS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `paint-button${paint.value === save.paint ? " selected" : ""}`;
    button.style.background = paint.value;
    button.title = paint.name;
    button.setAttribute("aria-label", paint.name);
    button.setAttribute("aria-pressed", paint.value === save.paint ? "true" : "false");
    button.addEventListener("click", () => {
      save.paint = paint.value;
      save = writeSave(save);
      renderer.setPaint(save.paint);
      renderPaints();
      updateGarageCar();
    });
    container.append(button);
  }
}

function updateGarageCar() {
  document.documentElement.style.setProperty("--paint", save.paint);
  element("#garageCar").style.filter = `drop-shadow(0 28px 18px #000e) drop-shadow(0 0 18px ${save.paint}55)`;
  const titleCar = element(".title-car");
  titleCar.style.filter = `drop-shadow(0 28px 20px #000c) drop-shadow(0 0 16px ${save.paint}44)`;
}

function updateGarage() {
  const stats = carStats(save.preparation);
  element("#speedValue").textContent = Math.round(stats.topSpeed);
  element("#accelValue").textContent = Math.round(stats.acceleration);
  element("#speedStat").style.width = `${Math.round(stats.topSpeed / 220 * 100)}%`;
  element("#accelStat").style.width = `${Math.round(stats.acceleration / 65 * 100)}%`;
  element("#upgradeLevel").textContent = `ESTÁGIO ${save.preparation}/3`;
  const button = element("#upgradeButton");
  const maxed = save.preparation >= 3;
  button.disabled = maxed;
  element("#upgradeCost").textContent = maxed ? "MÁXIMO" : formatMoney(UPGRADE_COSTS[save.preparation]);
  button.querySelector("small").textContent = maxed ? "INSTALADO" : "INSTALAR";
  renderPaints();
  updateGarageCar();
  updateProfile();
}

function showMessage(text, duration = 680) {
  const target = element("#raceMessage");
  target.textContent = text;
  target.classList.add("show");
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => target.classList.remove("show"), duration);
}

function startRace() {
  audio.unlock();
  input.clear();
  race = createRace(save, track, Math.floor(performance.now() * 1000));
  resultStored = false;
  accumulator = 0;
  renderer.setPaint(save.paint);
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
  input.clear();
  element("#pauseOverlay").classList.toggle("hidden", !race.paused);
}

function storeResult() {
  if (!race || resultStored) return;
  resultStored = true;
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
    if (event.type === "finish") { audio.beep(event.won ? 880 : 150, 0.32, 0.075); storeResult(); }
  }
}

function updateHud() {
  if (!race) return;
  element("#positionHud").innerHTML = `${race.position}<em>/${RACE_RULES.opponents + 1}</em>`;
  element("#lapHud").textContent = `${race.lap}/${RACE_RULES.laps}`;
  element("#timeHud").textContent = formatTime(race.elapsed);
  element("#speedHud").textContent = Math.round(race.player.speed);
  const gear = race.player.speed < 5 ? "N" : Math.min(6, Math.max(1, Math.ceil(race.player.speed / 35)));
  element("#gearHud").textContent = gear;
  element("#nitroBar").style.width = `${race.player.nitro}%`;
  element("#healthBar").style.width = `${race.player.health}%`;
}

const input = new InputController(() => togglePause());

elements("[data-screen]").forEach((button) => button.addEventListener("click", () => showScreen(button.dataset.screen)));
element("#playButton").addEventListener("click", () => { audio.unlock(); showScreen("garage"); });
element("#raceButton").addEventListener("click", startRace);
element("#pauseButton").addEventListener("click", () => togglePause(true));
element("#resumeButton").addEventListener("click", () => togglePause(false));
element("#restartButton").addEventListener("click", startRace);
element("#againButton").addEventListener("click", startRace);
elements(".quit-button").forEach((button) => button.addEventListener("click", () => { input.clear(); race = null; showScreen("garage"); }));

element("#upgradeButton").addEventListener("click", () => {
  if (save.preparation >= 3) return;
  const cost = UPGRADE_COSTS[save.preparation];
  if (save.credits < cost) {
    element("#upgradeButton").animate([{ transform: "translateX(-5px) skew(-4deg)" }, { transform: "translateX(5px) skew(-4deg)" }, { transform: "skew(-4deg)" }], { duration: 260 });
    return;
  }
  save.credits -= cost;
  save.preparation += 1;
  save = writeSave(save);
  audio.beep(650, 0.14, 0.05);
  updateGarage();
});

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
  renderer.setPaint(save.paint);
  howDialog.close();
  updateGarage();
});

let previousFrame = performance.now();
function frame(now) {
  const delta = Math.min(0.1, Math.max(0, (now - previousFrame) / 1000));
  previousFrame = now;
  if (race && activeScreen === "race") {
    if (!race.paused && !race.finished) {
      accumulator += delta;
      while (accumulator >= RACE_RULES.fixedStep) {
        handleEvents(updateRace(race, input.snapshot(), RACE_RULES.fixedStep));
        accumulator -= RACE_RULES.fixedStep;
        if (race.finished) break;
      }
    }
    renderer.render(race);
    updateHud();
    audio.update(race.player.speed, !race.paused && !race.finished && race.countdown === 0);
  }
  requestAnimationFrame(frame);
}

updateProfile();
updateGarage();
showScreen("title");
requestAnimationFrame(frame);
