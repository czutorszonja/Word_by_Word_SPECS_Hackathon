# Blender: render a head close-up of a standing/seated person GLB (front = -Y, like preview_glb.py).
#   blender --background --python face_closeup.py -- in.glb out.png [headFrac=0.93] [lightMode=soft|harsh]
import bpy, sys, math, mathutils
argv = sys.argv[sys.argv.index("--") + 1:]
src, out = argv[0], argv[1]
head = float(argv[2]) if len(argv) > 2 else 0.93
mode = argv[3] if len(argv) > 3 else "soft"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
mn = [1e9] * 3
mx = [-1e9] * 3
for o in bpy.context.scene.objects:
    if o.type == "MESH":
        for v in o.bound_box:
            w = o.matrix_world @ mathutils.Vector(v)
            for i in range(3):
                mn[i] = min(mn[i], w[i]); mx[i] = max(mx[i], w[i])
H = mx[2] - mn[2]
# head: top part of the mesh; find its xy centre from vertices above the head line
pts = []
for o in bpy.context.scene.objects:
    if o.type == "MESH":
        for v in o.data.vertices:
            w = o.matrix_world @ v.co
            if w[2] > mn[2] + H * (head - 0.06):
                pts.append(w)
cx = sum(p[0] for p in pts) / len(pts); cy = sum(p[1] for p in pts) / len(pts); cz = mn[2] + H * head - H * 0.03
target = mathutils.Vector((cx, cy, cz))
bpy.context.scene.render.engine = "BLENDER_EEVEE"
bpy.context.scene.render.resolution_x = 600
bpy.context.scene.render.resolution_y = 600
bpy.ops.object.camera_add(location=(cx, cy - 0.55, cz + 0.02))
cam = bpy.context.object
cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
cam.data.lens = 85
bpy.context.scene.camera = cam
if mode == "harsh":
    bpy.ops.object.light_add(type="POINT", location=(cx, cy, cz + 0.9)); bpy.context.object.data.energy = 120
else:
    bpy.ops.object.light_add(type="SUN", location=(1, -3, 3)); bpy.context.object.data.energy = 2.5
    bpy.ops.object.light_add(type="POINT", location=(cx - 0.6, cy - 0.8, cz + 0.3)); bpy.context.object.data.energy = 60
bpy.context.scene.render.filepath = out
bpy.ops.render.render(write_still=True)
print("FACE", out, "H", round(H, 3))
