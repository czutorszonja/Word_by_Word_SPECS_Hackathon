# Blender: list loose parts of a GLB (bbox per part), optionally delete parts by index, re-export.
#   blender --background --python loose_parts.py -- in.glb [out.glb idx,idx,...]
import bpy, bmesh, sys
argv = sys.argv[sys.argv.index("--") + 1:]
src = argv[0]
dst = argv[1] if len(argv) > 1 else None
kill = set(int(x) for x in argv[2].split(",")) if len(argv) > 2 and argv[2] else set()
CYL = tuple(float(x) for x in argv[3].split(",")) if len(argv) > 3 else None
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
idx = 0
for o in objs:
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bm.verts.ensure_lookup_table()
    seen = set()
    parts = []
    for v in bm.verts:
        if v.index in seen:
            continue
        stack = [v]
        comp = []
        seen.add(v.index)
        while stack:
            x = stack.pop()
            comp.append(x)
            for e in x.link_edges:
                y = e.other_vert(x)
                if y.index not in seen:
                    seen.add(y.index)
                    stack.append(y)
        parts.append(comp)
    parts.sort(key=lambda c: -len(c))
    mw = o.matrix_world
    to_delete = []
    for comp in parts:
        if len(comp) < 3:
            continue
        cs = [mw @ x.co for x in comp]
        mn = [min(c[i] for c in cs) for i in range(3)]
        mx = [max(c[i] for c in cs) for i in range(3)]
        print("PART", idx, "verts", len(comp), "min", [round(a, 3) for a in mn], "max", [round(a, 3) for a in mx])
        if idx in kill:
            to_delete.extend(comp)
        elif CYL is not None:
            cx, cy, r, zt = CYL
            bx, by = (mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2
            flat_top = (mx[2] - mn[2]) < 0.1 and mn[2] > 0.5 and mx[2] < zt + 0.04 and ((bx-cx)**2 + (by-cy)**2) ** 0.5 <= r + 0.15
            if flat_top or all(((c[0]-cx)**2 + (c[1]-cy)**2) ** 0.5 <= r and c[2] <= zt for c in cs):
                to_delete.extend(comp)
                print("  -> in table cylinder, deleted")
        idx += 1
    if to_delete:
        bmesh.ops.delete(bm, geom=list(set(to_delete)), context="VERTS")
        bm.to_mesh(o.data)
    bm.free()
if dst:
    bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB")
    print("EXPORTED", dst)
