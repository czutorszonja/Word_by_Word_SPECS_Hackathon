# Blender: render a single contact-sheet PNG for a GLB (glTF +Z front = Blender -Y, camera yaw 0 looks at the front).
#   blender --background --python preview_sheet.py -- in.glb out.png [person]
# Props: front | 3/4 | side | top-down.  back: back | back 3/4 | other side | top-down.  person: front | 3/4 | side | face close-up | neck/collar 3/4 close-up.
import bpy, sys, math, os, mathutils
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:]
src, out = argv[0], argv[1]
person = len(argv) > 2 and argv[2] == "person"
T = 512

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
sc = bpy.context.scene
sc.render.engine = "BLENDER_EEVEE"
sc.render.resolution_x = T
sc.render.resolution_y = T
sc.render.film_transparent = False
sc.view_settings.view_transform = "Standard"
world = bpy.data.worlds.new("W")
sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
bg.inputs[0].default_value = (0.55, 0.55, 0.57, 1)
bg.inputs[1].default_value = 0.9
bpy.ops.object.light_add(type="SUN", location=(2, -3, 4))
sun = bpy.context.object
sun.data.energy = 3.0
sun.rotation_euler = (math.radians(50), 0, math.radians(30))

mn = mathutils.Vector((1e9, 1e9, 1e9))
mx = mathutils.Vector((-1e9, -1e9, -1e9))
verts = []
for o in sc.objects:
    if o.type == "MESH":
        for v in o.data.vertices:
            w = o.matrix_world @ v.co
            verts.append(w)
            for i in range(3):
                mn[i] = min(mn[i], w[i]); mx[i] = max(mx[i], w[i])
center = (mn + mx) / 2
radius = (mx - mn).length / 2
H = mx[2] - mn[2]

cam_data = bpy.data.cameras.new("C")
cam = bpy.data.objects.new("C", cam_data)
sc.collection.objects.link(cam)
sc.camera = cam


def shot(target, rad, yaw, pitch, lens=50.0):
    cam_data.lens = lens
    fov = 2 * math.atan(18.0 / lens)
    d = rad / math.sin(fov / 2) * 1.05
    y, p = math.radians(yaw), math.radians(pitch)
    cam.location = target + mathutils.Vector((d * math.sin(y) * math.cos(p), -d * math.cos(y) * math.cos(p), d * math.sin(p)))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam_data.clip_start = d * 0.01
    cam_data.clip_end = d * 10
    path = out + ".tmp_%d.png" % len(tiles)
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(path)
    px = np.empty(T * T * 4, np.float32)
    img.pixels.foreach_get(px)
    tiles.append(px.reshape(T, T, 4))
    bpy.data.images.remove(img)
    os.remove(path)


tiles = []
if person:
    shot(center, radius, 0, 5)
    shot(center, radius, 40, 10)
    shot(center, radius, 90, 5)
    hp = [v for v in verts if v[2] > mn[2] + H * 0.87]
    hc = sum(hp, mathutils.Vector()) / len(hp)
    face = mathutils.Vector((hc[0], hc[1], mn[2] + H * 0.92))
    shot(face, H * 0.075, 0, 3, 85)
    neck = mathutils.Vector((hc[0], hc[1], mn[2] + H * 0.84))
    shot(neck, H * 0.09, 35, 8, 85)
elif len(argv) > 2 and argv[2] == "back":
    shot(center, radius, 180, 15)
    shot(center, radius, 220, 30)
    shot(center, radius, 270, 12)
    shot(center, radius, 0, 75)
else:
    shot(center, radius, 0, 15)
    shot(center, radius, 40, 30)
    shot(center, radius, 90, 12)
    shot(center, radius, 0, 75)

sheet = np.concatenate(tiles, axis=1)
img = bpy.data.images.new("sheet", sheet.shape[1], sheet.shape[0], alpha=True)
img.pixels.foreach_set(sheet.ravel())
img.filepath_raw = out
img.file_format = "PNG"
img.save()
print("SHEET", out, "size_m", [round(x, 3) for x in (mx - mn)])
