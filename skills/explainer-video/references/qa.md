# QA: rules every shot obeys, and how the orchestrator checks them

Agents' own review stills are not evidence. The orchestrator checks the
**encoded MP4** with `scripts/contact_sheet.sh` and Reads every image. Every
systemic bug in a recent production was caught this way, and several were in
renders the agents had already "verified".

## Shot rules (put these in every agent brief)

1. **Composed frame 0.** Every shot/scene opens on a composed frame. The first
   visual enters on the first spoken word or earlier; never key a shot's first
   element to a word 1–2 s into its narration. (6 of 11 scenes opened empty in
   one cut; in a vertical feed frame 0 is the thumbnail.)
2. **Vertical balance at every beat,** not just the final frame. No "content in
   the top third, empty lower half" stretches while elements wait for their cue.
3. **Phone legibility.** Information-bearing text ≥ 28 px at 1080p (≥ 56 px at
   4K). Decorative HUD micro-type may be smaller.
4. **Numbers agree** with the narration, the source document and each other.
   ("twelve tokens or twelve thousand" narrated over a single 260,000-token debit
   was wrong.) One schematic thread per recurring value.
5. **Facts block is the source of truth.** Model names, prices, product names
   come from `production.md`; no drift between cuts (three different model names once appeared across one set of cuts).
6. **Illustrative values carry SCHEMATIC in the HUD;** on-screen stats carry their
   source in frame ("via @handle on X · <what it shows> · <date>").
7. **One info line per band.** Fade one label out before the next takes the band;
   rows of four chips on one line collided every time.
8. **Hold, don't fade to black,** at the end of a shot; the end card holds ~4 s
   with the URL on screen.

## Orchestrator checks, in order

```bash
CS=~/.claude/skills/explainer-video/scripts/contact_sheet.sh
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height -of compact out/cut.mp4
$CS out/cut.mp4 out/qa/ch1.jpg 3 640 1 3.5 6 8.5 11 ...         # 9–18 frames per chapter
$CS out/cut.mp4 out/qa/openings.jpg 6 400 <every shot start + 0.07>   # frame-2 sheet
ffmpeg -ss 16.0 -t .6 -i out/cut.mp4 -vf "fps=10,scale=320:-1,tile=6x1" out/qa/tr.jpg   # a transition strip
ffmpeg -i out/cut.mp4 -af loudnorm=print_format=summary -f null - 2>&1 | grep -E "Input (Integrated|True Peak)"
```

- Frame-2 of a shot entered through a transition shows the outgoing shot; judge
  those from a transition strip, and judge hard-cut shots from the frame-2 sheet.
- Loudness targets: −14 LUFS integrated, true peak ≤ −1 dBTP. No agent can
  listen; say so to the user and ask them to judge the music level by ear.
  Keep `MUSIC_DB` adjustable without re-rendering picture.
- Mid-animation text in a sheet ("IN A MATTER OF DA…") is a sampling artefact;
  check one frame later before filing it.

## Revisions

- Send fixes to the agent that built the shot (SendMessage to its id): it keeps
  context, fixes in under a minute, and doesn't redesign. Say what's approved and
  what's not ("cues unchanged; layout only").
- Fix kit/engine bugs in the kit, once, then re-render; never per shot.
- Re-check the specific frames from the new MP4 before reporting a fix.
- Keep old renders (`-v2`, `-v3` suffixes or git tags); stakeholders ask for
  the old cut back.
