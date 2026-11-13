export function enterFullscreen(documentRef = globalThis.document) {
  const root = documentRef?.documentElement;
  if (!root || documentRef.fullscreenElement || typeof root.requestFullscreen !== "function") return Promise.resolve(false);
  try {
    return Promise.resolve(root.requestFullscreen({ navigationUI: "hide" })).then(() => true, () => false);
  } catch {
    return Promise.resolve(false);
  }
}

export function exitFullscreen(documentRef = globalThis.document) {
  if (!documentRef?.fullscreenElement || typeof documentRef.exitFullscreen !== "function") return Promise.resolve(false);
  try {
    return Promise.resolve(documentRef.exitFullscreen()).then(() => true, () => false);
  } catch {
    return Promise.resolve(false);
  }
}
