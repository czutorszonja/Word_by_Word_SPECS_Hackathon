# Phase C decisions (router, 2026-11-19 04:30)

These settle the open questions in `INTEGRATION_PLAN.md` §1.2 and the findings in `CRITIC.md`.
Where this file and the plan disagree, **this file wins**. The user's storyboard is
`devpost/references/07-interaction-storyboard.webp`; the user's corrections are summarised in the
plan's "AGREED PHASE C DESIGN".

| Ref | Decision |
|---|---|
| Q1 | Yes: "Use this word", "+ és" and the pattern switch play the updated phrase once. Hover never plays. Showing the helper never plays. |
| Q2 / F8 | **Prep state: yes.** Entering Use it live (card link, menu or suggestion) shows the phrase helper and the server stays quiet. The learner can point at ingredients, choose "Use this word" / "+ és", switch pattern and Listen. A clear button on the helper, `ReadyToOrderButton` ("Ready to order"), starts the server's greeting. `waitingFor` gains `"ready"`; `orderStep` stays 0 until pressed. During step 1 the helper is hidden (step 1 keeps its own cards); at step 2 the helper is the single answer surface. This matches storyboard steps 5–6 (no server speech while reusing the phrase) and removes the step-1 conflict. Use the plan's §4.9 "Q2 alternative" block and the tour's prep variant. |
| Q3 | Pinching an ingredient in Use it live only pins its label. Only the label's buttons change the phrase. |
| Q4 | Check in a capture whether the font renders "Saved ✓"; if not, "Saved" plus the check icon. |
| Q5 / F2 / F15 | No pointer ray in the Preview (hide only SIK's mouse ray visual; targeting stays). Add a small **`PointerDot`** at the hit point on the hovered object (storyboard shows a small dot on the pointed tray), drawn for the Preview mouse and for the LEAF tour pointer, in the current mode's tint with a light centre. On device, SIK's own cursor/ray is enough. Remove `PointerRay` from the names; expose `pointerDotVisible`. Gate any ray assert on `isEditor()`. |
| Q6 / F12 | Walk-in start is in scope, done last in Phase C (C7): an `EntranceSpot` in the enlarged room and `arrivalWalkIn` input. If it destabilises DC1–DC5, keep the start at the counter and let the story tour cut to the door. |
| Q7 | "Use it live →" is always shown on the card. A non-ingredient word is not put in the phrase. |
| Q8 | The hover label is word + meaning only (as in the storyboard), no chip on the label. The mode name is always visible on the HUD chip and on the card / helper / board. |
| Q9 | Wording as listed in the plan, plus "Ready to order". |
| Q10 | The router regenerates the `a_*` and `c_*` clips with short padding so stitched phrases flow. Same file names. |
| Q11 | Yes. |
| Q12 / D22 | Seed the phrase only from the card's "Use it live →" word or `session.liveWord`. **Never from the saved list.** Otherwise the helper starts empty: "Kérek … a szendvicsembe." with a short hint to point at an ingredient. |
| Q13 / F9 | At step 2 the mic arms when "Mit kér bele?" ends if the phrase has a word; "Said it" is always visible. LEAF keeps `ignoreMicForTests`. Add an inspector toggle `voiceDetection` (default on) so recordings can switch the mic path off. |
| F1 | One bracket only: while the hover label shows for an object, hide that object's own `Brackets` set (option a). Adjust DC2's count to exclude `labelForId`. |
| F5 | Helper text is left-aligned. Pattern A always breaks before "a szendvicsembe." so "Kérek" and the tail never move; pattern B keeps "nélkül, kérem." as its own run. Keep the panel compact. |
| F6 | Verify rich text in Lens Studio first. If it is not available, emphasise the ingredient with a second Text object in the tint colour placed inline, or with weight only. Never block on it. |
| F13, F14 | Delete `REAL_VOICE_SECS` from the tour. Set `ignoreMicForTests` lazily in `sayIt()` and `completeSetup()`. |
| Status colour | "Playing pronunciation" uses `TEXT_SOFT` plus the pulsing speaker icon, not cyan. |
| Colours | New UI takes every colour from `WbwSharedUI` tones (soft powder blue / lavender / dusty rose identity). No hex literals, including inspector labels. |
| Card | D6 stands: the word card is HU word, EN meaning, status line, "Listen again", "Save" → "Saved ✓", "Use it live →", close. No illustration or example sentence. It plays once on open and stays steady. Save never closes it and never touches the order. |
