# Card illustrations for the entrance, menu board, pastry case and coffee station words (2026-11-19),
# in the same flat-cartoon style as draw_illustrations.py (dark-brown outline, soft fills, transparent).
# Run with Blender's bundled python (has numpy):
#   "C:/Program Files/Blender Foundation/Blender 5.0/5.0/python/bin/python.exe" -I draw_illustrations_2.py <outdir>
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from draw_illustrations import Canvas, circle, ellipse, rrect, union, inter, OUTLINE, xx, yy  # noqa: E402

WOOD, WOOD_D = (176, 120, 72), (140, 92, 54)
WHITE, CREAM = (248, 246, 240), (250, 242, 222)
WARM = (255, 214, 130)


def poly(pts):
    """Convex polygon (clockwise in image coords), approximate signed distance at the 4x canvas."""
    d = None
    n = len(pts)
    for i in range(n):
        (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
        ex, ey = (x1 - x0) * 4, (y1 - y0) * 4
        L = np.hypot(ex, ey)
        nx, ny = ey / L, -ex / L  # outward normal for clockwise order in y-down coordinates
        di = (xx - x0 * 4) * nx + (yy - y0 * 4) * ny
        d = di if d is None else np.maximum(d, di)
    return d


def ring(cx, cy, r, t):
    return np.abs(circle(cx, cy, r)) - t * 4


def erase(c, d):
    m = np.clip(-d + 0.5, 0, 1)
    c.a = c.a * (1 - m)


def steam(c, x0):
    for k, dx in enumerate([-14, 0, 14]):
        c.shape(rrect(x0 + dx, 30 + (k % 2) * 4, 6, 26, 3), (226, 226, 232), outline=False)


def door_frame(c):
    c.shape(rrect(128, 140, 124, 212, 6), WOOD_D)
    c.shape(rrect(128, 150, 100, 192, 3), WARM)


def sign(c, cx, cy, col):
    nail = (cx, cy - 42)
    for sx in (-1, 1):
        x1, y1 = cx + sx * 22, cy - 17
        L = np.hypot(x1 - nail[0], y1 - nail[1])
        ang = np.degrees(np.arctan2(y1 - nail[1], x1 - nail[0]))
        c.shape(rrect((nail[0] + x1) / 2, (nail[1] + y1) / 2, L, 3, 1.5, ang), OUTLINE, outline=False)
    c.shape(circle(nail[0], nail[1], 5), (200, 170, 90))
    c.shape(rrect(cx, cy, 76, 34, 8), col)
    c.shape(rrect(cx, cy, 48, 8, 4), WHITE, outline=False)


def nyitva(path):
    c = Canvas()
    door_frame(c)
    # the door stands open (seen at an angle): warm light inside
    c.shape(poly([(80, 56), (104, 70), (104, 232), (80, 244)]), (186, 128, 78))
    c.shape(rrect(150, 160, 40, 6, 3), (255, 236, 180), outline=False)
    sign(c, 156, 96, (84, 168, 92))
    c.save(path)


def zarva(path):
    c = Canvas()
    door_frame(c)
    c.shape(rrect(128, 150, 100, 192, 3), (186, 128, 78))
    c.shape(rrect(128, 112, 70, 64, 6), (166, 110, 66), outline=False)
    c.shape(rrect(128, 196, 70, 70, 6), (166, 110, 66), outline=False)
    c.shape(circle(164, 156, 7), (232, 196, 110))
    sign(c, 128, 96, (206, 72, 64))
    c.save(path)


def tejeskave(path):
    c = Canvas()
    c.shape(ellipse(128, 226, 78, 14), WHITE)
    c.shape(poly([(84, 52), (172, 52), (162, 224), (94, 224)]), (232, 238, 240))
    c.shape(poly([(90, 120), (166, 120), (161, 218), (95, 218)]), (190, 140, 96), outline=False)
    c.shape(poly([(88, 92), (168, 92), (166, 122), (90, 122)]), (226, 196, 160), outline=False)
    c.shape(poly([(86, 62), (170, 62), (168, 94), (88, 94)]), CREAM, outline=False)
    c.shape(rrect(102, 140, 6, 120, 3), (255, 255, 255), outline=False)
    c.shape(np.abs(poly([(84, 52), (172, 52), (162, 224), (94, 224)])) - 7, OUTLINE, outline=False)
    c.save(path)


def presszo(path):
    c = Canvas()
    c.shape(ellipse(128, 196, 96, 22), WHITE)
    c.shape(ellipse(128, 192, 66, 13), (232, 230, 224), outline=False)
    c.shape(ring(186, 150, 15, 5), WHITE)
    c.shape(union(poly([(78, 128), (178, 128), (166, 186), (90, 186)]), ellipse(128, 186, 38, 10)), WHITE)
    c.shape(ellipse(128, 128, 50, 13), (122, 72, 40))
    c.shape(ellipse(128, 127, 40, 9), (176, 116, 66), outline=False)
    steam(c, 128)
    c.save(path)


def forro_csoki(path):
    c = Canvas()
    c.shape(ring(184, 150, 22, 7), (200, 72, 66))
    c.shape(rrect(122, 156, 104, 120, 16), (200, 72, 66))
    c.shape(ellipse(122, 98, 52, 14), (110, 62, 40))
    for (dx, dy, r) in [(-26, -6, 18), (0, -16, 22), (26, -6, 18), (0, 2, 16)]:
        c.shape(circle(122 + dx, 92 + dy, r), CREAM)
    for (dx, dy) in [(-20, -14), (8, -26), (22, -8), (-4, -4), (14, -18)]:
        c.shape(circle(122 + dx, 92 + dy, 2.5), (120, 70, 44), outline=False)
    c.shape(rrect(96, 160, 10, 70, 5), (226, 110, 100), outline=False)
    c.save(path)


def repatorta(path):
    c = Canvas()
    c.shape(ellipse(128, 214, 100, 22), WHITE)
    # a slice: front face (layers) and top face (frosting)
    front = poly([(60, 120), (196, 150), (196, 206), (60, 176)])
    c.shape(front, (196, 120, 62))
    for (y0, h, col) in [(0, 10, CREAM), (24, 8, CREAM)]:
        c.shape(inter(front, poly([(60, 132 + y0), (196, 162 + y0), (196, 162 + y0 + h), (60, 132 + y0 + h)])), col, outline=False)
    for (x, y) in [(84, 160), (120, 172), (160, 182), (100, 190), (140, 196), (176, 196)]:
        c.shape(rrect(x, y, 7, 4, 2, 20), (236, 120, 40), outline=False)
    c.shape(poly([(60, 120), (150, 92), (226, 112), (196, 150)]), CREAM)
    for (x, y) in [(118, 112), (156, 118), (190, 114)]:
        c.shape(ellipse(x, y, 11, 7, 10), (160, 104, 56))
        c.shape(rrect(x, y, 2, 10, 1, 10), (120, 76, 40), outline=False)
    c.save(path)


def perec(path):
    c = Canvas()
    col, hi = (178, 98, 44), (214, 140, 76)
    arms = union(rrect(100, 176, 26, 92, 13, -38), rrect(156, 176, 26, 92, 13, 38))
    loops = union(ring(96, 108, 40, 13), ring(160, 108, 40, 13))
    body = union(loops, arms)
    c.shape(body, col)
    c.shape(union(ring(96, 104, 40, 4), ring(160, 104, 40, 4)), hi, outline=False)
    for (x, y) in [(70, 86), (96, 70), (122, 92), (150, 70), (178, 80), (196, 110), (60, 116), (112, 160), (146, 160), (88, 206), (168, 206)]:
        c.shape(rrect(x, y, 6, 5, 1, 30), WHITE, outline=False)
    c.save(path)


def kakaos_csiga(path):
    c = Canvas()
    c.shape(ellipse(128, 168, 104, 64), (196, 132, 64))
    c.shape(ellipse(128, 150, 104, 64), (232, 176, 96))
    # cocoa spiral seen from above (squashed)
    sx, sy = 1.0, 0.62
    dx, dy = (xx - 128 * 4) / sx, (yy - 150 * 4) / sy
    r = np.hypot(dx, dy) / 4
    th = np.arctan2(dy, dx)
    a = 26 / (2 * np.pi)
    k = np.round((r - a * (th + np.pi)) / (2 * np.pi * a))
    band = np.abs(r - a * (th + np.pi) - k * 2 * np.pi * a)
    spiral = (band - 4.5) * 4
    spiral = np.maximum(spiral, (r - 96) * 4)
    spiral = np.maximum(spiral, (6 - r) * 4)
    c.shape(spiral, (98, 54, 34), outline=False)
    c.shape(ellipse(96, 128, 24, 8, -20), (250, 214, 150), outline=False)
    c.save(path)


def pogacsa(path):
    c = Canvas()
    for (cx, cy, r) in [(84, 160, 44), (172, 160, 44), (128, 120, 48)]:
        c.shape(ellipse(cx, cy + 14, r, r * 0.55), (204, 150, 72))
        top = ellipse(cx, cy, r, r * 0.62)
        c.shape(top, (236, 184, 92))
        for k in range(-3, 4):
            c.shape(inter(ellipse(cx, cy, r - 6, r * 0.62 - 6), rrect(cx + k * 13, cy, 3, 2 * r, 1, 25)), (196, 132, 58), outline=False)
            c.shape(inter(ellipse(cx, cy, r - 6, r * 0.62 - 6), rrect(cx + k * 13, cy, 3, 2 * r, 1, -25)), (196, 132, 58), outline=False)
    c.save(path)


def carton(c, body, band):
    c.shape(poly([(88, 66), (128, 40), (168, 66)]), body)
    c.shape(rrect(128, 40, 70, 8, 3), body)
    c.shape(rrect(128, 148, 80, 168, 6), body)
    c.shape(rrect(128, 196, 80, 70, 0), band, outline=False)
    c.shape(np.abs(rrect(128, 148, 80, 168, 6)) - 6, OUTLINE, outline=False)
    c.shape(circle(146, 60, 10), (236, 236, 236))


def zabtej(path):
    c = Canvas()
    carton(c, (238, 222, 190), (250, 240, 214))
    c.shape(rrect(122, 150, 4, 70, 2, 8), (196, 150, 60), outline=False)
    for k in range(5):
        for s in (-1, 1):
            c.shape(ellipse(122 + s * 9 - k * 1.2, 124 + k * 12, 7, 4, s * 40), (220, 170, 70))
    c.save(path)


def mandulatej(path):
    c = Canvas()
    carton(c, (170, 210, 232), (240, 228, 206))
    for (x, y, a) in [(110, 120, -20), (146, 128, 25), (126, 160, 5)]:
        c.shape(ellipse(x, y, 16, 24, a), (176, 112, 66))
        c.shape(ellipse(x - 4, y - 6, 4, 10, a), (204, 146, 96), outline=False)
    c.save(path)


def kavedaralo(path):
    c = Canvas()
    c.shape(poly([(78, 30), (178, 30), (156, 104), (100, 104)]), (226, 236, 240))
    for (x, y) in [(104, 60), (126, 52), (150, 58), (114, 80), (138, 76), (126, 94), (98, 44), (158, 40), (130, 70)]:
        c.shape(ellipse(x, y, 7, 5, 30), (92, 54, 34), outline=False)
    c.shape(np.abs(poly([(78, 30), (178, 30), (156, 104), (100, 104)])) - 6, OUTLINE, outline=False)
    c.shape(rrect(128, 112, 70, 18, 4), (180, 186, 190))
    c.shape(rrect(128, 170, 84, 100, 10), (54, 54, 58))
    c.shape(circle(128, 150, 14), (180, 186, 190))
    c.shape(rrect(128, 200, 40, 10, 3), (180, 186, 190))
    c.shape(rrect(128, 226, 104, 12, 4), (40, 40, 44))
    c.save(path)


def csesze(path):
    c = Canvas()
    c.shape(ellipse(128, 204, 100, 22), WHITE)
    c.shape(ring(190, 150, 20, 6), WHITE)
    c.shape(union(poly([(66, 104), (190, 104), (176, 194), (80, 194)]), ellipse(128, 194, 48, 12)), WHITE)
    c.shape(ellipse(128, 104, 62, 15), (236, 234, 228))
    c.shape(inter(union(poly([(66, 104), (190, 104), (176, 194), (80, 194)]), ellipse(128, 194, 48, 12)), rrect(128, 130, 140, 10, 0)), (120, 170, 206), outline=False)
    c.save(path)


if __name__ == "__main__":
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for f in (nyitva, zarva, tejeskave, presszo, forro_csoki, repatorta, perec, kakaos_csiga, pogacsa, zabtej, mandulatej, kavedaralo, csesze):
        f(os.path.join(out, f.__name__ + ".png"))
    print("ok")
