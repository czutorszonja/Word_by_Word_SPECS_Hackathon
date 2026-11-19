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
Real-world scale, centimeters. The user starts **outside the café entrance**, facing the door (added during the build at the learner's request; first planned as a start at the sandwich counter, which the tests and the story tour still use).

- **Entrance (the arrival):** a wooden glass door in the left wall, right beside the pastry case. On the door's glass hangs a two-sided flip sign: **NYITVA** (open) faces the street and **ZÁRVA** (closed) faces the café, like a real shop's sign. Both sides are learnable words. The door swings open as the user comes close and closes behind them, so looking back from inside shows ZÁRVA. Outside: a strip of pavement, two planters and a green "KÁVÉZÓ" name board over the door; inside: a doormat. From the door the user walks along the counter: pastry case → sandwich counter → coffee station.

- **Setup panel (first launch):** "I speak: English. I want to learn: Hungarian." Floats about 70 cm in front at start, a little below eye level, about 40 × 25 cm (default). Only English → Hungarian works in the demo. Other languages can show as "coming soon" (default).
- **Café layout** (one room, first planned at about 6 × 6 m; made larger and more spacious during the build at the learner's request, with clear walking space and the lounge well away from the counter):
  - **Sandwich counter:** directly in front of the start position, about 100 cm away. Counter about 90 cm high (default). Ingredient containers are visible in a row along the counter top: ham, salami, roast chicken, cheese, meatball, lettuce, spinach, tomato, peppers, cucumber, olives, pickles, onion, mayonnaise, mustard, with bread loaves behind them (default bread, not selectable as a choice). Salami, roast chicken, peppers, cucumber and mustard were added during the build so the choices feel like a real sandwich bar.
  - **Pastry display:** to the left of the sandwich counter, same counter line: a glass pastry case with **clear** glass so every pastry is visible (wooden base, stone top, thin copper frame, a glass shelf): pretzels (perec), cocoa rolls (kakaós csiga), savoury scones (pogácsa) and croissants, and the carrot cake (répatorta) on top under a glass dome. Bread and sandwiches on a stand beside it. Learnable: kenyér, szendvics, perec, kakaós csiga, pogácsa, répatorta. (Clear glass and the dome were asked for by the learner: cakes must be covered.)
  - **Wall menu board:** a large chalkboard on the back wall above the counter: "MENÜ", drinks (tejeskávé 990 Ft, presszó 690 Ft, forró csoki 1090 Ft) and cakes and pastries (répatorta, perec, kakaós csiga, pogácsa) with prices. The three drink lines are learnable (pointing at the line reveals the word); the pastries are learned on the real items.
  - **Coffee station:** to the right of the sandwich counter and part of the **same counter run** (same green panels and marble top, no gap; bigger than first planned). Espresso machine with a grinder (kávédaráló) beside it and cups (csésze) warming on top, three milks along the front edge — oat milk (zabtej), almond milk (mandulatej) and a glass bottle of cow's milk (tej) — small and large cups, a coffee cup, water, takeaway cup stacks and a small plant. Inspired by the learner's three coffee-bar references (`devpost/references/README.md`).
  - **Server:** a 3D character standing behind the sandwich counter, facing the user, about 150 cm across the counter. As lifelike as the build allows (see Risks). When they speak, their line plays as audio with a short caption bubble above their head (Hungarian, with English underneath in smaller text).
  - **Seating area:** behind the user (they turn around to see it), about 2.5 to 4 m away. Six to eight small tables, each with a clear, large number card standing on it (about 15 × 10 cm, readable from about 3 m). Tables **4, 8 and 12 are empty**. The others (e.g. 2, 5, 7, 10 (default)) have seated virtual diners and can't be selected. No table 13.
- **Highlights (Learn):** subtle brackets or a soft outline drawn around the object itself, staying attached to it as you walk. Only three or four of the nearest learnable objects in view are bracketed at a time.
- **Name label (point to reveal):** when the user points at an object (mouse hover in the preview), its Hungarian word and English meaning appear immediately in a small label floating close beside the object, with a discreet bracket or short connector, e.g. "uborka / cucumber". No click is needed and pointing plays no sound, so sweeping across the ingredients stays quiet. Pinching/clicking the object or its label opens the word card. See the learner's storyboard: `devpost/references/07-interaction-storyboard.webp`.
- **Word card:** opens next to the object it's about, slightly toward the user, about 60 to 80 cm from the user, compact. Shows the Hungarian word (large) and the English word, plays the pronunciation once when it opens (with a visible "Playing pronunciation" indicator), and offers "Listen again", "Save" (becomes "Saved ✓") and "Use it live →". Only one card is open at a time, and it stays steady while the user moves their hand or cursor to its controls. (Updated during the build from the learner's storyboard; first planned with an illustration, an example sentence, ▶ and Save.)
- **Phrase helper (Use it live):** a compact soft-violet "Say it at the counter" panel with one reusable sentence, the ingredient gently emphasised, English underneath and a Listen button, e.g. "Kérek uborkát a szendvicsembe." / "I'd like cucumber in my sandwich." Choosing "Use this word" on another ingredient updates the same sentence ("Kérek szalámit a szendvicsembe."); deliberately adding a second makes "Kérek szalámit és paradicsomot a szendvicsembe." A second pattern covers leaving something out: "Savanyú uborka nélkül, kérem." Each vocabulary item stores its dictionary form and its form inside the sentence (uborka → uborkát, szalámi → szalámit, paradicsom → paradicsomot).
- **Phrase choices (Use it live):** a small row of 2 to 4 phrase cards lying on the counter top in front of the user, tilted up toward them, so the user looks down at the counter to pick and the server stays visible above them (changed during the build at the learner's request; first planned as a row floating about 60 cm in front, slightly below eye level). When a phrase names an ingredient, that container on the counter gets a soft highlight. Each card shows a picture **and** the Hungarian phrase with the English underneath (first run shows both; the learner will give feedback on whether to keep the pictures).
- **Practice board:** a compact panel floating upright just above the user's table, facing them, about 50 to 60 cm away, about 45 × 30 cm (default). Eight face-up cards in two columns: four on the left with an illustration and the Hungarian word, four on the right with the English translations, shuffled, with no illustrations. A progress line on top, e.g. "1 / 4 pairs".
- **Mode menu:** "Current mode" with the mode's name at the top (changes as soon as another mode is picked), Learn / Practice / Use it live, and **Words saved**. It follows where the user looks while open and holds still while they point at it. Appears near the raised hand. In the preview it opens from a small clickable "✋ Menu (demo)" button kept low at the side of the view (stand-in for the raise-hand gesture); the button shows nothing else.
- **Saved-words viewer (Words saved):** six words per page, each with its picture, the Hungarian word, the meaning and where and when it was saved; Back / Next. Three sort buttons: by category (with jump buttons per category), by date added, and A–Z (Hungarian alphabet, with jump buttons per letter). Tapping a word plays it. For the demo, 12 street words and 12 park words from "earlier outings" are already saved, next to the café words the learner saves.

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
| Panel background | The current mode's colour, translucent on large panels (about 80% opacity, the treatment that worked in Small Wins) and solid on small strips |

**Mode colours:** each mode has its own soft, muted, inviting colour identity in the interface, so the learner always knows where they are: **Learn is soft powder blue (about #B9CEDF), Use it live is soft lavender (about #CBBFE0), Practice is soft dusty rose-magenta (about #D5ADC5)**, refined for readability in the preview. Learn's colour covers object highlights, floating word labels and word cards; Use it live's covers the live interface and phrase help; Practice's covers the matching activity. No electric blue, intense purple or hot magenta. The colours apply only to the interface: walls, floors, furniture, food and people keep their natural materials. Panels and buttons are never grey, black or white, colour coverage stays restrained, and the mode name is always shown (a small "Learn" / "Use it live" / "Practice" chip) so colour is not the only cue. Word by Word takes only Small Wins' accessibility ideas (opacity treatment, readable sizes, clear outlines, visible states, content-sized panels) and otherwise has its own look. (Updated during the build: a first pass used saturated cobalt, royal violet and magenta, which the learner found too bright.)

Accents are used sparingly and consistently, and colour is always paired with a readable label, icon or other visible state change. In the matching game, colour shows selection and feedback only; it never reveals the correct pairs before the learner works them out.

**Design intention:** the colour system is designed to make text readable, direct attention to the current target and distinguish interaction states. Consistent accents are paired with text and icons so that meaning does not depend on colour alone. The palette supports navigation and feedback; it is not presented as a proven method of improving vocabulary memory.

## Hands and input
- **Aim and pinch** for everything: the hand stays relaxed and low (by the waist or on the counter). The hand ray highlights whatever it lands on, and a small pinch selects it. No pointing, no waving, no dragging. Designed so the user doesn't look strange in public. In the preview, mouse click = pinch.
- Select a bracketed object → opens its word card. ▶ plays the word. Save adds it to the collection (with a small confirmation, e.g. the card flies into a counter "Saved: 3").
- Select a phrase card → plays the phrase in Hungarian and counts as your answer to the server (steps 1, 3, 4, 5 and 6).
- Looking up a word, saving it and ordering are separate actions: exploring or saving an ingredient never adds it to the sandwich.
- Ordering the fillings (step 2) uses the phrase helper: the learner picks the ingredient(s) with "Use this word", reads and hears the sentence, and says it out loud. Showing a phrase never submits it.
- Select a table number card → shows "8 = nyolc" and plays the number.
- Practice: select one card, then its translation.
- Open the mode menu: raise the hand on glasses. In the preview, click the "✋ Menu" stand-in button.
- Targets are big and highlight when aimed at.
- Voice: the learner says their order out loud, as they would in a real café. The microphone only detects that they spoke (voice activity), not what they said; then the server answers. In the preview a "Said it" button stands in when no microphone is available. (Changed during the build: first planned as pinch-only answers.)

## When things show
- **Setup panel:** shows at first launch; hides once the language pair is confirmed.
- **"Café detected" toast:** shows after setup for about 3 seconds (default), then fades.
- **Arrival suggestion:** the demo starts as the learner walks into the café. After "Café detected", the app suggests what to do here: Learn, Practice or Use it live (added during the build so the story of arriving somewhere and being offered help is visible).
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
2. Server: "Mit kér bele?" → the phrase helper shows one reusable sentence, "Kérek … a szendvicsembe.", filled with the word the learner carried over from Learn or chooses now by pointing at an ingredient and selecting "Use this word" (adding a second gives "Kérek szalámit és paradicsomot a szendvicsembe."; the "… nélkül, kérem." pattern covers leaving something out). The learner can listen, then says it out loud; once the microphone hears them speak (or they press "Said it" in the preview), the server answers. (Changed during the build: first planned as several fixed phrase cards with the same grammar, such as "Sonkát és sajtot kérek." / "Kérhetek olívabogyót?" / "Savanyú uborka nélkül, kérem.")
3. Server: "Inni valamit?" → "Egy kicsi tejeskávét kérek." (small/large and with/without milk shown as choices where possible (default)).
4. Server: "Itt fogyasztja vagy elvitelre?" → "Itt eszem." (picture: inside, a table) / "Elvitelre, kérem." (picture: outside, a takeaway bag). The demo path is "Itt eszem."
5. Server: "Hányas asztalnál ül?" → the user turns around, finds an empty table (4, 8 or 12), selects its number card to learn it ("8 = nyolc" + audio), turns back, and picks "A nyolcas asztalnál ülök." (or the four/twelve version). Only the phrase for the chosen table is offered.
6. Server: "Jó étvágyat!" → "Köszönöm!"
7. The user walks to the chosen table. A hint invites them to open the menu and choose Practice while they wait (default).

## Audio
**Status:** every clip is now a generated Hungarian voice (Microsoft neural voices: Noémi for the learner's words and phrases, Tamás for the server, who is now a man), made with `agent/tts/make_hu_voice.py`. The learner listened and accepted them for the demo; they understand them clearly but they don't sound fully human, so the learner may replace them with their own recordings before submitting. Extra clips (object forms such as "sonkát" and connectors such as "kérek", "és", "nélkül") let the app play the sentences it builds in step 2.

41 Hungarian clips in the original list (it first said 43), plus the extra clips. The full list with exact file names is in `devpost/audio-recording-list.md`. Files go in `Assets/Audio/hu/`.
- **First choice: a generated Hungarian voice.** Before wiring audio, generate every clip ahead of time with a Hungarian (hu-HU) text-to-speech voice and save it as a file under **exactly those file names**. Use the Hungarian text from the list. Don't rely on live text-to-speech or an AI service inside the Lens; the demo must play pre-made files in the preview.
- Use one consistent voice for the user's words and phrases (`w_`, `n_`, `p_`) and, if available, a different voice for the server (`s_`) so the two are easy to tell apart (default).
- If no Hungarian voice can be generated, use placeholder sounds under the same names and say so.
- **Backup: the learner's own recordings.** The learner is a native speaker and will listen to the generated clips. Any clip that sounds wrong gets replaced by their own recording under the same file name, with no code change.
- Word files `w_*.wav`, numbers `n_*.wav`, the user's phrases `p_*.wav`, server lines `s_*.wav`.
- Word cards reuse a phrase as their example sentence; there's no separate example-sentence audio.

## Done criteria
Each one can be checked in Lens Studio's preview.
1. **Mode menu:** clicking the "✋ Menu" stand-in (for raising the hand) opens a menu with Learn, Practice and Use it live. I can pick any mode, see which one is active, and reopen the menu to switch modes without losing my saved words.
2. **Learn:** walking around the pastry display and sandwich counter, three or four learnable objects have subtle highlights that stay attached to them. Pointing at one (hovering in the preview) shows its Hungarian word and English meaning beside it, without a click and without sound. Clicking one (e.g. the olives) opens a compact card with "olívabogyó" and "olives" that plays the pronunciation once; "Listen again" replays it, and Save adds it to my collection ("Saved ✓") without ordering anything. Saved words stay saved when I move elsewhere or switch modes.
3. **Use it live, ordering:** I can order a sandwich and coffee: the server's scripted questions ("Mit kér?", "Mit kér bele?", "Inni valamit?", "Itt fogyasztja vagy elvitelre?") each play with a caption. For the fillings the phrase helper shows "Kérek … a szendvicsembe." with the ingredient I chose ("Use this word"), including a combined phrase with two ingredients and the "… nélkül, kérem." pattern for leaving one out; I listen and say it out loud (or press "Said it" in the preview). For the other questions I choose a short relevant phrase card that plays its audio, including "Itt eszem.", and say it. Showing a phrase never submits it. (Updated during the build at the learner's request: first planned as phrase cards for every step.)
4. **Use it live, table:** after "Hányas asztalnál ül?", I turn around, see occupied and empty tables, select the number card on an empty table (4, 8 or 12) and see and hear it (e.g. "8 = nyolc"). Back at the counter I can answer with the matching phrase ("A nyolcas asztalnál ülök."), and the server answers "Jó étvágyat!"
5. **Practice:** after saving at least four words, I choose Practice at my table and see eight face-up cards on an upright panel just above the table: four illustrated Hungarian cards and four shuffled English cards. I click one card and then its translation. Correct pairs turn green with checkmarks, play the word, become inactive and update "x / 4 pairs". Wrong pairs show "Try again" and become clickable again. After all four I see a completion state and can start another set or close the board, then return to another mode through the menu.
6. **Entrance:** I start outside the café facing its door. Pointing at the sign on the door shows "nyitva / open"; selecting it opens its card with the pronunciation. Walking up to the door opens it; once I am inside it closes, and looking back the sign reads "zárva / closed".

## Out of scope
- Real location or object recognition; the café context and object identities are scripted.
- Real speech recognition of the user speaking Hungarian. (The app only detects that the learner spoke.)
- AI-generated conversation; all server lines are scripted.
- Bread choice, toasting, ordering bakery items, order-number announcements, "Anything else?".
- Languages other than English → Hungarian (others may appear as "coming soon").
- Remembering saved words across sessions or days (the spaced "same 50 words for a few days" schedule is a later feature). Saved words last for one session.
- Multiple environments (park, home); one café only.

## Risks and open questions
- **Scope is large** (setup, Learn, a 6-step scripted order, table selection, Practice). The learner chose to keep everything. If time runs short, **the table-selection/number-learning part is the first to skip in the video**, but it stays in the build.
- **Lifelike server:** the learner wants a real-feeling person, not just a bubble or a voice. A realistic, animated human is the hardest asset here. Expect a stylized character with simple idle motion; make it as lifelike as possible.
- **Not a game:** the first rebuild's people looked like game avatars. The learner wants the surroundings and people as realistic as possible, so nobody mistakes the demo for a game, and every diner should be a different person (no repeated characters).
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
