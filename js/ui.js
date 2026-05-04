// ═══════════════════════════════════════
// LaTeXStudio v4.0 — ui.js
// Toast notifications, status bar, focus mode, restore banner
// ═══════════════════════════════════════

import { state, bus } from './state.js';

let elToastContainer, elStatusbar;

/** Initialise UI */
export function initUI(refs) {
  elToastContainer = refs.toasts;
  elStatusbar = refs.statusbar;

  // Cursor + lint + save status update the bar synchronously (cheap).
  ['cursorLine', 'cursorCol', 'lintIssues', 'saveStatus', 'theme', 'multiCursors'].forEach(k =>
    state.on(k, renderStatusbar));
  // Code changes update the bar via debounce (word/char count is the only doc-wide thing here).
  state.on('code', scheduleStatusUpdate);

  // Focus mode toggle
  state.on('focusMode', () => {
    document.body.querySelector('.app').classList.toggle('focus-mode', state.get('focusMode'));
  });
  state.on('typewriterMode', () => {
    document.body.querySelector('.app').classList.toggle('typewriter', state.get('typewriterMode'));
  });

  // Theme application
  state.on('theme', () => document.body.setAttribute('data-theme', state.get('theme')));
  document.body.setAttribute('data-theme', state.get('theme'));

  renderStatusbar();
}

let _statusTimer = null;
function scheduleStatusUpdate() {
  if (_statusTimer) return;
  _statusTimer = setTimeout(() => { _statusTimer = null; renderStatusbar(); }, 300);
}

/* ─── Toasts ─── */

let toastId = 0;

/** Show a toast: type ∈ {info, success, error, warn} */
export function toast(message, type = 'info', timeout = 3000) {
  if (!elToastContainer) return;
  const id = ++toastId;
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.dataset.id = id;
  const icon = { success: '✓', error: '✕', warn: '!', info: 'i' }[type] || 'i';
  el.innerHTML = '<span class="toast-icon">' + icon + '</span><span>' +
    String(message).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])) + '</span>';
  elToastContainer.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'fadeIn 150ms reverse forwards';
    setTimeout(() => el.remove(), 160);
  }, timeout);
  // Cap at 5 visible
  while (elToastContainer.children.length > 5) {
    elToastContainer.firstChild.remove();
  }
}

/* ─── Status bar ─── */

let _cachedWordCount = 0;
let _cachedCharCount = 0;
let _cachedCodeRef = null;
function getCounts(code) {
  if (code === _cachedCodeRef) return { words: _cachedWordCount, chars: _cachedCharCount };
  _cachedCodeRef = code;
  _cachedWordCount = (code.replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?(?:\{[^}]*\})*/g, ' ').match(/\b[\w'-]+\b/g) || []).length;
  _cachedCharCount = code.length;
  return { words: _cachedWordCount, chars: _cachedCharCount };
}

function renderStatusbar() {
  if (!elStatusbar) return;
  const status = state.get('saveStatus');
  const issues = state.get('lintIssues') || [];
  const errors = issues.filter(i => i.severity === 'error').length;
  const warns = issues.filter(i => i.severity === 'warn').length;
  const code = state.get('code') || '';
  const { words: wordCount, chars: charCount } = getCounts(code);
  const ln = state.get('cursorLine');
  const col = state.get('cursorCol');
  const mc = state.get('multiCursors') || [];
  const themeIcon = { dark: '◐', light: '○', solarized: '☀', ocean: '~', parchment: '✎' }[state.get('theme')] || '◐';

  let lintHTML;
  if (errors > 0) {
    lintHTML = '<span class="lint-status error">✕ ' + errors + ' error' + (errors === 1 ? '' : 's') + '</span>';
  } else if (warns > 0) {
    lintHTML = '<span class="lint-status warn">⚠ ' + warns + ' warning' + (warns === 1 ? '' : 's') + '</span>';
  } else {
    lintHTML = '<span class="lint-status ok">✓ No issues</span>';
  }

  // Active section (current outline)
  const outline = state.get('outline') || [];
  let curSec = '';
  for (let i = 0; i < outline.length; i++) {
    if (outline[i].line <= ln) curSec = outline[i].title;
    else break;
  }

  elStatusbar.innerHTML =
    '<div class="status-left">' +
      '<span><span class="save-dot ' + (status === 'saving' ? 'saving' : '') + '"></span>' +
      (status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : 'Unsaved') + '</span>' +
      lintHTML +
      (mc.length > 0 ? '<span style="color:var(--accent)">⌘ ' + (mc.length + 1) + ' cursors</span>' : '') +
    '</div>' +
    '<div class="status-center">' + (curSec ? '§ ' + escapeHtml(curSec) : '') + '</div>' +
    '<div class="status-right">' +
      '<span>Ln ' + ln + ' · Col ' + col + '</span>' +
      '<span>' + wordCount.toLocaleString() + ' words</span>' +
      '<span>' + charCount.toLocaleString() + ' chars</span>' +
      '<span data-tooltip="Theme: ' + state.get('theme') + '">' + themeIcon + '</span>' +
    '</div>';
}

/* ─── Restore banner (when we detect a saved session) ─── */

export function showRestoreBanner(savedAt, onRestore, onDismiss) {
  const banner = document.createElement('div');
  banner.className = 'restore-banner';
  const ago = timeAgo(savedAt);
  banner.innerHTML =
    '<span>Resume work from ' + ago + '?</span>' +
    '<button class="btn-ghost" id="restoreYes">Restore</button>' +
    '<button class="btn-ghost" id="restoreNo">Dismiss</button>';
  document.body.appendChild(banner);
  banner.querySelector('#restoreYes').onclick = () => { banner.remove(); onRestore(); };
  banner.querySelector('#restoreNo').onclick  = () => { banner.remove(); if (onDismiss) onDismiss(); };
  setTimeout(() => banner.remove(), 15000);
}

function timeAgo(t) {
  const sec = Math.round((Date.now() - t) / 1000);
  if (sec < 60) return 'a moment ago';
  if (sec < 3600) return Math.floor(sec / 60) + ' min ago';
  if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
  return Math.floor(sec / 86400) + 'd ago';
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ─── Focus indicator (small dot bottom-right) ─── */

export function ensureFocusIndicator() {
  if (document.querySelector('.focus-indicator')) return;
  const dot = document.createElement('div');
  dot.className = 'focus-indicator';
  dot.dataset.tooltip = 'Focus mode (Esc or F11 to exit)';
  document.body.appendChild(dot);
}
