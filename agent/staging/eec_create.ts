
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

const BODIES: any = {"Peppers": {"prompt": "realistic, warm and inviting, soft natural colors. A shallow open stainless steel deli food pan without a lid, heaped full of fresh sliced red and yellow bell pepper strips piled above the rim. Realistic food", "output_quality": "balanced", "negative_prompt": "lid, cover, table, counter, face, eyes, paper, cardboard"}};
const JOBS_PATH = new Editor.Path("C:/LensProjects/Word_by_Word_SPECS_Hackhaton/agent/staging/mesh/jobs.json");
const jobs: any = {"Server": "205cecbd-3dc1-44c3-b346-fca862ec4c9e", "EspressoMachine": "16de8cba-c18c-4301-9582-35d8dcd98e83", "SeatedDiner": "fbf5cb68-6cd3-4699-bd9c-af78ef0fa14d", "VelvetSofa": "c4e3474f-37c1-4c59-8409-cf083163b294", "SandwichCounter": "76148562-01d7-4f01-a195-cb5497ffdda0", "PastryCase": "026a5c56-e7fb-494d-a08b-d7439ef0d573", "SeatedDinerLaptop": "a7aee0e5-7d1b-4f24-8df5-3c30e10852ee", "SeatedDinerCoffee": "ee461d8b-7bff-4f3b-881a-c3219da519b5", "OliveSofa": "df689314-7c3c-4211-908a-2b0baa7e77a6", "CafeTable": "e1f9da6d-5468-4814-9ec9-c6a0f66a4a6d", "LeatherChair": "0a7f0008-0ac0-4574-83c8-e0a82ca1888b", "Ham": "87858520-d876-4e05-b103-68de7d214483", "Cheese": "fd30e87b-ee4c-4291-adca-d314a621ea76", "Chicken": "38d67038-17b2-463e-be94-3f92f8351673", "Meatballs": "c03c7e89-909d-4ff6-8612-77392cfd4735", "Lettuce": "30452a4c-0032-40c7-83fa-8aecc2874a31", "Spinach": "f8bbf371-f417-4dab-bac2-1e811467ba47", "Tomato": "f7649d14-12ec-44db-9885-64aa07496bb8", "Olives": "d4f6f535-e0a4-4f6b-a76d-ddc35b1b2bca", "SandwichCounterFlat": "23a29f06-4336-4942-bdf2-f7ab8a6cccfe", "Pickles": "548ccb44-1623-4e52-820a-f32eaa8abcd4", "Onion": "74195094-777f-4c13-8e1d-ea6343fb5e51", "Mayonnaise": "a6ad888a-77eb-4d07-a0b2-6be16db49615", "CoffeeBarCounter": "ea47c75a-7272-4a65-8cd6-f9ae0bce1216", "BreadLoaf": "3ac1c5d8-33af-42c4-bcbc-6e45bb5253dc", "CoffeeCup": "1c823081-d187-4346-bf30-20fc3e0955b7", "MilkJug": "4f1e5481-f600-4085-8986-bb0855a20269", "WaterBottle": "d1ea431e-5d10-40e3-a9f1-7fae758ac7fa", "Sandwiches": "dfade272-b131-44f4-a3cb-046124665acc", "OrangeCup": "0dc28d08-22b2-46c8-b4d7-feeff4158d0c", "BarTable": "b4768907-feef-4100-92cb-c307c0f0d2ea", "BarStool": "4f88078d-4b7d-45e1-9eb8-460755e5856e", "CupStacks": "bf7a9a76-02c5-4405-87da-0c3b25b5194d", "CroissantBoard": "2d41a3e0-9ead-448d-a0d8-27b2748b2ba5", "GlobePendant": "1da1705d-7d99-45e0-9e81-ca0053c339ab", "EdisonCluster": "74e68def-3f71-4d64-9d7e-9cd078a520f6", "PottedPlant": "a5970022-9638-4a8f-bb15-de6680c99dac", "HangingPlant": "d6a3b454-7798-4ee5-8eaa-b879f6f06cb5", "LowTable": "d0ee227d-7cc2-4e41-af54-9902fac32f49", "WallShelf": "b509f124-dffe-42a7-9d7e-74e23b1d58b8", "Tongs": "0cf7bd8d-9694-4656-b92b-582e50022252", "Mustard": "f3888daa-f0be-4e4c-a91a-f47d8753a719", "Salami": "bca4c63a-2f6f-4a18-8da1-a18b4cd20c45", "Cucumber": "be152d13-f4e3-40ce-ad71-a72cc35ba0f9"};
const out: any = {};
for (const n of Object.keys(BODIES)) {
  const r = await send("POST", "/v1/generations", BODIES[n]);
  if (r.code >= 200 && r.code < 300 && r.json && r.json.job_id) { jobs[n] = r.json.job_id; out[n] = "queued"; }
  else out[n] = "FAILED " + r.code + " " + r.txt;
}
FS.writeFile(JOBS_PATH, JSON.stringify(jobs, null, 1));
return out;
