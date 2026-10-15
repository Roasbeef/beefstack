// reel.js: kinetic-typography engine (seed). Set BRAND and the palette K below for each project. Every frame is a pure function of t.
// Layers per frame: WebGL backgrounds (particle terrain, particle clouds, liquid marble) → 2D canvas (type, HUD, shapes)
// → WebGL post pass (RGB split, slice glitch, grain, vignette, flash) → #out. The render.mjs contract: window.ready,
// renderAt(t), renderSheet(...), gpuInfo(), globals DUR + PROJECT.
import * as THREE from '../node_modules/three/build/three.module.js';

// SC: render scale (?sc=2 renders 3840×2160; every coordinate stays in 1920×1080 units).
const SC = Math.max(1, +(new URLSearchParams(location.search).get('sc') || 1));
const W = 1920, H = 1080, C = KCUE, S = C.S, Hh = C.hits, FPS = C.fps, BEAT = C.beat;
window.DUR = C.dur; window.PROJECT = { audio: 'assets/mix.m4a' };
// Brand: the wordmark text, where its accent colour starts, and the HUD title-line tagline.
const BRAND = { name: 'brand-name', split: 5, tagline: 'YOUR TAGLINE HERE' };
// Brand palette (example, re-key per project): purple-black ground, brand purple, violet lines, orange = payment/energy,
// pink = reversed/refused, green = settled/OK, cream type.
const K = {
  ink: '#0B0714', ink2: '#160E26', ink3: '#22163A', purple: '#57038D', violet: '#A35CFF', orange: '#FF7C00',
  pink: '#F5406E', green: '#3DDC84', cream: '#F3EEE6', grey: '#8E86A0', mid: '#5A5270',
};
// Pi's TUI (Tomorrow Night).
const P = { bg: '#1D1F21', text: '#C5C8C6', border: '#81A2BE', dim: '#666666', amber: '#F0C674', teal: '#8ABEB7', green: '#B5BD68', chrome: '#161819' };
const F = { cond: '"Anton"', wide: '"Archivo Black"', serif: '"Instrument Serif"', mono: '"JetBrains Mono"' };
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const easeIn = x => Math.pow(clamp(x), 3);
const expoOut = x => { x = clamp(x); return x === 1 ? 1 : 1 - Math.pow(2, -10 * x); };
const backOut = x => { x = clamp(x); const s = 1.7; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
const easeInOut = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const ioExpo = x => { x = clamp(x); return x === 0 ? 0 : x === 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2; };
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const beatPulse = (t, k = 7) => Math.exp(-((t / BEAT) % 1) * k);
const pulseAt = (t, t0, k = 6) => t < t0 ? 0 : Math.exp(-(t - t0) * k);
const TAU = Math.PI * 2;
const fmt = n => Math.round(n).toLocaleString('en-US');

// ---------- canvases ----------
const out = document.getElementById('out');
const c2 = document.createElement('canvas'); c2.width = W * SC; c2.height = H * SC;
{ // shadowBlur ignores the transform: scale it with SC so glows keep their size
  const P2 = CanvasRenderingContext2D.prototype, d = Object.getOwnPropertyDescriptor(P2, 'shadowBlur');
  Object.defineProperty(P2, 'shadowBlur', { get() { return d.get.call(this) / SC; }, set(v) { d.set.call(this, v * SC); } });
}
let ctx = c2.getContext('2d');   // swapped to an offscreen buffer while a transition renders its two scenes
const mainCtx = ctx;
const mkBuf = () => { const c = document.createElement('canvas'); c.width = W * SC; c.height = H * SC; return c; };
const bufA = mkBuf(), bufB = mkBuf(), bufT = mkBuf();
let TRANS = false;
const RECT = {};
const glA = document.createElement('canvas'); glA.width = W * SC; glA.height = H * SC;
const RA = new THREE.WebGLRenderer({ canvas: glA, antialias: true, alpha: true, preserveDrawingBuffer: true });
RA.setPixelRatio(SC); RA.setSize(W, H, false);
const RP = new THREE.WebGLRenderer({ canvas: out, antialias: false, preserveDrawingBuffer: true });
RP.setPixelRatio(SC); RP.setSize(W, H, false); RP.outputColorSpace = THREE.LinearSRGBColorSpace;

// ---------- GL layer 1: particle terrain (tintable) ----------
const terrain = (() => {
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(42, W / H, .1, 100);
  const nx = 220, nz = 140, pos = new Float32Array(nx * nz * 3);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const k = (i * nz + j) * 3; pos[k] = (i / (nx - 1) - .5) * 26; pos[k + 1] = 0; pos[k + 2] = -j / (nz - 1) * 30 + 3; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, amp: { value: 1 }, fade: { value: 1 }, tint: { value: new THREE.Color(K.violet) }, hot: { value: new THREE.Color(K.orange) }, heat: { value: 0 } },
    vertexShader: `uniform float time, amp; varying float vA; varying float vH;
      float wave(vec2 p, float t){ return sin(p.x*.5+t*.9)*.45 + sin(p.y*.38-t*.7)*.6 + sin((p.x+p.y)*.27+t*.5)*.7 + sin(length(p-vec2(3.,-9.))*.8-t*1.4)*.4; }
      void main(){ vec3 p = position; p.y = wave(p.xz, time)*amp; vec4 mv = modelViewMatrix*vec4(p,1.);
        gl_PointSize = ${(5.5 * SC).toFixed(2)} * (6.0 / -mv.z); float d = -mv.z; vA = clamp(1.0 - d/30.0, 0., 1.) * (.25 + .75*smoothstep(-1.2, 1.6, p.y)) * smoothstep(0.5, 3.5, d);
        vH = smoothstep(.9, 1.9, p.y);
        gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float fade, heat; uniform vec3 tint, hot; varying float vA; varying float vH;
      void main(){ vec2 c = gl_PointCoord-.5; float r = dot(c,c); if (r>.25) discard; gl_FragColor = vec4(mix(tint, hot, vH*heat), vA*fade*(1.0-r*2.5)); }`,
  });
  scene.add(new THREE.Points(g, mat));
  return (t, o = {}) => {
    const u = mat.uniforms; u.time.value = t; u.amp.value = o.amp ?? 1; u.fade.value = o.fade ?? 1; u.heat.value = o.heat ?? 0;
    u.tint.value.set(o.tint || K.violet);
    cam.position.set(Math.sin(t * .15) * 1.5, o.camY ?? 3.2, 5 - (o.push ?? 0)); cam.lookAt(0, -.4, -8); cam.rotation.z += o.roll ?? 0;
    RA.setClearColor(0x000000, 0); RA.clear(); RA.render(scene, cam);
    return glA;
  };
})();

// ---------- GL layer 2: liquid marble, re-keyed to purple / violet / orange ----------
const liquid = (() => {
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, res: { value: new THREE.Vector2(W, H) }, strips: { value: 0 }, stripAmt: { value: 0 }, zoom: { value: 1.6 }, seed: { value: 0 }, dim: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `uniform float time, strips, stripAmt, zoom, seed, dim; uniform vec2 res; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*n(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }
      void main(){
        vec2 uv = vUv; vec2 p = (uv-.5)*vec2(res.x/res.y,1.)*zoom + seed;
        if (strips > 0.) { float s = floor(uv.x*strips); p.y += (h(vec2(s,3.))-.5)*stripAmt; p.x += (h(vec2(s,7.))-.5)*stripAmt*.25; }
        vec2 q = vec2(fbm(p + time*.06), fbm(p + vec2(5.2,1.3) - time*.05));
        vec2 r = vec2(fbm(p + 3.6*q + vec2(1.7,9.2) + time*.13), fbm(p + 3.6*q + vec2(8.3,2.8) - time*.11));
        float f = fbm(p + 3.8*r);
        float band = sin(f*22.0 + r.x*7.0)*.5+.5;
        vec3 purple = vec3(.34,.012,.55), orange = vec3(1.,.49,.0), vio = vec3(.64,.36,1.), ink = vec3(.043,.027,.078), cream = vec3(.98,.9,.86);
        vec3 col = mix(purple, orange, smoothstep(.45,.7,f));
        col = mix(col, vio, smoothstep(.62,.95,band)*.55);
        col = mix(col, ink, smoothstep(.5,.95,1.0-f)*.8);
        col = mix(col, cream, smoothstep(.93,1.,band)*smoothstep(.5,.75,f)*.45);
        gl_FragColor = vec4(col*(1.-dim),1.);
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  return (t, o = {}) => {
    const u = mat.uniforms; u.time.value = t; u.strips.value = o.strips || 0; u.stripAmt.value = o.stripAmt || 0; u.zoom.value = o.zoom ?? 1.6; u.seed.value = o.seed || 0; u.dim.value = o.dim || 0;
    RA.setClearColor(0x000000, 1); RA.clear(); RA.render(scene, cam);
    return glA;
  };
})();

// ---------- GL layer 3: particle clouds that condense from a loose shell (k 0) into a target shape (k 1) ----------
// target(rnd) returns a world point in the shape. 224 px per world unit at z = 0 (camera z 9, fov 30).
const PXU = H / (2 * 9 * Math.tan(15 * Math.PI / 180));
function makeCloud(target, seedv = 7, n = 9000, shell = [1.1, 1.7]) {
  const A = new Float32Array(n * 3), Bp = new Float32Array(n * 3), R = new Float32Array(n);
  let sd = seedv; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    const u = rnd() * 2 - 1, th = rnd() * TAU, r = shell[0] + rnd() * shell[1], q = Math.sqrt(1 - u * u);
    A.set([Math.cos(th) * q * r * 1.3, u * r * .85, Math.sin(th) * q * r], i * 3);
    Bp.set(target(rnd), i * 3); R[i] = rnd();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(A.slice(), 3)); g.setAttribute('a', new THREE.BufferAttribute(A, 3));
  g.setAttribute('b', new THREE.BufferAttribute(Bp, 3)); g.setAttribute('r', new THREE.BufferAttribute(R, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, k: { value: 0 }, size: { value: 4 }, fade: { value: 1 }, swirl: { value: 1 },
      cA: { value: new THREE.Color(K.violet) }, cB: { value: new THREE.Color(K.cream) }, cC: { value: new THREE.Color(K.orange) }, cT: { value: new THREE.Color(K.orange) } },
    vertexShader: `attribute vec3 a; attribute vec3 b; attribute float r; uniform float time, k, size, swirl; uniform vec3 cA, cB, cC, cT; varying float vA; varying vec3 vC;
      void main(){
        float kk = clamp(k*1.4 - r*.4, 0., 1.); kk = kk*kk*(3.-2.*kk);
        float ang = swirl*(time*.6 + r*6.283)*(1.-kk)*.35;
        vec3 wa = vec3(a.x*cos(ang) - a.z*sin(ang), a.y + sin(time*.9+r*20.)*.12, a.x*sin(ang) + a.z*cos(ang));
        vec3 wb = b + vec3(sin(time*1.3+r*40.)*.012, cos(time*1.1+r*30.)*.012, 0.);
        vec4 mv = modelViewMatrix*vec4(mix(wa, wb, kk), 1.);
        gl_PointSize = size * ${SC.toFixed(2)} * (7.0 / -mv.z);
        vA = (.45 + .4*kk);
        vec3 base = r < .55 ? cA : (r < .86 ? cB : cC);
        vC = mix(base, cT, kk*.85);
        gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float fade; varying float vA; varying vec3 vC;
      void main(){ vec2 c = gl_PointCoord-.5; float d = dot(c,c); if (d>.25) discard; gl_FragColor = vec4(vC, vA*fade*(1.-d*3.)); }`,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, W / H, .1, 100); cam.position.set(0, 0, 9); scene.add(pts);
  return (t, o = {}) => {
    const u = mat.uniforms; u.time.value = t; u.k.value = o.k ?? 0; u.fade.value = o.fade ?? 1; u.size.value = o.size ?? 4; u.swirl.value = o.swirl ?? 1;
    u.cT.value.set(o.cT || K.orange);
    pts.rotation.set(o.rx ?? 0, o.rot ?? 0, 0); pts.position.set(o.x ?? 0, o.y ?? 0, 0); pts.scale.setScalar(o.s ?? 1);
    RA.setClearColor(0x000000, 0); RA.clear(); RA.render(scene, cam); return glA;
  };
}
// a pointy-top hexagon (the token), 35% of the points on its rim
const HEXR = .8;
const inHex = (x, y, r) => { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; if (x * Math.cos(a) + y * Math.sin(a) > r * Math.cos(Math.PI / 6)) return false; } return true; };
const tokenCloud = makeCloud(rnd => {
  if (rnd() < .35) { const i = Math.floor(rnd() * 6), a0 = Math.PI / 2 + i * Math.PI / 3, a1 = a0 + Math.PI / 3, u = rnd(), j = (rnd() - .5) * .05;
    return [lerp(Math.cos(a0), Math.cos(a1), u) * (HEXR + j), lerp(Math.sin(a0), Math.sin(a1), u) * (HEXR + j), (rnd() - .5) * .1]; }
  let x, y; do { x = (rnd() * 2 - 1) * HEXR; y = (rnd() * 2 - 1) * HEXR; } while (!inHex(y, x, HEXR));
  return [x, y, (rnd() - .5) * .25];
}, 7);
// a SCHEMATIC QR: finder squares, timing rows and hashed modules (not a real code)
const QN = 25, QS = 2.9;
const QR = (() => {
  const m = []; for (let r = 0; r < QN; r++) { m.push([]); for (let c = 0; c < QN; c++) m[r].push(hash(r * 31 + c * 7 + 3) > .52 ? 1 : 0); }
  const finder = (r0, c0) => { for (let r = -1; r < 8; r++) for (let c = -1; c < 8; c++) { const rr = r0 + r, cc = c0 + c; if (rr < 0 || cc < 0 || rr >= QN || cc >= QN) continue; const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3)); m[rr][cc] = (r < 0 || c < 0 || r > 6 || c > 6) ? 0 : (ring === 3 || ring <= 1) ? 1 : 0; } };
  finder(0, 0); finder(0, QN - 7); finder(QN - 7, 0);
  for (let i = 8; i < QN - 8; i++) { m[6][i] = i % 2 ? 0 : 1; m[i][6] = i % 2 ? 0 : 1; }
  for (let r = 16; r < 21; r++) for (let c = 16; c < 21; c++) { const ring = Math.max(Math.abs(r - 18), Math.abs(c - 18)); m[r][c] = ring === 1 ? 0 : 1; }
  return m;
})();
const qrCells = []; for (let r = 0; r < QN; r++) for (let c = 0; c < QN; c++) if (QR[r][c]) qrCells.push([r, c]);
const qrCloud = makeCloud(rnd => {
  const [r, c] = qrCells[Math.floor(rnd() * qrCells.length)], cs = QS / QN;
  return [(c + .1 + rnd() * .8) * cs - QS / 2, QS / 2 - (r + .1 + rnd() * .8) * cs, (rnd() - .5) * .08];
}, 11, 9000, [1.8, 1.6]);

// ---------- post pass ----------
const post = (() => {
  const tex = new THREE.CanvasTexture(c2); tex.colorSpace = THREE.NoColorSpace; tex.minFilter = tex.magFilter = THREE.LinearFilter;
  const mat = new THREE.ShaderMaterial({
    uniforms: { tex: { value: tex }, split: { value: 0 }, slice: { value: 0 }, seed: { value: 0 }, grain: { value: .05 }, time: { value: 0 }, vign: { value: .5 }, flash: { value: 0 }, flashCol: { value: new THREE.Color(1, 1, 1) }, res: { value: new THREE.Vector2(W * SC, H * SC) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `uniform sampler2D tex; uniform float split, slice, seed, grain, time, vign, flash; uniform vec3 flashCol; uniform vec2 res; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      void main(){
        vec2 uv = vUv;
        float band = floor(uv.y*28.0 + h(vec2(seed,1.))*3.0), hb = h(vec2(band, seed));
        if (hb < slice) uv.x += (h(vec2(band, seed+2.)) - .5) * .16 * slice;
        vec2 d = vec2(split, split*.15);
        vec3 c = vec3(texture2D(tex, uv + d).r, texture2D(tex, uv).g, texture2D(tex, uv - d).b);
        c += (h(vUv*res + time*61.7) - .5) * grain;
        vec2 q = vUv - .5; c *= 1.0 - vign*dot(q,q)*.9;
        c = mix(c, flashCol, flash);
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  return (t, fx) => {
    tex.needsUpdate = true;
    const u = mat.uniforms; u.split.value = fx.split; u.slice.value = fx.slice; u.seed.value = fx.seed; u.time.value = Math.floor(t * FPS);
    u.grain.value = fx.grain; u.vign.value = fx.vign; u.flash.value = fx.flash; u.flashCol.value.set(fx.flashCol);
    RP.render(scene, cam);
  };
})();

// ---------- 2D helpers ----------
let FX;
const font = (fam, size, weight = '') => `${weight} ${size}px ${fam}`.trim();
function txt(s, x, y, o = {}) {
  if ((o.a ?? 1) <= 0.001) return;
  ctx.save();
  ctx.font = o.font; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic'; ctx.letterSpacing = (o.ls || 0) + 'px';
  ctx.globalAlpha = o.a ?? 1;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowR || 28; }
  if (o.stroke) { ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.stroke; ctx.strokeText(s, x, y); }
  if (o.fill !== null) { ctx.fillStyle = o.fill || K.cream; ctx.fillText(s, x, y); }
  ctx.restore();
}
function letters(s, x, y, o, fn) {
  ctx.save(); ctx.font = o.font; ctx.letterSpacing = (o.ls || 0) + 'px';
  const total = ctx.measureText(s).width, x0 = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  const n = s.length;
  for (let i = 0; i < n; i++) {
    const ch = s[i]; if (ch === ' ') continue;
    const px = ctx.measureText(s.slice(0, i)).width, cw = ctx.measureText(ch).width, a = fn(i, n);
    if ((a.a ?? 1) <= 0.001) continue;
    ctx.save(); ctx.globalAlpha = a.a ?? 1; ctx.translate(x0 + px + cw / 2 + (a.dx || 0), y + (a.dy || 0)); ctx.rotate(a.r || 0); ctx.scale(a.s ?? 1, a.s ?? 1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowR || 28; }
    if (o.stroke) { ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.stroke; ctx.strokeText(ch, 0, 0); }
    if (o.fill !== null) { ctx.fillStyle = a.fill || o.fill || K.cream; ctx.fillText(ch, 0, 0); }
    ctx.restore();
  }
  ctx.restore();
  return total;
}
const measure = (s, f, ls = 0) => { ctx.save(); ctx.font = f; ctx.letterSpacing = ls + 'px'; const w = ctx.measureText(s).width; ctx.restore(); return w; };
const bg = col => { ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); };
function line(pts, col, lw = 2, a = 1, dash = null) { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; if (dash) ctx.setLineDash(dash); ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore(); }
function circle(x, y, r, o = {}) { if (!(r > .01) || (o.a ?? 1) <= 0) return; ctx.save(); ctx.globalAlpha = o.a ?? 1; if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowR || 30; } ctx.beginPath(); ctx.arc(x, y, r, o.a0 ?? 0, o.a1 ?? TAU); if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); } if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 2; if (o.dash) ctx.setLineDash(o.dash); ctx.stroke(); } ctx.restore(); }
function rrect(x, y, w, h, r, o = {}) { if (!(w > .5) || !(h > .5) || (o.a ?? 1) <= 0) return; ctx.save(); ctx.globalAlpha = o.a ?? 1; if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowR || 30; } ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); } if (o.stroke) { ctx.shadowBlur = o.glow ? ctx.shadowBlur : 0; ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 2; if (o.dash) ctx.setLineDash(o.dash); ctx.stroke(); } ctx.restore(); }
function chip(s, x, y, o = {}) {
  const f = o.font || font(F.mono, 28, 700), ls = o.ls ?? 2, w = measure(s, f, ls) + 28, h = o.h || 38, k = o.k ?? 1;
  if (k <= 0) return w;
  const x0 = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
  rrect(x0, y - h / 2, w * easeOut(k), h, o.r ?? 4, { fill: o.bg || K.ink2, stroke: o.line, lw: o.lw, a: o.a });
  if (k > .6) txt(s, x0 + 14, y + (o.dy ?? 6.5), { font: f, fill: o.fg || K.cream, ls, a: (o.a ?? 1) * seg(k, .6, 1) });
  return w;
}
function arrow(x0, y0, x1, y1, col, lw = 2, a = 1, head = 13) {
  if (a <= 0) return;
  line([[x0, y0], [x1, y1]], col, lw, a); const g = Math.atan2(y1 - y0, x1 - x0);
  line([[x1 - Math.cos(g - .45) * head, y1 - Math.sin(g - .45) * head], [x1, y1], [x1 - Math.cos(g + .45) * head, y1 - Math.sin(g + .45) * head]], col, lw, a);
}
const dropWord = (s, x, y, f, t0, t, o = {}) => letters(s, x, y, { font: f, fill: o.fill || K.cream, align: o.align, glow: o.glow, glowR: o.glowR }, (i) => {
  const k = seg(t, t0 + i * (o.stag ?? .03), t0 + i * (o.stag ?? .03) + (o.dur ?? .32)); return { dy: (1 - expoOut(k)) * (o.fall ?? 220), a: (k > 0 ? 1 : 0) * (o.a ?? 1), fill: o.fillAt ? o.fillAt(i) : undefined };
});
const glitchIn = (lt, seed, d = .14, amt = .5) => { if (!TRANS && lt < d && lt >= 0) { FX.slice = Math.max(FX.slice, amt * (1 - lt / d)); FX.split = Math.max(FX.split, .006 * (1 - lt / d)); FX.seed = seed; } };
const count = (t, t0, t1, v0, v1) => lerp(v0, v1, expoOut(seg(t, t0, t1)));
const typed = (s, k) => s.slice(0, Math.round(s.length * clamp(k)));
const glShot = (canvas, a = 1) => { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.drawImage(canvas, 0, 0, W, H); ctx.restore(); };
function strike(x0, x1, y, k, col = K.pink, lw = 16) { if (k <= 0) return; line([[x0, y], [lerp(x0, x1, easeOut(k)), y]], col, lw, 1); }
function hexPath(x, y, r) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
// the token: a glowing hexagon (orange core, violet rim)
function token(x, y, r, o = {}) {
  if (!(r > .5)) return; const a = o.a ?? 1; if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  const g = ctx.createRadialGradient(x, y - r * .2, r * .05, x, y, r * 1.05);
  const hot = o.dim ? '#7A5A48' : '#FFC27A', mid = o.dim ? '#5A3C2C' : K.orange, edge = o.dim ? '#2A1A30' : '#8A2F12';
  g.addColorStop(0, hot); g.addColorStop(.45, mid); g.addColorStop(1, edge);
  ctx.shadowColor = o.dim ? 'rgba(0,0,0,0)' : rgba(K.orange, .8); ctx.shadowBlur = (o.glow ?? 1) * r * .6;
  hexPath(x, y, r); ctx.fillStyle = g; ctx.fill(); ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(2, r * .05); ctx.strokeStyle = o.rim || K.violet; ctx.stroke();
  ctx.globalAlpha = a * .45; hexPath(x, y, r * .72); ctx.lineWidth = Math.max(1, r * .025); ctx.strokeStyle = K.cream; ctx.stroke();
  ctx.restore();
}
// the brand bolt mark, h = height; k = 0..1 strike-in
function bolt(x, y, h, k = 1, col = K.orange, glow = 1) {
  if (k <= 0 || !(h > .5)) return; const s = h / 100;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-35, -50);
  ctx.beginPath(); ctx.rect(-20, -20, 120, 140 * easeOut(k)); ctx.clip();
  ctx.shadowColor = rgba(col, .9); ctx.shadowBlur = 18 * glow / s * Math.min(1, s);
  ctx.beginPath(); [[42, 0], [6, 58], [34, 58], [26, 100], [64, 38], [36, 38]].forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath();
  ctx.fillStyle = col; ctx.fill(); ctx.restore();
}
// wordmark: bolt + BRAND.name in mono, the part after BRAND.split in violet. (x, y) = centre of the text's baseline row; n = chars shown (typing)
function wordmark(x, y, size, o = {}) {
  const f = font(F.mono, size, 700), ls = -size * .03, full = o.text ?? BRAND.name, n = o.n ?? full.length;
  const tw = measure(full, f, ls), bw = size * .62, gap = size * .22, total = bw + gap + tw, x0 = x - total / 2;
  bolt(x0 + bw / 2, y - size * .36, size * .98, o.bolt ?? 1, K.orange, o.glow ?? 1);
  const s = full.slice(0, n), a = o.a ?? 1;
  txt(s.slice(0, BRAND.split), x0 + bw + gap, y, { font: f, fill: K.cream, ls, a });
  if (s.length > BRAND.split) txt(s.slice(BRAND.split), x0 + bw + gap + measure(full.slice(0, BRAND.split), f, ls), y, { font: f, fill: K.violet, ls, a });
  return [x0, total];
}
function hud(t, o) {
  const dark = o.dark !== false, col = dark ? 'rgba(243,238,230,.85)' : 'rgba(22,14,38,.85)', dim = dark ? 'rgba(243,238,230,.4)' : 'rgba(22,14,38,.4)';
  const k = o.k ?? 1, m = 40, L = 26 * k;
  if (o.brackets !== false) for (const [cx, cy, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) line([[cx, cy + sy * L], [cx, cy], [cx + sx * L, cy]], col, 2, k);
  const f = font(F.mono, 17, 500), a = clamp(k * 1.4 - .3);
  if (o.tl) txt(o.tl, m + 18, m + 30, { font: f, fill: col, ls: 2.5, a });
  if (o.tr) txt(o.tr, W - m - 18, m + 30, { font: f, fill: col, ls: 2.5, align: 'right', a });
  if (o.bl) txt(o.bl, m + 18, H - m - 18, { font: f, fill: col, ls: 2.5, a });
  if (o.br) txt(o.br, W - m - 18, H - m - 18, { font: f, fill: o.brCol || col, ls: 2.5, align: 'right', a });
  if (o.progress !== false) {
    const y = H - m + 10, x0 = m + 18, x1 = W - m - 18, X = s => lerp(x0, x1, s / C.dur);
    for (const [, a0, a1] of C.CH) {
      const xa = X(a0) + 3, xb = X(a1) - 3, on = t >= a0 && t < a1;
      line([[xa, y], [xb, y]], dim, 1, a * .6);
      if (t > a0) line([[xa, y], [Math.min(xb, X(t)), y]], on ? (dark ? K.violet : K.purple) : col, on ? 3 : 2, a);
    }
  }
}
const tc = t => { const f = Math.floor(t * FPS), s = Math.floor(f / FPS), fr = f % FPS, p = n => String(n).padStart(2, '0'); return `TC 00:${p(Math.floor(s / 60))}:${p(s % 60)}:${p(fr)}`; };
const sec = i => `■ ${String(i).padStart(2, '0')} / ${String(C.CH.length).padStart(2, '0')}   ${C.CH[i - 1][0]}`;
const TL = `${BRAND.name.toUpperCase()} — ${BRAND.tagline}`;
function odometer(v0, v1, k, x, y, f, col) {
  const s1 = String(v1), s0 = String(v0).padStart(s1.length, '0'); ctx.save(); ctx.font = f;
  let xx = x; const fs = parseFloat(f.match(/(\d+)px/)[1]), hgt = fs * 1.25;   // roll pitch > glyph height, so neighbours stay outside the clip
  for (let i = 0; i < s1.length; i++) {
    const w = ctx.measureText(s1[i]).width;
    if (!/\d/.test(s1[i])) { ctx.fillStyle = col; ctx.fillText(s1[i], xx, y); xx += w; continue; }
    const st = Math.min(.1, .5 / s1.length), d0 = +s0[i] || 0, d1 = +s1[i], kk = expoOut(clamp((k - i * st) / Math.max(.2, 1 - (s1.length - 1) * st)));
    ctx.save(); ctx.beginPath(); ctx.rect(xx - 10, y - fs * 1.0, w + 20, fs * 1.0 + 6); ctx.clip();
    const steps = (d1 - d0 + 10) % 10, off = kk * steps;
    for (let j = -1; j <= steps + 1; j++) { const dy = (j - off) * hgt; if (Math.abs(dy) > hgt * 1.2) continue; ctx.fillStyle = col; ctx.fillText(String((d0 + j + 10) % 10), xx, y + dy); }
    ctx.restore(); xx += w;
  }
  ctx.restore(); return xx;
}
function sparks(t, x, y, w, n, col, seed = 1, rise = 260, a = 1) {   // heat: sparks rising from a region
  for (let i = 0; i < n; i++) {
    const ph = (t * (.5 + hash(i + seed) * .6) + hash(i * 3 + seed)) % 1, px = x + (hash(i * 7 + seed) - .5) * w + Math.sin(t * 2 + i) * 12, py = y - ph * rise;
    circle(px, py, 2 + 3 * hash(i * 11 + seed), { fill: col, a: a * Math.sin(Math.PI * ph) * .9 });
  }
}
function dotGrid(x0, y0, x1, y1, step, col, a) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; for (let x = x0; x <= x1; x += step) for (let y = y0; y <= y1; y += step) ctx.fillRect(x - 1, y - 1, 2, 2); ctx.restore(); }
