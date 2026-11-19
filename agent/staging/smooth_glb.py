# Blender: clean up a generated person GLB — weld split vertices, fix normals, smooth shading,
# optional texture downscale — then re-export. Faces of text-to-3D people come out faceted with
# dark seam patches; welding + consistent normals + smooth shading removes most of that.
#   blender --background --python smooth_glb.py -- in.glb out.glb [maxtex=2048] [weld=0.0008] [subdiv=0]
import bpy, bmesh, sys
argv = sys.argv[sys.argv.index("--") + 1:]
src, dst = argv[0], argv[1]
maxtex = int(argv[2]) if len(argv) > 2 else 2048
weld = float(argv[3]) if len(argv) > 3 else 0.0008
subdiv = int(argv[4]) if len(argv) > 4 else 0
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for img in bpy.data.images:
    w, h = img.size
    if max(w, h) > maxtex:
        s = maxtex / max(w, h)
        img.scale(max(1, int(w * s)), max(1, int(h * s)))
for o in bpy.context.scene.objects:
    if o.type != "MESH":
        continue
    bm = bmesh.new()
    bm.from_mesh(o.data)
    before = len(bm.verts)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=weld)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    after = len(bm.verts)
    bm.to_mesh(o.data)
    bm.free()
    for p in o.data.polygons:
        p.use_smooth = True
    if subdiv > 0:
        m = o.modifiers.new("sub", "SUBSURF")
        m.levels = subdiv
        m.render_levels = subdiv
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=m.name)
    print("WELD", o.name, before, "->", after, "faces", len(o.data.polygons))
bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", export_image_format="JPEG")
print("EXPORTED", dst)
