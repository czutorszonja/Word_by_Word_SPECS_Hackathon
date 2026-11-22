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
| 11-22 | — | Younger guests (F07, F08, M09) built and seat-tested in Blender; scene swap pending; brief clarified (café = demo stand-in) |

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
  leaning talk gesture; some shoes touch the table base. Not visible at normal viewing distance.
- The learner's later feedback: the barista looked like "a finance bro" → canvas apron added; guests should be
  younger and suit the bohemian café → F07, F08, M09 (pending scene swap).

### The interface
- Panels with a see-through hole, colours too bright (cobalt/violet/magenta → soft powder blue, lavender,
  dusty rose), the phrase boxes hard to read at counter distance (enlarged twice), the saved-words viewer wider
  than the view (cut off), no visible way to listen to saved words (speaker icon added), the Menu (demo) chip
  covering the phrase box and the viewer's Back button (moved/hidden), "játszótér" shown with a toy-car icon.

### Process
- Screenshots and commits were sometimes forgotten → now written into the design brief's "Working rules".
- Parallel helper agents sped up model building but caused the GPU overload above; they now run only while
  Lens Studio is closed.

## Open items (as of 22 Nov)
1. Swap the younger guests into the scene: run `agent/staging/eec_seat_diners.ts` (F07 + F08 at table 10, M09 at
   table 5; F14, F02, M14 switched off), check in the preview, run LEAF DC1–DC6, timeline screenshots, push.
2. A whole-café screenshot set (corners, entrance, outside, every area, plus a wide scene-camera view); the
   walkaround tour's outside/facade viewpoint needs fixing.
3. Remove the disabled old generated people from the scene before publishing (size).
4. The learner records more human voice clips at the end, same file names (`audio-recording-list.md`, 145 clips).
5. Soft test notes: the compact menu chip does not show the mode name; the practice board opens ~8 cm closer than
   intended.
6. Record the demo video (under 3 minutes), make the repo public, submit.
