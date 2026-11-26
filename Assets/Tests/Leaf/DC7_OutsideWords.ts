// DC7_OutsideWords — words from earlier outings in the street outside (learner's request, 2026-11-25).
// "When we are outside the café, before going in, we can look left and right and see some of the other
// words we learnt from different categories."
// Checks: right after the setup, with no mode picked yet (review), pointing at the street and park things
// outside names them (Street: megálló, posta · Park: szökőkút) and a pinch says the word once, without a
// card; café words (NYITVA on the door) stay quiet in review. After picking Learn, selecting an outside
// thing opens its card already "Saved ✓" (saved on an earlier outing) and without the Use it live link.
// Drives: real SIK triggers on SetupSpeakEnglish, SetupLearnHungarian, SetupConfirmButton, Learnable_megallo,
//         SuggestLearnButton, Learnable_pad, WordCardCloseButton; pointer hover via WbwTester.pointHold /
//         pointer.hold. Head moves with WbwTester.setHead.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findInteractablesByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {findEnabled, log, textOf, waitFor, WbwTester} from "./WbwLeafHelpers"
import {InteractionManager} from "SpectaclesInteractionKit.lspkg/Core/InteractionManager/InteractionManager"
import {InteractorInputType} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"

const D2R = Math.PI / 180

@component
export class DC7_OutsideWords extends Scenario {
  async run(): Promise<void> {
    const t = new WbwTester()
    try {
      const m = t.main, cafe = m.cafe, learn = t.learn
      await waitFor(() => m.setupPanel.isVisible && t.hasEnabledInteractable("SetupConfirmButton"), "setup panel visible", 15000)
      t.quietMouse()
      t.quietMic()
      expect(cafe.startedOutside, "the café starts the user outside the entrance").toBe(true)

      const cafeT = cafe.getSceneObject().getTransform()
      const at = (x: number, z: number, h: number = 160) => cafeT.getWorldTransform().multiplyPoint(new vec3(x, h, z))
      const posOf = (id: string) => findEnabled(`Learnable_${id}`)!.getTransform().getWorldPosition()
      const start = at(-760, 20)
      const lookAt = async (target: vec3) => {
        const d = target.sub(start)
        await t.setHead(start, t.yawToward(start, target), Math.atan2(d.y, Math.hypot(d.x, d.z)) / D2R)
      }
      const label = () => [textOf("NameLabelHu", findEnabled("NameLabel")), textOf("NameLabelEn", findEnabled("NameLabel"))]

      // ── setup out here; no mode is picked yet ──
      await t.tap("SetupSpeakEnglish")
      await t.tap("SetupLearnHungarian")
      await t.tap("SetupConfirmButton")
      await waitFor(() => m.setupComplete && !m.setupPanel.isVisible, "setup complete")
      expect(m.currentMode, "no mode yet").toBe("none")
      expect(learn.pointMode, "pointing reviews the outside words").toBe("review")
      // the hand / mouse ray reaches the street (SIK stops at 5 m; the shop signs stand ~12 m away)
      for (const i of InteractionManager.getInstance().getInteractorsByType(InteractorInputType.All)) {
        const reach = (i as unknown as {_maxRaycastDistance: number})._maxRaycastDistance
        if (typeof reach === "number") expect(reach >= 2000, `interactor ${i.inputType} reaches 20 m+ (got ${reach} cm)`).toBe(true)
      }

      // ── left: the tram stop (Street) ──
      await lookAt(posOf("megallo"))
      await t.pointHold("megallo")
      expect(label().join(" / "), "the tram stop is named").toBe("megálló / stop")
      expect(learn.labelMode, "review label").toBe("review")
      await t.pointRelease()
      const plays = learn.reviewPlays
      await t.tap("Learnable_megallo")
      await waitFor(() => learn.reviewPlays === plays + 1 && t.audio.lastVoiceKey === "w_megallo", "a pinch says megálló")
      expect(t.card.isVisible, "review opens no card").toBe(false)

      // ── behind: the post office across the road (Street) ──
      await lookAt(posOf("posta"))
      await t.pointHold("posta")
      expect(label().join(" / "), "the post office is named").toBe("posta / post office")
      await t.pointRelease()

      // ── right: the fountain in the park (Park) ──
      await lookAt(posOf("szokokut"))
      await t.pointHold("szokokut")
      expect(label().join(" / "), "the fountain is named").toBe("szökőkút / fountain")
      await t.pointRelease()

      // ── café words stay quiet until a mode is picked ──
      await lookAt(findEnabled("Sign")!.getTransform().getWorldPosition())
      const nyitva = findInteractablesByName("Learnable_nyitva", undefined, true)[0]
      await t.pointer.hold(nyitva, "Learnable_nyitva")
      await sleep(600)
      expect(learn.labelForId, "no label for a café word in review").toBe("")
      await t.pointRelease()

      // ── Learn: an outside word opens its card, saved already, no Use it live ──
      await waitFor(() => m.suggestionVisible && t.hasEnabledInteractable("SuggestLearnButton"), "arrival suggestion", 20000)
      await t.tap("SuggestLearnButton")
      await waitFor(() => m.currentMode === "learn", "Learn picked")
      await lookAt(posOf("pad"))
      await t.tap("Learnable_pad")
      await waitFor(() => t.card.isVisible && t.card.currentWordId === "pad", "word card for pad")
      await waitFor(() => t.audio.lastVoiceKey === "w_pad", "the card plays w_pad")
      expect(t.card.savedShown, "saved on an earlier outing").toBe(true)
      expect(t.hasEnabledInteractable("WordCardUseLiveButton"), "no Use it live for a park word").toBe(false)
      await t.tap("WordCardCloseButton")
      await waitFor(() => !t.card.isVisible, "card closed")
      log("DC7 done")
    } finally {
      t.restoreHead()
    }
  }
}
