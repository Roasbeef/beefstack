# Sound: the synthesized, beat-locked score

`music/score.mjs` is a small offline synth in Node (no samples, no dependencies). It reads `reel/cues.js`, places
every sound in time with `put(t0, len, gen(tt), {gain, pan, rev, bus})`, and writes `music/score.wav`.
There are two buses. `drum` stays dry. `mus` is ducked by the kick (sidechain): each `kick()` writes into `duck[]`.
A Freeverb send, tanh glue and normalization follow; loudnorm (−14 LUFS) runs in ffmpeg.

## Instruments
`kick`, `clap`, `hat(open?)`, `tick` · `bass` (saw/square through tanh) · `pluck` · `pad` (detuned, slow swell) ·
`stab` (chord hit) · `blip` (in-key sine ping) · `odo` (a burst of ticks for a rolling counter) · `glitch`
(square-wave crumbs) · `impact` (kick + low-passed noise tail + sub drop) · `softImpact` (no noise tail) ·
`riser` (tonal sweep with a little low-passed noise).

## Transition sounds (a hard rule, learned from feedback)
**No noise whooshes on transitions.** v3 fired 29 in 84 s; it was "cool at first, then annoying". Use:
- `swell(tEnd, chordNotes, len)`: a reversed pad that grows and stops dead on a chapter cut. Match the chord.
- `bloom(t, notes)`: a soft bell chord, for iris transitions.
- `glide(t, len, m0, m1)`: a quiet triangle glide up, for a zoom-through.
- `harp(t, span, notes, v, dir)`: a quick pluck run, for slats (vary the direction).
- `hatRoll(t)`: 3–4 rising hats, for wipes.
- **nothing**, for about half the cuts: the downbeat and the next shot's own entrance sounds (tile ticks, scan blips,
  typing) carry them.
Never use the same cue twice in a row. Keep `impact()` (with its noise tail) for about five structural moments. Use
`softImpact()` for other slams.

## Arrangement
- A groove loop runs over the reel: 4-on-the-floor kick, claps on 2 and 4, 8th hats (16ths for the lead chapter),
  a two-note bass per beat, a pluck arpeggio, and a pad per bar. Chords: Am F C G.
- Give chapters different energy. A serious chapter goes half-time: kick on beat 1, soft clap on 3, a *decaying* sine
  sub (not a sustained drone). Aim for about 5 dB RMS lower than the lead chapter. Check with per-section RMS.
- Take the drums out under a glitch exit. Leave a breath (kick only) on a quiet word.
- Tie hits to the picture: ticks per letter/tile/row, blips on chips and nodes, `odo` under counters, a stab when a
  number lands, a low buzz on a rejection, a bell per retrieved item.

## Gotchas (both cost real time)
- `t0 * SR` isn't an integer, so the first sample's local time can be −1e−16, and `Math.pow(negative, 2.2)` is NaN,
  which silences the whole mix after normalization. `put()` clamps `tt >= 0`. Keep it.
- The state-variable filter in `noise()` explodes near `f = 1`: `f` is clamped to .85 and `q` to ≥ .45. Keep it.
- You can't listen. Verify with `ffmpeg -lavfi showspectrumpic`, per-section RMS, and a count of the calls you
  meant to remove (e.g. `grep -c "whoosh("`). Tell the user you couldn't hear it.
