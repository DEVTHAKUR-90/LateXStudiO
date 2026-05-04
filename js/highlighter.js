// ═══════════════════════════════════════
// LaTeXStudio v4.0 — highlighter.js
// Hand-written LaTeX tokenizer producing HTML with span class tokens.
// ═══════════════════════════════════════

export function highlightLatex(code) {
  // Tokenize and emit HTML with span classes. Escape HTML chars.
  let out = '';
  let i = 0;
  const len = code.length;
  const esc = (s) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  while (i < len) {
    const c = code[i];
    // Comment to end of line
    if (c === '%' && (i === 0 || code[i - 1] !== '\\')) {
      const eol = code.indexOf('\n', i);
      const end = eol === -1 ? len : eol;
      out += '<span class="tk-comment">' + esc(code.slice(i, end)) + '</span>';
      i = end;
      continue;
    }
    // Backslash command \begin{env} or \cmd
    if (c === '\\') {
      // \begin{...} / \end{...}
      if (code.slice(i, i + 6) === '\\begin' || code.slice(i, i + 4) === '\\end') {
        const isBegin = code[i + 1] === 'b';
        const cmdLen = isBegin ? 6 : 4;
        // optional *
        let j = i + cmdLen;
        if (code[j] === '*') j++;
        if (code[j] === '{') {
          const close = code.indexOf('}', j);
          if (close !== -1) {
            out += '<span class="tk-cmd">' + esc(code.slice(i, j)) + '</span>';
            out += '<span class="tk-brace">{</span><span class="tk-env">' + esc(code.slice(j + 1, close)) + '</span><span class="tk-brace">}</span>';
            i = close + 1;
            continue;
          }
        }
      }
      // Other commands
      let j = i + 1;
      // Special chars after \: \\, \&, \%, \$, \_, \#, \{, \}, \,, etc
      if (j < len && /[a-zA-Z]/.test(code[j])) {
        while (j < len && /[a-zA-Z]/.test(code[j])) j++;
        if (code[j] === '*') j++;
        out += '<span class="tk-cmd">' + esc(code.slice(i, j)) + '</span>';
        i = j;
        continue;
      } else if (j < len) {
        out += '<span class="tk-cmd">' + esc(code.slice(i, j + 1)) + '</span>';
        i = j + 1;
        continue;
      }
    }
    // Math delimiters: $...$ and $$...$$
    if (c === '$' && code[i - 1] !== '\\') {
      const isDouble = code[i + 1] === '$';
      const start = i;
      i += isDouble ? 2 : 1;
      // Find closing
      let endMatch = -1;
      while (i < len) {
        if (code[i] === '$' && code[i - 1] !== '\\') {
          if (isDouble) { if (code[i + 1] === '$') { endMatch = i + 2; break; } i++; }
          else { endMatch = i + 1; break; }
        } else { i++; }
      }
      if (endMatch === -1) endMatch = len;
      // Recursively highlight content inside math but as math color
      const content = code.slice(start, endMatch);
      out += '<span class="tk-math">' + esc(content) + '</span>';
      i = endMatch;
      continue;
    }
    // Braces, brackets
    if (c === '{' || c === '}') {
      out += '<span class="tk-brace">' + c + '</span>';
      i++; continue;
    }
    if (c === '[' || c === ']') {
      out += '<span class="tk-bracket">' + c + '</span>';
      i++; continue;
    }
    // Numbers (simple)
    if (/[0-9]/.test(c) && (i === 0 || /\W/.test(code[i - 1]))) {
      let j = i;
      while (j < len && /[\d.]/.test(code[j])) j++;
      out += '<span class="tk-num">' + code.slice(i, j) + '</span>';
      i = j;
      continue;
    }
    // Default char (escape)
    if (c === '<' || c === '>' || c === '&') out += esc(c);
    else out += c;
    i++;
  }
  // Trailing newline so highlight extends if last line is empty
  return out + '\n';
}

