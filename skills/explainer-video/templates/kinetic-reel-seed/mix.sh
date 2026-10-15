#!/usr/bin/env bash
# mix.sh: VO + score → assets/mix.m4a at −14 LUFS, true peak ≤ −1 dB (two-pass loudnorm).
# The score is already ducked by the VO envelope (music/score.mjs); here it is EQ'd out of the voice band and set
# under the VO, then the sum is normalized.
set -euo pipefail
cd "$(dirname "$0")"
VO=${VO:?set VO=/path/to/vo.mp3}
MUSIC_DB=${MUSIC_DB:--6}
DUR=${DUR:?set DUR=<total seconds>}
PRE="[1:a]highpass=f=30,equalizer=f=250:t=q:w=1:g=-2,equalizer=f=2800:t=q:w=1.4:g=-3.5,volume=${MUSIC_DB}dB[m];[0:a]aformat=sample_rates=44100:channel_layouts=stereo,apad=whole_dur=${DUR}[v];[v][m]amix=inputs=2:normalize=0:duration=longest,atrim=0:${DUR}"
J=$(ffmpeg -hide_banner -i "$VO" -i music/score.wav -filter_complex "${PRE},loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$J" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
ffmpeg -y -v error -i "$VO" -i music/score.wav -filter_complex \
  "${PRE},loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000" \
  -c:a aac -b:a 192k assets/mix.m4a
ffmpeg -hide_banner -i assets/mix.m4a -af loudnorm=print_format=summary -f null - 2>&1 | grep -E "Input (Integrated|True Peak|LRA)"
