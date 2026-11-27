// DC1_ModeMenu — Done criterion 1 (Mode menu).
// "Clicking the ✋ Menu stand-in opens a menu with Learn, Practice and Use it live. I can pick
//  any mode, see which one is active, and reopen the menu to switch modes without losing my
//  saved words."
// Drives: real SIK triggers on SetupConfirmButton, SuggestLearnButton, Learnable_olivabogyo,
//         WordCardSaveButton, WordCardCloseButton, MenuButton, ModeLearnButton / ModePracticeButton /
//         ModeUseLiveButton, ModeMenuCloseButton, the saved-words steps (WordsView*, WordsCategory_*, WordsPeriod_*, WordsBackButton)
//         and the language settings (LanguagesButton, LanguagesLearn, Language_de, Language_hu, LanguagesCloseButton).
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

      // ── Words saved: one step at a time (26 Nov): how to look → category / time range → the words ──
      await t.tap("MenuButton")
      await waitFor(() => m.menuOpen, "menu open (for Words saved)")
      await t.tap("WordsSavedButton")
      await waitFor(() => m.wordListOpen, "Words saved opens the viewer")
      expect(m.menuOpen, "the menu gives way to the viewer").toBe(false)
      const wl = m.wordList!
      expect(wl.entryCount, "1 café word + 12 street + 12 park words").toBe(25)
      expect(wl.screen, "opens on the first step").toBe("home")
      expect(textOf("WordsTitle"), "first step title").toBe("Saved words")
      for (const b of ["WordsViewCategory", "WordsViewDate", "WordsViewAlpha", "WordsCloseButton"]) {
        expect(t.hasEnabledInteractable(b), `first step shows ${b}`).toBe(true)
      }
      expect(findEnabled("WordTile_olivabogyo") === undefined, "no words on the first step").toBe(true)
      expect(findEnabled("WordsBackButton") === undefined, "no Back on the first step").toBe(true)

      // by category: only the categories (A–Z), then one category's words
      await t.tap("WordsViewCategory")
      await waitFor(() => wl.screen === "categories", "By category lists the categories")
      expect(wl.categories().join(","), "categories in alphabetical order").toBe("Café,Park,Street")
      for (const c of ["Café", "Park", "Street"]) expect(t.hasEnabledInteractable(`WordsCategory_${c}`), `category ${c} offered`).toBe(true)
      expect(findEnabled("WordTile_fa") === undefined, "no words on the category step").toBe(true)
      await t.tap("WordsCategory_Park")
      await waitFor(() => wl.screen === "words" && wl.category === "Park", "a category opens its words")
      expect(textOf("WordsTitle"), "the list is titled with its category").toBe("Park")
      expect(wl.listCount, "12 park words").toBe(12)
      expect(wl.shownIds[0], "park words A–Z: fa first").toBe("fa")
      expect(wl.shownIds.indexOf("olivabogyo") < 0, "no café word in the park list").toBe(true)
      expect(textOf("WordsPage"), "page indicator").toBe("1 / 2")
      await t.tap("WordsNextButton")
      await waitFor(() => wl.page === 1, "Next goes to page 2")
      expect(wl.shownIds.indexOf("virag") >= 0, "virág is on the last park page").toBe(true)
      await t.tap("WordsPrevButton")
      await waitFor(() => wl.page === 0, "Previous returns to page 1")
      await t.tap("WordsBackButton")
      await waitFor(() => wl.screen === "categories", "Back returns to the categories")
      await t.tap("WordsBackButton")
      await waitFor(() => wl.screen === "home", "Back again returns to the first step")

      // by date added: pick a time range, then newest / oldest first
      await t.tap("WordsViewDate")
      await waitFor(() => wl.screen === "periods", "By date added lists the time ranges")
      for (const p of ["recent", "week", "month", "all"]) expect(t.hasEnabledInteractable(`WordsPeriod_${p}`), `range ${p} offered`).toBe(true)
      await t.tap("WordsPeriod_recent")
      await waitFor(() => wl.screen === "words" && wl.period === "recent", "Most recent opens its words")
      expect(wl.shownIds.join(","), "most recent = today's café word").toBe("olivabogyo")
      expect(findEnabled("WordsNextButton") === undefined, "one page: no pager").toBe(true)
      await t.tap("WordsBackButton")
      await waitFor(() => wl.screen === "periods", "Back returns to the time ranges")
      await t.tap("WordsPeriod_week")
      await waitFor(() => wl.screen === "words" && wl.period === "week", "Last 7 days opens its words")
      expect(wl.listCount, "all 25 words are from the last week").toBe(25)
      expect(wl.shownIds[0], "newest first: today's café word").toBe("olivabogyo")
      await t.tap("WordsOldestFirst")
      await waitFor(() => wl.dateOrder === "oldest", "Oldest first")
      expect(wl.shownIds.indexOf("olivabogyo") < 0, "oldest first: today's word is not on the first page").toBe(true)
      expect(wl.shownIds[0], "oldest first: a street word from three days ago").toBe("utca")
      await t.tap("WordsNewestFirst")
      await waitFor(() => wl.dateOrder === "newest" && wl.shownIds[0] === "olivabogyo", "Newest first again")
      await t.tap("WordTile_olivabogyo")
      await waitFor(() => t.audio.lastVoiceKey === "w_olivabogyo", "tapping a word plays it")
      await t.tap("WordsBackButton")
      await t.tap("WordsBackButton")
      await waitFor(() => wl.screen === "home", "back to the first step")

      // A to Z: straight to every word, Hungarian order
      await t.tap("WordsViewAlpha")
      await waitFor(() => wl.screen === "words" && wl.view === "alpha", "A to Z opens every word")
      expect(wl.listCount, "all 25 words").toBe(25)
      expect(wl.shownIds[0], "autó comes first A–Z").toBe("auto")
      expect(wl.pageCount, "6 words per page").toBe(5)
      await t.tap("WordsCloseButton")
      await waitFor(() => !m.wordListOpen, "the viewer closes")
      expect(m.currentMode, "browsing words keeps the mode").toBe("learn")

      // ── Languages: the pair is a setting (the demo carries English → Hungarian) ──
      await t.tap("MenuButton")
      await waitFor(() => m.menuOpen && t.hasEnabledInteractable("LanguagesButton"), "menu offers Languages")
      await t.tap("LanguagesButton")
      await waitFor(() => m.languagesOpen && !m.menuOpen, "Languages replaces the menu")
      const lg = m.languages!
      expect(lg.screen, "Languages opens on its first step").toBe("home")
      expect(textOf("Value", findEnabled("LanguagesSpeak")), "I speak").toBe("English")
      expect(textOf("Value", findEnabled("LanguagesLearn")), "I'm learning").toBe("Hungarian · Magyar")
      await t.tap("LanguagesLearn")
      await waitFor(() => lg.screen === "learn", "I'm learning lists the languages")
      expect(lg.shownCodes.join(","), "languages to learn (not the one I speak)").toBe("hu,de,es,fr,it")
      expect(findEnabled("Language_hu")!.getComponent(Button.getTypeName()).isOn, "Hungarian is the current choice").toBe(true)
      await t.tap("Language_de")
      await waitFor(() => lg.note.indexOf("Deutsch is not in this demo") === 0, "German says it is not in this demo")
      expect(lg.learn, "a pack that is not in the demo does not switch").toBe("hu")
      expect(lg.screen, "still on the list").toBe("learn")
      await t.tap("Language_hu")
      await waitFor(() => lg.screen === "home" && lg.learn === "hu", "choosing Hungarian returns to the first step")
      await t.tap("LanguagesCloseButton")
      await waitFor(() => !m.languagesOpen, "Languages closes")
      expect(m.currentMode, "language settings keep the mode").toBe("learn")

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
