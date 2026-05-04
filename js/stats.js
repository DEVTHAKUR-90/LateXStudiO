// ═══════════════════════════════════════
// LaTeXStudio v4.0 — stats.js
// Document statistics: words, chars, sentences, reading time,
// Flesch reading ease, structure breakdown, word goal tracking.
// ═══════════════════════════════════════

import { state } from './state.js';
import { computeDocStats } from './converter.js';

/** Get current document statistics (recomputed each call) */
export function getStats() {
  return computeDocStats(state.get('code'));
}

/** Categorize Flesch score */
export function fleschCategory(score) {
  if (score >= 70) return { label: 'Easy', cls: 'easy' };
  if (score >= 60) return { label: 'Standard', cls: 'easy' };
  if (score >= 30) return { label: 'Difficult', cls: 'medium' };
  return { label: 'Very Difficult', cls: 'hard' };
}

/** Render the stats panel into a container element */
export function renderStatsPanel(container) {
  const s = getStats();
  const goal = state.get('wordGoal');
  const flesch = fleschCategory(s.flesch || 0);

  const fmtMin = (m) => m < 1 ? '<1' : Math.round(m);
  const fmt = (n) => (n || 0).toLocaleString();

  let html = '';

  // Top quick-stats grid
  html += '<div class="stat-grid">';
  html += card(fmt(s.words), 'Words');
  html += card(fmt(s.chars), 'Characters');
  html += card(fmt(s.sentences), 'Sentences');
  html += card(fmt(s.paragraphs), 'Paragraphs');
  html += card(fmtMin(s.readingMinutes) + '<small> min</small>', 'Reading');
  html += card(fmtMin(s.speakingMinutes) + '<small> min</small>', 'Speaking');
  html += '</div>';

  // Goal
  if (goal > 0) {
    const pct = Math.min(100, Math.round((s.words / goal) * 100));
    html += '<div class="goal-bar-wrap">';
    html += '<div class="settings-toggle-row">';
    html += '<span class="lab">Goal: ' + fmt(s.words) + ' / ' + fmt(goal) + '</span>';
    html += '<span style="color:var(--accent);font-weight:600">' + pct + '%</span>';
    html += '</div>';
    html += '<div class="goal-bar"><div class="goal-bar-fill ' + (s.words >= goal ? 'complete' : '') +
            '" style="width:' + Math.min(100, (s.words / goal) * 100) + '%"></div></div>';
    html += '</div>';
  }

  // Composition
  html += '<div class="section-title">Composition</div>';
  html += rowOpen() + '<span>Sections</span><b>' + s.sections.section + '</b></div>';
  html += rowOpen() + '<span>Subsections</span><b>' + s.sections.subsection + '</b></div>';
  html += rowOpen() + '<span>Sub-subsections</span><b>' + s.sections.subsubsection + '</b></div>';
  if (s.sections.chapter > 0)
    html += rowOpen() + '<span>Chapters</span><b>' + s.sections.chapter + '</b></div>';
  html += rowOpen() + '<span>Display equations</span><b>' + s.equations + '</b></div>';
  html += rowOpen() + '<span>Inline math</span><b>' + s.inlineMath + '</b></div>';
  html += rowOpen() + '<span>Figures</span><b>' + s.figures + '</b></div>';
  html += rowOpen() + '<span>Tables</span><b>' + s.tables + '</b></div>';
  html += rowOpen() + '<span>Citations</span><b>' + s.citations + '</b></div>';
  html += rowOpen() + '<span>Labels</span><b>' + s.labels + '</b></div>';

  // Quality
  html += '<div class="section-title">Quality</div>';
  html += rowOpen() + '<span>Unique words</span><b>' + fmt(s.unique) + '</b></div>';
  html += rowOpen() + '<span>Lexical diversity</span><b>' +
          ((s.lexicalDiversity || 0) * 100).toFixed(1) + '%</b></div>';
  html += rowOpen() + '<span>Avg words / sentence</span><b>' +
          (s.avgWordsPerSentence || 0).toFixed(1) + '</b></div>';
  html += rowOpen() + '<span>Flesch reading ease</span><b>' +
          (s.flesch || 0).toFixed(1) + ' <span class="flesch-badge ' + flesch.cls + '">' +
          flesch.label + '</span></b></div>';

  container.innerHTML = html;
}

function card(num, label) {
  return '<div class="stat-card"><div class="stat-num">' + num + '</div>' +
         '<div class="stat-label">' + label + '</div></div>';
}
function rowOpen() { return '<div class="stat-row">'; }

/** Trigger confetti on goal completion */
export function celebrateConfetti() {
  const root = document.body;
  const wrap = document.createElement('div');
  wrap.className = 'confetti';
  const colors = ['#f59e0b', '#22c55e', '#06b6d4', '#f87171', '#c084fc', '#fbbf24'];
  for (let i = 0; i < 50; i++) {
    const span = document.createElement('span');
    span.style.left = Math.random() * 100 + '%';
    span.style.background = colors[Math.floor(Math.random() * colors.length)];
    span.style.animationDelay = (Math.random() * 0.5) + 's';
    span.style.animationDuration = (1.8 + Math.random() * 1.5) + 's';
    wrap.appendChild(span);
  }
  root.appendChild(wrap);
  setTimeout(() => wrap.remove(), 4000);
}
