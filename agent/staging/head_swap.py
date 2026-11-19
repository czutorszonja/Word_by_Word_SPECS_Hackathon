# Blender: put a separately generated head (bust GLB, much more face detail) on a full-body GLB.
# The body's head is cut off at the neck, the bust is cut below the neck, scaled and aligned.
#   blender --background --python head_swap.py -- body.glb bust.glb out.glb [headLenFrac=0.155] [weld=0.0008]
import bpy, bmesh, sys, mathutils
argv = sys.argv[sys.argv.index("--") + 1:]
body_p, bust_p, out_p = argv[0], argv[1], argv[2]
head_frac = float(argv[3]) if len(argv) > 3 else 0.155
weld = float(argv[4]) if len(argv) > 4 else 0.0008
bpy.ops.wm.read_factory_settings(use_empty=True)


def load(path, tag):
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    objs = [o for o in bpy.context.scene.objects if o not in before and o.type == "MESH"]
    for o in objs:
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        o.select_set(False)
        o.name = tag
    return objs


def verts(objs):
    return [o.matrix_world @ v.co for o in objs for v in o.data.vertices]


def neck(objs, lo, hi):
    """narrowest x-width slice between lo..hi (fractions of height); returns z, centre x, centre y, radius, zmin, zmax"""
    vs = verts(objs)
    zmin = min(v.z for v in vs); zmax = max(v.z for v in vs); H = zmax - zmin
    best = None
    n = 60
    for i in range(n):
        z0 = zmin + H * (lo + (hi - lo) * i / n)
        sl = [v for v in vs if z0 <= v.z < z0 + H * 0.012]
        if len(sl) < 8:
            continue
        w = max(v.x for v in sl) - min(v.x for v in sl)
        if best is None or w < best[0]:
            cx = (max(v.x for v in sl) + min(v.x for v in sl)) / 2
            cy = (max(v.y for v in sl) + min(v.y for v in sl)) / 2
            best = (w, z0, cx, cy)
    w, z, cx, cy = best
    return z, cx, cy, w / 2, zmin, zmax


body = load(body_p, "Body")
bust = load(bust_p, "Head")
bz, bcx, bcy, br, bmin, bmax = neck(body, 0.80, 0.90)
hz, hcx, hcy, hr, hmin, hmax = neck(bust, 0.25, 0.60)
H = bmax - bmin
s = (H * head_frac) / (hmax - hz)
print("NECK body z=%.3f r=%.3f top=%.3f | bust z=%.3f r=%.3f top=%.3f | scale %.3f" % (bz, br, bmax, hz, hr, hmax, s))

# cut the body's head off (keep collar and shoulders)
for o in body:
    bm = bmesh.new(); bm.from_mesh(o.data)
    kill = [f for f in bm.faces if (o.matrix_world @ f.calc_center_median()).z > bz + 0.004]
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    bm.to_mesh(o.data); bm.free()

# cut the bust: keep the head, and below the neck line only the neck column (no collar/shoulders)
keep_below = 0.045 / s
for o in bust:
    bm = bmesh.new(); bm.from_mesh(o.data)
    kill = []
    for f in bm.faces:
        c = o.matrix_world @ f.calc_center_median()
        if c.z < hz - keep_below:
            kill.append(f)
        elif c.z < hz:
            if ((c.x - hcx) ** 2 + (c.y - hcy) ** 2) ** 0.5 > hr * 1.2:
                kill.append(f)
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    bm.to_mesh(o.data); bm.free()
    # scale about the neck point, then move the neck onto the body's neck
    o.matrix_world = (mathutils.Matrix.Translation((bcx, bcy, bz)) @ mathutils.Matrix.Scale(s, 4)
                      @ mathutils.Matrix.Translation((-hcx, -hcy, -hz)))
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    o.select_set(False)

for img in bpy.data.images:
    w, h = img.size
    if max(w, h) > 2048:
        k = 2048 / max(w, h)
        img.scale(int(w * k), int(h * k))
for o in body + bust:
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=weld)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data); bm.free()
    for p in o.data.polygons:
        p.use_smooth = True
vs = verts(body + bust)
print("RESULT height %.3f faces %d" % (max(v.z for v in vs) - min(v.z for v in vs), sum(len(o.data.polygons) for o in body + bust)))
bpy.ops.export_scene.gltf(filepath=out_p, export_format="GLB", export_image_format="JPEG")
