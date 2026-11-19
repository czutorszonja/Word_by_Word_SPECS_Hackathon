# Flat-cartoon card illustrations matching Assets/Illustrations (dark-brown outline, soft fills).
# Run with Blender's bundled python (has numpy):  python.exe -I draw_ill.py <outdir>
import sys, os, struct, zlib
import numpy as np

S = 1024          # supersampled canvas
OUT = 256
OUTLINE = (90, 58, 40)
LW = 15.0         # outline width at S (~3.7 px at 256)
yy, xx = np.mgrid[0:S, 0:S].astype(np.float32) + 0.5


def circle(cx, cy, r):
    return np.hypot(xx - cx * 4, yy - cy * 4) - r * 4


def ellipse(cx, cy, rx, ry, ang=0.0):
    a = np.radians(ang)
    dx, dy = xx - cx * 4, yy - cy * 4
    u = dx * np.cos(a) + dy * np.sin(a)
    v = -dx * np.sin(a) + dy * np.cos(a)
    k = np.hypot(u / (rx * 4), v / (ry * 4))
    return (k - 1) * min(rx, ry) * 4


def rrect(cx, cy, w, h, r, ang=0.0):
    a = np.radians(ang)
    dx, dy = xx - cx * 4, yy - cy * 4
    u = np.abs(dx * np.cos(a) + dy * np.sin(a)) - (w / 2 - r) * 4
    v = np.abs(-dx * np.sin(a) + dy * np.cos(a)) - (h / 2 - r) * 4
    q = np.hypot(np.maximum(u, 0), np.maximum(v, 0)) + np.minimum(np.maximum(u, v), 0)
    return q - r * 4


def union(*ds):
    out = ds[0]
    for d in ds[1:]:
        out = np.minimum(out, d)
    return out


def inter(a, b):
    return np.maximum(a, b)


class Canvas:
    def __init__(self):
        self.rgb = np.zeros((S, S, 3), np.float32)
        self.a = np.zeros((S, S), np.float32)

    def paint(self, mask, col, alpha=1.0):
        m = np.clip(mask, 0, 1) * alpha
        c = np.array(col, np.float32)
        self.rgb = self.rgb * (1 - m[..., None]) + c * m[..., None]
        self.a = self.a * (1 - m) + m

    def shape(self, d, fill, outline=True):
        if outline:
            self.paint(np.clip(LW / 2 - d + 0.5, 0, 1), OUTLINE)
            self.paint(np.clip(-LW / 2 - d + 0.5, 0, 1), fill)
        else:
            self.paint(np.clip(-d + 0.5, 0, 1), fill)

    def save(self, path):
        f = S // OUT
        rgb = self.rgb.reshape(OUT, f, OUT, f, 3)
        a = self.a.reshape(OUT, f, OUT, f)
        aa = a.mean(axis=(1, 3))
        prem = (rgb * a[..., None]).mean(axis=(1, 3))
        col = np.where(aa[..., None] > 1e-4, prem / np.maximum(aa[..., None], 1e-4), 0)
        img = np.dstack([np.clip(col, 0, 255), np.clip(aa * 255, 0, 255)]).astype(np.uint8)
        raw = b''.join(b'\x00' + img[y].tobytes() for y in range(OUT))

        def chunk(t, dd):
            return struct.pack('>I', len(dd)) + t + dd + struct.pack('>I', zlib.crc32(t + dd) & 0xffffffff)
        open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', OUT, OUT, 8, 6, 0, 0, 0))
                               + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))


def salami(path):
    c = Canvas()
    for (cx, cy, r) in [(102, 150, 66), (156, 108, 70)]:
        c.shape(circle(cx, cy, r), (196, 62, 74))
        c.shape(circle(cx, cy, r - 9), (214, 84, 92), outline=False)
        for (dx, dy, rr) in [(-28, -20, 8), (10, -34, 7), (30, 4, 9), (-6, 18, 7), (-34, 22, 6), (22, 34, 7), (40, -22, 6), (-14, -2, 6)]:
            c.shape(circle(cx + dx * r / 70, cy + dy * r / 70, rr), (250, 228, 214), outline=False)
        c.shape(ellipse(cx - r * 0.35, cy - r * 0.5, r * 0.22, r * 0.09, -30), (240, 150, 150), outline=False)
    c.save(path)


def paprika(path):
    c = Canvas()
    body = union(ellipse(98, 150, 46, 66, 8), ellipse(158, 150, 46, 66, -8), ellipse(128, 160, 44, 70), ellipse(128, 106, 70, 34))
    c.shape(body, (226, 58, 46))
    c.shape(ellipse(96, 140, 10, 34, 10), (245, 120, 105), outline=False)
    c.shape(ellipse(126, 74, 40, 14), (88, 160, 62))
    c.shape(rrect(128, 50, 14, 34, 6, 12), (88, 160, 62))
    c.save(path)


def uborka_friss(path):
    c = Canvas()
    c.shape(ellipse(118, 112, 96, 34, -32), (82, 150, 62))
    for (dx, dy) in [(-50, 24), (-20, 4), (14, -14), (44, -36), (-34, -2), (2, -30), (30, 6)]:
        c.shape(ellipse(118 + dx, 112 + dy, 5, 3, -32), (150, 205, 110), outline=False)
    c.shape(ellipse(96, 104, 40, 7, -32), (130, 190, 95), outline=False)
    c.shape(circle(176, 176, 52), (82, 150, 62))
    c.shape(circle(176, 176, 42), (214, 240, 170), outline=False)
    c.shape(circle(176, 176, 22), (190, 225, 140), outline=False)
    for k in range(7):
        a = k * 2 * np.pi / 7
        c.shape(ellipse(176 + 15 * np.cos(a), 176 + 15 * np.sin(a), 5, 3, np.degrees(a)), (245, 250, 220), outline=False)
    c.save(path)


def mustar(path):
    c = Canvas()
    c.shape(rrect(128, 22, 22, 26, 4), (250, 240, 215))
    c.shape(rrect(128, 50, 50, 26, 6), (196, 112, 46))
    c.shape(rrect(128, 140, 96, 156, 22), (244, 192, 40))
    c.shape(rrect(128, 140, 96, 40, 0), (255, 232, 150), outline=False)
    c.shape(inter(rrect(128, 140, 96, 156, 22), union(rrect(128, 119, 96, 3, 0), rrect(128, 161, 96, 3, 0))), OUTLINE, outline=False)
    c.shape(ellipse(150, 140, 12, 9), (214, 160, 30), outline=False)
    c.shape(rrect(98, 96, 10, 40, 5), (255, 222, 120), outline=False)
    c.save(path)


if __name__ == "__main__":
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    salami(os.path.join(out, "szalami.png"))
    paprika(os.path.join(out, "paprika.png"))
    uborka_friss(os.path.join(out, "uborka_friss.png"))
    mustar(os.path.join(out, "mustar.png"))
    print("ok")
