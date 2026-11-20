# Blender python (bpy image I/O + numpy): crop the Specs preview screenshots (2487x1590, content in the
# middle) and lay them side by side, downscaled, into one strip for quick review.
#   blender --background --python shot_strip.py -- out.png scale a.png b.png ...
import bpy, sys
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:]
out, scale, files = argv[0], float(argv[1]), argv[2:]
tiles = []
for f in files:
    im = bpy.data.images.load(f)
    w, h = im.size
    px = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)
    bpy.data.images.remove(im)
    x0, x1 = int(w * 0.22), int(w * 0.78)  # drop the black side bars
    px = px[:, x0:x1]
    step = max(1, int(round(1 / scale)))
    tiles.append(px[::step, ::step])
hmin = min(t.shape[0] for t in tiles)
strip = np.concatenate([t[:hmin] for t in tiles], axis=1)
img = bpy.data.images.new("strip", strip.shape[1], strip.shape[0])
img.pixels = strip.ravel()
img.filepath_raw = out
img.file_format = "PNG"
img.save()
print("STRIP", out, strip.shape)
