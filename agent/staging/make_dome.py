# Blender: a clean glass cake dome (thin hemisphere shell + knob), origin at the rim centre, metres.
#   blender --background --python make_dome.py -- out.glb [radius_m] [height_m]
import bpy, bmesh, sys
argv = sys.argv[sys.argv.index("--") + 1:]
out = argv[0]; R = float(argv[1]) if len(argv) > 1 else 0.16; H = float(argv[2]) if len(argv) > 2 else 0.2
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=1.0, location=(0, 0, 0))
dome = bpy.context.active_object
bm = bmesh.new(); bm.from_mesh(dome.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context="VERTS")
bm.to_mesh(dome.data); bm.free()
dome.scale = (R, R, H)
bpy.ops.object.transform_apply(scale=True)
mod = dome.modifiers.new("shell", "SOLIDIFY"); mod.thickness = 0.003; mod.offset = -1
bpy.ops.object.modifier_apply(modifier="shell")
bpy.ops.object.shade_smooth()
# a small rim lip at the bottom and a knob on top
bpy.ops.mesh.primitive_torus_add(major_radius=R - 0.0015, minor_radius=0.003, major_segments=48, minor_segments=8, location=(0, 0, 0.002))
lip = bpy.context.active_object; bpy.ops.object.shade_smooth()
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.018, location=(0, 0, H + 0.012))
knob = bpy.context.active_object; bpy.ops.object.shade_smooth()
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.008, depth=0.014, location=(0, 0, H + 0.002))
stem = bpy.context.active_object; bpy.ops.object.shade_smooth()
for o in bpy.context.scene.objects: o.select_set(True)
bpy.context.view_layer.objects.active = dome
bpy.ops.object.join()
mat = bpy.data.materials.new("Glass"); mat.diffuse_color = (0.9, 0.95, 1.0, 0.25)
dome.data.materials.append(mat)
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB")
print("DOME", out, R, H)
