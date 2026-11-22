// Seat the Rocketbox diners at their tables (run with ExecuteEditorCode path=...).
// Expects Assets/People/Diner_<NAME>.glb imported. Old generated diners are disabled, not deleted (revertable).
// Table-local layout: chairs at x = ±50 facing the table centre; a guest on the left seat (x < 0) faces +X,
// on the right seat faces -X. "fwd" moves the pelvis toward the table, "lat" to the guest's right, "up" lifts.
// Each occupied chair keeps the vertical scale its guest was tuned on (sy) and moves/turns with the guest (lat, yaw
// about the chair origin, as tuned in rb_seat_test / rb_pair_test); empty chairs get CHAIR_SY.
const model = pluginSystem.findInterface(Editor.Model.IModel);
const scene = model.project.scene;
const am = model.project.assetManager;
function find(objs: any[], name: string): any { for (const o of objs) { if (o.name === name) return o; const r = find(o.children, name); if (r) return r; } return null; }
const kid = (o: any, n: string) => o.children.find((c: any) => c.name === n);
function setT(o: any, p: number[], r: number[], s: number[]) { const lt = o.localTransform; lt.position = new vec3(p[0], p[1], p[2]); lt.rotation = new vec3(r[0], r[1], r[2]); lt.scale = new vec3(s[0], s[1], s[2]); o.localTransform = lt; }
function prefab(path: string): any { const m = am.getFileMeta(new Editor.Path(path)); return m ? m.assets.find((a: any) => a.getTypeName() === "ObjectPrefab") : null; }

const CHAIR_SY = 0.88;
// name, table, side (-1 left / +1 right), params tuned in Blender (rb_seat_test.py), partner, leads
const GUESTS: any[] = [
  // 2026-11-22: younger guests in the café's style (learner feedback) — F07 + F08 at table 10, M09 at table 5
  { name: "F07", table: "Table_10", side: -1, fwd: 2.5, up: 3.4, sy: 0.935, lat: 14, yaw: 0, partner: "F08", leads: true },
  { name: "F08", table: "Table_10", side: 1, fwd: 3, up: 2.7, sy: 0.91, lat: 18, yaw: 0, partner: "F07" },
  { name: "M02", table: "Table_2", side: -1, fwd: -2, up: 1.5, sy: 0.86, lat: 0, yaw: 0 },
  { name: "M09", table: "Table_5", side: 1, fwd: 0, up: 0.5, sy: 0.85, lat: 0, yaw: 0 },
  { name: "F11", table: "Table_7", side: 1, fwd: 3, up: 3, sy: 0.87, lat: 22, yaw: 0 }, // 2026-11-22: lat 12→22, fwd 5→3 so her boots clear the base plate
];

const chairPf = prefab("GeneratedMeshes/LeatherChair.glb");
const scriptAsset = am.assets.find((a: any) => a.getTypeName() === "TypeScriptAsset" && a.name === "WbwDiner") || am.assets.find((a: any) => a.name === "WbwDiner");
if (!chairPf) return "LeatherChair prefab missing";
if (!scriptAsset) return "WbwDiner script asset missing";
const log: string[] = [];
const seating = find(scene.rootSceneObjects, "Seating");

// empty café chairs at the tables: a normal café seat height (cushion ~46 cm); occupied ones are set per guest below
for (const t of seating.children) for (const c of t.children) if (/^Chair[LR]$/.test(c.name)) { const lt = c.localTransform; lt.scale = new vec3(lt.scale.x, 100 * CHAIR_SY, lt.scale.z); c.localTransform = lt; }

const comps: any = {};
for (const g of GUESTS) {
  const table = kid(seating, g.table);
  if (!table) { log.push("no " + g.table); continue; }
  // retire the old generated figures on this side of the table
  // retire earlier guests on this seat (older Rocketbox guests replaced on 2026-11-22: F14, F02, M14)
  for (const c of table.children) {
    if (/^Guest_/.test(c.name) && c.name !== "Guest_" + g.name && Math.sign(c.localTransform.position.x) === g.side) c.enabled = false;
  }
  for (const c of table.children) {
    if (/^SeatedDiner/.test(c.name)) {
      const x = c.localTransform.position.x;
      if (Math.sign(x) === g.side || c.name === "SeatedDiner") c.enabled = c.enabled && Math.sign(x) !== g.side;
    }
  }
  const pf = prefab("People/Diner_" + g.name + ".glb");
  if (!pf) { log.push("Diner_" + g.name + ".glb not imported"); continue; }
  // seat frame: facing the table centre along X, turned by yaw (deg) about the chair origin
  const latZ = g.side < 0 ? g.lat : -g.lat; // along the table edge to the guest's right: +Z when facing +X, -Z when facing -X
  const baseYaw = g.side < 0 ? 90 : -90;   // guest root (+Z forward) turned to face the table
  const yaw = baseYaw + (g.yaw || 0);
  const r = yaw * Math.PI / 180;
  const fwdDir = new vec3(Math.sin(r), 0, Math.cos(r)); // the guest's forward in table space
  const chairName = g.side < 0 ? "ChairL" : "ChairR";
  let chair = kid(table, chairName);
  if (!chair) { chair = scene.instantiatePrefab(chairPf, table); chair.name = chairName; }
  // LeatherChair faces its local -Z: turn it 180 from the guest's root yaw
  setT(chair, [50 * g.side, 0, latZ], [0, yaw + 180, 0], [100, 100 * g.sy, 100]);
  const name = "Guest_" + g.name;
  let guest = kid(table, name);
  if (!guest) { guest = scene.instantiatePrefab(pf, table); guest.name = name; }
  setT(guest, [50 * g.side + fwdDir.x * g.fwd, g.up, latZ + fwdDir.z * g.fwd], [0, yaw, 0], [100, 100, 100]);
  const ap: any = find([guest], "Scene").components.find((c: any) => c.getTypeName() === "AnimationPlayer");
  if (ap) ap.autoplay = false;
  let sc: any = guest.components.find((c: any) => c.getTypeName() === "ScriptComponent");
  if (!sc) { sc = guest.addComponent("ScriptComponent"); sc.scriptAsset = scriptAsset; }
  sc.model = guest;
  sc.leads = !!g.leads;
  comps[g.name] = sc;
  log.push(`${g.name} at ${g.table} side ${g.side}: yaw ${yaw} lat ${latZ} up ${g.up} chair sy ${g.sy}`);
}
{ const t2 = kid(seating, "Table_2"); const cup = t2 ? kid(t2, "TableCup") : null; if (cup) { const lt = cup.localTransform; lt.position = new vec3(-12, lt.position.y, -24); cup.localTransform = lt; log.push("Table_2 cup moved clear of the hands"); } }
for (const g of GUESTS) if (g.partner && comps[g.name] && comps[g.partner]) comps[g.name].partner = comps[g.partner];
// an empty chair opposite a lone guest where the table has none (tables never look half-furnished)
for (const t of ["Table_7"]) {
  const table = kid(seating, t);
  if (table && !kid(table, "ChairL")) { const c = scene.instantiatePrefab(chairPf, table); c.name = "ChairL"; setT(c, [-50, 0, 0], [0, -90, 0], [100, 100 * CHAIR_SY, 100]); log.push(t + ": empty ChairL added"); }
}
model.project.save();
return log;
