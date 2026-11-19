// DC1_ModeMenu — Done criterion 1 (Mode menu).
// "Clicking the ✋ Menu stand-in opens a menu with Learn, Practice and Use it live. I can pick
//  any mode, see which one is active, and reopen the menu to switch modes without losing my
//  saved words."
// Drives: real SIK triggers on SetupConfirmButton, SuggestLearnButton, Learnable_olivabogyo,
//         WordCardSaveButton, WordCardCloseButton, MenuButton, ModeLearnButton / ModePracticeButton /
//         ModeUseLiveButton, ReadyToOrderButton, ModeMenuCloseButton.
// Use it live opens in its prep state (phrase helper shown, the server waits): a saved word never
// fills the phrase, and nothing is ordered until "Ready to order".
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {findEnabled, log, textOf, waitFor, WbwTester} from "./WbwLeafHelpers"

@component
export class DC1_ModeMenu extends Scenario {
  async run(): Promise<void> {
    const t = new WbwTester()
    try {
      await t.completeSetup()
      const m = t.main

      // one saved word so we can prove it survives mode switches
      await t.learnAndSave("olivabogyo")
      expect(m.savedCount, "saved count after saving olives").toBe(1)
      await waitFor(() => textOf("SavedBadge") === "Saved: 1", "HUD SavedBadge 'Saved: 1'")

      // ── open the menu with the stand-in ──
      await t.tap("MenuButton")
      await waitFor(() => m.menuOpen, "menu open after MenuButton")
      for (const b of ["ModeLearnButton", "ModePracticeButton", "ModeUseLiveButton", "ModeMenuCloseButton", "WordsSavedButton"]) {
        expect(t.hasEnabledInteractable(b), `menu shows ${b}`).toBe(true)
      }
      expect(textOf("CurrentCaption"), "menu header caption").toBe("Current mode")
      expect(textOf("ActiveLabel"), "menu header names the current mode (Learn)").toBe("Learn")
      expect(textOf("Label", findEnabled("MenuButton")), "the hand button says Menu (demo)").toBe("Menu (demo)")
      expect(textOf("Label", findEnabled("ModeLearnButton")), "Learn button label").toBe("Learn")
      expect(textOf("Label", findEnabled("ModePracticeButton")), "Practice button label").toBe("Practice")
      expect(textOf("Label", findEnabled("ModeUseLiveButton")), "Use it live button label").toBe("Use it live")
      const learnBtn = findEnabled("ModeLearnButton")!.getComponent(Button.getTypeName()) as Button
      expect(learnBtn.isOn, "Learn button toggled on = active indicator").toBe(true)

      // ── pick Practice ──
      const switches0 = m.modeSwitches
      await t.tap("ModePracticeButton")
      await waitFor(() => m.currentMode === "practice", "mode = practice")
      expect(m.menuOpen, "menu closes after picking a mode").toBe(false)
      expect(t.practice.active, "practice controller active").toBe(true)
      expect(t.learn.active, "learn controller inactive").toBe(false)
      expect(m.modeSwitches, "modeSwitches incremented").toBe(switches0 + 1)
      await waitFor(() => textOf("ModeLabel") === "Mode: Practice", "HUD shows 'Mode: Practice'")
      expect(m.savedCount, "saved words kept after switching to Practice").toBe(1)

      // ── reopen: active indicator follows, pick Use it live ──
      await t.tap("MenuButton")
      await waitFor(() => m.menuOpen, "menu reopened")
      expect(textOf("ActiveLabel"), "menu header names the current mode (Practice)").toBe("Practice")
      const pracBtn = findEnabled("ModePracticeButton")!.getComponent(Button.getTypeName()) as Button
      expect(pracBtn.isOn, "Practice button toggled on").toBe(true)
      await t.tap("ModeUseLiveButton")
      await waitFor(() => m.currentMode === "live", "mode = live")
      expect(t.order.active, "order controller active").toBe(true)
      await waitFor(() => t.order.waitingFor === "ready" && t.order.phraseHelperVisible, "Use it live opens with the phrase helper; the server waits")
      expect(t.order.orderStep, "nothing is ordered before Ready to order").toBe(0)
      expect(t.order.phraseSlotIds.length, "a saved word never fills the phrase").toBe(0) // olives were saved, not carried
      expect(t.order.phraseHu, "empty phrase").toBe("Kérek … a szendvicsembe.")
      await t.startOrdering()
      expect(t.order.orderStep, "Ready to order starts the scripted order at step 1").toBe(1)
      await waitFor(() => textOf("ModeLabel") === "Mode: Use it live", "HUD shows 'Mode: Use it live'")
      expect(m.savedCount, "saved words kept after switching to Use it live").toBe(1)

      // ── back to Learn ──
      await t.switchModeViaMenu("ModeLearnButton", "learn")
      expect(t.learn.active, "learn active again").toBe(true)
      expect(t.order.active, "order inactive").toBe(false)
      expect(m.savedWords.indexOf("olivabogyo") >= 0, "olives still saved after 3 mode switches").toBe(true)
      await waitFor(() => textOf("SavedBadge") === "Saved: 1", "HUD still 'Saved: 1'")

      // ── Words saved: the saved-words viewer (6 per page, by category / date added / A–Z) ──
      await t.tap("MenuButton")
      await waitFor(() => m.menuOpen, "menu open (for Words saved)")
      await t.tap("WordsSavedButton")
      await waitFor(() => m.wordListOpen, "Words saved opens the viewer")
      expect(m.menuOpen, "the menu gives way to the viewer").toBe(false)
      const wl = m.wordList!
      expect(wl.entryCount, "1 café word + 12 street + 12 park words").toBe(25)
      expect(wl.pageCount, "6 words per page").toBe(5)
      expect(wl.shownIds.length, "a full page shows 6 words").toBe(6)
      expect(wl.sort, "opens sorted by category").toBe("category")
      expect(wl.shownIds[0], "the café word comes first by category").toBe("olivabogyo")
      for (const b of ["WordsSortCategory", "WordsSortDate", "WordsSortAlpha", "WordsJump_Café", "WordsJump_Street", "WordsJump_Park", "WordsNextButton", "WordsCloseButton", "WordTile_olivabogyo"]) {
        expect(t.hasEnabledInteractable(b), `viewer shows ${b}`).toBe(true)
      }
      expect(textOf("WordsPage"), "page indicator").toBe("Page 1 / 5")
      await t.tap("WordsNextButton")
      await waitFor(() => wl.page === 1, "Next goes to page 2")
      expect(textOf("WordsPage"), "page indicator after Next").toBe("Page 2 / 5")
      await t.tap("WordsPrevButton")
      await waitFor(() => wl.page === 0, "Back returns to page 1")
      await t.tap("WordsJump_Park")
      await waitFor(() => wl.page === 2, "Park jumps to the page with the first park word")
      expect(wl.shownIds.indexOf("fa") >= 0, "the park page shows fa (tree)").toBe(true)
      await t.tap("WordsSortAlpha")
      await waitFor(() => wl.sort === "alpha" && wl.page === 0, "A–Z sorts alphabetically")
      expect(wl.shownIds[0], "autó comes first A–Z").toBe("auto")
      expect(wl.indexKeys().indexOf("Ö") > wl.indexKeys().indexOf("O"), "Hungarian order: Ö after O").toBe(true)
      await t.tap("WordsLetter_V")
      await waitFor(() => wl.page === wl.pageCount - 1, "V jumps to the last page")
      expect(wl.shownIds.indexOf("villamos") >= 0, "the V page shows villamos").toBe(true)
      await t.tap("WordsSortDate")
      await waitFor(() => wl.sort === "date", "Date added sorts newest first")
      expect(wl.shownIds[0], "today's café word is newest").toBe("olivabogyo")
      await t.tap("WordTile_olivabogyo")
      await waitFor(() => t.audio.lastVoiceKey === "w_olivabogyo", "tapping a word plays it")
      await t.tap("WordsCloseButton")
      await waitFor(() => !m.wordListOpen, "the viewer closes")
      expect(m.currentMode, "browsing words keeps the mode").toBe("learn")

      // ── close button + toggle behaviour ──
      await t.tap("MenuButton")
      await waitFor(() => m.menuOpen, "menu open (for close test)")
      await t.tap("ModeMenuCloseButton")
      await waitFor(() => !m.menuOpen, "menu closed by ModeMenuCloseButton")
      expect(m.currentMode, "closing the menu keeps the mode").toBe("learn")
      await t.tap("MenuButton")
      await waitFor(() => m.menuOpen, "menu open (for toggle test)")
      await t.tap("MenuButton")
      await waitFor(() => !m.menuOpen, "second MenuButton press closes the menu")
      log("DC1 done")
    } finally {
      t.restoreHead()
    }
  }
}
