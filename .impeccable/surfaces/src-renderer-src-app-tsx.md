---
version: 1
slug: "src-renderer-src-app-tsx"
primary_target: "src/renderer/src/App.tsx"
related_targets: ["src/renderer/src/paginas/Baixar.tsx","src/renderer/src/paginas/FluxoVideo.tsx","src/renderer/src/paginas/Downloads.tsx","src/renderer/src/paginas/Ajustes.tsx","src/renderer/src/estilos.css"]
---

## Scope

The whole Subaru DL desktop interface (Electron renderer): app shell, Baixar (former Início + Galeria), Downloads, Ajustes (former Configurações + Dependências + Logs). Mode: Operate.

## Audience and task

General Portuguese-speaking public on Windows who do not know yt-dlp. Four first-class jobs: video, audio (MP3), playlists and channels, image galleries. Success (user-confirmed): a layperson downloads alone, and the product is something to be proud to publish. Pain points (user-confirmed): looks generic, too much on screen, having to switch screens, settings too long. Must stay: the three Subaru colors and every function; layout, navigation and screens may change.

## Direction contract

THESIS: Every download runs like a rally car on a stage: numbered, visibly advancing, delivered in gold. Refuses the category default, a centered "download videos" hero with a lone URL box over an empty page, and its opposite, a grey IDM-style table.

OWN-WORLD: The Subaru WRC livery as an app shell. Navy #0c1430 chassis (title bar and rail), deeper navy panels, yellow #ffd200 as the one live and action colour, gold #d9b44a for delivered. Segoe UI Variable for work; Barlow Condensed ExtraBold Italic only for numerals and plates. Flat paint, 1px navy rules, no gradients or glow.

STORY: A layperson pastes a link, picks Vídeo, Áudio or Imagens, presses the yellow Baixar and watches it run in "Na pista" on the same screen until it turns gold, "Entregue", with Abrir.

FIRST VIEWPORT: Title bar with mark and window controls. Left rail 232px: Baixar, Downloads, Ajustes, tool status at the foot. Main: full-width 68px link field holding the mode switch and the yellow Baixar plate; then the preview card (300×169 thumbnail, title, quality, format, audio and subtitle selects, destination); then "Na pista": rows with number plate, thumbnail, title and meta, big condensed percent and speed, the livery stripe on the bottom edge.

FORM: Pintura de Rali, candidate 7 of 7 on my ordered list (the livery identity program); seed:2a1f7b07d74dd7d3. Signature move: progress drawn as a raked yellow livery stripe that turns gold on delivery. Raises: one reversed yellow plate per screen (timetable rack); scale contrast for live numbers (type specimen); running totals on every selection (cassette j-card); settings show their extent (acetate tab manual); pickers mark selected and strike already-downloaded (convention catalog).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Adaptations (recorded after the finish review)

- FIRST VIEWPORT: the mode switch (Vídeo / Áudio / Imagens) sits above the link field, beside the heading "O que você quer baixar?", instead of inside the field. Reason: the first choice has to be legible to a layperson (user-confirmed success: "a layperson downloads alone"). The field keeps one yellow plate whose label follows the state: "Colar link" when empty, "Baixar" once a link is typed; with a preview open the plate moves to the preview's sticky action bar.
- The section the contract calls "Na pista" is labelled "Seus downloads" (plain Portuguese for the general public; the rally lives in the plates and the stripe, not in the copy).
- Delivered rows carry their file format on the gold plate (MP3, MP4, IMG) instead of a check mark, so the plate reads as a label and never as a checkbox.
- The aggregate progress of all running downloads runs as a 3px livery stripe along the foot of the title bar.

## Memorable moment

A row's yellow stripe reaching the end and turning gold, with "Entregue" and Abrir.

## Unresolved

Whether Imagens should be auto-detected from the link (today: manual switch, with a "try as images" offer when video extraction fails).
