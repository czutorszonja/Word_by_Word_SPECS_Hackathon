// DC3_OrderingAtCounter — Done criterion 3 (Use it live, ordering).
// "I can click through ordering a sandwich and coffee: the server's scripted questions
//  ('Mit kér?', 'Mit kér bele?', 'Inni valamit?', 'Itt fogyasztja vagy elvitelre?') each play
//  with a caption, and I answer by selecting phrase cards (picture + Hungarian + English) that
//  play their audio. This includes leaving out an ingredient ('Savanyú uborka nélkül, kérem')
//  and choosing 'Itt eszem.'"
// Drives: real SIK triggers on MenuButton → ModeUseLiveButton and on the PhraseCard_<id> buttons
//         lying on the counter. Waits on order state (audio-gated), never on fixed sleeps.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
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

/** Steps 1–4 of the scripted order via real phrase-card taps; ends waiting for the table. */
export async function orderUpToTable(t: WbwTester): Promise<void> {
  const o = t.order, a = t.audio

  // step 1 — greet
  await checkServerTurn(t, 1, "Jó napot! Mit kér?", "Hello, what would you like?", "s_mit_ker")
  expect(o.orderStepName, "step 1 name").toBe("greet")
  checkCards(t, 1, [
    {id: "jonapot", hu: "Jó napot!", en: "Hello!"},
    {id: "szendvicset", hu: "Egy szendvicset kérek.", en: "I'd like a sandwich, please."},
  ])
  await t.tap("PhraseCard_jonapot")
  await waitFor(() => a.lastVoiceKey === "p_jonapot", "'Jó napot!' card plays its audio")
  expect(o.orderStep, "greeting back does not advance").toBe(1)
  await t.tap("PhraseCard_szendvicset")
  await waitFor(() => a.lastVoiceKey === "p_szendvicset_kerek", "'Egy szendvicset kérek.' plays its audio")

  // step 2 — fillings (multi-pick + Done)
  await checkServerTurn(t, 2, "Mit kér bele?", "What would you like in it?", "s_mit_ker_bele")
  expect(o.orderStepName, "step 2 name").toBe("fillings")
  const offered2 = o.offeredPhraseIds.slice()
  for (const id of ["sonka_sajt", "kerhetek_oliva", "uborka_nelkul", "done"]) {
    expect(offered2.indexOf(id) >= 0, `step 2 offers ${id}`).toBe(true)
  }
  expect(offered2[offered2.length - 1], "'Kész / Done' card is last").toBe("done")
  const uborka = findEnabled("PhraseCard_uborka_nelkul")!
  expect(textOf("Hu", uborka), "leave-out card HU").toBe("Savanyú uborka nélkül, kérem.")
  expect(textOf("En", uborka), "leave-out card EN").toBe("Without pickles, please.")
  expect(child(uborka, "Picture") !== undefined, "leave-out card picture").toBe(true)
  expect(textOf("Hu", findEnabled("PhraseCard_done")!), "Done card HU").toBe("Kész")
  await t.tap("PhraseCard_sonka_sajt")
  await waitFor(() => a.lastVoiceKey === "p_sonka_sajt", "'Sonkát és sajtot kérek.' plays its audio")
  await t.tap("PhraseCard_uborka_nelkul")
  await waitFor(() => a.lastVoiceKey === "p_uborka_nelkul", "'Savanyú uborka nélkül, kérem.' plays its audio")
  expect(o.orderStep, "multi-pick stays on step 2 until Done").toBe(2)
  expect(o.answers.indexOf("uborka_nelkul") >= 0, "leave-out answer recorded").toBe(true)
  await t.tap("PhraseCard_done")

  // step 3 — drink
  await checkServerTurn(t, 3, "Inni valamit?", "Anything to drink?", "s_inni")
  expect(o.orderStepName, "step 3 name").toBe("drink")
  checkCards(t, 3, [{id: "tejes_kave", hu: "Egy kicsi tejes kávét kérek.", en: "A small coffee with milk, please."}])
  await t.tap("PhraseCard_tejes_kave")
  await waitFor(() => a.lastVoiceKey === "p_tejes_kave", "coffee card plays its audio")

  // step 4 — here or takeaway
  await checkServerTurn(t, 4, "Itt fogyasztja vagy elvitelre?", "For here or to take away?", "s_itt_vagy_elvitel")
  expect(o.orderStepName, "step 4 name").toBe("here_or_takeaway")
  checkCards(t, 4, [
    {id: "itt_eszem", hu: "Itt eszem.", en: "I'll eat here."},
    {id: "elvitelre", hu: "Elvitelre, kérem.", en: "Takeaway, please."},
  ])
  await t.tap("PhraseCard_itt_eszem")
  await waitFor(() => a.lastVoiceKey === "p_itt_eszem", "'Itt eszem.' plays its audio")

  // step 5 starts: server asks for the table, then waits for a table to be selected
  await waitFor(() => o.orderStep === 5 && o.lastServerLine === "Hányas asztalnál ül?", "step 5 server line", 15000)
  await waitFor(() => o.waitingFor === "table", "order waits for a table number", 15000)
  expect(a.lastVoiceKey, "step 5 server audio").toBe("s_hanyas_asztal")
  expect(o.answers.join(","), "answers so far").toBe("jonapot,szendvicset,sonka_sajt,uborka_nelkul,done,tejes_kave,itt_eszem")
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
      expect((t.caption.currentEn).indexOf("Turn around") >= 0, "caption tells the user to turn around").toBe(true)
      expect(t.hint.arrowVisible, "edge arrow points to the seating behind the user").toBe(true)
      log("DC3 done")
    } finally {
      t.restoreHead()
    }
  }
}
