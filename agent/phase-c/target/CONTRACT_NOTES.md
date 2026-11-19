
## 2026-11-19 — author:cardhud (`WbwWordCardUI.ts`, `WbwHudUI.ts`)

No divergence from CONTRACTS §4.8 / §4.9 / K15 / K17. Two points the contract leaves open, and the choice made:

1. **§4.9 "chip width" is not exported by `WbwSharedUI`.** `modeChip()` returns only the SceneObject, and the
   panel has to be sized before the chip can be built (the chip's parent is the panel content). `WbwHudUI.show()`
   therefore repeats the chip's width expression, `textWidthCm(tone.label.length, "Caption", d, false) + 1.4`, with
   `tone = toneOf(this.modeLabel)` (the tone `useTone()` was just given). If `modeChip()` in `WbwSharedUI` ever
   changes its width rule, change this one line in `WbwHudUI.show()` too; nothing else depends on it.
   Result at the defaults (60 cm): chip 7.2 cm wide, plate `W` 7.8 x `H` 6.8 cm, shifted 0.2 cm right and 1.4 cm up
   from today's centre, so the left edge (-16.7 cm) and bottom edge (-17.45 cm) are where they are today.

2. **§4.8 does not say how wide the card may get.** Today's `inner = Math.min(30, ...)` cap existed for the wrapped
   example sentence. The three buttons ("Listen again", "Save" / "Saved ✓", "Use it live →", icon above the label,
   widths from the usual `textWidthCm(n, "Button", d, false) + 1.4`) need 27.2 cm at `viewDistanceCm` 70, and more
   at a larger distance, so a fixed cap would let the button row stick out of the plate. The cap is removed: nothing
   on the card wraps and the widest row sets the width. `cardSize` at the defaults is about 30.0 x 19.1 cm
   (±12.5° x ±8.0° at the learn controller's 68 cm), inside the ±16° x ±19° view; the learn controller's placement
   and `cardObstacle()` read `cardSize`, so they follow. Check it in the capture for storyboard step 3: if the card
   should be narrower, shorten a label constant at the top of `WbwWordCardUI.ts` (the widths are computed from them).

Also within the contract's "hidden or still": when the clip ends the `WordCardStatusIcon` stays visible and still,
in the Learn tint (it is soft white and pulses while playing), so `WordCardStatus` never shifts sideways.
`WordCardHu`, `WordCardEn` and the status line are left-aligned on the chip's left edge, as in the storyboard.

## 2026-11-19 — author:learn (`WbwLearnController.ts`, `WbwVocab.ts`)

No divergence from CONTRACTS §4.15 / §4.16 / §6 / K6 / K7: every public name, signature, state field and
SceneObject name is as written there. Points the contract leaves open, and the choice made:

1. **§6.4 "scan() may set only `enabled`".** There is one `applyBrackets()` (no enabled-only variant). Each tracked
   learnable remembers the look painted last (`learn` / `focus` / `live`, a private field of `Tracked`), so tint and
   scale are written only when the look changes and `scan()` (5 times a second) writes `enabled` only.
   `markerTint()` is still asked at the moment of painting and no colour is kept in a field. `applyBrackets()` is
   called synchronously from `scan()`, `setHighlight()`, `setActive()`, `showLabel()`, `hideLabel()`, `select()`
   and `closeCard()`, so the LEAF rule (enabled `Brackets` = `bracketedIds` without `labelForId`) holds in every frame.
   When a marker is switched on again it is faced to the user at once (it missed the per-frame facing while hidden).
2. **§6.3 `setLiveSlots()`** skips `hover.refresh()` when the ids and `canEdit` are the same as before. The order
   controller calls it from `refreshEditable()` on every step change; an unchanged call would only re-lay-out the
   label under the pointer. The label shown is the same either way.
3. **§6.2 `closeCard()`** calls `nameLabel.refresh({card: null})` only when a card was open (it is also called from
   `setActive(false)` on every mode change). `cardPlayCount` is not reset on close: it restarts at 1 with the next card.
4. **`setPointMode()` before `init()`** (not expected from `WbwMain`) only stores the mode; `init()` applies it to
   the new arbiter.
5. **`init(session, audio, hud, learnables)`** keeps its signature, but `hud` has no use left here (the card no
   longer flies to the Saved badge). `WbwHudUI.getBadgeWorldPos()` therefore has no caller in the learn controller.
6. **`@ui.label`** is reworded and plain text (rule 5): "WbwLearnController – point to reveal, discovery markers,
   word card, save". The target contains no hex literal.
7. **`WbwVocab.ts`**: besides §4.15, three comments were brought up to date (header note that the step-2 forms
   live in `WbwPhraseHelperModel`; `PhraseEntry.words`; `OrderStep.choices`). Left in place although no game script
   reads them once the targets are in: the `WordEntry.example*` fields (their clip keys `p_sonka_sajt`,
   `p_kerhetek_oliva`, `p_uborka_nelkul` stay in the bank), the `PICTURES` keys `ham_cheese`, `no_pickles`, `done`,
   and the `PHRASES` entry `szabad_asztal` (unused today as well). `WbwVocab.ts` compiles on its own, but the project's CURRENT `WbwOrderController.ts`
   (`stepDef.pinned`, the `done` card) and `WbwTempProbe.ts` (expects the old step-2 cards at run time) only fit
   the old table: copy the vocab together with the order controller target (CONTRACTS §9).
