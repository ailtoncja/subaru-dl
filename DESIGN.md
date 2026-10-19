---
name: Subaru DL
description: Windows downloader for video, audio, playlists and image galleries, painted in the Subaru rally livery.
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
  linha-forte: "#34468c"
  trilho-faixa: "#1c2a5e"
  tinta: "#f2f4f8"
  muted: "#a9b3d1"
  dim: "#8b96c2"
  amarelo-hover: "#ffdc3d"
  ouro-fundo: "rgb(217 180 74 / 0.1)"
  ouro-borda: "rgb(217 180 74 / 0.42)"
  erro: "#ff7b7b"
  erro-fundo: "rgb(255 123 123 / 0.08)"
  erro-borda: "rgb(255 123 123 / 0.35)"
typography:
  headline:
    fontFamily: "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
    fontSize: "23px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1.28
    letterSpacing: "-0.005em"
  title-section:
    fontFamily: "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
    fontSize: "16.5px"
    fontWeight: 650
  body:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  body-strong:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 600
  meta:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    fontFeature: "tnum"
  label:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
  numeral-live:
    fontFamily: "'Barlow Condensed', 'Segoe UI', sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.005em"
    fontFeature: "tnum"
  numeral-plate:
    fontFamily: "'Barlow Condensed', 'Segoe UI', sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "tnum"
  numeral-state:
    fontFamily: "'Barlow Condensed', 'Segoe UI', sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.01em"
  mono:
    fontFamily: "'Cascadia Mono', 'Cascadia Code', Consolas, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  tag: "5px"
  plate: "7px"
  sm: "8px"
  md: "9px"
  lg: "10px"
  card: "12px"
  link-field: "13px"
  dialog: "14px"
  pill: "999px"
spacing:
  list: "8px"
  control: "10px"
  row: "14px"
  card: "16px"
  page-gap: "18px"
  preview: "20px"
  page-x: "32px"
  page-x-narrow: "24px"
components:
  button-primary:
    backgroundColor: "{colors.amarelo}"
    textColor: "{colors.marinho}"
    rounded: "{rounded.md}"
    padding: "0 15px"
    height: "38px"
  button-primary-hover:
    backgroundColor: "{colors.amarelo-hover}"
    textColor: "{colors.marinho}"
  button-primary-disabled:
    backgroundColor: "{colors.painel-3}"
    textColor: "{colors.dim}"
  button-primary-large:
    backgroundColor: "{colors.amarelo}"
    textColor: "{colors.marinho}"
    rounded: "{rounded.lg}"
    padding: "0 24px"
    height: "46px"
  button-secondary:
    backgroundColor: "{colors.painel-2}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "0 15px"
    height: "38px"
  button-secondary-hover:
    backgroundColor: "{colors.painel-3}"
  button-ghost:
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
    padding: "0 15px"
    height: "38px"
  field:
    backgroundColor: "{colors.campo}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "38px"
  link-field:
    backgroundColor: "{colors.campo}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.link-field}"
    padding: "9px 9px 9px 18px"
    height: "66px"
  card:
    backgroundColor: "{colors.painel}"
    rounded: "{rounded.card}"
    padding: "{spacing.card}"
  plate:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.marinho}"
    typography: "{typography.numeral-plate}"
    rounded: "{rounded.plate}"
    width: "50px"
    height: "38px"
  plate-delivered:
    backgroundColor: "{colors.ouro}"
    textColor: "{colors.marinho}"
    rounded: "{rounded.plate}"
    width: "50px"
    height: "38px"
  plate-stopped:
    backgroundColor: "{colors.painel-3}"
    textColor: "{colors.muted}"
  plate-error:
    backgroundColor: "{colors.erro}"
    textColor: "{colors.marinho}"
  livery-stripe:
    backgroundColor: "{colors.amarelo}"
    height: "7px"
  livery-stripe-delivered:
    backgroundColor: "{colors.ouro}"
    height: "7px"
  livery-stripe-track:
    backgroundColor: "{colors.trilho-faixa}"
    height: "7px"
  row:
    backgroundColor: "{colors.painel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.card}"
    padding: "11px 14px 15px 12px"
    height: "76px"
  action-bar:
    backgroundColor: "{colors.painel}"
    padding: "14px 20px"
  segmented:
    backgroundColor: "{colors.campo}"
    rounded: "{rounded.lg}"
    padding: "3px"
  segmented-active:
    backgroundColor: "{colors.painel-3}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.plate}"
    height: "40px"
  chip:
    backgroundColor: "{colors.campo}"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "30px"
  chip-active:
    backgroundColor: "{colors.painel-3}"
    textColor: "{colors.tinta}"
  nav-item:
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "42px"
    width: "100%"
  switch-on:
    backgroundColor: "{colors.amarelo}"
    rounded: "{rounded.pill}"
    width: "38px"
    height: "22px"
---

# Design System: Subaru DL

## Overview

**Creative North Star: "Pintura de Rali"**

The Subaru WRC livery painted onto a Windows app. A navy chassis (title bar and rail), deeper navy panels for the work, one yellow that means "live" or "act now", and a gold that means "it arrived". Every download is a rally car on a stage: it carries a number plate, advances as a raked yellow stripe along the bottom edge of its row, and turns gold on delivery. The rally lives in the plates, the numerals and the stripe; the copy stays in plain Brazilian Portuguese for a layperson.

The density is that of a working tool, not a landing page. The first screen is the job itself: a heading with the Vídeo / Áudio / Imagens choice, a wide link field with the yellow plate, and the rows of downloads beneath, all on one screen. Paint is flat: navy panels separated by 1px navy rules, with depth reserved for things that actually float. Dark only, by the author's decision.

Two typefaces split the work cleanly. Segoe UI Variable carries every word; Barlow Condensed ExtraBold Italic appears only where a number or a plate needs the door-number voice, which is how live percentages read at a glance from across the window.

**Key Characteristics:**
- Navy chassis, navy panels, navy-tinted text; no neutral greys anywhere.
- Yellow is the one live and action colour; gold is delivered; red is failure.
- Progress is a raked yellow livery stripe that turns gold on arrival.
- Number plates mark queue position, and delivered rows carry their format (MP4, MP3, IMG) on a gold plate.
- One solid yellow plate per screen, kept on screen by a sticky action bar.
- Every selection shows its running total.

## Colors

A three-colour Subaru livery (navy, yellow, gold) over a family of navy-derived surfaces, with red reserved for failure.

### Primary
- **Rally Yellow** (amarelo): the single action and live colour. The primary plate button, the advancing progress stripe, the live percentage numeral, the active icon in the rail and in the segmented switch, the active tab underline, focus rings, the text caret, text selection, checkbox and switch fills, and yellow text links ("Ver todos", "Alterar", "Mais opções"). Its hover is **Lit Yellow** (amarelo-hover).

### Secondary
- **Delivery Gold** (ouro): the colour of arrival. The delivered stripe, the delivered format plate, the italic "Entregue" state, the "already downloaded" strike-through and its marker, the healthy-tools dot in the rail foot, the icon in toasts and tool cards, and the gold-tinted notice (ouro-fundo fill, ouro-borda stroke) used for "you already downloaded this".

### Tertiary
- **Failure Red** (erro): failed rows' plate and full-width stripe, error text, the error notice (erro-fundo fill, erro-borda stroke), destructive hover on danger buttons and menu items.

### Neutral
- **Chassis Navy** (marinho): the navigation rail and the text colour on every yellow or gold surface.
- **Title Bar Navy** (barra): the custom frameless title bar, darkest band of the shell.
- **Floor Navy** (chao): the page background behind content and the dialog body.
- **Panel Navy** (painel), **Raised Panel** (painel-2), **Top Panel** (painel-3): cards and rows; secondary buttons, menus and toasts; active segment, active chip, hover state of secondary buttons and the stopped plate.
- **Well Navy** (campo): inputs, the link field, the segmented track, chips, thumbnails' empty background. Wells are darker than the panel they sit on.
- **Rule Navy** (linha) and **Strong Rule** (linha-forte): 1px dividers and card borders; control borders and the scrollbar thumb.
- **Stripe Track** (trilho-faixa): the unfilled groove under every livery stripe.
- **Ink** (tinta): primary text, and the white face of the running number plate.
- **Muted Ink** (muted) and **Dim Ink** (dim): secondary text and meta; placeholders, separators, hints, empty icons, the stopped stripe.

### Named Rules
**The One Live Colour Rule.** Yellow means "act" or "running now" and nothing else. Done is never yellow; it is gold. Waiting is never yellow; it is dim navy.

**The Navy Ink Rule.** Text is always navy-tinted (tinta, muted, dim). No neutral grey text or surface exists in the system; every derived tone sits on the navy hue.

**The Gold Means Arrived Rule.** Gold is spent only on things that have reached the user: delivered rows, already-downloaded entries, the healthy-tools dot, and the "you already have this" notice.

## Typography

**Body Font:** Segoe UI Variable Text (with Segoe UI, system-ui)
**Heading Font:** Segoe UI Variable Display (with Segoe UI, system-ui)
**Numeral Font:** Barlow Condensed Italic, weights 700 and 800, self-hosted woff2 under the OFL
**Mono Font:** Cascadia Mono (with Cascadia Code, Consolas), for logs and raw arguments

**Character:** The native Windows face does all the reading work; the condensed italic is the rally door number, loud and slanted, used only where a figure should be read from a distance.

### Hierarchy
- **Headline** (650, 23px, 1.2): the page heading ("O que você quer baixar?", "Downloads", "Ajustes").
- **Title** (650, 20px, 1.28; 18px in a narrow window): the preview card's video title.
- **Section title** (650, 16.5px): "Seus downloads", dialog titles; settings group labels at 16px.
- **Body** (400, 14px, 1.45): default text. Row titles step up to 14.5px / 600; the link field's text is 15.5px.
- **Meta** (400, 12.5px, tabular figures): row meta lines with middle-dot separators, hints under the field.
- **Label** (600, 12px, dim): field labels above selects ("Qualidade", "Formato", "Legenda").
- **Live numeral** (Barlow 800 italic, 30px; 26px narrow, yellow): the running percentage or file count on a row.
- **Plate numeral** (Barlow 800 italic, 22px; 17px with 0.02em tracking for format codes): queue numbers 01, 02 and format codes MP4, MP3, IMG.
- **State word** (Barlow 700 italic, 20px): "Entregue", "Na fila", "Pausado", "Falhou", coloured by state.
- **Index numeral** (Barlow 700 italic, 13 to 16px, dim): item numbers in pickers and the multi-link list.

### Named Rules
**The Door Number Rule.** Barlow Condensed Italic is for numerals, plates and the one-word row state only. Never for headings, buttons or sentences.

**The Tabular Rule.** Every changing number (percent, speed, sizes, counts, times) uses tabular figures so rows do not jitter while they run.

## Layout

A frameless window: a 40px custom title bar, a 220px navy rail on the left (Baixar, Downloads, Ajustes, with tool status and version at its foot), and a scrolling floor-navy content column capped at 1120px and centred, padded 26px top, 32px sides, 44px bottom, with an 18px vertical rhythm between blocks.

The Baixar screen stacks: the heading with the mode switch on its right; the 66px link field holding the yellow plate; a hint line; then either the preview card or nothing; then "Seus downloads". The mode switch sits above the field, beside the heading, not inside it, because the first choice must be legible to someone who has never used a downloader. The field's plate label follows state ("Colar link" when empty, "Baixar" once a link is typed); when a preview opens, the yellow plate moves into the preview's sticky action bar and the field's button becomes a secondary "Colar outro".

The preview card is a two-column grid (thumbnail 220 to 300px, then info), with options, lists and the action bar spanning both columns. Rows are a single horizontal line: plate, thumbnail (96 by 54), title and meta, the right-aligned reading (at least 112px), then actions; 8px between rows. Settings use a sticky 210px section index beside the groups, each index entry showing its count so the extent of settings is visible.

Responsive behaviour is for window width only, down to the 900px minimum. Below 1060px the row tightens (gap 11px, thumbnail 72 by 41, reading 84px, numeral 26px), page side padding drops to 24px, the preview's thumbnail column becomes 176px, and secondary action-bar items marked wide-only are hidden.

**The Same Screen Rule.** Paste, choose, start and watch happen on one screen; the running and delivered rows sit directly under the field.

## Elevation & Depth

Surfaces are flat paint. Depth comes from tone (well darker than panel, panel lighter than floor) and from 1px navy rules, not from shadows. Shadows exist only on things that genuinely float over the page, and one structural edge.

### Shadow Vocabulary
- **Action bar edge** (`box-shadow: 0 -10px 24px -14px rgb(2 5 16 / 0.6)`): the upward edge of the sticky action bar, so content visibly scrolls beneath it.
- **Menu** (`box-shadow: 0 18px 44px rgb(2 5 16 / 0.55)`): dropdown action menus.
- **Toast** (`box-shadow: 0 12px 30px rgb(2 5 16 / 0.5)`): bottom-right notices.
- **Dialog** (`box-shadow: 0 26px 70px rgb(2 5 16 / 0.6)`): modal dialogs over a navy scrim (`rgb(4 8 20 / 0.74)`).

### Named Rules
**The Flat Paint Rule.** Resting surfaces carry no shadow, no gradient and no glow. A shadow is allowed only on a layer that floats (menu, toast, dialog) or on the sticky bar's scroll edge.

## Shapes

Softly rounded rectangles throughout, scaled by size: 5px for tags and overlay badges, 7px for plates and active segments, 8px for chips and small buttons, 9px for buttons and fields, 10px for large buttons and the segmented track, 12px for cards and rows, 13px for the link field, 14px for dialogs; full pills only for counters, tags and the switch. Borders are 1px; the link field turns dashed yellow while a link is dragged over it.

The one sharp, slanted form is the livery stripe: its yellow fill ends in a 16px rake (`clip-path: polygon(0 0, 100% 0, calc(100% - 16px) 100%, 0 100%)`), and the rake disappears when the stripe is full, failed or delivered. Rows clip their contents so the stripe sits flush on the rounded bottom edge.

## Components

### Buttons
Painted plates: solid, flat, confident.
- **Shape:** gently rounded (9px; 10px large, 8px small). Heights 38px default, 46px large, 30px small; weight 600.
- **Primary (the yellow plate):** rally yellow fill and border, chassis-navy text, weight 700. Large size is the screen's main action ("Baixar vídeo", "Baixar 246 áudios", "Colar link").
- **Hover / Focus:** primary lightens to lit yellow; secondary steps from raised to top panel with a brighter border. Focus is a 2px yellow outline offset 2px. No transitions on buttons.
- **Disabled primary:** stays opaque but repaints as a top-panel plate with dim text, so a disabled main action never looks yellow.
- **Secondary:** raised-panel fill, strong-rule border, ink text ("Pôr na fila", "Abrir").
- **Ghost:** transparent with muted text, raised panel on hover. Icon buttons come in 36px bordered and 32px borderless forms; an icon button that resumes or retries tints its icon yellow.
- **Text link:** yellow 600 text with an arrow or icon, underline on hover.

### Chips
- **Style:** 30px, well-navy fill, strong-rule border, muted 600 12.5px text, 8px corners.
- **State:** active chips move to top panel with ink text and a brighter border. Yellow is not used for chip selection.

### Segmented Switch
The Vídeo / Áudio / Imagens choice, and smaller tab groups. A well-navy track with 3px inset; the active segment is a top-panel tile with ink text and a yellow icon, inactive segments are muted. Large size is 40px tall. Optional counters sit in small pills inside each segment.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** panel navy on the floor.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px rule navy.
- **Internal Padding:** 16px; the preview card uses 20px. Advanced options open inline inside the preview as a plain list under tabs, never as a card inside a card.

### Inputs / Fields
- **Style:** well-navy fill, 1px strong-rule border, 9px corners, 38px tall; selects carry a muted chevron.
- **Focus:** border turns yellow (the link field uses a brighter navy border on focus and yellow only while dragging).
- **Placeholder:** dim ink. **Disabled:** half opacity.
- **Link field:** 66px tall, 13px corners, a dim link icon, 15.5px text, and the yellow plate at its right end.
- **Switch:** 38 by 22 pill; rule-navy track with a muted knob when off, yellow track with a navy knob when on.

### Navigation
- **Rail:** chassis navy, 220px, 42px items with 19px icons and 14.5px muted labels. Hover lifts to a slightly lighter navy with ink text; the active item gets a lighter navy tile, ink 600 text and a yellow icon. Counters are small pills; a failure counter is red-tinted.
- **Rail foot:** a gold dot and "Ferramentas em dia" (red dot when something is wrong), then the version in dim tabular figures.
- **Title bar:** title-bar navy, 40px, mark and name at left, a muted live status ("Baixando 1 · 4,5 MB/s") with a yellow dot, Windows controls at right (close turns Windows red on hover). The aggregate progress of all running downloads runs as a 3px livery stripe along its bottom edge.
- **Tabs:** muted 600 labels with a 2px yellow underline and a yellow icon when active.

### Number Plate (signature)
A 50 by 38 tile with 7px corners carrying a Barlow 800 italic numeral, like a rally car's door number.
- **Running / queued:** ink-white plate, navy two-digit position (01, 02).
- **Delivered:** gold plate carrying the file format (MP4, MP3, IMG) at 17px, so the plate reads as a label and never as a checkbox.
- **Stopped, reading, retrying:** top-panel plate with a muted icon (pause, spinner, retry).
- **Failed:** red plate with a warning icon.
- The first-run "how it works" strip numbers its three steps with smaller plates (40 by 34).

### Livery Stripe (signature)
Progress drawn as a raked yellow stripe, 7px tall, on the bottom edge of a row over the stripe-track groove.
- **Running:** yellow, width equals percent, the right end raked; width eases over 0.6s with the house curve (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Indeterminate (reading the link, gallery download of unknown size):** a 26% yellow segment sweeping across in 1.6s, repeating.
- **Stopped (queued, paused, retry wait):** dim navy fill at the reached width.
- **Failed:** full width, red, no rake.
- **Delivered:** full width, gold, no rake, on every delivered row, static.
- **Arriving:** only when a download completes during the current session, the gold wipes in from left to right once (0.9s).
- **Reduced motion:** all motion collapses; the indeterminate stripe becomes static yellow diagonal hatching across the full width, which still says "in progress".
- **Title bar:** a 3px stripe on a transparent track shows the aggregate of all running downloads.

### Download Row
A full-width rally car: plate, 96 by 54 thumbnail (galleries show a 1 to 4 image mosaic), title in ink and a meta line ("Canal · YouTube · MP4 360p · 6,6 MB de 15,9 MB"), then the reading (yellow live numeral with speed and time left, or the italic state word in muted, gold or red), then actions ("Abrir" plus a folder icon and an overflow menu on delivered rows). Error rows wrap a red notice under the text. Panel navy, 12px corners, 1px rule border, minimum 76px tall with extra bottom padding for the stripe.

### Sticky Action Bar
Every preview ends in a bar that sticks to the bottom of the scroll area, so the yellow plate stays on screen however long the list grows. Left side: the running total; right side: secondary "Pôr na fila" then the large yellow plate whose label states the count and type ("Baixar 246 áudios").

### Selection Pickers
Playlist, channel and gallery pickers offer list and grid views. Each entry has a checkbox (yellow fill), a dim italic index numeral, a thumbnail and the title; unselected grid tiles fade to 38% opacity. Entries already downloaded are struck through in gold with a gold "já baixado" marker, and a count of them sits above the list. The running total ("246 de 246 marcados · 106 h 46 min") is always visible, in the action bar or a total line.

### Notices, Toasts, Dialogs
- **Notices:** 10px-cornered strips with an icon: gold tint for "already downloaded" and soft warnings, panel navy for information, red tint for errors.
- **Toasts:** raised panel, strong-rule border, 11px corners, gold icon (red on error), sliding up 8px over 0.22s.
- **Dialogs:** floor-navy body, strong-rule border, 14px corners, ruled header and footer, footer actions right-aligned with the primary plate last.

## Do's and Don'ts

### Do:
- **Do** keep exactly one solid yellow plate (the primary button) per screen or dialog, at the end of the reading order; when a preview opens, move it into the sticky action bar.
- **Do** show progress as the livery stripe on the row's bottom edge: yellow and raked while running, gold and full when delivered.
- **Do** keep every delivered row's stripe gold and static; animate the gold wipe only for an arrival during the session.
- **Do** put the file format on the delivered row's gold plate (MP4, MP3, IMG).
- **Do** set every changing number in tabular figures, and live numbers in Barlow Condensed ExtraBold Italic.
- **Do** derive every new surface or text tone from the navy hue; nest wells darker than their panel.
- **Do** separate regions with 1px rule-navy lines.
- **Do** show a running total on every selection and strike already-downloaded entries in gold.
- **Do** keep the Vídeo / Áudio / Imagens switch visible above the link field, beside the heading.
- **Do** respect reduced motion: replace sweeping motion with static yellow hatching.

### Don't:
- **Don't** use yellow for finished or waiting states, or for the active chip or segment tile; done is gold, waiting is dim navy, the active tile is top-panel navy (only its icon turns yellow).
- **Don't** use neutral grey for text or surfaces.
- **Don't** set headings, buttons or sentences in Barlow Condensed.
- **Don't** put gradients or glow on resting surfaces, or shadows on cards and rows; only floating layers and the sticky bar edge cast shadows.
- **Don't** use a check mark on the delivered plate; it reads as a checkbox.
- **Don't** nest a card inside a card; inline panels inside a card are plain ruled lists.
- **Don't** leave the primary action where a long list can scroll it out of view.
