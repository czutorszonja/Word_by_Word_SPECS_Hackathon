# One-off: add preview-image download to specs_batch.py poll + write the Phase B high-quality people prompts.
import json, os
D = os.path.dirname(os.path.abspath(__file__))
os.chdir(D)
s = open('specs_batch.py', encoding='utf-8').read()
if 'IMG_DIR' not in s:
    a = '''  const d = r.json || {{}};
  if (d.status === "succeeded" && d.asset_url) {{ urls[n] = d.asset_url; out[n] = "succeeded"; }}'''
    b = '''  const d = r.json || {{}};
  if (d.preview_image_url && !FS.exists(new Editor.Path(IMG_DIR + "/" + n + ".png"))) {{
    await new Promise<void>((res) => {{
      const q = new Network.HttpRequest(); q.url = d.preview_image_url; q.method = Network.HttpRequest.Method.Get;
      Network.performHttpRequest(q, (resp: any) => {{
        try {{ if (resp.statusCode === 200) FS.writeFile(new Editor.Path(IMG_DIR + "/" + n + ".png"), resp.body.toBytes()); }} catch (e) {{}}
        res();
      }});
    }});
  }}
  if (d.status === "succeeded" && d.asset_url) {{ urls[n] = d.asset_url; out[n] = "succeeded " + d.output_quality + "/" + d.preview_quality + "/" + d.reconstruction_quality; }}'''
    assert a in s
    s = s.replace(a, b)
    a = '''const urls: any = {{}};
const out: any = {{}};
for (const n of Object.keys(PENDING)) {{'''
    b = '''const urls: any = {{}};
const out: any = {{}};
const IMG_DIR = {json.dumps(MESH.replace(chr(92), "/") + "/preview_img")};
for (const n of Object.keys(PENDING)) {{'''
    assert a in s
    s = s.replace(a, b)
    open('specs_batch.py', 'w', encoding='utf-8').write(s)

NEG = "cartoon, pixar, disney, chibi, anime, caricature, exaggerated features, big eyes, big head, big nose, red nose, rosy cheeks, teeth, open mouth, grin, squinting, frown, angry, toy, figurine, clay, plastic, low poly, harsh shadows"
Q = {"output_quality": "standard", "preview_quality": "high", "reconstruction_quality": "high"}
ST = "Realistic 3D scanned person for architectural visualisation, natural adult proportions with a small head, natural even skin tone, small natural nose, calm relaxed face with a closed mouth, soft even lighting. "
SEAT = " Sitting upright on a simple wooden chair, thighs horizontal on the seat, knees bent ninety degrees, both feet flat on the floor, full body and the complete chair, single person."
bodies = {
    "BaristaHead": {"prompt": "Head and shoulders portrait bust of a friendly adult woman in her early 30s, realistic 3D scanned person for architectural visualisation, natural adult facial proportions, calm relaxed expression with a gentle closed-mouth smile, open eyes looking straight ahead, small natural nose, natural even skin tone, light brown hair tied back in a low bun, cream shirt collar and dark green apron straps over the shoulders, soft even studio lighting, front view, bust cut off below the shoulders", "negative_prompt": NEG + ", glasses, hat, full body, legs, arms, hands"},
    "BaristaFullHQ": {"prompt": ST + "A friendly woman barista in her early 30s standing upright, full body from head to shoes, arms relaxed at her sides, gentle closed-mouth smile, open eyes looking straight ahead, dark green canvas apron over a cream linen shirt with rolled sleeves, dark jeans, brown leather shoes, light brown hair tied back in a low bun, single person.", "negative_prompt": NEG + ", cropped, half body, bust, multiple people"},
    "ReaderHQ": {"prompt": ST + "A man in his 60s with grey hair and a short trimmed grey beard, navy wool sweater over a collared shirt, brown trousers, brown shoes, reading a folded newspaper held in both hands." + SEAT, "negative_prompt": NEG + ", table, cropped, multiple people"},
    "CoffeeHQ": {"prompt": ST + "An East Asian woman in her 40s with a straight black bob haircut, white blouse, beige trousers, black loafers, holding a white coffee cup with both hands in front of her chest." + SEAT, "negative_prompt": NEG + ", table, cropped, multiple people"},
    "LaptopHQ": {"prompt": ST + "A young Black woman in her 20s with short curly black hair, mustard yellow cardigan over a white t-shirt, dark jeans, white sneakers, typing on an open laptop resting on her lap." + SEAT, "negative_prompt": NEG + ", table, cropped, multiple people"},
    "ChattingHQ": {"prompt": ST + "A man in his 30s with short auburn hair and light stubble, green and navy checked flannel shirt, blue jeans, brown boots, hands resting on his knees, leaning slightly forward as if listening to a friend." + SEAT, "negative_prompt": NEG + ", table, cropped, multiple people, beard"},
    "ListeningHQ": {"prompt": ST + "A South Asian woman in her 50s with dark hair with a few grey streaks in a low bun, burgundy knit sweater, black trousers, black flat shoes, hands folded in her lap, gentle closed-mouth smile." + SEAT, "negative_prompt": NEG + ", table, cropped, multiple people"},
}
for n, v in bodies.items():
    v.update(Q)
    json.dump(v, open(f"mesh/{n}.json", "w", encoding="utf-8"))
p = open('process_meshes.py').read()
if '"BaristaHead"' not in p:
    p = p.replace('"BaristaScan4": ("max", 168),', '"BaristaScan4": ("max", 168), "BaristaHead": ("max", 60), "BaristaFullHQ": ("max", 168), "ReaderHQ": ("max", 128), "CoffeeHQ": ("max", 128), "LaptopHQ": ("max", 128), "ChattingHQ": ("max", 128), "ListeningHQ": ("max", 128),')
    open('process_meshes.py', 'w').write(p)
print("ok")
