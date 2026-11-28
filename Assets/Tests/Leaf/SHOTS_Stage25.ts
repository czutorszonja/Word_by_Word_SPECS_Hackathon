// SHOTS_Stage25 — not a done-criterion test: holds the 28 Nov café-visit redesign still for the
// development-timeline screenshots (stage 25) and for judging the conversation strip in the Specs view:
// the arrival offer at the door, the sentence being prepared in front of the learner, the server
// speaking (his subtitle under his face), the suggestion that appears only after a pause, the learner's
// own sentence in the strip, the table reply with its blank and filled, and "Jó étvágyat!".
// Starts OUTSIDE like the real app (the café is turned around the user), so every pose goes through the
// café transform. Prints "SHOT:<name>" at the start of each hold.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {findEnabled, log, tableCard, waitFor, WbwTester} from "./WbwLeafHelpers"

const HOLD_S = 6

@component
export class SHOTS_Stage25 extends Scenario {
  async run(): Promise<void> {
    const t = new WbwTester()
    const hold = async (name: string) => {
      log(`SHOT:${name}`)
      await sleep(HOLD_S * 1000)
    }
    try {
      const m = t.main, o = t.order
      await waitFor(() => m.setupPanel.isVisible && t.hasEnabledInteractable("SetupConfirmButton"), "setup panel", 15000)
      t.quietMouse()
      t.quietMic()
      const cafeT = m.cafe.getSceneObject().getTransform()
      const at = (x: number, z: number, h: number = 160) => cafeT.getWorldTransform().multiplyPoint(new vec3(x, h, z))
      await t.tap("SetupConfirmButton")
      await waitFor(() => m.setupComplete && !m.setupPanel.isVisible, "setup complete")

      // ── the café's name over the door, from the pavement ──
      const sign = findEnabled("FacadeName")
      if (sign) {
        await t.lookAt(at(-820, 20), sign.getTransform().getWorldPosition())
        await hold("facade-name-sign")
      }

      // ── walk up to the door: the offer ──
      const doorAhead = at(-450, 20, 150)
      await t.lookAt(at(-715, 20), doorAhead)
      await waitFor(() => m.suggestionVisible, "the offer at the door", 6000)
      await sleep(1200)
      await hold("arrival-offer-at-door")
      await t.tap("SuggestLiveButton")
      await waitFor(() => m.currentMode === "live" && o.phraseHelperVisible, "Yes: Use it live prep", 5000)

      // ── at the counter: the sentence is prepared in front, never on the counter ──
      const eye = at(0, 0)
      const server = o.server.getSceneObject().getTransform().getWorldPosition()
      const face = server.add(new vec3(0, o.server.heightCm - 12, 0))
      await t.lookAt(eye, at(0, -110, 95)) // looking at the ingredients
      await sleep(1500)
      await hold("prep-card-empty")
      await t.useWord("szalami")
      await t.useWord("paradicsom", true)
      await t.waitAudioIdle()
      await hold("prep-sentence-built")

      // ── looking up at him: the conversation in the line of sight ──
      await t.lookAt(eye, face)
      const hesSec = o.hesitationSec
      o.hesitationSec = 9 // screenshots only: the window capture lands ~4 s late, the real pause is 2 s
      o.serverNotices = true
      await waitFor(() => o.orderStep === 1 && o.waitingFor === "server", "he greets", 6000)
      o.serverNotices = false
      await sleep(900)
      await hold("step1-server-speaking")
      await waitFor(() => o.hesitating, "step 1: nothing shown, the learner may answer", 10000)
      await hold("step1-nothing-shown-while-answering")
      await t.waitForUserTurn(1)
      o.hesitationSec = hesSec
      await sleep(600)
      await hold("step1-suggestion-after-a-pause")
      await t.sayIt()
      await t.waitForUserTurn(2)
      await sleep(800)
      await hold("step2-own-sentence-in-strip")
      await t.sayIt()

      // ── the table: the blank, a glance at table 8, the filled reply ──
      await waitFor(() => o.orderStep === 3 && o.waitingFor === "table", "the table question", 15000)
      await sleep(1200)
      await hold("step3-table-blank")
      const lookSec = o.tableLookSec
      o.tableLookSec = 60
      await t.setHead(eye, t.yawToward(eye, server) + 180, -5)
      o.tableLookSec = lookSec
      const card8 = tableCard(8), popupSec = card8.popupSeconds
      card8.popupSeconds = 12
      await t.lookAt(eye, card8.getSceneObject().getTransform().getWorldPosition())
      await waitFor(() => card8.popupText === "8 = nyolc", "table 8 read by looking", 5000)
      await hold("step3-table-8-read")
      card8.popupSeconds = popupSec
      await t.lookAt(eye, face)
      await t.waitForUserTurn(3, 10000)
      await sleep(600)
      await hold("step3-table-reply-filled")
      await t.tap("PhraseCard_nyolcas_asztal")
      await t.sayIt()
      await waitFor(() => o.orderStep === 4, "Jó étvágyat!", 10000)
      await sleep(600)
      await hold("step4-enjoy-your-meal")
      await waitFor(() => o.waitingFor === "done", "the order is done", 10000)
      await sleep(4000) // the last window capture lands ~4 s after its SHOT line
      log(`kept from the order: ${o.keptFromOrder.join(",")}`)
      log("SHOTS done")
    } finally {
      t.restoreHead()
    }
  }
}
