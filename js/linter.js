// ═══════════════════════════════════════
// LaTeXStudio v4.0 — linter.js
// Detects environment imbalance, math-delimiter parity, undefined refs,
// missing \documentclass / \begin{document}.
// ═══════════════════════════════════════

export function lintLatex(code) {
  const issues = [];
  const lines = code.split('\n');
  const stack = []; // { env, line }
  // Strip comments first to avoid false positives
  const stripped = lines.map(l => {
    const idx = l.search(/(^|[^\\])%/);
    if (idx === -1) return l;
    // skip if escaped %
    let i = 0;
    while (i < l.length) {
      if (l[i] === '\\' && l[i + 1] === '%') { i += 2; continue; }
      if (l[i] === '%') return l.slice(0, i);
      i++;
    }
    return l;
  });
  // Track environment balance
  for (let li = 0; li < stripped.length; li++) {
    const line = stripped[li];
    let m;
    const beginRe = /\\begin\{([^}]+)\}/g;
    while ((m = beginRe.exec(line)) !== null) {
      stack.push({ env: m[1].replace(/\*$/, ''), line: li + 1, col: m.index + 1 });
    }
    const endRe = /\\end\{([^}]+)\}/g;
    while ((m = endRe.exec(line)) !== null) {
      const env = m[1].replace(/\*$/, '');
      if (stack.length === 0) {
        issues.push({ severity: 'error', line: li + 1, col: m.index + 1, msg: `\\end{${env}} without matching \\begin` });
      } else {
        const top = stack[stack.length - 1];
        if (top.env !== env) {
          issues.push({ severity: 'error', line: li + 1, col: m.index + 1, msg: `Expected \\end{${top.env}}, got \\end{${env}}` });
        }
        stack.pop();
      }
    }
  }
  for (const s of stack) {
    issues.push({ severity: 'error', line: s.line, col: s.col, msg: `Unclosed \\begin{${s.env}}` });
  }
  // Brace balance per line (informational; LaTeX allows multi-line braces, but flagrant mismatch helps)
  // Math delimiter balance
  let dollarCount = 0;
  for (let li = 0; li < stripped.length; li++) {
    const line = stripped[li];
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '\\') { i++; continue; }
      if (line[i] === '$') {
        if (line[i + 1] === '$') { i++; continue; } // display math, balanced separately
        dollarCount++;
      }
    }
  }
  if (dollarCount % 2 !== 0) {
    issues.push({ severity: 'warn', line: stripped.length, col: 1, msg: 'Unmatched $ (odd inline math delimiters)' });
  }
  // Document basics
  if (!/\\documentclass\b/.test(code)) {
    issues.push({ severity: 'warn', line: 1, col: 1, msg: 'No \\documentclass declared' });
  }
  if (!/\\begin\{document\}/.test(code)) {
    issues.push({ severity: 'warn', line: 1, col: 1, msg: 'No \\begin{document} found' });
  }
  // Check for cited but undefined refs / referenced labels
  const labels = new Set();
  const labelRe = /\\label\{([^}]+)\}/g;
  let lm;
  while ((lm = labelRe.exec(code)) !== null) labels.add(lm[1]);
  const refsUsed = new Set();
  const refRe = /\\(?:ref|eqref|pageref|autoref)\{([^}]+)\}/g;
  while ((lm = refRe.exec(code)) !== null) {
    if (!labels.has(lm[1])) {
      const before = code.slice(0, lm.index);
      const ln = before.split('\n').length;
      issues.push({ severity: 'warn', line: ln, col: 1, msg: `Reference to undefined label: ${lm[1]}` });
    }
    refsUsed.add(lm[1]);
  }
  // Includegraphics warns (unresolved image)
  return issues.slice(0, 50); // cap
}

