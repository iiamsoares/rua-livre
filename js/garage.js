import { PLAYER_CARS, UPGRADE_COSTS, formatMoney } from "./config.js";
import { carStats } from "./race.js";
import { buyPreparation, buyVehicle, canStart, createSelection, ownsCar, selectedIds, selectVehicle, vehiclePrice } from "./garage-model.js";
import { carPreviewMarkup } from "./car-preview.js";

const carById = (id) => PLAYER_CARS.find((car) => car.id === id) || PLAYER_CARS[0];
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const button = (action, text, disabled = false, kind = "secondary") => `<button type="button" class="${kind}" data-action="${action}" ${disabled ? "disabled" : ""}>${text}</button>`;

export class GarageUI {
  constructor({ getSave, setSave, navigate, start, onPurchase = () => {} }) {
    Object.assign(this, { getSave, setSave, navigate, start, onPurchase });
    this.reset();
    for (const name of ["mode", "garage", "preparation"]) {
      document.querySelector(`#${name}Screen`).addEventListener("click", (event) => {
        const target = event.target.closest("button[data-action]");
        if (target && !target.disabled) this.act(target.dataset.action);
      });
    }
    document.addEventListener("keydown", (event) => {
      if (document.querySelector("dialog[open]") || !["mode", "garage", "preparation"].includes(this.screen)) return;
      if (event.key === "Escape") { event.preventDefault(); this.pending = null; this.navigate(this.screen === "mode" ? "title" : this.screen === "garage" ? "mode" : "garage"); }
      if (this.screen === "garage" && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault(); this.cycle(event.key === "ArrowLeft" ? -1 : 1);
      }
      const focusedAction = event.target.closest("button")?.dataset.action;
      if (this.screen === "garage" && event.key === "Enter" && !event.repeat && (!focusedAction || focusedAction.startsWith("car:") || ["prev", "next"].includes(focusedAction))) {
        event.preventDefault(); this.act("select");
      }
    });
  }

  reset() { this.state = createSelection(this.getSave()); this.pending = null; this.notice = ""; }
  cycle(direction) {
    const index = PLAYER_CARS.findIndex((car) => car.id === this.state.previewId);
    this.state.previewId = PLAYER_CARS[(index + direction + PLAYER_CARS.length) % PLAYER_CARS.length].id;
    this.notice = "";
    this.render("garage");
  }
  act(action) {
    const save = this.getSave();
    if (action === "solo" || action === "versus") {
      this.state.mode = action; this.state.player = 0; this.state.previewId = save.carId;
      this.navigate("garage"); return;
    }
    if (action.startsWith("car:")) { this.state.previewId = action.slice(4); this.notice = ""; }
    else if (action.startsWith("player:")) {
      this.state.player = Number(action.slice(7)); this.state.previewId = selectedIds(save)[this.state.player]; this.pending = null; this.notice = "";
    } else if (action === "prev" || action === "next") { this.cycle(action === "prev" ? -1 : 1); return; }
    else if (action === "select") {
      const next = selectVehicle(save, this.state);
      if (next !== save) { this.setSave(next); this.notice = `${carById(this.state.previewId).name} selecionado para J${this.state.player + 1}.`; }
    } else if (action === "buy") {
      const next = buyVehicle(save, this.state.previewId);
      if (next !== save) { this.setSave(next); this.onPurchase(); }
    } else if (action === "prepare") {
      if (!ownsCar(save, carById(this.state.previewId))) return;
      this.setSave(selectVehicle(save, this.state)); this.pending = null; this.navigate("preparation"); return;
    } else if (action === "upgrade") { this.pending = save.preparation; }
    else if (action === "confirm-upgrade") {
      const expected = this.pending;
      this.pending = null;
      const next = buyPreparation(save, expected);
      if (next !== save) { this.setSave(next); this.onPurchase(); this.notice = `Estágio ${next.preparation}/3 instalado. Preparação compartilhada atualizada.`; }
    } else if (action === "cancel-upgrade") this.pending = null;
    else if (action === "start") { if (canStart(save, this.state.mode)) this.start(); return; }
    else if (["title", "mode", "garage"].includes(action)) { this.pending = null; this.navigate(action); return; }
    this.render(this.screen);
  }

  players(save) {
    if (this.state.mode !== "versus") return '<div class="pilot-tabs"><span>J1 · CORRIDA SOLO</span></div>';
    return `<div class="pilot-tabs" aria-label="Jogador em edição">${selectedIds(save).map((id, index) => `<button type="button" data-action="player:${index}" aria-pressed="${this.state.player === index}"><b>J${index + 1}</b> ${escapeHtml(carById(id).name)}<small>${index === 0 ? "WASD + ESPAÇO" : "SETAS + ENTER"}</small></button>`).join("")}</div>`;
  }
  scene(car) {
    return `<div class="workshop-scene">${carPreviewMarkup(car, "workshop-vehicle", `${car.name} na plataforma da oficina`)}<div class="scene-caption"><strong>${escapeHtml(car.name)}</strong><span>${escapeHtml(car.description)}</span></div>${this.screen === "garage" ? `<div class="vehicle-arrows">${button("prev", "❮", false)}${button("next", "❯", false)}</div>` : ""}</div>`;
  }
  render(screen) {
    this.screen = screen;
    if (!["mode", "garage", "preparation"].includes(screen)) return;
    const target = document.querySelector(`#${screen}Screen`);
    const focus = target.contains(document.activeElement) ? document.activeElement.dataset.action : null;
    const save = this.getSave();
    if (screen === "mode") {
      target.innerHTML = `<div class="workshop-heading"><div><p class="eyebrow">RUA LIVRE / 01</p><h2>Escolha sua corrida</h2></div>${button("title", "← MENU")}</div><div class="mode-cards"><button data-action="solo" class="mode-card"><span class="mode-number">01 / SOLO</span><span class="mode-art">1P</span><strong>CORRIDA SOLO</strong><span>Você, três rivais e a orla inteira.<br>Ganhe créditos e conquiste recordes.</span><small>WASD OU SETAS · ESPAÇO / SHIFT NITRO</small><b>ESCOLHER CARRO →</b></button><button data-action="versus" class="mode-card"><span class="mode-number">02 / VERSUS LOCAL</span><span class="mode-art">1P <i>×</i> 2P</span><strong>RACHA EM DUPLA</strong><span>Dois pilotos. Uma pista. Tela dividida.<br>Amistoso no mesmo teclado.</span><small>J1: WASD + ESPAÇO · J2: SETAS + ENTER</small><b>ESCOLHER OS CARROS →</b></button></div><p class="workshop-hint">P / ESC pausa a corrida · Tab navega · Enter confirma</p>`;
      return;
    }
    const car = carById(screen === "garage" ? this.state.previewId : selectedIds(save)[this.state.player]);
    const stats = carStats(save.preparation);
    const owned = ownsCar(save, car);
    const selected = selectedIds(save)[this.state.player] === car.id;
    const price = vehiclePrice(car);
    const maxed = save.preparation === 3;
    const cost = UPGRADE_COSTS[save.preparation];
    const next = carStats(Math.min(3, save.preparation + 1));
    target.innerHTML = `<div class="workshop-heading"><div><p class="eyebrow">${this.state.mode === "versus" ? "VERSUS LOCAL" : "CORRIDA SOLO"} / ${screen === "garage" ? "02" : "03"}</p><h2>${screen === "garage" ? "Garagem" : "Preparação"} <span>/ J${this.state.player + 1}</span></h2></div>${button(screen === "garage" ? "mode" : "garage", screen === "garage" ? "← MODOS" : "← GARAGEM")}</div>${this.players(save)}<div class="workshop-grid">${this.scene(car)}<aside class="workshop-panel">${screen === "garage" ? `
      <p class="panel-kicker">ESCOLHA SEU CARRO</p><div class="vehicle-catalog">${PLAYER_CARS.map((item) => `<button data-action="car:${item.id}" aria-pressed="${item.id === car.id}" aria-label="Ver ${escapeHtml(item.name)}">${carPreviewMarkup(item, "vehicle-thumbnail", "")}<strong>${escapeHtml(item.name)}</strong><small>${ownsCar(save, item) ? "DISPONÍVEL" : formatMoney(vehiclePrice(item))}</small></button>`).join("")}</div>
      <div class="garage-stats">${[["VELOCIDADE", stats.topSpeed, "km/h", 220], ["ACELERAÇÃO", stats.acceleration, "km/h/s", 90], ["CONTROLE", stats.steering, "", 1.5]].map(([label, value, unit, max]) => `<div><span>${label}</span><meter min="0" max="${max}" value="${value}" aria-label="${label}"></meter><b>${Number(value.toFixed(2))} <small>${unit}</small></b></div>`).join("")}</div>
      <div class="vehicle-details"><h3>${escapeHtml(car.name)}</h3><p>${escapeHtml(car.description)}</p><div><b>${price ? formatMoney(price) : "INCLUÍDO · R$ 0"}</b><span>${owned ? "LIBERADO" : "BLOQUEADO"}</span></div><p>Estágio instalado: <strong>${save.preparation}/3</strong> · pacote compartilhado</p></div>
      ${!owned ? button("buy", `COMPRAR · ${formatMoney(price)}`, save.credits < price, "primary") : button("select", selected ? "✓ SELECIONADO" : `SELECIONAR PARA J${this.state.player + 1}`, selected, "primary")}
      ${button("prepare", this.state.mode === "versus" ? "PREPARAR A DUPLA →" : "PREPARAR →", !owned)}
      <p class="workshop-note">${!owned && save.credits < price ? "Créditos insuficientes para este veículo." : "Os modelos atuais são incluídos. O desempenho usa a preparação compartilhada."}</p>
      ` : `
      <p class="panel-kicker">PACOTE DE PREPARAÇÃO</p><h3>Estágio ${save.preparation}/3</h3>
      <ol class="stage-steps">${[0, 1, 2, 3].map((stage) => `<li class="${stage === save.preparation ? "current" : ""}"><b>${stage}/3</b><small>${stage === 0 ? "INDISPONÍVEL" : stage <= save.preparation ? "INSTALADO" : "A INSTALAR"}</small></li>`).join("")}</ol>
      <p class="workshop-note">O jogo começa no estágio 1. O pacote vale para todos os carros e ambos os jogadores.</p>
      <div class="upgrade-categories"><div><b>MOTOR</b><span>Velocidade e aceleração do pacote</span></div><div><b>PNEUS</b><span>Controle incluído no pacote</span></div><div><b>ACERTO</b><span>Ajuste individual: implementação futura</span></div></div>
      <table class="upgrade-comparison"><caption>${maxed ? "Desempenho instalado" : "Comparativo antes / depois"}</caption><thead><tr><th>Atributo</th><th>Atual</th><th>${maxed ? "Máximo" : "Próximo"}</th></tr></thead><tbody><tr><th>Velocidade (km/h)</th><td>${stats.topSpeed}</td><td>${next.topSpeed}</td></tr><tr><th>Aceleração (km/h/s)</th><td>${stats.acceleration}</td><td>${next.acceleration}</td></tr><tr><th>Controle</th><td>${stats.steering.toFixed(3)}</td><td>${next.steering.toFixed(3)}</td></tr></tbody></table>
      ${this.pending !== null ? `<div class="purchase-confirm" role="group" aria-label="Confirmar preparação"><p>Instalar estágio ${this.pending + 1} por ${formatMoney(UPGRADE_COSTS[this.pending])}?</p>${button("confirm-upgrade", "CONFIRMAR COMPRA", false, "primary")}${button("cancel-upgrade", "CANCELAR")}</div>` : button("upgrade", maxed ? "PREPARAÇÃO MÁXIMA" : `INSTALAR · ${formatMoney(cost)}`, maxed || save.credits < cost, "primary")}
      <p class="workshop-note">${maxed ? "Todas as melhorias disponíveis estão instaladas." : save.credits < cost ? `Créditos insuficientes. Faltam ${formatMoney(cost - save.credits)}.` : "Compra única por estágio. Veja o comparativo antes de confirmar."}</p>
      ${button("start", "⚑ INICIAR CORRIDA", !canStart(save, this.state.mode), "primary race-start")}
      `}<p class="workshop-balance">CRÉDITOS DISPONÍVEIS <strong>${formatMoney(save.credits)}</strong></p><p class="garage-notice" role="status">${escapeHtml(this.notice)}</p></aside></div><p class="workshop-hint">${screen === "garage" ? "← → ALTERNAR CARROS · ENTER SELECIONAR · " : ""}TAB NAVEGAR · ESC VOLTAR</p>`;
    target.querySelector('[data-action="prev"]')?.setAttribute("aria-label", "Carro anterior");
    target.querySelector('[data-action="next"]')?.setAttribute("aria-label", "Próximo carro");
    if (focus) {
      const fallback = this.pending !== null ? "confirm-upgrade" : screen === "garage" ? "prepare" : "start";
      const controls = [...target.querySelectorAll("[data-action]")];
      (controls.find((node) => node.dataset.action === focus && !node.disabled) || controls.find((node) => node.dataset.action === fallback))?.focus({ preventScroll: true });
    }
  }
}
