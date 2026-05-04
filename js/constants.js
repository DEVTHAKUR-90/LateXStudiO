// ═══════════════════════════════════════
// LaTeXStudio v4.0 — constants.js
// All static data: DEFAULT_CODE, TOOLBAR_GROUPS, TEMPLATES, SNIPPETS, SYMBOLS, SHORTCUTS
// ═══════════════════════════════════════

/* eslint-disable */

export const DEFAULT_CODE = `\\documentclass[12pt,a4paper]{article}
\\usepackage[a4paper,margin=1in]{geometry}
\\usepackage{graphicx}
\\usepackage{amsmath}
\\usepackage{booktabs}
\\usepackage{float}
\\usepackage[colorlinks=true,linkcolor=blue]{hyperref}

\\title{\\textbf{My Document Title}}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
Write your abstract here. This is a brief summary of your document.
\\end{abstract}

\\section{Introduction}
Welcome to \\textbf{LaTeXStudio}. Write your content here.

You can use the toolbar above to insert formatting, equations, tables,
and figures. Upload images in the left panel and insert them with one click.

When finished, click \\textbf{Export $\\rightarrow$ Overleaf ZIP} to download
a perfect package for Overleaf compilation.

\\section{Methods}

\\subsection{Equations}
Here is an inline equation: $E = mc^2$. And a display equation:
\\[
  \\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}
\\]

\\subsection{Tables}
\\begin{table}[H]
\\centering
\\begin{tabular}{lcc}
\\toprule
\\textbf{Method} & \\textbf{Accuracy} & \\textbf{Speed} \\\\
\\midrule
Method A & 92.3\\% & Fast \\\\
Method B & 88.7\\% & Slow \\\\
Method C & 95.1\\% & Medium \\\\
\\bottomrule
\\end{tabular}
\\caption{Comparison of methods.}
\\label{tab:results}
\\end{table}

\\section{Results}
Your results here.

\\section{Conclusion}
Your conclusion here.

\\begin{thebibliography}{9}
\\bibitem{ref1} Author, \\textit{Title}, Journal, Year.
\\end{thebibliography}

\\end{document}
`;

export const TOOLBAR_GROUPS = [
  {
    name: 'Text',
    tags: [
      { label: 'Bold', open: '\\textbf{', close: '}', shortcut: 'Ctrl+B' },
      { label: 'Italic', open: '\\textit{', close: '}', shortcut: 'Ctrl+I' },
      { label: 'Underline', open: '\\underline{', close: '}', shortcut: 'Ctrl+U' },
      { label: 'Strike', open: '\\sout{', close: '}' },
      { label: 'Mono', open: '\\texttt{', close: '}' },
      { label: 'SmallCaps', open: '\\textsc{', close: '}' },
      { label: 'Color', open: '\\textcolor{red}{', close: '}' },
      { label: 'Emph', open: '\\emph{', close: '}' },
      { label: 'Super', open: '\\textsuperscript{', close: '}' },
      { label: 'Sub', open: '\\textsubscript{', close: '}' },
    ],
  },
  {
    name: 'Structure',
    tags: [
      { label: 'Chapter', open: '\\chapter{', close: '}' },
      { label: 'Section', open: '\\section{', close: '}' },
      { label: 'Subsection', open: '\\subsection{', close: '}' },
      { label: 'Subsubsection', open: '\\subsubsection{', close: '}' },
      { label: 'Paragraph', open: '\\paragraph{', close: '}' },
      { label: 'TOC', insert: '\\tableofcontents\n' },
      { label: 'List of Figures', insert: '\\listoffigures\n' },
      { label: 'Maketitle', insert: '\\maketitle\n' },
    ],
  },
  {
    name: 'Lists',
    tags: [
      { label: 'Itemize', insert: '\\begin{itemize}\n  \\item \n  \\item \n\\end{itemize}\n' },
      { label: 'Enumerate', insert: '\\begin{enumerate}\n  \\item \n  \\item \n\\end{enumerate}\n' },
      { label: 'Description', insert: '\\begin{description}\n  \\item[Term] Definition\n\\end{description}\n' },
      { label: 'Item', insert: '\\item ' },
      { label: 'Labeled Item', insert: '\\item[Label] ' },
    ],
  },
  {
    name: 'Math',
    tags: [
      { label: 'Inline $', open: '$', close: '$' },
      { label: 'Display \\[', insert: '\\[\n  \n\\]\n' },
      { label: 'Equation', insert: '\\begin{equation}\n  \n\\end{equation}\n' },
      { label: 'Align', insert: '\\begin{align}\n  &= \\\\\n  &= \n\\end{align}\n' },
      { label: 'Frac', open: '\\frac{', close: '}{}' },
      { label: 'Sqrt', open: '\\sqrt{', close: '}' },
      { label: 'Sum', insert: '\\sum_{i=1}^{n} ' },
      { label: 'Integral', insert: '\\int_{a}^{b} ' },
      { label: 'Limit', insert: '\\lim_{x \\to \\infty} ' },
      { label: 'Matrix', insert: '\\begin{pmatrix}\n  a & b \\\\\n  c & d\n\\end{pmatrix}' },
      { label: 'Binom', open: '\\binom{', close: '}{}' },
      { label: 'Cases', insert: '\\begin{cases}\n  a & \\text{if } x>0 \\\\\n  b & \\text{otherwise}\n\\end{cases}' },
    ],
  },
  {
    name: 'Greek',
    tags: 'α β γ δ ε ζ η θ ι κ λ μ ν ξ π ρ σ τ υ φ χ ψ ω Γ Δ Θ Λ Ξ Π Σ Υ Φ Ψ Ω'.split(' ').map(s => {
      const map = { 'α':'alpha','β':'beta','γ':'gamma','δ':'delta','ε':'epsilon','ζ':'zeta','η':'eta','θ':'theta','ι':'iota','κ':'kappa','λ':'lambda','μ':'mu','ν':'nu','ξ':'xi','π':'pi','ρ':'rho','σ':'sigma','τ':'tau','υ':'upsilon','φ':'phi','χ':'chi','ψ':'psi','ω':'omega','Γ':'Gamma','Δ':'Delta','Θ':'Theta','Λ':'Lambda','Ξ':'Xi','Π':'Pi','Σ':'Sigma','Υ':'Upsilon','Φ':'Phi','Ψ':'Psi','Ω':'Omega' };
      return { label: s, insert: '\\' + map[s] + ' ' };
    }),
  },
  {
    name: 'Symbols',
    tags: [
      { label: '±', insert: '\\pm ' }, { label: '×', insert: '\\times ' },
      { label: '÷', insert: '\\div ' }, { label: '≤', insert: '\\leq ' },
      { label: '≥', insert: '\\geq ' }, { label: '≠', insert: '\\neq ' },
      { label: '≈', insert: '\\approx ' }, { label: '≡', insert: '\\equiv ' },
      { label: '∈', insert: '\\in ' }, { label: '∉', insert: '\\notin ' },
      { label: '∪', insert: '\\cup ' }, { label: '∩', insert: '\\cap ' },
      { label: '∞', insert: '\\infty ' }, { label: '∂', insert: '\\partial ' },
      { label: '∇', insert: '\\nabla ' }, { label: '∀', insert: '\\forall ' },
      { label: '∃', insert: '\\exists ' }, { label: '¬', insert: '\\neg ' },
      { label: '∧', insert: '\\land ' }, { label: '∨', insert: '\\lor ' },
    ],
  },
  {
    name: 'Tables',
    tags: [
      { label: '2×2', insert: '\\begin{table}[H]\n\\centering\n\\begin{tabular}{cc}\n\\toprule\nA & B \\\\\n\\midrule\n1 & 2 \\\\\n\\bottomrule\n\\end{tabular}\n\\caption{Caption}\n\\label{tab:label}\n\\end{table}\n' },
      { label: '3×3', insert: '\\begin{table}[H]\n\\centering\n\\begin{tabular}{ccc}\n\\toprule\nA & B & C \\\\\n\\midrule\n1 & 2 & 3 \\\\\n4 & 5 & 6 \\\\\n\\bottomrule\n\\end{tabular}\n\\caption{Caption}\n\\label{tab:label}\n\\end{table}\n' },
      { label: '4×4', insert: '\\begin{table}[H]\n\\centering\n\\begin{tabular}{cccc}\n\\toprule\nA & B & C & D \\\\\n\\midrule\n1 & 2 & 3 & 4 \\\\\n5 & 6 & 7 & 8 \\\\\n9 & 10 & 11 & 12 \\\\\n\\bottomrule\n\\end{tabular}\n\\caption{Caption}\n\\label{tab:label}\n\\end{table}\n' },
      { label: 'hline', insert: '\\hline\n' },
      { label: 'toprule', insert: '\\toprule\n' },
      { label: 'midrule', insert: '\\midrule\n' },
      { label: 'bottomrule', insert: '\\bottomrule\n' },
      { label: 'multicolumn', insert: '\\multicolumn{2}{c}{text}' },
    ],
  },
  {
    name: 'Figures',
    tags: [
      { label: 'Figure', insert: '\\begin{figure}[H]\n  \\centering\n  \\includegraphics[width=0.75\\linewidth]{images/filename.png}\n  \\caption{Caption}\n  \\label{fig:label}\n\\end{figure}\n' },
      { label: 'Subfigure', insert: '\\begin{figure}[H]\n  \\centering\n  \\begin{subfigure}{0.45\\linewidth}\n    \\includegraphics[width=\\linewidth]{images/a.png}\n    \\caption{}\n  \\end{subfigure}\n  \\hfill\n  \\begin{subfigure}{0.45\\linewidth}\n    \\includegraphics[width=\\linewidth]{images/b.png}\n    \\caption{}\n  \\end{subfigure}\n  \\caption{Caption}\n\\end{figure}\n' },
      { label: 'Includegraphics', insert: '\\includegraphics[width=0.8\\linewidth]{images/filename.png}' },
      { label: 'Caption', open: '\\caption{', close: '}' },
      { label: 'Label', open: '\\label{', close: '}' },
    ],
  },
  {
    name: 'References',
    tags: [
      { label: 'Cite', open: '\\cite{', close: '}' },
      { label: 'Ref', open: '\\ref{', close: '}' },
      { label: 'Eqref', open: '\\eqref{', close: '}' },
      { label: 'Label', open: '\\label{', close: '}' },
      { label: 'Footnote', open: '\\footnote{', close: '}' },
      { label: 'Bibliography', insert: '\\bibliography{refs}\n' },
      { label: 'Bibitem', insert: '\\bibitem{key} Author, Title, Year.\n' },
    ],
  },
  {
    name: 'Layout',
    tags: [
      { label: 'newpage', insert: '\\newpage\n' },
      { label: 'clearpage', insert: '\\clearpage\n' },
      { label: 'vspace', insert: '\\vspace{1em}' },
      { label: 'hspace', insert: '\\hspace{1em}' },
      { label: 'vfill', insert: '\\vfill\n' },
      { label: 'center', insert: '\\begin{center}\n  \n\\end{center}\n' },
      { label: 'flushleft', insert: '\\begin{flushleft}\n  \n\\end{flushleft}\n' },
      { label: 'flushright', insert: '\\begin{flushright}\n  \n\\end{flushright}\n' },
      { label: 'hrule', insert: '\\hrule\n' },
      { label: 'multicols', insert: '\\begin{multicols}{2}\n  \n\\end{multicols}\n' },
    ],
  },
  {
    name: 'Environments',
    tags: [
      { label: 'abstract', insert: '\\begin{abstract}\n  \n\\end{abstract}\n' },
      { label: 'verbatim', insert: '\\begin{verbatim}\n  \n\\end{verbatim}\n' },
      { label: 'lstlisting', insert: '\\begin{lstlisting}\n  \n\\end{lstlisting}\n' },
      { label: 'quote', insert: '\\begin{quote}\n  \n\\end{quote}\n' },
      { label: 'theorem', insert: '\\begin{theorem}\n  \n\\end{theorem}\n' },
      { label: 'proof', insert: '\\begin{proof}\n  \n\\end{proof}\n' },
      { label: 'definition', insert: '\\begin{definition}\n  \n\\end{definition}\n' },
      { label: 'example', insert: '\\begin{example}\n  \n\\end{example}\n' },
      { label: 'remark', insert: '\\begin{remark}\n  \n\\end{remark}\n' },
      { label: 'tcolorbox', insert: '\\begin{tcolorbox}\n  \n\\end{tcolorbox}\n' },
    ],
  },
  {
    name: 'Preamble',
    tags: [
      { label: 'article', insert: '\\documentclass[12pt,a4paper]{article}\n' },
      { label: 'report', insert: '\\documentclass[12pt,a4paper]{report}\n' },
      { label: 'book', insert: '\\documentclass[12pt,a4paper]{book}\n' },
      { label: 'beamer', insert: '\\documentclass{beamer}\n' },
      { label: 'geometry', insert: '\\usepackage[a4paper,margin=1in]{geometry}\n' },
      { label: 'graphicx', insert: '\\usepackage{graphicx}\n' },
      { label: 'amsmath', insert: '\\usepackage{amsmath}\n' },
      { label: 'hyperref', insert: '\\usepackage[colorlinks=true,linkcolor=blue]{hyperref}\n' },
      { label: 'fancyhdr', insert: '\\usepackage{fancyhdr}\n' },
      { label: 'setspace', insert: '\\usepackage{setspace}\n' },
      { label: 'booktabs', insert: '\\usepackage{booktabs}\n' },
      { label: 'xcolor', insert: '\\usepackage{xcolor}\n' },
      { label: 'listings', insert: '\\usepackage{listings}\n' },
      { label: 'tikz', insert: '\\usepackage{tikz}\n' },
    ],
  },
];

export const TEMPLATES = [
  {
    name: 'Blank Article',
    desc: 'Clean article class with title page and abstract',
    code: `\\documentclass[12pt,a4paper]{article}
\\usepackage[a4paper,margin=1in]{geometry}
\\usepackage{graphicx}
\\usepackage{amsmath}
\\usepackage[colorlinks=true,linkcolor=blue]{hyperref}

\\title{Document Title}
\\author{Your Name}
\\date{\\today}

\\begin{document}
\\maketitle

\\begin{abstract}
Your abstract here.
\\end{abstract}

\\section{Introduction}
Your content here.

\\end{document}
`,
  },
  {
    name: 'Research Report',
    desc: 'Full report with TOC, chapters, and bibliography',
    code: `\\documentclass[12pt,a4paper]{report}
\\usepackage[a4paper,margin=1in]{geometry}
\\usepackage{graphicx}
\\usepackage{amsmath}
\\usepackage{booktabs}
\\usepackage[colorlinks=true]{hyperref}

\\title{Research Report Title}
\\author{Your Name}
\\date{\\today}

\\begin{document}
\\maketitle
\\tableofcontents
\\newpage

\\chapter{Introduction}
Background and motivation.

\\chapter{Literature Review}
Prior work in the field.

\\chapter{Methodology}
Approach and methods.

\\chapter{Results and Discussion}
Findings and analysis.

\\begin{thebibliography}{9}
\\bibitem{ref1} Author, \\textit{Title}, Year.
\\end{thebibliography}

\\end{document}
`,
  },
  {
    name: 'Beamer Presentation',
    desc: 'Slide deck with title, outline, content, math',
    code: `\\documentclass{beamer}
\\usetheme{Madrid}
\\usecolortheme{seahorse}

\\title{Presentation Title}
\\author{Your Name}
\\institute{Your Institution}
\\date{\\today}

\\begin{document}

\\frame{\\titlepage}

\\begin{frame}{Outline}
\\tableofcontents
\\end{frame}

\\section{Introduction}
\\begin{frame}{Introduction}
\\begin{itemize}
  \\item First point
  \\item Second point
  \\item Third point
\\end{itemize}
\\end{frame}

\\section{Math}
\\begin{frame}{Equations}
\\[ E = mc^2 \\]
\\[ \\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2} \\]
\\end{frame}

\\begin{frame}
\\centering \\Huge Thank You!
\\end{frame}

\\end{document}
`,
  },
  {
    name: 'Academic Thesis',
    desc: 'Book class with frontmatter, mainmatter, backmatter',
    code: `\\documentclass[12pt,a4paper,oneside]{book}
\\usepackage[a4paper,margin=1.25in]{geometry}
\\usepackage{graphicx}
\\usepackage{amsmath}
\\usepackage{setspace}
\\onehalfspacing

\\title{Thesis Title}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\frontmatter
\\maketitle
\\tableofcontents
\\listoffigures

\\chapter{Abstract}
Your abstract goes here.

\\mainmatter
\\chapter{Introduction}
Introductory chapter.

\\chapter{Background}
Background and theory.

\\chapter{Methodology}
Methods used.

\\chapter{Results}
Your results.

\\chapter{Conclusion}
Closing remarks.

\\backmatter
\\begin{thebibliography}{99}
\\bibitem{ref1} Author, Title, Year.
\\end{thebibliography}

\\end{document}
`,
  },
  {
    name: 'IEEE Paper',
    desc: 'Two-column IEEEtran with abstract and references',
    code: `\\documentclass[conference]{IEEEtran}
\\usepackage{cite}
\\usepackage{amsmath,amssymb}
\\usepackage{graphicx}

\\title{IEEE Conference Paper Title}
\\author{\\IEEEauthorblockN{First Author}
\\IEEEauthorblockA{Department \\\\ University \\\\ email@example.com}}

\\begin{document}
\\maketitle

\\begin{abstract}
Your abstract goes here.
\\end{abstract}

\\begin{IEEEkeywords}
keyword1, keyword2, keyword3
\\end{IEEEkeywords}

\\section{Introduction}
Introduction text.

\\section{Related Work}
Related work.

\\section{Method}
Methodology.

\\section{Experiments}
Experimental setup and results.

\\section{Conclusion}
Conclusion.

\\begin{thebibliography}{1}
\\bibitem{b1} Author, \`\`Paper title,'' \\textit{Journal}, vol.~1, 2024.
\\end{thebibliography}

\\end{document}
`,
  },
  {
    name: 'CV / Resume',
    desc: 'Clean professional CV with all standard sections',
    code: `\\documentclass[11pt,a4paper]{article}
\\usepackage[a4paper,margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage[colorlinks=true,linkcolor=blue,urlcolor=blue]{hyperref}

\\titleformat{\\section}{\\large\\bfseries\\uppercase}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{12pt}{6pt}
\\setlist{nosep,leftmargin=*}
\\pagestyle{empty}

\\begin{document}

\\begin{center}
{\\huge \\textbf{Your Name}}\\\\[4pt]
City, Country $\\bullet$ email@example.com $\\bullet$ +1 234 567 890 $\\bullet$ \\href{https://github.com/you}{github.com/you}
\\end{center}

\\section{Summary}
Brief professional summary.

\\section{Experience}
\\textbf{Senior Engineer} \\hfill 2023--Present\\\\
Company Name, City
\\begin{itemize}
  \\item Achievement one with measurable impact.
  \\item Achievement two with measurable impact.
\\end{itemize}

\\textbf{Junior Engineer} \\hfill 2020--2023\\\\
Previous Company, City
\\begin{itemize}
  \\item Built X that resulted in Y.
\\end{itemize}

\\section{Education}
\\textbf{B.Sc. Computer Science} \\hfill 2016--2020\\\\
University Name, City

\\section{Skills}
\\textbf{Languages:} Python, JavaScript, C++ \\\\
\\textbf{Tools:} Git, Docker, AWS

\\end{document}
`,
  },
  {
    name: 'Lab Report',
    desc: 'Objective, theory, data, discussion, conclusion',
    code: `\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{graphicx}
\\usepackage{amsmath}
\\usepackage{booktabs}
\\usepackage{float}

\\title{Lab Report: Experiment Title}
\\author{Your Name \\\\ Lab Partner}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Objective}
State the goal of the experiment.

\\section{Theory}
Underlying theory and equations.
\\[ F = ma \\]

\\section{Apparatus}
Equipment used.

\\section{Procedure}
\\begin{enumerate}
  \\item Step one.
  \\item Step two.
\\end{enumerate}

\\section{Data and Results}
\\begin{table}[H]
\\centering
\\begin{tabular}{ccc}
\\toprule
Trial & Measurement & Uncertainty \\\\
\\midrule
1 & 9.81 & 0.02 \\\\
2 & 9.79 & 0.02 \\\\
\\bottomrule
\\end{tabular}
\\caption{Measured values.}
\\end{table}

\\section{Discussion}
Analysis of results, sources of error.

\\section{Conclusion}
Summary of findings.

\\end{document}
`,
  },
  {
    name: 'Exam Paper',
    desc: 'Exam class with problems and point values',
    code: `\\documentclass[12pt,a4paper]{exam}
\\usepackage{amsmath,amssymb}
\\usepackage[margin=1in]{geometry}

\\printanswers

\\title{Course Name --- Final Exam}
\\author{Instructor Name}
\\date{\\today}

\\begin{document}
\\maketitle

\\begin{center}
\\fbox{\\fbox{\\parbox{5.5in}{\\centering
Total: 100 points. Time: 120 minutes.}}}
\\end{center}

\\begin{questions}

\\question[20] Solve the equation $x^2 - 5x + 6 = 0$.
\\begin{solution}
$x = 2$ or $x = 3$.
\\end{solution}

\\question[30] Prove that $\\sqrt{2}$ is irrational.

\\question[25] Compute $\\int_0^1 x^2\\,dx$.

\\question[25] Short answers:
\\begin{parts}
  \\part[10] Define a vector space.
  \\part[15] Give an example of a non-abelian group.
\\end{parts}

\\end{questions}

\\end{document}
`,
  },
];

export const SNIPPETS = [
  { cat: 'Math', name: 'Inline equation', body: '$\\frac{a}{b}$' },
  { cat: 'Math', name: 'Display equation', body: '\\[\n  E = mc^2\n\\]' },
  { cat: 'Math', name: 'Aligned equations', body: '\\begin{align}\n  a &= b + c \\\\\n  d &= e - f\n\\end{align}' },
  { cat: 'Math', name: 'Cases', body: '\\begin{cases}\n  x & \\text{if } y > 0 \\\\\n  -x & \\text{otherwise}\n\\end{cases}' },
  { cat: 'Math', name: 'Matrix 3x3', body: '\\begin{pmatrix}\n  a & b & c \\\\\n  d & e & f \\\\\n  g & h & i\n\\end{pmatrix}' },
  { cat: 'Math', name: 'Determinant', body: '\\begin{vmatrix}\n  a & b \\\\\n  c & d\n\\end{vmatrix}' },
  { cat: 'Math', name: 'Sum to N', body: '\\sum_{i=1}^{N} a_i' },
  { cat: 'Math', name: 'Product to N', body: '\\prod_{i=1}^{N} a_i' },
  { cat: 'Math', name: 'Definite integral', body: '\\int_{a}^{b} f(x)\\,dx' },
  { cat: 'Math', name: 'Limit', body: '\\lim_{x \\to \\infty} f(x)' },
  { cat: 'Tables', name: 'Booktabs 3-col', body: '\\begin{table}[H]\n\\centering\n\\begin{tabular}{lcc}\n\\toprule\nCol1 & Col2 & Col3 \\\\\n\\midrule\na & b & c \\\\\nd & e & f \\\\\n\\bottomrule\n\\end{tabular}\n\\caption{}\n\\label{}\n\\end{table}' },
  { cat: 'Tables', name: 'Tabularx', body: '\\begin{tabularx}{\\linewidth}{lXr}\n\\toprule\nA & B & C \\\\\n\\midrule\n1 & 2 & 3 \\\\\n\\bottomrule\n\\end{tabularx}' },
  { cat: 'Tables', name: 'Multirow', body: '\\multirow{2}{*}{Cell}' },
  { cat: 'Figures', name: 'Standard figure', body: '\\begin{figure}[H]\n  \\centering\n  \\includegraphics[width=0.8\\linewidth]{images/file.png}\n  \\caption{}\n  \\label{fig:}\n\\end{figure}' },
  { cat: 'Figures', name: 'Two figures side-by-side', body: '\\begin{figure}[H]\n  \\centering\n  \\begin{minipage}{0.45\\linewidth}\n    \\includegraphics[width=\\linewidth]{images/a.png}\n    \\caption{Left}\n  \\end{minipage}\\hfill\n  \\begin{minipage}{0.45\\linewidth}\n    \\includegraphics[width=\\linewidth]{images/b.png}\n    \\caption{Right}\n  \\end{minipage}\n\\end{figure}' },
  { cat: 'Figures', name: 'Wrapfigure', body: '\\begin{wrapfigure}{r}{0.4\\linewidth}\n  \\includegraphics[width=\\linewidth]{images/file.png}\n  \\caption{}\n\\end{wrapfigure}' },
  { cat: 'Environments', name: 'Theorem', body: '\\begin{theorem}\n  Statement of the theorem.\n\\end{theorem}' },
  { cat: 'Environments', name: 'Proof', body: '\\begin{proof}\n  Proof here.\n\\end{proof}' },
  { cat: 'Environments', name: 'Definition', body: '\\begin{definition}\n  Definition here.\n\\end{definition}' },
  { cat: 'Environments', name: 'Example', body: '\\begin{example}\n  Example here.\n\\end{example}' },
  { cat: 'Environments', name: 'Code listing', body: '\\begin{lstlisting}[language=Python]\ndef hello():\n    print("Hello")\n\\end{lstlisting}' },
  { cat: 'Environments', name: 'Quote block', body: '\\begin{quote}\n  Quoted text.\n\\end{quote}' },
  { cat: 'Environments', name: 'Verbatim', body: '\\begin{verbatim}\nRaw text\n\\end{verbatim}' },
  { cat: 'TikZ', name: 'Basic axes', body: '\\begin{tikzpicture}\n  \\draw[->] (0,0) -- (4,0) node[right] {$x$};\n  \\draw[->] (0,0) -- (0,3) node[above] {$y$};\n\\end{tikzpicture}' },
  { cat: 'TikZ', name: 'Node', body: '\\node[draw,circle] (A) at (0,0) {A};' },
  { cat: 'TikZ', name: 'Arrow between nodes', body: '\\draw[->] (A) -- (B);' },
  { cat: 'TikZ', name: 'Filled rectangle', body: '\\draw[fill=blue!20] (0,0) rectangle (2,1);' },
  { cat: 'Math', name: 'Greek letters', body: '\\alpha, \\beta, \\gamma, \\delta' },
  { cat: 'Math', name: 'Quadratic formula', body: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  { cat: 'Math', name: 'Partial derivative', body: '\\frac{\\partial f}{\\partial x}' },
  { cat: 'Math', name: 'Fraction', body: '\\frac{a}{b}' },
];

export const SYMBOLS = [
  { cat: 'Greek', items: [
    {sym:'α',cmd:'\\alpha'},{sym:'β',cmd:'\\beta'},{sym:'γ',cmd:'\\gamma'},{sym:'δ',cmd:'\\delta'},
    {sym:'ε',cmd:'\\epsilon'},{sym:'ζ',cmd:'\\zeta'},{sym:'η',cmd:'\\eta'},{sym:'θ',cmd:'\\theta'},
    {sym:'ι',cmd:'\\iota'},{sym:'κ',cmd:'\\kappa'},{sym:'λ',cmd:'\\lambda'},{sym:'μ',cmd:'\\mu'},
    {sym:'ν',cmd:'\\nu'},{sym:'ξ',cmd:'\\xi'},{sym:'π',cmd:'\\pi'},{sym:'ρ',cmd:'\\rho'},
    {sym:'σ',cmd:'\\sigma'},{sym:'τ',cmd:'\\tau'},{sym:'υ',cmd:'\\upsilon'},{sym:'φ',cmd:'\\phi'},
    {sym:'χ',cmd:'\\chi'},{sym:'ψ',cmd:'\\psi'},{sym:'ω',cmd:'\\omega'},
    {sym:'Γ',cmd:'\\Gamma'},{sym:'Δ',cmd:'\\Delta'},{sym:'Θ',cmd:'\\Theta'},{sym:'Λ',cmd:'\\Lambda'},
    {sym:'Ξ',cmd:'\\Xi'},{sym:'Π',cmd:'\\Pi'},{sym:'Σ',cmd:'\\Sigma'},{sym:'Φ',cmd:'\\Phi'},{sym:'Ψ',cmd:'\\Psi'},{sym:'Ω',cmd:'\\Omega'},
  ]},
  { cat: 'Operators', items: [
    {sym:'+',cmd:'+'},{sym:'−',cmd:'-'},{sym:'×',cmd:'\\times'},{sym:'÷',cmd:'\\div'},
    {sym:'·',cmd:'\\cdot'},{sym:'∗',cmd:'\\ast'},{sym:'∘',cmd:'\\circ'},{sym:'⊕',cmd:'\\oplus'},
    {sym:'⊗',cmd:'\\otimes'},{sym:'⊙',cmd:'\\odot'},{sym:'∑',cmd:'\\sum'},{sym:'∏',cmd:'\\prod'},
    {sym:'∫',cmd:'\\int'},{sym:'∮',cmd:'\\oint'},{sym:'√',cmd:'\\sqrt{}'},{sym:'∂',cmd:'\\partial'},{sym:'∇',cmd:'\\nabla'},
  ]},
  { cat: 'Relations', items: [
    {sym:'=',cmd:'='},{sym:'≠',cmd:'\\neq'},{sym:'≤',cmd:'\\leq'},{sym:'≥',cmd:'\\geq'},
    {sym:'≈',cmd:'\\approx'},{sym:'≡',cmd:'\\equiv'},{sym:'∼',cmd:'\\sim'},{sym:'≅',cmd:'\\cong'},
    {sym:'≪',cmd:'\\ll'},{sym:'≫',cmd:'\\gg'},{sym:'∝',cmd:'\\propto'},
  ]},
  { cat: 'Arrows', items: [
    {sym:'→',cmd:'\\to'},{sym:'←',cmd:'\\leftarrow'},{sym:'↔',cmd:'\\leftrightarrow'},
    {sym:'⇒',cmd:'\\Rightarrow'},{sym:'⇐',cmd:'\\Leftarrow'},{sym:'⇔',cmd:'\\Leftrightarrow'},
    {sym:'↑',cmd:'\\uparrow'},{sym:'↓',cmd:'\\downarrow'},{sym:'↦',cmd:'\\mapsto'},
  ]},
  { cat: 'Sets', items: [
    {sym:'∈',cmd:'\\in'},{sym:'∉',cmd:'\\notin'},{sym:'⊂',cmd:'\\subset'},{sym:'⊃',cmd:'\\supset'},
    {sym:'⊆',cmd:'\\subseteq'},{sym:'⊇',cmd:'\\supseteq'},{sym:'∪',cmd:'\\cup'},{sym:'∩',cmd:'\\cap'},
    {sym:'∅',cmd:'\\emptyset'},{sym:'ℝ',cmd:'\\mathbb{R}'},{sym:'ℕ',cmd:'\\mathbb{N}'},
    {sym:'ℤ',cmd:'\\mathbb{Z}'},{sym:'ℚ',cmd:'\\mathbb{Q}'},{sym:'ℂ',cmd:'\\mathbb{C}'},
    {sym:'∀',cmd:'\\forall'},{sym:'∃',cmd:'\\exists'},{sym:'∞',cmd:'\\infty'},
  ]},
];

// LaTeX commands and environments for autocomplete
export const LATEX_COMMANDS = [
  ['\\section', 'sectioning', 'section{title}'],
  ['\\subsection', 'sectioning', 'subsection{title}'],
  ['\\subsubsection', 'sectioning', 'subsubsection{title}'],
  ['\\chapter', 'sectioning', 'chapter{title}'],
  ['\\paragraph', 'sectioning', 'paragraph{title}'],
  ['\\textbf', 'format', 'bold text'],
  ['\\textit', 'format', 'italic text'],
  ['\\emph', 'format', 'emphasized'],
  ['\\underline', 'format', 'underlined'],
  ['\\texttt', 'format', 'monospace'],
  ['\\textsc', 'format', 'small caps'],
  ['\\textsf', 'format', 'sans-serif'],
  ['\\textcolor', 'format', 'colored text'],
  ['\\sout', 'format', 'strikethrough'],
  ['\\section*', 'sectioning', 'unnumbered section'],
  ['\\item', 'list', 'list item'],
  ['\\label', 'reference', 'label{key}'],
  ['\\ref', 'reference', 'ref{key}'],
  ['\\eqref', 'reference', 'eqref{key}'],
  ['\\pageref', 'reference', 'pageref{key}'],
  ['\\autoref', 'reference', 'autoref{key}'],
  ['\\cite', 'reference', 'cite{key}'],
  ['\\citep', 'reference', 'parens cite'],
  ['\\citet', 'reference', 'text cite'],
  ['\\bibitem', 'reference', 'bibitem{key}'],
  ['\\caption', 'figure', 'caption{text}'],
  ['\\includegraphics', 'figure', 'include image'],
  ['\\graphicspath', 'figure', '{paths}'],
  ['\\href', 'link', 'href{url}{text}'],
  ['\\url', 'link', 'url{address}'],
  ['\\footnote', 'misc', 'footnote{text}'],
  ['\\index', 'misc', 'index{term}'],
  ['\\title', 'meta', 'title{text}'],
  ['\\author', 'meta', 'author{name}'],
  ['\\date', 'meta', 'date{value}'],
  ['\\maketitle', 'meta', 'render title'],
  ['\\tableofcontents', 'meta', 'TOC'],
  ['\\listoffigures', 'meta', 'list of figures'],
  ['\\listoftables', 'meta', 'list of tables'],
  ['\\newpage', 'layout', 'page break'],
  ['\\clearpage', 'layout', 'clear page'],
  ['\\noindent', 'layout', 'no indent'],
  ['\\centering', 'layout', 'center'],
  ['\\hspace', 'layout', 'hspace{len}'],
  ['\\vspace', 'layout', 'vspace{len}'],
  ['\\hfill', 'layout', 'fill horizontal'],
  ['\\vfill', 'layout', 'fill vertical'],
  ['\\frac', 'math', 'frac{a}{b}'],
  ['\\sqrt', 'math', 'sqrt{x}'],
  ['\\sum', 'math', 'sum'],
  ['\\int', 'math', 'integral'],
  ['\\prod', 'math', 'product'],
  ['\\lim', 'math', 'limit'],
  ['\\infty', 'math', 'infinity'],
  ['\\partial', 'math', 'partial derivative'],
  ['\\nabla', 'math', 'nabla'],
  ['\\alpha', 'greek', 'α'], ['\\beta', 'greek', 'β'], ['\\gamma', 'greek', 'γ'],
  ['\\delta', 'greek', 'δ'], ['\\epsilon', 'greek', 'ε'], ['\\zeta', 'greek', 'ζ'],
  ['\\eta', 'greek', 'η'], ['\\theta', 'greek', 'θ'], ['\\iota', 'greek', 'ι'],
  ['\\kappa', 'greek', 'κ'], ['\\lambda', 'greek', 'λ'], ['\\mu', 'greek', 'μ'],
  ['\\nu', 'greek', 'ν'], ['\\xi', 'greek', 'ξ'], ['\\pi', 'greek', 'π'],
  ['\\rho', 'greek', 'ρ'], ['\\sigma', 'greek', 'σ'], ['\\tau', 'greek', 'τ'],
  ['\\phi', 'greek', 'φ'], ['\\chi', 'greek', 'χ'], ['\\psi', 'greek', 'ψ'],
  ['\\omega', 'greek', 'ω'], ['\\Gamma', 'greek', 'Γ'], ['\\Delta', 'greek', 'Δ'],
  ['\\Theta', 'greek', 'Θ'], ['\\Lambda', 'greek', 'Λ'], ['\\Sigma', 'greek', 'Σ'],
  ['\\Phi', 'greek', 'Φ'], ['\\Psi', 'greek', 'Ψ'], ['\\Omega', 'greek', 'Ω'],
  ['\\rightarrow', 'symbol', '→'], ['\\leftarrow', 'symbol', '←'],
  ['\\Rightarrow', 'symbol', '⇒'], ['\\Leftarrow', 'symbol', '⇐'],
  ['\\leftrightarrow', 'symbol', '↔'], ['\\Leftrightarrow', 'symbol', '⇔'],
  ['\\leq', 'symbol', '≤'], ['\\geq', 'symbol', '≥'], ['\\neq', 'symbol', '≠'],
  ['\\approx', 'symbol', '≈'], ['\\equiv', 'symbol', '≡'], ['\\sim', 'symbol', '∼'],
  ['\\in', 'symbol', '∈'], ['\\notin', 'symbol', '∉'], ['\\subset', 'symbol', '⊂'],
  ['\\cup', 'symbol', '∪'], ['\\cap', 'symbol', '∩'], ['\\emptyset', 'symbol', '∅'],
  ['\\forall', 'symbol', '∀'], ['\\exists', 'symbol', '∃'],
  ['\\usepackage', 'preamble', 'usepackage{}'],
  ['\\documentclass', 'preamble', 'documentclass{}'],
  ['\\begin', 'env', 'begin{env}'],
  ['\\end', 'env', 'end{env}'],
];
export const LATEX_ENVIRONMENTS = [
  'document', 'abstract', 'itemize', 'enumerate', 'description',
  'equation', 'equation*', 'align', 'align*', 'gather', 'gather*', 'multline',
  'figure', 'figure*', 'table', 'table*', 'tabular', 'tabularx', 'longtable',
  'verbatim', 'lstlisting', 'quote', 'quotation', 'center', 'flushleft', 'flushright',
  'theorem', 'lemma', 'proposition', 'corollary', 'definition', 'proof', 'example', 'remark',
  'tikzpicture', 'minipage', 'tcolorbox', 'IEEEkeywords', 'thebibliography', 'array',
  'matrix', 'pmatrix', 'bmatrix', 'vmatrix', 'cases',
];

// Keyboard shortcuts (for help modal)
export const SHORTCUTS = [
  { section: 'Editor', items: [
    ['Ctrl+B', 'Bold'],
    ['Ctrl+I', 'Italic'],
    ['Ctrl+U', 'Underline'],
    ['Ctrl+/', 'Toggle comment'],
    ['Ctrl+D', 'Duplicate line'],
    ['Ctrl+L', 'Select line'],
    ['Ctrl+Z / Ctrl+Y', 'Undo / Redo'],
    ['Tab / Shift+Tab', 'Indent / Outdent'],
    ['Enter', 'Smart newline (continues lists)'],
    ['{ [ ( $', 'Auto-close pairs'],
    ['Alt+Click', 'Add cursor'],
    ['Esc', 'Clear extra cursors'],
  ]},
  { section: 'File & Search', items: [
    ['Ctrl+S', 'Save'],
    ['Ctrl+Shift+S', 'Create snapshot'],
    ['Ctrl+F', 'Find'],
    ['Ctrl+H', 'Find & Replace'],
    ['F3 / Shift+F3', 'Next / Previous match'],
    ['Ctrl+P', 'Command palette'],
    ['Ctrl+Shift+E', 'Export'],
    ['Ctrl+Shift+D', 'Document statistics'],
    ['Ctrl+Shift+F or F11', 'Focus mode'],
  ]},
  { section: 'Autocomplete', items: [
    ['Ctrl+Space', 'Trigger autocomplete'],
    ['↑ ↓', 'Navigate suggestions'],
    ['Enter / Tab', 'Accept suggestion'],
    ['Esc', 'Dismiss'],
  ]},
  { section: 'Preview', items: [
    ['Ctrl+=', 'Zoom in'],
    ['Ctrl+-', 'Zoom out'],
    ['Ctrl+0', 'Reset zoom'],
  ]},
  { section: 'Help', items: [
    ['?', 'Show keyboard shortcuts'],
    ['Esc', 'Close any modal'],
  ]},
];
