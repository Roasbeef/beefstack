---
name: explainer-video
description: >
  Produce narrated explainer and promo videos end to end, interview-driven, as
  rendered MP4s. Pipeline: interview + inspiration review → script with Eleven
  v4 delivery tags → one-take VO → Whisper word timestamps → kinetic-reel
  motion design (canvas 2D type + three.js layers + WebGL post +
  shape-continuity transitions + synthesized, VO-ducked score), with a
  HyperFrames paper-collage variant for vertical social cuts → QA from the
  encoded MP4 → 1080p/4K/9:16 deliverables. Use when asked to "make a video",
  "produce an explainer", "make a promo", or "turn this script/post into a video".
---

# Explainer video

Turn a post, script or rough idea into finished narrated motion-design videos.
The VO is the clock: every cut and hit is keyed to a spoken word, so the edit
is text and the whole video re-renders from source.

The bar is set by current code-rendered motion design (three.js depth, WebGL
post, shape-continuity transitions, editorial type, a real score), not by
panels with fades. Plain Remotion panels were judged "what a model could do
months ago"; the kinetic-reel rebuild of the same material was "great".

References (read when you reach that phase):
- `references/voiceover.md`: Eleven v4, tags, one take, Whisper, revisions
- `references/engines.md`: kinetic-reel (default), paper-collage, Remotion
- `references/kinetic-reel-style-guide.md`, `references/kinetic-reel-sound.md`:
  upstream look/motion/sound method (read in full before storyboarding)
- `references/qa.md`: shot rules and the orchestrator's QA checks
- `templates/kinetic-reel-seed/`: the engine snapshot (see its README)
- `scripts/contact_sheet.sh`: frames from an MP4 → one tiled image

## Phase 0: interview and inspiration (mandatory)

1. **Read every inspiration link the user sends before designing,** then tell
   them in two sentences what bar those links set. Skipping three of four links
   was the biggest miss of a recent production: a full v1/v2 was built below
   the bar the user had already pointed at.
2. Batch 3–4 questions per AskUserQuestion: audience and the one scene they came
   for (the hero); cuts and lengths (e.g. 2.5 min explainer + 60 s promo); looks
   (16:9 kinetic-reel default; 9:16 collage for social); footage (rebuild the
   real product UI in code); VO voice (audition, see voiceover.md).
3. Write `production.md` (deliverables matrix, framing, hero, design system,
   **facts block**: product names, model names, prices, units, sources) and
   `script.md`. These are the contract every agent reads.
4. **Size the hero in the script.** With the VO as the clock, a paragraph's
   length is its screen time. Hero ≈ 30–35% of runtime means writing it that long.
5. Rebuild real UIs from the real app: run it in tmux, `capture-pane -p -e` for
   layout and exact ANSI colours. This was the most-praised element.

## Phase 1: voiceover

Follow `references/voiceover.md`: Eleven v4 (`eleven_v4`), voice audition,
delivery tags, TTS-only spellings, heteronym sweep, **one continuous take per
cut**, report runtime against target, then Whisper word timestamps with
compound names and homophones fixed in the cue file.

## Phase 2: storyboard and build (kinetic-reel)

Follow `references/engines.md`. In short:
1. Copy the most recent approved reel project (or `templates/kinetic-reel-seed`),
   re-key palette, fonts and brand marks to this project.
2. `STORYBOARD.md` first: chapter budgets, one row per shot with headline,
   visual mechanism, transition in, sound, and the VO cue word + ms.
3. `reel/cues.js` from the transcript (shared by page and score), shots in
   `reel/parts/*.js`, `music/score.mjs`, `mix.sh`.
4. Render contact sheets per chapter and Read them; ≥ 2 full review passes.
5. One agent can build a whole 1–3 minute reel (cheap renders, shared
   engine). Use parallel agents per *cut* or per *variant* (16:9 explainer,
   16:9 promo, 9:16 collage), not per shot. Brief each agent with the contract
   files, the shot rules from `references/qa.md`, and the LESSONS file below.
6. For the vertical social cut, build the HyperFrames paper-collage variant from
   the same VO and words file (engines.md).

## Phase 3: QA, deliver, iterate

Follow `references/qa.md`: the orchestrator checks the encoded MP4 (chapter
sheets, frame-2 sheet of every shot opening, transition strips, loudness), sends
fixes back to the owning agent, and re-checks the new MP4. Then deliver:

- 16:9 1080p share encode and 4K master (`--sc=2`), 9:16 collage if requested;
  paths plus a hero frame. Say plainly that nobody listened to the mix and ask
  the user to judge the music level (`MUSIC_DB` changes need no picture
  re-render).
- Keep every version (`-v2`, `-v3`, git tags); old cuts get asked for.
- Agent tooling: parallel agents using agent-browser must each set
  `AGENT_BROWSER_SESSION`; the default session is shared and they will
  screenshot each other's pages.

## Lessons file

Keep appending to `~/agent-videos/LESSONS-explainer-video.md` (what worked,
what didn't, and the fix) during every production, and ask build agents to add
their own section. Fold recurring items back into this skill.
