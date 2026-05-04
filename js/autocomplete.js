// ═══════════════════════════════════════
// LaTeXStudio v4.0 — autocomplete.js
// Context-aware completion engine: \cmd, \begin{env}, \ref{}, \cite{}, snippets.
// Produces popup items, applies tab stops, integrates with bibtex.
// ═══════════════════════════════════════

import { LATEX_COMMANDS, LATEX_ENVIRONMENTS } from './constants.js';

const ARG_COMMANDS = new Set([
  '\\section','\\subsection','\\subsubsection','\\chapter','\\paragraph',
  '\\textbf','\\textit','\\emph','\\underline','\\texttt','\\textsc','\\textsf','\\sout',
  '\\label','\\ref','\\eqref','\\pageref','\\autoref','\\cite','\\citep','\\citet',
  '\\caption','\\footnote','\\index','\\title','\\author','\\date',
  '\\href','\\url','\\textcolor','\\frac','\\sqrt','\\usepackage','\\documentclass',
]);

// Snippets that can be triggered as completions (by short name)
const SNIPPET_TRIGGERS = [
  { name: 'fig', desc: 'Figure environment',
    insert: '\\begin{figure}[H]\n  \\centering\n  \\includegraphics[width=0.7\\textwidth]{$1}\n  \\caption{$2}\n  \\label{fig:$3}\n\\end{figure}' },
  { name: 'tab', desc: 'Tabular table',
    insert: '\\begin{table}[H]\n  \\centering\n  \\begin{tabular}{$1}\n    $2\n  \\end{tabular}\n  \\caption{$3}\n\\end{table}' },
  { name: 'eq', desc: 'Equation',
    insert: '\\begin{equation}\n  $1\n\\end{equation}' },
  { name: 'align', desc: 'Aligned equation',
    insert: '\\begin{align}\n  $1 &= $2 \\\\\n  $3 &= $4\n\\end{align}' },
  { name: 'item', desc: 'Itemize list',
    insert: '\\begin{itemize}\n  \\item $1\n  \\item $2\n\\end{itemize}' },
  { name: 'enum', desc: 'Enumerate list',
    insert: '\\begin{enumerate}\n  \\item $1\n  \\item $2\n\\end{enumerate}' },
];

// Brief documentation for known commands
export const CMD_DOCS = {
  '\\frac': '\\frac{numerator}{denominator}',
  '\\sqrt': '\\sqrt[n]{x} — nth root of x',
  '\\sum': '\\sum_{i=1}^{n} — summation',
  '\\int': '\\int_a^b — definite integral',
  '\\textbf': 'Bold text',
  '\\textit': 'Italic text',
  '\\emph': 'Emphasized text',
  '\\section': 'New section',
  '\\subsection': 'New subsection',
  '\\label': 'Anchor for cross-reference',
  '\\ref': 'Reference a label',
  '\\eqref': 'Reference an equation (parens)',
  '\\cite': 'Cite a bib entry',
  '\\caption': 'Caption for figure/table',
  '\\includegraphics': 'Insert image',
  '\\begin': 'Open environment',
  '\\end': 'Close environment',
  '\\usepackage': 'Load LaTeX package',
};

/**
 * Build doc index of labels, cites, and image filenames.
 * Returns { labels: [{key,line}], cites: [{key,line,desc?}], images: [name] }
 */
export function buildDocIndex(code, images, bibliography) {
  const labels = [];
  const cites = [];
  let m;
  const labelRe = /\\label\{([^}]+)\}/g;
  while ((m = labelRe.exec(code)) !== null) {
    const before = code.slice(0, m.index);
    labels.push({ key: m[1], line: before.split('\n').length });
  }
  const bibRe = /\\bibitem(?:\[[^\]]*\])?\{([^}]+)\}/g;
  while ((m = bibRe.exec(code)) !== null) {
    const before = code.slice(0, m.index);
    cites.push({ key: m[1], line: before.split('\n').length });
  }
  // Merge bibliography
  if (bibliography) {
    const existing = new Set(cites.map(c => c.key));
    for (const key of Object.keys(bibliography)) {
      if (!existing.has(key)) {
        const e = bibliography[key];
        const desc = (e.fields && (e.fields.title || e.fields.author) || '').slice(0, 40);
        cites.push({ key, line: 0, desc, source: 'bib' });
      }
    }
  }
  return {
    labels,
    cites,
    images: (images || []).map(i => i.name),
  };
}

/**
 * Detect autocomplete context at caret. Returns {kind, prefix, replaceFrom, replaceTo} or null.
 */
export function detectTrigger(code, caret) {
  const before = code.slice(Math.max(0, caret - 80), caret);

  // \begin{... or \end{...
  let m = before.match(/\\(begin|end)\{([a-zA-Z*]*)$/);
  if (m) {
    return { kind: 'env', prefix: m[2], replaceFrom: caret - m[2].length, replaceTo: caret };
  }
  // \ref{... or \eqref{... etc
  m = before.match(/\\(?:ref|eqref|pageref|autoref)\{([^},\s]*)$/);
  if (m) {
    return { kind: 'ref', prefix: m[1], replaceFrom: caret - m[1].length, replaceTo: caret };
  }
  // \cite{... \citep{... \citet{...   handles multi-key: \cite{a,b,c|}
  m = before.match(/\\cite[ptn]?\{(?:[^}]*,\s*)*([^},\s]*)$/);
  if (m) {
    return { kind: 'cite', prefix: m[1], replaceFrom: caret - m[1].length, replaceTo: caret };
  }
  // \cmd-prefix
  m = before.match(/\\([a-zA-Z]+\*?)$/);
  if (m) {
    return { kind: 'cmd', prefix: m[1], replaceFrom: caret - m[1].length - 1, replaceTo: caret };
  }
  return null;
}

/**
 * Build autocomplete items given a trigger and document index.
 */
export function buildItems(trigger, docIndex) {
  if (!trigger) return [];
  const lc = trigger.prefix.toLowerCase();
  const items = [];

  if (trigger.kind === 'cmd') {
    // Snippet triggers (match prefix on snippet name)
    for (const sn of SNIPPET_TRIGGERS) {
      if (sn.name.toLowerCase().startsWith(lc)) {
        items.push({
          kind: 'snip', label: sn.name, desc: sn.desc,
          insert: sn.insert, isSnippet: true,
        });
      }
    }
    // Commands
    for (const cmd of LATEX_COMMANDS) {
      const [name, , desc] = cmd;
      if (name.slice(1).toLowerCase().startsWith(lc)) {
        items.push({ kind: 'cmd', label: name, desc: CMD_DOCS[name] || desc, value: name });
      }
    }
  } else if (trigger.kind === 'env') {
    for (const env of LATEX_ENVIRONMENTS) {
      if (env.toLowerCase().startsWith(lc)) {
        items.push({ kind: 'env', label: env, desc: 'environment', value: env });
      }
    }
  } else if (trigger.kind === 'ref') {
    for (const l of docIndex.labels) {
      if (l.key.toLowerCase().includes(lc)) {
        items.push({ kind: 'ref', label: l.key, desc: 'L' + l.line, value: l.key });
      }
    }
  } else if (trigger.kind === 'cite') {
    for (const c of docIndex.cites) {
      if (c.key.toLowerCase().includes(lc)) {
        items.push({ kind: 'cite', label: c.key, desc: c.desc || (c.line ? 'L' + c.line : 'bib'), value: c.key });
      }
    }
  }

  return items.slice(0, 50);
}

/**
 * Apply selected item; returns { newCode, newCaret, tabStops } or null.
 * tabStops is array of caret positions (for $1, $2, ... in snippets).
 */
export function applyItem(code, trigger, item) {
  if (!trigger || !item) return null;
  let inserted = '';
  let caretAfter = 0;
  let tabStops = [];

  if (item.isSnippet) {
    // Parse $1, $2 placeholders
    const raw = item.insert;
    let out = '';
    let i = 0;
    let stopMap = {}; // n -> [start positions in OUT]
    while (i < raw.length) {
      const m = raw.slice(i).match(/^\$(\d+)/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!stopMap[n]) stopMap[n] = [];
        stopMap[n].push(out.length);
        i += m[0].length;
        continue;
      }
      out += raw[i];
      i++;
    }
    inserted = out;
    // Tab-stop offsets relative to insertion start
    const insertionStart = trigger.replaceFrom;
    const sortedNums = Object.keys(stopMap).map(Number).sort((a, b) => a - b);
    for (const n of sortedNums) {
      for (const pos of stopMap[n]) tabStops.push(insertionStart + pos);
    }
    caretAfter = tabStops.length > 0 ? tabStops[0] : trigger.replaceFrom + inserted.length;
  } else if (item.kind === 'cmd') {
    if (ARG_COMMANDS.has(item.value) || item.value === '\\begin' || item.value === '\\end') {
      inserted = item.value + '{}';
      caretAfter = trigger.replaceFrom + item.value.length + 1;
      tabStops = [caretAfter];
    } else {
      inserted = item.value + ' ';
      caretAfter = trigger.replaceFrom + inserted.length;
    }
  } else if (item.kind === 'env') {
    // We're inside \begin{ or \end{, insert env name + close brace
    const before = code.slice(0, trigger.replaceFrom);
    if (before.endsWith('\\begin{')) {
      // Auto-close: \begin{env}\n  cursor \n\end{env}
      const lineStart = code.lastIndexOf('\n', trigger.replaceFrom - 1) + 1;
      const indent = (code.slice(lineStart, trigger.replaceFrom).match(/^\s*/) || [''])[0];
      inserted = item.value + '}\n' + indent + '  \n' + indent + '\\end{' + item.value + '}';
      caretAfter = trigger.replaceFrom + item.value.length + 2 + indent.length + 2;
    } else {
      inserted = item.value + '}';
      caretAfter = trigger.replaceFrom + item.value.length + 1;
    }
  } else if (item.kind === 'ref' || item.kind === 'cite') {
    inserted = item.value;
    caretAfter = trigger.replaceFrom + item.value.length;
  }

  const newCode = code.slice(0, trigger.replaceFrom) + inserted + code.slice(trigger.replaceTo);
  return { newCode, newCaret: caretAfter, tabStops };
}

/**
 * Parse outline (sections, subsections) for sidebar.
 */
export function parseOutline(code) {
  const out = [];
  const lvl = { chapter: 1, section: 2, subsection: 3, subsubsection: 4 };
  const cmdRe = /\\(chapter|section|subsection|subsubsection)\*?\s*\{/g;
  let m;
  while ((m = cmdRe.exec(code)) !== null) {
    const cmd = m[1];
    const startBrace = m.index + m[0].length - 1;
    // Walk balanced braces
    let depth = 1;
    let i = startBrace + 1;
    while (i < code.length && depth > 0) {
      if (code[i] === '{') depth++;
      else if (code[i] === '}') depth--;
      if (depth === 0) break;
      i++;
    }
    let title = code.slice(startBrace + 1, i);
    // Strip simple inline commands inside title (e.g. \textbf{foo} -> foo)
    title = title.replace(/\\[a-zA-Z]+\*?\{([^{}]*)\}/g, '$1').replace(/\\[a-zA-Z]+\*?/g, '').trim();
    const before = code.slice(0, m.index);
    out.push({ level: lvl[cmd], title, line: before.split('\n').length });
  }
  return out;
}
