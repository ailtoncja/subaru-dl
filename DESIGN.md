---
name: Subaru DL
description: Windows downloader for video, audio, playlists and image galleries, run like a live football round in the three Subaru colours.
colors:
  marinho: "#0c1430"
  amarelo: "#ffd200"
  ouro: "#d9b44a"
  barra: "#080f26"
  chao: "#0f1a3d"
  painel: "#15224d"
  painel-2: "#1b2a5c"
  painel-3: "#22336c"
  campo: "#0a1230"
  linha: "#24336f"
  linha-fina: "#1a2757"
  linha-forte: "#34468c"
  linha-hover: "#4356a0"
  linha-foco: "#5a6dbb"
  linha-ativa: "#4a5eae"
  tinta: "#f2f4f8"
  muted: "#a9b3d1"
  dim: "#8b96c2"
  amarelo-hover: "#ffdc3d"
  vivo-fundo: "rgb(255 210 0 / 0.045)"
  ouro-fundo: "rgb(217 180 74 / 0.1)"
  ouro-borda: "rgb(217 180 74 / 0.42)"
  erro: "#ff7b7b"
  erro-fundo: "rgb(255 123 123 / 0.08)"
  erro-borda: "rgb(255 123 123 / 0.35)"
typography:
  numeral-placar:
    fontFamily: "'Archivo', 'Segoe UI', sans-serif"
    fontSize: "44px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0"
    fontFeature: "tnum"
    fontVariation: "'wdth' 70"
  numeral-detalhe:
    fontFamily: "'Archivo', 'Segoe UI', sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0"
    fontFeature: "tnum"
    fontVariation: "'wdth' 70"
  numeral-tabela:
    fontFamily: "'Archivo', 'Segoe UI', sans-serif"
    fontSize: "17px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0"
    fontFeature: "tnum"
    fontVariation: "'wdth' 70"
  title:
    fontFamily: "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1.28
    letterSpacing: "-0.005em"
  title-placar:
    fontFamily: "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
    fontSize: "16.5px"
    fontWeight: 650
    lineHeight: 1.3
  title-section:
    fontFamily: "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 650
  body:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  body-strong:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
  cell:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    fontFeature: "tnum"
  meta:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    fontFeature: "tnum"
  label:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
  column-head:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "11.5px"
    fontWeight: 700
    letterSpacing: "0.05em"
  mono:
    fontFamily: "'Cascadia Mono', 'Cascadia Code', Consolas, monospace"
    fontSize: "12px"
    lineHeight: 1.55
rounded:
  capa: "4px"
  tile: "6px"
  pill-inner: "7px"
  control: "9px"
  field: "10px"
  card: "12px"
  dialog: "14px"
  pill: "999px"
spacing:
  margem: "32px"
  margem-estreita: "24px"
  gap-mesa: "18px"
  gap-fluxo: "16px"
  celula: "10px"
  col-pos: "54px"
  col-capa: "86px"
  col-tipo: "112px"
  col-situacao: "200px"
  col-tempo: "150px"
  col-tamanho: "142px"
  col-acoes: "180px"
components:
  button-primary:
    backgroundColor: "{colors.amarelo}"
    textColor: "{colors.marinho}"
    rounded: "{rounded.control}"
    padding: "0 15px"
    height: "38px"
  button-primary-hover:
    backgroundColor: "{colors.amarelo-hover}"
  button-primary-link:
    backgroundColor: "{colors.amarelo}"
    textColor: "{colors.marinho}"
    rounded: "{rounded.field}"
    padding: "0 22px"
    height: "52px"
  button:
    backgroundColor: "{colors.painel-2}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.control}"
    padding: "0 15px"
    height: "38px"
  button-hover:
    backgroundColor: "{colors.painel-3}"
  button-small:
    backgroundColor: "{colors.painel-2}"
    textColor: "{colors.tinta}"
    rounded: "8px"
    padding: "0 11px"
    height: "30px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "0 15px"
    height: "38px"
  input:
    backgroundColor: "{colors.campo}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "38px"
  link-field:
    backgroundColor: "{colors.campo}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.field}"
    padding: "5px 6px 5px 16px"
    height: "52px"
  segmented-mode:
    backgroundColor: "{colors.campo}"
    textColor: "{colors.muted}"
    rounded: "{rounded.field}"
    padding: "4px"
    height: "52px"
  segmented-mode-active:
    backgroundColor: "{colors.painel-3}"
    textColor: "{colors.tinta}"
  scoreboard:
    backgroundColor: "{colors.barra}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.card}"
    height: "108px"
  scoreboard-live-block:
    backgroundColor: "{colors.amarelo}"
    textColor: "{colors.marinho}"
    typography: "{typography.numeral-detalhe}"
  scoreboard-final-block:
    backgroundColor: "{colors.ouro}"
    textColor: "{colors.marinho}"
    typography: "{typography.numeral-detalhe}"
  zone-tile-live:
    backgroundColor: "{colors.amarelo}"
    textColor: "{colors.marinho}"
    typography: "{typography.numeral-tabela}"
    rounded: "{rounded.tile}"
    size: "28px"
  zone-tile-delivered:
    backgroundColor: "{colors.ouro}"
    textColor: "{colors.marinho}"
    typography: "{typography.numeral-tabela}"
    rounded: "{rounded.tile}"
    size: "28px"
  zone-tile-queued:
    backgroundColor: "{colors.painel-3}"
    textColor: "{colors.muted}"
    typography: "{typography.numeral-tabela}"
    rounded: "{rounded.tile}"
    size: "28px"
  zone-tile-failed:
    backgroundColor: "{colors.erro}"
    textColor: "{colors.marinho}"
    typography: "{typography.numeral-tabela}"
    rounded: "{rounded.tile}"
    size: "28px"
  table-tab:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.body-strong}"
    height: "44px"
  table-tab-active:
    textColor: "{colors.tinta}"
  card:
    backgroundColor: "{colors.painel}"
    rounded: "{rounded.card}"
    padding: "16px"
  notice:
    backgroundColor: "{colors.painel-2}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.field}"
    padding: "10px 13px"
  notice-error:
    backgroundColor: "{colors.erro-fundo}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.field}"
    padding: "10px 13px"
---

# Design System: Subaru DL

## Overview

**Creative North Star: "Placar Ao Vivo"**

Downloads run like a live round of Brazilian football on television. Whatever is downloading now sits on a broadcast scoreboard pinned under the link field, its percent, time left and speed counting like a match clock. Everything else (live, queued, failed, delivered) sits underneath in one league table on the same screen. The whole app is that one screen. Ajustes slides over the table from the right, and the field and scoreboard stay in view.

The world is painted only in the three Subaru colours on a navy chassis. Navy carries the shell, the board and every rule. Yellow means live or act. Gold means delivered. Red means failed. Numbers have their own face, a condensed upright Archivo at three fixed sizes, the way broadcast graphics set the score apart from the commentary. Every word is Segoe UI Variable, so the app still reads as a native Windows tool. The paint is flat. Shadows appear only on layers that float.

Density is that of an operating table: 54px rows, a 108px scoreboard, a 40px title bar of its own, and nothing decorative between them. The app is dark only and Brazilian Portuguese only.

**Key Characteristics:**
- One screen: a top row (mode switch, link field, yellow button), the scoreboard while something is live, then the scrolling table.
- One shared column grid drives the scoreboard, the table header and every row.
- State is carried by colour (yellow / gold / red / navy) and by five progress marks in one fixed column.
- One numeral face, Archivo ExtraBold at 70% width, tabular, at 44 / 26 / 17px and nothing in between.
- Flat navy tonal layers, 1px navy rules, and shadow only on floating layers.

## Colors

Three brand colours on a family of navies. Text is always tinted blue and never pure grey.

### Primary
- **Live Yellow** (amarelo): live or act, and nothing else. It paints the AO VIVO block, live numerals (scoreboard percent, the table's live percent), the live zone tile, filled progress marks, the progress bar, the primary button, active tab underlines, active-icon tints, the focus ring, the caret and text selection. Its hover is **Lit Yellow** (amarelo-hover). Live table rows carry a 4.5% yellow wash (vivo-fundo).

### Secondary
- **Delivered Gold** (ouro): a download that arrived. It paints the delivered zone tile, five gold marks, the "Entregue" state text, the 100% numeral and block of the final-whistle scoreboard, the arrival glow on a newly landed row (16% gold fading out), the "already downloaded" notice icon, and the line-through on items already downloaded. Ouro-fundo and ouro-borda are its tinted fill and stroke.

### Tertiary
- **Failure Red** (erro): failed. It paints the failed zone tile, the failing mark, "Falhou", error notices (erro-fundo fill with erro-borda stroke), the failures tab count and danger hovers.

### Neutral
- **Chassis Navy** (marinho): the brand navy. It is the ink on every yellow and gold surface (button text, AO VIVO text, zone tile numerals, the switch thumb, selection text).
- **Board Navy** (barra): the title bar and the scoreboard board, the darkest surface on screen.
- **Ground Navy** (chao): the page ground, also used behind the Ajustes panel, dialogs and multi-link rows.
- **Panel Navy** (painel), **Raised Panel** (painel-2), **Top Panel** (painel-3): cards, then buttons and menus, then active and pressed states, each one step lighter.
- **Well Navy** (campo): recessed inputs, the link field, the segmented track, empty thumbnails.
- **Rule Navy** (linha), **Fine Rule** (linha-fina), **Strong Rule** (linha-forte): 1px dividers. Fine rules sit between table rows, normal rules sit under headers and panels, and strong rules outline controls and the scoreboard.
- **Hover Rule** (linha-hover), **Focus Rule** (linha-foco), **Active Rule** (linha-ativa): the navy border states of controls. Hover Rule brightens the border of fields, selects, the link field and buttons on hover. Focus Rule marks the focused link field. Active Rule outlines a selected chip. Each is a step brighter than Strong Rule and stays navy.
- **Ink** (tinta), **Muted Ink** (muted), **Dim Ink** (dim): primary text, secondary text, then meta, column heads and placeholders.

### Named Rules
**The Three Meanings Rule.** Yellow is live or act, gold is delivered, and red is failed, with no exceptions. No colour borrows another's meaning. Warnings, hints, neutral notices and the log's AVISO level are navy or Ink (painel-2 fill, linha-forte stroke, muted icon, tinta text), never gold, and nothing that has not failed is red.

**The Navy Ink Rule.** Anything set on yellow, gold or red is written in Chassis Navy, never white.

## Typography

**Numeral Font:** Archivo variable, self-hosted (`fontes/archivo-variavel.woff2`, OFL), upright, weight 800, `font-stretch: 70%`, tabular figures, line-height 1
**Display / Title Font:** Segoe UI Variable Display (with Segoe UI, system-ui)
**Body Font:** Segoe UI Variable Text (with Segoe UI, system-ui)
**Mono:** Cascadia Mono (with Cascadia Code, Consolas). Used only for logs, tool versions and raw command text.

**Character:** Broadcast numerals against native Windows words. The condensed ExtraBold figures read like a match clock. Segoe keeps every sentence quiet and at home on the desktop.

### Hierarchy
- **Numeral Placar** (800, 44px, 70% width): the scoreboard's percent, time left, speed and final size.
- **Numeral Detalhe** (800, 26px, 70% width): the AO VIVO and ENTREGUE tags and the second live game's percent.
- **Numeral Tabela** (800, 17px, 70% width): zone tile positions, the table's live percent and image count, and the index numbers in playlist and multi-link lists.
- **Title** (650, 20px / 1.28, Display): the preview title and the Ajustes panel heading. It drops to 18px below 1060px.
- **Title Placar** (650, 16.5px / 1.3, Display): the live download's title, clamped to two lines. The same size is used for dialog headings.
- **Title Section** (650, 16px, Display): settings section labels.
- **Body** (400, 14px / 1.45): base text. Row titles are 14px at 600.
- **Cell** (13.5px, tabular): table cells, buttons, notices and menus.
- **Meta** (12.5px, tabular): sublines under titles, in Dim Ink.
- **Label** (600, 12px): scoreboard cell labels ("baixado", "faltam", "MB por segundo") and field labels.
- **Column Head** (700, 11.5px, 0.05em, uppercase): table column headers only.

### Named Rules
**The Three Sizes Rule.** Numerals and the AO VIVO / ENTREGUE tags use Archivo at exactly 44, 26 or 17px. There is no fourth size and no Archivo for words. Small badge numbers on thumbnails (photo index, duration) stay in Segoe at 600.

**The Unit In Words Rule.** On the scoreboard the number is set large and its unit is written out underneath in Label ("MB por segundo", "MB no arquivo"). The unit is never squeezed in beside the figure.

**The Whole Parts Rule.** Sublines and scoreboard meta lines are lists of whole parts separated by a Dim Ink middle dot. A part that does not fit wraps to a hidden second line and disappears whole. A number is never cut in half or ellipsised. Only the first part (site or folder) may shrink with an ellipsis.

## Layout

One screen under a 40px custom title bar. The top row sits at a 20px top inset and holds the 52px Vídeo / Áudio / Imagens segmented control, the full-width link field (52px, growing to 168px for several links) and the 52px yellow button. The 108px scoreboard sits under it only while something is live or for 4.5s after the last arrival. Below that, the table area ("mesa") scrolls on its own. Page side margins are 32px (margem), dropping to 24px below 1060px. The scrollbar gutter (11px) is always reserved inside the right margin, so the scoreboard and the table end on the same line. Vertical gaps on the mesa are 18px, and 16px inside a flow.

**The One Grid Rule.** The column variables col-pos (54), col-capa (86), col-tipo (112), col-situacao (200), col-tempo (150), col-tamanho (142) and col-acoes (180) set both the table header widths and the scoreboard's grid. The AO VIVO block spans # and capa, the live title sits over Título, the percent over Situação, time left over Tempo, speed over Tamanho, and the second live game over Ações. A new column added to one is added to the other.

**The Whole Column Rule.** Narrow windows drop whole columns and never squeeze them. Tipo leaves below 1400px, then Tamanho (with the scoreboard's speed) below 1180px, then Tempo below 1060px. The breakpoints live in both `colunas.ts` and the stylesheet's media queries. A dropped value moves to the line underneath: into the row's subline in the table, and into the neighbouring scoreboard cell's label on the board.

Table rows are 54px (60px for the first-run steps), with 10px cell padding. Totals (count, running time, size) sit right-aligned at the table's foot. Ajustes is a right-hand panel up to 1040px wide over a 55% veil. It never replaces the screen.

## Elevation & Depth

The paint is flat. Depth comes from navy tonal steps (barra < campo < chao < painel < painel-2 < painel-3) and 1px rules. The scoreboard outlines itself with an inset 1px strong-rule ring, not a shadow. Real shadows appear only on layers that float above the screen: menus, toasts, dialogs, the Ajustes panel and the sticky action bar.

### Shadow Vocabulary
- **Menu** (`box-shadow: 0 18px 44px rgb(2 5 16 / 0.55)`): dropdown action menus.
- **Toast** (`box-shadow: 0 12px 30px rgb(2 5 16 / 0.5)`): bottom-right toasts.
- **Dialog** (`box-shadow: 0 26px 70px rgb(2 5 16 / 0.6)`): modal dialogs over a 74% veil.
- **Side panel** (`box-shadow: -28px 0 56px -28px rgb(2 5 16 / 0.75)`): the Ajustes panel's left edge.
- **Sticky bar** (`box-shadow: 0 -10px 24px -14px rgb(2 5 16 / 0.6)`): the preview action bar pinned at the foot of the mesa.

### Named Rules
**The Flat Paint Rule.** Surfaces that stay in the page are flat, and a shadow means the layer floats.

## Shapes

The corners are soft and the edges straight. Thumbnails ("capas", the row's crest) are 64x36 at 4px in rows and 128x72 at 6px on the scoreboard (96x54 below 1400px). Zone tiles are 28px at 6px. Controls are 9px, the link field, segmented track and notices 10px, cards and the scoreboard 12px, and dialogs 14px. Counts and tags are full pills. Progress marks are 9px circles with a 1.5px strong-rule ring, and the live dot is a 9px navy circle. Every divider is 1px. Tab underlines are 3px of yellow.

## Components

### Buttons
Solid, compact and native-feeling. Only one yellow button sits on a surface.
- **Shape:** gently rounded (9px). Large buttons and the link-row button use 10px, small ones 8px.
- **Primary:** Live Yellow fill with Chassis Navy text at 700. In the top row it is 52px tall with 22px sides. Disabled, it turns into a Top Panel fill with Dim Ink text rather than faded yellow.
- **Default:** Raised Panel fill with a strong-rule border and Ink text at 600, 38px tall. On hover it moves to Top Panel with a Hover Rule border.
- **Ghost / Small / Icon:** the ghost is transparent with Muted Ink and fills on hover. Small is 30px tall. Icon buttons are 36px square, or 32px and borderless as the light variant in rows. Play and resume icons in rows are tinted yellow.
- **Focus:** a 2px Live Yellow outline at 2px offset.

### Inputs / Fields
- **Style:** Well Navy fill, a strong-rule 1px border and 9px radius at 38px. The link field is 52px at 10px.
- **Hover / Focus:** fields and selects take a Hover Rule border on hover. On focus the border turns Live Yellow for fields and search. The link field instead moves from Hover Rule to Focus Rule, staying navy. Dragging a link over it gives a dashed yellow border.
- **Chips:** Well Navy with a strong-rule border and Muted Ink text. A selected chip moves to Top Panel with an Active Rule border.
- **Switch:** a 38x22 navy track that fills with yellow when on, with a navy thumb.

### Segmented control and tabs
- **Segmented (Vídeo / Áudio / Imagens):** a Well Navy track. The active segment is Top Panel with Ink text and a yellow icon.
- **Table tabs (Todos, Ao vivo, Na fila, Concluídos, Falhas):** text tabs 44px tall with a 3px yellow inset underline when active. Count pills sit on Raised Panel, and the Falhas count turns red when non-zero.

### Live Scoreboard (signature)
The board is a 108px Board Navy strip on the shared grid, with an inset strong-rule ring. Its left block is solid yellow and holds a pulsing navy dot, "AO VIVO" in Numeral Detalhe, the live count as a link that filters the table, and a navy-outlined "Pausar tudo". Then come the 128x72 crest with the title (two lines max) and the whole-parts meta, then three cells separated by 1px rules: percent in yellow, then time left and speed in Ink, all in Numeral Placar with a Label underneath. The last cell is the second live game in compact form (26px yellow percent, state and title). A 4px progress bar runs along the foot under the title-to-tamanho span only. While the link is read or the file converted, an indeterminate segment runs along it instead. When the last download lands, the block turns gold with "ENTREGUE", the percent reads a gold 100%, an Abrir button appears, and after 4.5s the board leaves. It enters with a 10px drop and fade (0.35s, cubic-bezier(0.16, 1, 0.3, 1)).

### League Table (signature)
- **Zone tile:** the row's position, zero-padded, in Numeral Tabela on a 28px tile coloured by state. Live is yellow, delivered gold, queued Top Panel, failed red, missing file Raised Panel.
- **Five marks:** progress in fifths in the Situação column, before the state word. Live marks fill yellow, delivered are all gold, failed are dim up to the failure point and then one red, and queued and paused are dim. While the link is read or the file converted, the marks ripple yellow.
- **Arrival:** a newly delivered row glows gold for 1.8s, its tile turns from yellow to gold, and the marks fill one by one.
- **Error detail:** an extra line of text under the row (reason in red, hint in Muted Ink), with no box.
- **First run:** the table appears with its header and three step rows (zone tiles 01 to 03) instead of an empty state.

### Thumbnail Badges
Small labels laid over a thumbnail (duration, photo index, VÍDEO, and "Transmissão ao vivo" for a livestream source) share one form. They use a translucent navy plate (rgb(4 8 20 / 0.82)) with 5px corners (4px on grid tiles) and Ink text in Segoe 600 to 700 at 10 to 12px. They carry no state colour, so the scoreboard stays the only place that says AO VIVO.

### Cards / Notices
- **Cards:** Panel Navy, a 1px rule and 12px corners, padded 16px. There are no cards inside cards. Advanced options inside a preview flatten into a plain list.
- **Notice:** Raised Panel fill, strong-rule stroke, Muted Ink icon. The "already downloaded" variant tints only the icon gold.
- **Error notice:** erro-fundo fill, erro-borda stroke, red icon.

### Navigation
There is no side rail. The title bar carries the icon and name, the tool-health button (a navy dot that turns red when a tool is missing), the Ajustes toggle (Top Panel and a yellow icon while open) and native window controls (the close button hovers Windows red #c42b1c). Ajustes uses 40px tabs with a 3px yellow underline and a sticky section index on the left.

## Do's and Don'ts

### Do:
- **Do** keep yellow for live and act, gold for delivered and red for failed, and make warnings and hints navy.
- **Do** set every numeral on the scoreboard, the zone tiles and the live percent in Archivo 800 at 70% width with tabular figures, at 44, 26 or 17px only.
- **Do** drive any new table or scoreboard column through the shared col-* variables, so the board and the table stay aligned.
- **Do** drop whole columns at the 1400 / 1180 / 1060px breakpoints and move their values to the line underneath.
- **Do** build sublines and meta lines from whole parts that wrap away together, so no number is ever cut in half.
- **Do** write on yellow, gold and red in Chassis Navy.
- **Do** keep pages flat. Reserve shadows for menus, toasts, dialogs, the Ajustes panel and the sticky action bar.
- **Do** total every list's time and size right-aligned at its foot.

### Don't:
- **Don't** use gold for warnings, hints or "attention". Gold only ever means delivered.
- **Don't** write "AO VIVO" anywhere but the scoreboard, or paint a thumbnail badge in a state colour. A livestream source reads "Transmissão ao vivo" on a navy badge.
- **Don't** use yellow decoratively. If it is not live and not an action, it is not yellow.
- **Don't** add a fourth numeral size or set words in Archivo.
- **Don't** squeeze a column or ellipsise a number to make a narrow window fit.
- **Don't** add a side rail or a page that replaces the main screen. Ajustes slides over the table.
- **Don't** use pure grey text or a light theme.
