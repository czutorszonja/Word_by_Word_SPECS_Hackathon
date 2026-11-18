# Emits ExecuteEditorCode scripts for SPECS text-to-3D batches (compact results).
#   python specs_batch.py create Name1 Name2 ...   -> TS that POSTs mesh/<Name>.json bodies, records job ids in jobs.json
#   python specs_batch.py poll                      -> TS that GETs every pending job, writes asset urls to urls.json
# Values are embedded with json.dumps (no hand-written TS consts).
import json, os, sys
D = os.path.dirname(os.path.abspath(__file__))
MESH = os.path.join(D, "mesh")
JOBS = os.path.join(MESH, "jobs.json")
URLS = os.path.join(MESH, "urls.json")

HEAD = r'''
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
'''

def create(names):
    jobs = json.load(open(JOBS)) if os.path.exists(JOBS) else {}
    bodies = {n: json.load(open(os.path.join(MESH, n + ".json"), encoding="utf-8")) for n in names}
    ts = HEAD + f'''
const BODIES: any = {json.dumps(bodies)};
const JOBS_PATH = new Editor.Path({json.dumps(JOBS.replace(chr(92), "/"))});
const jobs: any = {json.dumps(jobs)};
const out: any = {{}};
for (const n of Object.keys(BODIES)) {{
  const r = await send("POST", "/v1/generations", BODIES[n]);
  if (r.code >= 200 && r.code < 300 && r.json && r.json.job_id) {{ jobs[n] = r.json.job_id; out[n] = "queued"; }}
  else out[n] = "FAILED " + r.code + " " + r.txt;
}}
FS.writeFile(JOBS_PATH, JSON.stringify(jobs, null, 1));
return out;
'''
    return ts

def merge():
    newp = URLS.replace("urls.json", "urls_new.json")
    done = json.load(open(URLS)) if os.path.exists(URLS) else {}
    if os.path.exists(newp):
        done.update(json.load(open(newp)))
        json.dump(done, open(URLS, "w"), indent=1)
        os.remove(newp)

def poll():
    merge()
    jobs = json.load(open(JOBS))
    done = json.load(open(URLS)) if os.path.exists(URLS) else {}
    pending = {n: j for n, j in jobs.items() if n not in done}
    ts = HEAD + f'''
const PENDING: any = {json.dumps(pending)};
const URLS_PATH = new Editor.Path({json.dumps(URLS.replace(chr(92), "/").replace("urls.json","urls_new.json"))});
const urls: any = {{}};
const out: any = {{}};
for (const n of Object.keys(PENDING)) {{
  const r = await send("GET", "/v1/generations/" + PENDING[n], {{}});
  const d = r.json || {{}};
  if (d.status === "succeeded" && d.asset_url) {{ urls[n] = d.asset_url; out[n] = "succeeded"; }}
  else if (d.status === "failed" || d.status === "canceled") out[n] = d.status + ": " + d.error_message;
  else out[n] = (d.status || ("http " + r.code)) + " " + ((d.progress && d.progress.overall_percent) || 0) + "%";
}}
FS.writeFile(URLS_PATH, JSON.stringify(urls, null, 1));
return out;
'''
    return ts

if __name__ == "__main__":
    mode = sys.argv[1]
    ts = create(sys.argv[2:]) if mode == "create" else poll()
    path = os.path.join(D, f"eec_{mode}.ts")
    open(path, "w", encoding="utf-8").write(ts)
    print(path)
