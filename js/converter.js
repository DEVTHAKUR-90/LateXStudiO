// ═══════════════════════════════════════
// LaTeXStudio v4.0 — converter.js
// LaTeX → HTML converter (brace-matching, KaTeX-aware), Markdown/Text exporters,
// helpers (sanitize, base64-decode, env balance), diff, doc stats, print HTML.
// ═══════════════════════════════════════

/* eslint-disable */

export function sanitizeName(name, ext) {
  let cleanName = name.replace(/\.[^/.]+$/, ''); // strip current ext
  cleanName = cleanName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
  if (!cleanName) cleanName = 'image';
  cleanName = cleanName.slice(0, 60);
  const e = (ext || '').toLowerCase().replace(/^\./, '');
  return cleanName + (e ? '.' + e : '');
}

export function base64ToBinary(b64) {
  const clean = (b64 || '').replace(/^data:[^;]+;base64,/, '');
  const bin = atob(clean);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

export function checkEnvBalance(code) {
  const stack = [];
  const unmatched = [];
  const re = /\\(begin|end)\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    if (m[1] === 'begin') stack.push(m[2]);
    else {
      if (stack.length === 0) {
        unmatched.push('end{' + m[2] + '} (no \\begin)');
      } else if (stack[stack.length - 1] !== m[2]) {
        unmatched.push('expected end{' + stack[stack.length - 1] + '}, got end{' + m[2] + '}');
        stack.pop();
      } else {
        stack.pop();
      }
    }
  }
  for (const env of stack) unmatched.push('begin{' + env + '} (no \\end)');
  return { balanced: unmatched.length === 0, unmatched };
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ============ DIFF (Myers-style LCS for line diff) ============ */
export function lineDiff(a, b) {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  // Build LCS table
  const n = aLines.length, m = bLines.length;
  // For very large documents, fall back to simple non-LCS (mark all changed)
  if (n * m > 1_000_000) {
    return aLines.map(l => ({ type: 'rem', text: l }))
      .concat(bLines.map(l => ({ type: 'add', text: l })));
  }
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (aLines[i - 1] === bLines[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  // Backtrack
  const out = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aLines[i - 1] === bLines[j - 1]) {
      out.push({ type: 'eq', text: aLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      out.push({ type: 'add', text: bLines[j - 1] });
      j--;
    } else {
      out.push({ type: 'rem', text: aLines[i - 1] });
      i--;
    }
  }
  return out.reverse();
}

/* ============ DOCUMENT STATISTICS ============ */
export function computeDocStats(code) {
  // Strip preamble
  let body = code;
  const docStart = body.indexOf('\\begin{document}');
  if (docStart !== -1) {
    const docEnd = body.indexOf('\\end{document}', docStart);
    body = docEnd !== -1 ? body.slice(docStart + 16, docEnd) : body.slice(docStart + 16);
  }
  // Strip comments, math, code
  body = body.replace(/(^|[^\\])%.*$/gm, '$1')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ').replace(/\$[^$\n]*\$/g, ' ')
    .replace(/\\\[[\s\S]*?\\\]/g, ' ').replace(/\\\([\s\S]*?\\\)/g, ' ')
    .replace(/\\begin\{(equation|align|gather|multline)\*?\}[\s\S]*?\\end\{\1\*?\}/g, ' ')
    .replace(/\\begin\{verbatim\}[\s\S]*?\\end\{verbatim\}/g, ' ')
    .replace(/\\begin\{lstlisting\}[\s\S]*?\\end\{lstlisting\}/g, ' ');
  // Strip commands (keep arg content inside braces)
  body = body.replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?/g, ' ');
  body = body.replace(/[{}\\]/g, ' ');
  const words = (body.match(/\b[\w'-]+\b/g) || []);
  const chars = body.replace(/\s+/g, ' ').trim().length;
  const sentences = (body.match(/[.!?]+(?=\s|$)/g) || []).length || 1;
  const paragraphs = (body.split(/\n\s*\n/).filter(p => p.trim()).length) || 1;
  // Vocabulary diversity
  const lc = words.map(w => w.toLowerCase());
  const unique = new Set(lc).size;
  // Reading & speaking times
  const readingMinutes = words.length / 230; // avg adult
  const speakingMinutes = words.length / 130;
  // Flesch reading ease (rough)
  const syllableCount = lc.reduce((sum, w) => sum + Math.max(1, (w.match(/[aeiouy]+/g) || []).length), 0);
  const flesch = 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syllableCount / Math.max(1, words.length));
  // Section breakdown
  const sectionRe = /\\(chapter|section|subsection|subsubsection)\*?\s*\{/g;
  const sections = { chapter: 0, section: 0, subsection: 0, subsubsection: 0 };
  let m;
  while ((m = sectionRe.exec(code)) !== null) sections[m[1]]++;
  // Equations / figures / tables
  const equations = (code.match(/\\begin\{(?:equation|align|gather|multline)\*?\}/g) || []).length
    + (code.match(/\\\[/g) || []).length;
  const inlineMath = (code.match(/\$[^$\n]+\$/g) || []).length;
  const figures = (code.match(/\\begin\{figure\*?\}/g) || []).length;
  const tables = (code.match(/\\begin\{(?:table|tabular)\*?\}/g) || []).length;
  const citations = (code.match(/\\cite[a-z]*\{/g) || []).length;
  const labels = (code.match(/\\label\{/g) || []).length;
  return {
    words: words.length, chars, sentences, paragraphs, unique,
    readingMinutes, speakingMinutes, flesch,
    sections, equations, inlineMath, figures, tables, citations, labels,
    avgWordsPerSentence: words.length / sentences,
    lexicalDiversity: words.length === 0 ? 0 : unique / words.length,
  };
}

/* ============ PRINT-TO-PDF EXPORT ============ */
export function buildPrintHTML(htmlBody, projectName) {
  const safeTitle = (projectName || 'Document').replace(/[<>]/g, '');
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + safeTitle + '</title>'
    + '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">'
    + '<style>'
    + 'body{font-family:Georgia,"Times New Roman",serif;color:#000;background:#fff;'
    + 'max-width:7in;margin:1in auto;padding:0 0.5in;line-height:1.6;font-size:11pt}'
    + 'h1{font-size:24pt;margin-top:0;text-align:center}h2{font-size:16pt;margin-top:24pt;border-bottom:1px solid #999;padding-bottom:4pt}'
    + 'h3{font-size:13pt;margin-top:18pt}h4{font-size:12pt;margin-top:14pt}'
    + 'p{margin:0 0 8pt;text-align:justify}'
    + 'table{border-collapse:collapse;margin:12pt auto;width:auto}td,th{border:1px solid #444;padding:4pt 8pt}'
    + 'th{background:#eee}'
    + 'figure{text-align:center;margin:14pt 0}figure img{max-width:100%}figcaption{font-style:italic;font-size:10pt;color:#444;margin-top:4pt}'
    + 'pre,code{font-family:"Menlo","Courier New",monospace;background:#f4f4f4;padding:2pt 4pt;border-radius:3px;font-size:10pt}'
    + 'pre{padding:8pt;overflow:auto;border:1px solid #ddd}'
    + 'blockquote{border-left:3px solid #999;padding-left:12pt;margin-left:0;color:#444;font-style:italic}'
    + 'a{color:#0066cc;text-decoration:none}.toc{margin:0 0 24pt}'
    + '@page{margin:1in;size:letter}@media print{body{margin:0;max-width:none;padding:0}}'
    + '</sty' + 'le></head><body>'
    // NOTE: split tag literals to avoid breaking the host page's <script> when this JSX is embedded.
    + '<scr' + 'ipt>setTimeout(function(){window.print();},800);</scr' + 'ipt>'
    + htmlBody + '</bo' + 'dy></html>';
}

/* ============ FUZZY MATCH (subsequence-based scoring) ============ */
export function fuzzyScore(query, text) {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let score = 0;
  let qi = 0;
  let consecutive = 0;
  let firstMatch = -1;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      if (firstMatch === -1) firstMatch = ti;
      consecutive++;
      let bonus = 1 + consecutive * 2;
      if (ti === 0 || /[\s\-_./›]/.test(t[ti - 1])) bonus += 5;
      if (text[ti] && text[ti] === text[ti].toUpperCase() && text[ti] !== text[ti].toLowerCase()) bonus += 2;
      score += bonus;
      qi++;
    } else {
      consecutive = 0;
    }
  }
  if (qi < q.length) return -1;
  score -= firstMatch * 0.1;
  score -= (t.length - q.length) * 0.05;
  return score;
}

export function fuzzyMatchIndices(query, text) {
  if (!query) return [];
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const idx = [];
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) { idx.push(ti); qi++; }
  }
  return qi === q.length ? idx : [];
}

export function highlightFuzzyMatch(text, indices) {
  if (!indices || indices.length === 0) return escapeHtml(text);
  let out = '';
  let lastIdx = 0;
  for (const i of indices) {
    out += escapeHtml(text.slice(lastIdx, i));
    out += '<span class="match">' + escapeHtml(text[i]) + '</span>';
    lastIdx = i + 1;
  }
  out += escapeHtml(text.slice(lastIdx));
  return out;
}

/* ============ BIBTEX PARSER ============ */
export function parseBibtex(src) {
  if (!src) return [];
  const entries = [];
  const re = /@(\w+)\s*\{\s*([^,\s]+)\s*,([\s\S]*?)\n?\s*\}\s*(?=@|\s*$)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const type = m[1].toLowerCase();
    if (type === 'comment' || type === 'preamble' || type === 'string') continue;
    const key = m[2].trim();
    const fieldsRaw = m[3];
    const fields = {};
    const fieldRe = /(\w+)\s*=\s*(\{(?:[^{}]|\{[^{}]*\})*\}|"[^"]*"|[^,\n]+)/g;
    let f;
    while ((f = fieldRe.exec(fieldsRaw)) !== null) {
      const name = f[1].toLowerCase();
      let val = f[2].trim().replace(/,$/, '').trim();
      if (val.startsWith('{') && val.endsWith('}')) val = val.slice(1, -1);
      else if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      fields[name] = val.replace(/\s+/g, ' ').trim();
    }
    entries.push({ type, key, fields });
  }
  return entries;
}

/* ============ EDITOR ↔ PREVIEW SCROLL MAPPING ============ */
export function buildLineToOutputMap(code) {
  // Track which source line produces which approximate "output offset"
  // simple heuristic: count visible lines (excluding preamble/comments)
  const lines = code.split('\n');
  let inDoc = false;
  let outOffset = 0;
  const map = new Array(lines.length);
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (ln.includes('\\begin{document}')) { inDoc = true; map[i] = outOffset; continue; }
    if (ln.includes('\\end{document}')) { map[i] = outOffset; inDoc = false; continue; }
    if (!inDoc) { map[i] = 0; continue; }
    // Skip pure-blank or pure-comment lines
    const stripped = ln.replace(/(^|[^\\])%.*$/, '$1').trim();
    if (stripped) outOffset++;
    map[i] = outOffset;
  }
  return { map, total: outOffset };
}

/* ============ LATEX → HTML CONVERTER (robust, brace-matching) ============ */

// Walk forward from index `i` (which must point AT '{') and return [content, indexAfterClose].
export function readBraceArg(s, i) {
  if (s[i] !== '{') return ['', i];
  let depth = 1, j = i + 1;
  while (j < s.length && depth > 0) {
    const c = s[j];
    if (c === '\\' && j + 1 < s.length) { j += 2; continue; }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    if (depth === 0) break;
    j++;
  }
  return [s.slice(i + 1, j), j + 1];
}

export function readOptArg(s, i) {
  if (s[i] !== '[') return ['', i];
  let depth = 1, j = i + 1;
  while (j < s.length && depth > 0) {
    const c = s[j];
    if (c === '[') depth++;
    else if (c === ']') depth--;
    if (depth === 0) break;
    j++;
  }
  return [s.slice(i + 1, j), j + 1];
}

export function skipWhitespace(s, i) {
  while (i < s.length && (s[i] === ' ' || s[i] === '\t')) i++;
  return i;
}

// Commands that take args but produce no visible output. Strip cleanly.
export const NOOP_COMMANDS = new Set([
  'documentclass','usepackage','usetikzlibrary','tcbuselibrary','RequirePackage',
  'pagenumbering','setcounter','addtocounter','stepcounter','refstepcounter',
  'addcontentsline','addtocontents','tableofcontents','listoftables','listoffigures',
  'pagestyle','thispagestyle','fancyhead','fancyfoot','fancyhf','lhead','rhead','chead',
  'lfoot','rfoot','cfoot','headrulewidth','footrulewidth','renewcommand','providecommand',
  'newcommand','newenvironment','renewenvironment','newtheorem','theoremstyle',
  'definecolor','pgfplotsset','graphicspath','numberwithin','setlength','addtolength',
  'AtBeginDocument','AtEndDocument','titleformat','titlespacing','titleformat*','titlespacing*',
  'bibliographystyle','bibliography','geometry','hypersetup','linespread','parskip',
  'fontsize','fontfamily','fontseries','fontshape','selectfont','baselineskip',
  'columnsep','columnseprule','newpage','clearpage','pagebreak','allowbreak',
  'nopagebreak','noindent','indent','smallskip','medskip','bigskip','vspace','vspace*',
  'hspace','hspace*','vfill','phantomsection','protect','relax','expandafter',
  'makeatletter','makeatother','hypertarget','hyperlink','setmainfont','setsansfont',
  'setmonofont','newfontfamily','setromanfont','tcbset','tcolorboxenvironment',
  'colorlet','newcolumntype','arrayrulewidth','renewcommand*','providecommand*',
  'thanks','IEEEoverridecommandlockouts','markboth','IEEEpubid','IEEEPARstart',
  'sloppy','fussy','linebreak','nolinebreak','enlargethispage','suppressfloats',
]);

// Strip noop commands with all their {...} args (and any trailing [...] opt arg). Brace-aware.
export function stripNoopCommands(body) {
  let out = '';
  let i = 0;
  while (i < body.length) {
    const c = body[i];
    if (c === '\\' && i + 1 < body.length && /[a-zA-Z]/.test(body[i + 1])) {
      let j = i + 1;
      while (j < body.length && /[a-zA-Z]/.test(body[j])) j++;
      let cmd = body.slice(i + 1, j);
      let star = '';
      if (body[j] === '*') { star = '*'; j++; }
      const fullCmd = cmd + star;
      if (NOOP_COMMANDS.has(cmd) || NOOP_COMMANDS.has(fullCmd)) {
        // consume optional arg
        let k = skipWhitespace(body, j);
        if (body[k] === '[') { [, k] = readOptArg(body, k); j = k; }
        // consume any number of {...} args
        while (true) {
          let kk = skipWhitespace(body, j);
          if (body[kk] !== '{') break;
          [, kk] = readBraceArg(body, kk);
          j = kk;
        }
        i = j;
        continue;
      }
    }
    out += c;
    i++;
  }
  return out;
}

// Replace a command \cmd{arg1}{arg2}...{argN} via a transformer fn(args[]).
// Brace-aware. Optional args [..] are stored in opts[].
export function transformCommand(body, cmdName, fn, nArgs = 1) {
  let out = '';
  let i = 0;
  const cmdLen = cmdName.length;
  while (i < body.length) {
    if (body[i] === '\\' && body.slice(i + 1, i + 1 + cmdLen) === cmdName &&
        !/[a-zA-Z]/.test(body[i + 1 + cmdLen] || '')) {
      let j = i + 1 + cmdLen;
      const args = [];
      const opts = [];
      // collect optional args
      let k = skipWhitespace(body, j);
      while (body[k] === '[') {
        const [v, end] = readOptArg(body, k);
        opts.push(v); j = end; k = skipWhitespace(body, end);
      }
      // collect required args
      for (let n = 0; n < nArgs; n++) {
        let kk = skipWhitespace(body, j);
        if (body[kk] !== '{') break;
        const [v, end] = readBraceArg(body, kk);
        args.push(v); j = end;
      }
      if (args.length === nArgs) {
        out += fn(args, opts);
        i = j;
        continue;
      }
    }
    out += body[i];
    i++;
  }
  return out;
}

// Replace \begin{env}...\end{env} (allowing nesting) with fn(content, optArg).
export function transformEnv(body, envName, fn, eatBraceSpec = false) {
  const beginRe = new RegExp('\\\\begin\\{' + envName + '\\}', 'g');
  let out = '';
  let i = 0;
  while (i < body.length) {
    beginRe.lastIndex = i;
    const m = beginRe.exec(body);
    if (!m) { out += body.slice(i); break; }
    out += body.slice(i, m.index);
    let j = m.index + m[0].length;
    // optional arg after \begin{env}
    let opt = '';
    let k = skipWhitespace(body, j);
    if (body[k] === '[') {
      [opt, k] = readOptArg(body, k);
      j = k;
    }
    // optional column-spec brace argument (for tabular etc.)
    if (eatBraceSpec) {
      let kk = skipWhitespace(body, j);
      if (body[kk] === '{') { [, kk] = readBraceArg(body, kk); j = kk; }
      // tabularx / tabular* take a width arg too
      kk = skipWhitespace(body, j);
      if (body[kk] === '{') { [, kk] = readBraceArg(body, kk); j = kk; }
    }
    // find matching \end{env} with depth tracking
    let depth = 1;
    const beginTag = '\\begin{' + envName + '}';
    const endTag = '\\end{' + envName + '}';
    let p = j;
    while (p < body.length && depth > 0) {
      const nb = body.indexOf(beginTag, p);
      const ne = body.indexOf(endTag, p);
      if (ne === -1) break;
      if (nb !== -1 && nb < ne) { depth++; p = nb + beginTag.length; }
      else { depth--; if (depth === 0) { const content = body.slice(j, ne); out += fn(content, opt); i = ne + endTag.length; break; } else { p = ne + endTag.length; } }
    }
    if (depth !== 0) { out += body.slice(m.index); break; }
  }
  return out;
}

export function convertToHTML(code, images, full = true) {
  let body = code;

  // 1. Extract document body. Tolerant: if \end{document} missing, take everything after \begin{document}.
  const docStart = body.indexOf('\\begin{document}');
  if (docStart !== -1) {
    const docEnd = body.indexOf('\\end{document}', docStart);
    body = docEnd !== -1
      ? body.slice(docStart + '\\begin{document}'.length, docEnd)
      : body.slice(docStart + '\\begin{document}'.length);
  }

  // 2. Strip comments (preserve escaped %)
  body = body.replace(/(^|[^\\])%.*$/gm, '$1');

  // 3. STASH math first so later passes can't mangle it. Use placeholders.
  const mathStash = [];
  const stashMath = (latex, displayMode) => {
    mathStash.push({ latex: latex.trim(), displayMode });
    return '\u0001MATH' + (mathStash.length - 1) + '\u0001';
  };
  // Display math: \[...\]
  body = body.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => stashMath(m, true));
  // equation, align, gather, multline, eqnarray (with optional *)
  ['equation','align','gather','multline','eqnarray','displaymath','math'].forEach(env => {
    const re = new RegExp('\\\\begin\\{' + env + '\\*?\\}([\\s\\S]*?)\\\\end\\{' + env + '\\*?\\}', 'g');
    body = body.replace(re, (_, m) => stashMath(m, env !== 'math'));
  });
  // Inline math: $...$ (single dollar) and \(...\)
  body = body.replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => stashMath(m, false));
  body = body.replace(/(?<!\\)\$([^$\n]+?)\$/g, (_, m) => stashMath(m, false));

  // 4. Stash verbatim/lstlisting BEFORE other replacements so \backslashes survive
  const codeStash = [];
  const stashCode = (s) => { codeStash.push(s); return '\u0001CODE' + (codeStash.length - 1) + '\u0001'; };
  body = body.replace(/\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g, (_, c) => stashCode(c));
  body = body.replace(/\\begin\{lstlisting\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{lstlisting\}/g, (_, c) => stashCode(c));
  body = body.replace(/\\verb\|([^|]*)\|/g, (_, c) => '\u0001INLCODE' + (codeStash.push(c) - 1) + '\u0001');

  // 5. Strip ALL no-op commands (preamble carry-over, layout commands, etc.)
  body = stripNoopCommands(body);

  // 6. Title metadata
  body = transformCommand(body, 'title', ([t]) =>
    '\n<h1 class="doc-title">' + processInline(t) + '</h1>');
  body = transformCommand(body, 'author', ([t]) =>
    '\n<div class="doc-author">' + processInline(t) + '</div>');
  body = transformCommand(body, 'date', () => '');
  body = body.replace(/\\maketitle\b/g, '');

  // 7. Sectioning
  const sec = (n, t) => '<' + n + '>' + processInline(t) + '</' + n + '>';
  body = transformCommand(body, 'part', ([t]) => sec('h1', t));
  body = transformCommand(body, 'part*', ([t]) => sec('h1', t));
  body = transformCommand(body, 'chapter', ([t]) => sec('h1', t));
  body = transformCommand(body, 'chapter*', ([t]) => sec('h1', t));
  body = transformCommand(body, 'section', ([t]) => sec('h2', t));
  body = transformCommand(body, 'section*', ([t]) => sec('h2', t));
  body = transformCommand(body, 'subsection', ([t]) => sec('h3', t));
  body = transformCommand(body, 'subsection*', ([t]) => sec('h3', t));
  body = transformCommand(body, 'subsubsection', ([t]) => sec('h4', t));
  body = transformCommand(body, 'subsubsection*', ([t]) => sec('h4', t));
  body = transformCommand(body, 'paragraph', ([t]) => '<p><strong>' + processInline(t) + '.</strong> ');
  body = transformCommand(body, 'subparagraph', ([t]) => '<p><em>' + processInline(t) + '.</em> ');

  // 8. Abstract
  body = transformEnv(body, 'abstract', c =>
    '<div class="doc-abstract"><div class="doc-abstract-label">Abstract</div>' + c.trim() + '</div>');

  // 9. Lists
  body = transformEnv(body, 'itemize', c => {
    const items = c.split(/\\item\s*/).slice(1).map(it => '<li>' + it.trim() + '</li>').join('');
    return '<ul>' + items + '</ul>';
  });
  body = transformEnv(body, 'enumerate', c => {
    const items = c.split(/\\item\s*(?:\[[^\]]*\])?\s*/).slice(1).map(it => '<li>' + it.trim() + '</li>').join('');
    return '<ol>' + items + '</ol>';
  });
  body = transformEnv(body, 'description', c => {
    const items = c.split(/\\item\s*/).slice(1).map(it => {
      const m = it.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);
      if (m) return '<dt>' + m[1] + '</dt><dd>' + m[2].trim() + '</dd>';
      return '<dt></dt><dd>' + it.trim() + '</dd>';
    }).join('');
    return '<dl>' + items + '</dl>';
  });

  // 10. Quotes
  body = transformEnv(body, 'quote', c => '<blockquote>' + c.trim() + '</blockquote>');
  body = transformEnv(body, 'quotation', c => '<blockquote>' + c.trim() + '</blockquote>');

  // 11. Center / flush
  body = transformEnv(body, 'center', c => '<div class="doc-center">' + c.trim() + '</div>');
  body = transformEnv(body, 'flushleft', c => '<div style="text-align:left">' + c.trim() + '</div>');
  body = transformEnv(body, 'flushright', c => '<div style="text-align:right">' + c.trim() + '</div>');

  // 12. Tables (table environment wraps tabular)
  body = transformEnv(body, 'table', c => renderTable(c));
  body = transformEnv(body, 'table*', c => renderTable(c));
  body = transformEnv(body, 'longtable', c => renderTabular(c, ''), true);
  // Standalone tabular (outside table environment)
  body = transformEnv(body, 'tabular', c => renderTabular(c, ''), true);
  body = transformEnv(body, 'tabular*', c => renderTabular(c, ''), true);
  body = transformEnv(body, 'tabularx', c => renderTabular(c, ''), true);

  // 13. Figures
  body = transformEnv(body, 'figure', c => renderFigure(c, images));
  body = transformEnv(body, 'figure*', c => renderFigure(c, images));
  body = transformEnv(body, 'wrapfigure', c => renderFigure(c, images));

  // Standalone includegraphics (outside figure)
  body = transformCommand(body, 'includegraphics', ([p], opts) => {
    const baseName = p.split('/').pop().replace(/\.[^/.]+$/, '');
    const img = images.find(i => i.name === baseName || i.name.replace(/\.[^/.]+$/, '') === baseName);
    if (img) return '<img class="doc-img" src="' + img.base64 + '" alt="' + escapeHtml(baseName) + '" />';
    return '<span class="doc-imgmiss">[Image: ' + escapeHtml(baseName) + ']</span>';
  });

  // 14. Bibliography
  body = transformEnv(body, 'thebibliography', c => {
    const items = c.split(/\\bibitem(?:\[[^\]]*\])?\{[^}]*\}/).slice(1).map(x => '<li>' + x.trim() + '</li>').join('');
    return '<h2>References</h2><ol class="doc-refs">' + items + '</ol>';
  });

  // 15. Theorem / proof / generic environments → render as block
  ['theorem','lemma','proposition','corollary','definition','proof','example','remark','note'].forEach(env => {
    body = transformEnv(body, env, (c, opt) => {
      const label = env.charAt(0).toUpperCase() + env.slice(1);
      return '<div class="doc-thm doc-thm-' + env + '"><strong>' + label + (opt ? ' (' + opt + ')' : '') + '.</strong> ' + c.trim() + '</div>';
    });
  });

  // tcolorbox / boxed content → render as a styled box, keep content
  body = transformEnv(body, 'tcolorbox', c => '<div class="doc-tcolorbox">' + c.trim() + '</div>');
  body = transformEnv(body, 'tcblisting', c => '<div class="doc-tcolorbox">' + c.trim() + '</div>');
  body = transformEnv(body, 'minipage', c => '<div class="doc-minipage">' + c.trim() + '</div>');

  // tikzpicture / pgfgantt / pgfplot — strip silently (we can't render them here)
  body = transformEnv(body, 'tikzpicture', () =>
    '<div class="doc-unrendered"><span>📊 TikZ figure (compile in Overleaf to render)</span></div>');
  body = transformEnv(body, 'ganttchart', () =>
    '<div class="doc-unrendered"><span>📊 Gantt chart (compile in Overleaf to render)</span></div>');
  body = transformEnv(body, 'axis', () => '');

  // IEEE author block aliases — keep content
  body = transformCommand(body, 'IEEEauthorblockN', ([t]) => '<div class="doc-author-name">' + processInline(t) + '</div>');
  body = transformCommand(body, 'IEEEauthorblockA', ([t]) => '<div class="doc-author-aff">' + processInline(t) + '</div>');
  body = transformEnv(body, 'IEEEkeywords', c => '<p class="doc-keywords"><strong>Index Terms—</strong>' + c.trim() + '</p>');

  // 16. Inline formatting (brace-aware, may contain nested commands)
  body = processInline(body);

  // 17. Now strip any remaining unrecognized commands (silently)
  body = stripUnknownCommands(body);

  // 18. Restore code blocks
  body = body.replace(/\u0001CODE(\d+)\u0001/g, (_, idx) =>
    '<pre><code>' + escapeHtml(codeStash[+idx].trim()) + '</code></pre>');
  body = body.replace(/\u0001INLCODE(\d+)\u0001/g, (_, idx) =>
    '<code>' + escapeHtml(codeStash[+idx]) + '</code>');

  // 19. \\ → <br/> (do BEFORE math restoration so math content keeps its line breaks)
  body = body.replace(/\\\\(?!\w)/g, '<br/>');

  // 20. Restore math via KaTeX (with original \\ intact for align/multline)
  body = body.replace(/\u0001MATH(\d+)\u0001/g, (_, idx) => {
    const m = mathStash[+idx];
    if (typeof window === 'undefined' || !window.katex) {
      return '<span class="' + (m.displayMode ? 'doc-math-display' : 'doc-math-inline') + '">' + escapeHtml(m.latex) + '</span>';
    }
    try {
      const html = window.katex.renderToString(m.latex, {
        displayMode: m.displayMode, throwOnError: false, output: 'html', strict: false, trust: false,
      });
      return m.displayMode ? '<div class="doc-math-display">' + html + '</div>' : html;
    } catch (e) {
      return '<span class="doc-math-err">' + escapeHtml(m.latex) + '</span>';
    }
  });

  // 21. Paragraphs: split on blank lines, wrap non-block content in <p>
  const paragraphs = body.split(/\n\s*\n+/).map(p => p.trim()).filter(p => p);
  body = paragraphs.map(p => {
    if (p.match(/^\s*<(h\d|ul|ol|dl|table|figure|blockquote|pre|hr|div|section)/i)) return p;
    return '<p>' + p + '</p>';
  }).join('\n');

  if (full) {
    return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Document</title>' +
      '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">' +
      '<style>body{font-family:Georgia,serif;max-width:740px;margin:40px auto;padding:0 24px;line-height:1.7;color:#18181b}h1{font-size:28px}h2{font-size:22px;margin-top:28px}h3{font-size:18px;margin-top:20px}img{max-width:100%}table{border-collapse:collapse;margin:12px auto}th,td{border:1px solid #ddd;padding:6px 12px}pre{background:#1f2937;color:#f3f4f6;padding:12px;border-radius:6px;overflow-x:auto}blockquote{border-left:3px solid #ddd;margin:12px 0;padding-left:14px;color:#555}.doc-abstract{margin:18px 0;padding:14px 18px;background:#f9fafb;border-left:3px solid #d1d5db;font-size:14px}.doc-abstract-label{font-weight:700;font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px;color:#6b7280}.doc-author{color:#444;font-style:italic;text-align:center;margin-bottom:16px}.doc-title{text-align:center}.doc-center{text-align:center;margin:12px 0}figcaption,.figcap{text-align:center;font-size:13px;color:#6b7280;font-style:italic;margin-top:6px}.doc-thm{margin:12px 0;padding:10px 14px;background:#f9fafb;border-left:3px solid #6b7280}.doc-tcolorbox{margin:12px 0;padding:14px;border:1px solid #d1d5db;border-radius:6px;background:#f9fafb}.doc-unrendered{margin:14px 0;padding:24px;background:#f3f4f6;border:1px dashed #d1d5db;border-radius:6px;text-align:center;color:#6b7280;font-size:13px}.doc-refs li{margin:6px 0}.doc-keywords{font-size:13px}</style>' +
      '</hea' + 'd><body>' + body + '</bo' + 'dy></html>';
  }
  return body;
}

// Process inline commands within a text fragment. Brace-aware.
export function processInline(s) {
  s = transformCommand(s, 'textbf', ([t]) => '<strong>' + processInline(t) + '</strong>');
  s = transformCommand(s, 'textit', ([t]) => '<em>' + processInline(t) + '</em>');
  s = transformCommand(s, 'emph', ([t]) => '<em>' + processInline(t) + '</em>');
  s = transformCommand(s, 'underline', ([t]) => '<u>' + processInline(t) + '</u>');
  s = transformCommand(s, 'uline', ([t]) => '<u>' + processInline(t) + '</u>');
  s = transformCommand(s, 'texttt', ([t]) => '<code>' + escapeHtml(t) + '</code>');
  s = transformCommand(s, 'textsc', ([t]) => '<span style="font-variant:small-caps">' + processInline(t) + '</span>');
  s = transformCommand(s, 'textsf', ([t]) => '<span style="font-family:sans-serif">' + processInline(t) + '</span>');
  s = transformCommand(s, 'textrm', ([t]) => '<span style="font-family:serif">' + processInline(t) + '</span>');
  s = transformCommand(s, 'sout', ([t]) => '<s>' + processInline(t) + '</s>');
  s = transformCommand(s, 'st', ([t]) => '<s>' + processInline(t) + '</s>');
  s = transformCommand(s, 'textsuperscript', ([t]) => '<sup>' + processInline(t) + '</sup>');
  s = transformCommand(s, 'textsubscript', ([t]) => '<sub>' + processInline(t) + '</sub>');
  s = transformCommand(s, 'textcolor', ([_, t]) => processInline(t), 2);
  s = transformCommand(s, 'colorbox', ([_, t]) => processInline(t), 2);
  s = transformCommand(s, 'fcolorbox', ([_, __, t]) => processInline(t), 3);
  s = transformCommand(s, 'footnote', ([t]) => '<sup class="doc-fn">[' + processInline(t) + ']</sup>');
  s = transformCommand(s, 'cite', ([t]) => '<span class="doc-cite">[' + escapeHtml(t) + ']</span>');
  s = transformCommand(s, 'citep', ([t]) => '<span class="doc-cite">[' + escapeHtml(t) + ']</span>');
  s = transformCommand(s, 'citet', ([t]) => '<span class="doc-cite">' + escapeHtml(t) + '</span>');
  s = transformCommand(s, 'ref', ([t]) => '<span class="doc-ref">' + escapeHtml(t) + '</span>');
  s = transformCommand(s, 'eqref', ([t]) => '<span class="doc-ref">(' + escapeHtml(t) + ')</span>');
  s = transformCommand(s, 'pageref', ([t]) => '<span class="doc-ref">' + escapeHtml(t) + '</span>');
  s = transformCommand(s, 'autoref', ([t]) => '<span class="doc-ref">' + escapeHtml(t) + '</span>');
  s = transformCommand(s, 'href', ([url, txt]) => '<a href="' + escapeHtml(url) + '">' + processInline(txt) + '</a>', 2);
  s = transformCommand(s, 'url', ([u]) => '<a href="' + escapeHtml(u) + '">' + escapeHtml(u) + '</a>');
  s = transformCommand(s, 'label', () => '');
  s = transformCommand(s, 'index', () => '');
  s = transformCommand(s, 'caption', ([t]) => '<figcaption class="figcap">' + processInline(t) + '</figcaption>');
  s = transformCommand(s, 'centerline', ([t]) => '<div class="doc-center">' + processInline(t) + '</div>');
  // Layout/spacing
  s = s.replace(/\\hrulefill\b/g, '<span style="display:inline-block;flex:1;border-bottom:1px solid #999;min-width:80px;margin:0 4px"></span>');
  s = s.replace(/\\dotfill\b/g, '<span style="display:inline-block;flex:1;border-bottom:1px dotted #999;min-width:80px;margin:0 4px"></span>');
  s = s.replace(/\\hfill\b/g, '<span style="display:inline-block;flex:1"></span>');
  s = s.replace(/\\centering\b/g, '');
  s = s.replace(/\\raggedright\b/g, '');
  s = s.replace(/\\raggedleft\b/g, '');
  s = s.replace(/\\quad\b/g, '\u2003');
  s = s.replace(/\\qquad\b/g, '\u2003\u2003');
  s = s.replace(/\\,/g, '\u2009');
  s = s.replace(/\\;/g, '\u2009');
  s = s.replace(/\\:/g, '\u2009');
  s = s.replace(/\\!/g, '');
  // \(space) is a forced inter-word space → keep a single space
  s = s.replace(/\\ /g, ' ');
  // \@ is end-of-sentence marker → ignore
  s = s.replace(/\\@/g, '');
  // Special chars
  s = s.replace(/\\&/g, '&amp;').replace(/\\%/g, '%').replace(/\\\$/g, '$').replace(/\\#/g, '#').replace(/\\_/g, '_').replace(/\\\{/g, '{').replace(/\\\}/g, '}');
  s = s.replace(/\\textbackslash\b/g, '\\').replace(/\\textasciitilde\b/g, '~').replace(/\\textasciicircum\b/g, '^');
  s = s.replace(/\\ldots\b/g, '…').replace(/\\dots\b/g, '…');
  s = s.replace(/~/g, '\u00A0');
  s = s.replace(/---/g, '—').replace(/--/g, '–');
  s = s.replace(/\\`\\`([^']+?)''/g, '\u201C$1\u201D');
  s = s.replace(/``([^']+?)''/g, '\u201C$1\u201D');
  s = s.replace(/`([^']+?)'/g, '\u2018$1\u2019');
  // Bare \\ (not followed by letter) is line break — handled in main pass too
  return s;
}

// Strip any remaining \command{...}{...} occurrences (silently). Brace-aware.
export function stripUnknownCommands(body) {
  let out = '';
  let i = 0;
  while (i < body.length) {
    if (body[i] === '\u0001') {
      // copy placeholder verbatim
      const end = body.indexOf('\u0001', i + 1);
      if (end !== -1) { out += body.slice(i, end + 1); i = end + 1; continue; }
    }
    if (body[i] === '\\' && i + 1 < body.length && /[a-zA-Z]/.test(body[i + 1])) {
      let j = i + 1;
      while (j < body.length && /[a-zA-Z]/.test(body[j])) j++;
      if (body[j] === '*') j++;
      // consume optional args
      let k = skipWhitespace(body, j);
      while (body[k] === '[') { [, k] = readOptArg(body, k); j = k; k = skipWhitespace(body, j); }
      // consume {...} args
      while (true) {
        let kk = skipWhitespace(body, j);
        if (body[kk] !== '{') break;
        [, kk] = readBraceArg(body, kk);
        j = kk;
      }
      i = j;
      continue;
    }
    if (body[i] === '\\' && i + 1 < body.length && /[#$%&_{}]/.test(body[i + 1])) {
      out += body[i + 1]; i += 2; continue;
    }
    out += body[i];
    i++;
  }
  return out;
}

export function renderTable(c) {
  // strip table-level decorations
  c = c.replace(/\\centering\b/g, '');
  // Find tabular within the table
  const tab = matchEnv(c, 'tabular') || matchEnv(c, 'tabularx') || matchEnv(c, 'tabular*') || matchEnv(c, 'longtable');
  if (!tab) return '<div class="doc-unrendered"><span>📋 Table</span></div>';
  // caption
  let cap = '';
  const capM = transformCommand(c, 'caption', ([t]) => { cap = processInline(t); return ''; });
  return renderTabular(tab, cap);
}

// Find the content of \begin{name}{spec}...\end{name} (brace-aware) → returns content string
export function matchEnv(s, name) {
  const beginRe = new RegExp('\\\\begin\\{' + name + '\\}', 'g');
  const m = beginRe.exec(s);
  if (!m) return null;
  let j = m.index + m[0].length;
  // skip optional [..]
  let k = skipWhitespace(s, j);
  if (s[k] === '[') { [, k] = readOptArg(s, k); j = k; }
  // skip column spec {...} if present
  k = skipWhitespace(s, j);
  if (s[k] === '{') { [, k] = readBraceArg(s, k); j = k; }
  const endTag = '\\end{' + name + '}';
  const e = s.indexOf(endTag, j);
  if (e === -1) return null;
  return s.slice(j, e);
}

export function renderTabular(tab, caption) {
  const hasHeaderRule = /\\toprule|\\hline|\\midrule/.test(tab);
  // strip rules
  let rows = tab.replace(/\\toprule|\\midrule|\\bottomrule|\\hline|\\cline\{[^}]*\}/g, '').trim();
  // Strip multicolumn/multirow wrappers (keep content)
  rows = transformCommand(rows, 'multicolumn', ([_, __, t]) => t, 3);
  rows = transformCommand(rows, 'multirow', ([_, __, t]) => t, 3);
  const rowsArr = rows.split(/\\\\(?:\s*\[[^\]]*\])?/).map(r => r.trim()).filter(r => r);
  if (!rowsArr.length) return '';
  let html = '<table class="doc-table">';
  rowsArr.forEach((r, i) => {
    const cells = splitTopLevel(r, '&').map(x => processInline(x.trim()));
    if (i === 0 && hasHeaderRule) html += '<thead><tr>' + cells.map(x => '<th>' + x + '</th>').join('') + '</tr></thead><tbody>';
    else if (i === 0) html += '<tbody><tr>' + cells.map(x => '<td>' + x + '</td>').join('') + '</tr>';
    else html += '<tr>' + cells.map(x => '<td>' + x + '</td>').join('') + '</tr>';
  });
  html += '</tbody></table>';
  if (caption) html += '<div class="figcap">' + caption + '</div>';
  return html;
}

export function splitTopLevel(s, delim) {
  const out = [];
  let depth = 0, last = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && i + 1 < s.length) { i++; continue; }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === delim && depth === 0) { out.push(s.slice(last, i)); last = i + 1; }
  }
  out.push(s.slice(last));
  return out;
}

export function renderFigure(c, images) {
  c = c.replace(/\\centering\b/g, '');
  // Find first \includegraphics
  let imgPath = null;
  transformCommand(c, 'includegraphics', ([p]) => { imgPath = p; return ''; });
  let cap = '';
  const aft = transformCommand(c, 'caption', ([t]) => { cap = processInline(t); return ''; });
  if (!imgPath) {
    if (cap) return '<figure><div class="doc-imgmiss">[Figure]</div><figcaption class="figcap">' + cap + '</figcaption></figure>';
    return '';
  }
  const baseName = imgPath.split('/').pop().replace(/\.[^/.]+$/, '');
  const img = images.find(i => i.name === baseName || i.name.replace(/\.[^/.]+$/, '') === baseName);
  let html = '<figure>';
  if (img) html += '<img class="doc-img" src="' + img.base64 + '" alt="' + escapeHtml(baseName) + '" />';
  else html += '<div class="doc-imgmiss">[Image: ' + escapeHtml(baseName) + ']</div>';
  if (cap) html += '<figcaption class="figcap">' + cap + '</figcaption>';
  html += '</figure>';
  return html;
}

export function convertToMarkdown(code, images) {
  let body = code;
  const docStart = body.indexOf('\\begin{document}');
  if (docStart !== -1) {
    const docEnd = body.indexOf('\\end{document}', docStart);
    body = docEnd !== -1
      ? body.slice(docStart + 16, docEnd)
      : body.slice(docStart + 16);
  }

  body = body.replace(/(^|[^\\])%.*$/gm, '$1');

  // Stash math BEFORE other transforms
  const mathStash = [];
  body = body.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => { mathStash.push({ d: true, t: m.trim() }); return '\u0001M' + (mathStash.length - 1) + '\u0001'; });
  body = body.replace(/\\begin\{(equation|align|gather|multline)\*?\}([\s\S]*?)\\end\{\1\*?\}/g, (_, __, m) => { mathStash.push({ d: true, t: m.trim() }); return '\u0001M' + (mathStash.length - 1) + '\u0001'; });
  body = body.replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => { mathStash.push({ d: false, t: m }); return '\u0001M' + (mathStash.length - 1) + '\u0001'; });
  body = body.replace(/(?<!\\)\$([^$\n]+?)\$/g, (_, m) => { mathStash.push({ d: false, t: m }); return '\u0001M' + (mathStash.length - 1) + '\u0001'; });

  // Code blocks
  const codeStash = [];
  body = body.replace(/\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g, (_, c) => { codeStash.push(c.trim()); return '\u0001C' + (codeStash.length - 1) + '\u0001'; });
  body = body.replace(/\\begin\{lstlisting\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{lstlisting\}/g, (_, c) => { codeStash.push(c.trim()); return '\u0001C' + (codeStash.length - 1) + '\u0001'; });

  body = stripNoopCommands(body);

  body = transformCommand(body, 'title', ([t]) => '# ' + t);
  body = transformCommand(body, 'author', () => '');
  body = transformCommand(body, 'date', () => '');
  body = body.replace(/\\maketitle/g, '');

  body = transformCommand(body, 'chapter', ([t]) => '\n# ' + t + '\n');
  body = transformCommand(body, 'chapter*', ([t]) => '\n# ' + t + '\n');
  body = transformCommand(body, 'section', ([t]) => '\n## ' + t + '\n');
  body = transformCommand(body, 'section*', ([t]) => '\n## ' + t + '\n');
  body = transformCommand(body, 'subsection', ([t]) => '\n### ' + t + '\n');
  body = transformCommand(body, 'subsection*', ([t]) => '\n### ' + t + '\n');
  body = transformCommand(body, 'subsubsection', ([t]) => '\n#### ' + t + '\n');
  body = transformCommand(body, 'subsubsection*', ([t]) => '\n#### ' + t + '\n');

  body = transformEnv(body, 'abstract', c => '\n> **Abstract.** ' + c.trim() + '\n');
  body = transformEnv(body, 'quote', c => '\n> ' + c.trim().split('\n').join('\n> ') + '\n');
  body = transformEnv(body, 'itemize', c => '\n' + c.split(/\\item\s*/).slice(1).map(it => '- ' + it.trim()).join('\n') + '\n');
  body = transformEnv(body, 'enumerate', c => '\n' + c.split(/\\item\s*(?:\[[^\]]*\])?\s*/).slice(1).map((it, i) => (i+1) + '. ' + it.trim()).join('\n') + '\n');
  body = transformEnv(body, 'center', c => c.trim());

  body = transformEnv(body, 'figure', c => {
    let imgPath = null, cap = '';
    transformCommand(c, 'includegraphics', ([p]) => { imgPath = p; return ''; });
    transformCommand(c, 'caption', ([t]) => { cap = t; return ''; });
    if (!imgPath) return cap ? '\n*' + cap + '*\n' : '';
    const baseName = imgPath.split('/').pop().replace(/\.[^/.]+$/, '');
    const img = images.find(i => i.name === baseName || i.name.replace(/\.[^/.]+$/, '') === baseName);
    return '\n![' + (cap || baseName) + '](' + (img ? img.base64 : baseName) + ')\n';
  });

  body = transformCommand(body, 'includegraphics', ([p]) => {
    const baseName = p.split('/').pop().replace(/\.[^/.]+$/, '');
    const img = images.find(i => i.name === baseName || i.name.replace(/\.[^/.]+$/, '') === baseName);
    return img ? '![' + baseName + '](' + img.base64 + ')' : '![' + baseName + ']';
  });

  // Inline formatting
  body = transformCommand(body, 'textbf', ([t]) => '**' + t + '**');
  body = transformCommand(body, 'textit', ([t]) => '*' + t + '*');
  body = transformCommand(body, 'emph', ([t]) => '*' + t + '*');
  body = transformCommand(body, 'underline', ([t]) => t);
  body = transformCommand(body, 'texttt', ([t]) => '`' + t + '`');
  body = transformCommand(body, 'href', ([url, txt]) => '[' + txt + '](' + url + ')', 2);
  body = transformCommand(body, 'url', ([u]) => '<' + u + '>');
  body = transformCommand(body, 'cite', ([t]) => '[' + t + ']');
  body = transformCommand(body, 'ref', ([t]) => t);
  body = transformCommand(body, 'eqref', ([t]) => '(' + t + ')');
  body = transformCommand(body, 'label', () => '');
  body = transformCommand(body, 'caption', ([t]) => '*' + t + '*');

  body = transformEnv(body, 'thebibliography', c => {
    const items = c.split(/\\bibitem(?:\[[^\]]*\])?\{[^}]*\}/).slice(1);
    return '\n## References\n\n' + items.map((x, i) => (i + 1) + '. ' + x.trim()).join('\n') + '\n';
  });

  body = stripUnknownCommands(body);

  // Restore code/math
  body = body.replace(/\u0001C(\d+)\u0001/g, (_, i) => '\n```\n' + codeStash[+i] + '\n```\n');
  body = body.replace(/\u0001M(\d+)\u0001/g, (_, i) => {
    const m = mathStash[+i];
    return m.d ? '\n$$\n' + m.t + '\n$$\n' : '$' + m.t + '$';
  });

  body = body.replace(/\\\\(?!\w)/g, '  \n');
  body = body.replace(/~/g, ' ').replace(/---/g, '—').replace(/--/g, '–');
  body = body.replace(/\\&/g, '&').replace(/\\%/g, '%').replace(/\\\$/g, '$').replace(/\\#/g, '#').replace(/\\_/g, '_');
  body = body.replace(/\n{3,}/g, '\n\n');
  return body.trim();
}

export function convertToText(code) {
  let body = code;
  const docMatch = body.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  if (docMatch) body = docMatch[1];
  body = body.replace(/(^|[^\\])%.*$/gm, '$1');
  body = body.replace(/\\textbf\{([^}]+)\}/g, '$1');
  body = body.replace(/\\textit\{([^}]+)\}/g, '$1');
  body = body.replace(/\\emph\{([^}]+)\}/g, '$1');
  body = body.replace(/\\texttt\{([^}]+)\}/g, '$1');
  body = body.replace(/\\underline\{([^}]+)\}/g, '$1');
  body = body.replace(/\\(chapter|section|subsection|subsubsection)\*?\{([^}]+)\}/g, '\n$2\n');
  body = body.replace(/\\item/g, '- ');
  body = body.replace(/\\begin\{[^}]+\}/g, '');
  body = body.replace(/\\end\{[^}]+\}/g, '');
  body = body.replace(/\\\\/g, '\n');
  body = body.replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?(\{[^}]*\})?/g, '');
  body = body.replace(/[{}]/g, '');
  body = body.replace(/\$([^$]+)\$/g, '$1');
  body = body.replace(/\\\[|\\\]/g, '');
  body = body.replace(/\n{3,}/g, '\n\n');
  return body.trim();
}

export function processLatexForOverleaf(code, images, opts) {
  let out = code;

  // 1. Replace includegraphics paths
  out = out.replace(/\\includegraphics(\[[^\]]*\])?\{([^}]+)\}/g, (full, optsArg, name) => {
    const baseName = name.split('/').pop().replace(/\.[^/.]+$/, '');
    const img = images.find(i =>
      i.name === baseName ||
      i.name.replace(/\.[^/.]+$/, '') === baseName ||
      i.name === name ||
      sanitizeName(i.name, i.ext).replace(/\.[^/.]+$/, '') === baseName
    );
    if (img) {
      const fname = sanitizeName(img.name, img.ext);
      return '\\includegraphics' + (optsArg || '[width=0.8\\linewidth]') + '{images/' + fname + '}';
    }
    return full;
  });

  // 2. Inject graphicspath
  if (opts.injectGraphicsPath) {
    if (!/\\graphicspath\s*\{/.test(out)) {
      out = out.replace(/(\\documentclass[^\n]*\n)/, '$1\\graphicspath{{images/}}\n');
    } else {
      out = out.replace(/\\graphicspath\s*\{[^}]*\{[^}]*\}[^}]*\}/, '\\graphicspath{{images/}}');
    }
  }

  // 3. Auto-add packages
  if (opts.autoPackages) {
    const need = [];
    if (/\\includegraphics/.test(out) && !/\\usepackage(\[[^\]]*\])?\{graphicx\}/.test(out)) need.push('\\usepackage{graphicx}');
    if (/\\begin\{table\}/.test(out) && !/\\usepackage(\[[^\]]*\])?\{float\}/.test(out)) need.push('\\usepackage{float}');
    if (/\\toprule|\\midrule|\\bottomrule/.test(out) && !/\\usepackage(\[[^\]]*\])?\{booktabs\}/.test(out)) need.push('\\usepackage{booktabs}');
    if (/\\begin\{align/.test(out) && !/\\usepackage(\[[^\]]*\])?\{amsmath\}/.test(out)) need.push('\\usepackage{amsmath}');
    if (need.length) {
      const lastUse = out.match(/^.*\\usepackage[^\n]*$/gm);
      if (lastUse) {
        const last = lastUse[lastUse.length - 1];
        const idx = out.lastIndexOf(last) + last.length;
        out = out.slice(0, idx) + '\n' + need.join('\n') + out.slice(idx);
      } else {
        out = out.replace(/(\\documentclass[^\n]*\n)/, '$1' + need.join('\n') + '\n');
      }
    }
  }

  // 4. Normalize line endings, trim trailing
  out = out.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  out = out.split('\n').map(l => l.replace(/\s+$/, '')).join('\n');

  return out;
}

export function validateForExport(code, images) {
  const checks = [];
  checks.push({ label: '\\documentclass found', state: code.includes('\\documentclass') ? 'ok' : 'bad' });
  checks.push({ label: '\\begin{document} found', state: code.includes('\\begin{document}') ? 'ok' : 'bad' });
  checks.push({ label: '\\end{document} found', state: code.includes('\\end{document}') ? 'ok' : 'bad' });
  checks.push({ label: 'All environments matched', state: checkEnvBalance(code).balanced ? 'ok' : 'bad' });

  const refs = [];
  const re = /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(code)) !== null) refs.push(m[1].split('/').pop().replace(/\.[^/.]+$/, ''));
  if (refs.length === 0) {
    if (images.length > 0) checks.push({ label: 'Images uploaded but not referenced (' + images.length + ')', state: 'warn' });
  } else {
    const missing = refs.filter(r => !images.find(i => i.name.replace(/\.[^/.]+$/, '') === r || i.name === r));
    if (missing.length === 0) checks.push({ label: refs.length + ' image reference(s) — all matched', state: 'ok' });
    else checks.push({ label: missing.length + ' image reference(s) without matching upload: ' + missing.join(', '), state: 'warn' });
  }

  if (/\\includegraphics/.test(code) && !/\\usepackage(\[[^\]]*\])?\{graphicx\}/.test(code))
    checks.push({ label: 'graphicx will be auto-added', state: 'warn' });
  if (/\\begin\{table\}/.test(code) && !/\\usepackage(\[[^\]]*\])?\{float\}/.test(code))
    checks.push({ label: 'float will be auto-added', state: 'warn' });

  return checks;
}

