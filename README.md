```
  ██╗      █████╗ ████████╗███████╗██╗  ██╗   ███████╗████████╗██╗   ██╗██████╗ ██╗ ██████╗
  ██║     ██╔══██╗╚══██╔══╝██╔════╝╚██╗██╔╝   ██╔════╝╚══██╔══╝██║   ██║██╔══██╗██║██╔═══██╗
  ██║     ███████║   ██║   █████╗   ╚███╔╝    ███████╗   ██║   ██║   ██║██║  ██║██║██║   ██║
  ██║     ██╔══██║   ██║   ██╔══╝   ██╔██╗    ╚════██║   ██║   ██║   ██║██║  ██║██║██║   ██║
  ███████╗██║  ██║   ██║   ███████╗██╔╝ ██╗   ███████║   ██║   ╚██████╔╝██████╔╝██║╚██████╔╝
  ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝   ╚══════╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═╝ ╚═════╝

         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                       v4.0  ·  Multi-file architecture  ·  UI overhaul
                       Premium browser-based LaTeX editor  ·  zero install
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

<div align="center">

![Multi-file](https://img.shields.io/badge/architecture-multi%20file-f59e0b?style=flat-square)
![No Build](https://img.shields.io/badge/build-not%20required-18181b?style=flat-square)
![Vanilla JS](https://img.shields.io/badge/vanilla-JS-fbbf24?style=flat-square)
![KaTeX](https://img.shields.io/badge/math-KaTeX-329?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-success?style=flat-square)

**[Try it](#getting-started)** · **[Features](#features)** · **[Themes](#themes)** · **[Architecture](#architecture)** · **[Shortcuts](#keyboard-shortcuts)**

</div>

---

## What's new in v4.0

```
  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  ┃   v4.0  —  MULTI-FILE  +  UI OVERHAUL                                    ┃
  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

- **Multi-file architecture** — refactored from a 5,900-line single file into 24 clean ES modules.
- **5 themes** — Dark Editorial · Light Paper · Solarized Dark · Midnight Ocean · Warm Parchment.
- **PDF export** via browser print dialog (no wasm needed).
- **Document statistics** — words, reading time, Flesch reading ease, structure breakdown, word goal tracker.
- **Snapshot diff viewer** — side-by-side diff with Myers-LCS algorithm.
- **Equation hover preview** — hover any inline `$..$` to see the rendered result.
- **Multi-cursor editing** — Alt-click to add cursors (up to 8).
- **Focus mode + Typewriter mode** — distraction-free writing.
- **Bibliography editor** — full BibTeX entry editor with import/export.
- **Scroll sync** — bidirectional editor ↔ preview.
- **Enhanced autocomplete** — snippet triggers (`fig`, `tab`, `eq`), tab stops, smart `\ref` / `\cite`.
- **"Obsidian Precision" design language** — every pixel intentional.

---

## Features

```
  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  ┃   EDITOR ENGINE                                                          ┃
  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

- **Real syntax highlighting** — overlay-based hand-written tokenizer
- **Intelligent autocomplete** — 100+ commands, all environments, dynamic `\ref` / `\cite`, snippet triggers, tab stops
- **Inline linting** — environment balance, brace matching, math delimiters, undefined refs, missing `\documentclass`
- **Auto-closing brackets** — `{ [ ( $` insert pairs, selection wraps, backspace removes empty pairs
- **Smart Tab / Shift-Tab** — block indent / outdent, multi-line aware
- **Smart Enter** — continues `\item` lists, exits empty items, preserves indent
- **Toggle comments** on selections (`Ctrl+/`)
- **Multi-cursor** — Alt-click adds cursors, all type/delete simultaneously
- **Equation hover** — KaTeX preview tooltip over inline math
- **Undo / redo** with grouped edits
- **Find & Replace** — regex, case-sensitive, live count, F3 navigation
- **Auto-save** to localStorage with restore prompt on revisit

```
  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  ┃   LIVE PREVIEW                                                           ┃
  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

- **Real math** — KaTeX renders `$..$`, `\[..\]`, `equation`, `align`, `gather`, `multline`
- **Brace-aware parser** — handles nested commands, multi-arg macros, tabular column specs
- **70+ commands stripped silently** for clean output
- **Image embedding** from base64 — drop, paste, or browse
- **Resizable preview pane** — drag handle, double-click to toggle
- **Zoom** 75 / 100 / 125 / 150% with `Ctrl+= / -` / `Ctrl+0`
- **Bidirectional scroll sync**

```
  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  ┃   STATISTICS & PRODUCTIVITY                                              ┃
  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

- **Words · characters · sentences · paragraphs · reading time · speaking time**
- **Flesch reading ease** with color-coded difficulty
- **Lexical diversity** and avg words/sentence
- **Structure breakdown** — sections, subsections, equations, figures, tables, citations, labels
- **Word goal tracker** with progress bar (and confetti at 100%)
- **Snapshots** — manual save points (up to 30), with diff viewer
- **Bibliography manager** — add, edit, delete, import/export `.bib` files

```
  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  ┃   EXPORT                                                                 ┃
  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

| Format | Output | Notes |
|--------|--------|-------|
| **Overleaf ZIP** | `main.tex` + `images/` + `.latexmkrc` + `README.txt` | one click → upload |
| **PDF** | `.pdf` | browser print → "Save as PDF" |
| LaTeX | `.tex` | raw source |
| HTML | `.html` | standalone, KaTeX-styled |
| Markdown | `.md` | with embedded images |
| Plain Text | `.txt` | stripped to prose |
| Workspace | `.json` | code + images + snapshots + bibliography |
| Clipboard | — | full source copy |

---

## Themes

```
  ┌─ Dark Editorial ──┐  ┌─ Light Paper ──┐  ┌─ Solarized Dark ─┐
  │ #11111a           │  │ #ffffff         │  │ #002b36           │
  │ accent #f59e0b ●  │  │ accent #d97706●│  │ accent #b58900 ●  │
  └───────────────────┘  └────────────────┘  └───────────────────┘
  ┌─ Midnight Ocean ──┐  ┌─ Warm Parchment ─┐
  │ #04111f           │  │ #faf5e8           │
  │ accent #06b6d4 ●  │  │ accent #c0392b ●  │
  └───────────────────┘  └───────────────────┘
```

---

## Getting Started

```bash
# Clone or download
git clone https://github.com/DEVTHAKUR-90/LateXStudiO.git
cd LateXStudiO

# Open in browser — that's it
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

> **Note** Internet is required on first load (CDN). After that, browser cache lets it work offline.

The app loads CDN scripts (React 18, KaTeX 0.16, JSZip 3.10, FileSaver 2.0) and uses native ES modules. **No build step. No npm install.**

---

## Project Structure

```
latexstudio/
├── index.html              ← Shell: loads CDN scripts + CSS + entry module
├── css/
│   ├── variables.css       ← All design tokens
│   ├── themes.css          ← All 5 themes
│   ├── base.css            ← Reset, body, scrollbars
│   ├── components.css      ← Buttons, inputs, badges, tooltips
│   ├── layout.css          ← Topbar, toolbar, sidebar, statusbar
│   ├── editor.css          ← Textarea, syntax overlay, multi-cursor
│   ├── preview.css         ← Preview pane, paper feel
│   └── modals.css          ← Modals, autocomplete, toasts, diff
└── js/
    ├── constants.js        ← TEMPLATES, SNIPPETS, SYMBOLS, TOOLBAR_GROUPS
    ├── state.js            ← Reactive state container + event bus
    ├── storage.js          ← localStorage adapters
    ├── highlighter.js      ← Syntax tokenizer (LaTeX → HTML)
    ├── linter.js           ← Issue detection rules
    ├── autocomplete.js     ← Completion engine + doc index
    ├── editor.js           ← Textarea logic, multi-cursor, find/replace
    ├── converter.js        ← LaTeX → HTML, MD, TXT; diff; stats; bibtex
    ├── exporter.js         ← All export formats + Overleaf ZIP builder
    ├── toolbar.js          ← Group tabs + tag buttons
    ├── sidebar.js          ← Images / Outline / Snippets / Symbols / Bib / History
    ├── preview.js          ← Live render, KaTeX, scroll sync, zoom
    ├── stats.js            ← Document stats panel + confetti
    ├── modals.js           ← Export, Templates, Settings, Diff, Bib editor, Palette
    ├── ui.js               ← Toasts, status bar, focus mode
    └── app.js              ← Boot, DOM build, global keys, autosave
```

---

## Architecture

```
                         ┌─────────────────────┐
                         │     index.html      │
                         │  (shell + CDN libs) │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │      app.js         │
                         │   (entry, wiring)   │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
        ┌─────▼─────┐         ┌─────▼─────┐         ┌─────▼─────┐
        │  state.js │◄────────┤  bus.js   │────────►│ storage.js│
        │  (data)   │         │ (events)  │         │ (persist) │
        └─────┬─────┘         └───────────┘         └───────────┘
              │
   ┌──────────┼──────────┬──────────┬──────────┬──────────┬──────────┐
   ▼          ▼          ▼          ▼          ▼          ▼          ▼
┌──────┐ ┌──────┐  ┌──────────┐ ┌────────┐ ┌─────────┐ ┌──────┐ ┌────────┐
│editor│ │ ui   │  │ toolbar  │ │sidebar │ │ preview │ │stats │ │ modals │
└──┬───┘ └──────┘  └──────────┘ └────────┘ └────┬────┘ └──────┘ └────────┘
   │                                             │
┌──▼──────────────┐                       ┌──────▼─────────┐
│ highlighter.js  │                       │  converter.js  │
│ linter.js       │                       │  (LaTeX → HTML)│
│ autocomplete.js │                       └────────────────┘
└─────────────────┘
```

All modules are loose-coupled via:

- **`state.js`** — single source of truth, modules subscribe to keys
- **`bus.js`** — publish/subscribe events for cross-module communication
- **No circular imports** — converter and helpers are pure functions

---

## Keyboard Shortcuts

```
  ┌─ EDITOR ──────────────────────┐    ┌─ FILE & SEARCH ───────────────┐
  │  Ctrl+B    Bold               │    │  Ctrl+S       Save            │
  │  Ctrl+I    Italic             │    │  Ctrl+⇧+S     Snapshot        │
  │  Ctrl+U    Underline          │    │  Ctrl+F       Find            │
  │  Ctrl+/    Toggle comment     │    │  Ctrl+H       Find & Replace  │
  │  Ctrl+D    Duplicate line     │    │  F3 / ⇧F3     Next / Prev     │
  │  Ctrl+L    Select line        │    │  Ctrl+P       Command palette │
  │  Ctrl+Z    Undo               │    │  Ctrl+⇧+E     Export          │
  │  Ctrl+Y    Redo               │    │  Ctrl+⇧+D     Statistics      │
  │  Tab       Indent block       │    │  F11 / ⇧+F    Focus mode      │
  │  ⇧+Tab     Outdent            │    └───────────────────────────────┘
  │  Enter     Smart newline      │
  │  Alt+Click Add cursor         │    ┌─ AUTOCOMPLETE ────────────────┐
  │  Esc       Clear extra cursors│    │  Ctrl+Space   Trigger         │
  │  { [ ( $   Auto-close pairs   │    │  ↑ ↓          Navigate        │
  └───────────────────────────────┘    │  Enter / Tab  Accept          │
                                       │  Esc          Dismiss         │
  ┌─ PREVIEW ─────────────────────┐    └───────────────────────────────┘
  │  Ctrl+=       Zoom in         │
  │  Ctrl+-       Zoom out        │    ┌─ MISC ────────────────────────┐
  │  Ctrl+0       Reset zoom      │    │  ?           Shortcut help    │
  └───────────────────────────────┘    │  Esc         Close any modal  │
                                       └───────────────────────────────┘
```

Press `?` in the app to open the live shortcut sheet.

---

## Tech Stack

```
   Vanilla JS (ES modules)  ───  no framework, native browser APIs
   React 18 (CDN)           ───  loaded but used minimally (error boundary)
   KaTeX 0.16               ───  math typesetting
   JSZip 3.10               ───  Overleaf bundle generation
   FileSaver.js 2.0         ───  client-side file downloads
```

The published files are **fully self-contained**. No `node_modules`, no `package.json`, no toolchain.

---

## Contributing

Multi-file architecture makes contributing easy:

```
  Bug in syntax highlighting?     →  edit  js/highlighter.js
  New theme?                      →  edit  css/themes.css
  Add a snippet?                  →  edit  js/constants.js
  Improve a modal?                →  edit  js/modals.js
  Add an export format?           →  edit  js/exporter.js
```

Each file is < 1,000 lines and has a clear responsibility.

```
  1. Fork  →  2. Branch  →  3. Edit one or two files  →  4. PR
```

---

## 📬 Contact

<div align="center">

[![Email](https://img.shields.io/badge/📧_Email-90dthakur@gmail.com-EA4335?style=for-the-badge)](mailto:90dthakur@gmail.com)
[![LinkedIn](https://img.shields.io/badge/💼_LinkedIn-dev--thakur90-0A66C2?style=for-the-badge)](https://www.linkedin.com/in/dev-thakur90)
[![GitHub](https://img.shields.io/badge/🐙_GitHub-DEVTHAKUR--90-181717?style=for-the-badge)](https://github.com/DEVTHAKUR-90)
[![Portfolio](https://img.shields.io/badge/🌐_Portfolio-devthakur.vercel.app-7C3AED?style=for-the-badge)](https://devthakur.vercel.app)

</div>

---

## 📄 License

Open source under the [MIT License](LICENSE).

---

<div align="center">

<br>

⭐ **Star this repo if you found it useful** ⭐

<br>

<img src="https://img.shields.io/badge/Built_with-❤️_by_Dev_Thakur-7C3AED?style=for-the-badge" />

<br><br>

<sub>© 2026 Dev Thakur. All rights reserved.</sub>

</div>
