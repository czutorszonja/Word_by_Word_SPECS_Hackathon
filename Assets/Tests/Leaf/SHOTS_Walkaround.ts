// SHOTS_Walkaround — not a done-criterion test: the learner's "full walkaround with all the angles".
// Starts outside the door like a real visit (the café's normal start), finishes setup there, picks Learn,
// then stands at every place the learner will look from and holds still for a screenshot: the street and
// door, just inside, the counter (wide and close), the pastry case, the coffee station, the menu board, the
// seating from the counter, every table, the window bar and the lounge, and back toward the counter.
// Prints "SHOT:<name>" at the start of each hold. Positions are café-local (x, z) at standing eye height;
// targets are named scene objects, so the shots follow the scene if it is rearranged.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {findEnabled, log, waitFor, WbwTester} from "./WbwLeafHelpers"

const HOLD_S = 8
const D2R = Math.PI / 180

@component
export class SHOTS_Walkaround extends Scenario {
  async run(): Promise<void> {
    const t = new WbwTester()
    try {
      const m = t.main, cafe = m.cafe
      await waitFor(() => m.setupPanel.isVisible && t.hasEnabledInteractable("SetupConfirmButton"), "setup panel visible", 15000)
      t.quietMouse()
      t.quietMic()
      const cafeT = cafe.getSceneObject().getTransform()
      const at = (x: number, z: number, h: number = 160) => cafeT.getWorldTransform().multiplyPoint(new vec3(x, h, z))
      const posOf = (name: string, dy: number = 0): vec3 | null => {
        const so = findEnabled(name)
        return so ? so.getTransform().getWorldPosition().add(new vec3(0, dy, 0)) : null
      }
      const shot = async (name: string, eye: vec3, target: vec3 | null, pitchBias: number = 0) => {
        if (!target) {
          log(`SHOT-SKIPPED:${name} (target not found)`)
          return
        }
        const d = target.sub(eye)
        await t.setHead(eye, t.yawToward(eye, target), Math.atan2(d.y, Math.hypot(d.x, d.z)) / D2R + pitchBias)
        log(`SHOT:${name}`)
        await sleep(HOLD_S * 1000)
      }

      // ── outside: the street, the door with NYITVA ──
      await shot("01-outside-door", at(-760, 20), posOf("Sign"))
      await t.tap("SetupSpeakEnglish")
      await t.tap("SetupLearnHungarian")
      await t.tap("SetupConfirmButton")
      await waitFor(() => m.setupComplete && !m.setupPanel.isVisible, "setup complete")
      await waitFor(() => m.suggestionVisible && t.hasEnabledInteractable("SuggestLearnButton"), "arrival suggestion", 8000)
      await t.tap("SuggestLearnButton")
      await waitFor(() => m.currentMode === "learn", "Learn picked")
      await shot("02-outside-facade", at(-900, 20, 170), posOf("Entrance", 150))

      // ── inside ──
      await shot("03-just-inside", at(-430, 40), at(0, 120, 120))
      await shot("04-counter-wide", at(0, 220), posOf("ServerSpot", 110))
      await shot("05-counter-close", at(0, 0), posOf("SandwichCounter", 95), -6)
      await shot("06-pastry-case", at(-40, 60), posOf("PastryDisplay", 100))
      await shot("07-coffee-station", at(40, 60), posOf("CoffeeArea", 105))
      await shot("08-menu-board", at(0, 90), posOf("MenuBoard"))
      await shot("09-seating-from-counter", at(0, 0), at(0, 320, 100))
      await shot("10-table-2", at(-190, 120), posOf("Table_2", 85))
      await shot("11-table-5", at(10, 120), posOf("Table_5", 85))
      await shot("12-table-7", at(200, 120), posOf("Table_7", 85))
      await shot("13-table-10", at(0, 300), posOf("Table_10", 85))
      await shot("14-tables-4-8-12", at(0, 160), at(0, 410, 80))
      await shot("15-window-bar", at(250, 200), at(470, 190, 100)) // WindowBar is a group at the café origin
      await shot("16-lounge", at(150, 300), posOf("Lounge", 70))
      await shot("17-back-to-counter", at(-150, 480), posOf("ServerSpot", 120))
      await shot("18-entrance-from-inside", at(-200, 120), posOf("Entrance", 120))
      log("SHOTS done")
    } finally {
      t.restoreHead()
    }
  }
}
