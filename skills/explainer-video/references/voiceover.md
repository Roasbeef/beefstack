# Voiceover: Eleven v4, one take, word timestamps

The VO is the clock. Every cut and hit is keyed to a spoken word, so get the VO
right before any visual work, and change it as rarely as possible afterwards.

## Model and voice

- Model: `eleven_v4` (released 2026-09-28; ranked #1 on the Artificial Analysis
  TTS arena at launch). It infers tone and pacing from context and keeps a voice
  consistent over long text (up to 10,000 chars per request). `eleven_v4_turbo`
  is for low-latency agents, not narration. `eleven_multilingual_v2` sounds
  noticeably flatter; don't use it for new work.
- Output format: `mp3_44100_128`. `mp3_44100_192` needs the Creator tier (403
  `output_format_not_allowed`).
- Audition 2–4 voices with the same line (`vo/samples/*.mp3`, user plays them
  with `! afplay …`) and pick via AskUserQuestion. Include the previous video's
  voice for series continuity. "Sarah" (`EXAVITQu4vr4xnSDxMaL`) was the pick for a recent series; "Brian" (`nPczCjzI2devNBz1zQrb`) is a deeper narrator.
- The key may lack `models_read`; don't depend on `GET /v1/models`. Check
  release notes on the web for new models instead.

## One continuous take per cut

Generate the whole cut as a single request, paragraphs separated by blank
lines. v4 uses the surrounding text for prosody, so one take sounds natural
across scene boundaries; per-scene clips sound like separate reads. It also
matches the kinetic-reel engine, which treats the cut as one timeline.

```bash
jq -Rs '{text: ., model_id: "eleven_v4"}' < vo/cut.txt |
  curl -s --max-time 280 -X POST \
    "https://api.elevenlabs.io/v1/text-to-speech/$VOICE_ID?output_format=mp3_44100_128" \
    -H "xi-api-key: $ELEVENLABS_API_KEY" -H "Content-Type: application/json" \
    -d @- -o vo/cut.mp3 -w "HTTP %{http_code}\n"
```

Secrets live in `~/.zshrc`; snapshot with
`zsh -lic 'printf "ELEVENLABS_API_KEY=%s\n" "$ELEVENLABS_API_KEY" > .env'`,
`chmod 600 .env`, gitignore it. API calls may need the sandbox disabled.

## Writing the script for TTS

- **Delivery tags** inline in square brackets: `[measured]`, `[beat]`, `[warm]`,
  `[firm]`, `[a little wry]`. They shape the read and are not spoken. Use them
  sparingly (a few per paragraph), on turns and punchlines.
- **TTS-only spellings**: initialisms and product names spelled for the ear
  ("S-Q-L-ite", "G-P-U", "milli-sat", "four-oh-two" for 402). The screen shows
  the real spelling.
- **Heteronym sweep** before generating: *live*, *invalid*, *record*, *present*,
  *content*, *object*, *produce*. Reword rather than fight the model ("live" →
  "in real time").
- **Runtime**: ~140 wpm estimate; v4 at this pacing read 417 words in 148 s and
  143 words in 54 s. Report the duration immediately; that is the moment to trim.
- **Decide the hero's share at script time.** With the VO as the clock, a
  21-second hero paragraph is 14% of a 148 s cut no matter what the storyboard
  wants. If the hero should be 25–35%, write it that long.

## Word timestamps

```bash
ffmpeg -i vo/cut.mp3 -ar 16000 -ac 1 work/cut.wav
whisper-cli -m work/models/ggml-base.en.bin -f work/cut.wav -ml 1 -sow -oj -of work/cut
```

`.transcription[].offsets.from/to` are milliseconds, one word per entry
(`brew install whisper-cpp`; model from huggingface `ggerganov/whisper.cpp`
`ggml-base.en.bin`; the old pip `whisper` on this machine is dead).

Fix Whisper in the cue file, never in the audio:
- misspellings of homophones ("jewels" → joules);
- split compound names ("Web Socket" → WebSocket, "Post gres" → Postgres): merge
  them, or word lookups and captions break;
- check timings against the pauses for the words that drive big cuts.

**Cue by word and occurrence, then re-verify after any VO change.** Adding a
sentence that repeats a word ("every token") shifts every later occurrence index;
in one revision this put the end-card URL at frame 0.

## Revisions

- Wording change in one paragraph: regenerate the whole take only if the
  paragraphs are tightly linked; otherwise regenerate that paragraph and splice
  at a pause. Either way every cue in the affected span must be re-timed.
  TTS is non-deterministic: never regenerate unchanged text "just because".
- Voice swap: full re-cue of every shot. With word-keyed cue tables this is a
  mechanical retime; tell agents the design is approved and only times change.
