# Blender: two seated people facing each other across the café's CafeTable (real project meshes), each on a
# LeatherChair that moves with them; checks person-vs-person and person-vs-furniture penetration across frames
# and writes a contact sheet (side, top-down under the table, customer view).
#   blender --background --python rb_pair_test.py -- out.png "A.glb@fwd@up@sy@lat" "B.glb@fwd@up@sy@lat" clip:frame [clip:frame ...]
# A sits on the -Y side facing +Y, B on the +Y side facing -Y. lat = toward the person's own right.
import bpy, sys, os, math, json
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index("--") + 1:]
out, specA, specB, shots = argv[0], argv[1], argv[2], argv[3:]
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MESHES = os.path.join(ROOT, "Assets", "GeneratedMeshes")

def parse(spec):
    # path may contain a drive colon: take the last four fields as numbers
    # "path@fwd@up@sy@lat[@angle]" — angle (deg) turns the seat around the table (0 = -Y side, 180 = opposite, 90 = corner)
    parts = spec.split("@")
    # optional 7th field: yaw (deg) of chair+person about the chair origin (e.g. F02's -15)
    k = 6 if len(parts) >= 7 else 5 if len(parts) >= 6 else 4
    nums = [float(x) for x in parts[-k:]]
    while len(nums) < 6:
        nums.append(None)
    return "@".join(parts[:-k]), nums

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    return new, [o for o in new if o.parent is None or o.parent not in new]

table_objs, _ = import_glb(os.path.join(MESHES, "CafeTable.glb"))
people = []
for side, spec in ((-1, specA), (1, specB)):
    path, (fwd, up, sy, lat, ang, yaw) = parse(spec)
    if ang is None:
        ang = 0 if side < 0 else 180
    seat = Matrix.Rotation(math.radians(ang), 4, "Z")             # seat frame: angle 0 sits on -Y facing +Y
    right = seat @ Vector((1, 0, 0))                              # along the table edge, to the person's right
    face = Matrix.Rotation(math.radians(ang + (yaw or 0)), 4, "Z")  # chair and person may be turned about the chair origin
    chair_objs, chair_roots = import_glb(os.path.join(MESHES, "LeatherChair.glb"))
    base = seat @ Vector((0, -0.50, 0)) + right * (lat / 100)
    for r in chair_roots:
        r.matrix_world = Matrix.Translation(base) @ face @ Matrix.Diagonal((1, 1, sy, 1)) @ r.matrix_world
    acts0 = set(bpy.data.actions)
    objs, roots = import_glb(path)
    acts = {a.name.split(".")[0]: a for a in bpy.data.actions if a not in acts0}
    fwd_dir = face @ Vector((0, 1, 0))
    for r in roots:
        r.matrix_world = Matrix.Translation(base + fwd_dir * (fwd / 100) + Vector((0, 0, up / 100))) @ face @ Matrix.Rotation(math.pi, 4, "Z") @ r.matrix_world
    rig = next(o for o in objs if o.type == "ARMATURE")
    people.append({"name": os.path.basename(path), "objs": objs, "rig": rig, "chair": chair_objs, "acts": acts})

def set_frame(clip, frame):
    for p in people:
        a = p["acts"][clip]
        p["rig"].animation_data_create()
        p["rig"].animation_data.action = a
        try:
            if p["rig"].animation_data.action_slot is None and len(a.slots):
                p["rig"].animation_data.action_slot = a.slots[0]
        except AttributeError:
            pass
    sc.frame_set(frame)
    bpy.context.view_layer.update()

def world_tris(objs, dg):
    verts, tris = [], []
    for o in objs:
        if o.type != "MESH":
            continue
        ev = o.evaluated_get(dg); me = ev.to_mesh(); me.calc_loop_triangles()
        base = len(verts); mw = ev.matrix_world
        verts += [mw @ v.co for v in me.vertices]
        tris += [tuple(base + i for i in t.vertices) for t in me.loop_triangles]
        ev.to_mesh_clear()
    return verts, tris

def inside_count(tree, pts, tol=0.01):
    n = 0
    for p in pts:
        loc, nrm, i, d = tree.find_nearest(p)
        if loc is not None and d is not None and d < 0.08 and (p - loc).dot(nrm) < -tol:
            n += 1
    return n

results = []
for s in shots:
    clip, frame = s.split(":")[0], int(s.split(":")[1])
    set_frame(clip, frame)
    dg = bpy.context.evaluated_depsgraph_get()
    geo = {}
    for p in people:
        v, t = world_tris(p["objs"], dg)
        cv, ct = world_tris(p["chair"], dg)
        geo[p["name"]] = (v, BVHTree.FromPolygons(v, t), BVHTree.FromPolygons(cv, ct))
    tv, tt = world_tris(table_objs, dg)
    ttree = BVHTree.FromPolygons(tv, tt)
    (na, (va, ta, ca)), (nb, (vb, tb, cb)) = list(geo.items())
    r = {"shot": s,
         "A_in_B": inside_count(tb, va), "B_in_A": inside_count(ta, vb),
         "A_in_table": inside_count(ttree, va), "B_in_table": inside_count(ttree, vb),
         "A_in_Bchair": inside_count(cb, va), "B_in_Achair": inside_count(ca, vb),
         "overlap_pairs": len(ta.overlap(tb))}
    results.append(r)
print("PAIRJSON " + json.dumps(results))

# sheet at the first shot
set_frame(shots[0].split(":")[0], int(shots[0].split(":")[1]))
sc.render.engine = "BLENDER_EEVEE"
sc.render.resolution_x, sc.render.resolution_y = 640, 640
sc.view_settings.view_transform = "Standard"
world = bpy.data.worlds.new("W"); sc.world = world
try:
    world.use_nodes = True
except Exception:
    pass
world.node_tree.nodes.get("Background").inputs[0].default_value = (0.36, 0.33, 0.30, 1)
for name, e, loc in (("Key", 300, (1.6, 0.8, 2.6)), ("Fill", 150, (-1.8, -1.2, 2.0))):
    d = bpy.data.lights.new(name, "AREA"); d.energy = e; d.size = 1.5
    o = bpy.data.objects.new(name, d); sc.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector((0, 0, 0.6)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
cam_d = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_d); sc.collection.objects.link(cam); sc.camera = cam
tmp = os.path.join(os.path.dirname(os.path.abspath(out)), "_pair_tmp.png")
def render(eye, target, fov, ortho=None):
    cam.location = eye
    cam.rotation_euler = (Vector(target) - Vector(eye)).to_track_quat("-Z", "Y").to_euler()
    if ortho:
        cam_d.type = "ORTHO"; cam_d.ortho_scale = ortho
    else:
        cam_d.type = "PERSP"; cam_d.angle = math.radians(fov)
    sc.render.filepath = tmp
    bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(tmp)
    px = np.array(im.pixels[:]).reshape(im.size[1], im.size[0], 4)
    bpy.data.images.remove(im)
    return px
# hide the table top for the under-table view
views = [render((2.6, 0, 0.9), (0, 0, 0.6), 40),
         render((0, 0, -3), (0, 0, 0), 0, ortho=1.6),            # from below the floor... floor-less: legs and feet layout
         render((2.2, 2.4, 1.6), (0, 0, 0.7), 40)]
sheet = np.concatenate(views, axis=1)
im = bpy.data.images.new("sheet", sheet.shape[1], sheet.shape[0]); im.pixels = sheet.ravel()
im.filepath_raw = out; im.file_format = "PNG"; im.save(); os.remove(tmp)
print("SHEET", out)
