# Café props batch (Nov 19): download SPECS results, size to real-world cm (1 unit = 1 m),
# ground + centre (origin bottom centre), render a contact sheet.
#   python process_props.py stage  Job_1 Job_2 ...      (job name = <Final>_<attempt>)
#   python process_props.py commit Job_1[:yaw] ...      (copy into Assets/GeneratedMeshes/<Final>.glb)
import json, os, subprocess, sys, shutil
D = os.path.dirname(os.path.abspath(__file__))
M = os.path.join(D, "mesh")
PV = os.path.join(M, "previews")
T = "C:/Users/czuto/.claude/plugins/cache/ls-extensions/ls-clad/1.0.0/skills/build-mesh/tools"
BLENDER = "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe"
ASSETS = "C:/LensProjects/Word_by_Word_SPECS_Hackhaton/Assets/GeneratedMeshes"

# real-world max dimension in cm (or "height" -> scale so Y extent equals value)
SIZE = {
    "PicklesWhole": ("max", 16), "BaristaMan": ("height", 178), "Perec": ("max", 40),
    "CarrotCake": ("max", 28), "KakaosCsiga": ("max", 38), "Pogacsa": ("max", 20),
    "OatMilk": ("height", 24.5), "AlmondMilk": ("height", 24.5), "CowMilk": ("height", 26),
    "CoffeeGrinder": ("height", 58), "CakeCloche": ("height", 36),
    "SteelPan": ("max", 17.6), "Plate": ("max", 26), "Gherkin": ("max", 8), "EmptyCup": ("max", 9.5), "TakeawayCups": ("height", 36), "Croissant": ("max", 13), "PepperStrips": ("max", 15), "Meatballs": ("max", 15),
}


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    return (r.stdout or "") + (r.stderr or "")


def aabb(g):
    out = run(["node", f"{T}/analyze_glb.js", g, "--aabb"])
    for l in out.splitlines():
        if "AABB (Lens Studio cm" in l:
            return [float(x) for x in l.split(":")[1].strip(" -").split(" x ")]
    raise RuntimeError(out)


def stage(names):
    os.makedirs(PV, exist_ok=True)
    urls = {}
    for f in ("urls.json", "urls_new.json"):  # both gitignored: signed download links
        fp = os.path.join(M, f)
        if os.path.exists(fp): urls.update(json.load(open(fp)))
    for job in names:
        final = job.rsplit("_", 1)[0]
        g = os.path.join(M, job + ".glb")
        if not os.path.exists(g):
            out = run(["node", f"{T}/download-glb.js", "--url", urls[job], "--out", g])
            if "DOWNLOADED" not in out:
                print(job, "DOWNLOAD FAILED", out[:300]); continue
        kind, val = SIZE[final]
        if kind == "height":
            w, h, d = aabb(g)
            val = max(w, h, d) * val / h
        run(["node", f"{T}/normalize_glb.js", g, g, f"--max-dim={val:.3f}"])
        print(job, run(["node", os.path.join(D, "center_glb.js"), g, g]).strip(),
              f"{os.path.getsize(g) / 1e6:.1f} MB")
        sheet = os.path.join(PV, job + ".png")
        args = [BLENDER, "--background", "--python", os.path.join(D, "preview_sheet.py"), "--", g, sheet]
        if final.startswith("Barista"):
            args.append("person")
        o = run(args)
        print("  ", [l for l in o.splitlines() if l.startswith("SHEET") or "Error" in l][:3])


def commit(items):
    os.makedirs(ASSETS, exist_ok=True)
    for it in items:
        job, yaw = (it.split(":") + ["0"])[:2]
        final = job.rsplit("_", 1)[0]
        g = os.path.join(M, job + ".glb")
        if yaw != "0":
            print(run(["node", os.path.join(D, "center_glb.js"), g, g, f"--yaw={yaw}"]).strip())
        dst = os.path.join(ASSETS, final + ".glb")
        shutil.copyfile(g, dst)
        print(final, "->", dst, os.path.getsize(dst), aabb(dst))


if __name__ == "__main__":
    {"stage": stage, "commit": commit}[sys.argv[1]](sys.argv[2:])
