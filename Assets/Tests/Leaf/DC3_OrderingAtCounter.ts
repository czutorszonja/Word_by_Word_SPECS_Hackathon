// DC3_OrderingAtCounter — Done criterion 3 (Use it live, ordering).
// "Use it live opens with the phrase helper while the server has not noticed me yet. I
//  reuse one phrase with the ingredients I point at ('Kérek szalámit és paradicsomot a
//  szendvicsembe.'), including leaving one out ('Savanyú uborka nélkül, kérem.'), and can listen
//  to it: none of that orders anything. When I face the server at the counter he greets me (no
//  'Ready to order' button since 26 Nov: the glasses only help) and I go through ordering a sandwich
//  and coffee: the server's scripted questions ('Mit kér?', 'Mit kér bele?', 'Inni valamit?',
//  'Itt fogyasztja vagy elvitelre?') each play with a caption. I answer by choosing a phrase card
//  (picture + Hungarian + English) that plays its audio, or, for the fillings, with my prepared
//  phrase, and then saying it: only saying it moves the order on. This includes choosing
//  'Itt eszem.'"
// Drives: real SIK triggers on MenuButton → ModeUseLiveButton, a held hover on Learnable_<id> plus
//         the label's UseThisWordButton / AddWordButton, the helper's PatternWantButton /
//         PatternWithoutButton / PhraseHelperListenButton, a head turn toward the server, the PhraseCard_<id>
//         buttons lying on the counter, and SaidItButton (the Preview stand-in for speaking).
//         Waits on order state (audio-gated), never on fixed sleeps (one 0.8 s check excepted).
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {child, findEnabled, log, textOf, waitFor, WbwTester} from "./WbwLeafHelpers"

interface CardSpec { id: string; hu: string; en: string }

export async function checkServerTurn(t: WbwTester, step: number, hu: string, en: string, voiceKey: string): Promise<void> {
  await t.waitForUserTurn(step)
  expect(t.order.lastServerLine, `step ${step} server line`).toBe(hu)
  expect(t.caption.isVisible, `step ${step} caption visible`).toBe(true)
  expect(t.caption.currentHu, `step ${step} caption HU`).toBe(hu)
  expect(t.caption.currentEn, `step ${step} caption EN`).toBe(en)
  expect(textOf("CaptionHu"), `step ${step} CaptionHu text`).toBe(hu)
  expect(textOf("CaptionEn"), `step ${step} CaptionEn text`).toBe(en)
  expect(t.audio.lastVoiceKey, `step ${step} server line audio played`).toBe(voiceKey)
}

export function checkCards(t: WbwTester, step: number, cards: CardSpec[]): void {
  const ids = cards.map((c) => c.id)
  expect(t.order.offeredPhraseIds.join(","), `step ${step} offered phrases`).toBe(ids.join(","))
  expect(t.phrases.offeredIds.join(","), `step ${step} phrase UI shows`).toBe(ids.join(","))
  for (const c of cards) {
    const so = findEnabled(`PhraseCard_${c.id}`)
    expect(so !== undefined, `step ${step}: PhraseCard_${c.id} visible`).toBe(true)
    expect(textOf("Hu", so!), `PhraseCard_${c.id} Hungarian`).toBe(c.hu)
    expect(textOf("En", so!), `PhraseCard_${c.id} English`).toBe(c.en)
    const pic = child(so!, "Picture")
    expect(pic !== undefined && pic.getComponent("Component.Image") !== null, `PhraseCard_${c.id} has a picture`).toBe(true)
  }
}

/** Prep (reuse the phrase while the server waits), "Ready to order", then steps 1–4 of the scripted
 *  order: every answer is chosen, played, then said (Said it). Ends waiting for the table. */
export async function orderUpToTable(t: WbwTester): Promise<void> {
  const o = t.order, a = t.audio

  // prep — the server waits; the phrase helper is the only surface
  await waitFor(() => o.waitingFor === "ready" && o.phraseHelperVisible, "prep state: helper shown, server quiet")
  const v0 = a.voicePlayCount
  expect(o.orderStep, "prep keeps step 0").toBe(0)
  expect(o.orderStepName, "prep step name").toBe("prep")
  expect(t.caption.isVisible, "no server caption in prep").toBe(false)
  expect(t.phrases.isVisible, "no phrase cards in prep").toBe(false)
  const helper0 = findEnabled("PhraseHelper")
  expect(helper0 !== undefined, "PhraseHelper visible").toBe(true)
  expect(textOf("ChipLabel", findEnabled("HudModeChip")), "the HUD chip names the mode (the phrase panel has none)").toBe("Use it live")
  expect(o.phraseHu, "empty phrase (nothing carried)").toBe("Kérek … a szendvicsembe.")
  expect(o.phraseEn, "empty phrase EN").toBe("I'd like … in my sandwich.")
  expect(o.phraseAudioKey, "nothing to play").toBe("")
  expect(t.hasEnabledInteractable("PhraseHelperListenButton"), "Listen inactive while empty").toBe(false)
  expect(findEnabled("ReadyToOrderButton") === undefined, "no Ready to order button (the server notices the learner)").toBe(true)
  expect(o.waitingForSpeech, "nothing to say in prep").toBe(false)
  // reuse the same phrase: leave something out …
  await t.useWord("uborka")
  expect(o.phraseHu, "pickles HU").toBe("Kérek savanyú uborkát a szendvicsembe.")
  await t.tap("PatternWithoutButton")
  await waitFor(() => o.phrasePattern === "without", "'… nélkül, kérem.' pattern")
  expect(o.phraseHu, "without HU").toBe("Savanyú uborka nélkül, kérem.")
  expect(o.phraseEn, "without EN").toBe("Without pickles, please.")
  expect(o.phraseAudioKey, "without audio").toBe("p_nelkul_uborka")
  // … and with other words
  await t.tap("PatternWantButton")
  await waitFor(() => o.phrasePattern === "want", "'Kérek …' pattern")
  await t.useWord("szalami")
  expect(o.phraseSlotIds.join(","), "Use this word replaces the slot").toBe("szalami")
  expect(o.phraseHu, "want HU").toBe("Kérek szalámit a szendvicsembe.")
  expect(o.phraseAudioKey, "want audio").toBe("p_kerek_szalami")
  await t.useWord("paradicsom", true)
  expect(o.phraseHu, "combined HU").toBe("Kérek szalámit és paradicsomot a szendvicsembe.")
  expect(o.phraseEn, "combined EN").toBe("I'd like salami and tomato in my sandwich.")
  expect(o.phraseAudioKey, "combined audio").toBe("c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe")
  expect(findEnabled("PhraseHelper")!.uniqueIdentifier, "same helper object across edits").toBe(helper0!.uniqueIdentifier)
  await t.waitAudioIdle() // "+ és" auto-played this key; count clip parts only when idle
  const lv0 = a.voicePlayCount
  await t.tap("PhraseHelperListenButton")
  await waitFor(() => a.voicePlayCount > lv0 && a.lastVoiceKey === o.phraseAudioKey, "Listen plays the phrase again")
  expect(o.orderStep, "showing, editing and listening never submit").toBe(0)
  expect(o.waitingFor, "the server has not noticed the learner yet").toBe("ready")
  expect(o.answers.length, "nothing answered").toBe(0)
  expect(o.lastServerLine, "the server has not spoken").toBe("")
  expect(a.voicePlayCount > v0, "the learner's own phrase played").toBe(true)
  // looking down at the counter in front of him (building the sentence) is not facing him
  {
    const eye = t.camPos()
    const server = o.server.getSceneObject().getTransform().getWorldPosition()
    await t.setHead(eye, t.yawToward(eye, server), -40)
    o.serverNotices = true
    await sleep(2500)
    expect(o.waitingFor, "looking down at the counter does not make the server greet").toBe("ready")
    o.serverNotices = false
  }
  await t.startOrdering()

  // step 1 — greet (two cards; the helper is hidden)
  await checkServerTurn(t, 1, "Jó napot! Mit kér?", "Hello, what would you like?", "s_mit_ker")
  expect(o.orderStepName, "step 1 name").toBe("greet")
  expect(o.phraseHelperVisible, "helper hidden during step 1").toBe(false)
  checkCards(t, 1, [
    {id: "jonapot", hu: "Jó napot!", en: "Hello!"},
    {id: "szendvicset", hu: "Egy szendvicset kérek.", en: "I'd like a sandwich, please."},
  ])
  expect(o.waitingForSpeech, "no turn before a card is chosen").toBe(false)
  await t.tap("PhraseCard_jonapot")
  await waitFor(() => a.lastVoiceKey === "p_jonapot", "'Jó napot!' card plays its audio")
  expect(o.orderStep, "choosing does not submit").toBe(1)
  expect(o.chosenPhraseId, "chosen card").toBe("jonapot")
  await t.sayIt()
  expect(o.orderStep, "greeting back does not advance").toBe(1)
  expect(o.offeredPhraseIds.join(","), "step 1 cards still offered").toBe("jonapot,szendvicset")
  await t.tap("PhraseCard_szendvicset")
  await waitFor(() => a.lastVoiceKey === "p_szendvicset_kerek", "'Egy szendvicset kérek.' plays its audio")
  expect(o.orderStep, "choosing does not submit").toBe(1)
  await sleep(800) // the previous "Heard you ✓" hide must not hide this prompt
  expect(o.waitingForSpeech && t.hasEnabledInteractable("SaidItButton"), "Said it still offered 0.8 s after choosing").toBe(true)
  await t.sayIt()

  // step 2 — fillings: the prepared phrase is the answer (the fixed step-2 cards are gone)
  await checkServerTurn(t, 2, "Mit kér bele?", "What would you like in it?", "s_mit_ker_bele")
  expect(o.orderStepName, "step 2 name").toBe("fillings")
  expect(t.phrases.isVisible, "no phrase cards at step 2").toBe(false)
  expect(o.offeredPhraseIds.length, "nothing offered as cards").toBe(0)
  for (const old of ["sonka_sajt", "kerhetek_oliva", "uborka_nelkul", "szalami_sajt", "csirke_paprika", "done"]) {
    expect(findEnabled(`PhraseCard_${old}`) === undefined, `no PhraseCard_${old}`).toBe(true)
  }
  expect(findEnabled("PhraseHelper") !== undefined && o.phraseHelperVisible, "phrase helper is the answer surface").toBe(true)
  expect(o.phraseHu, "prepared phrase kept").toBe("Kérek szalámit és paradicsomot a szendvicsembe.")
  await waitFor(() => o.waitingForSpeech && t.hasEnabledInteractable("SaidItButton"), "the turn opens when the question ends (phrase ready)", 3000)
  await t.tap("PatternWithoutButton") // an edit with the turn open
  await waitFor(() => o.phrasePattern === "without", "pattern switch at step 2")
  expect(o.phraseHu, "without, two words").toBe("Szalámi és paradicsom nélkül, kérem.")
  expect(o.phraseAudioKey, "without audio, two words").toBe("w_szalami+c_es+w_paradicsom+c_nelkul+c_kerem")
  expect(o.waitingForSpeech, "the turn stays open across edits").toBe(true)
  expect(o.orderStep, "editing never submits").toBe(2)
  await t.tap("PatternWantButton")
  await waitFor(() => o.phrasePattern === "want", "back to 'Kérek …'")
  await t.sayIt()
  expect(o.fillingsSaid, "what was said at step 2").toBe("Kérek szalámit és paradicsomot a szendvicsembe.")

  // step 3 — drink
  await checkServerTurn(t, 3, "Inni valamit?", "Anything to drink?", "s_inni")
  expect(o.orderStepName, "step 3 name").toBe("drink")
  checkCards(t, 3, [{id: "tejes_kave", hu: "Egy kicsi tejeskávét kérek.", en: "A small coffee with milk, please."}])
  await t.tap("PhraseCard_tejes_kave")
  await waitFor(() => a.lastVoiceKey === "p_tejes_kave", "coffee card plays its audio")
  await t.sayIt()

  // step 4 — here or takeaway
  await checkServerTurn(t, 4, "Itt fogyasztja vagy elvitelre?", "For here or to take away?", "s_itt_vagy_elvitel")
  expect(o.orderStepName, "step 4 name").toBe("here_or_takeaway")
  checkCards(t, 4, [
    {id: "itt_eszem", hu: "Itt eszem.", en: "I'll eat here."},
    {id: "elvitelre", hu: "Elvitelre, kérem.", en: "Takeaway, please."},
  ])
  await t.tap("PhraseCard_itt_eszem")
  await waitFor(() => a.lastVoiceKey === "p_itt_eszem", "'Itt eszem.' plays its audio")
  await t.sayIt()

  // step 5 starts: server asks for the table, then waits for a table to be selected
  await waitFor(() => o.orderStep === 5 && o.lastServerLine === "Hányas asztalnál ül?", "step 5 server line", 15000)
  await waitFor(() => o.waitingFor === "table", "order waits for a table number", 15000)
  expect(a.lastVoiceKey, "step 5 server audio").toBe("s_hanyas_asztal")
  expect(o.answers.join(","), "answers so far").toBe("jonapot,szendvicset,fillings,tejes_kave,itt_eszem")
}

@component
export class DC3_OrderingAtCounter extends Scenario {
  async run(): Promise<void> {
    const t = new WbwTester()
    try {
      await t.completeSetup()
      await t.setHead(t.eyeAt(0, 0), 0, -15) // at the counter, facing the server
      await t.switchModeViaMenu("ModeUseLiveButton", "live")
      expect(t.order.active, "order controller active").toBe(true)
      await orderUpToTable(t)
      expect(t.caption.currentHu, "table question caption stays up").toBe("Hányas asztalnál ül?")
      // real life: no coach hint or arrow; the reply waits with its blank until a table number is read
      expect(t.hint.hintText, "no coach hint at the table question").toBe("")
      expect(t.hint.arrowVisible, "no edge arrow at the table question").toBe(false)
      const blank = findEnabled("PhraseCard_table_blank")
      expect(blank !== undefined, "the table reply shows with its blank").toBe(true)
      expect(textOf("Hu", blank!), "table reply with a blank").toBe("A … asztalnál ülök.")
      expect(t.hasEnabledInteractable("PhraseCard_table_blank"), "the blank reply is not pressable").toBe(false)
      expect(textOf("Prompt", findEnabled("PhraseChoices")), "replies are suggestions").toBe("You could say")
      log("DC3 done")
    } finally {
      t.restoreHead()
    }
  }
}
