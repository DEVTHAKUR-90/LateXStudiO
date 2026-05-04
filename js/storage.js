// ═══════════════════════════════════════
// LaTeXStudio v4.0 — storage.js
// localStorage: autosave, restore, snapshots, settings persistence
// ═══════════════════════════════════════

const PREFIX = 'latexstudio-';
const KEY_SESSION  = PREFIX + 'session';
const KEY_SNAPS    = PREFIX + 'snapshots';
const KEY_BIB      = PREFIX + 'bibliography';
const KEY_RECENT   = PREFIX + 'recent-exports';

/** Load setting (string) */
export function loadSetting(name, fallback) {
  try {
    const v = localStorage.getItem(PREFIX + name);
    return v === null ? fallback : v;
  } catch { return fallback; }
}

/** Save setting (string) */
export function saveSetting(name, value) {
  try { localStorage.setItem(PREFIX + name, String(value)); } catch {}
}

/** Load JSON */
export function loadJSON(name, fallback) {
  try {
    const v = localStorage.getItem(PREFIX + name);
    return v === null ? fallback : JSON.parse(v);
  } catch { return fallback; }
}

/** Save JSON */
export function saveJSON(name, value) {
  try { localStorage.setItem(PREFIX + name, JSON.stringify(value)); } catch {}
}

/* ──── Session: autosave & restore ──── */

/** Save current document to localStorage */
export function saveSession({ code, images, projectName }) {
  try {
    localStorage.setItem(KEY_SESSION, JSON.stringify({
      code, images, projectName, savedAt: Date.now()
    }));
    return true;
  } catch { return false; }
}

/** Load saved session, or null if absent/invalid */
export function loadSession() {
  try {
    const s = localStorage.getItem(KEY_SESSION);
    if (!s) return null;
    const data = JSON.parse(s);
    if (!data || typeof data.code !== 'string') return null;
    return data;
  } catch { return null; }
}

/** Wipe session */
export function clearSession() {
  try { localStorage.removeItem(KEY_SESSION); } catch {}
}

/* ──── Snapshots ──── */

/** Load all snapshots (sorted newest-first) */
export function loadSnapshots() {
  return loadJSON('snapshots', []);
}

/** Replace snapshot list */
export function saveSnapshots(snaps) {
  try { localStorage.setItem(KEY_SNAPS, JSON.stringify(snaps)); } catch {}
}

/* ──── Bibliography ──── */

/** Load bibliography object */
export function loadBibliography() {
  return loadJSON('bibliography', {});
}

/** Save bibliography object */
export function saveBibliography(bib) {
  try { localStorage.setItem(KEY_BIB, JSON.stringify(bib)); } catch {}
}

/* ──── Recent exports ──── */

export function loadRecentExports() {
  return loadJSON('recent-exports', []);
}
export function saveRecentExports(arr) {
  try { localStorage.setItem(KEY_RECENT, JSON.stringify(arr.slice(0, 5))); } catch {}
}
