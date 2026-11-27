// SHOTS_Stage24 — not a done-criterion test: holds the menu and the language settings still for the
// development-timeline screenshots (stage 24): the setup panel's note, the five-tile menu, the Languages
// first step (I speak / I'm learning) and the I'm-learning list with the "not in this demo yet" note.
// Prints "SHOT:<name>" at the start of each hold.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {log, waitFor, WbwTester} from "./WbwLeafHelpers"

const HOLD_S = 6

@component
export class SHOTS_Stage24 extends Scenario {
  async run(): Promise<void> {
    const t = new WbwTester()
    const hold = async (name: string) => {
      log(`SHOT:${name}`)
      await sleep(HOLD_S * 1000)
    }
    try {
      const m = t.main
      await waitFor(() => m.setupPanel.isVisible && t.hasEnabledInteractable("SetupConfirmButton"), "setup panel", 15000)
      t.quietMouse()
      await sleep(1500)
      await hold("setup-note")
      await t.completeSetup() // Learn, at the counter
      await t.setHead(t.eyeAt(0, 0), 0, -6)
      await t.tap("MenuButton")
      await waitFor(() => m.menuOpen && t.hasEnabledInteractable("LanguagesButton"), "menu with Languages")
      await sleep(1200)
      await hold("menu-five-tiles")
      await t.tap("LanguagesButton")
      await waitFor(() => m.languagesOpen, "Languages open")
      await sleep(1200)
      await hold("languages-home")
      await t.tap("LanguagesLearn")
      await waitFor(() => m.languages!.screen === "learn", "I'm learning list")
      await sleep(800)
      await hold("languages-learn-list")
      await t.tap("Language_de")
      await waitFor(() => m.languages!.note.indexOf("Deutsch") === 0, "Deutsch note")
      await sleep(800)
      await hold("languages-deutsch-not-in-demo")
      await t.tap("LanguagesBackButton")
      await waitFor(() => m.languages!.screen === "home", "back home")
      await t.tap("LanguagesSpeak")
      await waitFor(() => m.languages!.screen === "speak", "I speak list")
      await sleep(800)
      await hold("languages-speak-list")
      log("SHOTS done")
    } finally {
      t.restoreHead()
    }
  }
}
