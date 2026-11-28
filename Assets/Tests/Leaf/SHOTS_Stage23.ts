// SHOTS_Stage23 — not a done-criterion test: holds the states the learner's 26 Nov feedback changed still
// for the development-timeline screenshots (stage 23). An outside word's label in Learn, the "You could say"
// replies at the counter, "A … asztalnál ülök." waiting with its blank (facing the counter, then turned toward
// the tables), table 8 read by looking ("8 = nyolc"), the filled reply, and Practice opening in front of a
// learner who faces away from the tables. Prints "SHOT:<name>" at the start of each hold.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {findEnabled, log, tableCard, waitFor, WbwTester} from "./WbwLeafHelpers"

const HOLD_S = 6
const D2R = Math.PI / 180

@component
export class SHOTS_Stage23 extends Scenario {
  async run(): Promise<void> {
    const t = new WbwTester()
    const hold = async (name: string) => {
      log(`SHOT:${name}`)
      await sleep(HOLD_S * 1000)
    }
    try {
      await t.completeSetup() // Learn, at the counter
      const m = t.main, o = t.order

      // ── outside, in Learn: point at the post office across the road ──
      const cafeT = m.cafe.getSceneObject().getTransform()
      const outside = cafeT.getWorldTransform().multiplyPoint(new vec3(-760, 160, 20))
      const posta = findEnabled("Learnable_posta")!.getTransform().getWorldPosition()
      const d = posta.sub(outside)
      await t.setHead(outside, t.yawToward(outside, posta), Math.atan2(d.y, Math.hypot(d.x, d.z)) / D2R + 4)
      await t.pointHold("posta")
      await hold("outside-label-in-learn")
      await t.pointRelease()

      // ── Use it live at the counter ──
      const eye = t.eyeAt(0, 0)
      await t.setHead(eye, 0, -15)
      await t.switchModeViaMenu("ModeUseLiveButton", "live")
      await waitFor(() => o.waitingFor === "ready" && o.phraseHelperVisible, "prep state")
      await t.useWord("szalami")
      await t.useWord("paradicsom", true)
      await t.waitAudioIdle()
      await t.startOrdering()
      await t.waitForUserTurn(1)
      // 28 Nov: the replies sit in the conversation strip under the server's face (no counter tray, three
      // replies); this stage-23 scenario follows the current flow so it still runs (SHOTS_Stage25 has the new shots)
      const face = o.server.getSceneObject().getTransform().getWorldPosition().add(new vec3(0, o.server.heightCm - 12, 0))
      const tray = face
      await t.lookAt(eye, face)
      await hold("you-could-say-step-1")
      await t.tap("PhraseCard_szendvicset")
      await t.sayIt()
      await t.waitForUserTurn(2)
      await waitFor(() => o.waitingForSpeech, "step 2 turn open", 5000)
      await t.sayIt()

      // ── the table question: the reply waits with its blank ──
      await waitFor(() => o.orderStep === 3 && o.waitingFor === "table", "the order waits for a table", 15000)
      await sleep(1500) // the server's line finishes
      await t.setHead(eye, 0, -12) // looking at him: his question as a caption
      await hold("table-question-caption")
      await t.lookAt(eye, tray)
      await hold("table-reply-blank-at-counter")
      const lookSec = o.tableLookSec
      o.tableLookSec = 60
      await t.setHead(eye, 180, -5)
      await hold("table-reply-blank-turned-to-tables")
      o.tableLookSec = lookSec
      const card8 = tableCard(8), popupSec = card8.popupSeconds
      card8.popupSeconds = 15 // the window capture lands ~4 s after the SHOT line; the popup normally lasts 4 s
      await t.lookAt(eye, card8.getSceneObject().getTransform().getWorldPosition())
      await waitFor(() => card8.popupText === "8 = nyolc", "table 8 read by looking", 5000)
      await hold("table-8-read-8-nyolc")
      card8.popupSeconds = popupSec
      await t.setHead(eye, 0, -15)
      await t.waitForUserTurn(3, 10000)
      await t.lookAt(eye, tray)
      await hold("table-reply-filled-nyolcas")

      // ── Practice while facing away from the tables (toward the counter): the board opens in front ──
      await t.switchModeViaMenu("ModePracticeButton", "practice")
      await waitFor(() => t.practice.active && t.board.state === "board", "practice board open", 5000)
      await hold("practice-opens-in-front")
      log("SHOTS done")
    } finally {
      t.restoreHead()
    }
  }
}
