// SHOTS_Barista — not a done-criterion test: holds the head still in front of the barista (the rigged
// Rocketbox person behind the sandwich counter) so his face, movement and lighting can be judged and
// screenshotted: front at the counter spot, three-quarter, wide, while talking, and the listening nod.
// Prints "SHOT:<name>" at the start of each hold.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {log, waitFor, WbwTester} from "./WbwLeafHelpers"

const HOLD_S = 6
const D2R = Math.PI / 180

@component
export class SHOTS_Barista extends Scenario {
  async run(): Promise<void> {
    const t = new WbwTester()
    const hold = async (name: string, s: number = HOLD_S) => {
      log(`SHOT:${name}`)
      await sleep(s * 1000)
    }
    try {
      await t.completeSetup()
      await t.switchModeViaMenu("ModeUseLiveButton", "live")
      const server = t.order.server
      expect(server.isRigged, "the barista is the rigged person (WbwHumanRig)").toBe(true)
      const head = () => server.getSceneObject().getTransform().getWorldPosition().add(new vec3(0, 168, 0))
      const look = async (x: number, z: number) => {
        const eye = t.eyeAt(x, z)
        const d = head().sub(eye)
        await t.setHead(eye, t.yawToward(eye, head()), Math.atan2(d.y, Math.hypot(d.x, d.z)) / D2R - 4)
      }
      await look(0, 0)
      await hold("front-idle")
      server.setSpeaking(true)
      await hold("front-talking", 8)
      server.setSpeaking(false)
      await sleep(1200)
      server.acknowledge()
      await hold("front-nod", 3)
      await look(-95, -40)
      await hold("three-quarter-idle")
      server.setSpeaking(true)
      await hold("three-quarter-talking", 6)
      server.setSpeaking(false)
      await look(0, 140)
      await hold("wide-counter")
      server.setSpeaking(true)
      await hold("wide-talking", 10)
      server.setSpeaking(false)
      await look(0, 0)
      await t.startOrdering()
      await waitFor(() => server.isSpeaking, "the greeting starts")
      await hold("greeting", 3)
      log("SHOTS done")
    } finally {
      t.restoreHead()
    }
  }
}
