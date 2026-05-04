// ═══════════════════════════════════════
// LaTeXStudio v4.0 — preview.js
// Live preview: LaTeX→HTML, KaTeX rendering, scroll sync, zoom controls
// ═══════════════════════════════════════

import { state, bus } from './state.js';
import { convertToHTML } from './converter.js';

let elPanel, elBody, elContent, elZoom;
let renderTimer = null;
let lastScrollSource = null; // 'editor' | 'preview' | null

/** Initialise preview pane */
export function initPreview(refs) {
  elPanel = refs.panel;
  elBody = refs.body;
  elContent = refs.content;
  elZoom = refs.zoomLabel;

  state.on('code', schedule);
  state.on('images', schedule);
  state.on('previewZoom', applyZoom);
  state.on('previewWidth', applyWidth);
  state.on('showPreview', applyVisibility);

  bus.on('editor:scroll', onEditorScroll);
  if (elBody) elBody.addEventListener('scroll', onPreviewScroll);

  // When KaTeX finishes loading, re-render once so math becomes typeset.
  const checkKatex = () => {
    if (window.katex) render();
    else setTimeout(checkKatex, 100);
  };
  checkKatex();

  applyVisibility();
  applyWidth();
  applyZoom();
  render();
}

function schedule() {
  if (renderTimer) clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 220);
}

function render() {
  if (!elContent) return;
  const code = state.get('code');
  const images = state.get('images');
  // Save current scroll
  const sc = elBody ? elBody.scrollTop : 0;
  try {
    const html = convertToHTML(code, images, false);
    elContent.innerHTML = html;
  } catch (e) {
    elContent.innerHTML = '<div class="preview-empty">Render error: ' + escapeHtml(e.message) + '</div>';
  }
  // Restore scroll
  if (elBody) elBody.scrollTop = sc;
}

function applyZoom() {
  const zoom = state.get('previewZoom') || 100;
  if (elContent) {
    elContent.style.transform = `scale(${zoom / 100})`;
    elContent.style.transformOrigin = 'top center';
  }
  if (elZoom) elZoom.textContent = zoom + '%';
}

function applyWidth() {
  if (!elPanel) return;
  if (state.get('showPreview')) {
    elPanel.style.width = state.get('previewWidth') + 'px';
  }
}

function applyVisibility() {
  if (!elPanel) return;
  if (state.get('showPreview')) {
    elPanel.classList.remove('hidden');
    elPanel.style.width = state.get('previewWidth') + 'px';
  } else {
    elPanel.classList.add('hidden');
    elPanel.style.width = '0';
  }
}

/** Zoom commands */
export function zoomIn() {
  const z = Math.min(200, (state.get('previewZoom') || 100) + 10);
  state.set({ previewZoom: z });
}
export function zoomOut() {
  const z = Math.max(50, (state.get('previewZoom') || 100) - 10);
  state.set({ previewZoom: z });
}
export function zoomReset() {
  state.set({ previewZoom: 100 });
}

/* ─── Scroll sync ─── */

function onEditorScroll(payload) {
  if (!state.get('scrollSyncEnabled')) return;
  if (lastScrollSource === 'preview') return;
  lastScrollSource = 'editor';
  const ed = document.querySelector('.editor-textarea');
  if (!ed || !elBody) { lastScrollSource = null; return; }
  const edMax = ed.scrollHeight - ed.clientHeight;
  if (edMax <= 0) { lastScrollSource = null; return; }
  const ratio = payload.scrollTop / edMax;
  const prMax = elBody.scrollHeight - elBody.clientHeight;
  elBody.scrollTop = ratio * prMax;
  requestAnimationFrame(() => { lastScrollSource = null; });
}

function onPreviewScroll() {
  if (!state.get('scrollSyncEnabled')) return;
  if (lastScrollSource === 'editor') return;
  lastScrollSource = 'preview';
  const ed = document.querySelector('.editor-textarea');
  if (!ed || !elBody) { lastScrollSource = null; return; }
  const prMax = elBody.scrollHeight - elBody.clientHeight;
  if (prMax <= 0) { lastScrollSource = null; return; }
  const ratio = elBody.scrollTop / prMax;
  const edMax = ed.scrollHeight - ed.clientHeight;
  ed.scrollTop = ratio * edMax;
  requestAnimationFrame(() => { lastScrollSource = null; });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
