# Blender: remove faces above (default) or below ("below") a height fraction of a GLB, re-export.
#   blender --background --python cut_part.py -- in.glb out.glb 0.62 [below]
import bpy, bmesh, sys
argv = sys.argv[sys.argv.index("--") + 1:]
src, dst, frac = argv[0], argv[1], float(argv[2])
BELOW = len(argv) > 3 and argv[3] == "below"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
zs = []
for o in objs:
    for v in o.data.vertices:
        zs.append((o.matrix_world @ v.co).z)
zmin, zmax = min(zs), max(zs)
cut = zmin + (zmax - zmin) * frac
removed = 0
for o in objs:
    bm = bmesh.new()
    bm.from_mesh(o.data)
    mw = o.matrix_world
    kill = [f for f in bm.faces if ((mw @ f.calc_center_median()).z < cut if BELOW else (mw @ f.calc_center_median()).z > cut)]
    removed += len(kill)
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    bm.to_mesh(o.data)
    bm.free()
print("CUT", cut, "zrange", zmin, zmax, "removed faces", removed)
bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB")
