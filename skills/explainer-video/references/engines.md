# Engines: which renderer, and how to drive it

Three pipelines were run on the same material (Oct 2026). The user's
verdict on each is the reason for the defaults below.

| Engine | Use for | Verdict |
|---|---|---|
| **kinetic-reel** (canvas 2D + three.js + WebGL post + synthesized score) | Default for promos and explainers, 16:9 | "This video is great!!" |
| **HyperFrames paper-collage** | Vertical 9:16 social cut, scrapbook look | Distinctive, social-native |
| **Remotion** (React, per-scene components) | Only for data-driven or React-heavy pieces | Correct but flat: read as "what a model could do months ago" |

Before choosing, look at what the user's inspiration links actually do and say
the bar back to them in one or two sentences. If they sent links, they are the
spec.

## kinetic-reel (default)

Seed: `templates/kinetic-reel-seed/` in this skill (see its README). Upstream
method docs: `references/kinetic-reel-style-guide.md` and
`references/kinetic-reel-sound.md`. Read both in full before storyboarding.

**Start from the most recent approved project, not from a blank template.**
Copying an approved reel keeps the look, HUD, palette and score identical, and a
third of the shots become retimed adaptations. On this machine, look under
`~/agent-videos/` for the most recent approved `*-reel*` project. Otherwise copy
the seed.

How it works: every frame is a pure function of `t`. `reel/cues.js` is the one
timeline (scene starts `S`, `hits`, chapters `CH`, `dur`) read by both the page
and the score. `reel/parts/0-engine.js` + one file per chapter group are
concatenated by `build.sh` into `reel/reel.js` (`node --check` catches syntax
errors before Chrome times out). Each shot is `sName(t)` and paints the whole
frame: `bg()` → GL layer via `glShot()` → type and shapes → `hud(t, …)`.

The vocabulary that made it work:
- **Depth**: three.js layers (particle cloud condensing into an object, terrain,
  liquid marble backdrop, particles forming a QR), WebGL post (bloom, grain,
  chromatic split on hits), camera pushes, dives and zoom-throughs.
- **Shape-continuity transitions**: the outgoing shot's shape becomes the
  incoming shot's subject (payment dot → the key's missing tooth; a node → the
  next scene via zoom-through; iris out of an object). Every cut starts on
  something and lands cleanly.
- **Editorial type**: condensed display (Anton) for headlines, mono (JetBrains
  Mono) for numbers and code, serif italic (Instrument Serif) for one emotional
  line per chapter. HUD micro-type: chapter `■ 0n / 0N`, timecode, progress
  bar, SCHEMATIC tags.
- **Score**: synthesized from `cues.js`, ducked by the VO's own loudness envelope
  (~−8 dB under speech), EQ'd out of the voice band (cut ~2.8 kHz). Per-chapter
  groove anchored on each chapter's first downbeat (no single BPM fits seven
  word-timed chapter starts). Drop the drums under the punchlines. Impacts only
  on structural moments.
- **One schematic money thread**: if illustrative numbers recur (a bundle, a
  balance), define them once in `cues.js` and draw every shot from that, so the
  numbers agree everywhere. Derive illustrative rates from the source (e.g.
  an exchange rate implied by the source's own unit price).

Commands:

```bash
./build.sh
node render.mjs --sheet=2,10,30,45 --cols=4 --w=480 --out=out/check/ch1.jpg   # contact sheet
node render.mjs --sheet=12.1,12.3 --crop=760,300,400,400 --w=600 --out=out/check/d.jpg
node render.mjs --stills=31.5 --out=out/stills
VO=vo/cut.mp3 node music/score.mjs
VO=vo/cut.mp3 DUR=58 MUSIC_DB=-6 ./mix.sh                # −14 LUFS, TP ≤ −1.5
node render.mjs --frames --workers=4                     # 1080p, ~13–47 s
node render.mjs --frames --workers=4 --sc=2 --frames-dir=out/frames4k   # 4K
node render.mjs --encode --audio=assets/mix.m4a --out=out/cut.mp4
```

Gotchas fixed in the seed (keep them fixed): odometer stagger must scale with
string length and clip to one glyph height (long numbers never landed); the
chapter-slam flash at 0.22 washed out frame 0 (0.12 keeps the hit); `--sc=2`
gives native 4K with all coordinates in 1920×1080 units. 4K at CRF 17 is
300+ MB per minute; make a lighter share encode separately.

## HyperFrames paper-collage (vertical social)

Install the `hyperframes*` skills (`npx hyperframes skills update`) and copy the
paper-collage template (github.com/rafiimanggala/paper-collage-skill, MIT).
Edit only `scripts/scenes.py`; `build.py` writes the compositions.

What worked: one storyboard file; cue every beat by spoken word
(`c("word", n, nudge)`) from a corrected words file; torn strips that type on
for live text (prompts, debits); paper documents drawn in code carrying the
protocol detail (402 receipts, invoices, ledgers); CC0 people stickers with clear
emotions (Openverse/StockSnap, credit them); composed frame 0 by giving anchor
elements a negative entry time (`t = -1`); captions burned into a reserved band
(y 1100–1500); two-pass `loudnorm` with `-c:v copy`.

Watch for: the reserved caption band makes layouts top-heavy (scenes without a
person need a bottom document); marker strokes are in frame coordinates, so
keep documents that get marks at rotation 0; 960 px stock sources look soft
when cropped large; the template's default text is below 28 px, so set a
legibility override in the kit before building scenes.

## Remotion (legacy; only when React/data-driven)

Scaffold `npm i remotion @remotion/cli react react-dom`, `npm i -D
typescript@5 @types/react @types/react-dom` (TypeScript 7 breaks
`@remotion/bundler`), no `"type": "module"`. Shared `src/anim.tsx` (timing,
palette) + `src/components/*` kit + one file per scene + `FinalEdit.tsx` Series
with per-scene `<Audio>`. Render a kit test sheet and Read it before fan-out
(an SVG filter with the default objectBoundingBox region hides zero-width
lines; drop-shadow on an inner SVG path clips to a box: put it on the `<svg>`
with `overflow: visible`). 4K renders take 10–25 min. If you use it, add
`@remotion/three` and real transitions; plain panels with fades are below the
bar.
