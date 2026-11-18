// DC2_Learn — Done criterion 2 (Learn).
// "Walking around the pastry display and sandwich counter, three or four learnable objects have
//  subtle highlights that stay attached to them. Clicking one (e.g. the olives) opens a card with
//  an illustration, 'olívabogyó', 'olives' and an example sentence. ▶ plays the audio, and Save
//  adds it to my collection. Saved words stay saved when I move elsewhere or switch modes."
// Drives: head pose (camera) to face the counter / pastry display and to walk away; real SIK
//         triggers on Learnable_olivabogyo, Learnable_sajt, WordCardPlayButton,
//         WordCardPlaySentenceButton, WordCardSaveButton, WordCardCloseButton, mode menu buttons.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {child, findEnabled, horiz, log, textOf, waitFor, WbwTester} from "./WbwLeafHelpers"

@component
export class DC2_Learn extends Scenario {
  async run(): Promise<void> {
    const t = new WbwTester()
    try {
      await t.completeSetup()
      const m = t.main, learn = t.learn, card = t.card, audio = t.audio

      // ── brackets: 3–4 nearest learnables in view, attached to their objects ──
      await t.setHead(t.eyeAt(0, 0), 0, -15) // start spot, facing the sandwich counter
      await sleep(600) // scan runs every 0.2 s
      await waitFor(() => learn.bracketedIds.length >= 3 && learn.bracketedIds.length <= 4,
        `3–4 bracketed objects at the sandwich counter (got ${learn.bracketedIds.length}: ${learn.bracketedIds.join(",")})`, 4000)
      log(`counter brackets: ${learn.bracketedIds.join(",")}`)
      const checkBrackets = (where: string) => {
        for (const id of learn.bracketedIds) {
          const obj = findEnabled(`Learnable_${id}`)
          expect(obj !== undefined, `${where}: Learnable_${id} exists`).toBe(true)
          const br = child(obj!, "Brackets")
          expect(br !== undefined && br.enabled, `${where}: Learnable_${id}/Brackets enabled`).toBe(true)
          expect(br!.getParent().name, `${where}: brackets are children of the object`).toBe(`Learnable_${id}`)
          const d = br!.getTransform().getWorldPosition().distance(obj!.getTransform().getWorldPosition())
          expect(d < 30, `${where}: brackets for ${id} stay on the object (${d.toFixed(1)} cm away)`).toBe(true)
        }
        // only the chosen ones are visible
        let visible = 0
        for (const id of learn.learnableIds) {
          const br = child(findSceneObjectByNameSafe(`Learnable_${id}`)!, "Brackets")
          if (br && br.enabled) visible++
        }
        expect(visible, `${where}: number of visible bracket sets`).toBe(learn.bracketedIds.length)
      }
      checkBrackets("counter")

      // walk toward the pastry display: brackets move with the view and include pastry items
      // standing back between the pastry display (items at café x ≈ -266/-247) and the left end
      // of the sandwich counter, looking at both
      const spot = t.eyeAt(-170, 40)
      await t.setHead(spot, 0, -20)
      await sleep(600)
      await waitFor(() => learn.bracketedIds.length >= 3 && learn.bracketedIds.length <= 4 &&
        (learn.bracketedIds.indexOf("kenyer") >= 0 || learn.bracketedIds.indexOf("szendvics") >= 0),
        `3–4 brackets incl. a pastry item at the pastry display (got ${learn.bracketedIds.join(",")})`, 4000)
      log(`pastry brackets: ${learn.bracketedIds.join(",")}`)
      checkBrackets("pastry")

      // back to the counter
      await t.setHead(t.eyeAt(0, 0), 0, -15)

      // ── click the olives → word card ──
      const plays0 = audio.voicePlayCount
      await t.tap("Learnable_olivabogyo")
      await waitFor(() => card.isVisible && card.currentWordId === "olivabogyo", "word card open for olives")
      expect(learn.activeCardWordId, "learn.activeCardWordId").toBe("olivabogyo")
      expect(learn.activeCardWord, "learn.activeCardWord").toBe("olívabogyó")
      const cardRoot = findEnabled("WordCard")!
      expect(textOf("WordCardHu", cardRoot), "card Hungarian").toBe("olívabogyó")
      expect(textOf("WordCardEn", cardRoot), "card English").toBe("olives")
      expect((textOf("ExampleHu", cardRoot) ?? "").indexOf("Kérhetek olívabogyót?") >= 0, "card example sentence (HU)").toBe(true)
      expect(textOf("ExampleEn", cardRoot), "card example sentence (EN)").toBe("Could I have some olives?")
      const ill = child(cardRoot, "Illustration")
      expect(ill !== undefined && ill.enabled && ill.getComponent("Component.Image") !== null, "card has an illustration image").toBe(true)
      expect(audio.lastVoiceKey, "opening the card plays the word").toBe("w_olivabogyo")
      expect(audio.voicePlayCount, "one voice clip started on open").toBe(plays0 + 1)

      // ── ▶ Word ──
      await t.tap("WordCardPlayButton")
      await waitFor(() => audio.voicePlayCount === plays0 + 2, "▶ Word starts a voice clip")
      expect(audio.lastVoiceKey, "▶ Word plays w_olivabogyo").toBe("w_olivabogyo")

      // ── ▶ Sentence (olives has a recorded example phrase) ──
      if (t.hasEnabledInteractable("WordCardPlaySentenceButton")) {
        await t.tap("WordCardPlaySentenceButton")
        await waitFor(() => audio.lastVoiceKey === "p_kerhetek_oliva", "▶ Sentence plays p_kerhetek_oliva")
      } else {
        log("NOTE: WordCardPlaySentenceButton not shown for olives (no sentence clip)")
      }

      // ── Save ──
      const saved0 = m.savedCount
      await t.tap("WordCardSaveButton")
      await waitFor(() => m.savedCount === saved0 + 1, "Save adds to collection")
      expect(m.savedWords.indexOf("olivabogyo") >= 0, "olives in savedWords").toBe(true)
      await waitFor(() => !card.isVisible, "card flies into the counter and hides", 4000)
      await waitFor(() => textOf("SavedBadge") === `Saved: ${saved0 + 1}`, "HUD SavedBadge updated")
      expect(audio.lastSfxKey, "save confirmation sound").toBe("SaveConfirm")

      // reopen: shows as already saved; Close hides the card
      await t.tap("Learnable_olivabogyo")
      await waitFor(() => card.isVisible && card.currentWordId === "olivabogyo", "card reopens for olives")
      expect(textOf("Label", findEnabled("WordCardSaveButton")), "save button shows 'Saved' for a saved word").toBe("Saved")
      await t.tap("WordCardCloseButton")
      await waitFor(() => !card.isVisible, "WordCardCloseButton hides the card")
      expect(learn.activeCardWordId, "no active card after close").toBe("")

      // ── walk away > 1.5 m hides the card ──
      await t.tap("Learnable_sajt")
      await waitFor(() => card.isVisible && card.currentWordId === "sajt", "card open for sajt")
      const start = t.camPos()
      const away = start.add(new vec3(200, 0, 0))
      await t.setHead(away, 0, -15)
      expect(horiz(away, start) > 150, "moved more than 1.5 m").toBe(true)
      await waitFor(() => !card.isVisible && learn.activeCardWordId === "", "card hides after walking > 1.5 m away", 3000)
      await t.setHead(t.eyeAt(0, 0), 0, -15)

      // ── save a second word, then move elsewhere and switch modes: words stay saved ──
      await t.learnAndSave("sajt")
      const savedNow = m.savedWords.slice()
      expect(savedNow.length, "two words saved").toBe(saved0 + 2)
      const far = t.eyeAt(-145, 300)
      await t.setHead(far, 180, 0) // walk to the seating area
      await sleep(300)
      expect(m.savedCount, "saved words kept after moving elsewhere").toBe(savedNow.length)
      await t.switchModeViaMenu("ModeUseLiveButton", "live")
      await t.switchModeViaMenu("ModePracticeButton", "practice")
      await t.switchModeViaMenu("ModeLearnButton", "learn")
      expect(m.savedWords.join(","), "saved words kept after switching modes").toBe(savedNow.join(","))
      await waitFor(() => textOf("SavedBadge") === `Saved: ${savedNow.length}`, "HUD SavedBadge still correct")
      log("DC2 done")
    } finally {
      t.restoreHead()
    }
  }
}

function findSceneObjectByNameSafe(name: string): SceneObject | undefined {
  return findEnabled(name)
}
