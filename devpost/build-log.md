# Build log: Word by Word

The project's memory across chat sessions. Each session starts without the earlier conversations, so this file
records what was built, what went wrong, how it was solved, and what is still open. Read it together with
`design-brief.md` (what the product is, the learner's rules and the demo checklist), `development-timeline/README.md`
(screenshots per stage) and `git log` (every commit message says what changed and why).

**Update this file at the end of every working session.**

## The project in one paragraph

Word by Word is a Snap Specs Lens (Lens Studio 5.23, TypeScript, SIK + UI Kit, LEAF tests) for learning Hungarian
words where you use them. In the demo you stand in a Budapest bakery-café, point at things to see the Hungarian
and English word, tap to hear it, save it, reuse it in a sentence while ordering from the barista, choose a table
by its number, practise saved words in a matching game, and browse saved words by category, A–Z or date. On real
glasses the café and the people would be real life; the 3D café exists only for the preview demo. The product
is the learning layer.

## Timeline (stages match `development-timeline/`)

| Date | Stage | What happened |
|---|---|---|
| 11-17 | — | Project created for round 2, Devpost skill pack added |
| 11-18 | 01–05 | Design brief approved; first build in stand-in boxes with LEAF tests; panels reworked for readability (see-through "hole" fixed); placeholder tones replaced by Hungarian neural voices |
| 11-19 | 06–09 | Phase A mode colours (later softened); Phase B bigger café and varied people, Plain Studio preview backdrop; Phase C point-to-reveal, word card, reusable phrase helper, "say it"; Phase D story tour; re-layout (coffee bar service-only, window bar); Menu (demo) button, saved-words viewer; counter details, entrance with NYITVA/ZÁRVA, wall menu board, 13 new words |
| 11-20 | 12–15 | Visual audit fixes; realistic foods; details (brick, windows, lamps, plants); the barista replaced by a realistic rigged adult (Microsoft Rocketbox) |
| 11-21 | 16 | Five realistic seated guests, barista apron, hand-lettered chalk font, bigger phrase boxes, full walkaround and fixes (saved words fit the view, listen icons, Menu chip no longer covers panels); recording list completed |
| 11-22 | — | Younger guests (F07, F08, M09) built and seat-tested in Blender; brief clarified (café = demo stand-in) |
| 11-22 | 17 | Younger guests seated, hidden old people and 10 unused model files deleted; first whole-café screenshot set (dollhouse overviews, four inside corners, every walkaround spot); street windows show the café inside; gallery + shelves on the bare wall behind tables 8–12; caption as a subtitle under the barista's face, Menu button low-left (mode chip in Use it live), practice board at 65 cm; F11's boots off the table base; LEAF DC1–DC6 and TOUR_Story pass with no soft-check failures |
| 11-24 | 18 | Visual build timeline (`devpost/timeline/index.html`); a first try at coherent window views (six generated photos, rejected by the learner the same day) |
| 11-24 | 19 | One real street outside: a 360° street panorama (Poly Haven, CC0) around the café, windows as real openings; DC6 passes |
| 11-24 | 20 | The learner found that street too dark and not fitting; swapped for a sunny Palermo square (Piazza Bologni), turned so the window bar looks across the square |
| 11-24 | 21 | Photos still stood out next to the 3D café: replaced by a simple 3D street and park of our own, with things from the Street and Park word lists to spot outside; DC6 passes |
| 11-25 | 21 | The outside things became pointable words from earlier outings (review before going in; saved cards in Learn); new test DC7; DC2/3/6/7 pass. Timeline page: the three outside trials merged into one card |

## Problems we ran into and how they were solved

### Lens Studio itself
- **Freezes and crashes.** The laptop's RTX 3050 has 4 GB of graphics memory. Running several Blender renders while
  Lens Studio was open overloaded it: the NVIDIA driver logged "Graphics FECS Exception" errors at exactly those
  times (21 Nov 14:52–15:37, 22 Nov 02:57–03:01), Lens Studio hung (21 Nov 14:22) and crashed itself (21 Nov 14:29,
  fail-fast 0xc0000409). **Rule now: no Blender GPU renders while Lens Studio is open.** Lens Studio does use the
  NVIDIA card (checked in its log and in Windows graphics settings).
- **Preview stops ticking** when the Lens Studio window is minimized or the PC is locked: no prints, LEAF says
  "Failed to get scenario list after 600 attempts", screenshots time out. Restore the window first.
- **The preview resets about every 50 minutes** when Lens Studio refreshes the sign-in token; a LEAF run or a
  recording in progress is cut off. Start long runs right after a refresh.
- **Long "Not responding" periods after imports**: Lens Studio compresses new textures for minutes. Wait it out;
  import big models one at a time.
- **The preview backdrop falls back to the garden/patio "VirtualHands" scene** after a restart; switch it back to
  `PreviewStudio/Plain Studio`.
- **Lens Studio's tools for the agent connect only at session start**, and Lens Studio rewrites `.mcp.json` with
  a fresh key every launch. If it was closed when a chat session started, open it and start a new session.
  (`.mcp.json` is git-ignored; it holds a key.)
- **Never call Lens Studio over HTTP** (curl etc.): only its tools. One such attempt was blocked on 21 Nov.
- **Any editor change or recompile resets the preview, and the café re-anchors around wherever the preview camera
  is at that moment** (22 Nov: a recompile while the camera was up at a 25 m overview put the café in the air;
  the next screenshots were black). Reset the preview camera (`MovePreviewCamera reset`) before editing or
  recompiling, and re-read the `Cafe` transform before placing the camera by coordinates (café-local (x, z, h)
  -> world = cafePos + (z, h, -x) with the usual 90° turn).
- **The preview keeps running while Lens Studio is minimized** (22 Nov), but a window capture of a minimized
  window is a 391×61 strip. The story-tour screenshots were taken by a small watcher script that restores the
  window without focus, captures 1.8 s after each `beat` line in the log and minimizes it again.
- **Material changes made through the editor API are not always written to the `.mat` file** (24 Nov): the
  panorama materials showed the new texture in the preview while the files still pointed at deleted textures, so a
  restart would have lost it. After changing a material's texture by code, check the `.mat` file's `baseTex` id.
- **LEAF runs outlast the tool's time limit**: `run_leaf_scenario` reports a timeout but the scenario keeps
  running; read PASSED/FAILED from the log.
- **The Scene panel camera cannot be steered by the agent** (no editor API; desktop control was declined), so
  the wide views are dollhouse cutaways from the preview with the ceiling switched off for the shot.
- Smaller ones: an ES_ASSERT crash when many TypeScript files were reimported at once; creating materials by
  code failed ("Value is not a native object"), so materials are made by copying `.mat` files with new IDs (this
  leaves harmless "duplicate id" log warnings on reimport); Lens Studio signed out overnight once.

### The café
- **Toy-like generated props and people** (text-to-3D): foods regenerated with realistic prompts; every
  ingredient checked to sit in exactly one container (some meshes came with their own container, giving a pan in a
  pan); nothing floating; the barista first faced away from the customer.
- **Menu hit boxes rendered black**: hidden after sizing the colliders.
- **Repeated details** (same window view five times, same plant six times, flat globe lamps, mismatched brick over
  the door): fixed with a different photo per window, varied plants, glass globes, matching brick.
- **From the street the windows were black** (22 Nov, first facade shot): the outside glass was a near-black
  material, which reads as a hole and turns see-through on the additive display. Each street window now shows a
  view into the café captured from inside that window, with a faint sky reflection.
- **Every window showed a different place and season** (learner, 24 Nov): bare autumn trees, a summer park, the
  Danube from high up, photos with their own window frames. Replaced by six generated views from one shared
  description (Budapest, sunny late-spring morning, cream and ochre 19th-century buildings, plane trees): a leafy
  square on the window-bar side (windows 1–3), a tram street on the door side (windows 4–5 and the view through
  the door), each from its own angle, cropped free of baked-in frames and café tables. The generator only makes
  768×1344 portrait images, so one wide photo sliced per window was not possible. The view through the door was
  also enlarged and lowered so the far pavement, trees and tram sit at ground level behind the door.
- **...and six coherent photos were still six unrelated pictures** (learner, 24 Nov; the tram looked as if it would
  drive into the café). Final solution: one real 360° panorama of a Central European street corner in summer
  (Poly Haven "Zawiszy Czarnego", CC0, downloaded with the learner's OK, 8192×4096 tonemapped JPG) on a band of
  radius 20 m around the café (`WbwPanorama.ts`, latitudes +55°…−70°, two 4096 px halves, unlit, render order −100).
  The five window photos became real openings: depth-only panes (`Wbw_WindowOpening`, render order −50) drawn
  after the panorama and before the walls, so the wall behind each window is skipped and the panorama shows.
  Every window and the door now look at the same place from their own position; the door backdrop is gone; outside,
  the start point stands in a real street instead of a black void. The street-facing glass seen from outside was
  recaptured so it shows the current interior.
- **That street was too dark and did not fit** (learner, 24 Nov). Swapped for Poly Haven "Piazza Bologni"
  (sunny Palermo old-town square, cream and ochre facades, a café terrace, an olive tree; CC0, downloaded with the
  learner's OK), brightened a little when cut (gamma 0.85, ×1.08) so it sits with the bright café. Turned
  (headingOffsetDeg −60) so the window-bar side looks across the open square rather than at a close ground floor.
- **Any photo stands out next to the 3D café** (learner, 24 Nov: "it stands out from the rest, pls just build
  something simple"). Replaced the panorama with a small 3D street built by `agent/staging/eec_build_outside.ts`
  (idempotent, rebuilds `Cafe/Outside`): houses as boxes with generated cream/ochre facade textures, limestone
  pavement, asphalt road with lane marks and a zebra crossing, a painted muted lawn, and eight generated models
  (tram stop, traffic light, bicycle, car, bench, flower bed, fountain, tree). It also serves the story: outside,
  before going in, the learner can look left and right and see words from earlier outings (Street: megálló, lámpa,
  bicikli, autó, utca, járda, posta, gyógyszertár, bolt; Park: fa, pad, szökőkút, virág, fű, ösvény). The sky band
  (`WbwPanorama`) now carries a plain blue-to-pale gradient. Pitfalls: the generated models are centred on their
  origin (half sunk into the ground), so the builder lifts each one by its own mesh box (`mesh.info.aabbMin`);
  the café and car models came out chunky (car scaled to 350 cm); the lawn texture needed mipmaps on, or it
  shimmered; one long box per pavement stretches its texture, so keep slab-textured boxes short. The street-facing
  glass seen from outside was recaptured again. Lens Studio froze for ~10 minutes right after the build (it came
  back by itself at the hourly sign-in refresh), and once came back with `WbwPanorama` unbound until a forced
  recompile.
- **Words outside** (learner, 25 Nov: "make them words"). 15 things outside are `Learnable_<id>` objects for words
  saved on earlier outings (`WbwVocab.learnableWord` falls back to `EARLIER_WORDS`; ordering, practice and the saved
  list are untouched). With no mode picked (outside, before going in, or after "Later") pointing is a quiet
  review: only these words show a label and a pinch says the word (`pointMode "review"`, a label filter in the
  hover arbiter); in Learn their card shows "Saved ✓" without Use it live. Three snags: (1) the collider size came
  from the world bounding box but sits in the object's own axes, so with the café turned 90° a long object (road,
  bench) got length and depth swapped — now converted; (2) the label is placed just in front of its object, so a
  fountain 10 m away had its label hidden by nearer trees — labels now stay within 2.5 m (sized for that
  distance, so they look the same); (3) the café's own corner hides the park from the start spot, so the learner
  takes a few steps along the pavement to see it.
- **An empty-looking wall** (22 Nov, whole-café review): the 11 m wall behind tables 8–12 was bare brick. Added a
  gallery of three framed prints (generated: Chain Bridge photo, coffee-plant botanical, tram watercolour; the
  tram's destination board has made-up lettering, small at frame size) and two different wall shelves.

### The people
- **The generated people looked like toddler cartoons.** Replaced with Microsoft Rocketbox avatars (MIT licence,
  downloads approved by the learner): built in Blender (`agent/staging/rb_build_glb.py`), animated in the Lens by
  `WbwHumanRig` (idle/talk clips, nod, eye contact, blinks, mouth shapes) and `WbwDiner` (seated guests, glances,
  a chatting pair). Licences and credits in `licenses/`.
- **Seating them was the hard part.** Rocketbox's seated clips put feet through the pedestal table's base plate
  and hands above or into the table. Each guest was tuned with `rb_seat_test.py` (forward, lift, chair height,
  sideways shift) and several needed their legs re-posed; the chair has to move and turn with the guest. Our own
  test rig first had a bug (it overwrote the models' built-in offset: the chair sank into the floor and the person
  faced away).
- **Two guests at one small table collided under it** (legs crossing, a shoe sticking out). Solved by pairing two
  people whose legs angle to their own right so they sit diagonally (`rb_pair_test.py`).
- Known leftovers: hair-card edges look ragged in close-ups; long hair/ponytails move as one stiff piece in the
  leaning talk gesture. Not visible at normal viewing distance. (22 Nov: the shoes were checked low down at every
  table; only F11's boots stood on the base plate: she moved 10 cm sideways and 2 cm back, hands still on the
  table. Hair was left alone: the hair cards use alpha-to-coverage inside the imported models, and editing those
  embedded materials means unpacking the models, risky for little gain.)
- The learner's later feedback: the barista looked like "a finance bro" → canvas apron added; guests should be
  younger and suit the bohemian café → F07, F08, M09, seated on 22 Nov; the hidden old figures and their model
  files were deleted (learner-approved).

### The interface
- Panels with a see-through hole, colours too bright (cobalt/violet/magenta → soft powder blue, lavender,
  dusty rose), the phrase boxes hard to read at counter distance (enlarged twice), the saved-words viewer wider
  than the view (cut off), no visible way to listen to saved words (speaker icon added), the Menu (demo) chip
  covering the phrase box and the viewer's Back button (moved/hidden), "játszótér" shown with a toy-car icon.
- 22 Nov tour review: one shared upper-left spot for the Menu button covered the word card's word ("ıborka"),
  the practice board's title and the menu board's drinks → low-left in Learn/Practice (as the brief says), mid-left
  with a "Use it live" chip in Use it live, rising over the apron while looking down so it never hides "Kérek …".
  The barista's caption floated over the menu board → beside his head it ran off the narrow view → now a subtitle
  in front of his chest. The practice board could only move toward a seated user (57 cm) → it may now sit up to
  15 cm past the table centre, 65 cm away.

### Process
- Screenshots and commits were sometimes forgotten → now written into the design brief's "Working rules".
- Parallel helper agents sped up model building but caused the GPU overload above; they now run only while
  Lens Studio is closed.

## Screenshots of the space (index of `development-timeline/`)

File names start with date_time_stage. The preview shows the Specs field of view, so every shot is a slice of the room; there is no single whole-café image yet. Some files appear under two areas. Stage 16 (21 Nov) still shows the older guests at tables 5 and 10; the younger guests replace them next.

**Outside, entrance and door** (7)
- `2026-11-20_1017_12_fixes_door-from-inside-zarva.png`
- `2026-11-20_1017_12_fixes_entrance-outside.png`
- `2026-11-20_1125_14_details_door-lintel-inside.png`
- `2026-11-20_1125_14_details_entrance-planters.png`
- `2026-11-20_1125_14_details_entrance-wall-inside.png`
- `2026-11-21_1720_16_walkaround_door-zarva-from-inside.png`
- `2026-11-21_1720_16_walkaround_setup-at-the-door.png`

**Whole room and overviews** (9)
- `2026-11-18_1806_01_first-build-stand-in-shapes_counter-overview.png`
- `2026-11-18_2130_03_realistic-rebuild_shell-overview.png`
- `2026-11-19_0452_07_phase-b_room-overview.png`
- `2026-11-19_1338_07_phase-b_cut-line-fixed_start-view.png`
- `2026-11-19_1407_08_phase-d_tour_P7_cafe-view-end.png`
- `2026-11-19_1417_08_phase-d_tour_P7_cafe-view-end.png`
- `2026-11-21_1720_16_walkaround_back-to-counter-overview.png`
- `2026-11-21_1720_16_walkaround_seating-with-guests.png`
- `2026-11-21_1720_16_walkaround_table-10-from-the-aisle.png`

**Sandwich counter and ingredients** (14)
- `2026-11-18_1843_02_basic-flow_phrase-cards-on-counter.png`
- `2026-11-18_1850_03_realistic-rebuild_counter-ingredients.png`
- `2026-11-18_1917_03_realistic-rebuild_ordering-on-counter.png`
- `2026-11-18_2119_03_realistic-rebuild_containers-fixed.png`
- `2026-11-18_2130_03_realistic-rebuild_final_counter.png`
- `2026-11-18_2131_03_realistic-rebuild_final_ordering-on-counter.png`
- `2026-11-18_2238_05_ui-rework_phrase-prompt-on-counter.png`
- `2026-11-18_2309_05_ui-rework_live-compact_looking-at-counter.png`
- `2026-11-19_0006_06_phase-a_new-ingredients-counter.png`
- `2026-11-19_0451_07_phase-b_counter-from-start.png`
- `2026-11-20_1017_12_fixes_counter-containers.png`
- `2026-11-20_1100_13_foods_counter-pans.png`
- `2026-11-20_1205_15_people_barista-front-counter-distance.png`
- `2026-11-20_1205_15_people_barista-wide-counter.png`

**Barista** (15)
- `2026-11-18_1917_03_realistic-rebuild_server-close-up.png`
- `2026-11-18_2131_03_realistic-rebuild_final_server.png`
- `2026-11-18_2308_05_ui-rework_live-compact_looking-at-server.png`
- `2026-11-19_0036_07_phase-b_before_server-cartoon.png`
- `2026-11-19_0055_07_phase-b_rejected_barista-attempt1.png`
- `2026-11-19_0211_07_phase-b_rejected_barista-attempt2_smeared-face.png`
- `2026-11-19_0447_07_phase-b_faces-evidence_old-barista_4k-2k-1k-texture.png`
- `2026-11-19_0452_07_phase-b_cut-line-fixed_final-barista.png`
- `2026-11-19_0452_07_phase-b_faces-closeup_server.png`
- `2026-11-20_1205_15_people_barista-front-counter-distance.png`
- `2026-11-20_1205_15_people_barista-nod.png`
- `2026-11-20_1205_15_people_barista-talking.png`
- `2026-11-20_1205_15_people_barista-three-quarter.png`
- `2026-11-20_1205_15_people_barista-wide-counter.png`
- `2026-11-21_1720_16_walkaround_menu-board-chalk-font-barista-apron.png`

**Pastry case** (2)
- `2026-11-20_1017_12_fixes_pastry-case.png`
- `2026-11-20_1100_13_foods_pastry-case.png`

**Coffee station / coffee bar** (5)
- `2026-11-18_1902_03_realistic-rebuild_coffee-bar.png`
- `2026-11-18_2130_03_realistic-rebuild_final_coffee-bar.png`
- `2026-11-19_1432_09_relayout_coffee-bar-service-only.png`
- `2026-11-20_1017_12_fixes_coffee-station.png`
- `2026-11-21_1720_16_walkaround_coffee-station.png`

**Menu board, chalkboard, neon** (3)
- `2026-11-18_2127_03_realistic-rebuild_neon-chalkboard.png`
- `2026-11-20_1017_12_fixes_menu-board.png`
- `2026-11-21_1720_16_walkaround_menu-board-chalk-font-barista-apron.png`

**Seating, tables and guests** (24)
- `2026-11-18_1806_01_first-build-stand-in-shapes_seating.png`
- `2026-11-18_1839_03_realistic-rebuild_in-progress_seating-diners.png`
- `2026-11-18_1910_03_realistic-rebuild_seating-diners.png`
- `2026-11-18_2123_03_realistic-rebuild_diners-fixed.png`
- `2026-11-18_2131_03_realistic-rebuild_final_seating.png`
- `2026-11-19_0037_07_phase-b_before_diners-cartoon.png`
- `2026-11-19_0212_07_phase-b_rejected_diners-caricature.png`
- `2026-11-19_0447_07_phase-b_faces-evidence_new-diners-models.png`
- `2026-11-19_0451_07_phase-b_seating.png`
- `2026-11-19_0452_07_phase-b_faces-closeup_table2.png`
- `2026-11-19_0452_07_phase-b_faces-closeup_table5.png`
- `2026-11-19_0452_07_phase-b_faces-closeup_table7.png`
- `2026-11-19_0453_07_phase-b_faces-closeup_table10.png`
- `2026-11-19_1406_08_phase-d_tour_U14_table-8-nyolc.png`
- `2026-11-19_1416_08_phase-d_tour_U14_table-8-nyolc.png`
- `2026-11-19_1432_09_relayout_window-bar-seating.png`
- `2026-11-21_1720_16_walkaround_seating-with-guests.png`
- `2026-11-21_1720_16_walkaround_table-10-close.png`
- `2026-11-21_1720_16_walkaround_table-10-friends-chatting.png`
- `2026-11-21_1720_16_walkaround_table-10-from-the-aisle.png`
- `2026-11-21_1720_16_walkaround_table-2-guest.png`
- `2026-11-21_1720_16_walkaround_table-5-guest.png`
- `2026-11-21_1720_16_walkaround_table-7-guest.png`
- `2026-11-21_1720_16_walkaround_window-bar-and-guest.png`

**Lounge and window bar** (6)
- `2026-11-18_1911_03_realistic-rebuild_lounge.png`
- `2026-11-18_2131_03_realistic-rebuild_final_lounge.png`
- `2026-11-19_0451_07_phase-b_lounge.png`
- `2026-11-19_1432_09_relayout_window-bar-seating.png`
- `2026-11-21_1720_16_walkaround_lounge.png`
- `2026-11-21_1720_16_walkaround_window-bar-and-guest.png`

**Walls, windows, lamps, plants** (13)
- `2026-11-19_0128_07_phase-b_backdrop-before.png`
- `2026-11-19_0132_07_phase-b_backdrop-plain-studio.png`
- `2026-11-19_0427_07_phase-b_cut-line-before.png`
- `2026-11-19_0428_07_phase-b_cut-line-toprail-hidden.png`
- `2026-11-19_0429_07_phase-b_cut-line-fixed.png`
- `2026-11-19_0451_07_phase-b_walls-fixed.png`
- `2026-11-19_0452_07_phase-b_cut-line-fixed_final-barista.png`
- `2026-11-19_1338_07_phase-b_cut-line-fixed_start-view.png`
- `2026-11-20_1125_14_details_door-lintel-inside.png`
- `2026-11-20_1125_14_details_entrance-planters.png`
- `2026-11-20_1125_14_details_entrance-wall-inside.png`
- `2026-11-20_1125_14_details_globe-lamps.png`
- `2026-11-20_1125_14_details_right-wall-windows.png`

**Interface: setup, word card, labels** (21)
- `2026-11-18_1841_02_basic-flow_setup-panel.png`
- `2026-11-18_1842_02_basic-flow_word-card-olives.png`
- `2026-11-18_2235_05_ui-rework_word-card.png`
- `2026-11-18_2236_05_ui-rework_hover-vs-pressed.png`
- `2026-11-18_2240_05_ui-rework_setup-languages.png`
- `2026-11-19_0004_06_phase-a_setup-languages.png`
- `2026-11-19_0007_06_phase-a_learn-cobalt.png`
- `2026-11-19_0158_07_phase-b_soft-colours_learn.png`
- `2026-11-19_1404_08_phase-d_tour_A4_arrival-suggestion.png`
- `2026-11-19_1404_08_phase-d_tour_L1_look-around-markers.png`
- `2026-11-19_1404_08_phase-d_tour_L3_point-to-reveal-uborka.png`
- `2026-11-19_1404_08_phase-d_tour_L5_select-to-listen-card.png`
- `2026-11-19_1404_08_phase-d_tour_L8_save-saved-check.png`
- `2026-11-19_1414_08_phase-d_tour_A4_arrival-suggestion.png`
- `2026-11-19_1414_08_phase-d_tour_L1_look-around-markers.png`
- `2026-11-19_1414_08_phase-d_tour_L3_point-to-reveal-uborka.png`
- `2026-11-19_1414_08_phase-d_tour_L5_select-to-listen-card.png`
- `2026-11-19_1414_08_phase-d_tour_L8_save-saved-check.png`
- `2026-11-21_1720_16_walkaround_saved-words-listen-icons.png`
- `2026-11-21_1720_16_walkaround_setup-at-the-door.png`
- `2026-11-21_1720_16_walkaround_word-card.png`

**Interface: ordering (Use it live)** (19)
- `2026-11-18_1842_02_basic-flow_word-card-olives.png`
- `2026-11-18_1843_02_basic-flow_phrase-cards-on-counter.png`
- `2026-11-18_1917_03_realistic-rebuild_ordering-on-counter.png`
- `2026-11-18_2131_03_realistic-rebuild_final_ordering-on-counter.png`
- `2026-11-18_2238_05_ui-rework_phrase-prompt-on-counter.png`
- `2026-11-18_2308_05_ui-rework_live-compact_looking-at-server.png`
- `2026-11-18_2309_05_ui-rework_live-compact_looking-at-counter.png`
- `2026-11-19_0009_06_phase-a_live-violet.png`
- `2026-11-19_0201_07_phase-b_soft-colours_live.png`
- `2026-11-19_1405_08_phase-d_tour_U1_use-it-live-phrase-helper.png`
- `2026-11-19_1405_08_phase-d_tour_U3_use-this-word-szalami.png`
- `2026-11-19_1405_08_phase-d_tour_U4_add-es-combined-phrase.png`
- `2026-11-19_1405_08_phase-d_tour_U8_step2-say-it.png`
- `2026-11-19_1414_08_phase-d_tour_U1_use-it-live-phrase-helper.png`
- `2026-11-19_1415_08_phase-d_tour_U3_use-this-word-szalami.png`
- `2026-11-19_1415_08_phase-d_tour_U4_add-es-combined-phrase.png`
- `2026-11-19_1415_08_phase-d_tour_U8_step2-say-it.png`
- `2026-11-21_1720_16_walkaround_phrase-card-bigger.png`
- `2026-11-21_1720_16_walkaround_phrase-helper-bigger.png`

**Interface: practice** (9)
- `2026-11-18_1846_02_basic-flow_practice-board.png`
- `2026-11-18_2240_05_ui-rework_practice-board.png`
- `2026-11-19_0012_06_phase-a_practice-magenta.png`
- `2026-11-19_0203_07_phase-b_soft-colours_practice.png`
- `2026-11-19_1406_08_phase-d_tour_P5_practice-matching.png`
- `2026-11-19_1407_08_phase-d_tour_P6_practice-complete.png`
- `2026-11-19_1416_08_phase-d_tour_P5_practice-matching.png`
- `2026-11-19_1416_08_phase-d_tour_P6_practice-complete.png`
- `2026-11-21_1720_16_walkaround_practice-board.png`

**Interface: saved words** (1)
- `2026-11-21_1720_16_walkaround_saved-words-listen-icons.png`

**Tests (LEAF)** (2)
- `2026-11-18_2158_04_leaf-tests_results-panel.png`
- `2026-11-18_2205_04_leaf-tests_all-5-passed-rerun.png`

**Other** (5)
- `2026-11-18_1806_01_first-build-stand-in-shapes_lens-studio.png`
- `2026-11-18_1919_03_realistic-rebuild_paused-checkpoint.png`
- `2026-11-18_2218_05_ui-rework_before-panel-hole.png`
- `2026-11-18_2226_05_ui-rework_panel-hole-fixed.png`
- `2026-11-19_0447_07_phase-b_faces-evidence_new-head-reference-image.png`

**Whole café (stage 17, 22 Nov)**: `*_17_whole-cafe_*` has dollhouse overviews from three corners (ceiling hidden),
the four inside corners, the street facade, the door with NYITVA, just inside, counter wide/close, pastry case, coffee
station, menu board, seating from the counter, tables 2/5/7/10, the gallery wall, both new shelves, window bar, lounge,
back to the counter, ZÁRVA from inside. `*_17_tour_*`: 18 frames of the story tour after the placement fixes.
Not covered: a true Scene-panel wide shot (its camera can't be steered by the agent).

## Reflection notes for the demo (progress, easy, hard, what happened)

Use these when presenting. Picture pairs are in `development-timeline/` (search the file name).

**Progress you can show (before → after)**
- Café: stand-in boxes (`01_first-build-stand-in-shapes_counter-overview`) → realistic rebuild
  (`03_realistic-rebuild_final_counter`) → audited details (`14_details_*`) → full walkaround (`16_walkaround_back-to-counter-overview`).
- People: cartoon barista and diners (`07_phase-b_before_server-cartoon`, `07_phase-b_before_diners-cartoon`,
  `07_phase-b_rejected_*`) → realistic barista (`15_people_barista-*`) → apron and real seated guests (`16_walkaround_*`).
- Interface: first panels with a see-through hole (`05_ui-rework_before-panel-hole`) → bright mode colours
  (`06_phase-a_*`) → soft colours (`07_phase-b_soft-colours_*`) → bigger, readable phrase boxes (`16_walkaround_phrase-*`).
- Flow: the story tour from arrival to practice (`08_phase-d_tour_*`), all LEAF tests passing (`04_leaf-tests_*`).

**What was easy (or easier than expected)**
- The learning logic itself: point → word → listen → save → reuse in a sentence → practise worked early and stayed
  stable; LEAF tests caught regressions every time the scene changed.
- Generated Hungarian voices: one script made all 145 clips under stable names, so swapping in human recordings
  later needs no code change.
- Once a pipeline existed (Rocketbox → Blender → Lens), adding more people was mostly mechanical.

**What was hard**
- Making it look real, not like a game: generated 3D props and people looked toy-like; every area needed several
  rounds (containers, floating items, repeated details, faces).
- People: faces that are comfortable to look at needed real scanned/rigged avatars; seating them believably at a
  small pedestal table (hands on the table, feet clear of the base, two people not colliding) took the most tuning.
- Readability on a narrow see-through display: panels and phrase boxes had to be enlarged repeatedly, and floating
  buttons kept covering other panels.
- Tool stability: Lens Studio froze or crashed under GPU load, paused when minimized, and reset its preview every
  ~50 minutes; long automated test runs had to be timed around that.

**What happened / lessons**
- Design decisions changed with feedback: pinch-only answers became saying it out loud; phrase cards moved onto the
  counter; colours were softened; the café grew (entrance, menu board, coffee station); people were replaced twice.
- Running many helper agents in parallel was fast but overloaded the laptop's graphics card and crashed Lens Studio:
  heavy rendering now happens only while Lens Studio is closed.
- Screenshots and commits were sometimes forgotten until they became written rules in the design brief.
- Chat sessions don't share history; this build log is the shared memory.
- Clarified late: the café and people only stand in for real life in the demo; the product is the learning layer.

## Open items (as of 22 Nov, end of the stage-17 session)
**Next:**
1. The learner looks through the stage-17 screenshots (whole café first) and says what still feels off.
2. The longest caption ("Hányas asztalnál ül?" + "What's your table number? (Turn around: tap an empty table's
   number.)") spans the whole view width at counter distance: readable, but it touches both edges; shorten the
   English or let it wrap.
3. "Duplicate id" warnings: the older hand-made materials no longer warn; the five materials added on 22 Nov
   (Wbw_WindowInterior4/5, Wbw_Art*) report a duplicate of their own id on reimport (the same harmless
   self-duplicate). Check after the next Lens Studio restart whether it is gone.

**Polish (small, optional):**
4. Hair-card edges look ragged up close; long hair/ponytails are stiff in the talk lean (needs Blender, with Lens
   Studio closed).
5. The tram watercolour's destination board has made-up lettering (generated image); regenerate if it bothers.
6. From the street the café is a single-storey box between taller houses (24 Nov: the black sky is gone; a sky
   gradient and a simple 3D street now surround it; on 25 Nov its things became pointable words from earlier
   outings). Next (learner, 25 Nov): make the word cards and labels calmer and easier to read, with less on each.

**Before submitting:**
7. The learner records more human voice clips, same file names (`audio-recording-list.md`, 145 clips).
8. Record the demo video (under 3 minutes) right after a sign-in refresh (every ~50 min; the log says "Next OAuth
   token refresh"), make the repo public, submit.
