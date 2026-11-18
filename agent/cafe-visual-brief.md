# Word by Word café: visual brief and build checklist

This is the plan for rebuilding the café and the server. Please correct anything before the build starts.

It is based on the six photos in `devpost/references/` (01 seating/lounge, 02 stone bakery counter, 03 green-tile counter and plank tables, 04 pastry counter with globe lights, 05 neon coffee bar, 06 red espresso corner) and on the design brief.

## Look and mood
A warm, cosy, slightly retro European bakery-café: lived-in, golden afternoon light, glossy green tiles, whitewashed brick, honey-coloured wood, lots of plants and pastries. Never sterile and never dark.

## Palette (mid-to-light versions for the see-through Specs display)
| Use | Hex | From |
|---|---|---|
| Glossy counter tiles (brighter than the photos' #1F4D38) | `#2F6B4F` | 02, 03, 04 |
| Light stone / marble counter tops | `#D9D4C7` | 02, 03 |
| Whitewashed brick walls | `#EEE9DF` | 03, 04 |
| Warm limestone feature wall (pastry side) | `#D8C4A0` | 02 |
| Honey wood (shelves, boards, plank tables, floor) | `#B98A5E` | 01, 03 |
| Tan leather (chairs, bar-stool seats) | `#B5713F` | 03, 05 |
| Espresso-machine red | `#D83A2E` | 06 |
| Mustard velvet sofa | `#C9A040` | 01 |
| Olive-green velvet sofa | `#8FA25A` | 01 |
| Neon pink-red ("COFFEE") | `#FF5A6A` | 05 |
| Checker floor, light / dark (dark kept mid-grey, never black) | `#F4F1EA` / `#55565C` | 05, 06 |
| Warm light glow (globes, Edison bulbs) | `#FFD99A` | 01, 03, 04 |
| Cream cups, accent orange cups | `#F6F1E4` / `#E8873A` | 05, 06 |

Avoid large near-black areas, such as the dark ceiling in photo 01. On the glasses they turn see-through. The ceiling will be warm off-white.

## Materials
- Glossy glazed subway tiles (vertical stack like 04, staggered like 02/03) with darker grout.
- Honed light stone and marble tops.
- Whitewashed painted brick on the main walls, plus one warm rough limestone wall (02).
- Honey-oak planks for floors and shelves, and rustic plank table tops on steel legs (03).
- Tan leather, mustard velvet and olive velvet upholstery.
- Chrome and steel on the espresso machine, grinders and milk jugs.
- Glass for the pastry display case.
- Matte ceramic cups, kraft-paper coffee bags, wicker bread baskets, terracotta and white plant pots.

## Light
- Warm, golden late-afternoon key light coming in through big windows on one side (01).
- Opal globe pendants over the counter (04), copper and enamel pendants over the pastry side (03, 06), and Edison-bulb clusters over the seating (01).
- Real warm light sources (a warm key, a dim fill, and point lights at the pendants), not only glowing shapes.
- Soft, warm ambient light; no harsh pure-white light.

## Areas and objects: checklist
Each item gets ticked against a Preview capture at the end. **[M]** = generated textured mesh (SPECS text-to-3D). **[S]** = textured shell surface (only floors, walls and ceiling stay geometry).

### Room shell (fully closed, no background showing)
- [ ] [S] Wooden plank floor in the seating area; checker floor under the coffee bar
- [ ] [S] Whitewashed brick back and side walls; warm limestone section behind the pastry display
- [ ] [S] Warm off-white ceiling; walls overlap at the corners with no seams
- [ ] [M] Big bright windows with a street-view picture behind them (02 shows a street with balconies); hanging plants in front
- [ ] Every corner, plus up and down views, checked from the counter, the coffee bar and a table

### Sandwich counter (front edge 100 cm ahead, 90 cm high)
- [ ] [M] Deep-green glossy tiled counter with a light stone top (curved end like 02)
- [ ] [M] Glass sneeze guard and a row of steel ingredient containers
- [ ] [M] Ingredients, one mesh each, at real size: ham, cheese, chicken, meatballs, lettuce, spinach, tomato, olives, pickles, onion, mayonnaise
- [ ] [M] Bread loaves behind the containers (decor only, not a choice)
- [ ] [M] Tongs (never highlighted)
- [ ] Each ingredient stays inside its `Learnable_<id>` wrapper (same name, same collider)

### Pastry display (left)
- [ ] [M] Glass display case with cakes and tarts (04)
- [ ] [M] Wooden boards of croissants, cinnamon rolls and loaves (02, 03, 04)
- [ ] [M] Bread loaf (`Learnable_kenyer`) and sandwiches (`Learnable_szendvics`)
- [ ] [M] Wooden wall shelves with bread baskets, coffee bags, jars and small plants (02, 03, 04)
- [ ] [M] Framed chalkboard menu with legible chalk text

### Coffee area (right)
- [ ] [M] Red retro espresso machine as the eye-catcher (06)
- [ ] [M] Stacks of white and orange cups (decor), plus grinders
- [ ] [M] Learnables: coffee cup (`kave`), milk jug (`tej`), water bottle (`viz`), small and large cups (`kicsi`, `nagy`)
- [ ] [M] Bar stools with tan leather seats (05)
- [ ] [M] High bar table (`Learnable_asztal`)
- [ ] White tile wall with a pink-red neon "COFFEE" sign (05); a few framed food posters (06)
- [ ] [S] Checker floor under the bar

### Server (about 150 cm across the counter, facing the user)
- [ ] First choice: a rigged realistic or stylised human from the Lens Studio Asset Library, with an idle animation. Fallback: a SPECS text-to-3D barista (cream shirt, green apron, hair in a bun, natural proportions) with scripted breathing, a head turn and a nod while speaking.
- [ ] About 170 cm tall, standing on the floor behind the 90 cm counter; caption bubble just above the head
- [ ] Reads as a person at first glance, lit to match the room

### Seating (behind the user, 2.5–4 m)
- [ ] [M] Rustic plank tables on steel legs with tan leather chairs (03); tables 2, 4, 5, 7, 8, 10, 12 stay at their current positions
- [ ] [M] 2–3 different seated diners (laptop, coffee cup, chatting) at tables 2, 5, 7, 10, touching chair and table. One seated-man mesh is already generated and staged.
- [ ] Table number cards (`TableCard_N` / `TableNumberButton_N`) stay as they are, readable from 3 m
- [ ] Small plants, cups and plates on the tables

### Lounge corner
- [ ] [M] Mustard velvet sofa and olive velvet sofa with colourful cushions, low tables, a rug (01)
- [ ] [M] Large potted plants

### Lights
- [ ] [M] Opal globe pendants (counter), copper/enamel pendants (pastry, coffee), Edison-bulb clusters (seating)
- [ ] Warm key, fill and point lights; check brightness in the real render

## User changes (2026-11-18)
- **Ordering choices sit on the counter, not floating in front of the eyes.** When the server asks a question, the phrase cards lie on the counter top in front of the user, tilted up toward them, like a small menu on the counter. The user looks down to the counter to pick, and the server stays visible above. When a phrase names an ingredient (ham and cheese, olives, pickles), that real container on the counter gets a soft highlight too. The coffee and table steps also use the counter.
- **The café is built as real objects in the scene**, visible in the Scene panel and the Scene Hierarchy, not generated only when the Lens runs.
- **Development timeline screenshots:** after each milestone, run `devpost/development-timeline/capture-lens-studio.ps1 -Name "<NN>_<stage>_<view>"` (it saves the Lens Studio window). Stages: 02 basic flow, 03 realistic rebuild (counter, coffee bar, seating, server close-up, ordering on the counter), 04 LEAF runs.

## Known issues the user spotted mid-rebuild (fix after the current build)
- Seated diners sit wrongly on the chairs: hovering or perched on the seat edge, legs through or past the chair, turned sideways to their table.
- Some ingredient containers float above the counter instead of resting in it.

## Constraints kept for the LEAF tests (no conflicts with the rebuild)
- These names, colliders and Interactables stay unchanged: every `Learnable_<id>`, `TableCard_N`, `TableNumberButton_N` / `TableNumberCard_N`, all UI button names, and the `PhraseCard_<id>` / `PracticeHu_<id>` / `PracticeEn_<id>` names.
- New meshes go inside each learnable's `Visual` child, so the wrapper and its collider don't move. Decor meshes go under the existing authored unit roots (SandwichCounter, PastryDisplay, CoffeeArea, ServerSpot, Table_N, Lounge).
- `ServerSpot` stays where it is: (0, floor, −172), about 150 cm across the counter from the user's start position.
- No state properties on WbwMain or the Learn, Order and Practice controllers change.

## One known conflict with the design brief (FYI)
The Specs view in the preview is narrow: about ±16° across and ±20° up and down, roughly 43 cm wide at 70 cm. The brief's 45 × 30 cm practice board at 50–60 cm and a row of four 10.5 cm phrase cards at 60 cm don't fit inside it. The build currently uses:
- practice board 38 × 28 cm at 65 cm
- phrase cards 9 cm wide at 68 cm
- setup panel 38 × 25 cm at 70 cm
- word card 25 × 19.5 cm at 68 cm

The skill's section 6 sizes (a 33 cm card) agree with this. Tell me if you'd rather keep the brief's sizes and accept panels running past the edge of the view.

## Already done in this pass (kept)
- Textured shell: whitewashed brick walls, honey plank floor, checker floor, glossy green and white tile counter fronts, white-tile neon wall (procedural textures in `Assets/Textures/`).
- Warm ambient and key light.
- Fixed but not yet re-checked in a capture: the neon and chalkboard text sizes (text size is capped at about 200, so they now use a scale), plus a deferred build so the chalk text isn't painted over by the board.
