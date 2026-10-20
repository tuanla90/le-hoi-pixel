// Deterministic maths for online play (lockstep): every browser in a room runs the same simulation from the same
// inputs, so the simulation must compute bit-identical numbers everywhere. + - * / and Math.sqrt are correctly
// rounded on every engine; Math.sin/cos/atan2/pow/hypot are not (V8 and Safari's JavaScriptCore can differ in the
// last bit), and Math.random is not seeded. While a simulation step runs, withDet() swaps those for the pure-JS
// versions below (fdlibm kernels), then restores the real ones so drawing and audio keep using the fast built-ins.

const PI = Math.PI, PIO2 = Math.PI / 2;

// ---------------------------------------------------------------- sin / cos (fdlibm __kernel_sin / __kernel_cos)
const S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03, S3 = -1.98412698298579493134e-04,
  S4 = 2.75573137070700676789e-06, S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;
const C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03, C3 = 2.48015872894767294178e-05,
  C4 = -2.75573143513906633035e-07, C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;
const ksin = x => { const z = x * x; return x + z * x * (S1 + z * (S2 + z * (S3 + z * (S4 + z * (S5 + z * S6))))); };
const kcos = x => { const z = x * x; return 1 - 0.5 * z + z * z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6))))); };
// Cody–Waite reduction by π/2: exact enough for |x| below ~1e6, far beyond anything the game feeds in
const INVPIO2 = 6.36619772367581382433e-01, PIO2_1 = 1.57079632673412561417e+00, PIO2_1T = 6.07710050650619224932e-11;
function quadrant(x) { const n = Math.round(x * INVPIO2); return [((n % 4) + 4) % 4, (x - n * PIO2_1) - n * PIO2_1T]; }
export function dsin(x) {
  if (!isFinite(x)) return NaN;
  const [q, r] = quadrant(x);
  return q === 0 ? ksin(r) : q === 1 ? kcos(r) : q === 2 ? -ksin(r) : -kcos(r);
}
export function dcos(x) {
  if (!isFinite(x)) return NaN;
  const [q, r] = quadrant(x);
  return q === 0 ? kcos(r) : q === 1 ? -ksin(r) : q === 2 ? -kcos(r) : ksin(r);
}

// ---------------------------------------------------------------- atan / atan2 (fdlibm s_atan)
const ATANHI = [4.63647609000806093515e-01, 7.85398163397448278999e-01, 9.82793723247329054082e-01, 1.57079632679489655800e+00];
const ATANLO = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17];
const AT = [3.33333333333329318027e-01, -1.99999999998764832476e-01, 1.42857142725034663711e-01, -1.11111104054623557880e-01,
  9.09088713343650656196e-02, -7.69187620504482999495e-02, 6.66107313738753120669e-02, -5.83357013379057348645e-02,
  4.97687799461593236017e-02, -3.65315727442169155270e-02, 1.62858201153657823623e-02];
export function datan(x) {
  if (x !== x) return NaN;
  const neg = x < 0; let a = neg ? -x : x, id = -1;
  if (a >= 0.4375) {
    if (a < 1.1875) { if (a < 0.6875) { id = 0; a = (2 * a - 1) / (2 + a); } else { id = 1; a = (a - 1) / (a + 1); } }
    else if (a < 2.4375) { id = 2; a = (a - 1.5) / (1 + 1.5 * a); }
    else { id = 3; a = -1 / a; }
  }
  const z = a * a, w = z * z;
  const s1 = z * (AT[0] + w * (AT[2] + w * (AT[4] + w * (AT[6] + w * (AT[8] + w * AT[10])))));
  const s2 = w * (AT[1] + w * (AT[3] + w * (AT[5] + w * (AT[7] + w * AT[9]))));
  const r = id < 0 ? a - a * (s1 + s2) : ATANHI[id] - ((a * (s1 + s2) - ATANLO[id]) - a);
  return neg ? -r : r;
}
export function datan2(y, x) {
  if (x !== x || y !== y) return NaN;
  if (x > 0) return datan(y / x);
  if (x < 0) return y >= 0 ? datan(y / x) + PI : datan(y / x) - PI;
  return y > 0 ? PIO2 : y < 0 ? -PIO2 : 0;
}

// ---------------------------------------------------------------- exp / log / pow / hypot
const LN2_HI = 6.93147180369123816490e-01, LN2_LO = 1.90821492927058770002e-10, INVLN2 = 1.44269504088896338700e+00;
function scale2(v, k) { while (k > 0) { v *= 2; k--; } while (k < 0) { v /= 2; k++; } return v; } // exact powers of two
export function dexp(x) {
  if (x !== x) return NaN; if (x > 709) return Infinity; if (x < -745) return 0;
  const k = Math.round(x * INVLN2), r = (x - k * LN2_HI) - k * LN2_LO;
  let term = 1, sum = 1;
  for (let i = 1; i < 20; i++) { term = term * r / i; sum += term; }
  return scale2(sum, k);
}
export function dlog(x) {
  if (x !== x || x < 0) return NaN; if (x === 0) return -Infinity; if (x === Infinity) return Infinity;
  let k = 0; while (x >= 1.4142135623730951) { x /= 2; k++; } while (x < 0.7071067811865476) { x *= 2; k--; }
  const s = (x - 1) / (x + 1), s2 = s * s;
  let term = s, sum = 0;
  for (let i = 1; i < 40; i += 2) { sum += term / i; term *= s2; }
  return 2 * sum + k * LN2_HI + k * LN2_LO;
}
export function dpow(b, e) {
  if (Number.isInteger(e) && Math.abs(e) <= 1024) { let r = 1, p = b, n = Math.abs(e); while (n) { if (n & 1) r *= p; p *= p; n = Math.floor(n / 2); } return e < 0 ? 1 / r : r; }
  if (b === 0) return e > 0 ? 0 : Infinity;
  if (b < 0) return NaN;
  return dexp(e * dlog(b));
}
export function dhypot(...v) { let s = 0; for (const x of v) s += x * x; return Math.sqrt(s); }

// ---------------------------------------------------------------- seeded random (mulberry32) + the swap
let state = 1;
export function seedDet(seed) { state = (seed >>> 0) || 1; }
export function drandom() {
  state = (state + 0x6D2B79F5) >>> 0; let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const REAL = { random: Math.random, sin: Math.sin, cos: Math.cos, atan2: Math.atan2, atan: Math.atan, pow: Math.pow, hypot: Math.hypot, exp: Math.exp, log: Math.log };
const DET = { random: drandom, sin: dsin, cos: dcos, atan2: datan2, atan: datan, pow: dpow, hypot: dhypot, exp: dexp, log: dlog };
let depth = 0;
// run fn with the deterministic versions installed (re-entrant)
export function withDet(fn) {
  if (depth++ === 0) Object.assign(Math, DET);
  try { return fn(); } finally { if (--depth === 0) Object.assign(Math, REAL); }
}
export const realRandom = REAL.random;
