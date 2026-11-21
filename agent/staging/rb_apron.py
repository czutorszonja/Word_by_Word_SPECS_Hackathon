# Blender: dress the Rocketbox barista (avatar.blend written by rb_build_glb.py) in a real cafe bib apron and
# export a Lens-ready GLB with the same export settings as rb_build_glb.py.
#   - waxed-canvas bib apron: bib to mid-chest, curved arm cut-outs, full width from the waist, hem just above
#     the knee, chest pen pocket and a wide hip pocket with copper rivets, contrast top-stitching on every hem
#   - shape: per-height convex hull of the torso (fabric under tension bridges hollows), offset from the body,
#     vertically relaxed so the bib lies taut on the chest/belly; below the waist the cloth falls straight down
#   - cognac leather neck strap (relaxed as a taut band over the chest, collar and trapezius), cotton waist ties
#     around the back with a knot and two hanging tails
#   - skinned to the same armature: weights interpolated from the nearest torso/leg faces of the body, then
#     smoothed over the apron so the skirt shares left/right thigh motion; Armature modifier like the body
#   - one material (<RB_NAME>_Apron): 512 px colour atlas (canvas, leather, webbing) + 512 px normal map
#   blender --background --python rb_apron.py -- <avatar.blend> <out.glb> [texture/work dir]
#   env: RB_NAME (material prefix, default RB), RB_STEP (export frame step, default 2), RB_APRON_TEX (512),
#        RB_APRON_CANVAS / RB_APRON_LEATHER / RB_APRON_TIES / RB_APRON_THREAD as "r,g,b" (sRGB 0-255),
#        RB_APRON_NORMAL=0 to skip the normal map
import bpy, bmesh, sys, os, math
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.interpolate import poly_3d_calc

argv = sys.argv[sys.argv.index("--") + 1:]
BLEND, OUT = argv[0], argv[1]
WORK = argv[2] if len(argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(OUT)), "apron_tex")
os.makedirs(WORK, exist_ok=True)
STEP = int(os.environ.get("RB_STEP", "2"))
NAME = os.environ.get("RB_NAME", "RB")
TEX = int(os.environ.get("RB_APRON_TEX", "512"))
USE_NORMAL = os.environ.get("RB_APRON_NORMAL", "1") != "0"


def rgb(s):
    return np.array([int(x) for x in s.split(",")], float) / 255.0


CANVAS = rgb(os.environ.get("RB_APRON_CANVAS", "84,59,41"))     # tobacco waxed canvas
LEATHER = rgb(os.environ.get("RB_APRON_LEATHER", "130,82,47"))   # cognac leather
WEBBING = rgb(os.environ.get("RB_APRON_TIES", "76,54,38"))       # darker cotton twill tape
THREAD = rgb(os.environ.get("RB_APRON_THREAD", "178,150,108"))   # natural tan top-stitching
COPPER = rgb("178,110,68")

# apron outline, metres in the rest pose (figure faces -Y, his left is +X, feet at z=0)
Z_TOP, Z_CURVE, Z_FULL, Z_WAIST, Z_HEM = 1.39, 1.23, 1.012, 1.00, 0.56
HW_TOP, HW_CB = 0.138, 0.146          # bib half-width at the top / where the arm cut-out starts
N_COL = 29
T_APRON, T_STRAP, T_TIE = 0.0025, 0.003, 0.0018
STRAP_W, TIE_H = 0.022, 0.024

bpy.ops.wm.open_mainfile(filepath=BLEND)
rig = bpy.data.objects["Rig"]
body = bpy.data.objects["Body"]
rig.data.pose_position = "REST"
bpy.context.view_layer.update()

# ───────────────────────── body data (bind pose, world space) ─────────────────────────
me = body.data
nv = len(me.vertices)
co = np.empty(nv * 3)
me.vertices.foreach_get("co", co)
MW = np.array(body.matrix_world)
co = co.reshape(-1, 3) @ MW[:3, :3].T + MW[:3, 3]
gnames = [g.name for g in body.vertex_groups]
W = np.zeros((nv, len(gnames)))
for v in me.vertices:
    for g in v.groups:
        W[v.index, g.group] = g.weight
dom = [gnames[i] for i in W.argmax(1)]
ARM = ("UpperArm", "Forearm", "Hand", "Finger")
HEAD = ("Head", "Eye", "Jaw", "Lip", "lip", "Mouth", "Tongue", "Masseter", "Caninus", "Cheek", "brow", "Nose")
is_arm = np.array([any(k in d for k in ARM) for d in dom])
is_head = np.array([any(k in d for k in HEAD) for d in dom])
vw = [Vector(c) for c in co]
polys = [tuple(p.vertices) for p in me.polygons]
bvh_body = BVHTree.FromPolygons(vw, polys)
torso_polys = [p for p in polys if not any(is_arm[i] or is_head[i] for i in p)]
bvh_torso = BVHTree.FromPolygons(vw, torso_polys)
ed = np.array([e.vertices[:] for e in me.edges])
ed = ed[~(is_arm[ed[:, 0]] | is_arm[ed[:, 1]])]


def section(z):
    a, b = co[ed[:, 0]], co[ed[:, 1]]
    m = (a[:, 2] - z) * (b[:, 2] - z) < 0
    a, b = a[m], b[m]
    t = (z - a[:, 2]) / (b[:, 2] - a[:, 2])
    return a[:, :2] + (b[:, :2] - a[:, :2]) * t[:, None]


def hull2d(P):
    P = sorted(set(map(tuple, np.round(P, 6))))

    def cr(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for p in P:
        while len(lo) >= 2 and cr(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(P):
        while len(up) >= 2 and cr(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    return np.array(lo[:-1] + up[:-1])  # counter-clockwise


def resample_closed(P, step):
    Q = np.vstack([P, P[:1]])
    seg = np.linalg.norm(np.diff(Q, axis=0), axis=1)
    cum = np.concatenate([[0], np.cumsum(seg)])
    n = max(8, int(round(cum[-1] / step)))
    s = np.linspace(0, cum[-1], n, endpoint=False)
    return np.stack([np.interp(s, cum, Q[:, 0]), np.interp(s, cum, Q[:, 1])], 1)


def curve_normals(C):
    t = np.roll(C, -1, 0) - np.roll(C, 1, 0)
    n = np.stack([t[:, 1], -t[:, 0]], 1)
    return n / np.linalg.norm(n, axis=1)[:, None]


def signed_dist_convex(P, H):
    A, B = H, np.roll(H, -1, 0)
    AB = B - A
    AP = P[:, None, :] - A[None]
    t = np.clip((AP * AB[None]).sum(-1) / (AB * AB).sum(-1)[None], 0, 1)
    D = np.linalg.norm(AP - t[..., None] * AB[None], axis=-1).min(1)
    inside = ((AB[None, :, 0] * AP[..., 1] - AB[None, :, 1] * AP[..., 0]) >= 0).all(1)
    return np.where(inside, -D, D)


def offset_curve(H, d, step=0.004, win=0.024):
    """Smooth closed curve around the convex polygon H, at least ~0.85*d outside it (Minkowski sum + smoothing)."""
    K, pts = len(H), []
    for k in range(K):
        p, a, b = H[k], H[k] - H[k - 1], H[(k + 1) % K] - H[k]
        na = np.array([a[1], -a[0]]) / np.linalg.norm(a)
        nb = np.array([b[1], -b[0]]) / np.linalg.norm(b)
        a0, a1 = math.atan2(na[1], na[0]), math.atan2(nb[1], nb[0])
        while a1 < a0:
            a1 += 2 * math.pi
        for t in np.linspace(a0, a1, max(1, int((a1 - a0) / 0.15)) + 1):
            pts.append(p + max(d, 1e-4) * np.array([math.cos(t), math.sin(t)]))
    C = resample_closed(np.array(pts), step)
    m = max(1, int(win / step / 2))
    k = np.ones(2 * m + 1) / (2 * m + 1)
    C = np.stack([np.convolve(np.concatenate([C[-m:, i], C[:, i], C[:m, i]]), k, "valid") for i in range(2)], 1)
    for _ in range(3):
        push = np.maximum(0, 0.85 * d - signed_dist_convex(C, H))
        C = C + curve_normals(C) * push[:, None]
    return resample_closed(C, step)


class Ring:
    """Closed CCW curve with arc length measured from the front centre (x=0, y<0); +s runs toward +X (his left)."""
    def __init__(self, C):
        self.C, self.N = C, curve_normals(C)
        Q = np.vstack([C, C[:1]])
        seg = np.linalg.norm(np.diff(Q, axis=0), axis=1)
        self.cum = np.concatenate([[0], np.cumsum(seg)])
        self.L = self.cum[-1]
        self.s0 = self.cross(front=True)

    def cross(self, front):
        C, n = self.C, len(self.C)
        for i in range(n):
            a, b = C[i], C[(i + 1) % n]
            if a[0] <= 0 < b[0] if front else b[0] <= 0 < a[0]:
                if (a[1] < 0) == front:
                    t = -a[0] / (b[0] - a[0])
                    return self.cum[i] + t * (self.cum[i + 1] - self.cum[i])
        raise RuntimeError("ring does not cross x=0")

    def at(self, s):
        t = (self.s0 + s) % self.L
        i = min(int(np.searchsorted(self.cum, t, side="right")) - 1, len(self.C) - 1)
        f = (t - self.cum[i]) / max(1e-9, self.cum[i + 1] - self.cum[i])
        j = (i + 1) % len(self.C)
        p = self.C[i] * (1 - f) + self.C[j] * f
        n = self.N[i] * (1 - f) + self.N[j] * f
        return p, n / np.linalg.norm(n)


# ───────────────────────── apron panel ─────────────────────────
nb, ns = int(round((Z_TOP - Z_WAIST) / 0.016)), int(round((Z_WAIST - Z_HEM) / 0.02))
zs = np.concatenate([np.linspace(Z_TOP, Z_WAIST, nb + 1), np.linspace(Z_WAIST, Z_HEM, ns + 1)[1:]])
IW, NR = nb, len(zs)


def row_hull(z):
    if z >= Z_WAIST - 1e-6:
        return hull2d(section(z))
    zz = list(np.arange(Z_WAIST, z, -0.01)) + [z]
    return hull2d(np.concatenate([section(q) for q in zz]))


def off_d(z):
    return float(np.interp(z, [Z_HEM, Z_WAIST, 1.30, Z_TOP], [0.012, 0.009, 0.008, 0.006]))


rings = [Ring(offset_curve(row_hull(z), off_d(z))) for z in zs]
HW_S = 0.305 * rings[-1].L
print("APRON rows", NR, "waist ring", round(rings[IW].L, 3), "hem ring", round(rings[-1].L, 3), "skirt half-width", round(HW_S, 3))


def half_w(z):
    if z >= Z_CURVE:
        return HW_TOP + (HW_CB - HW_TOP) * (Z_TOP - z) / (Z_TOP - Z_CURVE)
    if z > Z_FULL:
        k, t = 0.96, (Z_CURVE - z) / (Z_CURVE - Z_FULL)
        return HW_CB + (HW_S - HW_CB) * (1 - math.sqrt(1 - (k * t) ** 2)) / (1 - math.sqrt(1 - k * k))
    return HW_S


HWR = np.array([half_w(z) for z in zs])
S = (np.arange(N_COL) / (N_COL - 1) - 0.5)[None, :] * 2 * HWR[:, None]
base = np.zeros((NR, N_COL, 2))
nrm = np.zeros((NR, N_COL, 2))
for i in range(NR):
    for j in range(N_COL):
        base[i, j], nrm[i, j] = rings[i].at(S[i, j])
# taut fabric: relax the extra offset along each column (never inside the offset hull); waist pinned by the ties
e = np.zeros((NR, N_COL))
free = [i for i in range(1, NR - 1) if i != IW]
for it in range(300):
    P = base + nrm * e[..., None]
    for i in free:
        avg = 0.5 * (P[i - 1] + P[i + 1])
        e[i] = np.maximum(0, ((avg - base[i]) * nrm[i]).sum(-1))
print("APRON max bridge", round(float(e.max()), 4))
for i in range(IW + 1, NR):
    amp = 0.0065 * ((Z_WAIST - zs[i]) / (Z_WAIST - Z_HEM)) ** 1.2
    e[i] += amp * (0.5 + 0.5 * np.cos(2 * np.pi * S[i] / 0.115 + 0.6 * np.sin(S[i] * 9.0)))
P2 = base + nrm * e[..., None]
APRON_V = np.concatenate([P2, np.broadcast_to(zs[:, None, None], (NR, N_COL, 1))], -1)
APRON_N = np.concatenate([nrm, np.zeros((NR, N_COL, 1))], -1)

SCALE = max((Z_TOP - Z_HEM) / 0.955, 2 * HW_S / 0.775)
UC, V0 = 0.012 + HW_S / SCALE, 0.02
UL0, ULW, VL = 0.805, 0.09, 0.90     # leather strip in the atlas
UW0, UWW = 0.905, 0.09               # webbing strip
V_TIE, V_TAIL0, V_TAIL1, V_KNOT0, V_KNOT1 = 0.62, 0.64, 0.86, 0.88, 0.99


def apron_at(s, z):
    """Point + outward normal on the apron base surface at arc length s, height z."""
    i = int(np.clip(np.searchsorted(-zs, -z) - 1, 0, NR - 2))
    f = (zs[i] - z) / (zs[i] - zs[i + 1])
    out_p, out_n = np.zeros(3), np.zeros(3)
    for r, wgt in ((i, 1 - f), (i + 1, f)):
        p, n = rings[r].at(s)
        ee = np.interp(s, S[r], e[r])
        out_p += wgt * np.array([*(p + n * ee), zs[r]])
        out_n += wgt * np.array([*n, 0])
    return out_p, out_n / np.linalg.norm(out_n)


def new_bm():
    bm = bmesh.new()
    return bm, bm.loops.layers.uv.new("UVMap")


def grid_faces(bm, uvl, V, UV):
    """V, UV: (rows, cols, 3/2) -> quads; returns bmesh verts grid."""
    R_, C_ = V.shape[:2]
    vv = [[bm.verts.new(tuple(float(x) for x in V[i, j])) for j in range(C_)] for i in range(R_)]
    for i in range(R_ - 1):
        for j in range(C_ - 1):
            f = bm.faces.new((vv[i][j], vv[i + 1][j], vv[i + 1][j + 1], vv[i][j + 1]))
            for lp, (a, b) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                lp[uvl].uv = (float(UV[a, b][0]), float(UV[a, b][1]))
    return vv


def orient_outward(bm):
    bm.normal_update()
    score = 0.0
    for f in bm.faces:
        c = f.calc_center_median()
        loc, n, _, _ = bvh_body.find_nearest(c)
        if loc is not None:
            score += f.normal.dot((c - loc).normalized() if (c - loc).length > 1e-6 else n)
    if score < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
        bm.normal_update()


def finish_part(bm, name, thickness, orient=True):
    if orient:
        orient_outward(bm)
    m = bpy.data.meshes.new(name)
    bm.to_mesh(m)
    bm.free()
    o = bpy.data.objects.new(name, m)
    bpy.context.scene.collection.objects.link(o)
    if thickness > 0:
        sm = o.modifiers.new("Solidify", "SOLIDIFY")
        sm.thickness, sm.offset, sm.use_rim, sm.use_even_offset = thickness, 1.0, True, True
    dg = bpy.context.evaluated_depsgraph_get()
    out = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.meshes.remove(m)
    return out


parts = []
bm, uvl = new_bm()
UVA = np.stack([UC + S / SCALE, np.broadcast_to((V0 + (zs - Z_HEM) / SCALE)[:, None], S.shape)], -1)
grid_faces(bm, uvl, APRON_V, UVA)
flatV = [Vector(p) for p in APRON_V.reshape(-1, 3)]
flatF = [(i * N_COL + j, (i + 1) * N_COL + j, (i + 1) * N_COL + j + 1, i * N_COL + j + 1)
         for i in range(NR - 1) for j in range(N_COL - 1)]
bvh_apron = BVHTree.FromPolygons(flatV, flatF)
parts.append(finish_part(bm, "ApronPanel", T_APRON))


# ───────────────────────── straps ─────────────────────────
def push_out(p, d_body=0.0045, use_apron=False):
    p = Vector(p)
    if p.z > 1.45:  # collar / neck: the head turns, so keep more room
        d_body = max(d_body, 0.0085)
    for _ in range(4):
        loc, n, _, _ = bvh_body.find_nearest(p)
        if loc is None or (p - loc).dot(n) >= d_body - 1e-5:
            break
        p = loc + n * d_body
    if use_apron and p.z < Z_TOP - 0.002:
        loc, n, _, dist = bvh_apron.find_nearest(p)
        if loc is not None and dist < 0.04 and loc.z < Z_TOP - 0.001:
            if n.dot(Vector((loc.x, loc.y, 0))) < 0:
                n = -n
            if (p - loc).dot(n) < T_APRON + 0.0012:
                p = loc + n * (T_APRON + 0.0012)
    return p


def surf_normal(p, use_apron=False):
    if use_apron and p.z < Z_TOP - 0.002:
        loc, n, _, dist = bvh_apron.find_nearest(p)
        if loc is not None and dist < 0.012:
            return n if n.dot(Vector((loc.x, loc.y, 0))) >= 0 else -n
    loc, n, _, _ = bvh_body.find_nearest(p)
    return n


def resample_path(pts, n):
    P = np.array([tuple(p) for p in pts])
    cum = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
    s = np.linspace(0, cum[-1], n)
    return [Vector((np.interp(x, cum, P[:, 0]), np.interp(x, cum, P[:, 1]), np.interp(x, cum, P[:, 2]))) for x in s]


def ribbon(path, width, u0, uw, v0, v1, use_apron, normals=None):
    """Flat band along path (list of Vector), lying on the surface; returns (V, UV) grids of shape (len, 2)."""
    K = len(path)
    ns_ = normals or [surf_normal(p, use_apron) for p in path]
    sm = []
    for k in range(K):
        acc = Vector()
        for q in range(max(0, k - 2), min(K, k + 3)):
            acc += ns_[q]
        sm.append(acc.normalized())
    cum = [0.0]
    for k in range(1, K):
        cum.append(cum[-1] + (path[k] - path[k - 1]).length)
    V = np.zeros((K, 2, 3))
    UV = np.zeros((K, 2, 2))
    for k in range(K):
        t = (path[min(K - 1, k + 1)] - path[max(0, k - 1)]).normalized()
        b = t.cross(sm[k]).normalized()
        for c, sgn in enumerate((-0.5, 0.5)):
            q = path[k] + b * (sgn * width)
            q = push_out(q, 0.004, use_apron)
            V[k, c] = tuple(q)
            UV[k, c] = (u0 + c * uw, v0 + (v1 - v0) * cum[k] / cum[-1])
    return V, UV, cum[-1]


# neck strap: taut band from bib corner, over the collar/trapezius, round the back of the neck
A, An = apron_at(HW_TOP - 0.024, Z_TOP - 0.036)
A = Vector(A + An * (T_APRON + 0.0012))
hb = bvh_body.ray_cast(Vector((0, 0.6, 1.532)), Vector((0, -1, 0)))
B = hb[0] + Vector((0, 0.0045, 0))
ctrl_l = [A, Vector((A.x - 0.002, A.y + 0.004, Z_TOP + 0.012)), Vector((0.103, -0.075, 1.46)),
          Vector((0.094, -0.012, 1.528)), Vector((0.064, 0.06, 1.535)), B]
left = resample_path([push_out(p, use_apron=True) for p in ctrl_l], 34)
path = left + [Vector((-p.x, p.y, p.z)) for p in reversed(left[:-1])]
KC, KN = 33, len(path)
for it in range(500):
    new = list(path)
    for k in range(1, KN - 1):
        new[k] = path[k] + 0.5 * ((path[k - 1] + path[k + 1]) * 0.5 - path[k])
        if k == KC:  # back of the neck: only its height is held, so the band curves round smoothly
            new[k] = Vector((0.0, new[k].y, B.z))
    path = [push_out(p, 0.0045, True) for p in new]
    if it % 25 == 24:
        path = resample_path(path[:KC + 1], KC + 1)[:-1] + resample_path(path[KC:], KN - KC)
Vs, UVs, L_STRAP = ribbon(path, STRAP_W, UL0, ULW, 0.0, VL, True)
print("STRAP length", round(L_STRAP, 3), "back z", round(B.z, 3))
bm, uvl = new_bm()
grid_faces(bm, uvl, Vs, UVs)
parts.append(finish_part(bm, "NeckStrap", T_STRAP))

# waist ties: band round the back at the waist, from the apron's waist corners; knot + two tails at the back
z_tb = Z_FULL - 0.002
tie_rows = [z_tb - TIE_H * f for f in (0.0, 0.5, 1.0)]
corner_l, _ = apron_at(HW_S, Z_FULL - 0.006)
corner_r, _ = apron_at(-HW_S, Z_FULL - 0.006)
TV, TUV, tie_len = [], [], None
tie_rings = [Ring(offset_curve(hull2d(section(z)), 0.0015)) for z in tie_rows]
r0 = tie_rings[1]
s_cl = min(np.arange(0, r0.L / 2, 0.002), key=lambda s: np.linalg.norm(r0.at(s)[0] - corner_l[:2]))
s_cr = min(np.arange(r0.L / 2, r0.L, 0.002), key=lambda s: np.linalg.norm(r0.at(s)[0] - corner_r[:2]))
s_a, s_b = s_cl - 0.035, s_cr + 0.035
NT = int((s_b - s_a) / 0.01) + 1
ss = np.linspace(s_a, s_b, NT)


def tie_offset(s):
    over = min(s - s_cl, s_cr - s)  # distance beyond the apron edge (negative = on the apron)
    t = np.clip(over / 0.06, 0, 1)
    t = t * t * (3 - 2 * t)
    return 0.0125 * (1 - t) + 0.0055 * t


for r_, z in zip(tie_rings, tie_rows):
    row = []
    for s in ss:
        p, n = r_.at(s)
        q = push_out(Vector((*(p + n * tie_offset(s)), z)), 0.005, False)
        row.append(tuple(q))
    TV.append(row)
TV = np.array(TV).transpose(1, 0, 2)                      # (NT, 3, 3): along x across
cumt = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(TV[:, 1], axis=0), axis=1))])
L_TIE = cumt[-1]
TUV = np.zeros((NT, 3, 2))
for c in range(3):
    TUV[:, c, 0] = UW0 + UWW * c / 2
    TUV[:, c, 1] = V_TIE * cumt / L_TIE
bm, uvl = new_bm()
grid_faces(bm, uvl, TV, TUV)
parts.append(finish_part(bm, "WaistTie", T_TIE))
print("TIE length", round(L_TIE, 3))

# knot at the back centre
s_back = (r0.cross(front=False) - r0.s0) % r0.L
pk, nk = r0.at(s_back)
zk = tie_rows[1]
nk3 = Vector((nk[0], nk[1], 0)).normalized()
kc = Vector((pk[0], pk[1], zk)) + nk3 * (0.0055 + T_TIE + 0.009)
lat = Vector((0, 0, 1)).cross(nk3).normalized()
bm, uvl = new_bm()
bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1.0)
KW, KD, KH = 0.026, 0.0105, 0.017
for v in bm.verts:
    x, y, z = v.co
    v.co = kc + lat * (x * KW) + nk3 * (y * KD) + Vector((0, 0, z * KH))
for f in bm.faces:
    for lp in f.loops:
        loc = (lp.vert.co - kc)
        a = math.atan2(loc.dot(nk3) / KD, loc.dot(lat) / KW)
        h = np.clip(loc.z / KH, -1, 1)
        lp[uvl].uv = (UW0 + UWW * (0.5 + a / (2 * math.pi)) % UWW, V_KNOT0 + (V_KNOT1 - V_KNOT0) * (0.5 + 0.5 * h))
for f in bm.faces:
    f.smooth = True
parts.append(finish_part(bm, "Knot", 0, orient=False))

# tails hanging from the knot
for side, (dx_end, length) in ((1, (0.040, 0.215)), (-1, (0.026, 0.185))):
    pts, nrms = [], []
    y_top = None
    for k in range(13):
        t = k / 12
        z = zk - 0.006 - length * t
        x = kc.x + side * (0.006 + dx_end * t ** 1.3)
        hit = bvh_body.ray_cast(Vector((x, 0.6, z)), Vector((0, -1, 0)))
        yb = hit[0].y if hit[0] else kc.y
        nb_ = hit[1] if hit[0] else Vector((0, 1, 0))
        y_hang = kc.y - 0.004 - 0.12 * (length * t) if k else kc.y - 0.004
        y = max(yb + 0.0065, y_hang)
        pts.append(Vector((x, y, z)))
        nrms.append(Vector((nb_.x * 0.5, 1.0, 0)).normalized())
    V_, UV_, _ = ribbon(pts, 0.023, UW0, UWW, V_TAIL0, V_TAIL1, False, normals=nrms)
    bm, uvl = new_bm()
    grid_faces(bm, uvl, V_, UV_)
    parts.append(finish_part(bm, "Tail", T_TIE))

# ───────────────────────── merge, skin ─────────────────────────
bm = bmesh.new()
for m in parts:
    bm.from_mesh(m)
for m in parts:
    bpy.data.meshes.remove(m)
for f in bm.faces:
    f.smooth = True
apron_me = bpy.data.meshes.new("Apron")
bm.to_mesh(apron_me)
bm.free()
try:
    apron_me.set_sharp_from_angle(angle=math.radians(45))
except Exception as ex:
    print("WARN sharp edges:", ex)

AV = np.empty(len(apron_me.vertices) * 3)
apron_me.vertices.foreach_get("co", AV)
AV = AV.reshape(-1, 3)
WA = np.zeros((len(AV), len(gnames)))
for i, p in enumerate(AV):
    loc, n, fi, _ = bvh_torso.find_nearest(Vector(p))
    poly = torso_polys[fi]
    bw = poly_3d_calc([vw[k] for k in poly], loc)
    for k, wv in zip(poly, bw):
        WA[i] += wv * W[k]
for side in ("L", "R"):
    if f"Bip01 {side} Calf" in gnames and f"Bip01 {side} Thigh" in gnames:
        c_, t_ = gnames.index(f"Bip01 {side} Calf"), gnames.index(f"Bip01 {side} Thigh")
        WA[:, t_] += WA[:, c_]
        WA[:, c_] = 0
edges = np.array([e.vertices[:] for e in apron_me.edges])
deg = np.bincount(edges.ravel(), minlength=len(AV)).astype(float)
for it in range(20):
    acc = np.zeros_like(WA)
    np.add.at(acc, edges[:, 0], WA[edges[:, 1]])
    np.add.at(acc, edges[:, 1], WA[edges[:, 0]])
    nb_avg = acc / np.maximum(deg, 1)[:, None]
    WA = np.where(deg[:, None] > 0, 0.5 * WA + 0.5 * nb_avg, WA)
top = np.argsort(-WA, axis=1)[:, :4]
WL = np.zeros_like(WA)
rows_ = np.arange(len(WA))[:, None]
WL[rows_, top] = WA[rows_, top]
WL[WL < 0.02] = 0
WL /= WL.sum(1, keepdims=True)

apron_me.transform(body.matrix_world.inverted())
apron = bpy.data.objects.new("Apron", apron_me)
for c in body.users_collection:
    c.objects.link(apron)
apron.parent = rig
apron.parent_type = body.parent_type
apron.matrix_parent_inverse = body.matrix_parent_inverse.copy()
apron.matrix_basis = body.matrix_basis.copy()
used = np.nonzero(WL.sum(0) > 0)[0]
for g in used:
    vg = apron.vertex_groups.new(name=gnames[g])
    idx = np.nonzero(WL[:, g])[0]
    for i in idx:
        vg.add([int(i)], float(WL[i, g]), "REPLACE")
am = apron.modifiers.new("Armature", "ARMATURE")
am.object = rig
print("APRON verts", len(apron_me.vertices), "faces", len(apron_me.polygons), "groups", [gnames[g] for g in used])


# ───────────────────────── texture atlas ─────────────────────────
def vnoise(R, cells, rng):
    g = rng.standard_normal((cells + 2, cells + 2))
    x = np.linspace(0, cells, R, endpoint=False)
    xi = x.astype(int)
    xf = x - xi
    xf = xf * xf * (3 - 2 * xf)
    rows = g[:, xi] * (1 - xf) + g[:, xi + 1] * xf
    out = rows[xi, :] * (1 - xf)[:, None] + rows[xi + 1, :] * xf[:, None]
    return out / out.std()


def smooth1d(x):
    for _ in range(2):
        x = np.convolve(np.concatenate([x[:1], x, x[-1:]]), [0.25, 0.5, 0.25], "valid")
    return x / max(1e-6, x.std())


def sstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


R = TEX
rng = np.random.default_rng(11)
px = (np.arange(R) + 0.5) / R
U, V = np.meshgrid(px, px)          # row 0 = bottom (v=0), as Blender stores pixels
ii, jj = np.indices((R, R))
col = np.zeros((R, R, 3))
hgt = np.zeros((R, R))
du = np.full((R, R), SCALE / R)
dv = np.full((R, R), SCALE / R)
checker = ((ii + jj) % 2) * 2 - 1.0

# canvas everywhere (also the gutters, so mip-maps bleed the right colour)
F = 1 + 0.045 * vnoise(R, 5, rng) + 0.03 * vnoise(R, 17, rng) + 0.02 * vnoise(R, 55, rng)
F += 0.007 * rng.standard_normal(R)[:, None] + 0.006 * rng.standard_normal(R)[None, :]
F += 0.01 * checker + rng.normal(0, 0.016, (R, R))
col[:] = CANVAS * F[..., None]
hgt += 0.00004 * checker + 0.00003 * rng.standard_normal((R, R))

s_px = (U - UC) * SCALE
z_px = Z_HEM + (V - V0) * SCALE
zs_asc, hw_asc = zs[::-1], HWR[::-1]
hwz = np.interp(z_px, zs_asc, hw_asc)
inside = (U < 0.80) & (np.abs(s_px) <= hwz) & (z_px >= Z_HEM) & (z_px <= Z_TOP)
zl = np.linspace(Z_HEM, Z_TOP, 1000)
left = np.stack([-np.interp(zl, zs_asc, hw_asc), zl], 1)
topl = np.stack([np.linspace(-HWR[0], HWR[0], 220), np.full(220, Z_TOP)], 1)
heml = np.stack([np.linspace(HW_S, -HW_S, 450), np.full(450, Z_HEM)], 1)
outline = np.concatenate([left, topl, left[::-1] * [-1, 1], heml])
ocum = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(outline, axis=0), axis=1))])
near = inside & ((np.abs(s_px) > hwz - 0.03) | (z_px < Z_HEM + 0.03) | (z_px > Z_TOP - 0.03))
idx = np.nonzero(near)
pts = np.stack([s_px[idx], z_px[idx]], 1)
D = np.full((R, R), 1.0)
AL = np.zeros((R, R))
dd, aa = np.empty(len(pts)), np.empty(len(pts))
for c0 in range(0, len(pts), 2048):
    q = pts[c0:c0 + 2048]
    dist = np.linalg.norm(q[:, None, :] - outline[None], axis=-1)
    a = dist.argmin(1)
    dd[c0:c0 + 2048] = dist[np.arange(len(q)), a]
    aa[c0:c0 + 2048] = ocum[a]
D[idx], AL[idx] = dd, aa
hem = inside & (D < 0.014)
col[hem] *= 0.88
col[inside & (D < 0.0022)] *= 1.14
hgt += np.where(inside, 0.0006 * (1 - sstep(0.011, 0.0145, D)), 0)
hgt = np.where(inside & (D < 0.002), hgt * D / 0.002, hgt)
st = inside & (np.abs(D - 0.0085) < 0.0009) & (np.mod(AL, 0.0052) < 0.0037)
col[st] = col[st] * 0.15 + THREAD * 0.85
hgt[st] -= 0.0003


def stitch_line(mask, along, w=0.0009):
    m = mask & (np.mod(along, 0.0052) < 0.0037)
    col[m] = col[m] * 0.15 + THREAD * 0.85
    hgt[m] -= 0.0003


def rivet(cs, cz, r=0.0036):
    rr = np.sqrt((s_px - cs) ** 2 + (z_px - cz) ** 2) / r
    m = (rr < 1) & (U < 0.80)
    shade = 1 + 0.45 * ((-(s_px - cs) + (z_px - cz)) / r) * 0.5
    shade = np.where(rr > 0.72, shade * 0.62, shade)
    col[m] = (COPPER * shade[m][:, None]).clip(0, 1)
    hgt[m] += 0.0011 * np.sqrt(np.clip(1 - rr[m] ** 2, 0, 1))


def pocket(s0, s1, z0, z1, dividers):
    ins = (s_px > s0) & (s_px < s1) & (z_px > z0) & (z_px < z1) & (U < 0.80)
    dside = np.minimum(s_px - s0, s1 - s_px)
    dtop, dbot = z1 - z_px, z_px - z0
    dedge = np.minimum(np.minimum(dside, dbot), dtop)
    # soft contact shadow outside the sides and bottom
    outs = (~ins) & (U < 0.80) & (s_px > s0 - 0.005) & (s_px < s1 + 0.005) & (z_px > z0 - 0.005) & (z_px < z1)
    dout = np.maximum(np.maximum(s0 - s_px, s_px - s1), z0 - z_px)
    col[outs] *= (0.80 + 0.20 * sstep(0, 0.005, dout[outs]))[:, None]
    col[ins] *= 0.97
    tb = ins & (dtop < 0.013)
    col[tb] *= 0.9
    col[ins & (dtop < 0.0018)] *= 1.18
    col[ins & (dedge < 0.0015) & (dtop >= 0.0018)] *= 1.08
    hgt[ins] += (0.0007 * sstep(0, 0.0018, dedge) + 0.00035 * (dtop < 0.013))[ins]
    stitch_line(ins & (np.abs(dside - 0.0035) < 0.0009) & (dtop > 0.0035), z_px)
    stitch_line(ins & (np.abs(dbot - 0.0035) < 0.0009) & (dside > 0.0035), s_px)
    stitch_line(ins & (np.abs(dtop - 0.0095) < 0.0009) & (dside > 0.0035), s_px)
    for sd in dividers:
        for off in (-0.0013, 0.0013):
            stitch_line(ins & (np.abs(s_px - sd - off) < 0.0008) & (dtop > 0.013) & (dbot > 0.0035), z_px)
    for cs in [s0 + 0.0065, s1 - 0.0065] + list(dividers):
        rivet(cs, z1 - 0.0065)


pocket(0.016, 0.106, 1.212, 1.308, [0.044])           # chest pen / thermometer pocket on his left
pocket(-0.215, 0.215, 0.70, 0.866, [0.0, 0.152])      # wide hip pocket

# leather strip: cognac, burnished dark edges, two rows of stitching, copper rivets at both ends
a = (U - UL0) / ULW
reg = (a >= 0) & (a <= 1) & (V <= VL + 0.004)
lm = V / VL * L_STRAP
Fl = 1 + 0.06 * vnoise(R, 12, rng) + 0.03 * vnoise(R, 70, rng) + rng.normal(0, 0.025, (R, R))
col[reg] = (LEATHER * Fl[..., None])[reg]
edge = reg & ((a < 0.1) | (a > 0.9))
col[edge] *= 0.6
hgt[reg] = (0.0008 * (1 - (2 * a - 1) ** 6))[reg]
for ac in (0.2, 0.8):
    m = reg & (np.abs(a - ac) < 1.1 / (ULW * R)) & (np.mod(lm, 0.0052) < 0.0036)
    col[m] = col[m] * 0.1 + THREAD * 0.9
    hgt[m] -= 0.0003
for lc in (0.017, L_STRAP - 0.017):
    rr = np.sqrt(((a - 0.5) * STRAP_W) ** 2 + (lm - lc) ** 2) / 0.0045
    m = reg & (rr < 1)
    shade = np.where(rr > 0.72, 0.62, 1 + 0.25 * ((-(a - 0.5) * STRAP_W + (lm - lc)) / 0.0045))
    col[m] = (COPPER * shade[m][:, None]).clip(0, 1)
    hgt[m] += (0.0012 * np.sqrt(np.clip(1 - rr ** 2, 0, 1)))[m]
du[reg] = STRAP_W / (ULW * R)
dv[reg] = L_STRAP / (VL * R)

# webbing strip: cotton twill tape
a = (U - UW0) / UWW
reg = (a >= 0) & (a <= 1)
Fw = 1 + 0.05 * np.sin(2 * np.pi * (ii + jj) / 3.0) + 0.03 * vnoise(R, 20, rng) + rng.normal(0, 0.02, (R, R))
col[reg] = (WEBBING * Fw[..., None])[reg]
col[reg & ((a < 0.07) | (a > 0.93))] *= 0.82
hgt[reg] = (0.0004 * (1 - (2 * a - 1) ** 8) + 0.00008 * np.sin(2 * np.pi * (ii + jj) / 3.0))[reg]
du[reg] = TIE_H / (UWW * R)
dv[reg] = L_TIE / (V_TIE * R)

col = col.clip(0, 1)


def save_image(arr, name, fmt, noncolor=False):
    h_, w_ = arr.shape[:2]
    img = bpy.data.images.new(name, w_, h_, alpha=False)
    rgba = np.concatenate([arr, np.ones((h_, w_, 1))], -1)
    img.pixels.foreach_set(rgba.ravel().astype(np.float32))
    ext = "jpg" if fmt == "JPEG" else "png"
    path = os.path.join(WORK, f"{name}.{ext}")
    img.filepath_raw = path
    img.file_format = fmt
    img.save(filepath=path, quality=90) if fmt == "JPEG" else img.save(filepath=path)
    bpy.data.images.remove(img)
    out = bpy.data.images.load(path)
    if noncolor:
        out.colorspace_settings.name = "Non-Color"
    return out


col_img = save_image(col, NAME + "_Apron_color", "JPEG")
mat = bpy.data.materials.new(NAME + "_Apron")
try:
    mat.use_nodes = True
except Exception:
    pass
nt = mat.node_tree
bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
t = nt.nodes.new("ShaderNodeTexImage")
t.image = col_img
nt.links.new(t.outputs["Color"], bsdf.inputs["Base Color"])
if USE_NORMAL:
    gx = (np.roll(hgt, -1, 1) - np.roll(hgt, 1, 1)) / (2 * du)
    gy = (np.roll(hgt, -1, 0) - np.roll(hgt, 1, 0)) / (2 * dv)
    gx, gy = gx.clip(-1.5, 1.5), gy.clip(-1.5, 1.5)
    nmap = np.stack([-gx, -gy, np.ones_like(gx)], -1)
    nmap /= np.linalg.norm(nmap, axis=-1, keepdims=True)
    nrm_img = save_image(nmap * 0.5 + 0.5, NAME + "_Apron_normal", "PNG", True)
    tn = nt.nodes.new("ShaderNodeTexImage")
    tn.image = nrm_img
    nmn = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(tn.outputs["Color"], nmn.inputs["Color"])
    nt.links.new(nmn.outputs["Normal"], bsdf.inputs["Normal"])
bsdf.inputs["Roughness"].default_value = 0.74
bsdf.inputs["Metallic"].default_value = 0.0
apron_me.materials.append(mat)

# ───────────────────────── export ─────────────────────────
rig.data.pose_position = "POSE"
for pb in rig.pose.bones:
    pb.location, pb.rotation_quaternion, pb.rotation_euler, pb.scale = (0, 0, 0), (1, 0, 0, 0), (0, 0, 0), (1, 1, 1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, "avatar_apron.blend"))
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_animation_mode="NLA_TRACKS",
                          export_optimize_animation_size=True, export_force_sampling=True, export_frame_step=STEP,
                          export_morph=True, export_morph_normal=False, export_morph_animation=False,
                          export_skins=True, export_image_format="AUTO", export_yup=True)
print("WROTE", OUT, os.path.getsize(OUT))
