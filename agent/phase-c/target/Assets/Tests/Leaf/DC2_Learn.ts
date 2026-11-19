// DC2_Learn — Done criterion 2 (Learn).
// "Walking around the pastry display and sandwich counter, three or four learnable objects have
//  subtle highlights that stay attached to them. Pointing at one shows a small label beside it
//  (the Hungarian word large, English small) with one bracket: no click, no sound. Selecting the
//  object or its label (e.g. the olives) opens a steady card with 'olívabogyó' and 'olives' that
//  plays the word once; 'Listen again' replays it, and Save shows 'Saved ✓' and adds it to my
//  collection while the card stays open and nothing is ordered. Saved words stay saved when I
//  move elsewhere or switch modes."
// Drives: head pose (camera) to face the counter / pastry display and to walk away; a held hover
//         (WbwTester.pointHold, no select) on a bracketed Learnable_<id>; real SIK triggers on
//         NameLabel, Learnable_olivabogyo, Learnable_sajt, WordCardPlayButton, WordCardSaveButton,
//         WordCardCloseButton, mode menu buttons.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {child, findEnabled, horiz, log, textOf, waitFor, WbwTester} from "./WbwLeafHelpers"
import {wordById} from "../../Scripts/WbwVocab"

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
          // one bracket: the object the hover label names shows NameLabelBracket, its own set is hidden
          if (id === learn.labelForId) continue
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
        expect(visible, `${where}: number of visible bracket sets`).toBe(learn.bracketedIds.filter((id) => id !== learn.labelForId).length)
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

      // ── point to reveal: label beside the object, no click, no sound, one bracket ──
      await sleep(400) // scan settles at the counter
      const mid = learn.bracketedIds[0], mw = wordById(mid)!
      const pv0 = audio.voicePlayCount, ps0 = audio.sfxPlayCount
      await t.pointHold(mid)
      expect(learn.hoveredId, "hoveredId").toBe(mid)
      expect(learn.labelMode, "label mode").toBe("learn")
      const label = findEnabled("NameLabel")
      expect(textOf("NameLabelHu", label), "label Hungarian").toBe(mw.hu)
      expect(textOf("NameLabelEn", label), "label English").toBe(mw.en)
      expect(findEnabled("NameLabelChip") === undefined, "no chip on the label").toBe(true)
      expect(audio.voicePlayCount, "pointing plays no voice").toBe(pv0)
      expect(audio.sfxPlayCount, "pointing plays no sound effect").toBe(ps0)
      expect(card.isVisible, "pointing opens no card").toBe(false)
      const ownBr = child(findEnabled(`Learnable_${mid}`)!, "Brackets")
      expect(ownBr !== undefined && !ownBr.enabled, "the object's own Brackets are hidden while its label shows").toBe(true)
      expect(findEnabled("NameLabelBracket") !== undefined, "the one hover bracket").toBe(true)
      checkBrackets("pointing")
      if (global.deviceInfoSystem.isEditor()) {
        expect(learn.pointerDotVisible && findEnabled("PointerDot") !== undefined, "pointer dot on the pointed object").toBe(true)
        expect(learn.pointerRayVisible, "no ray band in the Preview").toBe(false)
      }
      await t.tap("NameLabel") // selecting the label opens the card
      await waitFor(() => card.isVisible && card.currentWordId === mid, "card via the label")
      expect(learn.cardPlayCount, "played once").toBe(1)
      expect(audio.lastVoiceKey, "the word's clip").toBe(mw.audio)
      await t.pointRelease()
      await t.tap("WordCardCloseButton")
      await waitFor(() => !card.isVisible && learn.labelForId === "", "card closed, label gone", 3000)
      await waitFor(() => !learn.pointerDotVisible, "pointer dot gone", 2000)

      // ── click the olives → word card ──
      const plays0 = audio.voicePlayCount
      await t.tap("Learnable_olivabogyo")
      await waitFor(() => card.isVisible && card.currentWordId === "olivabogyo", "word card open for olives")
      expect(learn.activeCardWordId, "learn.activeCardWordId").toBe("olivabogyo")
      expect(learn.activeCardWord, "learn.activeCardWord").toBe("olívabogyó")
      const cardRoot = findEnabled("WordCard")!
      expect(textOf("WordCardHu", cardRoot), "card Hungarian").toBe("olívabogyó")
      expect(textOf("WordCardEn", cardRoot), "card English").toBe("olives")
      expect(child(cardRoot, "Illustration") === undefined, "no illustration on the compact card").toBe(true)
      expect(textOf("ExampleHu", cardRoot) === null, "no example sentence on the compact card").toBe(true)
      expect(textOf("ChipLabel", cardRoot), "card mode chip").toBe("Learn")
      expect(learn.cardPlayCount, "pronunciation played once on open").toBe(1)
      expect(audio.lastVoiceKey, "opening the card plays the word").toBe("w_olivabogyo")
      expect(audio.voicePlayCount, "one voice clip started on open").toBe(plays0 + 1)
      await waitFor(() => textOf("WordCardStatus", findEnabled("WordCard")) === "Ready to listen again" && card.playing === "", "status after the clip", 6000)
      expect(textOf("Label", findEnabled("WordCardPlayButton")), "Listen again label").toBe("Listen again")
      expect((textOf("Label", findEnabled("WordCardUseLiveButton")) ?? "").indexOf("Use it live") === 0, "Use it live link").toBe(true)

      // ── Listen again ──
      await t.tap("WordCardPlayButton")
      await waitFor(() => audio.voicePlayCount === plays0 + 2, "Listen again starts a voice clip")
      expect(audio.lastVoiceKey, "Listen again plays w_olivabogyo").toBe("w_olivabogyo")
      expect(learn.cardPlayCount, "Listen again counted").toBe(2)

      // ── re-selecting the same object replays it: the card is not rebuilt and does not move ──
      const cardPos0 = findEnabled("WordCard")!.getTransform().getWorldPosition(), shows0 = card.showCount
      await t.tap("Learnable_olivabogyo")
      await waitFor(() => learn.cardPlayCount === 3, "re-selecting the same object replays it")
      expect(card.showCount, "the card is not rebuilt").toBe(shows0)
      expect(findEnabled("WordCard")!.getTransform().getWorldPosition().distance(cardPos0) < 0.5, "the card does not move").toBe(true)

      // ── Save: "Saved ✓", the card stays, nothing is ordered ──
      const saved0 = m.savedCount
      await t.tap("WordCardSaveButton")
      await waitFor(() => m.savedCount === saved0 + 1, "Save adds to collection")
      expect(m.savedWords.indexOf("olivabogyo") >= 0, "olives in savedWords").toBe(true)
      await waitFor(() => card.isVisible && card.savedShown && learn.activeCardWordId === "olivabogyo", "card stays open showing Saved", 3000)
      expect((textOf("Label", findEnabled("WordCardSaveButton")) ?? "").indexOf("Saved") === 0, "save button shows Saved").toBe(true)
      expect(t.order.phraseSlotIds.length, "saving never fills the phrase").toBe(0)
      expect(t.order.orderStep, "saving never orders").toBe(0)
      expect(t.order.answers.length, "saving never answers").toBe(0)
      await waitFor(() => textOf("SavedBadge") === `Saved: ${saved0 + 1}`, "HUD SavedBadge updated")
      expect(audio.lastSfxKey, "save confirmation sound").toBe("SaveConfirm")
      await t.tap("WordCardCloseButton")
      await waitFor(() => !card.isVisible, "card closed after saving")

      // reopen: shows as already saved; Close hides the card
      await t.tap("Learnable_olivabogyo")
      await waitFor(() => card.isVisible && card.currentWordId === "olivabogyo", "card reopens for olives")
      expect((textOf("Label", findEnabled("WordCardSaveButton")) ?? "").indexOf("Saved") === 0, "save button shows 'Saved' for a saved word").toBe(true)
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
