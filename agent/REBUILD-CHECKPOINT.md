# UPDATE 2026-11-18 21:34: rebuild resumed and finished
- Both user-reported issues are fixed:
  - Diners: replaced by seated-on-chair meshes (`ChairDiner*.glb`). They face their table, with legs under it and hands or laptop on the table top.
  - Ingredients: inset 2.5 cm into a steel well with front and back rims.
- Food posters added (`Room/FoodPosters`). Globe pendants raised.
- Room checked from the counter, coffee bar and tables, looking up, down and into the corners. It is closed.
- Flow probe: 17/17 checks passed. `TEMP_Probe` and `WbwTempProbe.ts` were then deleted. The probe source is archived as `agent/staging/WbwTempProbe.ts.txt` (outside Assets).
- Project saved. The "Known issues" below are resolved unless noted.

# Realistic café rebuild: paused checkpoint (2026-11-18 19:19)

Project saved, TypeScript compiles, the Lens runs with no errors ("found 19 authored learnable objects", 19 of 19 vocab words).
Last timeline shot: `devpost/development-timeline/2026-11-18_1919_03_realistic-rebuild_paused-checkpoint.png`.

## Scene state
- Everything is authored in the Scene Hierarchy under `WordByWord / Cafe` (no runtime-spawned geometry).
- `TEMP_Probe` (root level, **disabled**) is a temporary test driver (`Assets/Scripts/WbwTempProbe.ts`). Its stages hide the setup panel and rotate/lift the café for screenshots. Delete the object and the script before shipping. Do not enable it for LEAF runs.
- `TEMP_CamRig` was deleted.

## Done (checklist from `agent/cafe-visual-brief.md`)
Room shell
- [x] Plank floor, checker floor under the coffee bar, whitewashed brick walls, limestone wall behind the pastry side, off-white ceiling (from the earlier pass)
- [x] Street-view windows on the right wall + 3 hanging plants (2 at the windows, 1 near the pastry side)
- [ ] Every corner / up / down checked from counter, coffee bar and a table. **Not done.** Only front views were checked.

Sandwich counter
- [x] Green tiled counter with a light stone top: `CounterModel` = `GeneratedMeshes/SandwichCounterTiled.glb` (top at 90 cm). It has a small sink and a green tap at the right end that comes with the mesh.
- [x] Glass sneeze guard (`SneezeGuard`: glass, rail, posts) + steel `IngredientWell` plate
- [x] 11 ingredients, each a mesh in `Learnable_<id>/Visual` (wrapper names unchanged; colliders come from WbwCafeBuilder at runtime)
- [x] Bread behind the containers (`BackBread_1` baskets, `BackBread_2` croissant board), `Tongs`, `Tongs_2`
- [x] `PhraseTray` with phrase cards lying on the counter, tilted toward the user; ingredients named by an offered phrase get the warm highlight (verified by state: `highlight=sonka,sajt,olivabogyo,uborka` at step 2)

Pastry display (left)
- [x] Glass case with cakes (`PastryCaseModel`)
- [x] `BreadStand` (wood + stone top) left of the case holding `Learnable_kenyer` (loaf) and `Learnable_szendvics` (sandwich)
- [x] `WallShelves` (2 wood shelves) with bread baskets, croissant board, cup stack, loaf
- [~] Chalkboard menu exists from the earlier pass. Text legibility is not re-checked.

Coffee area (right)
- [x] Red espresso machine on the new `CoffeeBarModel` (`GeneratedMeshes/CoffeeBarTiled.glb`, top at 90 cm, blue/white checker front: off-palette but accepted)
- [x] Learnables: `kave` (cup), `tej` (milk jug), `viz` (bottle), `kicsi`/`nagy` (same orange cup at 100 % / 144 %), `asztal` (high bar table)
- [x] `CupStacks` (cups + grinder), 4 `BarStool_N`
- [~] Neon "COFFEE" sign exists from the earlier pass. Food posters are **not done**.

Server
- [x] SPECS barista mesh (`ServerModel`) with scripted idle. No suitable rigged human was found in the Asset Library.

Seating and lounge
- [x] Plank tables, leather chairs, table cards unchanged. Diners at tables 2, 5, 7, 10. Table 7's diner was moved to the outer chair (it overlapped table 5's diner). Cups and a sandwich are on the diners' tables.
- [x] Lounge: mustard and olive sofas, rug, `LowTable` + cup, potted plants (lounge + 2 seating corners)

Lights
- [x] `Cafe/PendantLights`: 3 opal globe pendants over the counter, 4 copper/green-enamel cone pendants (pastry and coffee), 5 Edison bulb clusters over the seating. These are authored primitives with a warm unlit glow. The generated pendant meshes looked wrong and were rejected.
- [x] Existing warm point lights `WarmLight_Counter/Seating/Coffee` + key/ambient

UI and code changes in this pass
- `WbwSpatial.inView()`: the setup panel, toast and practice board now open where the user is actually looking (pitch clamped to ±30°). They used to open level with the eyes and could appear above the view.
- `WbwHudUI`: new inputs `offsetUpLookingDownCm` (7) and `lookDownDeg` (20). When the user looks down more than 20° (at the counter cards), the HUD sits just above the gaze so it doesn't cover the cards.

## In progress when paused
- The end-of-build flow probe (all 5 done-criteria) was about to start. The planned `flow` stage in `WbwTempProbe.ts` is not written yet. Stages that exist: `setup`, `wordcard`, `phrases`, `phrases2`, `practice`, `view:<Target>[:<Anchor>]`.

## Left to do (in order)
1. Fix the two user-reported issues (below).
2. Run the flow probe for all 5 criteria (setup → toast → menu; Learn card + save; Use it live through all 7 steps incl. table 4/8/12 + chime + "8 = nyolc"; Practice match + completion), then delete `TEMP_Probe` + `WbwTempProbe.ts`.
3. Check every corner, plus up and down views, from the counter, the coffee bar and a table (`view:<Target>:<Anchor>` probe stage). Re-check the neon and chalkboard text.
4. Optional polish: food posters, more decor on empty shelves, swap the tap or cover it, coffee-bar palette.
5. Recompile, RunAndCollectLogs, save. Timeline shots still missing: `03_realistic-rebuild_shell-textured` (an overview of the shell).

## Known issues
- **User-reported: diners sit wrongly.** They hover or perch on the seat edge, legs go through or past the chair, and some are turned sideways to the table. Fix per `Table_N/Diner`: rotate each to face the table centre and lower or move it so the hips sit on the seat (seat ≈ 44–46 cm). They are prefab instances `SeatedDiner*`, scale 100, currently at local (±56, 44, 0).
- **User-reported: some ingredient containers float above the counter.** The counter mesh was replaced by `SandwichCounterTiled.glb` (top re-measured at 90 cm). The containers' `Visual` sits at wrapper y-4 = 90 cm. Re-check in a close capture. If any still float, the pan mesh's base is above its AABB min (lettuce and olives are trays without a base). Lower that `Visual` by a few cm (do not move the `Learnable_` wrapper).
- `normalize_glb.js --target` behaves unexpectedly when re-run on an already-normalized GLB: the height scaled by (target/current)², not target/current. Workaround: measure the top surface with `agent/staging/topmap.py` and pass `sqrt(current × wanted)`.
- An externally modified GLB keeps stale prefab instances ("External changes detected in prefab"). Re-import under a new file name and re-instantiate (that is why the counters are named `*Tiled.glb`).
- The preview head pose drifts between runs: the user navigated it. The café re-centres on the head at start (`alignToUserPosition`).
- `MovePreviewCamera` is not available. Screenshots are framed with the probe's café rotate/lift hack. That hack is screenshot-only.

## Files outside the project
Copied into `agent/staging/`:
- `specs_batch.py`, `process_meshes.py`, `topmap.py`, `gen_textures.py`, `patch_rebuild.py`
- `mesh/*.json`: the SPECS request bodies, plus `jobs.json` and `urls.json`

The scripts still hard-code the old scratchpad path for `mesh/`, so point them at `agent/staging/mesh` if reused. All generated GLBs are already committed in `Assets/GeneratedMeshes/`. Nothing else is needed from the temp folder.
