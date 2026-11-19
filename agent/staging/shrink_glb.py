# Blender: shrink a GLB for Specs — textures to <= MAXTEX px (JPEG), decimate to <= MAXFACES.
#   blender --background --python shrink_glb.py -- in.glb out.glb [maxtex=1024] [maxfaces=40000]
import bpy, sys
argv = sys.argv[sys.argv.index("--") + 1:]
src, dst = argv[0], argv[1]
maxtex = int(argv[2]) if len(argv) > 2 else 1024
maxfaces = int(argv[3]) if len(argv) > 3 else 40000
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for img in bpy.data.images:
    w, h = img.size
    if max(w, h) > maxtex:
        s = maxtex / max(w, h)
        img.scale(max(1, int(w * s)), max(1, int(h * s)))
faces = sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type == "MESH")
if faces > maxfaces:
    ratio = maxfaces / faces
    for o in bpy.context.scene.objects:
        if o.type == "MESH":
            m = o.modifiers.new("dec", "DECIMATE")
            m.ratio = ratio
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.modifier_apply(modifier=m.name)
faces2 = sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type == "MESH")
bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", export_image_format="JPEG")
print("SHRUNK faces", faces, "->", faces2)
