(() => {
  const slides = [...document.querySelectorAll(".slide")];
  const progress = document.querySelector("#progressBar");
  const currentLabel = document.querySelector("#currentSlide");
  const totalLabel = document.querySelector("#totalSlides");
  const previousButton = document.querySelector("#previousButton");
  const nextButton = document.querySelector("#nextButton");
  const fullscreenButton = document.querySelector("#fullscreenButton");
  const overview = document.querySelector("#overview");
  let current = Math.max(0, Math.min(slides.length - 1, Number(location.hash.replace("#slide-", "")) - 1 || 0));
  let touchStart = null;

  const format = (value) => String(value).padStart(2, "0");

  function render(next, updateHash = true) {
    current = Math.max(0, Math.min(slides.length - 1, next));
    slides.forEach((slide, index) => {
      slide.classList.toggle("is-active", index === current);
      slide.classList.toggle("was-active", index < current);
      slide.setAttribute("aria-hidden", index === current ? "false" : "true");
    });
    currentLabel.textContent = format(current + 1);
    totalLabel.textContent = format(slides.length);
    progress.style.width = `${((current + 1) / slides.length) * 100}%`;
    previousButton.disabled = current === 0;
    nextButton.disabled = current === slides.length - 1;
    document.title = `${slides[current].dataset.title} | Rua Livre`;
    if (updateHash) history.replaceState(null, "", `#slide-${current + 1}`);
  }

  function closeOverview() {
    overview.classList.remove("is-open");
    overview.setAttribute("aria-hidden", "true");
  }

  function toggleOverview() {
    const opening = !overview.classList.contains("is-open");
    overview.classList.toggle("is-open", opening);
    overview.setAttribute("aria-hidden", String(!opening));
    if (opening) overview.querySelector("button")?.focus();
  }

  slides.forEach((slide, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<span>${format(index + 1)}</span><strong>${slide.dataset.title}</strong>`;
    button.addEventListener("click", () => { closeOverview(); render(index); });
    overview.append(button);
  });

  previousButton.addEventListener("click", () => render(current - 1));
  nextButton.addEventListener("click", () => render(current + 1));
  fullscreenButton.addEventListener("click", async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  });

  addEventListener("hashchange", () => render(Number(location.hash.replace("#slide-", "")) - 1 || 0, false));
  addEventListener("keydown", (event) => {
    if (overview.classList.contains("is-open") && event.key === "Escape") { closeOverview(); return; }
    if (["ArrowRight", "PageDown", " "].includes(event.key)) { event.preventDefault(); render(current + 1); }
    if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); render(current - 1); }
    if (event.key === "Home") render(0);
    if (event.key === "End") render(slides.length - 1);
    if (event.key.toLowerCase() === "f") fullscreenButton.click();
    if (event.key.toLowerCase() === "o") toggleOverview();
  });

  addEventListener("touchstart", (event) => { touchStart = event.changedTouches[0].clientX; }, { passive: true });
  addEventListener("touchend", (event) => {
    if (touchStart == null) return;
    const delta = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(delta) > 50) render(current + (delta < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });

  render(current, false);
})();
