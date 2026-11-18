# Download + normalize + ground + preview SPECS meshes listed in mesh/urls.json.
#   python process_meshes.py stage   Name1 Name2 ...   -> download/normalize/render previews + contact sheet
#   python process_meshes.py commit  Name1:yaw ...     -> bake yaw, stamp canonical, copy into Assets/GeneratedMeshes
import json, os, subprocess, sys, shutil
D = os.path.dirname(os.path.abspath(__file__))
M = os.path.join(D, "mesh")
T = "C:/Users/czuto/.claude/plugins/cache/ls-extensions/ls-clad/1.0.0/skills/build-mesh/tools"
BLENDER = "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe"
BPY = "C:/Program Files/Blender Foundation/Blender 5.0/5.0/python/bin/python.exe"
ASSETS = "C:/LensProjects/Word_by_Word_SPECS_Hackhaton/Assets/GeneratedMeshes"

# size: ("max", N) or ("target", "W,H,D"); ground True/False
SIZE = {
 "Server": ("max", 172), "EspressoMachine": ("max", 52), "SeatedDiner": ("max", 128), "VelvetSofa": ("max", 190),
 "SandwichCounter": ("target", "200,100,62"), "SandwichCounterFlat": ("target", "200,90,62"), "CoffeeBarCounter": ("target", "120,90,60"), "PastryCase": ("max", 120), "SeatedDinerLaptop": ("max", 128),
 "SeatedDinerCoffee": ("max", 92), "OliveSofa": ("max", 190), "CafeTable": ("target", "72,75,72"),
 "LeatherChair": ("max", 88), "BarStool": ("max", 75),
 "Ham": ("target", "15,8,14"), "Cheese": ("target", "15,8,14"), "Chicken": ("target", "15,8,14"),
 "Meatballs": ("target", "15,8,14"), "Lettuce": ("target", "15,8,14"), "Spinach": ("target", "15,8,14"),
 "Tomato": ("target", "15,8,14"), "Olives": ("target", "15,8,14"), "Pickles": ("target", "15,8,14"),
 "Onion": ("target", "15,8,14"), "Mayonnaise": ("target", "15,8,14"),
 "CroissantBoard": ("max", 32), "BreadLoaf": ("max", 26), "Sandwiches": ("max", 26), "CoffeeCup": ("max", 12),
 "MilkJug": ("max", 15), "WaterBottle": ("max", 24), "OrangeCup": ("max", 9), "CupStacks": ("max", 50),
 "WallShelf": ("max", 190), "GlobePendant": ("max", 60), "EdisonCluster": ("max", 70), "PottedPlant": ("max", 170),
 "HangingPlant": ("max", 80), "LowTable": ("max", 56), "BarTable": ("target", "60,105,60"), "Tongs": ("max", 24), "BreadBaskets": ("max", 55),
}
NO_GROUND = {"GlobePendant", "EdisonCluster", "HangingPlant"}

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    return (r.stdout or "") + (r.stderr or "")

def stage(names):
    urls = json.load(open(os.path.join(M, "urls.json")))
    sheets = []
    for n in names:
        g = os.path.join(M, n + ".glb")
        if not os.path.exists(g):
            out = run(["node", f"{T}/download-glb.js", "--url", urls[n], "--out", g])
            if "DOWNLOADED" not in out: print(n, "DOWNLOAD FAILED", out[:200]); continue
        kind, val = SIZE[n]
        args = ["node", f"{T}/normalize_glb.js", g, g, f"--max-dim={val}" if kind == "max" else f"--target={val}"]
        if n not in NO_GROUND: args.append("--ground")
        run(args)
        a = run(["node", f"{T}/analyze_glb.js", g, "--aabb", "--shape"])
        print(n, " | ".join(l.strip("- ") for l in a.splitlines() if l.startswith("---")))
        run([BLENDER, "--background", "--python", f"{T}/preview_glb.py", "--", g])
        sheets.append(n)
    # contact sheet of front + side previews
    code = r'''
import sys, os, zlib, struct, numpy as np
d, out, names = sys.argv[1], sys.argv[2], sys.argv[3:]
def rd(p):
    b=open(p,'rb').read(); i=8; idat=b''; w=h=0; ct=6
    while i<len(b):
        n=struct.unpack('>I',b[i:i+4])[0]; t=b[i+4:i+8]; dd=b[i+8:i+8+n]
        if t==b'IHDR': w,h=struct.unpack('>II',dd[:8]); ct=dd[9]
        if t==b'IDAT': idat+=dd
        i+=12+n
    ch=4 if ct==6 else 3
    raw=zlib.decompress(idat); stride=w*ch+1; img=np.zeros((h,w,ch),np.uint8); prev=np.zeros(w*ch,np.int32)
    for y in range(h):
        f=raw[y*stride]; row=np.frombuffer(raw[y*stride+1:(y+1)*stride],np.uint8).astype(np.int32)
        if f==0: cur=row
        elif f==2: cur=(row+prev)&255
        else:
            cur=np.zeros_like(row)
            for x in range(len(row)):
                a=cur[x-ch] if x>=ch else 0; up=prev[x]; c=prev[x-ch] if x>=ch else 0
                if f==1: cur[x]=(row[x]+a)&255
                elif f==3: cur[x]=(row[x]+((a+up)>>1))&255
                else:
                    p=a+up-c; pa=abs(p-a); pb=abs(p-up); pc=abs(p-c)
                    pr=a if (pa<=pb and pa<=pc) else (up if pb<=pc else c); cur[x]=(row[x]+pr)&255
        img[y]=cur.reshape(w,ch).astype(np.uint8); prev=cur
    return img[...,:3]
T=192; tiles=[]
for n in names:
    row=[]
    for v in ("front","side"):
        p=os.path.join(d,f"{n}_{v}.png")
        if os.path.exists(p):
            im=rd(p); h,w=im.shape[:2]; ys=(np.arange(T)*h//T); xs=(np.arange(T)*w//T); row.append(im[ys][:,xs])
        else: row.append(np.zeros((T,T,3),np.uint8))
    tiles.append(np.concatenate(row,1))
cols=4; rows=(len(tiles)+cols-1)//cols
sheet=np.full((rows*T,cols*2*T,3),40,np.uint8)
for k,t in enumerate(tiles):
    r,c=divmod(k,cols); sheet[r*T:(r+1)*T,c*2*T:(c+1)*2*T]=t
raw=b''.join(b'\x00'+sheet[y].tobytes() for y in range(sheet.shape[0]))
chk=lambda t,dd: struct.pack('>I',len(dd))+t+dd+struct.pack('>I',zlib.crc32(t+dd)&0xffffffff)
open(out,'wb').write(b'\x89PNG\r\n\x1a\n'+chk(b'IHDR',struct.pack('>IIBBBBB',sheet.shape[1],sheet.shape[0],8,2,0,0,0))+chk(b'IDAT',zlib.compress(raw))+chk(b'IEND',b''))
print("sheet", out, names)
'''
    cp = os.path.join(D, "sheet_meshes.py"); open(cp, "w").write(code)
    print(run([BPY, "-I", cp, os.path.join(M, "preview"), os.path.join(D, "shots", "mesh_sheet.png")] + sheets)[-300:])

def commit(items):
    os.makedirs(ASSETS, exist_ok=True)
    for it in items:
        n, yaw = (it.split(":") + ["180"])[:2]
        g = os.path.join(M, n + ".glb")
        run(["node", f"{T}/normalize_glb.js", g, g, f"--yaw={yaw}", "--mark-canonical"])
        shutil.copyfile(g, os.path.join(ASSETS, n + ".glb"))
        a = run(["node", f"{T}/analyze_glb.js", g, "--aabb", "--orient-meta"])
        print(n, " | ".join(l.strip("- ") for l in a.splitlines() if l.strip()))

if __name__ == "__main__":
    {"stage": stage, "commit": commit}[sys.argv[1]](sys.argv[2:])
