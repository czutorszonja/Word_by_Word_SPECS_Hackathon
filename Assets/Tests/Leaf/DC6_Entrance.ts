// DC6_Entrance — the arrival at the café door (learner's request, 2026-11-19).
// "I start outside, see the OPEN sign (nyitva), walk in, and when I look back I see CLOSED (zárva)."
// Checks: the café starts turned around the user, who stands outside facing the door; pointing at the
// sign from outside names NYITVA and selecting it opens the card with its clip; walking up to the door
// opens it; once inside the door closes again and pointing at the sign names ZÁRVA.
// Drives: real SIK triggers on SetupSpeakEnglish, SetupLearnHungarian, SetupConfirmButton,
//         SuggestLearnButton, Learnable_nyitva, Learnable_zarva, WordCardCloseButton; pointer hover via
//         WbwTester.pointHold. Head moves with WbwTester.setHead (world yaw from yawToward).
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findEnabled, log, textOf, waitFor, WbwTester} from "./WbwLeafHelpers"
import {WbwDoor} from "../../Scripts/WbwDoor"

const D2R = Math.PI / 180

@component
export class DC6_Entrance extends Scenario {
  async run(): Promise<void> {
    const t = new WbwTester()
    try {
      const m = t.main, cafe = m.cafe
      await waitFor(() => m.setupPanel.isVisible && t.hasEnabledInteractable("SetupConfirmButton"), "setup panel visible", 15000)
      t.quietMouse()
      t.quietMic()
      expect(cafe.startedOutside, "the café starts the user outside the entrance").toBe(true)

      const cafeT = cafe.getSceneObject().getTransform()
      const at = (x: number, z: number, h: number = 160) => cafeT.getWorldTransform().multiplyPoint(new vec3(x, h, z))
      const signPos = () => findEnabled("Sign")!.getTransform().getWorldPosition()
      const lookAt = async (eye: vec3, target: vec3) => {
        const d = target.sub(eye)
        await t.setHead(eye, t.yawToward(eye, target), Math.atan2(d.y, Math.hypot(d.x, d.z)) / D2R)
      }

      // ── outside: the door is straight ahead ──
      const cam = t.camPos(), look = t.cameraObject().getTransform().back
      const toSign = signPos().sub(cam)
      const ang = Math.acos((look.x * toSign.x + look.z * toSign.z) / (Math.hypot(look.x, look.z) * Math.hypot(toSign.x, toSign.z))) / D2R
      expect(ang < 25, `the door is ahead at the start (${ang.toFixed(0)}° off the view)`).toBe(true)
      const dist = Math.hypot(toSign.x, toSign.z)
      expect(dist > 150 && dist < 300, `standing outside, a few steps from the door (${dist.toFixed(0)} cm)`).toBe(true)

      // ── finish the setup out here and pick Learn ──
      await t.tap("SetupSpeakEnglish")
      await t.tap("SetupLearnHungarian")
      await t.tap("SetupConfirmButton")
      await waitFor(() => m.setupComplete && !m.setupPanel.isVisible, "setup complete")
      await waitFor(() => m.suggestionVisible && t.hasEnabledInteractable("SuggestLearnButton"), "arrival suggestion", 8000)
      await t.tap("SuggestLearnButton")
      await waitFor(() => m.currentMode === "learn", "Learn picked")

      // ── NYITVA from the street ──
      await lookAt(at(-760, 20), signPos())
      const door = findEnabled("Door")!.getComponent(WbwDoor.getTypeName()) as WbwDoor
      expect(door !== null && door.isClosed, "the door is closed while the user stands back").toBe(true)
      await t.pointHold("nyitva")
      expect(textOf("NameLabelHu", findEnabled("NameLabel")), "the outside face names NYITVA").toBe("nyitva")
      expect(textOf("NameLabelEn", findEnabled("NameLabel")), "English: open").toBe("open")
      await t.pointRelease()
      await t.tap("Learnable_nyitva")
      await waitFor(() => t.card.isVisible && t.card.currentWordId === "nyitva", "word card for nyitva")
      await waitFor(() => t.audio.lastVoiceKey === "w_nyitva", "the card plays w_nyitva")
      await t.tap("WordCardCloseButton")
      await waitFor(() => !t.card.isVisible, "card closed")

      // ── walk up: the door opens ──
      await lookAt(at(-650, 20), signPos())
      await waitFor(() => door.isOpen, "the door swings open as the user comes close", 4000)

      // ── inside, looking back: the door has closed and the sign says ZÁRVA ──
      const inside = at(-400, 20)
      await t.setHead(inside, t.yawToward(inside, at(-553, 20)), 0)
      await waitFor(() => door.isClosed, "the door closes behind the user", 4000)
      await lookAt(inside, signPos())
      await t.pointHold("zarva")
      expect(textOf("NameLabelHu", findEnabled("NameLabel")), "the inside face names ZÁRVA").toBe("zárva")
      expect(textOf("NameLabelEn", findEnabled("NameLabel")), "English: closed").toBe("closed")
      await t.pointRelease()
      await t.tap("Learnable_zarva")
      await waitFor(() => t.card.isVisible && t.card.currentWordId === "zarva", "word card for zarva")
      await t.tap("WordCardCloseButton")
      await waitFor(() => !t.card.isVisible, "card closed")
      log("DC6 done")
    } finally {
      t.restoreHead()
    }
  }
}
