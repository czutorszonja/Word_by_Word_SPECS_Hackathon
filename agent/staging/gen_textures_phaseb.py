# Procedural surface textures for the Word by Word café shell (one texture per surface,
# painted at the surface's real size so bricks/tiles/planks have real-world proportions).
import numpy as np, zlib, struct, sys, os
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

def save(name, img):
    img = (np.clip(img, 0, 1) * 255).astype(np.uint8)
    h, w = img.shape[:2]
    raw = b"".join(b"\x00" + img[y].tobytes() for y in range(h))
    ch = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    open(os.path.join(OUT, name + ".png"), "wb").write(b"\x89PNG\r\n\x1a\n" + ch(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + ch(b"IDAT", zlib.compress(raw, 9)) + ch(b"IEND", b""))

def hexc(h): return np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)])
def noise(h, w, scale, amp):
    small = rng.random((max(2, h // scale), max(2, w // scale)))
    ys = np.linspace(0, small.shape[0] - 1, h); xs = np.linspace(0, small.shape[1] - 1, w)
    y0 = np.floor(ys).astype(int); x0 = np.floor(xs).astype(int)
    y1 = np.minimum(y0 + 1, small.shape[0] - 1); x1 = np.minimum(x0 + 1, small.shape[1] - 1)
    fy = (ys - y0)[:, None]; fx = (xs - x0)[None, :]
    n = small[y0][:, x0] * (1 - fy) * (1 - fx) + small[y1][:, x0] * fy * (1 - fx) + small[y0][:, x1] * (1 - fy) * fx + small[y1][:, x1] * fy * fx
    return (n - 0.5) * amp

def bricks(name, wcm, hcm, px_per_cm, bw=22, bh=6.5, mortar=1.0, base="#EEE9DF", mort="#D8D1C4"):
    W, H = int(wcm * px_per_cm), int(hcm * px_per_cm)
    img = np.ones((H, W, 3)) * hexc(mort)
    ys, xs = np.mgrid[0:H, 0:W] / px_per_cm
    row = np.floor(ys / (bh + mortar)).astype(int)
    xo = xs + (row % 2) * (bw + mortar) / 2
    col = np.floor(xo / (bw + mortar)).astype(int)
    inx = (xo % (bw + mortar)) < bw; iny = (ys % (bh + mortar)) < bh
    brick = inx & iny
    ids = (row * 131 + col * 17) % 97
    tint = (np.sin(ids * 12.9898) * 43758.5) % 1
    c = hexc(base)[None, None, :] * (0.93 + 0.07 * tint[..., None])
    c = c + noise(H, W, 6, 0.06)[..., None]
    img[brick] = c[brick]
    img += noise(H, W, 40, 0.05)[..., None]  # whitewash unevenness
    save(name, img)

def planks(name, wcm, hcm, px_per_cm, pw=20, base="#B98A5E"):
    W, H = int(wcm * px_per_cm), int(hcm * px_per_cm)
    ys, xs = np.mgrid[0:H, 0:W] / px_per_cm
    col = np.floor(xs / pw).astype(int)
    off = (np.sin(col * 7.13) * 1000) % 180
    seg = np.floor((ys + off) / 180).astype(int)
    ids = col * 31 + seg * 7
    tint = (np.sin(ids * 3.71) * 43758.5) % 1
    c = hexc(base)[None, None, :] * (0.86 + 0.18 * tint[..., None])
    grain = np.sin((xs * 3.1 + np.sin(ys * 0.08 + col) * 2.5) * 2.0) * 0.03
    c = c + grain[..., None] + noise(H, W, 5, 0.04)[..., None]
    gap = ((xs % pw) < 0.35) | (((ys + off) % 180) < 0.35)
    c[gap] = hexc("#7A5634")
    save(name, c)

def tiles(name, wcm, hcm, px_per_cm, tw=15, th=7.5, base="#2F6B4F", grout="#1F4A37", gloss=True):
    W, H = int(wcm * px_per_cm), int(hcm * px_per_cm)
    ys, xs = np.mgrid[0:H, 0:W] / px_per_cm
    row = np.floor(ys / th).astype(int)
    xo = xs + (row % 2) * tw / 2
    col = np.floor(xo / tw).astype(int)
    lx = (xo % tw) / tw; ly = (ys % th) / th
    ids = row * 53 + col * 11
    tint = (np.sin(ids * 5.37) * 43758.5) % 1
    c = hexc(base)[None, None, :] * (0.9 + 0.16 * tint[..., None])
    if gloss:  # soft bevel + highlight like glossy glazed tiles
        bevel = np.minimum(np.minimum(lx, 1 - lx) * tw, np.minimum(ly, 1 - ly) * th)
        c = c * (0.85 + 0.15 * np.clip(bevel / 1.0, 0, 1))[..., None]
        hl = np.exp(-(((lx - 0.3) / 0.25) ** 2 + ((ly - 0.3) / 0.35) ** 2)) * 0.18
        c = c + hl[..., None]
    g = ((xo % tw) < 0.45) | ((ys % th) < 0.45)
    c[g] = hexc(grout)
    save(name, c)

def checker(name, wcm, hcm, px_per_cm, s=25):
    W, H = int(wcm * px_per_cm), int(hcm * px_per_cm)
    ys, xs = np.mgrid[0:H, 0:W] / px_per_cm
    k = (np.floor(xs / s) + np.floor(ys / s)) % 2
    c = np.where(k[..., None] == 0, hexc("#F4F1EA"), hexc("#55565C"))
    c = c + noise(H, W, 8, 0.03)[..., None]
    g = ((xs % s) < 0.3) | ((ys % s) < 0.3)
    c[g] = hexc("#B8B4AA")
    save(name, c)

def limestone(name, wcm, hcm, ppc):
    W, H = int(wcm*ppc), int(hcm*ppc)
    ys, xs = np.mgrid[0:H, 0:W] / ppc
    img = np.ones((H, W, 3)) * hexc("#B9A88C")
    rowh = 18
    row = np.floor(ys / rowh).astype(int)
    seed = (np.sin(row * 9.1) * 1000) % 1
    blockw = 26 + 14 * seed
    xo = xs + row * 13.7
    col = np.floor(xo / blockw).astype(int)
    ids = row * 37 + col * 13
    tint = (np.sin(ids * 2.17) * 43758.5) % 1
    c = hexc("#D8C4A0")[None, None, :] * (0.88 + 0.16 * tint[..., None]) + noise(H, W, 4, 0.08)[..., None]
    joint = ((xo % blockw) < 1.2) | ((ys % rowh) < 1.2)
    img[~joint] = c[~joint]
    img += noise(H, W, 25, 0.05)[..., None]
    save(name, img)

def plaster(name, wcm, hcm, ppc, base="#F3EEE4"):
    W, H = int(wcm*ppc), int(hcm*ppc)
    img = np.ones((H, W, 3)) * hexc(base) + noise(H, W, 30, 0.04)[..., None] + noise(H, W, 6, 0.02)[..., None]
    save(name, img)

def street(name, W=900, H=1100):
    # painted street view: sky, cream/pastel building facades with windows & balconies, a pavement
    img = np.zeros((H, W, 3))
    ys, xs = np.mgrid[0:H, 0:W]
    sky = hexc("#BFDDF0") * (1 - ys[..., None] / H * 0.3) + hexc("#F4E6CF") * (ys[..., None] / H * 0.3)
    img[:] = sky
    x = 0; k = 0
    cols = ["#E9D9BF", "#F1E3D3", "#D9C2A3", "#EADFC9", "#E6CBB5"]
    while x < W:
        bw = 180 + (k * 53) % 90; top = 120 + (k * 97) % 160
        c = hexc(cols[k % len(cols)])
        img[top:int(H*0.85), x:x+bw] = c
        for wy in range(top + 40, int(H*0.8) - 60, 120):
            for wx in range(x + 25, x + bw - 40, 60):
                img[wy:wy+70, wx:wx+32] = hexc("#7E95A6")
                img[wy:wy+70, wx+15:wx+17] = c * 0.9
                img[wy+70:wy+76, wx-6:wx+38] = hexc("#4E4A46")  # balcony rail
        img[top:top+8, x:x+bw] = c * 0.85
        x += bw + 6; k += 1
    img[int(H*0.85):, :] = hexc("#B9B4AA")
    img[int(H*0.85):int(H*0.86), :] = hexc("#8E8A84")
    # a tree and parked car silhouettes for life
    cy, cx = int(H*0.6), int(W*0.7)
    img[((ys-cy)/120)**2 + ((xs-cx)/90)**2 < 1] = hexc("#7FA866")
    img[cy:int(H*0.85), cx-6:cx+6] = hexc("#6B5640")
    img[int(H*0.80):int(H*0.86), 120:300] = hexc("#C8D4DE")
    img += noise(H, W, 20, 0.03)[..., None]
    save(name, img)

def rug(name, wcm, hcm, ppc):
    W, H = int(wcm*ppc), int(hcm*ppc)
    ys, xs = np.mgrid[0:H, 0:W] / ppc
    img = np.ones((H, W, 3)) * hexc("#E2C9A5")
    border = (xs < 10) | (xs > wcm - 10) | (ys < 10) | (ys > hcm - 10)
    img[border] = hexc("#B5713F")
    inner = (np.abs(xs - wcm/2) / (wcm/2 - 20) + np.abs(ys - hcm/2) / (hcm/2 - 20)) < 1
    img[inner & ~border] = hexc("#D9A86C")
    img += noise(H, W, 3, 0.05)[..., None]
    save(name, img)


# Phase B: bigger café (11 m x 8.4 m) — repaint the big surfaces at their new real size
bricks("tex_brick_back", 1100, 300, 2.4)
bricks("tex_brick_side", 843, 300, 2.6)
planks("tex_floor_wood", 1100, 843, 1.4)
print("phase b textures ok")
