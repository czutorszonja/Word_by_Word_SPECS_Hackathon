
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

const PENDING: any = {"ReaderHQ2": "f8fe5e23-c1f8-4a8a-8d21-02c9d2a02de9"};
const URLS_PATH = new Editor.Path("C:/LensProjects/Word_by_Word_SPECS_Hackhaton/agent/staging/mesh/urls_new.json");
const urls: any = {};
const out: any = {};
const IMG_DIR = "C:/LensProjects/Word_by_Word_SPECS_Hackhaton/agent/staging/mesh/preview_img";
for (const n of Object.keys(PENDING)) {
  const r = await send("GET", "/v1/generations/" + PENDING[n], {});
  const d = r.json || {};
  if (d.preview_image_url && !FS.exists(new Editor.Path(IMG_DIR + "/" + n + ".png"))) {
    await new Promise<void>((res) => {
      const q = new Network.HttpRequest(); q.url = d.preview_image_url; q.method = Network.HttpRequest.Method.Get;
      Network.performHttpRequest(q, (resp: any) => {
        try { if (resp.statusCode === 200) FS.writeFile(new Editor.Path(IMG_DIR + "/" + n + ".png"), resp.body.toBytes()); } catch (e) {}
        res();
      });
    });
  }
  if (d.status === "succeeded" && d.asset_url) { urls[n] = d.asset_url; out[n] = "succeeded " + d.output_quality + "/" + d.preview_quality + "/" + d.reconstruction_quality; }
  else if (d.status === "failed" || d.status === "canceled") out[n] = d.status + ": " + d.error_message;
  else out[n] = (d.status || ("http " + r.code)) + " " + ((d.progress && d.progress.overall_percent) || 0) + "%";
}
FS.writeFile(URLS_PATH, JSON.stringify(urls, null, 1));
return out;
