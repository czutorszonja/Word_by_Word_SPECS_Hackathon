// Build the simple street + park outside the café (run with ExecuteEditorCode path=...). Idempotent:
// deletes and rebuilds the Cafe/Outside group. Café-local coordinates: the door wall is at x = -553
// (outside = -x), the café spans z -243..603; facing the door from the street, LEFT = -z, RIGHT = +z.
// Story (learner, 24 Nov): outside, before going in, the learner can look left and right and see things
// from the word categories saved on earlier outings — Street on the left and across the road
// (megálló, lámpa, bicikli, autó, utca, járda, posta, gyógyszertár, bolt), Park on the right
// (fa, pad, szökőkút, virág, fű, ösvény).
// Everything outside renders BEFORE the window openings (render order -80 < -50), so it shows through them.
const model = pluginSystem.findInterface(Editor.Model.IModel);
const scene = model.project.scene;
const am = model.project.assetManager;
function find(objs: any[], name: string): any { for (const o of objs) { if (o.name === name) return o; const r = find(o.children, name); if (r) return r; } return null; }
function setT(o: any, p: number[], r: number[], s: number[]) { const lt = o.localTransform; lt.position = new vec3(p[0], p[1], p[2]); lt.rotation = new vec3(r[0], r[1], r[2]); lt.scale = new vec3(s[0], s[1], s[2]); o.localTransform = lt; }
const mat = (n: string) => am.assets.find((a: any) => a.name === n && a.getTypeName() === "Material");
function prefab(path: string): any { const m = am.getFileMeta(new Editor.Path(path)); return m ? m.assets.find((a: any) => a.getTypeName() === "ObjectPrefab") : null; }

const cafe = find(scene.rootSceneObjects, "Cafe");
const old = cafe.children.find((c: any) => c.name === "Outside");
if (old) old.destroy();
const root = scene.addSceneObject(cafe); root.name = "Outside"; setT(root, [0, 0, 0], [0, 0, 0], [1, 1, 1]);
const kerbRef = find(scene.rootSceneObjects, "Kerb");
const box = kerbRef.components.find((c: any) => c.getTypeName() === "RenderMeshVisual").mesh;
const log: string[] = [];
function group(name: string) { const g = scene.addSceneObject(root); g.name = name; setT(g, [0, 0, 0], [0, 0, 0], [1, 1, 1]); return g; }
function part(parent: any, name: string, c: number[], s: number[], m: string, rotY: number = 0) {
  const o = scene.addSceneObject(parent); o.name = name; setT(o, c, [0, rotY, 0], s);
  const r = o.addComponent("RenderMeshVisual"); r.mesh = box; r.mainMaterial = mat(m);
  if (!r.mainMaterial) log.push("missing material " + m);
  return o;
}

// ── ground: pavements, kerbs, road (utca), markings, lawn (fű), path (ösvény) ──
const ground = group("Ground");
// the street runs ±35 m along z so neither end of it stops short in the sky
const Z0 = -3500, Z1 = 3500;
part(ground, "Pavement_Left", [-778, -1, (Z0 - 260) / 2], [444, 2, -260 - Z0], "Wbw_Limestone");
part(ground, "Pavement_Right", [-778, -1, (620 + Z1) / 2], [444, 2, Z1 - 620], "Wbw_Limestone");
part(ground, "Kerb_Left", [-1002, 6, (Z0 - 260) / 2], [8, 14, -260 - Z0], "Wbw_StoneTop");
part(ground, "Kerb_Right", [-1002, 6, (620 + Z1) / 2], [8, 14, Z1 - 620], "Wbw_StoneTop");
for (let i = 0; i < 10; i++) part(ground, "Road_" + i, [-1352, -1, Z0 + 350 + i * 700], [700, 2, 700], "Wbw_Asphalt");
for (let z = -3100; z <= 3100; z += 600) if (Math.abs(z + 1150) > 300) part(ground, "LaneDash", [-1352, 0.3, z], [12, 1, 300], "Wbw_Paper");
for (let i = 0; i < 7; i++) part(ground, "Zebra_" + i, [-1652 + i * 100, 0.3, -1150], [50, 1, 300], "Wbw_Paper");
part(ground, "Kerb_Far", [-1706, 6, 0], [8, 14, Z1 - Z0], "Wbw_StoneTop");
part(ground, "Pavement_Far", [-1852, -1, 0], [296, 2, Z1 - Z0], "Wbw_Limestone");
part(ground, "Lawn_Park", [472, -1, (620 + Z1) / 2], [2056, 2, Z1 - 620], "Wbw_Lawn");
part(ground, "Lawn_Back", [1026, -1, 60], [946, 2, 1120], "Wbw_Lawn");
part(ground, "Path", [-178, 0.4, 1240], [756, 1, 120], "Wbw_StoneTop");

// ── buildings: across the road (posta, gyógyszertár, bolt), next door on the left, at the back ──
const bld = group("Buildings");
// a continuous row across the road, alternating ochre / cream, slightly different heights
// (centres on multiples of 600 so the shop signs at z -600 / 0 / 600 sit in the middle of a house)
for (let z = -3600, k = 0; z <= 3600; z += 600, k++) {
  const h = [1000, 1050, 980, 1080][k % 4];
  part(bld, "Across_" + z, [-2152, h / 2, z], [300, h, 600], k % 2 ? "Wbw_FacadeCream" : "Wbw_FacadeOchre");
}
// our side of the street, to the left of the café
for (let k = 0; k < 5; k++) {
  const h = [1000, 1050, 980, 1080, 1020][k];
  part(bld, "NextDoor_" + k, [0, h / 2, -574 - k * 617], [1106, h, 618], k % 2 ? "Wbw_FacadeCream" : "Wbw_FacadeOchre");
}
// the row behind the park and the café
for (let z = -2600, k = 0; z <= 3400; z += 600, k++) part(bld, "Back_" + z, [1650, 500, z], [300, 1000, 600], k % 2 ? "Wbw_FacadeOchre" : "Wbw_FacadeCream");
// shop signs over the ground-floor windows across the road (they face the café, +x)
const signs = group("ShopSigns");
part(signs, "Sign_Posta", [-1999, 255, -600], [3, 55, 220], "Wbw_SignPosta", 180);
part(signs, "Sign_Gyogyszertar", [-1999, 255, 0], [3, 55, 260], "Wbw_SignGyogyszertar", 180);
part(signs, "Sign_Bolt", [-1999, 255, 600], [3, 55, 220], "Wbw_SignBolt", 180);

// ── things to recognise: street on the left, park on the right ──
const props = group("Props");
const P = "GeneratedMeshes/Outside/";
const items = [
  // name, glb, café-local position, rotY, longest side (cm)
  // (the generated meshes are centred on their origin; each one is lifted by its own mesh box below)
  ["Megallo_TramStop", "TramStop", [-930, 0, -620], 90, 280], // long side along the kerb
  ["Lampa_TrafficLight", "TrafficLight", [-965, 0, -990], 0, 300],
  ["Bicikli_Bicycle", "CityBicycle", [-605, 0, -470], 90, 175],
  ["Auto_Car", "CompactCar", [-1115, 0, 380], 180, 350], // mesh is long along z = along the road
  ["Pad_Bench", "ParkBench", [-420, 0, 930], 0, 180], // mesh is long along z = parallel to the street
  ["Virag_FlowerBed", "FlowerBed", [-400, 0, 700], 0, 200],
  ["Szokokut_Fountain", "SmallFountain", [-120, 0, 1520], 0, 220],
  ["Fa_Tree1", "ParkTree", [-330, 0, 1080], 0, 600],
  ["Fa_Tree2", "ParkTree", [300, 0, 1680], 120, 650],
  ["Fa_Tree3", "ParkTree", [-480, 0, 1780], 240, 560],
  ["Fa_Tree4", "ParkTree", [1150, 0, -60], 60, 620], // far enough back that it doesn't fill the window-bar panes
  ["Fa_Tree5", "ParkTree", [1120, 0, 470], 200, 580],
  ["Fa_Tree6", "ParkTree", [200, 0, 2500], 300, 620],
  ["Fa_Tree7", "ParkTree", [-420, 0, 2900], 30, 580],
  ["Fa_Tree8", "ParkTree", [900, 0, 2200], 150, 640],
] as any[];
for (const [name, glb, p, ry, size] of items) {
  const pf = prefab(P + glb + ".glb");
  if (!pf) { log.push("missing " + glb); continue; }
  const o = scene.instantiatePrefab(pf, props); o.name = name;
  let minY = 0;
  const lowest = (x: any) => { for (const c of x.components) if (c.getTypeName() === "RenderMeshVisual" && c.mesh) minY = Math.min(minY, c.mesh.info.aabbMin.y); for (const k of x.children) lowest(k); };
  lowest(o);
  setT(o, [p[0], p[1] - minY * size, p[2]], [0, ry, 0], [size, size, size]);
}

// ── render order: everything outside (and the entrance pavement/planters) before the window openings ──
let n = 0;
function order(o: any, v: number) { for (const c of o.components) if (c.getTypeName() === "RenderMeshVisual") { (c as any).renderOrder = v; n++; } for (const k of o.children) order(k, v); }
order(root, -80);
order(find(scene.rootSceneObjects, "Entrance"), -80);
for (const m of ["Wbw_PanoA", "Wbw_PanoB"]) { const mm: any = mat(m); if (mm) (mm.passInfos[0] as any).depthWrite = false; }
model.project.save();
log.push(`Outside built: ${root.children.length} groups, render order set on ${n} visuals`);
return log;
