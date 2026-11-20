# Blender: print what a Rocketbox FBX contains (objects, materials, shape keys, actions, bone names).
#   blender --background --python rb_inspect.py -- file.fbx [file2.fbx ...]
import bpy, sys
args = sys.argv[sys.argv.index("--") + 1:]
for path in args:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=path, use_anim=True)
    print("=" * 30, path)
    for o in bpy.data.objects:
        dims = tuple(round(d, 3) for d in o.dimensions)
        extra = ""
        if o.type == "MESH":
            me = o.data
            extra = f" verts={len(me.vertices)} tris~{sum(len(p.vertices) - 2 for p in me.polygons)} mats={[m.name for m in me.materials if m]}"
            if me.shape_keys:
                ks = [k.name for k in me.shape_keys.key_blocks]
                extra += f" shapekeys={len(ks)} first={ks[:6]} sample={[k for k in ks if any(t in k for t in ('AA_VI', 'AK_09', 'AK_10', 'AK_44', 'AK_45', 'AK_25'))][:30]}"
        if o.type == "ARMATURE":
            bones = [b.name for b in o.data.bones]
            extra = f" bones={len(bones)} first={bones[:8]} head={[b for b in bones if 'Head' in b or 'Neck' in b]}"
        print(f"{o.type:9s} {o.name:30s} parent={o.parent.name if o.parent else None} dims={dims} scale={tuple(round(s,3) for s in o.scale)}{extra}")
    for m in bpy.data.materials:
        texs = [n.image.name for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image] if m.use_nodes else []
        print("MAT", m.name, texs)
    for a in bpy.data.actions:
        print("ACTION", a.name, "frames", tuple(a.frame_range), "fps", bpy.context.scene.render.fps)
