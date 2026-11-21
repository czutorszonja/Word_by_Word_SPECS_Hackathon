# Blender: build one Lens-ready GLB from a Microsoft Rocketbox avatar (MIT licence).
#   - imports the facial FBX (skin + 81-bone biped + blendshapes), keeps only the face shapes we drive
#     (visemes, blinks, jaw, smile, brows) so the file stays small
#   - rebuilds the materials from the downloaded TGA textures, resized to JPEG/PNG (body, head and,
#     for long hair / lashes, an "opacity" material with an alpha-clipped colour+alpha PNG)
#   - retargets Rocketbox motion clips onto the avatar (world-space rotation copy, pelvis location too)
#     and bakes each into its own NLA track -> one glTF animation per clip
#   blender --background --python rb_build_glb.py -- <download dir> <avatar fbx> <tex prefix> <out.glb> <work dir> \
#           <clip name>=<clip fbx>[:start-end] ...
import bpy, sys, os

argv = sys.argv[sys.argv.index("--") + 1:]
dl, avatar_fbx, tex_prefix, out_glb, work = argv[:5]
clips = []
for spec in argv[5:]:
    name, rest = spec.split("=", 1)
    rng = None
    if ":" in rest:
        rest, r = rest.split(":")
        rng = tuple(int(x) for x in r.split("-"))
    clips.append((name, rest, rng))
os.makedirs(work, exist_ok=True)
STEP = int(os.environ.get("RB_STEP", "2"))  # bake every Nth frame at 30 fps; Lens interpolates in between
TEX = int(os.environ.get("RB_TEX", "1024"))
NTEX = int(os.environ.get("RB_NTEX", str(TEX)))      # normal-map size
NFMT = os.environ.get("RB_NFMT", "PNG")               # normal-map format: PNG (exact) or JPEG (small, fine at a distance)
HTEX = int(os.environ.get("RB_HTEX", str(TEX)))      # hair/lash opacity texture size
KEEP = os.environ.get("RB_KEEP", "")                 # comma-separated face-shape name parts to keep (default: the full speaking set)
NAME = os.environ.get("RB_NAME", "RB")  # prefix for material/texture names, so several people stay apart in Lens Studio

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 30
bpy.ops.import_scene.fbx(filepath=os.path.join(dl, avatar_fbx), use_anim=False)
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
body = next(o for o in bpy.data.objects if o.type == "MESH")
rig.name, body.name = "Rig", "Body"
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)
if rig.animation_data:
    rig.animation_data_clear()

# ── face shapes: keep what the runtime drives ──
KEEP_TAGS = tuple(t for t in KEEP.split(",") if t) or ("AA_VI_", "EyeBlink", "JawOpen", "MouthSmile", "BrowInnerUp", "BrowOuterUp", "EyeSquint", "MouthClose")
if body.data.shape_keys:
    names = [k.name for k in body.data.shape_keys.key_blocks]
    print("SHAPEKEYS_ALL", names)
    for kb in list(body.data.shape_keys.key_blocks)[1:]:
        if not any(t in kb.name for t in KEEP_TAGS):
            body.shape_key_remove(kb)
    print("SHAPEKEYS_KEPT", [k.name for k in body.data.shape_keys.key_blocks])

# ── materials from the TGA textures ──
def resized(src, dst, size, fmt, noncolor=False):
    im = bpy.data.images.load(os.path.join(dl, src))
    im.scale(size, size)
    im.file_format = fmt
    im.save(filepath=dst, quality=90)
    bpy.data.images.remove(im)
    out = bpy.data.images.load(dst)
    if noncolor:
        out.colorspace_settings.name = "Non-Color"
    return out

def material(name, part, size, rough):
    col = resized(f"{tex_prefix}_{part}_color.tga", os.path.join(work, f"{name}_color.jpg"), size, "JPEG")
    ext = "jpg" if NFMT == "JPEG" else "png"
    nrm = resized(f"{tex_prefix}_{part}_normal.tga", os.path.join(work, f"{name}_normal.{ext}"), NTEX, NFMT, True)
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = col
    nt.links.new(t.outputs["Color"], bsdf.inputs["Base Color"])
    n = nt.nodes.new("ShaderNodeTexImage"); n.image = nrm
    nm = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(n.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = 0.0
    return m

def opacity_material(name, size):
    """Hair cards / lashes: colour + alpha from <prefix>_opacity_color.tga, alpha-clipped (glTF MASK)."""
    src = os.path.join(dl, f"{tex_prefix}_opacity_color.tga")
    im = bpy.data.images.load(src)
    im.scale(size, size)
    im.file_format = "PNG"
    dst = os.path.join(work, f"{name}_color.png")
    im.save(filepath=dst)
    bpy.data.images.remove(im)
    img = bpy.data.images.load(dst)
    img.alpha_mode = "STRAIGHT"
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = img
    nt.links.new(t.outputs["Color"], bsdf.inputs["Base Color"])
    rnd = nt.nodes.new("ShaderNodeMath"); rnd.operation = "ROUND"   # the glTF exporter reads Round as alphaMode MASK, cutoff 0.5
    nt.links.new(t.outputs["Alpha"], rnd.inputs[0])
    nt.links.new(rnd.outputs[0], bsdf.inputs["Alpha"])
    bsdf.inputs["Roughness"].default_value = 0.6
    bsdf.inputs["Metallic"].default_value = 0.0
    try:
        m.surface_render_method = "DITHERED"
    except Exception:
        pass
    try:
        m.use_backface_culling = False
    except Exception:
        pass
    return m

mats = {"head": material(NAME + "_Head", "head", TEX, 0.55), "body": material(NAME + "_Body", "body", TEX, 0.8)}
if os.path.exists(os.path.join(dl, f"{tex_prefix}_opacity_color.tga")):
    mats["opacity"] = opacity_material(NAME + "_Hair", HTEX)
for i, m in enumerate(body.data.materials):
    key = "opacity" if "opacity" in m.name else "head" if "head" in m.name else "body"
    if key not in mats:
        raise SystemExit(f"material {m.name} needs {tex_prefix}_{key} textures")
    body.data.materials[i] = mats[key]
print("MATERIALS", [m.name for m in body.data.materials])

# ── motion clips ──
for name, fbx, rng in clips:
    objs0, acts0 = set(bpy.data.objects), set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=os.path.join(dl, fbx), use_anim=True)
    new = [o for o in bpy.data.objects if o not in objs0]
    src = next(o for o in new if o.type == "ARMATURE")
    f0, f1 = (int(src.animation_data.action.frame_range[0]), int(src.animation_data.action.frame_range[1]))
    if rng:
        f0, f1 = rng
    for pb in rig.pose.bones:
        if pb.name not in src.pose.bones:
            continue
        c = pb.constraints.new("COPY_ROTATION")
        c.target, c.subtarget, c.target_space, c.owner_space = src, pb.name, "WORLD", "WORLD"
        if pb.name == "Bip01 Pelvis":
            c = pb.constraints.new("COPY_LOCATION")
            c.target, c.subtarget, c.target_space, c.owner_space = src, pb.name, "WORLD", "WORLD"
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.pose.select_all(action="SELECT")
    bpy.ops.nla.bake(frame_start=f0, frame_end=f1, step=STEP, only_selected=False, visual_keying=True,
                     clear_constraints=True, use_current_action=False, bake_types={"POSE"})
    bpy.ops.object.mode_set(mode="OBJECT")
    baked = rig.animation_data.action
    baked.name = name
    tr = rig.animation_data.nla_tracks.new()
    tr.name = name
    tr.strips.new(name, f0, baked)
    rig.animation_data.action = None
    for o in new:
        bpy.data.objects.remove(o, do_unlink=True)
    for a in set(bpy.data.actions) - acts0:
        if a != baked:
            bpy.data.actions.remove(a)
    print("CLIP", name, f0, f1, "keys/bone ~", (f1 - f0) // STEP + 1)

for pb in rig.pose.bones:
    pb.location, pb.rotation_quaternion, pb.rotation_euler, pb.scale = (0, 0, 0), (1, 0, 0, 0), (0, 0, 0), (1, 1, 1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(work, "avatar.blend"))
bpy.ops.export_scene.gltf(filepath=out_glb, export_format="GLB", export_animation_mode="NLA_TRACKS",
                          export_optimize_animation_size=True, export_force_sampling=True, export_frame_step=STEP,
                          export_morph=True, export_morph_normal=False, export_morph_animation=False,
                          export_skins=True, export_image_format="AUTO", export_yup=True)
print("WROTE", out_glb, os.path.getsize(out_glb))
