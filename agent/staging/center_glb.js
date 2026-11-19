// Re-centre a GLB so its world AABB is centred on X/Z (origin at bottom centre when combined
// with normalize_glb.js --ground). Optional --yaw=<deg> bakes a rotation about +Y first.
// Only root-node transforms are touched (no vertex rewrite, textures untouched).
//   node center_glb.js in.glb out.glb [--yaw=deg]
const fs = require('fs');
const [inp, outp, ...rest] = process.argv.slice(2);
const flags = Object.fromEntries(rest.map(a => a.replace(/^--/, '').split('=')));
const buf = fs.readFileSync(inp);
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
const tail = buf.slice(20 + jsonLen); // BIN chunk header + data, kept verbatim

const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; // row-major
const mul = (A, B) => { const C = new Array(16).fill(0); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) C[r * 4 + c] += A[r * 4 + k] * B[k * 4 + c]; return C; };
const fromCol = (m) => { const R = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) R[r * 4 + c] = m[c * 4 + r]; return R; };
const toCol = fromCol; // transpose is its own inverse
function local(n) {
  if (n.matrix) return fromCol(n.matrix);
  const t = n.translation || [0, 0, 0], q = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1];
  const [x, y, z, w] = q;
  const R = [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
             2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
             2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
  return [R[0] * s[0], R[1] * s[1], R[2] * s[2], t[0], R[3] * s[0], R[4] * s[1], R[5] * s[2], t[1], R[6] * s[0], R[7] * s[1], R[8] * s[2], t[2], 0, 0, 0, 1];
}
const nodes = json.nodes || [];
const scene = json.scenes[json.scene || 0];
const roots = scene.nodes;
function aabb() {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  const walk = (i, P) => {
    const n = nodes[i]; const W = mul(P, local(n));
    if (n.mesh !== undefined) for (const p of json.meshes[n.mesh].primitives) {
      const a = json.accessors[p.attributes.POSITION]; if (!a || !a.min) continue;
      for (let k = 0; k < 8; k++) {
        const v = [k & 1 ? a.max[0] : a.min[0], k & 2 ? a.max[1] : a.min[1], k & 4 ? a.max[2] : a.min[2]];
        for (let r = 0; r < 3; r++) { const w = W[r * 4] * v[0] + W[r * 4 + 1] * v[1] + W[r * 4 + 2] * v[2] + W[r * 4 + 3]; mn[r] = Math.min(mn[r], w); mx[r] = Math.max(mx[r], w); }
      }
    }
    for (const c of n.children || []) walk(c, W);
  };
  for (const r of roots) walk(r, I);
  return { mn, mx };
}
function applyToRoots(M) {
  for (const r of roots) { const n = nodes[r]; n.matrix = toCol(mul(M, local(n))); delete n.translation; delete n.rotation; delete n.scale; }
}
if (flags.yaw) { const a = Number(flags.yaw) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); applyToRoots([c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1]); }
let b = aabb();
const dx = -(b.mn[0] + b.mx[0]) / 2, dy = -b.mn[1], dz = -(b.mn[2] + b.mx[2]) / 2;
applyToRoots([1, 0, 0, dx, 0, 1, 0, dy, 0, 0, 1, dz, 0, 0, 0, 1]);
b = aabb();
let js = JSON.stringify(json); while (js.length % 4) js += ' ';
const jb = Buffer.from(js, 'utf8');
const total = 20 + jb.length + tail.length;
const head = Buffer.alloc(20);
head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(total, 8);
head.writeUInt32LE(jb.length, 12); head.writeUInt32LE(0x4E4F534A, 16);
fs.writeFileSync(outp, Buffer.concat([head, jb, tail]));
const cm = (v) => (v * 100).toFixed(1);
console.log(`CENTERED size(cm) ${cm(b.mx[0] - b.mn[0])} x ${cm(b.mx[1] - b.mn[1])} x ${cm(b.mx[2] - b.mn[2])} min(${cm(b.mn[0])},${cm(b.mn[1])},${cm(b.mn[2])}) max(${cm(b.mx[0])},${cm(b.mx[1])},${cm(b.mx[2])})`);
