/** Small wrapper that keeps browser storage access in one place. */
export class Storage {
  get(key, fallback = null) {
    try { return JSON.parse(localStorage.getItem(`rua-livre:${key}`)) ?? fallback; }
    catch { return fallback; }
  }
  set(key, value) { localStorage.setItem(`rua-livre:${key}`, JSON.stringify(value)); }
}
