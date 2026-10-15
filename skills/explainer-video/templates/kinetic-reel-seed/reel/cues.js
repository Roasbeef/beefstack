// reel/cues.js: THE timeline. The page (reel.js) and the score (music/score.mjs) both read it. The VO is the clock:
// every time below is the start of a spoken word (Whisper `-ml 1 -sow` offsets, corrected against pauses; fix
// misspellings and split names here, never in the audio). Pick a BEAT whose bars land near chapter changes, but
// anchor each chapter's groove on its own first downbeat; word cues always win over the grid.
// This is a short generic example: replace S, CH, hits and dur from your transcript.
var KCUE = (() => {
  const BEAT = 0.55, B = n => +(n * BEAT).toFixed(4);
  // Shot starts. Shots entered through a transition start ~0.2 s before their word so the move lands on it.
  const S = { a1: 0, a2: 4.1, b1: 8.0, b2: 11.8 };
  const dur = 16;   // VO length + ~4 s end-card hold
  const K = {
    bpm: 60 / BEAT, beat: BEAT, fps: 30, dur, B, S, vo: { offset: 0, len: 12.4 },
    CH: [['THE PROBLEM', 0, S.b1], ['THE FIX', S.b1, dur]],   // HUD chapter bar: [label, start, end]
    hits: {
      // 01 the problem: one entry per word that drives a cut, a hit or a reveal
      every: 0.2, cost: 1.1, punch: 3.2, thing: 4.3, undone: 6.9,
      // 02 the fix
      fix: 8.1, final: 9.4, product: 10.6, endMark: 11.9, voEnd: 12.4,
    },
  };
  const H = K.hits;
  // Derived beats shared by page and score live here too (e.g. H.calls = [...]), so the two can't drift apart.
  return K;
})();
if (typeof module !== 'undefined') module.exports = KCUE;
