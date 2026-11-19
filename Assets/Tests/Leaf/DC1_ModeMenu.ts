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
      for (const b of ["ModeLearnButton", "ModePracticeButton", "ModeUseLiveButton", "ModeMenuCloseButton"]) {
        expect(t.hasEnabledInteractable(b), `menu shows ${b}`).toBe(true)
      }
      expect(textOf("ActiveLabel"), "menu active label in Learn").toBe("Active: Learn")
      expect(textOf("SavedCount"), "menu saved count").toBe("Saved words: 1")
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
      expect(textOf("ActiveLabel"), "menu active label in Practice").toBe("Active: Practice")
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
