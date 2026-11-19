
const API_BASE = "https://api.specs.com/v1/inference/text-to-3d";
const Network = await import("LensStudio:Network");
const FS = await import("LensStudio:FileSystem");
function send(method: string, path: string, body: any): Promise<any> {
  return new Promise((resolve) => {
    const r = new Network.HttpRequest();
    r.url = API_BASE + path;
    r.method = method === "GET" ? Network.HttpRequest.Method.Get : Network.HttpRequest.Method.Post;
    r.contentType = "application/json";
    r.headers = { Accept: "application/json" };
    if (method !== "GET") r.body = JSON.stringify(body);
    Network.performAuthorizedHttpRequest(r, (resp: any) => {
      let txt = ""; try { txt = resp && resp.body ? resp.body.toString() : "" } catch (e) {}
      let js: any = null; try { js = JSON.parse(txt) } catch (e) {}
      resolve({ code: resp ? resp.statusCode : 0, json: js, txt: txt.slice(0, 300) });
    });
  });
}
const auth = pluginSystem.findInterface(Editor.IAuthorization);
if (!auth || !auth.isAuthorized) { return { status: "NOT_SIGNED_IN" }; }

const PENDING: any = {"BaristaMan_1": "18b8210f-6e7d-49b1-a7ed-75c69acfa78d", "PicklesWhole_1": "0a19ccbe-aaea-4760-ba41-ca933b51d1da", "Perec_1": "2c8603fd-808f-474b-940c-ef0e7bdb34b3", "CarrotCake_1": "c47b7091-27d0-48c4-bbe9-e0166efa24d9"};
const URLS_PATH = new Editor.Path("C:/LensProjects/Word_by_Word_SPECS_Hackhaton/agent/staging/mesh/urls_new.json");
const urls: any = {};
const out: any = {};
const IMG_DIR = "C:/LensProjects/Word_by_Word_SPECS_Hackhaton/agent/staging/mesh/preview_img";
for (const n of Object.keys(PENDING)) {
  const r = await send("GET", "/v1/generations/" + PENDING[n], {});
  const d = r.json || {};
  if (d.preview_image_url) urls[n + "__img"] = d.preview_image_url;
  if (d.status === "succeeded" && d.asset_url) { urls[n] = d.asset_url; out[n] = "succeeded " + d.output_quality + "/" + d.preview_quality + "/" + d.reconstruction_quality; }
  else if (d.status === "failed" || d.status === "canceled") out[n] = d.status + ": " + d.error_message;
  else out[n] = (d.status || ("http " + r.code)) + " " + ((d.progress && d.progress.overall_percent) || 0) + "%";
}
FS.writeFile(URLS_PATH, JSON.stringify(urls, null, 1));
return out;
