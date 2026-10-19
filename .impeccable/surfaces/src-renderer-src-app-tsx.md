---
version: 1
slug: "src-renderer-src-app-tsx"
primary_target: "src/renderer/src/App.tsx"
related_targets: ["src/renderer/src/paginas/Principal.tsx","src/renderer/src/paginas/Tabela.tsx","src/renderer/src/componentes/Placar.tsx","src/renderer/src/componentes/colunas.ts","src/renderer/src/componentes/Capa.tsx","src/renderer/src/paginas/Ajustes.tsx","src/renderer/src/paginas/FluxoVideo.tsx","src/renderer/src/paginas/FluxoImagens.tsx","src/renderer/src/estilos.css"]
---

## Scope

The whole Subaru DL desktop interface (Electron renderer): app shell, one main screen (paste, live scoreboard, downloads table) that replaces Baixar and Downloads, and Ajustes (Preferências, Ferramentas, Registro) as a panel over the table. Mode: Operate.

## Audience and task

General Portuguese-speaking public on Windows who do not know yt-dlp. Four first-class jobs: video, audio (MP3), playlists and channels, image galleries. Success (user-confirmed, previous round): a layperson downloads alone, and the product is something to be proud to publish. This round (user-confirmed): the user wanted to compare options rather than fix a complaint; must stay: the three Subaru colors and "tudo numa tela" (paste and follow the download on the same screen); everything else, visual and way of use, may change. Every function stays.

## Direction contract

THESIS: Downloads as a live football round: what is downloading now runs on a broadcast scoreboard, and everything else sits in a league table on the same screen. Refuses the category default, a centered "paste a link" hero over an empty page, and its opposite, a grey IDM-style table with no live focus and no state colour.

OWN-WORLD: Brazilian football broadcast graphics and the league table, painted in the three Subaru colours. Navy chassis and scoreboard board (#0c1430, #080f26), navy panels and 1px navy rules; yellow #ffd200 means live or act (the AO VIVO block, live numerals, the primary button); gold #d9b44a means delivered (zone tile, marks, "Entregue"); red means failed. Archivo condensed ExtraBold, upright and self-hosted, only for numerals and the AO VIVO tag, at three fixed sizes; Segoe UI Variable for every word. Flat paint; shadows only on floating layers.

STORY: A layperson picks Vídeo, Áudio or Imagens, pastes the link in the top row, presses the yellow button and watches the download go AO VIVO on the scoreboard with percent, time left and speed, then land in the table as "Entregue" in gold, with Abrir.

FIRST VIEWPORT: 40px title bar: icon and name at left; "Ferramentas em dia", Ajustes and the window controls at right. No side rail. Top row: the Vídeo / Áudio / Imagens segmented control (52px) beside the full-width link field and the yellow primary button. Under it, only while something runs, the 108px scoreboard: yellow AO VIVO block with the live count, the current download's 128x72 thumbnail with title and meta, then percent, time left and speed in Archivo at one size, the second live download compact at the right, a 4px progress bar on its foot. Below, scrolling: status tabs with counts (Todos, Ao vivo, Na fila, Concluídos, Falhas), search, type and order, then the table: zone tile with the position number, thumbnail, title and source, Tipo, Tamanho, Ritmo, Situação (five progress marks and the state), actions; totals right-aligned at its foot.

FORM: Placar Ao Vivo, candidate 4 of 7 on my ordered list; seed:2ab9750508f7a830. Signature move: the live scoreboard pinned under the link field, counting the live download's percent, time left and speed like a match clock. Raises: one numeral face at three fixed sizes, scoreboard, detail and table (Emigre bitmap specimen); state as marks in one fixed column (pocket timetable); one grid for scoreboard, header and rows, where narrow windows drop whole columns instead of squeezing (Crouwel grid); the thumbnail is the row's crest, first in every row (character goods catalog); every list totals time and size right-aligned at its foot (cassette j-card); navigation never replaces the screen: Ajustes slides over the table with the field and scoreboard still in view (exposure record).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Adaptations (recorded after the finish review)

- FIRST VIEWPORT, table columns: the order shipped is #, capa, Título, Tipo, Situação, Tempo, Tamanho, ações ("Ritmo" is labelled "Tempo"). Reason: the one-grid raise (finish review fix 2) puts the scoreboard's percent over Situação, time over Tempo, speed over Tamanho and the second live download over Ações, through shared --col-* track variables; columns drop together (Tipo below 1400px, Tamanho below 1180px, Tempo below 1060px) and a dropped value moves into the neighbouring label or the row's subline.
- The scoreboard's numerals keep one size (44px); speed shows the number with its unit in words underneath ("MB por segundo"). "Pausar tudo" lives in the AO VIVO block (live controls on the board), so the toolbar never changes when a download starts.
- Final whistle: when the last live download lands, the board holds for about four seconds in gold ("ENTREGUE", 100%, the media duration, the final size, Abrir) and then retires; it lands the memorable moment where the eye already is.
- First run shows the table itself: tabs at zero, the column header and the three steps as rows 01 to 03.
- Sublines and the scoreboard's meta line show whole parts or drop them; a number is never cut in half.

## Memorable moment

The AO VIVO scoreboard ticking a download's percent and clock, then the row landing in the table as "Entregue" in gold.

## Unresolved

Whether Imagens should be auto-detected from the link (still a manual switch, with "Tentar como imagens" when video extraction fails).
