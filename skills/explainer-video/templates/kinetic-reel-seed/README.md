# kinetic-reel seed

A snapshot of the engine behind an approved Oct 2026 production. It is a *seed*:
set `BRAND` and the palette `K` in `reel/parts/0-engine.js` (there is also a
terminal-UI palette `P` and token/QR particle clouds you can reuse or drop), and
replace the example cue table in `reel/cues.js` and the example arrangement in
`music/score.mjs`. Keep the engine machinery.

Fixes baked in vs upstream kinetic-reel: odometer stagger scales with string
length and clips to one glyph; chapter-slam flash 0.12 (was 0.22); `?sc=2` renders
4K with every coordinate in 1920x1080 units; parts/ split + `build.sh` (concat +
`node --check`); `mix.sh` two-pass loudnorm with VO-envelope-ducked score.

Missing on purpose: the chapter shot files (`reel/parts/1-*.js` …). Worked
examples, if present on this machine: the most recent `*-reel*` projects under
`~/agent-videos/`.
Upstream: https://github.com/tuzhechen2005/opus-video-skills (MIT, see LICENSE).

    npm install
    ./build.sh                                   # parts → reel/reel.js
    node render.mjs --sheet=2,10,30 --cols=3 --w=640 --out=out/check/sheet.jpg
    VO=vo.mp3 node music/score.mjs               # score.wav, ducked by the VO
    VO=vo.mp3 DUR=58 ./mix.sh                     # assets/mix.m4a, -14 LUFS
    node render.mjs --frames --workers=4 [--sc=2]
    node render.mjs --encode --audio=assets/mix.m4a --out=out/video.mp4
