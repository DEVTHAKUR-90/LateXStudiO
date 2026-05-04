// ═══════════════════════════════════════
// LaTeXStudio v4.0 — modals.js
// All modals: Export, Templates, Settings, Snapshots/History, Stats,
// Diff viewer, Bibliography editor, Command palette, Shortcuts.
// ═══════════════════════════════════════

import { state, bus } from './state.js';
import { TEMPLATES, SHORTCUTS } from './constants.js';
import { renderStatsPanel } from './stats.js';
import { lineDiff, fuzzyScore } from './converter.js';
import { runExport, buildExportChecklist } from './exporter.js';

let mountEl;

/** Initialise modals - caller passes the mount root */
export function initModals(refs) {
  mountEl = refs.mount;
  // Listen to toggles
  state.on('showExportModal',    () => state.get('showExportModal')    && openExport());
  state.on('showTemplatesModal', () => state.get('showTemplatesModal') && openTemplates());
  state.on('showSettingsModal',  () => state.get('showSettingsModal')  && openSettings());
  state.on('showSnapshotsModal', () => state.get('showSnapshotsModal') && openSnapshots());
  state.on('showShortcutsModal', () => state.get('showShortcutsModal') && openShortcuts());
  state.on('showCmdPalette',     () => state.get('showCmdPalette')     && openCmdPalette());
  state.on('showStatsModal',     () => state.get('showStatsModal')     && openStats());
  state.on('showDiffModal',      () => state.get('showDiffModal')      && openDiff());
  state.on('showBibModal',       () => state.get('showBibModal')       && openBibEditor());
}

/* ─── Generic modal helpers ─── */

function bg() {
  if (!mountEl) mountEl = document.body;
  // Close any existing modal first
  closeAll();
  const el = document.createElement('div');
  el.className = 'modal-bg';
  el.addEventListener('click', (e) => { if (e.target === el) closeAll(); });
  mountEl.appendChild(el);
  return el;
}

function closeAll() {
  document.querySelectorAll('.modal-bg').forEach(el => {
    if (typeof el._cleanup === 'function') {
      try { el._cleanup(); } catch {}
    }
    el.remove();
  });
  state.set({
    showExportModal: false, showTemplatesModal: false, showSettingsModal: false,
    showSnapshotsModal: false, showShortcutsModal: false, showCmdPalette: false,
    showStatsModal: false, showDiffModal: false, showBibModal: false,
  });
}

export function closeModals() { closeAll(); }

function modalShell(title, sub, contentHTML, footHTML) {
  const html = `
    <div class="modal-head">
      <div>
        <div class="modal-title">${escapeHtml(title)}</div>
        ${sub ? `<div class="modal-sub">${escapeHtml(sub)}</div>` : ''}
      </div>
      <button class="modal-close" id="mClose">${closeIcon()}</button>
    </div>
    <div class="modal-body">${contentHTML}</div>
    ${footHTML ? `<div class="modal-foot">${footHTML}</div>` : ''}`;
  return html;
}

function closeIcon() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function imgMime(ext) {
  const e = String(ext || '').toLowerCase();
  if (e === 'jpg' || e === 'jpe' || e === 'jpeg') return 'image/jpeg';
  if (e === 'svg') return 'image/svg+xml';
  return 'image/' + (e || 'png');
}

function timeAgoShort(t) {
  if (!t) return '';
  const sec = Math.round((Date.now() - t) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return Math.floor(sec / 60) + ' min ago';
  if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
  return Math.floor(sec / 86400) + 'd ago';
}

/** Render a modal body fn safely - catches errors and returns a friendly fallback. */
function safeRenderBody(fn) {
  try { return fn(); }
  catch (e) {
    console.error('Modal render failed:', e);
    return `<div style="padding:20px;color:var(--color-error);font-size:13px">
      <strong>Render error:</strong> ${escapeHtml(e.message)}<br>
      <small style="color:var(--text-muted)">Check the browser console for details.</small>
    </div>`;
  }
}

/* ─── Export modal ─── */

const EXPORT_FORMATS = [
  { id: 'zip',  icon: '📦', name: 'Overleaf ZIP', desc: 'Compile-ready package', ext: '.zip', rec: true },
  { id: 'pdf',  icon: '📄', name: 'PDF (Print)',  desc: 'Browser → Save as PDF', ext: '.pdf' },
  { id: 'tex',  icon: '{}', name: 'LaTeX Source', desc: 'Plain .tex file',       ext: '.tex' },
  { id: 'html', icon: '🌐', name: 'HTML',         desc: 'Standalone web page',    ext: '.html' },
  { id: 'md',   icon: '↓',  name: 'Markdown',     desc: 'GitHub-flavored',        ext: '.md' },
  { id: 'txt',  icon: '¶',  name: 'Plain Text',   desc: 'Stripped to prose',      ext: '.txt' },
  { id: 'workspace', icon: '⬇', name: 'Workspace', desc: 'Code + images + bib',    ext: '.json' },
  { id: 'clip', icon: '⎘',  name: 'Clipboard',    desc: 'Copy LaTeX',             ext: 'paste' },
];

function openExport() {
  const el = bg();
  const m = document.createElement('div');
  m.className = 'modal';
  m.style.width = '600px';
  m.style.maxHeight = '90vh';
  m.onclick = (e) => e.stopPropagation();

  const renderBody = () => {
    const sel = state.get('selectedExportFormat') || 'zip';
    const code = state.get('code');
    const images = state.get('images') || [];
    let html = '<div class="export-grid">';
    for (const f of EXPORT_FORMATS) {
      html += `<div class="export-card${sel === f.id ? ' selected' : ''}${f.rec ? ' rec' : ''}" data-fmt="${f.id}">
        ${f.rec ? '<span class="badge amber recommended-badge">RECOMMENDED</span>' : ''}
        ${sel === f.id ? '<span class="check">✓</span>' : ''}
        <span class="icon">${f.icon}</span>
        <div class="name">${f.name}</div>
        <div class="desc">${f.desc}</div>
      </div>`;
    }
    html += '</div>';
    // Show extra config for ZIP
    if (sel === 'zip') {
      const checks = buildExportChecklist(code, images);
      html += '<div class="checklist">';
      for (const c of checks) {
        const ico = c.severity === 'ok' ? '✓' : c.severity === 'error' ? '✕' : c.severity === 'warn' ? '!' : 'ℹ';
        html += `<div class="checklist-row ${c.severity}"><span class="ico">${ico}</span><span>${escapeHtml(c.message)}</span></div>`;
      }
      html += '</div>';
      const opts = state.get('exportOpts') || { graphicsPath: true, autoPackages: true, validate: true, includeReadme: true };
      html += '<div class="option-list">' +
        optRow('graphicsPath', opts.graphicsPath, 'Auto-inject \\graphicspath{{images/}}') +
        optRow('autoPackages', opts.autoPackages, 'Auto-add missing packages (graphicx, float, …)') +
        optRow('validate',     opts.validate,     'Validate environments before export') +
        optRow('includeReadme',opts.includeReadme,'Include README.txt + .latexmkrc') +
        '</div>';
      // Image strip
      if (images.length > 0) {
        html += '<div class="image-preview-strip">';
        for (const im of images.slice(0, 8)) {
          html += `<img class="image-preview-thumb" src="data:${imgMime(im.ext)};base64,${im.data}" alt="${escapeHtml(im.name)}" />`;
        }
        if (images.length > 8) html += `<div style="display:grid;place-items:center;font-size:10px;color:var(--text-muted)">+${images.length - 8} more</div>`;
        html += '</div>';
      }
      html += `<div class="export-tip">
        <div class="export-tip-label">Quick upload tip</div>
        Drop this ZIP into Overleaf → New Project → Upload Project. It compiles immediately.
      </div>`;
    }
    // Recent exports (always shown if any exist)
    const recent = state.get('recentExports') || [];
    if (recent.length > 0) {
      html += '<div class="recent-exports">';
      html += '<div class="section-title" style="margin-top:0">Recent exports</div>';
      for (const r of recent.slice(0, 3)) {
        const ago = timeAgoShort(r.timestamp);
        const fmt = EXPORT_FORMATS.find(f => f.id === r.format);
        html += `<div class="recent-export-item">
          <span><span class="badge">${escapeHtml(fmt ? fmt.name : r.format)}</span> · ${escapeHtml(ago)}</span>
        </div>`;
      }
      html += '</div>';
    }
    return html;
  };

  function optRow(id, on, label) {
    return `<label class="option-row"><input type="checkbox" data-opt="${id}"${on ? ' checked' : ''}/> ${escapeHtml(label)}</label>`;
  }

  const sel0 = state.get('selectedExportFormat') || 'zip';
  m.innerHTML = modalShell(
    'Export Document',
    'Choose your output format',
    safeRenderBody(renderBody),
    `<button class="btn-ghost" id="mCancel">Cancel</button>
     <button class="btn" id="mGo" style="min-width:160px">Export</button>`
  );

  el.appendChild(m);

  function rerender() {
    const body = m.querySelector('.modal-body');
    body.innerHTML = safeRenderBody(renderBody);
    bindCards();
  }
  function bindCards() {
    m.querySelectorAll('[data-fmt]').forEach(card =>
      card.addEventListener('click', () => {
        state.set({ selectedExportFormat: card.dataset.fmt });
        rerender();
      }));
    m.querySelectorAll('[data-opt]').forEach(cb =>
      cb.addEventListener('change', () => {
        const opts = { ...(state.get('exportOpts') || { graphicsPath: true, autoPackages: true, validate: true, includeReadme: true }) };
        opts[cb.dataset.opt] = cb.checked;
        state.set({ exportOpts: opts });
      }));
  }
  bindCards();

  m.querySelector('#mClose').onclick = closeAll;
  m.querySelector('#mCancel').onclick = closeAll;
  m.querySelector('#mGo').onclick = async () => {
    const sel = state.get('selectedExportFormat') || 'zip';
    try {
      m.querySelector('#mGo').disabled = true;
      m.querySelector('#mGo').textContent = 'Exporting…';
      await runExport(sel, state.get('exportOpts'));
      closeAll();
      bus.emit('toast', { msg: 'Export complete', type: 'success' });
      // Add to recent exports
      const rec = (state.get('recentExports') || []).slice();
      rec.unshift({ format: sel, timestamp: Date.now() });
      state.set({ recentExports: rec.slice(0, 5) });
    } catch (e) {
      m.querySelector('#mGo').disabled = false;
      m.querySelector('#mGo').textContent = 'Export';
      bus.emit('toast', { msg: 'Export failed: ' + e.message, type: 'error' });
    }
  };
}

/* ─── Templates modal ─── */

function openTemplates() {
  const el = bg();
  const m = document.createElement('div');
  m.className = 'modal';
  m.style.width = '640px';
  m.onclick = (e) => e.stopPropagation();
  let html = '<div class="template-grid">';
  for (const t of TEMPLATES) {
    html += `<div class="template-card" data-tpl="${escapeHtml(t.name)}">
      <div class="icon">${escapeHtml(t.icon || '📄')}</div>
      <div class="name">${escapeHtml(t.name)}</div>
      <div class="desc">${escapeHtml(t.desc || '')}</div>
    </div>`;
  }
  html += '</div>';
  m.innerHTML = modalShell(
    'Templates',
    'Start from a pre-built document structure',
    html
  );
  el.appendChild(m);
  m.querySelector('#mClose').onclick = closeAll;
  m.querySelectorAll('[data-tpl]').forEach(card =>
    card.addEventListener('click', () => {
      const tpl = TEMPLATES.find(t => t.name === card.dataset.tpl);
      if (tpl) {
        if (!confirm('Replace current document with template "' + tpl.name + '"?')) return;
        state.set({ code: tpl.code, projectName: tpl.name });
        closeAll();
        bus.emit('toast', { msg: 'Loaded template: ' + tpl.name, type: 'success' });
      }
    }));
}

/* ─── Settings modal ─── */

function openSettings() {
  const el = bg();
  const m = document.createElement('div');
  m.className = 'modal';
  m.style.width = '440px';
  m.onclick = (e) => e.stopPropagation();
  const themes = [
    { id: 'dark',      name: 'Dark Editorial' },
    { id: 'light',     name: 'Light Paper' },
    { id: 'solarized', name: 'Solarized Dark' },
    { id: 'ocean',     name: 'Midnight Ocean' },
    { id: 'parchment', name: 'Warm Parchment' },
  ];
  const cur = state.get('theme');
  let body = '<div class="section-title">Theme</div><div class="theme-swatches">';
  for (const t of themes) {
    body += `<button class="theme-swatch${t.id === cur ? ' active' : ''}" data-theme-id="${t.id}" data-tooltip="${t.name}"></button>`;
  }
  body += '</div>';

  body += '<div class="section-title">Editor</div>';
  body += `<div class="settings-row">
    <div class="settings-label">Font Size — ${state.get('fontSize')}px</div>
    <input type="range" min="11" max="22" value="${state.get('fontSize')}" id="setFs" style="width:100%;accent-color:var(--accent)" />
  </div>`;
  body += `<div class="settings-row">
    <div class="settings-label">Line Height</div>
    <select class="select" id="setLh">
      ${[1.4, 1.6, 1.75, 2.0].map(v => `<option value="${v}"${state.get('lineHeight') == v ? ' selected' : ''}>${v}</option>`).join('')}
    </select>
  </div>`;
  body += toggleRow('setWrap',   'Word wrap',           state.get('wordWrap'));
  body += toggleRow('setAc',     'Autocomplete',        state.get('autocompleteEnabled'));
  body += toggleRow('setLint',   'Show lint bar',       state.get('showLintBar'));
  body += toggleRow('setSync',   'Scroll sync',         state.get('scrollSyncEnabled'));
  body += toggleRow('setTw',     'Typewriter mode',     state.get('typewriterMode'));

  body += '<div class="section-title">Project</div>';
  body += `<div class="settings-row">
    <div class="settings-label">Word goal</div>
    <input class="input" type="number" min="0" max="200000" step="100" id="setGoal" value="${state.get('wordGoal') || 0}" placeholder="0 to disable" />
  </div>`;

  m.innerHTML = modalShell('Settings', null, body);
  el.appendChild(m);

  m.querySelector('#mClose').onclick = closeAll;
  m.querySelectorAll('[data-theme-id]').forEach(b =>
    b.addEventListener('click', () => {
      m.querySelectorAll('[data-theme-id]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      state.set({ theme: b.dataset.themeId });
    }));
  m.querySelector('#setFs').oninput = (e) => state.set({ fontSize: parseInt(e.target.value, 10) });
  m.querySelector('#setLh').onchange = (e) => state.set({ lineHeight: e.target.value });
  m.querySelector('#setWrap').onclick = () => state.set({ wordWrap: !state.get('wordWrap') });
  m.querySelector('#setAc').onclick = () => state.set({ autocompleteEnabled: !state.get('autocompleteEnabled') });
  m.querySelector('#setLint').onclick = () => state.set({ showLintBar: !state.get('showLintBar') });
  m.querySelector('#setSync').onclick = () => state.set({ scrollSyncEnabled: !state.get('scrollSyncEnabled') });
  m.querySelector('#setTw').onclick = () => state.set({ typewriterMode: !state.get('typewriterMode') });
  m.querySelector('#setGoal').oninput = (e) => state.set({ wordGoal: parseInt(e.target.value, 10) || 0 });

  // Re-render toggles when state changes (so click feedback is visible)
  const settingSubs = [];
  for (const id of ['setWrap', 'setAc', 'setLint', 'setSync', 'setTw']) {
    const k = ({setWrap:'wordWrap',setAc:'autocompleteEnabled',setLint:'showLintBar',setSync:'scrollSyncEnabled',setTw:'typewriterMode'})[id];
    const fn = () => {
      const t = m.querySelector('#' + id);
      if (t) t.classList.toggle('on', !!state.get(k));
    };
    state.on(k, fn);
    settingSubs.push([k, fn]);
  }
  el._cleanup = () => settingSubs.forEach(([k, fn]) => state.off(k, fn));
}

function toggleRow(id, label, on) {
  return `<div class="settings-toggle-row">
    <span class="lab">${escapeHtml(label)}</span>
    <div class="toggle${on ? ' on' : ''}" id="${id}"></div>
  </div>`;
}

/* ─── Snapshots modal ─── */

function openSnapshots() {
  const el = bg();
  const m = document.createElement('div');
  m.className = 'modal';
  m.style.width = '600px';
  m.onclick = (e) => e.stopPropagation();
  const snaps = state.get('snapshots') || [];
  let body = '<button class="btn" id="snapNew" style="width:100%;margin-bottom:14px">+ Create snapshot of current state</button>';
  if (snaps.length === 0) {
    body += '<div style="text-align:center;padding:30px 0;color:var(--text-muted);font-size:13px">No snapshots yet</div>';
  } else {
    for (const s of snaps) {
      body += `<div class="snapshot-item">
        <div class="snapshot-info">
          <div class="snapshot-label">${escapeHtml(s.label)}</div>
          <div class="snapshot-meta">${new Date(s.timestamp).toLocaleString()} · ${(s.code.length / 1024).toFixed(1)}KB · ${s.code.split('\n').length} lines</div>
        </div>
        <div class="snapshot-actions">
          <button class="btn-ghost" data-snap-diff="${escapeHtml(s.id)}">Diff</button>
          <button class="btn-ghost" data-snap-restore="${escapeHtml(s.id)}">Restore</button>
          <button class="btn-ghost danger" data-snap-del="${escapeHtml(s.id)}">×</button>
        </div>
      </div>`;
    }
  }
  m.innerHTML = modalShell('Version History', snaps.length + ' snapshot' + (snaps.length === 1 ? '' : 's'), body);
  el.appendChild(m);
  m.querySelector('#mClose').onclick = closeAll;
  m.querySelector('#snapNew').onclick = () => { bus.emit('snapshot:create'); closeAll(); };
  m.querySelectorAll('[data-snap-restore]').forEach(b =>
    b.addEventListener('click', () => { bus.emit('snapshot:restore', b.dataset.snapRestore); closeAll(); }));
  m.querySelectorAll('[data-snap-diff]').forEach(b =>
    b.addEventListener('click', () => { bus.emit('snapshot:diff', b.dataset.snapDiff); closeAll(); }));
  m.querySelectorAll('[data-snap-del]').forEach(b =>
    b.addEventListener('click', () => {
      if (confirm('Delete this snapshot?')) {
        bus.emit('snapshot:delete', b.dataset.snapDel);
        closeAll();
        setTimeout(openSnapshots, 50);
      }
    }));
}

/* ─── Shortcuts modal ─── */

function openShortcuts() {
  const el = bg();
  const m = document.createElement('div');
  m.className = 'modal';
  m.style.width = '600px';
  m.style.maxHeight = '85vh';
  m.onclick = (e) => e.stopPropagation();
  let body = '';
  for (const sec of SHORTCUTS) {
    body += '<div class="kbd-section"><div class="kbd-section-title">' + escapeHtml(sec.section) + '</div><div class="kbd-grid">';
    for (const [key, label] of sec.items) {
      body += '<div class="kbd-row"><span>' + escapeHtml(label) + '</span><span>';
      const parts = key.split(/(\s|\+|\/| )/);
      for (const p of parts) {
        if (!p) continue;
        if (p === ' ' || p === '+' || p === '/') body += '<span style="margin:0 4px;color:var(--text-muted)">' + p + '</span>';
        else body += '<kbd class="kbd">' + escapeHtml(p) + '</kbd>';
      }
      body += '</span></div>';
    }
    body += '</div></div>';
  }
  m.innerHTML = modalShell('Keyboard Shortcuts', 'Press ? to show this dialog', body);
  el.appendChild(m);
  m.querySelector('#mClose').onclick = closeAll;
}

/* ─── Command palette ─── */

const CMD_ACTIONS = [
  { name: 'Export…',                 shortcut: 'Ctrl+Shift+E', action: () => state.set({ showExportModal: true }) },
  { name: 'Templates',               shortcut: '',             action: () => state.set({ showTemplatesModal: true }) },
  { name: 'Settings',                shortcut: '',             action: () => state.set({ showSettingsModal: true }) },
  { name: 'Document statistics',     shortcut: 'Ctrl+Shift+D', action: () => state.set({ showStatsModal: true }) },
  { name: 'Version history',         shortcut: '',             action: () => state.set({ showSnapshotsModal: true }) },
  { name: 'Bibliography editor',     shortcut: '',             action: () => state.set({ showBibModal: true }) },
  { name: 'Keyboard shortcuts',      shortcut: '?',            action: () => state.set({ showShortcutsModal: true }) },
  { name: 'Toggle preview',          shortcut: '',             action: () => state.set({ showPreview: !state.get('showPreview') }) },
  { name: 'Toggle focus mode',       shortcut: 'F11',          action: () => state.set({ focusMode: !state.get('focusMode') }) },
  { name: 'Toggle typewriter mode',  shortcut: '',             action: () => state.set({ typewriterMode: !state.get('typewriterMode') }) },
  { name: 'Theme: Dark Editorial',   shortcut: '',             action: () => state.set({ theme: 'dark' }) },
  { name: 'Theme: Light Paper',      shortcut: '',             action: () => state.set({ theme: 'light' }) },
  { name: 'Theme: Solarized Dark',   shortcut: '',             action: () => state.set({ theme: 'solarized' }) },
  { name: 'Theme: Midnight Ocean',   shortcut: '',             action: () => state.set({ theme: 'ocean' }) },
  { name: 'Theme: Warm Parchment',   shortcut: '',             action: () => state.set({ theme: 'parchment' }) },
  { name: 'Save snapshot',           shortcut: 'Ctrl+Shift+S', action: () => bus.emit('snapshot:create') },
];

function openCmdPalette() {
  const el = bg();
  const m = document.createElement('div');
  m.className = 'cmd-palette';
  m.onclick = (e) => e.stopPropagation();
  m.innerHTML = `
    <div class="cmd-input-wrap">
      <span style="color:var(--text-muted)">⌘</span>
      <input class="cmd-input" id="cmdSearch" placeholder="Type a command…" autofocus />
    </div>
    <div class="cmd-list" id="cmdList"></div>`;
  el.appendChild(m);
  let sel = 0;
  let items = CMD_ACTIONS.slice();
  const searchEl = m.querySelector('#cmdSearch');
  const listEl = m.querySelector('#cmdList');

  function rerender() {
    listEl.innerHTML = '';
    items.forEach((it, i) => {
      const e = document.createElement('div');
      e.className = 'cmd-item' + (i === sel ? ' active' : '');
      e.innerHTML = `<span class="cmd-item-name">${escapeHtml(it.name)}</span><span class="cmd-item-shortcut">${escapeHtml(it.shortcut)}</span>`;
      e.onclick = () => { it.action(); closeAll(); };
      listEl.appendChild(e);
    });
  }
  rerender();

  searchEl.addEventListener('input', () => {
    const q = searchEl.value.toLowerCase();
    if (!q) items = CMD_ACTIONS.slice();
    else {
      items = CMD_ACTIONS
        .map(a => ({ a, score: fuzzyScore(q, a.name.toLowerCase()) }))
        .filter(x => x.score > 0)
        .sort((x, y) => y.score - x.score)
        .map(x => x.a);
    }
    sel = 0;
    rerender();
  });

  searchEl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % items.length; rerender(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + items.length) % items.length; rerender(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[sel]) { items[sel].action(); closeAll(); } }
    else if (e.key === 'Escape') { e.preventDefault(); closeAll(); }
  });
}

/* ─── Stats modal ─── */

function openStats() {
  const el = bg();
  const m = document.createElement('div');
  m.className = 'modal';
  m.style.width = '560px';
  m.onclick = (e) => e.stopPropagation();
  m.innerHTML = modalShell('Document Statistics', state.get('projectName'), '<div id="statsContainer"></div>');
  el.appendChild(m);
  m.querySelector('#mClose').onclick = closeAll;
  renderStatsPanel(m.querySelector('#statsContainer'));
  // Live updates while modal open
  const update = () => { const c = m.querySelector('#statsContainer'); if (c) renderStatsPanel(c); };
  state.on('code', update);
  state.on('wordGoal', update);
  // Remove subscribers when modal is closed (MutationObserver detects backdrop removal)
  const cleanup = () => {
    state.off('code', update);
    state.off('wordGoal', update);
  };
  el._cleanup = cleanup;
}

/* ─── Diff modal ─── */

function openDiff() {
  const el = bg();
  const info = state.get('diffSnapshots');
  if (!info) { closeAll(); return; }
  const snaps = state.get('snapshots') || [];
  const a = snaps.find(s => s.id === info.aId);
  const b = info.bId === '__current__'
    ? { id: '__current__', label: 'Current', code: state.get('code'), timestamp: Date.now() }
    : snaps.find(s => s.id === info.bId);
  if (!a || !b) { closeAll(); return; }
  const m = document.createElement('div');
  m.className = 'modal';
  m.style.width = '880px';
  m.style.maxHeight = '90vh';
  m.onclick = (e) => e.stopPropagation();
  const lines = lineDiff(a.code, b.code);
  const stats = lines.reduce((acc, l) => {
    if (l.type === 'add') acc.add++;
    else if (l.type === 'rem') acc.rem++;
    return acc;
  }, { add: 0, rem: 0 });
  let body = `<div class="diff-controls">
    <span style="color:var(--color-error)">− ${escapeHtml(a.label)}</span>
    <span>→</span>
    <span style="color:var(--color-success)">+ ${escapeHtml(b.label)}</span>
    <span class="diff-stats"><span class="add">+${stats.add}</span> / <span class="rem">−${stats.rem}</span></span>
  </div>`;
  body += '<div class="diff-view">';
  for (const l of lines) {
    body += `<div class="diff-line ${l.type}">
      <span class="diff-mark">${l.type === 'add' ? '+' : l.type === 'rem' ? '−' : ' '}</span>
      <span style="flex:1">${escapeHtml(l.text || ' ')}</span>
    </div>`;
  }
  body += '</div>';
  m.innerHTML = modalShell('Compare Snapshots', null, body);
  el.appendChild(m);
  m.querySelector('#mClose').onclick = closeAll;
}

/* ─── Bibliography editor modal ─── */

function openBibEditor() {
  const el = bg();
  const m = document.createElement('div');
  m.className = 'modal';
  m.style.width = '780px';
  m.style.maxHeight = '85vh';
  m.onclick = (e) => e.stopPropagation();
  const body = `
    <div class="diff-controls">
      <input class="input" id="bibSearch" placeholder="Search…" style="max-width:240px" />
      <button class="btn-ghost" id="bibAddBtn">+ Add</button>
      <button class="btn-ghost" id="bibImportBtn">Import .bib</button>
      <button class="btn-ghost" id="bibExportBtn">Export .bib</button>
      <input type="file" id="bibImportFile" accept=".bib,.txt" style="display:none" />
    </div>
    <div class="bib-layout" id="bibLayout"></div>`;
  m.innerHTML = modalShell('Bibliography Editor', null, body);
  el.appendChild(m);
  m.querySelector('#mClose').onclick = closeAll;

  let activeKey = null;
  function rerender(filter) {
    const bib = state.get('bibliography') || {};
    const keys = Object.keys(bib).filter(k => {
      if (!filter) return true;
      const e = bib[k];
      const blob = (k + ' ' + (e.fields?.title || '') + ' ' + (e.fields?.author || '')).toLowerCase();
      return blob.includes(filter.toLowerCase());
    });
    const layout = m.querySelector('#bibLayout');
    let listHTML = '<div class="bib-list">';
    for (const key of keys) {
      const e = bib[key];
      listHTML += `<div class="bib-list-item${key === activeKey ? ' active' : ''}" data-key="${escapeHtml(key)}">
        <div class="bib-key">${escapeHtml(key)}</div>
        <div class="bib-snippet">${escapeHtml((e.fields?.title || e.fields?.author || e.type || '').slice(0, 60))}</div>
      </div>`;
    }
    listHTML += '</div>';

    let formHTML = '<div class="bib-form" id="bibForm">';
    if (activeKey && bib[activeKey]) {
      const e = bib[activeKey];
      const types = ['article', 'book', 'inproceedings', 'misc', 'phdthesis', 'techreport'];
      const required = {
        article: ['author', 'title', 'journal', 'year'],
        book: ['author', 'title', 'publisher', 'year'],
        inproceedings: ['author', 'title', 'booktitle', 'year'],
        misc: ['title'],
        phdthesis: ['author', 'title', 'school', 'year'],
        techreport: ['author', 'title', 'institution', 'year'],
      };
      const fields = ['author', 'title', 'journal', 'booktitle', 'publisher', 'school', 'institution',
                       'year', 'volume', 'number', 'pages', 'month', 'doi', 'url', 'note'];
      formHTML += '<div class="bib-form-row"><label class="bib-form-label">Type</label>' +
        `<select class="select" id="bibType">${types.map(t => `<option value="${t}"${e.type === t ? ' selected' : ''}>${t}</option>`).join('')}</select></div>`;
      formHTML += `<div class="bib-form-row"><label class="bib-form-label required">Cite key</label><input class="input input-mono" id="bibKey" value="${escapeHtml(activeKey)}" /></div>`;
      const req = required[e.type] || [];
      for (const f of fields) {
        const isReq = req.includes(f);
        formHTML += `<div class="bib-form-row">
          <label class="bib-form-label${isReq ? ' required' : ''}">${f}</label>
          <input class="input" data-field="${f}" value="${escapeHtml(e.fields?.[f] || '')}" />
        </div>`;
      }
      formHTML += `<div style="display:flex;gap:6px;margin-top:14px">
        <button class="btn" id="bibInsertCite" style="flex:1">Insert \\cite{${escapeHtml(activeKey)}}</button>
        <button class="btn-ghost danger" id="bibDelete">Delete</button>
      </div>`;
    } else {
      formHTML += '<div style="text-align:center;color:var(--text-muted);padding:30px 0">Select an entry or add a new one</div>';
    }
    formHTML += '</div>';

    layout.innerHTML = listHTML + formHTML;

    layout.querySelectorAll('[data-key]').forEach(b =>
      b.addEventListener('click', () => { activeKey = b.dataset.key; rerender(filter); }));

    if (activeKey) {
      const typeSel = layout.querySelector('#bibType');
      const keyInput = layout.querySelector('#bibKey');
      const formEl = layout.querySelector('#bibForm');
      formEl.querySelectorAll('[data-field]').forEach(input =>
        input.addEventListener('input', () => {
          const bib = { ...state.get('bibliography') };
          if (!bib[activeKey].fields) bib[activeKey].fields = {};
          bib[activeKey].fields[input.dataset.field] = input.value;
          state.set({ bibliography: bib });
        }));
      typeSel.addEventListener('change', () => {
        const bib = { ...state.get('bibliography') };
        bib[activeKey].type = typeSel.value;
        state.set({ bibliography: bib });
        rerender(filter);
      });
      keyInput.addEventListener('blur', () => {
        const newKey = keyInput.value.trim();
        if (!newKey || newKey === activeKey) return;
        const bib = { ...state.get('bibliography') };
        if (bib[newKey]) { bus.emit('toast', { msg: 'Key exists', type: 'error' }); keyInput.value = activeKey; return; }
        bib[newKey] = bib[activeKey];
        delete bib[activeKey];
        activeKey = newKey;
        state.set({ bibliography: bib });
        rerender(filter);
      });
      layout.querySelector('#bibInsertCite').onclick = () => {
        bus.emit('cite:insert', activeKey);
        closeAll();
      };
      layout.querySelector('#bibDelete').onclick = () => {
        if (!confirm('Delete this entry?')) return;
        const bib = { ...state.get('bibliography') };
        delete bib[activeKey];
        state.set({ bibliography: bib });
        activeKey = null;
        rerender(filter);
      };
    }
  }

  m.querySelector('#bibSearch').addEventListener('input', (e) => rerender(e.target.value));
  m.querySelector('#bibAddBtn').onclick = () => {
    const newKey = 'entry' + Date.now();
    const bib = { ...state.get('bibliography') };
    bib[newKey] = { type: 'article', fields: { author: '', title: '', year: '' } };
    state.set({ bibliography: bib });
    activeKey = newKey;
    rerender();
  };
  m.querySelector('#bibImportBtn').onclick = () => m.querySelector('#bibImportFile').click();
  m.querySelector('#bibImportFile').onchange = (e) => bus.emit('bib:import-file', e.target.files[0]);
  m.querySelector('#bibExportBtn').onclick = () => bus.emit('bib:export');

  rerender();
}
