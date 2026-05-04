// ═══════════════════════════════════════
// LaTeXStudio v4.0 — sidebar.js
// Left sidebar — 6 tabs: Images, Outline, Snippets, Symbols, Bibliography, History
// ═══════════════════════════════════════

import { state, bus } from './state.js';
import { SNIPPETS, SYMBOLS } from './constants.js';
import { insertAtCursor, jumpToLine } from './editor.js';

let elTabs, elContent;
const TAB_DEFS = [
  { id: 'images',  label: 'Images',       icon: ICON('img') },
  { id: 'outline', label: 'Outline',      icon: ICON('list') },
  { id: 'snip',    label: 'Snippets',     icon: ICON('code') },
  { id: 'sym',     label: 'Symbols',      icon: ICON('omega') },
  { id: 'bib',     label: 'Bibliography', icon: ICON('book') },
  { id: 'history', label: 'History',      icon: ICON('history') },
];

/** Initialise sidebar */
export function initSidebar(refs) {
  elTabs    = refs.tabs;
  elContent = refs.content;
  // Only re-render when the data for the *currently active tab* changes.
  // Avoid rebuilding the entire DOM on every cursor move.
  state.on('activeTab', render);
  state.on('outline',   () => { if (state.get('activeTab') === 'outline') render(); });
  state.on('images',    () => { if (state.get('activeTab') === 'images')  render(); });
  state.on('snapshots', () => { if (state.get('activeTab') === 'history') render(); });
  state.on('bibliography', () => { if (state.get('activeTab') === 'bib')  render(); });
  state.on('cursorLine', () => {
    // Outline tab needs to update its "active" indicator on cursor move,
    // but we only want to update the highlighted item, not rebuild everything.
    if (state.get('activeTab') === 'outline') updateOutlineActive();
  });
  // Sidebar expand/collapse styling
  state.on('sidebarExpanded', () => {
    const sb = document.getElementById('sidebar');
    if (sb) sb.classList.toggle('expanded', !!state.get('sidebarExpanded'));
  });
  renderTabs();
  render();
}

function ICON(kind) {
  const svg = (path) =>
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  if (kind === 'img')   return svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>');
  if (kind === 'list')  return svg('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>');
  if (kind === 'code')  return svg('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>');
  if (kind === 'omega') return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" font-family="serif"><text x="12" y="17" text-anchor="middle" font-size="16" font-weight="600" fill="currentColor" stroke="none">Ω</text></svg>';
  if (kind === 'book')  return svg('<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>');
  if (kind === 'history') return svg('<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/>');
  return '';
}

function renderTabs() {
  elTabs.innerHTML = '';
  for (const t of TAB_DEFS) {
    const b = document.createElement('button');
    b.className = 'sidebar-tab';
    b.dataset.tab = t.id;
    b.dataset.tooltip = t.label;
    b.innerHTML = t.icon;
    b.addEventListener('click', () => {
      const cur = state.get('activeTab');
      const expanded = state.get('sidebarExpanded');
      if (cur === t.id && expanded) {
        // Toggle collapsed when clicking active tab
        state.set({ sidebarExpanded: false });
      } else {
        state.set({ activeTab: t.id, sidebarExpanded: true });
      }
    });
    elTabs.appendChild(b);
  }
  // Reflect active
  state.on('activeTab', () => {
    elTabs.querySelectorAll('.sidebar-tab').forEach(el =>
      el.classList.toggle('active', el.dataset.tab === state.get('activeTab')));
  });
  elTabs.querySelectorAll('.sidebar-tab').forEach(el =>
    el.classList.toggle('active', el.dataset.tab === state.get('activeTab')));
}

function render() {
  if (!elContent) return;
  const tab = state.get('activeTab');
  const map = {
    images: renderImages,
    outline: renderOutline,
    snip: renderSnippets,
    sym: renderSymbols,
    bib: renderBib,
    history: renderHistory,
  };
  const fn = map[tab] || renderImages;
  fn();
}

/* ─── Images tab ─── */

function renderImages() {
  const images = state.get('images') || [];
  elContent.innerHTML = `
    <div class="sidebar-header">
      <span>Images (${images.length})</span>
      <button class="btn-ghost" id="btnUpload">+ Add</button>
    </div>
    <div class="sidebar-body" id="imgBody">
      ${images.length === 0
        ? '<div style="padding:30px 12px;text-align:center;color:var(--text-muted);font-size:12px">Drop or paste an image here</div>'
        : images.map(img => `
          <div class="list-item" data-img-id="${img.id}">
            <span style="font-family:var(--font-editor);font-size:11px;color:var(--accent)">${escapeHtml(img.ext)}</span>
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(img.name)}.${escapeHtml(img.ext)}</span>
            <span class="list-item-meta">${(img.size / 1024).toFixed(0)}KB</span>
          </div>`).join('')}
    </div>
    <input type="file" id="fileInput" multiple accept="image/*" style="display:none" />`;
  const btn = elContent.querySelector('#btnUpload');
  const input = elContent.querySelector('#fileInput');
  if (btn && input) {
    btn.onclick = () => input.click();
    input.onchange = (e) => bus.emit('images:upload', e.target.files);
  }
  // Click on image inserts \includegraphics
  elContent.querySelectorAll('[data-img-id]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.imgId;
      const img = (state.get('images') || []).find(i => i.id === id);
      if (img) {
        const ins = `\\begin{figure}[H]\n  \\centering\n  \\includegraphics[width=0.7\\textwidth]{${img.name}}\n  \\caption{${img.name}}\n  \\label{fig:${img.name}}\n\\end{figure}\n`;
        insertAtCursor(ins);
      }
    });
  });
}

/* ─── Outline tab ─── */

function renderOutline() {
  const outline = state.get('outline') || [];
  const cur = state.get('cursorLine');
  // Find active section
  let activeIdx = -1;
  for (let i = 0; i < outline.length; i++) {
    if (outline[i].line <= cur) activeIdx = i;
    else break;
  }
  elContent.innerHTML = `
    <div class="sidebar-header"><span>Document Outline</span></div>
    <div class="sidebar-body">
      ${outline.length === 0
        ? '<div style="padding:30px 12px;text-align:center;color:var(--text-muted);font-size:12px">No sections yet — add \\section{...}</div>'
        : outline.map((it, i) => `
          <div class="list-item indent-${it.level - 1} ${i === activeIdx ? 'active' : ''}" data-line="${it.line}">
            <span style="font-family:var(--font-editor);font-size:10px;color:var(--text-muted);width:14px">${'§'.repeat(Math.max(1, it.level - 1))}</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(it.title)}</span>
            <span class="list-item-meta">${it.line}</span>
          </div>`).join('')}
    </div>`;
  elContent.querySelectorAll('[data-line]').forEach(el =>
    el.addEventListener('click', () => jumpToLine(parseInt(el.dataset.line, 10))));
}

/** Update only the "active" highlight in the outline (no DOM rebuild) */
function updateOutlineActive() {
  const items = elContent.querySelectorAll('[data-line]');
  if (items.length === 0) return;
  const cur = state.get('cursorLine');
  let activeIdx = -1;
  const lines = Array.from(items).map(el => parseInt(el.dataset.line, 10));
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] <= cur) activeIdx = i;
    else break;
  }
  items.forEach((el, i) => el.classList.toggle('active', i === activeIdx));
}

/* ─── Snippets tab ─── */

function renderSnippets() {
  // SNIPPETS is a flat list of { cat, name, body }. Group by category for display.
  const byCat = {};
  for (const s of SNIPPETS) {
    (byCat[s.cat] || (byCat[s.cat] = [])).push(s);
  }
  let html = `
    <div class="sidebar-header"><span>Snippets</span></div>
    <div class="sidebar-body">
      <input class="input input-mono" id="snipSearch" placeholder="Search…" style="margin-bottom:8px" />
      <div id="snipList">`;
  for (const cat of Object.keys(byCat)) {
    html += `<div class="section-title">${escapeHtml(cat)}</div>`;
    for (const s of byCat[cat]) {
      html += `<div class="list-item" data-snip="${escapeAttr(s.body)}">
        <span style="flex:1">${escapeHtml(s.name)}</span></div>`;
    }
  }
  html += '</div></div>';
  elContent.innerHTML = html;
  // Search filter
  const input = elContent.querySelector('#snipSearch');
  const list  = elContent.querySelector('#snipList');
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    list.querySelectorAll('.list-item').forEach(el => {
      const txt = el.textContent.toLowerCase();
      el.style.display = !q || txt.includes(q) ? '' : 'none';
    });
    list.querySelectorAll('.section-title').forEach(el => {
      // Show the section title only if any visible item follows it
      let next = el.nextElementSibling;
      let any = false;
      while (next && !next.classList.contains('section-title')) {
        if (next.style.display !== 'none') { any = true; break; }
        next = next.nextElementSibling;
      }
      el.style.display = any ? '' : 'none';
    });
  });
  list.querySelectorAll('[data-snip]').forEach(el =>
    el.addEventListener('click', () => insertAtCursor(unescapeAttr(el.dataset.snip))));
}

/* ─── Symbols tab ─── */

function renderSymbols() {
  let html = `<div class="sidebar-header"><span>Symbols</span></div><div class="sidebar-body">`;
  html += '<input class="input input-mono" id="symSearch" placeholder="Search symbol…" style="margin-bottom:8px" />';
  for (const cat of SYMBOLS) {
    html += `<div class="section-title">${escapeHtml(cat.cat)}</div>`;
    html += '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:3px">';
    for (const it of cat.items) {
      html += `<button class="tag-btn" data-cmd="${escapeAttr(it.cmd)}" data-name="${escapeAttr(it.cmd)}" title="${escapeAttr(it.cmd)}" style="font-family:var(--font-display);font-size:14px;height:30px">${escapeHtml(it.sym)}</button>`;
    }
    html += '</div>';
  }
  html += '</div>';
  elContent.innerHTML = html;
  const input = elContent.querySelector('#symSearch');
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    elContent.querySelectorAll('[data-cmd]').forEach(el => {
      const cmd = el.dataset.name.toLowerCase();
      el.style.display = !q || cmd.includes(q) ? '' : 'none';
    });
  });
  elContent.querySelectorAll('[data-cmd]').forEach(el =>
    el.addEventListener('click', () => insertAtCursor(el.dataset.cmd + ' ')));
}

/* ─── Bibliography tab ─── */

function renderBib() {
  const bib = state.get('bibliography') || {};
  const keys = Object.keys(bib);
  let html = `
    <div class="sidebar-header">
      <span>Bibliography (${keys.length})</span>
      <div style="display:flex;gap:4px">
        <button class="btn-icon" id="bibAdd" data-tooltip="Add entry">+</button>
        <button class="btn-icon" id="bibImport" data-tooltip="Import .bib">↑</button>
        <button class="btn-icon" id="bibExport" data-tooltip="Export .bib">↓</button>
      </div>
    </div>
    <div class="sidebar-body">`;
  if (keys.length === 0) {
    html += '<div style="padding:30px 12px;text-align:center;color:var(--text-muted);font-size:12px">No entries yet</div>';
  } else {
    for (const key of keys) {
      const e = bib[key];
      const f = e.fields || {};
      html += `<div class="list-item" data-bib="${escapeAttr(key)}" style="flex-direction:column;align-items:flex-start">
        <div style="display:flex;width:100%;gap:6px;align-items:center">
          <span style="font-family:var(--font-editor);color:var(--accent);font-weight:600;font-size:11px">${escapeHtml(key)}</span>
          <span style="margin-left:auto;font-size:10px;color:var(--text-muted)">${escapeHtml(e.type || 'misc')}</span>
        </div>
        <div style="font-size:11px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%">
          ${escapeHtml((f.title || f.author || '').slice(0, 60))}
        </div>
      </div>`;
    }
  }
  html += `<input type="file" id="bibFile" accept=".bib,.txt" style="display:none" /></div>`;
  elContent.innerHTML = html;
  // Buttons
  elContent.querySelector('#bibAdd').onclick = () => bus.emit('bib:add');
  elContent.querySelector('#bibImport').onclick = () => elContent.querySelector('#bibFile').click();
  elContent.querySelector('#bibExport').onclick = () => bus.emit('bib:export');
  elContent.querySelector('#bibFile').onchange = (e) => bus.emit('bib:import', e.target.files[0]);
  // Click entry
  elContent.querySelectorAll('[data-bib]').forEach(el =>
    el.addEventListener('click', () => bus.emit('bib:edit', el.dataset.bib)));
}

/* ─── History tab ─── */

function renderHistory() {
  const snaps = state.get('snapshots') || [];
  let html = `
    <div class="sidebar-header">
      <span>History (${snaps.length})</span>
      <button class="btn-ghost" id="snapNew">+ Save</button>
    </div>
    <div class="sidebar-body">`;
  if (snaps.length === 0) {
    html += '<div style="padding:30px 12px;text-align:center;color:var(--text-muted);font-size:12px">No snapshots yet — Ctrl+Shift+S to create one</div>';
  } else {
    for (const s of snaps) {
      html += `<div class="snapshot-item">
        <div class="snapshot-info">
          <div class="snapshot-label">${escapeHtml(s.label)}</div>
          <div class="snapshot-meta">${new Date(s.timestamp).toLocaleString()} · ${s.code.split('\n').length} lines</div>
        </div>
        <div class="snapshot-actions">
          <button class="btn-ghost" data-snap-diff="${escapeAttr(s.id)}" data-tooltip="Diff with current">≠</button>
          <button class="btn-ghost" data-snap-restore="${escapeAttr(s.id)}">Restore</button>
        </div>
      </div>`;
    }
  }
  html += '</div>';
  elContent.innerHTML = html;
  elContent.querySelector('#snapNew').onclick = () => bus.emit('snapshot:create');
  elContent.querySelectorAll('[data-snap-restore]').forEach(el =>
    el.addEventListener('click', () => bus.emit('snapshot:restore', el.dataset.snapRestore)));
  elContent.querySelectorAll('[data-snap-diff]').forEach(el =>
    el.addEventListener('click', () => bus.emit('snapshot:diff', el.dataset.snapDiff)));
}

/* ─── Helpers ─── */

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function unescapeAttr(s) {
  return String(s ?? '').replace(/&(amp|lt|gt|quot|#39);/g, (_, e) =>
    ({amp:'&', lt:'<', gt:'>', quot:'"', '#39':"'"}[e]));
}
