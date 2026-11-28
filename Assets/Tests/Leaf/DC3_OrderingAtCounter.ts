// DC3_OrderingAtCounter — Done criterion 3 (Use it live, ordering).
// "Use it live opens with the phrase helper in front of me (not on the counter) while the server has
//  not noticed me yet. I reuse one phrase with the ingredients I point at ('Kérek szalámit és
//  paradicsomot a szendvicsembe.'), including leaving one out ('Savanyú uborka nélkül, kérem.'), and
//  can listen to it: none of that orders anything. When I face the server he greets me. Everything of
//  the conversation sits in one strip under his face: his subtitle, then my reply, then 'Say it out
//  loud'. Three replies (28 Nov): after 'Mit kér?' nothing shows at first (I may just answer); if I
//  hesitate, ONE suggestion appears under 'You could say' with Said it at once; at 'Mit kér bele?' my
//  prepared sentence is the reply; then the table. Only saying it moves the order on, and the words of
//  the sentence I said are kept for Practice."
// Drives: real SIK triggers on MenuButton → ModeUseLiveButton, a held hover on Learnable_<id> plus
//         the label's UseThisWordButton / AddWordButton, the helper's PatternWantButton /
//         PatternWithoutButton / PhraseHelperListenButton, a head turn toward the server, the
//         PhraseCard_<id> buttons in the strip, and SaidItButton (the Preview stand-in for speaking).
//         Waits on order state (audio-gated), never on fixed sleeps (two short checks excepted).
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {child, findEnabled, log, textOf, waitFor, WbwTester} from "./WbwLeafHelpers"

interface CardSpec { id: string; hu: string; en: string }

/** A server turn ended and the learner's reply surface is up. His subtitle may already have given way
 *  to the reply (it does when both would not fit under his face), so the subtitle is checked only
 *  while it shows. */
export async function checkServerTurn(t: WbwTester, step: number, hu: string, en: string, voiceKey: string): Promise<void> {
  await t.waitForUserTurn(step)
  expect(t.order.lastServerLine, `step ${step} server line`).toBe(hu)
  if (t.caption.isVisible) {
    expect(t.caption.currentHu, `step ${step} caption HU`).toBe(hu)
    expect(t.caption.currentEn, `step ${step} caption EN`).toBe(en)
    expect(textOf("CaptionHu"), `step ${step} CaptionHu text`).toBe(hu)
    expect(textOf("CaptionEn"), `step ${step} CaptionEn text`).toBe(en)
  }
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

/** The conversation strip: every visible piece sits in the line of sight from the eye to the server's
 *  face (horizontally within a few degrees), below his face, about stripDistanceCm away, stacked top to
 *  bottom in the given order. */
export function checkStrip(t: WbwTester, what: string, objs: SceneObject[]): void {
  const o = t.order
  const eye = t.camPos()
  const face = o.server.getSceneObject().getTransform().getWorldPosition().add(new vec3(0, o.server.heightCm - 12, 0))
  const toFace = face.sub(eye)
  const flatFace = new vec3(toFace.x, 0, toFace.z).normalize()
  let lastY = Number.POSITIVE_INFINITY
  for (const so of objs) {
    const p = so.getTransform().getWorldPosition()
    const d = p.sub(eye)
    const flatD = new vec3(d.x, 0, d.z).normalize()
    const ang = (Math.acos(Math.max(-1, Math.min(1, flatD.dot(flatFace)))) * 180) / Math.PI
    expect(ang < 6, `${what}: ${so.name} in the line of sight to the server (${ang.toFixed(1)}° off)`).toBe(true)
    expect(p.y < face.y, `${what}: ${so.name} below his face`).toBe(true)
    const dist = d.length
    expect(Math.abs(dist - o.stripDistanceCm) < 15, `${what}: ${so.name} about ${o.stripDistanceCm} cm away (${dist.toFixed(0)})`).toBe(true)
    expect(p.y < lastY, `${what}: ${so.name} stacked below the one above`).toBe(true)
    lastY = p.y
  }
}

/** The pieces of the strip that show now, top to bottom (subtitle, reply surface, say-it strip). */
export function stripNow(t: WbwTester): SceneObject[] {
  const out: SceneObject[] = []
  if (t.caption.isVisible) out.push(t.caption.getSceneObject())
  if (t.order.phraseHelperVisible) out.push(t.order.phraseHelper!.getSceneObject())
  else if (t.phrases.isVisible) out.push(t.phrases.getSceneObject())
  const sp = findEnabled("SpeakPrompt")
  if (sp && t.order.waitingForSpeech) out.push(sp)
  return out
}

/** Prep (reuse the phrase while the server waits), facing the server, then steps 1–2 of the scripted
 *  order: the greeting (help only after a pause) and the prepared sentence. Ends waiting for the table. */
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
  expect(findEnabled("HudModeChip") === undefined, "no mode name on the HUD at the counter (28 Nov)").toBe(true)
  {
    // in front of the learner, never lying on the counter
    await sleep(600) // the helper glides after the gaze
    const hp = o.phraseHelper!.getSceneObject().getTransform().getWorldPosition(), eye = t.camPos()
    expect(Math.abs(hp.distance(eye) - o.prepDistanceCm) < 20, `the helper is about ${o.prepDistanceCm} cm in front (${hp.distance(eye).toFixed(0)})`).toBe(true)
    expect(hp.y > eye.y - 45, "the helper floats in front, not down on the counter").toBe(true)
  }
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

  // step 1 — greet: his subtitle in the strip under his face, the helper gone
  await waitFor(() => o.orderStep === 1 && t.caption.isVisible, "his greeting shows as a subtitle")
  expect(o.phraseHelperVisible, "helper hidden during step 1").toBe(false)
  checkStrip(t, "step 1 subtitle", [t.caption.getSceneObject()])
  // after his question nothing is shown: the learner may simply answer (the mic listens)
  await waitFor(() => o.hesitating, "step 1: a silent turn (nothing shown, the learner may answer)", 10000)
  expect(t.phrases.isVisible, "no suggestion while the learner may answer by themselves").toBe(false)
  expect(t.hasEnabledInteractable("SaidItButton"), "no Said it while nothing is suggested").toBe(false)
  // hesitating: after hesitationSec ONE suggestion appears, with Said it at once
  await checkServerTurn(t, 1, "Jó napot! Mit kér?", "Hello, what would you like?", "s_mit_ker")
  expect(o.orderStepName, "step 1 name").toBe("greet")
  checkCards(t, 1, [{id: "szendvicset", hu: "Egy szendvicset kérek.", en: "I'd like a sandwich, please."}])
  expect(o.hesitating, "the pause is over").toBe(false)
  await waitFor(() => o.waitingForSpeech && t.hasEnabledInteractable("SaidItButton"), "Said it shows with the one suggestion", 2000)
  checkStrip(t, "step 1 suggestion", stripNow(t))
  await t.tap("PhraseCard_szendvicset")
  await waitFor(() => a.lastVoiceKey === "p_szendvicset_kerek", "tapping the suggestion still plays it")
  expect(o.orderStep, "choosing does not submit").toBe(1)
  await sleep(800) // a re-opened turn must keep its prompt
  expect(o.waitingForSpeech && t.hasEnabledInteractable("SaidItButton"), "Said it still offered 0.8 s after choosing").toBe(true)
  await t.sayIt()

  // step 2 — fillings: the prepared phrase is the answer
  await checkServerTurn(t, 2, "Mit kér bele?", "What would you like in it?", "s_mit_ker_bele")
  expect(o.orderStepName, "step 2 name").toBe("fillings")
  expect(t.phrases.isVisible, "no phrase cards at step 2").toBe(false)
  expect(o.offeredPhraseIds.length, "nothing offered as cards").toBe(0)
  expect(findEnabled("PhraseHelper") !== undefined && o.phraseHelperVisible, "phrase helper is the answer surface").toBe(true)
  expect(o.phraseHu, "prepared phrase kept").toBe("Kérek szalámit és paradicsomot a szendvicsembe.")
  await waitFor(() => o.waitingForSpeech && t.hasEnabledInteractable("SaidItButton"), "the turn opens when the question ends (phrase ready)", 3000)
  // in the strip the sentence shows compact (no Listen / pattern row): prepared, now said
  expect(o.phraseHelper!.compact, "the strip shows the sentence only").toBe(true)
  expect(findEnabled("PatternWithoutButton") === undefined && findEnabled("PhraseHelperListenButton") === undefined, "no button row in the strip").toBe(true)
  checkStrip(t, "step 2", stripNow(t))
  const saved0 = t.main.savedWords.slice()
  await t.sayIt()
  expect(o.fillingsSaid, "what was said at step 2").toBe("Kérek szalámit és paradicsomot a szendvicsembe.")
  // the words of the sentence said are kept with the saved words, for Practice
  for (const id of ["szalami", "paradicsom"]) {
    expect(t.main.savedWords.indexOf(id) >= 0, `'${id}' kept from the order`).toBe(true)
    if (saved0.indexOf(id) < 0) expect(o.keptFromOrder.indexOf(id) >= 0, `'${id}' listed as kept from the order`).toBe(true)
  }

  // step 3 starts: the server asks for the table, then waits for a table number to be read
  await waitFor(() => o.orderStep === 3 && o.lastServerLine === "Hányas asztalnál ül?", "step 3 server line", 15000)
  await waitFor(() => o.waitingFor === "table", "order waits for a table number", 15000)
  expect(o.orderStepName, "step 3 name").toBe("table")
  expect(a.lastVoiceKey, "step 3 server audio").toBe("s_hanyas_asztal")
  expect(o.answers.join(","), "answers so far").toBe("szendvicset,fillings")
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
      expect(t.caption.currentHu, "table question caption").toBe("Hányas asztalnál ül?")
      // real life: no coach hint or arrow; the reply waits with its blank until a table number is read
      expect(t.hint.hintText, "no coach hint at the table question").toBe("")
      expect(t.hint.arrowVisible, "no edge arrow at the table question").toBe(false)
      const blank = findEnabled("PhraseCard_table_blank")
      expect(blank !== undefined, "the table reply shows with its blank").toBe(true)
      expect(textOf("Hu", blank!), "table reply with a blank").toBe("A … asztalnál ülök.")
      expect(t.hasEnabledInteractable("PhraseCard_table_blank"), "the blank reply is not pressable").toBe(false)
      expect(textOf("Prompt", findEnabled("PhraseChoices")), "replies are suggestions").toBe("You could say")
      checkStrip(t, "step 3 blank", stripNow(t))
      log("DC3 done")
    } finally {
      t.restoreHead()
    }
  }
}
