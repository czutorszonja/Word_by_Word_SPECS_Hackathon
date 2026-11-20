# Blender: sanity renders of a rigged avatar GLB (front + three-quarter, full figure + head close-up)
# at chosen animation frames, assembled into one contact sheet.
#   blender --background --python rb_render.py -- in.glb out.png clip:frame [clip:frame ...]
import bpy, sys, os, math
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
glb, out = argv[0], argv[1]
shots = [(s.split(":")[0], int(s.split(":")[1])) for s in argv[2:]] or [("idle", 1)]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
sc = bpy.context.scene
sc.render.engine = "BLENDER_EEVEE"
sc.render.resolution_x = sc.render.resolution_y = 512
sc.render.film_transparent = False
sc.view_settings.view_transform = "Standard"
world = bpy.data.worlds.new("W"); sc.world = world
try:
    world.use_nodes = True
except Exception:
    pass
bg = world.node_tree.nodes.get("Background")
bg.inputs[0].default_value = (0.42, 0.40, 0.37, 1); bg.inputs[1].default_value = 0.6

def light(name, kind, energy, loc, color):
    d = bpy.data.lights.new(name, kind); d.energy = energy; d.color = color
    if kind == "AREA":
        d.size = 1.2
    o = bpy.data.objects.new(name, d); sc.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector((0, 0, 1.55)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
light("Key", "AREA", 220, (1.2, -2.0, 2.4), (1.0, 0.92, 0.82))
light("Fill", "AREA", 90, (-1.6, -1.6, 1.8), (0.85, 0.9, 1.0))

cam_d = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_d); sc.collection.objects.link(cam); sc.camera = cam
acts = {a.name: a for a in bpy.data.actions}
print("ACTIONS", list(acts))

def pick(name):
    for k, a in acts.items():
        if k == name or k.endswith(name) or k.startswith(name):
            return a
    raise KeyError(name)

def head_pos():
    pb = rig.pose.bones.get("Bip01 Head")
    return rig.matrix_world @ pb.head

def render(path, eye, target, fov):
    cam.location = eye
    cam.rotation_euler = (Vector(target) - Vector(eye)).to_track_quat("-Z", "Y").to_euler()
    cam_d.angle = math.radians(fov)
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(path)
    px = np.array(im.pixels[:]).reshape(im.size[1], im.size[0], 4)
    bpy.data.images.remove(im)
    return px

tiles = []
tmp = os.path.join(os.path.dirname(out), "_rb_tmp.png")
for clip, frame in shots:
    a = pick(clip)
    rig.animation_data_create()
    rig.animation_data.action = a
    try:
        if rig.animation_data.action_slot is None and len(a.slots):
            rig.animation_data.action_slot = a.slots[0]
    except AttributeError:
        pass
    sc.frame_set(frame)
    h = head_pos() + Vector((0, 0, 0.08))
    row = []
    for yaw in (0, 40):  # front, three-quarter (degrees around the head, toward the figure's left)
        r = math.radians(yaw)
        dirv = Vector((math.sin(r), -math.cos(r), 0))
        row.append(render(tmp, h + dirv * 1.4 + Vector((0, 0, 0.05)), h - Vector((0, 0, 0.35)), 46))   # counter distance, Specs-like FOV
        row.append(render(tmp, h + dirv * 1.4 + Vector((0, 0, 0.02)), h, 11))                          # same spot, zoomed on the face
    tiles.append(np.concatenate(row, axis=1))
sheet = np.concatenate(tiles[::-1], axis=0)  # Blender pixel rows are bottom-up
im = bpy.data.images.new("sheet", sheet.shape[1], sheet.shape[0])
im.pixels = sheet.ravel()
im.filepath_raw = out; im.file_format = "PNG"; im.save()
os.remove(tmp)
print("SHEET", out, [f"{c}:{f}" for c, f in shots])
