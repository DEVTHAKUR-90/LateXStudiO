// ═══════════════════════════════════════
// LaTeXStudio v4.0 — app.js
// Main entry point: build DOM, wire all modules, handle global keys & events
// ═══════════════════════════════════════

import { state, bus } from './state.js';
import * as storage from './storage.js';
import { initEditor, insertAtCursor, jumpToLine, pushUndo, dismissAutocomplete } from './editor.js';
import { initToolbar } from './toolbar.js';
import { initSidebar } from './sidebar.js';
import { initPreview, zoomIn, zoomOut, zoomReset } from './preview.js';
import { initModals, closeModals } from './modals.js';
import { initUI, toast, ensureFocusIndicator, showRestoreBanner } from './ui.js';
import { celebrateConfetti } from './stats.js';
import { sanitizeName, parseBibtex } from './converter.js';

/* ─── Boot ─── */

let booted = false;

document.addEventListener('DOMContentLoaded', boot);
if (document.readyState !== 'loading') boot();

function boot() {
  if (booted) return;
  booted = true;

  // Restore settings
  hydrateSettings();
  // Restore bibliography & snapshots
  state.set({
    bibliography: storage.loadBibliography(),
    snapshots: storage.loadSnapshots(),
    recentExports: storage.loadRecentExports(),
  });

  // Build DOM
  buildDOM();

  // Initialise modules
  initEditor({
    textarea: document.getElementById('editorTextarea'),
    highlight: document.getElementById('editorHighlight'),
    lineNumbers: document.getElementById('lineNumbers'),
    acPopup: document.getElementById('acPopup'),
    eqTooltip: document.getElementById('eqTooltip'),
  });
  initToolbar({
    tabs: document.getElementById('toolbarTabs'),
    tags: document.getElementById('toolbarTags'),
  });
  initSidebar({
    tabs: document.getElementById('sidebarTabs'),
    content: document.getElementById('sidebarContent'),
  });
  initPreview({
    panel: document.getElementById('previewPanel'),
    body: document.getElementById('previewBody'),
    content: document.getElementById('previewContent'),
    zoomLabel: document.getElementById('previewZoomLabel'),
  });
  initModals({ mount: document.body });
  initUI({
    toasts: document.getElementById('toastContainer'),
    statusbar: document.getElementById('statusbar'),
  });
  ensureFocusIndicator();

  bindTopbar();
  bindGlobalKeys();
  bindBusEvents();
  watchWordGoal();
  setupAutosave();
  setupRestorePrompt();
  setupDragAndDrop();
  setupResizeHandles();
  setupClickOutsideAutocomplete();
}

/* ─── Hydrate persisted settings ─── */

function hydrateSettings() {
  state.set({
    theme: storage.loadSetting('theme', 'dark'),
    fontSize: parseInt(storage.loadSetting('font-size', '14'), 10) || 14,
    lineHeight: storage.loadSetting('line-height', '1.75'),
    wordWrap: storage.loadSetting('word-wrap', '0') === '1',
    autocompleteEnabled: storage.loadSetting('ac', '1') === '1',
    showLintBar: storage.loadSetting('lint-bar', '1') === '1',
    scrollSyncEnabled: storage.loadSetting('scroll-sync', '1') === '1',
    typewriterMode: storage.loadSetting('typewriter', '0') === '1',
    wordGoal: parseInt(storage.loadSetting('word-goal', '0'), 10) || 0,
    previewWidth: Math.min(900, Math.max(280, parseInt(storage.loadSetting('preview-width', '480'), 10) || 480)),
    previewZoom: parseInt(storage.loadSetting('preview-zoom', '100'), 10) || 100,
    showPreview: storage.loadSetting('show-preview', '1') === '1',
  });
  // Persist on changes
  ['theme', 'fontSize', 'lineHeight', 'wordWrap', 'autocompleteEnabled', 'showLintBar',
   'scrollSyncEnabled', 'typewriterMode', 'wordGoal', 'previewWidth', 'previewZoom', 'showPreview'].forEach(k => {
    state.on(k, () => {
      const map = { fontSize: 'font-size', lineHeight: 'line-height', wordWrap: 'word-wrap',
        autocompleteEnabled: 'ac', showLintBar: 'lint-bar', scrollSyncEnabled: 'scroll-sync',
        typewriterMode: 'typewriter', wordGoal: 'word-goal', previewWidth: 'preview-width',
        previewZoom: 'preview-zoom', showPreview: 'show-preview', theme: 'theme' };
      const settingKey = map[k];
      const v = state.get(k);
      storage.saveSetting(settingKey, typeof v === 'boolean' ? (v ? '1' : '0') : v);
    });
  });
  state.on('bibliography', () => storage.saveBibliography(state.get('bibliography')));
  state.on('snapshots',    () => storage.saveSnapshots(state.get('snapshots')));
  state.on('recentExports',() => storage.saveRecentExports(state.get('recentExports')));
}

/* ─── Build DOM skeleton ─── */

function buildDOM() {
  const root = document.getElementById('root');
  root.innerHTML = `
    <div class="app">
      <!-- TOPBAR -->
      <div class="topbar">
        <div class="topbar-logo">L</div>
        <span class="topbar-brand">LaTeX<span class="accent">Studio</span></span>
        <div class="topbar-sep"></div>
        <input class="topbar-project" id="projectName" value="${escapeHtml(state.get('projectName'))}" />
        <div class="topbar-actions" id="topbarActions"></div>
      </div>

      <!-- TOOLBAR -->
      <div class="toolbar">
        <div class="toolbar-tabs" id="toolbarTabs"></div>
        <div class="toolbar-tags" id="toolbarTags"></div>
      </div>

      <!-- BODY -->
      <div class="body">
        <!-- SIDEBAR -->
        <div class="sidebar expanded" id="sidebar">
          <div class="sidebar-tabs" id="sidebarTabs"></div>
          <div class="sidebar-content" id="sidebarContent"></div>
          <button class="sidebar-collapse" id="sidebarCollapse" data-tooltip="Collapse">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        </div>

        <!-- WORKSPACE: editor + preview -->
        <div class="workspace">
          <!-- EDITOR -->
          <div class="editor-wrap">
            <div class="editor-area">
              <div class="line-numbers" id="lineNumbers"></div>
              <div class="editor-stage">
                <pre class="editor-highlight" id="editorHighlight"></pre>
                <textarea class="editor-textarea" id="editorTextarea" spellcheck="false"></textarea>
                <div class="ac-popup" id="acPopup" style="display:none"></div>
                <div class="eq-tooltip" id="eqTooltip" style="display:none"></div>
              </div>
            </div>
            <div class="lint-bar" id="lintBar" style="display:none"></div>
            <div class="find-bar" id="findBar" style="display:none"></div>
          </div>

          <!-- PREVIEW PANEL -->
          <div class="preview-panel" id="previewPanel">
            <div class="preview-resize" id="previewResize"></div>
            <div class="preview-header">
              <span class="preview-title">Live Preview</span>
              <div class="preview-actions">
                <button class="btn-icon" id="syncToggle" data-tooltip="Sync scroll">⇅</button>
                <button class="btn-icon" id="zoomOut" data-tooltip="Zoom out">−</button>
                <span id="previewZoomLabel" style="font-family:var(--font-editor);font-size:11px;color:var(--text-muted);min-width:36px;text-align:center">100%</span>
                <button class="btn-icon" id="zoomIn" data-tooltip="Zoom in">+</button>
                <button class="btn-icon" id="zoomReset" data-tooltip="Reset zoom">⊙</button>
              </div>
            </div>
            <div class="preview-body" id="previewBody">
              <div class="preview-content" id="previewContent"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- STATUSBAR -->
      <div class="statusbar" id="statusbar"></div>
    </div>

    <!-- TOAST CONTAINER -->
    <div class="toast-container" id="toastContainer"></div>
  `;

  // Lint bar update
  state.on('lintIssues', renderLintBar);
  state.on('showLintBar', renderLintBar);
  renderLintBar();

  // Sidebar collapse
  document.getElementById('sidebarCollapse').onclick = () =>
    document.getElementById('sidebar').classList.toggle('expanded');

  // Project name input
  const pn = document.getElementById('projectName');
  pn.addEventListener('input', () => state.set({ projectName: pn.value }));

  // Preview zoom
  document.getElementById('zoomIn').onclick = zoomIn;
  document.getElementById('zoomOut').onclick = zoomOut;
  document.getElementById('zoomReset').onclick = zoomReset;
  document.getElementById('syncToggle').onclick = () => {
    state.set({ scrollSyncEnabled: !state.get('scrollSyncEnabled') });
    document.getElementById('syncToggle').classList.toggle('active', state.get('scrollSyncEnabled'));
  };
  document.getElementById('syncToggle').classList.toggle('active', state.get('scrollSyncEnabled'));
}

function renderLintBar() {
  const bar = document.getElementById('lintBar');
  if (!bar) return;
  if (!state.get('showLintBar')) { bar.style.display = 'none'; return; }
  const issues = state.get('lintIssues') || [];
  if (issues.length === 0) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  let html = '<span style="font-weight:600;color:var(--text-primary)">' +
    issues.filter(i => i.severity === 'error').length + ' error(s), ' +
    issues.filter(i => i.severity === 'warn').length + ' warning(s)</span>';
  html += '<div style="display:flex;gap:4px;flex-wrap:wrap;flex:1">';
  for (const iss of issues.slice(0, 12)) {
    html += `<div class="lint-issue ${iss.severity}" data-line="${iss.line}">
      <span class="ico"></span>
      <span class="ln">L${iss.line}</span>
      <span>${escapeHtml(iss.msg)}</span>
    </div>`;
  }
  html += '</div>';
  html += '<button class="btn-icon" id="lintHide" data-tooltip="Hide">×</button>';
  bar.innerHTML = html;
  bar.querySelectorAll('[data-line]').forEach(el =>
    el.addEventListener('click', () => jumpToLine(parseInt(el.dataset.line, 10))));
  bar.querySelector('#lintHide').onclick = () => state.set({ showLintBar: false });
}

/* ─── Topbar buttons ─── */

function bindTopbar() {
  const a = document.getElementById('topbarActions');
  a.innerHTML = `
    <button class="btn-icon" id="btnStats" data-tooltip="Document statistics">Σ</button>
    <button class="btn-icon" id="btnHistory" data-tooltip="Version history">⌚</button>
    <button class="btn-icon" id="btnTemplates" data-tooltip="Templates">⚌</button>
    <button class="btn-icon" id="btnHelp" data-tooltip="Keyboard shortcuts">?</button>
    <button class="btn-icon" id="btnSettings" data-tooltip="Settings">⚙</button>
    <button class="btn-icon ${state.get('showPreview') ? 'active' : ''}" id="btnPreview" data-tooltip="Toggle preview">◐</button>
    <button class="btn" id="btnExport">⚡ Export</button>
  `;
  a.querySelector('#btnStats').onclick    = () => state.set({ showStatsModal: true });
  a.querySelector('#btnHistory').onclick  = () => state.set({ showSnapshotsModal: true });
  a.querySelector('#btnTemplates').onclick = () => state.set({ showTemplatesModal: true });
  a.querySelector('#btnHelp').onclick     = () => state.set({ showShortcutsModal: true });
  a.querySelector('#btnSettings').onclick = () => state.set({ showSettingsModal: true });
  a.querySelector('#btnPreview').onclick  = () => state.set({ showPreview: !state.get('showPreview') });
  a.querySelector('#btnExport').onclick   = () => state.set({ showExportModal: true });
  state.on('showPreview', () => a.querySelector('#btnPreview').classList.toggle('active', state.get('showPreview')));
}

/* ─── Global key handling ─── */

function bindGlobalKeys() {
  window.addEventListener('keydown', (e) => {
    const isMod = e.ctrlKey || e.metaKey;
    const inInput = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);

    // Esc closes modals, dismiss autocomplete, leave focus mode
    if (e.key === 'Escape') {
      if (state.get('showAutocomplete')) { dismissAutocomplete(); return; }
      // Close any open modal
      if (document.querySelector('.modal-bg')) {
        e.preventDefault(); closeModals(); return;
      }
      if (state.get('focusMode')) {
        state.set({ focusMode: false }); return;
      }
      if (state.get('showFindBar')) {
        state.set({ showFindBar: false });
        document.getElementById('findBar').style.display = 'none';
        return;
      }
    }

    // F11 / Ctrl+Shift+F: focus mode
    if (e.key === 'F11' || (isMod && e.shiftKey && e.key.toLowerCase() === 'f')) {
      e.preventDefault();
      state.set({ focusMode: !state.get('focusMode') });
      return;
    }

    // Ctrl+P: command palette
    if (isMod && !e.shiftKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      state.set({ showCmdPalette: true });
      return;
    }
    // Ctrl+Shift+E: export
    if (isMod && e.shiftKey && e.key.toLowerCase() === 'e') {
      e.preventDefault(); state.set({ showExportModal: true }); return;
    }
    // Ctrl+Shift+D: stats
    if (isMod && e.shiftKey && e.key.toLowerCase() === 'd') {
      e.preventDefault(); state.set({ showStatsModal: true }); return;
    }
    // Ctrl+S: save
    if (isMod && !e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault(); manualSave(); return;
    }
    // Ctrl+Shift+S: snapshot
    if (isMod && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault(); createSnapshot(); return;
    }
    // Ctrl+F: find
    if (isMod && !e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault(); openFind(false); return;
    }
    // Ctrl+H: replace
    if (isMod && !e.shiftKey && e.key.toLowerCase() === 'h') {
      e.preventDefault(); openFind(true); return;
    }
    // F3 / Shift+F3: next/prev match
    if (e.key === 'F3') {
      e.preventDefault();
      bus.emit(e.shiftKey ? 'find:prev' : 'find:next');
      return;
    }
    // Ctrl+= / Ctrl+- / Ctrl+0: zoom
    if (isMod && (e.key === '=' || e.key === '+')) { e.preventDefault(); zoomIn(); return; }
    if (isMod && e.key === '-') { e.preventDefault(); zoomOut(); return; }
    if (isMod && e.key === '0') { e.preventDefault(); zoomReset(); return; }
    // ? in non-input: shortcuts
    if (e.key === '?' && !inInput) {
      e.preventDefault(); state.set({ showShortcutsModal: true }); return;
    }
  });
}

/* ─── Bus events ─── */

function bindBusEvents() {
  bus.on('toast', (p) => toast(p.msg, p.type, p.timeout));
  bus.on('images:upload', handleImageUpload);
  bus.on('snapshot:create', createSnapshot);
  bus.on('snapshot:restore', restoreSnapshot);
  bus.on('snapshot:delete', deleteSnapshot);
  bus.on('snapshot:diff', (id) => {
    state.set({ diffSnapshots: { aId: id, bId: '__current__' }, showDiffModal: true });
  });
  bus.on('cite:insert', (key) => insertAtCursor('\\cite{' + key + '}'));
  bus.on('bib:add', () => state.set({ showBibModal: true }));
  bus.on('bib:edit', (key) => state.set({ showBibModal: true }));
  bus.on('bib:export', exportBib);
  bus.on('bib:import', handleBibImport);
  bus.on('bib:import-file', handleBibImport);
  bus.on('find:next', () => findNav(1));
  bus.on('find:prev', () => findNav(-1));
}

/* ─── Word goal celebration ─── */

let _goalHit = false;
let _goalTimer = null;
function watchWordGoal() {
  // Debounce - only check 600ms after typing stops
  state.on('code', () => {
    if (_goalTimer) clearTimeout(_goalTimer);
    _goalTimer = setTimeout(checkGoal, 600);
  });
  state.on('wordGoal', () => { _goalHit = false; checkGoal(); });
}
function checkGoal() {
  const goal = state.get('wordGoal');
  if (!goal || goal <= 0) { _goalHit = false; return; }
  const code = state.get('code') || '';
  const words = (code.replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?(?:\{[^}]*\})*/g, ' ').match(/\b[\w'-]+\b/g) || []).length;
  if (words >= goal && !_goalHit) {
    _goalHit = true;
    celebrateConfetti();
    toast(`🎉 Word goal reached: ${goal.toLocaleString()} words!`, 'success', 4500);
  } else if (words < goal) {
    _goalHit = false;
  }
}

function createSnapshot(label) {
  const snaps = state.get('snapshots') || [];
  const code = state.get('code');
  const snap = {
    id: 'snap_' + Date.now(),
    label: label || ('Snapshot ' + new Date().toLocaleString()),
    code,
    timestamp: Date.now(),
  };
  state.set({ snapshots: [snap, ...snaps].slice(0, 30) });
  toast('Snapshot created', 'success');
}

function restoreSnapshot(id) {
  const snaps = state.get('snapshots') || [];
  const s = snaps.find(x => x.id === id);
  if (!s) return;
  if (!confirm('Restore "' + s.label + '"? Current document will be replaced.')) return;
  pushUndo();
  state.set({ code: s.code });
  toast('Restored: ' + s.label, 'success');
}

function deleteSnapshot(id) {
  state.set({ snapshots: (state.get('snapshots') || []).filter(s => s.id !== id) });
}

/* ─── Save / autosave ─── */

let autosaveTimer = null;
let _firstUnsavedAt = 0;
function setupAutosave() {
  state.on('code', () => {
    state.set({ saveStatus: 'unsaved' });
    if (!_firstUnsavedAt) _firstUnsavedAt = Date.now();
    if (autosaveTimer) clearTimeout(autosaveTimer);
    // If user has been typing continuously for 8s without a pause, force-save anyway.
    const force = Date.now() - _firstUnsavedAt > 8000;
    autosaveTimer = setTimeout(doAutosave, force ? 50 : 1500);
  });
  state.on('images', doAutosave);
  state.on('projectName', doAutosave);
}
function doAutosave() {
  state.set({ saveStatus: 'saving' });
  const ok = storage.saveSession({
    code: state.get('code'),
    images: state.get('images'),
    projectName: state.get('projectName'),
  });
  state.set({ saveStatus: ok ? 'saved' : 'error' });
  _firstUnsavedAt = 0;
}
function manualSave() {
  doAutosave();
  toast('Saved', 'success', 1500);
}

/* ─── Restore prompt ─── */

function setupRestorePrompt() {
  const session = storage.loadSession();
  if (!session) return;
  const cur = state.get('code');
  if (session.code === cur) return;
  if (!session.savedAt) return;
  // Show banner
  showRestoreBanner(session.savedAt,
    () => {
      pushUndo();
      state.set({
        code: session.code,
        images: session.images || [],
        projectName: session.projectName || 'My Document',
      });
      toast('Session restored', 'success');
    },
    () => storage.clearSession()
  );
}

/* ─── Image upload ─── */

function handleImageUpload(files) {
  if (!files) return;
  const arr = Array.from(files);
  let loaded = 0;
  arr.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target.result;
      const m = result.match(/^data:image\/([^;]+);base64,(.+)$/);
      if (!m) return;
      const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const name = sanitizeName(baseName, ext).replace('.' + ext, '');
      const images = state.get('images').slice();
      images.push({
        id: 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name, ext, data: m[2], size: file.size,
      });
      state.set({ images });
      loaded++;
      if (loaded === arr.filter(f => f.type.startsWith('image/')).length) {
        toast(loaded + ' image' + (loaded === 1 ? '' : 's') + ' uploaded', 'success');
      }
    };
    reader.readAsDataURL(file);
  });
}

function setupDragAndDrop() {
  let counter = 0;
  document.addEventListener('dragenter', (e) => {
    if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) {
      counter++;
    }
  });
  document.addEventListener('dragleave', () => { counter = Math.max(0, counter - 1); });
  document.addEventListener('dragover', (e) => { e.preventDefault(); });
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    counter = 0;
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files);
    }
  });
  // Paste
  document.addEventListener('paste', (e) => {
    if (!e.clipboardData) return;
    const items = e.clipboardData.items;
    const files = [];
    for (const it of items) {
      if (it.type && it.type.startsWith('image/')) {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) handleImageUpload(files);
  });
}

/* ─── Bib import/export ─── */

function exportBib() {
  const bib = state.get('bibliography') || {};
  let out = '';
  for (const key of Object.keys(bib)) {
    const e = bib[key];
    out += '@' + (e.type || 'misc') + '{' + key + ',\n';
    for (const f of Object.keys(e.fields || {})) {
      const v = e.fields[f];
      if (!v) continue;
      out += '  ' + f + ' = {' + String(v).replace(/\}/g, '\\}') + '},\n';
    }
    out += '}\n\n';
  }
  const blob = new Blob([out], { type: 'application/x-bibtex' });
  window.saveAs(blob, 'bibliography.bib');
}

function handleBibImport(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = (e) => {
    const parsed = parseBibtex(e.target.result);
    const bib = { ...state.get('bibliography') };
    for (const item of parsed) bib[item.key] = item;
    state.set({ bibliography: bib });
    toast('Imported ' + parsed.length + ' bib entries', 'success');
  };
  r.readAsText(file);
}

/* ─── Find/Replace bar ─── */

function openFind(showReplace) {
  state.set({ showFindBar: true, showReplace });
  const bar = document.getElementById('findBar');
  bar.style.display = 'flex';
  renderFindBar();
  setTimeout(() => {
    const inp = bar.querySelector('#findInput');
    if (inp) inp.focus();
  }, 0);
}

function renderFindBar() {
  const bar = document.getElementById('findBar');
  const showRep = state.get('showReplace');
  bar.innerHTML = `
    <input class="input" id="findInput" placeholder="Find…" value="${escapeHtml(state.get('findText') || '')}" style="width:200px"/>
    <button class="btn-icon" id="findRegex" data-tooltip="Regex" style="font-family:var(--font-editor);font-size:11px;font-weight:700">.*</button>
    <button class="btn-icon" id="findCase" data-tooltip="Case sensitive" style="font-family:var(--font-editor);font-size:11px;font-weight:700">Aa</button>
    <span class="find-count" id="findCount"></span>
    <button class="btn-icon" id="findPrev" data-tooltip="Previous (Shift+Enter)">◀</button>
    <button class="btn-icon" id="findNext" data-tooltip="Next (Enter)">▶</button>
    ${showRep ? `<input class="input" id="replaceInput" placeholder="Replace…" value="${escapeHtml(state.get('replaceText') || '')}" style="width:160px"/>
      <button class="btn-ghost" id="findReplace">Replace</button>
      <button class="btn-ghost" id="findReplaceAll">All</button>` : `<button class="btn-ghost" id="findShowRep">Replace</button>`}
    <button class="btn-icon" id="findClose" data-tooltip="Close (Esc)">×</button>`;

  bar.querySelector('#findRegex').classList.toggle('active', state.get('findUseRegex'));
  bar.querySelector('#findCase').classList.toggle('active', state.get('findCaseSensitive'));

  const inpEl = bar.querySelector('#findInput');
  inpEl.addEventListener('input', () => { state.set({ findText: inpEl.value, findIdx: 0 }); updateFindCount(); });
  inpEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); findNav(e.shiftKey ? -1 : 1); }
    else if (e.key === 'Escape') { e.preventDefault(); closeFind(); }
  });
  bar.querySelector('#findRegex').onclick = () => { state.set({ findUseRegex: !state.get('findUseRegex') }); renderFindBar(); };
  bar.querySelector('#findCase').onclick  = () => { state.set({ findCaseSensitive: !state.get('findCaseSensitive') }); renderFindBar(); };
  bar.querySelector('#findPrev').onclick  = () => findNav(-1);
  bar.querySelector('#findNext').onclick  = () => findNav(1);
  bar.querySelector('#findClose').onclick = closeFind;
  if (showRep) {
    const repEl = bar.querySelector('#replaceInput');
    repEl.addEventListener('input', () => state.set({ replaceText: repEl.value }));
    bar.querySelector('#findReplace').onclick = doReplaceCurrent;
    bar.querySelector('#findReplaceAll').onclick = doReplaceAll;
  } else {
    bar.querySelector('#findShowRep').onclick = () => { state.set({ showReplace: true }); renderFindBar(); };
  }
  updateFindCount();
}

function getMatches() {
  const code = state.get('code');
  const t = state.get('findText');
  if (!t) return { matches: [], error: null };
  const list = [];
  if (state.get('findUseRegex')) {
    try {
      const re = new RegExp(t, state.get('findCaseSensitive') ? 'g' : 'gi');
      let m;
      while ((m = re.exec(code)) !== null) {
        list.push({ start: m.index, length: m[0].length });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    } catch (e) {
      return { matches: [], error: e.message };
    }
  } else {
    const cs = state.get('findCaseSensitive');
    const haystack = cs ? code : code.toLowerCase();
    const needle = cs ? t : t.toLowerCase();
    let i = 0;
    while ((i = haystack.indexOf(needle, i)) !== -1) {
      list.push({ start: i, length: needle.length });
      i += needle.length || 1;
    }
  }
  return { matches: list, error: null };
}

function updateFindCount() {
  const bar = document.getElementById('findBar');
  const c = bar?.querySelector('#findCount');
  const inp = bar?.querySelector('#findInput');
  if (!c) return;
  const result = getMatches();
  if (result.error) {
    c.textContent = 'invalid regex';
    c.style.color = 'var(--color-error)';
    if (inp) {
      inp.style.borderColor = 'var(--color-error)';
      inp.title = result.error;
    }
    return;
  }
  // Reset error styling
  if (inp) { inp.style.borderColor = ''; inp.title = ''; }
  c.style.color = '';
  const matches = result.matches;
  c.textContent = matches.length === 0
    ? (state.get('findText') ? '0/0' : '')
    : (state.get('findIdx') + 1) + '/' + matches.length;
}

function findNav(dir) {
  const { matches } = getMatches();
  if (matches.length === 0) return;
  let idx = state.get('findIdx') + dir;
  idx = ((idx % matches.length) + matches.length) % matches.length;
  state.set({ findIdx: idx });
  const m = matches[idx];
  const ed = document.getElementById('editorTextarea');
  ed.focus();
  ed.setSelectionRange(m.start, m.start + m.length);
  // Scroll to it
  const before = state.get('code').slice(0, m.start).split('\n');
  const lh = parseFloat(state.get('lineHeight')) * state.get('fontSize');
  const containerH = ed.clientHeight;
  ed.scrollTop = Math.max(0, (before.length - containerH / lh / 2) * lh);
  updateFindCount();
}

function doReplaceCurrent() {
  const { matches } = getMatches();
  if (matches.length === 0) return;
  const idx = Math.min(state.get('findIdx'), matches.length - 1);
  const m = matches[idx];
  const code = state.get('code');
  const replacement = state.get('replaceText') || '';
  pushUndo();
  state.set({ code: code.slice(0, m.start) + replacement + code.slice(m.start + m.length) });
  setTimeout(() => findNav(0), 50);
}

function doReplaceAll() {
  const t = state.get('findText');
  if (!t) return;
  const code = state.get('code');
  const replacement = state.get('replaceText') || '';
  pushUndo();
  let result, re;
  const flags = state.get('findCaseSensitive') ? 'g' : 'gi';
  try {
    re = state.get('findUseRegex')
      ? new RegExp(t, flags)
      : new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
  } catch { return; }
  const count = (code.match(re) || []).length;
  if (count === 0) { toast('No matches', 'info'); return; }
  result = code.replace(re, replacement);
  state.set({ code: result });
  toast('Replaced ' + count + ' occurrence' + (count === 1 ? '' : 's'), 'success');
}

function closeFind() {
  state.set({ showFindBar: false });
  document.getElementById('findBar').style.display = 'none';
  document.getElementById('editorTextarea').focus();
}

/* ─── Resize handles ─── */

function setupResizeHandles() {
  const handle = document.getElementById('previewResize');
  if (!handle) return;
  let dragging = false;
  let startX = 0, startW = 0;
  handle.addEventListener('mousedown', (e) => {
    if (!state.get('showPreview')) return;
    dragging = true;
    startX = e.clientX;
    startW = state.get('previewWidth');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = startX - e.clientX;
    const w = Math.min(900, Math.max(280, startW + dx));
    state.set({ previewWidth: w });
    document.getElementById('previewPanel').style.width = w + 'px';
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
  // Double-click handle: toggle
  handle.addEventListener('dblclick', () => {
    state.set({ showPreview: !state.get('showPreview') });
  });
}

function setupClickOutsideAutocomplete() {
  document.addEventListener('mousedown', (e) => {
    const ac = document.getElementById('acPopup');
    const ed = document.getElementById('editorTextarea');
    if (!ac || !state.get('showAutocomplete')) return;
    if (ac.contains(e.target) || ed === e.target) return;
    dismissAutocomplete();
  });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
