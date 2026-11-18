---
status: approved
---

# Design brief: Word by Word

<!-- Filled in by plan-lens from the learner's interview. Use the learner's words. Mark any value they didn't choose as (default). -->

## The one spatial moment
I'm standing at the sandwich counter of a bakery-café. Three or four ingredients I could order, like ham, olives and pickles, have subtle brackets. I aim at the olives and pinch, and a card opens with a little drawing, "olives → olívabogyó", an example sentence, and my own voice saying the word. I save it. A minute later, when the server asks "Mit kér bele?", I answer with phrases built from the words I just collected ("Savanyú uborka nélkül, kérem"). Then I sit at a table and practise those same words in a matching game while I wait.

Audio is a generated Hungarian voice at first, with the learner's own recordings as a backup.

The idea behind it is vocabulary-first learning, the way children learn: lots of words, linked to real things and their sound, with grammar coming from example sentences and real exchanges. Inspired by the Hungarian *Napszótár* books (10 words a day, grouped by everyday topics), Krashen's comprehensible input, and Willis's lexical syllabus.

## Why it belongs on glasses
- Uses: **shares your view** (the word is on the thing you're looking at), **draws in the world** (labels and cards sit on the counter and tables), **leaves your body free** (you keep your eyes up and your hands low while ordering).
- Why it's better than the phone or laptop version: on a phone you'd have to look down, type or photograph the item, and break the conversation with the server. Here the word and its sound appear on the real object, and the phrase you need is in front of you while you talk, with a subtle pinch and no pointing or waving.

## Product or overlay
- Type: **overlay**. It responds to a real café and real objects. The practice game is a small product on top.
- What the real version would sense: location (the glasses know you're in a café, with permission) and the camera plus an AI model that picks out only food and drink you could order, not the tongs, glasses or containers. Later it could suggest context-aware words and phrases for any place: restaurant, bar, gym, shop.
- Stand-in for the preview: **the whole café is a virtual scene, and the café context and object identities are supplied in advance.**
  - At start, a small toast says "📍 Café detected (demo)" (default wording) to stand in for location recognition.
  - Each learnable object carries its word, translation, illustration and audio ahead of time. Objects with no word attached (tongs, containers, glasses, cutlery) never highlight. This stands in for AI recognition.
  - The server is a scripted character with fixed lines.

## Where things live
Real-world scale, centimeters. The user starts at the sandwich counter, facing it.

- **Setup panel (first launch):** "I speak: English. I want to learn: Hungarian." Floats about 70 cm in front at start, a little below eye level, about 40 × 25 cm (default). Only English → Hungarian works in the demo. Other languages can show as "coming soon" (default).
- **Café layout** (one room, about 6 × 6 m (default)):
  - **Sandwich counter:** directly in front of the start position, about 100 cm away. Counter about 90 cm high (default). Ingredient containers are visible in a row along the counter top: ham, cheese, chicken, meatball, lettuce, spinach, tomato, olives, pickles, onion, mayonnaise, with bread loaves behind them (default bread, not selectable as a choice).
  - **Pastry display:** to the left of the sandwich counter, same counter line. Croissants, cakes, bread and cookies. Mostly decorative and not ordered; may carry a couple of learnable words (e.g. bread).
  - **Coffee area:** to the right of the sandwich counter. Coffee machine, cups (small and large), milk jug, water bottle.
  - **Server:** a 3D character standing behind the sandwich counter, facing the user, about 150 cm across the counter. As lifelike as the build allows (see Risks). When they speak, their line plays as audio with a short caption bubble above their head (Hungarian, with English underneath in smaller text).
  - **Seating area:** behind the user (they turn around to see it), about 2.5 to 4 m away. Six to eight small tables, each with a clear, large number card standing on it (about 15 × 10 cm, readable from about 3 m). Tables **4, 8 and 12 are empty**. The others (e.g. 2, 5, 7, 10 (default)) have seated virtual diners and can't be selected. No table 13.
- **Highlights (Learn):** subtle brackets or a soft outline drawn around the object itself, staying attached to it as you walk. Only three or four of the nearest learnable objects in view are bracketed at a time.
- **Word card:** opens next to the object it's about, slightly toward the user, about 60 to 80 cm from the user, about 25 × 18 cm (default). Shows the illustration, the Hungarian word (large), the English word, one example sentence (reusing an ordering phrase, e.g. the pickles card shows "Savanyú uborka nélkül, kérem."), a ▶ play button and a Save button.
- **Phrase choices (Use it live):** a small row of 2 to 4 phrase cards lying on the counter top in front of the user, tilted up toward them, so the user looks down at the counter to pick and the server stays visible above them (changed during the build at the learner's request; first planned as a row floating about 60 cm in front, slightly below eye level). When a phrase names an ingredient, that container on the counter gets a soft highlight. Each card shows a picture **and** the Hungarian phrase with the English underneath (first run shows both; the learner will give feedback on whether to keep the pictures).
- **Practice board:** a compact panel floating upright just above the user's table, facing them, about 50 to 60 cm away, about 45 × 30 cm (default). Eight face-up cards in two columns: four on the left with an illustration and the Hungarian word, four on the right with the English translations, shuffled, with no illustrations. A progress line on top, e.g. "1 / 4 pairs".
- **Mode menu:** Learn / Practice / Use it live, plus an indicator of the active mode and a saved-words count. Appears near the raised hand. In the preview it opens from a small clickable "✋ Menu" control kept low at the side of the view (stand-in for the raise-hand gesture).

## Look and feel of the café
The learner chose six reference photos, saved in `devpost/references/`. Open them before building the environment and match their mood: a warm, cosy, slightly retro European bakery-café.
- **Counters** (`02`, `03`, `04`): glossy **deep-green tiled** counter fronts (square or subway tiles) with light stone or steel tops. Pastries sit on wooden boards on top, and a glass display case holds cakes. The sandwich counter uses the same green tiles, with the ingredient containers in a glass-fronted row.
- **Walls** (`02`, `03`, `04`): whitewashed **brick** and warm **stone**, with **wooden shelves** holding bread baskets, coffee bags, jars and small plants, and a chalkboard menu.
- **Coffee area** (`05`, `06`): a **red espresso machine** as the eye-catcher, stacked white and orange cups, a pink-red neon **"COFFEE"** sign on white tiles, bar stools with tan leather seats, and a **black-and-white checkerboard floor** under the coffee bar.
- **Lighting** (`01`, `03`, `04`): warm, golden. **Opal globe pendants** over the counter, copper pendants and clusters of bare **Edison bulbs** over the seating.
- **Seating** (`01`, `03`): a mix of long **rustic wooden tables with tan leather chairs** and a lounge corner with **velvet sofas** (mustard and olive green), colourful cushions and low tables. Lots of hanging and potted plants, and big bright windows.
- Floors: wooden boards in the seating area, checkerboard at the coffee bar (default split).
- **Additive-display note:** on the glasses, dark colours look transparent. This virtual café stands in for a real one, so keep it readable in the preview: use the mid-to-light versions of these colours (a brighter green for the tiles, light walls, warm lights) and avoid large near-black areas such as the dark ceiling in `01`. All UI (cards, captions, menu) stays light and high-contrast on top.

## Panels and colour
Panels are compact and sized around their contents, so the café and the object being learned stay in view. They follow the approach that worked in the learner's earlier Small Wins project: a restrained translucent tint behind the content, strong light text, and buttons with clear outlines and visible states.

- **Hierarchy:** the word or phrase the learner needs is the largest text. The translation and supporting information come second, still comfortably readable. Instructions are short.
- **Headings:** the app name appears once at launch at most. Working panels use a functional heading: the word being learned, "Practice", or the phrase needed. The setup screen's heading is "Choose your languages"; languages marked "soon" are smaller and clearly unavailable.
- **Per mode:** Learn shows a few discreet object highlights and one compact word card. Practice shows a stable, readable matching board while seated, which may be larger because the learner has chosen an activity. Use it live shows a short, glanceable phrase prompt on the counter that leaves the counter and the server visible.
- **Interaction states:** idle, targeted, pressed and selected look different. Pointing at a control highlights it, a pinch (a click in the preview) selects it, and the result is confirmed: Save becomes "Saved" with a checkmark, and Listen shows that audio is playing. Unfamiliar icons keep a short label ("Listen", "Save"), and the whole button surface is selectable.

| Element | Colour treatment |
|---|---|
| Main text | Soft white or a similarly clear light tone |
| Current target or focus | Cyan accent or outline |
| Successful match or saved word | Green, paired with a checkmark or confirmation text |
| Incorrect match | Amber, paired with "Try again" |
| Panel background | A restrained translucent tint, starting from the Small Wins treatment |

Accents are used sparingly and consistently, and colour is always paired with a readable label, icon or other visible state change. In the matching game, colour shows selection and feedback only; it never reveals the correct pairs before the learner works them out.

**Design intention:** the colour system is designed to make text readable, direct attention to the current target and distinguish interaction states. Consistent accents are paired with text and icons so that meaning does not depend on colour alone. The palette supports navigation and feedback; it is not presented as a proven method of improving vocabulary memory.

## Hands and input
- **Aim and pinch** for everything: the hand stays relaxed and low (by the waist or on the counter). The hand ray highlights whatever it lands on, and a small pinch selects it. No pointing, no waving, no dragging. Designed so the user doesn't look strange in public. In the preview, mouse click = pinch.
- Select a bracketed object → opens its word card. ▶ plays the word. Save adds it to the collection (with a small confirmation, e.g. the card flies into a counter "Saved: 3").
- Select a phrase card → plays the phrase in Hungarian and counts as your answer to the server.
- Select a table number card → shows "8 = nyolc" and plays the number.
- Practice: select one card, then its translation.
- Open the mode menu: raise the hand on glasses. In the preview, click the "✋ Menu" stand-in button.
- Targets are big and highlight when aimed at.
- Voice: none required. Speaking out loud is optional practice. Every answer is a pinch-able phrase card.

## When things show
- **Setup panel:** shows at first launch; hides once the language pair is confirmed.
- **"Café detected" toast:** shows after setup for about 3 seconds (default), then fades.
- **Brackets (Learn mode only):** show on 3 to 4 nearby learnable objects in view. They stay quiet and never fill the view. Hidden in Practice mode.
- **Word card:** shows when an object is selected; hides when saved, when the user selects another object, or when they walk away (more than about 1.5 m (default)).
- **Server caption:** shows while the line plays and for a few seconds after; the phrase choices appear right after the question.
- **Phrase choices:** show only when the server has asked something; hide once answered.
- **Table numbers:** always visible on the tables (they're part of the room). Selecting one shows its translation card for a few seconds.
- **Practice board:** shows when Practice is chosen at the table; hides when closed or another mode is chosen.
- **Mode menu:** shows when the hand is raised (or the stand-in button is clicked); hides after a choice.
- If something needs attention out of view: when the server asks "Hányas asztalnál ül?" (the seating area is behind the user), a soft chime plus a small arrow at the edge of the view points toward the seating area (default).

## Use it live: the scripted order (in order)
1. Server: "Jó napot! Mit kér?" → choices: "Jó napot!" / "Egy szendvicset kérek."
2. Server: "Mit kér bele?" → choices built from the ingredients, favouring words the user saved: "Sonkát és sajtot kérek." / "Kérhetek olívabogyót?" / "Savanyú uborka nélkül, kérem." The user can pick more than one before continuing (default: a "Kész / Done" card ends the step).
3. Server: "Inni valamit?" → "Egy kicsi tejes kávét kérek." (small/large and with/without milk shown as choices where possible (default)).
4. Server: "Itt fogyasztja vagy elvitelre?" → "Itt eszem." (picture: inside, a table) / "Elvitelre, kérem." (picture: outside, a takeaway bag). The demo path is "Itt eszem."
5. Server: "Hányas asztalnál ül?" → the user turns around, finds an empty table (4, 8 or 12), selects its number card to learn it ("8 = nyolc" + audio), turns back, and picks "A nyolcas asztalnál ülök." (or the four/twelve version). Only the phrase for the chosen table is offered.
6. Server: "Jó étvágyat!" → "Köszönöm!"
7. The user walks to the chosen table. A hint invites them to open the menu and choose Practice while they wait (default).

## Audio
43 Hungarian clips. The full list with exact file names is in `devpost/audio-recording-list.md`. Files go in `Assets/Audio/hu/`.
- **First choice: a generated Hungarian voice.** Before wiring audio, generate every clip ahead of time with a Hungarian (hu-HU) text-to-speech voice and save it as a file under **exactly those file names**. Use the Hungarian text from the list. Don't rely on live text-to-speech or an AI service inside the Lens; the demo must play pre-made files in the preview.
- Use one consistent voice for the user's words and phrases (`w_`, `n_`, `p_`) and, if available, a different voice for the server (`s_`) so the two are easy to tell apart (default).
- If no Hungarian voice can be generated, use placeholder sounds under the same names and say so.
- **Backup: the learner's own recordings.** The learner is a native speaker and will listen to the generated clips. Any clip that sounds wrong gets replaced by their own recording under the same file name, with no code change.
- Word files `w_*.wav`, numbers `n_*.wav`, the user's phrases `p_*.wav`, server lines `s_*.wav`.
- Word cards reuse a phrase as their example sentence; there's no separate example-sentence audio.

## Done criteria
Each one can be checked in Lens Studio's preview.
1. **Mode menu:** clicking the "✋ Menu" stand-in (for raising the hand) opens a menu with Learn, Practice and Use it live. I can pick any mode, see which one is active, and reopen the menu to switch modes without losing my saved words.
2. **Learn:** walking around the pastry display and sandwich counter, three or four learnable objects have subtle highlights that stay attached to them. Clicking one (e.g. the olives) opens a card with an illustration, "olívabogyó", "olives" and an example sentence. ▶ plays the audio, and Save adds it to my collection. Saved words stay saved when I move elsewhere or switch modes.
3. **Use it live, ordering:** I can click through ordering a sandwich and coffee: the server's scripted questions ("Mit kér?", "Mit kér bele?", "Inni valamit?", "Itt fogyasztja vagy elvitelre?") each play with a caption, and I answer by selecting phrase cards (picture + Hungarian + English) that play their audio. This includes leaving out an ingredient ("Savanyú uborka nélkül, kérem") and choosing "Itt eszem."
4. **Use it live, table:** after "Hányas asztalnál ül?", I turn around, see occupied and empty tables, select the number card on an empty table (4, 8 or 12) and see and hear it (e.g. "8 = nyolc"). Back at the counter I can answer with the matching phrase ("A nyolcas asztalnál ülök."), and the server answers "Jó étvágyat!"
5. **Practice:** after saving at least four words, I choose Practice at my table and see eight face-up cards on an upright panel just above the table: four illustrated Hungarian cards and four shuffled English cards. I click one card and then its translation. Correct pairs turn green with checkmarks, play the word, become inactive and update "x / 4 pairs". Wrong pairs show "Try again" and become clickable again. After all four I see a completion state and can start another set or close the board, then return to another mode through the menu.

## Out of scope
- Real location or object recognition; the café context and object identities are scripted.
- Real speech recognition of the user speaking Hungarian.
- AI-generated conversation; all server lines are scripted.
- Bread choice, toasting, ordering bakery items, order-number announcements, "Anything else?".
- Languages other than English → Hungarian (others may appear as "coming soon").
- Remembering saved words across sessions or days (the spaced "same 50 words for a few days" schedule is a later feature). Saved words last for one session.
- Multiple environments (park, home); one café only.

## Risks and open questions
- **Scope is large** (setup, Learn, a 6-step scripted order, table selection, Practice). The learner chose to keep everything. If time runs short, **the table-selection/number-learning part is the first to skip in the video**, but it stays in the build.
- **Lifelike server:** the learner wants a real-feeling person, not just a bubble or a voice. A realistic, animated human is the hardest asset here. Expect a stylized character with simple idle motion; make it as lifelike as possible.
- **Raise-hand menu:** a custom gesture that can't be tried in the preview. The clickable stand-in carries the demo; the real gesture is "feel unproven".
- **Narrow view:** the sandwich counter has around 11 ingredients. Only 3 to 4 are bracketed at a time to avoid filling the view. On real glasses this needs checking.
- **Audio:** generated Hungarian voice first. Pronunciation quality (accents like ő, ű, gy, ny) is unknown until the learner listens. The learner's own recordings are the backup.
- **Pictures on phrase cards:** first run shows picture + text. The learner will decide after seeing it whether to keep pictures or show words only.
- **Practice while waiting:** the learner notes this is shown in the same café for the demo. In real use you'd practise in a calmer moment, not mid-errand.
- **Feel unproven:** subtlety of aim-and-pinch in public, comfort over time, real hand tracking.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail. Use simple stand-in shapes for the café first, then dress it to match the reference photos in `devpost/references/`.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
