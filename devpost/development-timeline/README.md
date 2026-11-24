# Development timeline: Word by Word

Screenshots taken during the build, for the project's development timeline.
They show how the café Lens changed from first stand-in shapes to the finished scene.

File names: `<date>_<time>_<step>_<what it shows>.png`, so they sort in build order.

**Visual timeline:** [`../timeline/index.html`](../timeline/index.html) shows the build stage by stage (18–24 Nov; the page numbers the stages 1–17 in order, the file names keep their original numbers), one card per stage with what changed and its best screenshots (63, cropped to the Specs view); open it in a browser and click a picture to enlarge it.

| Stage | What to expect |
|---|---|
| 01 | Blocky first build: the café made of simple boxes and cylinders (stand-in shapes) |
| 02 | Basic flow working: setup panel, toast, Learn, Use it live, Practice |
| 03 | Realistic rebuild: generated 3D props, textured room, realistic server |
| 04 | LEAF test runs |
| 05 | UI rework: readable panels, the see-through "hole" fixed, button states |
| 06 | Phase A: first mode colours and the new sandwich ingredients |
| 07 | Phase B: bigger café, realistic and varied people, black "Plain Studio" preview backdrop, cut line fixed, soft mode colours |
| 08 | Phase D: the story tour following the learner's storyboard (arrival → point to reveal → listen → save → Use it live → reuse the phrase → order → table 8 → practice). The 14:04 set is the first run; the 14:14 set is after moving the hover label above the tray |
| 09 | Re-layout from the Lens Studio AI's proposal: the coffee bar service-only, a window bar for seating |
| 12 | Clean-up after a visual audit: every ingredient in exactly one container (no pan inside a pan), nothing floating, the clear pastry case with the cake under a dome, the coffee station on the same counter, the entrance (NYITVA outside, ZÁRVA inside) and the wall menu board |
| 13 | Realistic replacements for the toy-looking foods: loose pepper strips and meatballs in steel pans, spiral kakaós csiga on baking sheets, flaky croissants, pogácsa in a basket |
| 14 | Details: brick above the door matching the wall, a different photo view in every window and through the door, glass-shaded globe lamps, varied plants (snake plant, monstera, olive tree, box balls outside, a succulent on the counter) |
| 15 | Real-looking people, starting with the barista: the generated cartoon figure replaced by a textured, rigged adult (Microsoft Rocketbox, MIT) who breathes, gestures and moves his mouth while talking, blinks, keeps eye contact and nods when the learner answers. Checked at counter distance, front and three-quarter |
| 16 | Full walkaround after the 2026-11-21 feedback: five real seated guests (two friends chatting at table 10), the barista in a canvas apron, hand-lettered chalk menu (Kalam), bigger phrase boxes and cards, the saved-words list with a listen icon on every word, the Menu chip moved out of the way |
| 17 | 22 Nov: the younger guests seated (F07 + F08 chatting at table 10, M09 at table 5) and the hidden old people deleted; the first whole-café set — dollhouse overviews with the ceiling hidden, the four inside corners and every walkaround spot; the street windows now show the café inside instead of black glass; a gallery of three framed prints and two shelves on the bare wall behind tables 8–12. The `_17_tour_` frames are the story tour after the placement fixes: the barista's caption as a subtitle under his face (off the menu board), the Menu button low-left (with a Use it live chip that rises above the phrase), the practice board at 65 cm |
| 18 | 24 Nov: one coherent outside. Every window had shown a different city view and season (bare autumn trees, a summer park, the Danube from high up, photos with their own window frames). Now the window-bar side looks onto one leafy square and the door side onto one tram street, all on the same sunny late-spring morning, each window from its own angle; the view through the door is the same street at a believable scale. Replaced the same day by stage 19 |
| 19 | 24 Nov: one real street outside. The learner found the six generated photos still unrelated (and the tram seemed to drive into the café). A real 360° street panorama (Poly Haven "Zawiszy Czarnego", CC0) now wraps around the café, and the windows are real openings, so every window and the door show the same street corner from their own position and the view shifts as you move; outside, the start point stands in that street instead of a black void |

`capture-lens-studio.ps1` is the helper that saves a PNG of the Lens Studio window into this folder.
