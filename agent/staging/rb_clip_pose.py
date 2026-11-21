# Blender: print where key bones of a Rocketbox motion clip are (world, cm, Blender Z-up: -Y = the actor's front)
# at a few frames, to line a seated clip up with a chair and table.
#   blender --background --python rb_clip_pose.py -- clip.fbx [frames...]
import bpy, sys
argv = sys.argv[sys.argv.index("--") + 1:]
path = argv[0]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=path, use_anim=True)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
a = arm.animation_data.action
frames = [int(f) for f in argv[1:]] or [int(a.frame_range[0]), int(sum(a.frame_range) / 2), int(a.frame_range[1])]
BONES = ["Bip01 Pelvis", "Bip01 Spine2", "Bip01 Head", "Bip01 L Hand", "Bip01 R Hand", "Bip01 L Forearm", "Bip01 L Thigh", "Bip01 L Calf", "Bip01 L Foot", "Bip01 R Foot"]
for f in frames:
    bpy.context.scene.frame_set(f)
    out = []
    for b in BONES:
        pb = arm.pose.bones.get(b)
        if pb:
            p = arm.matrix_world @ pb.head
            out.append(f"{b.replace('Bip01 ', '')}=({p.x*100:.0f},{p.y*100:.0f},{p.z*100:.0f})")
    print("POSE", path.split("/")[-1], "f", f, " ".join(out))
