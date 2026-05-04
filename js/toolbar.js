// ═══════════════════════════════════════
// LaTeXStudio v4.0 — toolbar.js
// Renders the toolbar: group tabs (row 1) + tag buttons (row 2)
// ═══════════════════════════════════════

import { state } from './state.js';
import { TOOLBAR_GROUPS } from './constants.js';
import { insertAtCursor } from './editor.js';

let elTabsRow, elTagsRow;

/** Initialise toolbar — caller passes the two row elements */
export function initToolbar(refs) {
  elTabsRow = refs.tabs;
  elTagsRow = refs.tags;
  state.on('activeGroup', renderTags);
  renderTabs();
  renderTags();
}

function renderTabs() {
  const active = state.get('activeGroup');
  elTabsRow.innerHTML = '';
  TOOLBAR_GROUPS.forEach((g, i) => {
    const b = document.createElement('button');
    b.className = 'group-tab' + (i === active ? ' active' : '');
    b.textContent = g.name;
    b.onclick = () => state.set({ activeGroup: i });
    elTabsRow.appendChild(b);
  });
}

function renderTags() {
  const active = state.get('activeGroup');
  const group = TOOLBAR_GROUPS[active];
  if (!group) return;
  // Re-render group tabs to update active styling
  elTabsRow.querySelectorAll('.group-tab').forEach((b, i) => {
    b.classList.toggle('active', i === active);
  });
  elTagsRow.innerHTML = '';
  for (const tag of group.tags) {
    const b = document.createElement('button');
    b.className = 'tag-btn';
    b.textContent = tag.label;
    if (tag.title) b.title = tag.title;
    b.onclick = () => {
      if (tag.insert !== undefined) insertAtCursor(tag.insert);
      else insertAtCursor(tag.open, tag.close);
    };
    elTagsRow.appendChild(b);
  }
}
