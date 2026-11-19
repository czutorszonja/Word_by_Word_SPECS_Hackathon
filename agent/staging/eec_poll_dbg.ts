
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

const PENDING: any = {"DinerChatting": "8df61453-4c33-4df3-931c-2267c3bb210f", "DinerListening": "e3524ada-440c-4b77-9091-2c7d5c7fd965", "BaristaScan": "222190dd-c7b8-4732-83f2-8cc1e01e83a2", "ReaderScan": "857691a6-75d3-475f-93c7-439dc780fe7d"};
const URLS_PATH = new Editor.Path("C:/LensProjects/Word_by_Word_SPECS_Hackhaton/agent/staging/mesh/urls_new.json");
const urls: any = {};
const out: any = {};
for (const n of Object.keys(PENDING)) {
  const r = await send("GET", "/v1/generations/" + PENDING[n], {});
  const d = r.json || {};
  if (d.status === "succeeded" && d.asset_url) { urls[n] = d.asset_url; out[n] = "succeeded"; }
  else if (d.status === "failed" || d.status === "canceled") out[n] = d.status + ": " + d.error_message;
  else out[n] = JSON.stringify(d).slice(0, 400);
}
FS.writeFile(URLS_PATH, JSON.stringify(urls, null, 1));
return out;
