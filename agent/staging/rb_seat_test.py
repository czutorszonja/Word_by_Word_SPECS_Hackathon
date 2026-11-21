# Blender: seat a rigged person GLB on the café's LeatherChair at the CafeTable (the real project meshes)
# and check it: penetration counts, buttock/seat and hand/table gaps, plus a contact sheet
# (side, customer view from standing height, across-the-table view, face close-up three-quarter).
#   blender --background --python rb_seat_test.py -- person.glb out.png clip:frame fwd_cm up_cm chair_scale_y [lat_cm]
# fwd_cm: pelvis distance in front of the chair origin (toward the table); up_cm: lift of the whole person;
# chair_scale_y: vertical scale of the chair (1 = as in the café); lat_cm: sideways shift along the table edge.
# Layout (Blender, Z up, metres): table centre at the origin, chair origin 0.50 m away on -Y, facing +Y.
import bpy, sys, os, math, json
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index("--") + 1:]
glb, out, shot = argv[0], argv[1], argv[2]
fwd, up, chair_sy = float(argv[3]) / 100, float(argv[4]) / 100, float(argv[5])
lat = float(argv[6]) / 100 if len(argv) > 6 else 0.0
clip, frame = shot.split(":")[0], int(shot.split(":")[1])
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MESHES = os.path.join(ROOT, "Assets", "GeneratedMeshes")

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    roots = [o for o in new if o.parent is None or o.parent not in new]
    return new, roots

table_objs, table_roots = import_glb(os.path.join(MESHES, "CafeTable.glb"))
chair_objs, chair_roots = import_glb(os.path.join(MESHES, "LeatherChair.glb"))
# compose with each root's own transform (glTF roots carry their own offset/rotation — never overwrite it)
for r in chair_roots:
    r.matrix_world = Matrix.Translation((0, -0.50, 0)) @ Matrix.Diagonal((1, 1, chair_sy, 1)) @ r.matrix_world
person_objs, person_roots = import_glb(glb)
rig = next(o for o in person_objs if o.type == "ARMATURE")
body = [o for o in person_objs if o.type == "MESH"]
# the avatar faces -Y as imported; turn it to face +Y (the table) and move the pelvis over the seat
for r in person_roots:
    r.matrix_world = Matrix.Translation((lat, -0.50 + fwd, up)) @ Matrix.Rotation(math.pi, 4, "Z") @ r.matrix_world

act = next(a for a in bpy.data.actions if a.name == clip or a.name.endswith(clip) or a.name.startswith(clip))
rig.animation_data_create()
rig.animation_data.action = act
try:
    if rig.animation_data.action_slot is None and len(act.slots):
        rig.animation_data.action_slot = act.slots[0]
except AttributeError:
    pass
sc.frame_set(frame)
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()

def world_tris(objs):
    verts, tris = [], []
    for o in objs:
        if o.type != "MESH":
            continue
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        me.calc_loop_triangles()
        base = len(verts)
        mw = ev.matrix_world
        verts += [mw @ v.co for v in me.vertices]
        tris += [tuple(base + i for i in t.vertices) for t in me.loop_triangles]
        ev.to_mesh_clear()
    return verts, tris

def bvh(objs):
    v, t = world_tris(objs)
    return BVHTree.FromPolygons(v, t), v

table_bvh, table_v = bvh(table_objs)
chair_bvh, chair_v = bvh(chair_objs)
pv, _ = world_tris(body)

# bone of each person vertex (largest weight), to name the body part that touches or penetrates
groups = {}
for o in body:
    for vg in o.vertex_groups:
        groups[(o.name, vg.index)] = vg.name
part_of = []
for o in body:
    for v in o.data.vertices:
        best = max(v.groups, key=lambda g: g.weight, default=None)
        part_of.append(groups.get((o.name, best.group), "?") if best else "?")

def inside(tree, p, tol=0.01):
    loc, n, i, d = tree.find_nearest(p)
    if loc is None or d is None or d > 0.08:
        return False
    return (p - loc).dot(n) < -tol

res = {"clip": shot, "fwd_cm": fwd * 100, "up_cm": up * 100, "chair_scale_y": chair_sy, "lat_cm": lat * 100}
for name, tree in (("table", table_bvh), ("chair", chair_bvh)):
    hits = {}
    for p, part in zip(pv, part_of):
        if inside(tree, p):
            key = part.replace("Bip01 ", "")
            hits[key] = hits.get(key, 0) + 1
    res[f"inside_{name}"] = dict(sorted(hits.items(), key=lambda kv: -kv[1])[:8])

tz = max(v.z for v in table_v)
seat_pts = [v for v in chair_v if abs(v.x) < 0.18 and -0.50 - 0.10 < v.y < -0.50 + 0.25 and v.z < 0.7]
seat_z = max(v.z for v in seat_pts) if seat_pts else None
butt = [p for p, part in zip(pv, part_of) if ("Pelvis" in part or "Thigh" in part) and abs(p.x - lat) < 0.18 and -0.65 < p.y < -0.30]
hands = [p for p, part in zip(pv, part_of) if "Hand" in part or "Finger" in part]
res["table_top_cm"] = round(tz * 100, 1)
res["seat_top_cm"] = round(seat_z * 100, 1) if seat_z else None
res["butt_low_cm"] = round(min(p.z for p in butt) * 100, 1) if butt else None
res["hand_low_cm"] = round(min(p.z for p in hands) * 100, 1) if hands else None
res["hand_min_dist_from_table_centre_cm"] = round(min(math.hypot(p.x, p.y) for p in hands) * 100, 1) if hands else None
res["hand_max_dist_from_table_centre_cm"] = round(max(math.hypot(p.x, p.y) for p in hands if p.z < tz + 0.06) * 100, 1) if hands else None
head = rig.matrix_world @ rig.pose.bones["Bip01 Head"].head
res["head_height_cm"] = round(head.z * 100, 1)
knees = [rig.matrix_world @ rig.pose.bones[b].head for b in ("Bip01 L Calf", "Bip01 R Calf") if b in rig.pose.bones]
res["knees_y_cm"] = [round(k.y * 100, 1) for k in knees]  # > pelvis y means the knees point at the table
res["pelvis_y_cm"] = round((rig.matrix_world @ rig.pose.bones["Bip01 Pelvis"].head).y * 100, 1)
print("SEATJSON " + json.dumps(res))

# ── renders ──
sc.render.engine = "BLENDER_EEVEE"
sc.render.resolution_x, sc.render.resolution_y = 640, 640
sc.view_settings.view_transform = "Standard"
world = bpy.data.worlds.new("W"); sc.world = world
try:
    world.use_nodes = True
except Exception:
    pass
bg = world.node_tree.nodes.get("Background")
bg.inputs[0].default_value = (0.36, 0.33, 0.30, 1); bg.inputs[1].default_value = 0.7
floor = bpy.data.meshes.new("Floor"); fo = bpy.data.objects.new("Floor", floor); sc.collection.objects.link(fo)
floor.from_pydata([(-3, -3, 0), (3, -3, 0), (3, 3, 0), (-3, 3, 0)], [], [(0, 1, 2, 3)])

def light(name, energy, loc, color):
    d = bpy.data.lights.new(name, "AREA"); d.energy = energy; d.color = color; d.size = 1.5
    o = bpy.data.objects.new(name, d); sc.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector((0, -0.4, 0.9)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
light("Key", 260, (1.6, 0.8, 2.6), (1.0, 0.92, 0.82))
light("Fill", 120, (-1.8, -1.2, 2.0), (0.85, 0.9, 1.0))
cam_d = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_d); sc.collection.objects.link(cam); sc.camera = cam
tmp = os.path.join(os.path.dirname(os.path.abspath(out)), "_seat_tmp.png")

def render(eye, target, fov):
    cam.location = eye
    cam.rotation_euler = (Vector(target) - Vector(eye)).to_track_quat("-Z", "Y").to_euler()
    cam_d.angle = math.radians(fov)
    sc.render.filepath = tmp
    bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(tmp)
    px = np.array(im.pixels[:]).reshape(im.size[1], im.size[0], 4)
    bpy.data.images.remove(im)
    return px

pel = Vector((lat, -0.50 + fwd, 0.62 + up))
hz = head.z
views = [
    render((2.3 + lat, pel.y, 0.85), (lat, pel.y + 0.15, 0.62), 32),                       # side: contact with seat and table
    render((2.0, 2.3, 1.60), (lat, pel.y + 0.2, 0.75), 40),                                 # customer standing ~3 m away
    render((lat, 0.75, 1.20), (lat, pel.y, hz - 0.15), 40),                                 # across the table
    render((head.x + 0.95, head.y + 1.15, hz + 0.05), (head.x, head.y, hz + 0.02), 12),    # face, three-quarter
]
sheet = np.concatenate(views, axis=1)
im = bpy.data.images.new("sheet", sheet.shape[1], sheet.shape[0])
im.pixels = sheet.ravel()
im.filepath_raw = out; im.file_format = "PNG"; im.save()
os.remove(tmp)
print("SHEET", out)
