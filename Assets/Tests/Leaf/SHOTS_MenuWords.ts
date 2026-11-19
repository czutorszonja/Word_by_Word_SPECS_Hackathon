// SHOTS_MenuWords — not a done-criterion test: holds the menu and the saved-words viewer still in
// each state for a few seconds so the development-timeline screenshots can be taken. Prints
// "SHOT:<name>" at the start of each hold.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {log, waitFor, WbwTester} from "./WbwLeafHelpers"

const HOLD_S = 7

@component
export class SHOTS_MenuWords extends Scenario {
  async run(): Promise<void> {
    const t = new WbwTester()
    const hold = async (name: string) => {
      log(`SHOT:${name}`)
      await sleep(HOLD_S * 1000)
    }
    try {
      await t.completeSetup()
      const m = t.main
      await t.learnAndSave("olivabogyo")
      await t.learnAndSave("szalami")
      await t.faceCounter(-12)
      await hold("menu-button")
      await t.tap("MenuButton")
      await waitFor(() => m.menuOpen, "menu open")
      await hold("menu-current-mode-learn")
      await t.tap("WordsSavedButton")
      await waitFor(() => m.wordListOpen, "viewer open")
      await hold("words-by-category")
      await t.tap("WordsJump_Park")
      await hold("words-park-page")
      await t.tap("WordsSortAlpha")
      await hold("words-a-z")
      await t.tap("WordsSortDate")
      await hold("words-date-added")
      await t.tap("WordsCloseButton")
      await t.switchModeViaMenu("ModePracticeButton", "practice")
      await t.tap("MenuButton")
      await waitFor(() => m.menuOpen, "menu reopened")
      await hold("menu-current-mode-practice")
      await t.tap("ModeLearnButton")
      log("SHOTS done")
    } finally {
      t.restoreHead()
    }
  }
}
