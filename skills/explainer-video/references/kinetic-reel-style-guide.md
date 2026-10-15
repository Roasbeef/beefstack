# Style guide: the Work Reel look

## Palette (`K` in reel.js)
| token | hex | use |
|---|---|---|
| `ink` | `#0E0F0E` | default dark ground, type on light grounds |
| `ink2` | `#171917` | nodes/cards on ink |
| `cream` | `#F1EEE6` | light ground, type on dark |
| `lime` | `#DDF53D` | THE accent: the lead chapter, the chosen item, the "OK" state, the mark |
| `blue` | `#2F3CFF` | second ground (one slam per reel, one full-bleed scene), secondary emphasis on cream |
| `red` | `#E8412F` | danger/rejection only (a red flag, a blocked query, a failed gate) and the full stop in a headline |
| `grey`/`mid` | `#8B908A` / `#5E625D` | dimmed type |
Rotate grounds between shots (ink → lime → ink → cream → blue …) so every cut is a visible change. A darker
`#0B0D0C` ground marks a more serious chapter.

## Typography (`F` in reel.js)
- Headlines: `font(F.cond, 130–330)`, one or two lines, ending in a full stop. Colour the key word (lime on dark, blue
  on cream) or just the full stop (red).
- Slams: `font(F.wide, 172–250)` (Archivo Black) for one-word statements (EVERY / ANSWER / EVIDENCE), with outlined
  echoes stacked above and below.
- Voice line: `italic 124px ${F.serif}` over the liquid layer, word by word on beats.
- Labels, HUD, chips, tables: `font(F.mono, 14–26, 700)` with 2–8 px letter-spacing. Chinese: `font(F.zh, 20–34, 500)`
  with 4–14 px spacing.
- Numbers: `F.cond` at 84–420 px. Counters roll (`count()` expo) or flip (`odometer()`).

## Layout
- Canvas 1920×1080. Left margin **140**, right edge **1780**. Headline baselines around y 250–470.
- The HUD owns the four corners: brackets at 40 px, micro-type at (58, 63) / (1862, 63) / (58, 1022) / (1862, 1022),
  one optional Chinese line at y ≈ 988 (left or right), the segmented progress bar at y 1050. Keep content out of
  y > 950.
- Put stats in a row at y ≈ 900 or stacked in a right column at x ≈ 1400–1540. Never two stats in the same 300 px
  horizontal band at the same height: they collide. Check with a full-res still.

## Motion vocabulary (all in reel.js)
| helper | what it does |
|---|---|
| `dropWord(s, x, y, font, t0, t, {fall, stag, fillAt})` | letters fall in with expo-out and a stagger; `fillAt(i)` recolours one letter |
| `letters(s, x, y, o, fn)` | per-letter transform (dy, r, s, a, fill): build your own entrances |
| `chip(s, x, y, {k, bg, fg})` | a label that wipes in; returns its width so chips can be laid out in a row |
| `stat(v, label, x, y, {k, size, col})` | a big number with its label |
| `count(t, t0, t1, v0, v1)`, `odometer(v0, v1, k, x, y, font, col)` | number roll / per-digit flip |
| `arrow`, `line`, `circle`, `rrect`, `starburst`, `asterisk`, `arrowNE`, `jelly` (a simple mark) | shapes |
| `redacted(x, y, w, h, seed, col)` | "text" as rounded blocks: never invent real content |
| `thread(p0, p1, k, col)` | a cubic "citation" line drawn up to k |
| `texWindow(draw, src)` | letters as windows onto a shader layer (e.g. a headline filled with liquid marble) |
| `tape(t, y, rot, col, fg, words, speed, dir, k)` | a diagonal scrolling tape with ✳ / ↗ separators |
| `glitchIn(lt, seed)` | slice + RGB split on a hard cut in (auto-disabled during transitions) |
| `hud(t, {tl, tr, bl, br, zh, dark, brackets})` | the corner system + segmented progress bar |

## GL layers (render into `glA`, then `glShot()` draws it into the 2D frame)
- `terrain(t, {fade, amp, push, camY})`: additive particle landscape, for openings and chapter titles on ink.
- `liquid(t, {zoom, seed, strips, stripAmt})`: blue/red/lilac domain-warped marble, for the one "principle" line. With
  `strips` it becomes a vertical-slice glitch for exits.
- `knot(t, {x, y, s})`: a chrome torus knot with an inked outline, for "form"/"tool" shots on lime or cream. Shade it
  with a soft oval shadow.
- `cloud(t, {k, rot, x, y, s, hi})`: 9k particles morphing from a shell (k 0) to a silhouette (k 1).
  `cloud.project(i, t, o)` returns a point's screen position, so 2D lines can hit real 3D points (retrieval).
  Swap the silhouette's `inside(x, y)` for your subject.
- Post pass (`FX`): `split` (RGB offset), `slice` (row glitch), `grain`, `vign`, `flash`.

## Transitions (the `TR` map: `key: [duration, fn]`)
| fn | use it when | example |
|---|---|---|
| `trZoom(rect or () => rect)` | the eye is on a UI element (a tile, a chip, a card): zoom *through* it into the next shot | tile T07 → the eval matrix; the "01" in the index → the chapter title |
| `trIris(cx, cy, ring)` | something just lit up / a dot / a node: the next shot grows out of it | the ANSWER node → the next scene |
| `trPush(dx, dy)` | a change of topic at the same level; add nothing else | diagram → diagram |
| `trWipe(col)` | a scan / sweep already moving across the screen | the matrix scan line → the next shot |
| `trSlats(n)` | a "reveal" beat, rhythmically, on a bar | pipeline → pipeline |
| `trGrid(cols, rows, col)` | ending a section on a grid-like image (tests, pixels) | the test grid → the recap tapes |
Scenes register the rect they'll be zoomed through in `RECT` while they draw (A is rendered frozen on its last frame,
then B live; A's FX are dropped). Keep each transition 0.45–0.6 s and vary them: never three of one kind in a row.

## Recurring devices that work
- An **index/contents** card that states the order of emphasis (with each chapter's role and duration).
- The **trace** device: a segmented progress bar per chapter, and a finale that lays the whole reel out as a span
  waterfall ("STATUS OK").
- A **mark** that recurs (start: a dot becomes the mark; end: the mark next to the name; the reel collapses to a dot).
- Tapes in two directions for a chapter recap.
- Red for exactly the failures that the system catches (red flag, blocked DROP, failed gate).
