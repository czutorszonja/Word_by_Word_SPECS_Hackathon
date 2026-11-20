// Swap the regenerated foods into the café (run with ExecuteEditorCode path=...).
// Old objects are disabled, not deleted, so the change can be reverted in the scene.
const model = pluginSystem.findInterface(Editor.Model.IModel);
const scene = model.project.scene;
const am = model.project.assetManager;
function find(objs: any[], name: string): any { for (const o of objs) { if (o.name === name) return o; const r = find(o.children, name); if (r) return r; } return null; }
const kid = (o: any, n: string) => o.children.find((c: any) => c.name === n);
function setT(o: any, p: number[] | null, r: number[] | null, s: number[] | null) { const lt = o.localTransform; if (p) lt.position = new vec3(p[0], p[1], p[2]); if (r) lt.rotation = new vec3(r[0], r[1], r[2]); if (s) lt.scale = new vec3(s[0], s[1], s[2]); o.localTransform = lt; }
function prefab(n: string): any { const m = am.getFileMeta(new Editor.Path("GeneratedMeshes/" + n + ".glb")); return m ? m.assets.find((a: any) => a.getTypeName() === "ObjectPrefab") : null; }
const NEED = ["PepperStrips", "MeatballsPile", "CroissantReal", "KakaosCsigaReal", "PogacsaReal"];
for (const n of NEED) if (!prefab(n)) return n + " not imported yet";
const log: string[] = [];
const copyT = (from: any, to: any) => { const a = from.localTransform, b = to.localTransform; b.position = a.position; b.rotation = a.rotation; b.scale = a.scale; to.localTransform = b; };
/** new instance of `pf` next to `old` with old's transform; old is disabled */
function swapLike(old: any, pf: string, name: string): any {
  const parent = old.getParent();
  const ex = kid(parent, name); if (ex) { old.enabled = false; return ex; }
  const o = scene.instantiatePrefab(prefab(pf), parent); o.name = name; copyT(old, o); old.enabled = false; return o;
}
const cafe = find(scene.rootSceneObjects, "Cafe");
const sc = kid(cafe, "SandwichCounter");
// ── loose foods in our steel pans: peppers and meatballs ──
for (const [id, pf] of [["paprika", "PepperStrips"], ["husgomboc", "MeatballsPile"]] as [string, string][]) {
  const V = kid(kid(sc, "Learnable_" + id), "Visual");
  kid(V, "Pan").enabled = true;
  const old = kid(V, "Scenes"); if (old) old.enabled = false;
  let food = kid(V, "Food");
  if (!food) { food = scene.instantiatePrefab(prefab(pf), V); food.name = "Food"; }
  setT(food, [0, 0.004, 0], [0, 0, 0], [0.92, 1, 0.78]);
  log.push(id + ": loose " + pf + " in the steel pan");
}
// ── pastry case ──
const gc = find([cafe], "GlassCase");
const boxMesh = find([cafe], "BreadStand").components.find((c: any) => c.getTypeName() === "RenderMeshVisual").mesh;
const steel = am.assets.find((a: any) => a.getTypeName() === "Material" && a.name === "Wbw_Steel");
function sheet(name: string, p: number[], s: number[]) { let o = kid(gc, name); if (!o) { o = scene.createSceneObject(name); o.setParent(gc); const v = o.addComponent("RenderMeshVisual"); v.mesh = boxMesh; v.mainMaterial = steel; } setT(o, p, [0, 0, 0], s); return o; }
// kakaós csiga: the new mesh is one row of three rolls -> two rows on a steel baking sheet
{
  const L = find([gc], "Learnable_kakaos_csiga"); const V = kid(L, "Visual");
  for (const c of V.children) if (c.name !== "Real" && c.name !== "Real2") c.enabled = false;
  for (const [nm, z, yaw] of [["Real", -0.07, 0], ["Real2", 0.07, 180]] as [string, number, number][]) {
    let o = kid(V, nm); if (!o) { o = scene.instantiatePrefab(prefab("KakaosCsigaReal"), V); o.name = nm; }
    setT(o, [0, 0.4, z * 100], [0, yaw, 0], [100, 100, 100]);
  }
  const lp = L.localTransform.position;
  sheet("CsigaTray", [lp.x, 93.2, lp.z], [40, 0.4, 30]);
  log.push("kakaós csiga: two rows on a steel sheet");
}
{ const V = kid(find([gc], "Learnable_pogacsa"), "Visual"); const old = V.children.find((c: any) => c.enabled && c.name !== "Real"); if (old) { swapLike(old, "PogacsaReal", "Real"); log.push("pogácsa swapped"); } }
{
  const top = find([gc], "KakaosCsiga_Top");
  if (top) {
    const nt = swapLike(top, "KakaosCsigaReal", "KakaosCsiga_TopReal");
    const p = nt.localTransform.position; setT(nt, [p.x, 113.8, p.z], [0, 0, 0], [85, 85, 85]);
    sheet("CsigaTopTray", [p.x, 113.6, p.z], [34, 0.4, 14]);
    log.push("top shelf csiga: one row on a sheet");
  }
}
let n = 0;
for (const pileName of ["CroissantPile", "ShelfCroissantPile"]) {
  const pile = find([cafe], pileName);
  for (const c of pile.children.slice()) if (/^Croissant_\d+$/.test(c.name) && c.enabled) { swapLike(c, "CroissantReal", c.name.replace("Croissant_", "CroissantReal_")); n++; }
}
log.push(n + " croissants swapped");
model.project.save();
return log;
