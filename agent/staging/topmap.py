import bpy, sys
argv = sys.argv[sys.argv.index("--")+1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=argv[0])
import mathutils
pts=[]
for o in bpy.context.scene.objects:
    if o.type=='MESH':
        for v in o.data.vertices:
            pts.append(o.matrix_world @ v.co)
zs=[p.z for p in pts]; top=max(zs)
print("TOP", top, "n", len(pts))
# grid of max height in cm (glb units m -> *100), x across, y depth (blender y = -gltf z)
xs=[p.x for p in pts]; ys=[p.y for p in pts]
x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys)
N=12; M=8
g=[[0]*N for _ in range(M)]
for p in pts:
    i=min(N-1,int((p.x-x0)/(x1-x0+1e-9)*N)); j=min(M-1,int((p.y-y0)/(y1-y0+1e-9)*M))
    g[j][i]=max(g[j][i],p.z)
print("x range cm",x0*100,x1*100,"y range cm",y0*100,y1*100)
for j in range(M-1,-1,-1):
    print("y=%6.1f "%((y0+(j+0.5)*(y1-y0)/M)*100)+" ".join("%3d"%(h*100) for h in g[j]))
