// ═══════════════════════════════════════
// LaTeXStudio v4.0 — editor.js
// Textarea logic: indent, brackets, smart-Enter, find/replace,
// multi-cursor, equation hover, autocomplete integration.
// ═══════════════════════════════════════

import { state, bus } from './state.js';
import { highlightLatex } from './highlighter.js';
import { lintLatex } from './linter.js';
import { detectTrigger, buildItems, applyItem, buildDocIndex, parseOutline, CMD_DOCS } from './autocomplete.js';

const undoStack = [];
const redoStack = [];
let lastUndoTime = 0;

let elTextarea, elHighlight, elLineNumbers;
let acPopup, acTabStops = [], acTabIndex = 0;
let eqTooltip, eqHoverTimer = null;
let lintTimer = null;

/**
 * Initialise editor module — wires all DOM events.
 * Caller passes the elements created by app.js.
 */
export function initEditor(refs) {
  elTextarea     = refs.textarea;
  elHighlight    = refs.highlight;
  elLineNumbers  = refs.lineNumbers;
  acPopup        = refs.acPopup;
  eqTooltip      = refs.eqTooltip;

  // Bind events
  elTextarea.addEventListener('input', onInput);
  elTextarea.addEventListener('keydown', onKeyDown);
  elTextarea.addEventListener('click', onClick);
  elTextarea.addEventListener('keyup', onCursorMove);
  elTextarea.addEventListener('select', onCursorMove);
  elTextarea.addEventListener('scroll', onScroll);
  elTextarea.addEventListener('focus', () => elTextarea.parentElement?.parentElement?.classList.add('focused'));
  elTextarea.addEventListener('blur', () => elTextarea.parentElement?.parentElement?.classList.remove('focused'));
  elTextarea.addEventListener('mousemove', onMouseMove);
  elTextarea.addEventListener('mouseleave', () => hideEqTooltip());

  // Initial value
  elTextarea.value = state.get('code');
  refresh();
  updateCursor();

  // Subscribe to outside changes
  state.on('code', () => {
    if (elTextarea.value !== state.get('code')) {
      elTextarea.value = state.get('code');
    }
    scheduleRefresh();
    scheduleLint();
  });
  state.on('fontSize', applyEditorStyle);
  state.on('lineHeight', applyEditorStyle);
  state.on('wordWrap', () => {
    elTextarea.classList.toggle('wrap', !!state.get('wordWrap'));
    elHighlight.classList.toggle('wrap', !!state.get('wordWrap'));
  });
  state.on('multiCursors', () => renderMultiCursors());
  state.on('lintIssues', () => renderGutter());
  state.on('cursorLine', updateActiveLineMarker);

  applyEditorStyle();
  refreshDocIndex();
  scheduleLint();
}

function applyEditorStyle() {
  const fs = state.get('fontSize');
  const lh = state.get('lineHeight');
  for (const el of [elTextarea, elHighlight, elLineNumbers]) {
    if (!el) continue;
    el.style.fontSize = fs + 'px';
    el.style.lineHeight = lh;
  }
}

/* ─────── Input ─────── */

function onInput(e) {
  const newVal = elTextarea.value;
  // Push undo at gaps
  const now = Date.now();
  if (now - lastUndoTime > 800) {
    pushUndo();
  }
  lastUndoTime = now;
  state.set({ code: newVal, cursorPos: elTextarea.selectionStart });
  // Trigger autocomplete after debounce
  scheduleAutocomplete();
}

function pushUndo() {
  undoStack.push({ code: state.get('code'), caret: elTextarea.selectionStart });
  if (undoStack.length > 200) undoStack.shift();
  redoStack.length = 0;
}

function performUndo() {
  if (undoStack.length === 0) return;
  redoStack.push({ code: state.get('code'), caret: elTextarea.selectionStart });
  const prev = undoStack.pop();
  state.set({ code: prev.code });
  // Restore selection synchronously (textarea.value just changed, which reset selection to end)
  elTextarea.focus();
  const caret = Math.min(prev.caret, prev.code.length);
  elTextarea.setSelectionRange(caret, caret);
  updateCursor();
}

function performRedo() {
  if (redoStack.length === 0) return;
  undoStack.push({ code: state.get('code'), caret: elTextarea.selectionStart });
  const next = redoStack.pop();
  state.set({ code: next.code });
  elTextarea.focus();
  const caret = Math.min(next.caret, next.code.length);
  elTextarea.setSelectionRange(caret, caret);
  updateCursor();
}

/* ─────── Keyboard ─────── */

function onKeyDown(e) {
  const isMod = e.ctrlKey || e.metaKey;
  const start = elTextarea.selectionStart;
  const end = elTextarea.selectionEnd;
  const code = state.get('code');
  const sel = code.slice(start, end);
  const hasMultilineSel = sel.includes('\n');

  // Autocomplete navigation
  if (state.get('showAutocomplete') && state.get('acItems').length > 0) {
    const items = state.get('acItems');
    const acSel = state.get('acSel');
    if (e.key === 'ArrowDown') { e.preventDefault(); state.set({ acSel: (acSel + 1) % items.length }); renderAcPopup(); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); state.set({ acSel: (acSel - 1 + items.length) % items.length }); renderAcPopup(); return; }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      acceptCurrentSuggestion();
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); dismissAutocomplete(); return; }
  }

  // Tab stops (after snippet insertion)
  if (e.key === 'Tab' && !e.shiftKey && acTabStops.length > 0) {
    acTabIndex++;
    if (acTabIndex < acTabStops.length) {
      e.preventDefault();
      const pos = acTabStops[acTabIndex];
      elTextarea.setSelectionRange(pos, pos);
      updateCursor();
      return;
    } else {
      acTabStops = [];
      acTabIndex = 0;
    }
  }

  // Undo/Redo
  if (isMod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); performUndo(); return; }
  if (isMod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); performRedo(); return; }

  // Ctrl+Space: trigger autocomplete
  if (isMod && e.key === ' ') { e.preventDefault(); triggerAutocomplete(); return; }

  // Multi-cursor: Esc clears extras
  const mc = state.get('multiCursors');
  if (e.key === 'Escape' && mc.length > 0) {
    e.preventDefault();
    state.set({ multiCursors: [] });
    return;
  }

  // Multi-cursor: type a regular character at all cursors
  if (mc.length > 0 && !isMod && !e.altKey && e.key.length === 1) {
    e.preventDefault();
    const positions = [...mc, start].sort((a, b) => b - a); // desc
    let newCode = code;
    for (const p of positions) {
      newCode = newCode.slice(0, p) + e.key + newCode.slice(p);
    }
    pushUndo();
    state.set({ code: newCode });
    // Shift cursor positions by accumulated insertions (1 per cursor at-or-before)
    const shifted = mc.map(p => {
      const insertsBefore = positions.filter(x => x < p).length;
      return p + insertsBefore + (p < start ? 0 : 1);
    });
    const insertsBeforeMain = positions.filter(x => x < start).length;
    setTimeout(() => {
      elTextarea.setSelectionRange(start + insertsBeforeMain + 1, start + insertsBeforeMain + 1);
      state.set({ multiCursors: shifted });
    }, 0);
    return;
  }
  // Multi-cursor: Backspace at all cursors
  if (mc.length > 0 && e.key === 'Backspace' && !isMod) {
    e.preventDefault();
    const positions = [...mc, start].filter(p => p > 0).sort((a, b) => b - a);
    if (positions.length === 0) return;
    let newCode = code;
    for (const p of positions) newCode = newCode.slice(0, p - 1) + newCode.slice(p);
    pushUndo();
    state.set({ code: newCode });
    const shifted = mc.map(p => {
      const removedBefore = positions.filter(x => x <= p).length;
      return Math.max(0, p - removedBefore);
    });
    const removedBeforeMain = positions.filter(x => x <= start).length;
    setTimeout(() => {
      const np = Math.max(0, start - removedBeforeMain);
      elTextarea.setSelectionRange(np, np);
      state.set({ multiCursors: shifted });
    }, 0);
    return;
  }

  // Tab / Shift-Tab
  if (e.key === 'Tab') {
    e.preventDefault();
    if (e.shiftKey) {
      const lineStart = code.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = end + (code.slice(end).match(/^[^\n]*/) || [''])[0].length;
      const block = code.slice(lineStart, lineEnd);
      const newBlock = block.split('\n').map(l => l.replace(/^ {1,2}/, '')).join('\n');
      const removed = block.length - newBlock.length;
      pushUndo();
      const newCode = code.slice(0, lineStart) + newBlock + code.slice(lineEnd);
      state.set({ code: newCode });
      setTimeout(() => {
        const ns = Math.max(lineStart, start - Math.min(2, start - lineStart));
        const ne = end - removed;
        elTextarea.setSelectionRange(ns, ne);
      }, 0);
      return;
    }
    if (hasMultilineSel) {
      const lineStart = code.lastIndexOf('\n', start - 1) + 1;
      const block = code.slice(lineStart, end);
      const newBlock = block.split('\n').map(l => '  ' + l).join('\n');
      pushUndo();
      const newCode = code.slice(0, lineStart) + newBlock + code.slice(end);
      state.set({ code: newCode });
      setTimeout(() => elTextarea.setSelectionRange(start + 2, end + (newBlock.length - block.length)), 0);
      return;
    }
    pushUndo();
    const newCode = code.slice(0, start) + '  ' + code.slice(end);
    state.set({ code: newCode });
    setTimeout(() => elTextarea.setSelectionRange(start + 2, start + 2), 0);
    return;
  }

  // Smart Enter
  if (e.key === 'Enter' && !e.shiftKey && !isMod) {
    const lineStart = code.lastIndexOf('\n', start - 1) + 1;
    const curLine = code.slice(lineStart, start);
    const itemMatch = curLine.match(/^(\s*)\\item(\s*)/);
    const indentMatch = curLine.match(/^(\s+)/);
    if (itemMatch) {
      const afterItem = curLine.slice(itemMatch[0].length);
      if (afterItem.trim() === '' && start === lineStart + curLine.length) {
        // Empty \item — exit the list. Find which environment we're in.
        // Walk backwards through code looking for the most recent unclosed \begin{...}
        // that takes \item (itemize, enumerate, description).
        e.preventDefault();
        const before = code.slice(0, lineStart);
        const beginRe = /\\begin\{(itemize|enumerate|description)\}/g;
        const endRe = /\\end\{(itemize|enumerate|description)\}/g;
        const begins = [...before.matchAll(beginRe)];
        const ends = [...before.matchAll(endRe)];
        // Stack-match to find current open env
        const stack = [];
        const events = [
          ...begins.map(m => ({ pos: m.index, type: 'begin', env: m[1] })),
          ...ends.map(m => ({ pos: m.index, type: 'end', env: m[1] })),
        ].sort((a, b) => a.pos - b.pos);
        for (const ev of events) {
          if (ev.type === 'begin') stack.push(ev.env);
          else if (stack[stack.length - 1] === ev.env) stack.pop();
        }
        const currentEnv = stack[stack.length - 1];
        const indent = itemMatch[1];
        pushUndo();
        let replacement;
        if (currentEnv) {
          // Replace the empty \item line with \end{currentEnv}
          // Use indent of \begin{currentEnv} if we can find it; else use \item indent minus 2 spaces.
          const lastBeginIdx = before.lastIndexOf('\\begin{' + currentEnv + '}');
          let envIndent = indent.replace(/  $/, ''); // outdent by 2
          if (lastBeginIdx !== -1) {
            const beginLineStart = before.lastIndexOf('\n', lastBeginIdx - 1) + 1;
            const beginLine = before.slice(beginLineStart, lastBeginIdx);
            const m = beginLine.match(/^(\s*)/);
            if (m) envIndent = m[1];
          }
          replacement = envIndent + '\\end{' + currentEnv + '}\n';
        } else {
          replacement = ''; // not in a list env, just delete the empty item
        }
        const newCode = code.slice(0, lineStart) + replacement + code.slice(start);
        state.set({ code: newCode });
        const newCaret = lineStart + replacement.length;
        elTextarea.focus();
        elTextarea.setSelectionRange(newCaret, newCaret);
        updateCursor();
        return;
      }
      e.preventDefault();
      pushUndo();
      const insert = '\n' + itemMatch[1] + '\\item ';
      const newCode = code.slice(0, start) + insert + code.slice(end);
      state.set({ code: newCode });
      const np = start + insert.length;
      elTextarea.focus();
      elTextarea.setSelectionRange(np, np);
      updateCursor();
      return;
    }
    if (indentMatch && start === end) {
      e.preventDefault();
      pushUndo();
      const insert = '\n' + indentMatch[1];
      const newCode = code.slice(0, start) + insert + code.slice(end);
      state.set({ code: newCode });
      const np = start + insert.length;
      elTextarea.focus();
      elTextarea.setSelectionRange(np, np);
      updateCursor();
      return;
    }
  }

  // Auto-close brackets
  const pairs = { '{': '}', '[': ']', '(': ')', '$': '$' };
  if (pairs[e.key] && !isMod) {
    // Don't auto-close $ if user is typing \$ (literal dollar sign)
    if (e.key === '$' && start > 0 && code[start - 1] === '\\') {
      // Let the natural insert proceed (no preventDefault)
    } else if (sel.length > 0 && !hasMultilineSel) {
      e.preventDefault();
      pushUndo();
      const open = e.key, close = pairs[e.key];
      const newCode = code.slice(0, start) + open + sel + close + code.slice(end);
      state.set({ code: newCode });
      elTextarea.setSelectionRange(start + 1, end + 1);
      updateCursor();
      return;
    } else if (sel.length === 0) {
      const next = code[start];
      if (e.key === '$' && next === '$') return;
      e.preventDefault();
      pushUndo();
      const open = e.key, close = pairs[e.key];
      const newCode = code.slice(0, start) + open + close + code.slice(end);
      state.set({ code: newCode });
      elTextarea.setSelectionRange(start + 1, start + 1);
      updateCursor();
      return;
    }
  }
  // Skip closer if next char matches
  const closers = { '}': true, ']': true, ')': true };
  if (closers[e.key] && !isMod && sel.length === 0 && code[start] === e.key) {
    e.preventDefault();
    elTextarea.setSelectionRange(start + 1, start + 1);
    updateCursor();
    return;
  }
  // Backspace removes empty pair
  if (e.key === 'Backspace' && !isMod && sel.length === 0 && start > 0) {
    const prev = code[start - 1];
    const next = code[start];
    if (pairs[prev] && pairs[prev] === next) {
      e.preventDefault();
      pushUndo();
      const newCode = code.slice(0, start - 1) + code.slice(start + 1);
      state.set({ code: newCode });
      elTextarea.setSelectionRange(start - 1, start - 1);
      updateCursor();
      return;
    }
  }

  // Mod shortcuts (specific to editor)
  if (isMod) {
    switch (e.key.toLowerCase()) {
      case 'b': e.preventDefault(); wrapSelection('\\textbf{', '}'); return;
      case 'i': e.preventDefault(); wrapSelection('\\textit{', '}'); return;
      case 'u': e.preventDefault(); wrapSelection('\\underline{', '}'); return;
      case '/': e.preventDefault(); toggleComment(); return;
      case 'd': e.preventDefault(); duplicateLine(); return;
      case 'l': e.preventDefault(); selectLine(); return;
      case 'g': e.preventDefault(); bus.emit(e.shiftKey ? 'find:prev' : 'find:next'); return;
    }
  }
}

function onClick(e) {
  if (e.altKey) {
    // Alt+Click adds extra cursor
    e.preventDefault();
    const pos = elTextarea.selectionStart;
    const mc = state.get('multiCursors');
    const exists = mc.some(p => Math.abs(p - pos) < 2);
    let next;
    if (exists) next = mc.filter(p => Math.abs(p - pos) >= 2);
    else next = [...mc, pos].slice(-7); // keep at most 7 + main = 8
    state.set({ multiCursors: next });
    return;
  }
  dismissAutocomplete();
  hideEqTooltip();
  updateCursor();
}

function onCursorMove() {
  updateCursor();
}

function updateCursor() {
  const start = elTextarea.selectionStart;
  const code = state.get('code');
  const before = code.slice(0, start).split('\n');
  state.set({
    cursorPos: start,
    cursorLine: before.length,
    cursorCol: before[before.length - 1].length + 1,
  });
  renderMultiCursors();
  // Cheap update of "active" line-number highlight (no DOM rebuild)
  updateActiveLineMarker();
}

let _lastActiveLn = -1;
function updateActiveLineMarker() {
  if (!elLineNumbers) return;
  const ln = state.get('cursorLine');
  if (ln === _lastActiveLn) return;
  const spans = elLineNumbers.querySelectorAll('.ln');
  if (_lastActiveLn > 0 && spans[_lastActiveLn - 1]) spans[_lastActiveLn - 1].classList.remove('active');
  if (spans[ln - 1]) spans[ln - 1].classList.add('active');
  _lastActiveLn = ln;
}

function onScroll() {
  if (elHighlight) {
    elHighlight.scrollTop = elTextarea.scrollTop;
    elHighlight.scrollLeft = elTextarea.scrollLeft;
  }
  if (elLineNumbers) {
    elLineNumbers.scrollTop = elTextarea.scrollTop;
  }
  bus.emit('editor:scroll', { scrollTop: elTextarea.scrollTop });
}

/* ─────── Helpers ─────── */

function wrapSelection(open, close) {
  const start = elTextarea.selectionStart, end = elTextarea.selectionEnd;
  const code = state.get('code');
  const sel = code.slice(start, end);
  pushUndo();
  const insert = open + sel + close;
  const newCode = code.slice(0, start) + insert + code.slice(end);
  state.set({ code: newCode });
  setTimeout(() => {
    if (sel.length === 0) {
      const p = start + open.length;
      elTextarea.setSelectionRange(p, p);
    } else {
      elTextarea.setSelectionRange(start + open.length, start + open.length + sel.length);
    }
  }, 0);
}

function toggleComment() {
  const start = elTextarea.selectionStart, end = elTextarea.selectionEnd;
  const code = state.get('code');
  const lineStart = code.lastIndexOf('\n', start - 1) + 1;
  const blockEnd = end > lineStart ? end : (code.indexOf('\n', start) === -1 ? code.length : code.indexOf('\n', start));
  const block = code.slice(lineStart, blockEnd);
  const allCommented = block.split('\n').every(l => l.trim() === '' || l.trimStart().startsWith('%'));
  const newBlock = block.split('\n').map(l => {
    if (l.trim() === '') return l;
    if (allCommented) return l.replace(/^(\s*)% ?/, '$1');
    return l.replace(/^(\s*)/, '$1% ');
  }).join('\n');
  pushUndo();
  state.set({ code: code.slice(0, lineStart) + newBlock + code.slice(blockEnd) });
}

function duplicateLine() {
  const start = elTextarea.selectionStart;
  const code = state.get('code');
  const lineStart = code.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = code.indexOf('\n', start);
  const realEnd = lineEnd === -1 ? code.length : lineEnd;
  const line = code.slice(lineStart, realEnd);
  pushUndo();
  state.set({ code: code.slice(0, realEnd) + '\n' + line + code.slice(realEnd) });
  setTimeout(() => elTextarea.setSelectionRange(start + line.length + 1, start + line.length + 1), 0);
}

function selectLine() {
  const start = elTextarea.selectionStart;
  const code = state.get('code');
  const lineStart = code.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = code.indexOf('\n', start);
  const realEnd = lineEnd === -1 ? code.length : lineEnd;
  elTextarea.setSelectionRange(lineStart, realEnd);
}

/* ─────── Render syntax highlight + line numbers ─────── */

let _refreshScheduled = false;
function scheduleRefresh() {
  if (_refreshScheduled) return;
  _refreshScheduled = true;
  requestAnimationFrame(() => {
    _refreshScheduled = false;
    refresh();
  });
}

let _lastLineCount = 0;
let _lastIssuesKey = '';

function refresh() {
  const code = state.get('code');
  // Highlight - dominant cost on big docs
  elHighlight.innerHTML = highlightLatex(code);
  // Line numbers - only rebuild if line count changed OR issues changed
  const lines = code.split('\n').length;
  const issues = state.get('lintIssues') || [];
  const issuesKey = issues.map(i => i.line + ':' + i.severity).join(',');
  if (lines !== _lastLineCount || issuesKey !== _lastIssuesKey) {
    const issuesByLine = {};
    for (const iss of issues) {
      if (!issuesByLine[iss.line] || iss.severity === 'error') issuesByLine[iss.line] = iss.severity;
    }
    const cur = state.get('cursorLine');
    let html = '';
    for (let i = 1; i <= lines; i++) {
      const sev = issuesByLine[i];
      const cls = 'ln' + (i === cur ? ' active' : '') + (sev === 'error' ? ' error' : sev === 'warn' ? ' warn' : '');
      html += '<span class="' + cls + '">' + i + '</span>';
    }
    elLineNumbers.innerHTML = html;
    _lastActiveLn = cur;
    _lastLineCount = lines;
    _lastIssuesKey = issuesKey;
  }
  // Doc index (labels, cites, outline) doesn't need to be fresh per keystroke
  scheduleDocIndex();
  bus.emit('editor:changed', { code });
}

let _docIndexTimer = null;
function scheduleDocIndex() {
  if (_docIndexTimer) clearTimeout(_docIndexTimer);
  _docIndexTimer = setTimeout(refreshDocIndex, 400);
}

function refreshDocIndex() {
  const idx = buildDocIndex(state.get('code'), state.get('images'), state.get('bibliography'));
  bus.emit('docIndex', idx);
  state.set({ outline: parseOutline(state.get('code')) });
}

function renderGutter() {
  // Cheap path: only update line-number error/warn markers without re-rendering the whole highlight.
  if (!elLineNumbers) return;
  const issues = state.get('lintIssues') || [];
  const sevMap = {};
  for (const iss of issues) {
    if (!sevMap[iss.line] || iss.severity === 'error') sevMap[iss.line] = iss.severity;
  }
  const spans = elLineNumbers.querySelectorAll('.ln');
  spans.forEach((sp, i) => {
    const ln = i + 1;
    sp.classList.remove('error', 'warn');
    if (sevMap[ln] === 'error') sp.classList.add('error');
    else if (sevMap[ln] === 'warn') sp.classList.add('warn');
  });
}

function scheduleLint() {
  if (lintTimer) clearTimeout(lintTimer);
  lintTimer = setTimeout(() => {
    const issues = lintLatex(state.get('code'));
    state.set({ lintIssues: issues });
  }, 500);
}

/* ─────── Multi-cursor visuals ─────── */

function renderMultiCursors() {
  if (!elTextarea.parentElement) return;
  const stage = elTextarea.parentElement;
  // Clear old multi-carets
  stage.querySelectorAll('.multi-caret').forEach(n => n.remove());
  const mc = state.get('multiCursors');
  if (mc.length === 0) return;
  const code = state.get('code');
  const fs = state.get('fontSize');
  const lh = parseFloat(state.get('lineHeight'));
  const lineH = fs * lh;
  const charW = fs * 0.6; // approx for monospace
  const padTop = 14, padLeft = 14;
  for (const pos of mc) {
    const before = code.slice(0, pos).split('\n');
    const line = before.length - 1;
    const col = before[before.length - 1].length;
    const div = document.createElement('div');
    div.className = 'multi-caret';
    div.style.left = (padLeft + col * charW - elTextarea.scrollLeft) + 'px';
    div.style.top = (padTop + line * lineH - elTextarea.scrollTop) + 'px';
    div.style.height = lineH + 'px';
    stage.appendChild(div);
  }
}

/* ─────── Autocomplete plumbing ─────── */

let acTimer = null;
function scheduleAutocomplete() {
  if (!state.get('autocompleteEnabled')) { dismissAutocomplete(); return; }
  if (acTimer) clearTimeout(acTimer);
  acTimer = setTimeout(triggerAutocomplete, 100);
}

function triggerAutocomplete() {
  if (!state.get('autocompleteEnabled')) return;
  const code = state.get('code');
  const caret = elTextarea.selectionStart;
  const trigger = detectTrigger(code, caret);
  if (!trigger) { dismissAutocomplete(); return; }
  const docIndex = buildDocIndex(code, state.get('images'), state.get('bibliography'));
  const items = buildItems(trigger, docIndex);
  if (items.length === 0) { dismissAutocomplete(); return; }
  // Position popup at caret
  const before = code.slice(0, caret).split('\n');
  const line = before.length - 1;
  const col = before[before.length - 1].length;
  const fs = state.get('fontSize');
  const lh = parseFloat(state.get('lineHeight'));
  const lineH = fs * lh;
  const charW = fs * 0.6;
  const padLeft = 14, padTop = 14;
  state.set({
    showAutocomplete: true,
    acItems: items,
    acSel: 0,
    acTrigger: trigger,
    acPos: {
      left: Math.min(padLeft + col * charW - elTextarea.scrollLeft, 600),
      top: padTop + (line + 1) * lineH - elTextarea.scrollTop + 4,
    },
  });
  renderAcPopup();
}

function renderAcPopup() {
  if (!acPopup) return;
  if (!state.get('showAutocomplete')) {
    acPopup.style.display = 'none';
    return;
  }
  const items = state.get('acItems');
  const sel = state.get('acSel');
  const pos = state.get('acPos');
  acPopup.style.display = 'flex';
  acPopup.style.left = pos.left + 'px';
  acPopup.style.top = pos.top + 'px';
  let html = '<div class="ac-list">';
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const ico = it.kind === 'cmd' ? 'λ' : it.kind === 'env' ? 'ϵ' : it.kind === 'ref' ? '#' : it.kind === 'cite' ? '@' : '✦';
    html += '<div class="ac-item' + (i === sel ? ' active' : '') + '" data-idx="' + i + '">';
    html += '<span class="ac-icon ' + it.kind + '">' + ico + '</span>';
    html += '<span class="ac-name">' + escapeHtml(it.label) + '</span>';
    if (it.desc) html += '<span class="ac-desc">' + escapeHtml(it.desc) + '</span>';
    html += '</div>';
  }
  html += '</div>';
  html += '<div class="ac-foot"><span>↑↓ navigate</span><span>⏎ select</span><span>esc dismiss</span></div>';
  acPopup.innerHTML = html;
  // Attach click handlers
  acPopup.querySelectorAll('.ac-item').forEach(el => {
    el.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      const idx = parseInt(el.dataset.idx, 10);
      state.set({ acSel: idx });
      acceptCurrentSuggestion();
    });
  });
}

function acceptCurrentSuggestion() {
  const items = state.get('acItems');
  const trigger = state.get('acTrigger');
  const sel = state.get('acSel');
  if (!items[sel] || !trigger) return;
  const result = applyItem(state.get('code'), trigger, items[sel]);
  if (!result) return;
  pushUndo();
  state.set({ code: result.newCode });
  acTabStops = result.tabStops || [];
  acTabIndex = 0;
  setTimeout(() => {
    elTextarea.focus();
    elTextarea.setSelectionRange(result.newCaret, result.newCaret);
    updateCursor();
  }, 0);
  dismissAutocomplete();
}

function dismissAutocomplete() {
  state.set({ showAutocomplete: false, acItems: [], acTrigger: null });
  if (acPopup) acPopup.style.display = 'none';
}

/* ─────── Equation hover preview ─────── */

function onMouseMove(e) {
  if (!window.katex) return;
  if (eqHoverTimer) clearTimeout(eqHoverTimer);
  eqHoverTimer = setTimeout(() => {
    const pos = caretPositionFromPoint(e.clientX, e.clientY);
    if (pos < 0) { hideEqTooltip(); return; }
    const code = state.get('code');
    const lineStart = code.lastIndexOf('\n', pos - 1) + 1;
    const lineEnd = code.indexOf('\n', pos);
    const realEnd = lineEnd === -1 ? code.length : lineEnd;
    const line = code.slice(lineStart, realEnd);
    const local = pos - lineStart;
    // Find $..$ regions in line
    const segments = [];
    let i = 0, inMath = false, segStart = -1;
    while (i < line.length) {
      if (line[i] === '\\') { i += 2; continue; }
      if (line[i] === '$') {
        if (line[i+1] === '$') { i += 2; continue; }
        if (!inMath) { segStart = i + 1; inMath = true; }
        else { segments.push({ start: segStart, end: i }); inMath = false; }
        i++;
        continue;
      }
      i++;
    }
    const seg = segments.find(s => local >= s.start && local <= s.end);
    if (!seg) { hideEqTooltip(); return; }
    const tex = line.slice(seg.start, seg.end).trim();
    if (!tex || tex.length > 200) { hideEqTooltip(); return; }
    try {
      const html = window.katex.renderToString(tex, { displayMode: false, throwOnError: false, output: 'html', strict: 'ignore' });
      eqTooltip.innerHTML = html;
      eqTooltip.style.left = (e.clientX + 14) + 'px';
      eqTooltip.style.top = (e.clientY + 18) + 'px';
      eqTooltip.style.display = 'block';
    } catch { hideEqTooltip(); }
  }, 280);
}

function caretPositionFromPoint(x, y) {
  // Browsers do not expose textarea caretFromPoint reliably. We approximate
  // by using the highlight overlay (which has the same text content as the textarea).
  if (!elHighlight) return -1;
  try {
    let container = null, offset = 0;
    if (document.caretRangeFromPoint) {
      // Chromium / Safari
      const range = document.caretRangeFromPoint(x, y);
      if (range && range.startContainer) { container = range.startContainer; offset = range.startOffset; }
    } else if (document.caretPositionFromPoint) {
      // Firefox
      const pos = document.caretPositionFromPoint(x, y);
      if (pos && pos.offsetNode) { container = pos.offsetNode; offset = pos.offset; }
    }
    if (!container) return -1;
    let p = 0;
    const walker = document.createTreeWalker(elHighlight, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node === container) return p + offset;
      p += node.textContent.length;
    }
  } catch {}
  return -1;
}

function hideEqTooltip() {
  if (eqTooltip) eqTooltip.style.display = 'none';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ─────── Public ops ─────── */

/** Insert text at cursor (used by toolbar buttons, snippets) */
export function insertAtCursor(openOrText, close) {
  const start = elTextarea.selectionStart, end = elTextarea.selectionEnd;
  const code = state.get('code');
  const sel = code.slice(start, end);
  pushUndo();
  let inserted, newCursor;
  if (close !== undefined) {
    inserted = openOrText + sel + close;
    newCursor = sel.length === 0 ? start + openOrText.length : start + inserted.length;
  } else {
    inserted = openOrText;
    newCursor = start + inserted.length;
  }
  const newCode = code.slice(0, start) + inserted + code.slice(end);
  state.set({ code: newCode });
  setTimeout(() => {
    elTextarea.focus();
    elTextarea.setSelectionRange(newCursor, newCursor);
    updateCursor();
  }, 0);
}

/** Jump to specific line */
export function jumpToLine(line) {
  const code = state.get('code');
  const lines = code.split('\n');
  let pos = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) pos += lines[i].length + 1;
  elTextarea.focus();
  elTextarea.setSelectionRange(pos, pos);
  const fs = state.get('fontSize');
  const lh = parseFloat(state.get('lineHeight'));
  const lineH = fs * lh;
  const containerH = elTextarea.clientHeight;
  const linesVisible = containerH / lineH;
  elTextarea.scrollTop = Math.max(0, (line - linesVisible / 3) * lineH);
  updateCursor();
}

export function getEditorElement() { return elTextarea; }

export { performUndo, performRedo, triggerAutocomplete, dismissAutocomplete, pushUndo };
