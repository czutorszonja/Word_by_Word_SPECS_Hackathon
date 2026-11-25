// SHOTS_OutsideWords — not a done-criterion test: holds the outside review still for the development-timeline
// screenshots (pointing at the tram stop, the post office across the road and the fountain before going in,
// then a park word's card in Learn). The arrival suggestion is answered with Later, so no mode is picked and
// the review stays on. Prints "SHOT:<name>" at the start of each hold.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {findEnabled, log, waitFor, WbwTester} from "./WbwLeafHelpers"

const HOLD_S = 6
const D2R = Math.PI / 180

@component
export class SHOTS_OutsideWords extends Scenario {
  async run(): Promise<void> {
    const t = new WbwTester()
    const hold = async (name: string) => {
      log(`SHOT:${name}`)
      await sleep(HOLD_S * 1000)
    }
    try {
      const m = t.main
      await waitFor(() => m.setupPanel.isVisible && t.hasEnabledInteractable("SetupConfirmButton"), "setup panel visible", 15000)
      t.quietMouse()
      t.quietMic()
      const cafeT = m.cafe.getSceneObject().getTransform()
      const spot = (x: number, z: number) => cafeT.getWorldTransform().multiplyPoint(new vec3(x, 160, z))
      const posOf = (id: string) => findEnabled(`Learnable_${id}`)!.getTransform().getWorldPosition()
      const lookAt = async (eye: vec3, target: vec3, pitchAdd: number = 0) => {
        const d = target.sub(eye)
        await t.setHead(eye, t.yawToward(eye, target), Math.atan2(d.y, Math.hypot(d.x, d.z)) / D2R + pitchAdd)
      }
      await t.tap("SetupSpeakEnglish")
      await t.tap("SetupLearnHungarian")
      await t.tap("SetupConfirmButton")
      await waitFor(() => m.setupComplete && !m.setupPanel.isVisible, "setup complete")
      // "Later" on the arrival suggestion: no mode yet, so the learner keeps looking around outside (review)
      await waitFor(() => m.suggestionVisible && t.hasEnabledInteractable("SuggestLaterButton"), "arrival suggestion", 20000)
      await t.tap("SuggestLaterButton")
      await waitFor(() => !m.suggestionVisible, "suggestion gone")
      await sleep(3500) // the toast fades
      // the park is round the café's corner: a few steps along the pavement to see it
      for (const [id, name, x, z] of [["megallo", "left-tram-stop", -760, 20], ["posta", "behind-post-office", -760, 20],
        ["szokokut", "right-fountain", -800, 520]] as [string, string, number, number][]) {
        await lookAt(spot(x, z), posOf(id), 4)
        await t.pointHold(id)
        await hold(name)
        await t.pointRelease()
      }
      await t.tap("MenuButton")
      await waitFor(() => m.menuOpen, "menu open")
      await t.tap("ModeLearnButton")
      await waitFor(() => m.currentMode === "learn", "Learn picked")
      await lookAt(spot(-800, 520), posOf("pad"), 8)
      await t.tap("Learnable_pad")
      await waitFor(() => t.card.isVisible && t.card.currentWordId === "pad", "word card for pad")
      await hold("learn-bench-card-saved")
      log("SHOTS done")
    } finally {
      t.restoreHead()
    }
  }
}
