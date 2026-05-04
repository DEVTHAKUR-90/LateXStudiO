// ═══════════════════════════════════════
// LaTeXStudio v4.0 — state.js
// Centralized app state + event bus + reactive updates
// ═══════════════════════════════════════

import { DEFAULT_CODE } from './constants.js';

/**
 * Reactive state container with pub/sub.
 * Modules subscribe to specific keys and get notified on changes.
 */
class State {
  constructor() {
    this.data = {
      // Editor
      code: DEFAULT_CODE,
      cursorPos: 0,
      cursorLine: 1,
      cursorCol: 1,
      multiCursors: [],

      // Project
      projectName: 'My Document',
      images: [],
      bibliography: {}, // { key: { type, fields: {...} } }

      // UI
      activeTab: 'images',           // sidebar tab
      activeGroup: 0,                 // toolbar group
      sidebarExpanded: true,
      showPreview: true,
      previewWidth: 480,
      previewZoom: 100,
      focusMode: false,
      typewriterMode: false,
      showFindBar: false,
      findText: '',
      replaceText: '',
      findIdx: 0,
      findUseRegex: false,
      findCaseSensitive: false,
      showReplace: false,

      // Settings
      theme: 'dark',
      fontSize: 14,
      lineHeight: 1.75,
      wordWrap: false,
      autocompleteEnabled: true,
      showLintBar: true,
      scrollSyncEnabled: true,
      wordGoal: 0,

      // Status
      saveStatus: 'saved',
      lintIssues: [],
      outline: [],

      // Snapshots
      snapshots: [],
      recentExports: [],

      // Modal/dialog flags
      showExportModal: false,
      showTemplatesModal: false,
      showSettingsModal: false,
      showSnapshotsModal: false,
      showShortcutsModal: false,
      showCmdPalette: false,
      showStatsModal: false,
      showDiffModal: false,
      showBibModal: false,
      diffSnapshots: null, // { aId, bId }
      selectedExportFormat: 'zip',
      exportOpts: { graphicsPath: true, autoPackages: true, validate: true, includeReadme: true },

      // Autocomplete
      acItems: [],
      acSel: 0,
      acTrigger: null,
      acPos: { left: 0, top: 0 },
      showAutocomplete: false,
    };
    this.subscribers = {}; // key -> [fn, ...]
    this.allSubscribers = []; // global listeners
  }

  /** Get a value (or full state if no key) */
  get(key) {
    if (key === undefined) return this.data;
    return this.data[key];
  }

  /** Set one or many keys; notify subscribers */
  set(updates) {
    if (typeof updates !== 'object' || updates === null) return;
    const changed = [];
    for (const k of Object.keys(updates)) {
      if (this.data[k] !== updates[k]) {
        this.data[k] = updates[k];
        changed.push(k);
      }
    }
    if (changed.length === 0) return;
    for (const k of changed) {
      const subs = this.subscribers[k];
      if (subs) {
        // Snapshot the list so subscribers can safely .off() themselves during fire
        const snap = subs.slice();
        for (const fn of snap) {
          try { fn(this.data[k], this.data); } catch (e) { console.error(e); }
        }
      }
    }
    // Snapshot for global listeners too
    const globalSnap = this.allSubscribers.slice();
    for (const fn of globalSnap) {
      try { fn(this.data, changed); } catch (e) { console.error(e); }
    }
  }

  /** Subscribe to changes on specific key (or '*' for all) */
  on(key, fn) {
    if (key === '*') { this.allSubscribers.push(fn); return; }
    if (!this.subscribers[key]) this.subscribers[key] = [];
    this.subscribers[key].push(fn);
  }

  /** Unsubscribe */
  off(key, fn) {
    if (key === '*') { this.allSubscribers = this.allSubscribers.filter(f => f !== fn); return; }
    if (this.subscribers[key]) {
      this.subscribers[key] = this.subscribers[key].filter(f => f !== fn);
    }
  }
}

export const state = new State();

/* ─────── Simple event bus ─────── */

class EventBus {
  constructor() { this.listeners = {}; }
  /** Listen to event */
  on(name, fn) {
    if (!this.listeners[name]) this.listeners[name] = [];
    this.listeners[name].push(fn);
  }
  /** Stop listening */
  off(name, fn) {
    if (!this.listeners[name]) return;
    this.listeners[name] = this.listeners[name].filter(f => f !== fn);
  }
  /** Fire event with payload */
  emit(name, payload) {
    const ls = this.listeners[name];
    if (!ls) return;
    // Snapshot to allow listeners to .off() themselves during emit
    const snap = ls.slice();
    for (const fn of snap) {
      try { fn(payload); } catch (e) { console.error('Event handler error:', e); }
    }
  }
}

export const bus = new EventBus();
