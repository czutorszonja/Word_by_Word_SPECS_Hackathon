// StoryTour.ts — LEAF scenario "TOUR_Story": the watchable story tour of Word by Word.
// Storyboard: Look around → Point to reveal → Select to listen → Save → Open Use it live → Reuse the
// same phrase, then the order with the server, the table number and seated Practice.
// Four acts: 1 Arrival (setup → walk in → "Café detected (demo)" → suggestion → Learn) ·
//            2 Learn (quiet markers, silent hover label with one bracket and a pointer dot, steady
//              card that plays once, Listen again, Save → "Saved ✓", four words, select the label,
//              "Use it live →") ·
//            3 Use it live (PREP: the phrase helper holds the carried word and the server waits;
//              Use this word / + és / Listen never order; "Ready to order" starts the greeting; every
//              answer is chosen, played, then said) ·
//            4 Seated practice at table 8.
// It is both a recording script and an end-to-end check. Run it ALONE from the LEAF panel, Preview
// large, mouse off the Preview, Preview mic off. Pace: 1 = recording (about 2:45); pass the optional
// scenario parameter "pace" (e.g. 0.25) for a regression run (about 60–70 s, bounded by the audio).
// Every wait on audio or flow is state-based; pause() exists only for viewing. Each beat prints
// "[WbwLeaf] beat <id> — <what>" (edit points for the video).
// Hard expects = agreed-design invariants (silent hover, one bracket, steady card, saving ≠ ordering,
// showing ≠ submitting, exact phrase strings). Soft checks = layout/feel details: they log
// "SOFT CHECK FAILED" and the run continues, so a recording take is not lost to a 2 cm placement
// difference.
// Test-only: never edits game scripts or scene content. Camera moves are runtime-only and are
// undone by the Lens reset LEAF performs before each scenario.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {ScenarioConfig} from "Leaf.lspkg/Scenarios/scenario/ScenarioConfig"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {findSceneObjectsByName, nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {child, findEnabled, horiz, log, tableCard, textOf, waitFor, WbwTester} from "./WbwLeafHelpers"
import {wordById} from "../../Scripts/WbwVocab"

// ── pacing ────────────────────────────────────────────────────────────────
/** Pace of a recording take. */
const RECORDING_PACE = 1.0
/** Scales every pause and glide: 1 = recording pace, 0.25 = regression pace. Set at the start of each
 *  run from the optional scenario parameter "pace". */
let PACE = RECORDING_PACE
/** DEMO_Video reuses the Tour moves at recording pace (PACE persists between runs in one Lens session). */
export function setTourPace(p: number): void {
  PACE = p
}
const GLANCE = 0.6, READ = 1.5, READ_LONG = 2.5, SPEAK = 1.3
/** Optional beats (U1b Listen, U5b pattern switch, the "Jó napot!" greeting) add about 9 s. */
const OPTIONAL_BEATS = false
/** true: practise seated on table 8's free chair; false: the standing pose on the counter side. */
const SEATED_PRACTICE = true

const D2R = Math.PI / 180
type Ease = "inOut" | "out" | "linear"
type Turn = "left" | "right"

async function pause(s: number): Promise<void> {
  await sleep(Math.max(50, s * PACE * 1000))
}

function soft(ok: boolean, what: string): void {
  if (!ok) log(`SOFT CHECK FAILED: ${what}`)
}

function enabledCount(name: string): number {
  return findSceneObjectsByName(name).filter((o) => !isNull(o) && o.isEnabledInHierarchy).length
}

async function interactableNamed(name: string, timeoutMs: number = 6000): Promise<Interactable> {
  let it: Interactable | undefined
  await waitFor(() => {
    it = findInteractableByName(name, undefined, true)
    return it !== undefined
  }, `enabled Interactable on "${name}"`, timeoutMs)
  return it!
}

/** Café-local head pose (eye x/z/height), or a world position via `at`. Orientation: explicit
 *  yaw/pitch, or aim at a SceneObject name / world point plus a framing offset. */
interface Pose {
  x?: number
  z?: number
  h?: number
  at?: vec3
  yaw?: number
  pitch?: number
  look?: string | vec3
  dYaw?: number
  dPitch?: number
}

/** Every Phase C field the tour reads, in ONE place (rename here when a name changes).
 *  Read through `any`, so a missing field shows up as a failed check, not as a compile error. */
function phaseCState(t: WbwTester) {
  const L = () => t.learn as any
  const O = () => t.order as any
  const M = () => t.main as any
  const A = () => t.audio as any
  return {
    hoveredId: (): string => L().hoveredId ?? "",
    labelForId: (): string => L().labelForId ?? "",
    labelMode: (): string => L().labelMode ?? "",
    cardWordId: (): string => L().cardWordId ?? L().activeCardWordId ?? "",
    cardPlayCount: (): number => L().cardPlayCount ?? -1,
    pointerRayVisible: (): boolean => !!L().pointerRayVisible,
    pointerDotVisible: (): boolean => !!L().pointerDotVisible,
    waitingFor: (): string => O().waitingFor ?? "",
    orderStepName: (): string => O().orderStepName ?? "",
    phraseSlotIds: (): string => ((O().phraseSlotIds ?? []) as string[]).join(","),
    phrasePattern: (): string => O().phrasePattern ?? "",
    phraseHu: (): string => O().phraseHu ?? "",
    phraseEn: (): string => O().phraseEn ?? "",
    phraseAudioKey: (): string => O().phraseAudioKey ?? "",
    phraseHelperVisible: (): boolean => !!O().phraseHelperVisible,
    waitingForSpeech: (): boolean => !!O().waitingForSpeech,
    speechDetected: (): boolean => !!O().speechDetected,
    speechSource: (): string => O().speechSource ?? "",
    suggestionVisible: (): boolean => !!M().suggestionVisible,
    suggestionPick: (): string => M().suggestionPick ?? "",
    arrivalPhase: (): string => M().arrivalPhase ?? "",
    toastTrigger: (): string => M().toastTrigger ?? "",
    startSpotLocal: (): vec3 | null => (M().cafe && M().cafe.startSpotLocal) ? M().cafe.startSpotLocal as vec3 : null,
    audioBusy: (): boolean => typeof A().isBusy === "function" ? !!A().isBusy() : false,
    sfxPlayCount: (): number => A().sfxPlayCount ?? -1,
    descriptionText: (): string => textOf("SuggestDescription") ?? "",
  }
}
type PhaseCState = ReturnType<typeof phaseCState>

export class Tour {
  yaw = 0
  pitch = 0
  readonly S: PhaseCState

  constructor(readonly t: WbwTester) {
    this.S = phaseCState(t)
  }

  beat(id: string, what: string): void {
    log(`beat ${id} — ${what}`)
  }

  local(x: number, z: number, h: number = 160): vec3 {
    return this.t.cafeOrigin().add(new vec3(x, h, z))
  }

  posOf(name: string): vec3 {
    const so = findEnabled(name)
    if (!so) throw new Error(`SceneObject '${name}' not found (enabled)`)
    return so.getTransform().getWorldPosition()
  }

  aim(eye: vec3, look: string | vec3): {yaw: number; pitch: number} {
    const p = typeof look === "string" ? this.posOf(look) : look
    const d = p.sub(eye)
    return {yaw: Math.atan2(-d.x, -d.z) / D2R, pitch: Math.atan2(d.y, Math.sqrt(d.x * d.x + d.z * d.z)) / D2R}
  }

  /** First pose: WbwTester.setHead disables DeviceTracking for the rest of the scenario. */
  async start(eye: vec3, yaw: number, pitch: number): Promise<void> {
    await this.t.setHead(eye, yaw, pitch)
    this.yaw = yaw
    this.pitch = pitch
  }

  private write(pos: vec3, yaw: number, pitch: number): void {
    const tr = this.t.cameraObject().getTransform()
    tr.setWorldPosition(pos)
    tr.setWorldRotation(quat.fromEulerAngles(0, yaw * D2R, 0).multiply(quat.fromEulerAngles(pitch * D2R, 0, 0)))
  }

  /** Smooth per-frame head move. Yaw takes the short way unless `turn` forces the direction
   *  (left = yaw increasing, as in WbwTester.setHead: +90 looks toward -X). */
  async glide(p: Pose, secs: number, ease: Ease = "inOut", turn?: Turn): Promise<void> {
    const from = this.t.camPos()
    const to = p.at ?? (p.x !== undefined && p.z !== undefined ? this.local(p.x, p.z, p.h ?? 160) : from)
    let ty = p.yaw ?? this.yaw
    let tp = p.pitch ?? this.pitch
    if (p.look !== undefined) {
      const a = this.aim(to, p.look)
      ty = a.yaw + (p.dYaw ?? 0)
      tp = a.pitch + (p.dPitch ?? 0)
    }
    let dy = ((((ty - this.yaw) % 360) + 540) % 360) - 180
    if (turn === "left" && dy < 0) dy += 360
    if (turn === "right" && dy > 0) dy -= 360
    const y0 = this.yaw, p0 = this.pitch
    const dur = Math.max(0.15, secs * PACE)
    const t0 = getTime()
    for (;;) {
      const k = Math.min(1, (getTime() - t0) / dur)
      const e = ease === "linear" ? k : ease === "out" ? 1 - (1 - k) * (1 - k) : k * k * (3 - 2 * k)
      this.write(vec3.lerp(from, to, e), y0 + dy * e, p0 + (tp - p0) * e)
      if (k >= 1) break
      await nextFrame()
    }
    this.yaw = y0 + dy
    this.pitch = tp
  }

  /** Turn the head only (keep the position). */
  async look(yaw: number, pitch: number, secs: number, turn?: Turn): Promise<void> {
    await this.glide({yaw, pitch}, secs, "inOut", turn)
  }

  /** Turn the head toward a named object (layout-robust), with a framing offset. */
  async lookAt(name: string, secs: number, dYaw: number = 0, dPitch: number = 0, fallback?: {yaw: number; pitch: number}): Promise<void> {
    if (!findEnabled(name) && fallback) {
      log(`lookAt: '${name}' not found, using yaw ${fallback.yaw} / pitch ${fallback.pitch}`)
      await this.look(fallback.yaw, fallback.pitch, secs)
      return
    }
    await this.glide({look: name, dYaw, dPitch}, secs)
  }

  /** Point at (hover, no select) a named Interactable with the tester's pointer and hold it for `secs`. */
  async point(name: string, secs: number): Promise<void> {
    const it = await interactableNamed(name)
    await this.t.pointer.hold(it, name)
    await pause(secs)
  }

  async unpoint(): Promise<void> {
    await this.t.pointer.release()
  }

  /** Real SIK trigger through WbwTester.tap, which frees the pointer first if it hovers the same target. */
  async tap(name: string): Promise<void> {
    await this.t.tap(name)
  }

  async waitAudioIdle(ms: number = 12000): Promise<void> {
    await nextFrame()
    await waitFor(() => !this.S.audioBusy(), "audio idle", ms)
  }

  /** After a phrase is chosen: the speak prompt + SaidItButton appear → "speak" → Said it →
   *  (advancing answers) the server continues. Never submits on its own. */
  async sayIt(step: number, advances: boolean = true): Promise<void> {
    const o = this.t.order
    this.t.quietMic() // the tour answers with Said it; room noise must never do it
    await waitFor(() => this.S.waitingForSpeech() && this.t.hasEnabledInteractable("SaidItButton"),
      `step ${step}: waiting for the learner to say it`, 12000)
    expect(o.orderStep, `step ${step}: choosing or showing a phrase must not advance the order`).toBe(step)
    soft(enabledCount("SaidItButton") === 1, `exactly one SaidItButton enabled (got ${enabledCount("SaidItButton")})`)
    soft((textOf("SpeakPromptText") ?? "").length > 0, "speak prompt text visible")
    await pause(SPEAK)
    await this.tap("SaidItButton")
    await waitFor(() => !this.S.waitingForSpeech(), `step ${step}: speech accepted`, 4000)
    log(`step ${step}: said (source '${this.S.speechSource()}')`)
    if (advances) await waitFor(() => o.orderStep !== step, `step ${step}: the server continues after the learner spoke`, 8000)
  }

  /** One phrase-card answer turn (steps 1, 3, 4, 5, 6): read the question, look down at the tray,
   *  point and choose the card (its clip plays), say it, look back up at the server. */
  async answerTurn(step: number, cardId: string, voiceKey: string, advances: boolean = true): Promise<void> {
    await this.t.waitForUserTurn(step)
    await pause(READ)
    await this.lookAt("PhraseChoices", 0.7, 0, -2, {yaw: 0, pitch: -28})
    await this.point(`PhraseCard_${cardId}`, 0.4)
    await this.tap(`PhraseCard_${cardId}`)
    await waitFor(() => this.t.audio.lastVoiceKey === voiceKey, `PhraseCard_${cardId} plays ${voiceKey}`)
    expect(this.t.order.orderStep, `choosing ${cardId} does not submit it`).toBe(step)
    await this.waitAudioIdle()
    await this.sayIt(step, advances)
  }

  async lookUpAtServer(secs: number): Promise<void> {
    if (findEnabled("ServerSpot")) {
      await this.glide({look: this.posOf("ServerSpot").add(new vec3(0, 160, 0)), dPitch: -2}, secs)
    } else {
      await this.look(0, -2, secs)
    }
  }
}

@component
export class StoryTour extends Scenario {
  async run(config?: ScenarioConfig): Promise<void> {
    const t = new WbwTester() // also switches SIK's Preview mouse interactors off (restored in finally)
    const tour = new Tour(t)
    const S = tour.S
    const m = t.main, learn = t.learn, card = t.card, o = t.order, a = t.audio
    const pace = config ? config.getNumber("pace") : undefined
    PACE = pace !== undefined && pace > 0 ? Math.max(0.1, Math.min(2, pace)) : RECORDING_PACE
    log(`story tour at PACE ${PACE}`)
    try {
      // ════════════════════ ACT 1 — Arrival (≈ 0:00–0:17) ════════════════════
      await waitFor(() => m.setupPanel.isVisible && t.hasEnabledInteractable("SetupConfirmButton"), "setup panel visible", 15000)
      // lazily: WbwMain has started by now, so SIK's mouse interactor and the voice detector exist
      t.quietMouse()
      t.quietMic()
      // the tour is filmed from the counter start (the outside start has its own scenario, DC6_Entrance)
      m.cafe.useCounterStart()
      const ss = S.startSpotLocal()
      const walkInBuilt = ss !== null && ss.z > 100
      tour.beat("A1", walkInBuilt ? "at the café door: setup panel" : "setup panel (the café has no walk-in start: cut to the door after Start)")
      if (walkInBuilt) await tour.start(t.camPos(), 0, -4)
      else await tour.start(tour.local(0, 0), 0, -6)
      await pause(1.0) // the café keeps aligning under the user for up to 2.5 s
      const voice0 = a.voicePlayCount
      expect(m.currentMode, "no mode before setup").toBe("none")
      soft(!t.hud.isVisible, "HUD hidden during setup")
      soft(S.arrivalPhase() === "setup", `arrivalPhase 'setup' (got '${S.arrivalPhase()}')`)
      expect(textOf("Title", m.setupPanel.getSceneObject()), "setup heading").toBe("Choose your languages")
      await pause(READ_LONG)

      tour.beat("A2", "choose English → Hungarian, Start")
      await tour.tap("SetupSpeakEnglish")
      await pause(GLANCE)
      await tour.tap("SetupLearnHungarian")
      await pause(GLANCE + 0.8)
      await tour.tap("SetupConfirmButton")
      await waitFor(() => m.setupComplete && !m.setupPanel.isVisible, "setup complete, panel hidden")
      if (!walkInBuilt) {
        log("cut to the entrance spot (0, 520)")
        await tour.start(tour.local(0, 520), 0, -4)
      }
      soft(S.arrivalPhase() === "walkIn" || S.arrivalPhase() === "toast", `arrivalPhase walkIn/toast (got '${S.arrivalPhase()}')`)

      tour.beat("A3", "walk in down the centre aisle; 'Café detected (demo)'")
      await tour.glide({x: 0, z: 355, yaw: 5, pitch: -4}, 1.8, "linear")
      await tour.glide({x: 0, z: 190, yaw: -2, pitch: -5}, 1.8, "out")
      await tour.look(0, -5, 0.3)
      await waitFor(() => t.toast.lastMessage === "Café detected (demo)", "toast 'Café detected (demo)'", 4000)
      log(`toastTrigger = '${S.toastTrigger()}' (walk expected in the tour, timeout in DC runs)`)

      tour.beat("A4", "the app suggests what to do here")
      await waitFor(() => S.suggestionVisible() && t.hasEnabledInteractable("SuggestLearnButton"), "arrival suggestion panel", 9000)
      for (const b of ["SuggestLearnButton", "SuggestPracticeButton", "SuggestLiveButton", "SuggestLaterButton"]) {
        expect(t.hasEnabledInteractable(b), `${b} enabled`).toBe(true)
      }
      expect(textOf("Label", findEnabled("SuggestLearnButton")), "Learn tile label").toBe("Learn")
      expect(textOf("Label", findEnabled("SuggestPracticeButton")), "Practice tile label").toBe("Practice")
      expect(textOf("Label", findEnabled("SuggestLiveButton")), "Use it live tile label").toBe("Use it live")
      expect(m.currentMode, "nothing auto-starts while the suggestion is up").toBe("none")
      expect(a.voicePlayCount, "no voice clip during arrival").toBe(voice0)
      soft(!t.hud.isVisible, "HUD hidden until a pick")
      soft(S.arrivalPhase() === "suggest", `arrivalPhase 'suggest' (got '${S.arrivalPhase()}')`)
      await pause(READ_LONG)

      tour.beat("A5", "point at the tiles: the description explains each")
      const desc0 = S.descriptionText()
      await tour.point("SuggestLearnButton", 1.0)
      const descLearn = S.descriptionText()
      await tour.point("SuggestPracticeButton", 0.8)
      const descPractice = S.descriptionText()
      await tour.point("SuggestLiveButton", 0.8)
      soft(descLearn !== desc0 && descPractice !== descLearn, `description changes per tile ('${desc0}' / '${descLearn}' / '${descPractice}')`)
      await tour.unpoint()
      await pause(0.3)

      tour.beat("A6", "choose Learn")
      await tour.tap("SuggestLearnButton")
      await waitFor(() => m.currentMode === "learn" && !S.suggestionVisible(), "Learn picked on the suggestion", 4000)
      soft(S.suggestionPick() === "learn", `suggestionPick 'learn' (got '${S.suggestionPick()}')`)
      expect(m.currentModeLabel, "mode label").toBe("Learn")
      expect(a.voicePlayCount, "no voice clip up to the pick").toBe(voice0)
      await waitFor(() => textOf("SavedBadge") === "Saved: 0", "HUD 'Saved: 0' after the pick", 3000)
      await pause(1.0)

      // ════════════ ACT 2 — Look around, point, select, save (≈ 0:17–0:52) ════════════
      tour.beat("L1", "LOOK AROUND: walk up to the sandwich counter, quiet discovery markers appear")
      await tour.glide({x: 0, z: 0, yaw: 0, pitch: -22}, 2.4)
      await waitFor(() => learn.bracketedIds.length >= 3 && learn.bracketedIds.length <= 4,
        `3–4 discovery markers at the counter (got ${learn.bracketedIds.join(",")})`, 4000)
      log(`bracketed: ${learn.bracketedIds.join(",")} (expected about paprika, uborka_friss, paradicsom, uborka)`)
      expect(o.orderStep, "nothing ordered").toBe(0)
      await pause(1.0)

      tour.beat("L2", "look along the counter")
      await tour.look(16, -22, 0.9)
      await pause(0.3)
      await tour.look(-16, -22, 1.4)
      await pause(0.3)
      await tour.look(-3, -22, 0.7)
      soft(enabledCount("Brackets") <= 4, `at most 4 bracket sets enabled (got ${enabledCount("Brackets")})`)

      tour.beat("L3", "POINT TO REVEAL: cucumber → 'uborka / cucumber', no click, no sound")
      await tour.look(-3, -24, 0.4)
      const v0 = a.voicePlayCount, sfx0 = a.lastSfxKey, sfxN0 = S.sfxPlayCount()
      await tour.point("Learnable_uborka_friss", 0.2)
      await waitFor(() => S.hoveredId() === "uborka_friss" && S.labelForId() === "uborka_friss", "label for the cucumber on hover", 2000)
      const label = findEnabled("NameLabel")
      expect(label !== undefined, "NameLabel visible").toBe(true)
      expect(textOf("NameLabelHu", label), "label Hungarian (large)").toBe("uborka")
      expect(textOf("NameLabelEn", label), "label English (small)").toBe("cucumber")
      const labelGap = label!.getTransform().getWorldPosition().distance(tour.posOf("Learnable_uborka_friss"))
      soft(labelGap < 30, `label close beside the object (${labelGap.toFixed(1)} cm)`)
      expect(a.voicePlayCount, "pointing plays no voice").toBe(v0)
      expect(a.lastSfxKey, "pointing plays no sound effect").toBe(sfx0)
      expect(S.sfxPlayCount(), "pointing starts no sound effect").toBe(sfxN0)
      expect(card.isVisible, "pointing opens no card").toBe(false)
      // one bracket: the hover bracket replaces the cucumber's own discovery marker while its label shows
      const ownBrackets = child(findEnabled("Learnable_uborka_friss")!, "Brackets")
      expect(ownBrackets !== undefined && !ownBrackets.enabled, "the cucumber's own Brackets are hidden while its label shows").toBe(true)
      expect(findEnabled("NameLabelBracket") !== undefined, "the one hover bracket").toBe(true)
      if (global.deviceInfoSystem.isEditor()) {
        expect(S.pointerRayVisible(), "no ray band in the Preview").toBe(false)
        expect(S.pointerDotVisible(), "pointer dot on the pointed-at object").toBe(true)
      }
      await pause(1.4)

      tour.beat("L4", "silent sweep: peppers → pickles ('savanyú uborka') → cucumber")
      let maxLabels = 0, sampling = true
      const sampler = (async () => {
        while (sampling) {
          maxLabels = Math.max(maxLabels, enabledCount("NameLabel"))
          await nextFrame()
        }
      })()
      try {
        await tour.point("Learnable_paprika", 0.7)
        soft(S.labelForId() === "paprika", `label follows to paprika (got '${S.labelForId()}')`)
        await tour.point("Learnable_uborka", 0.8)
        await waitFor(() => S.labelForId() === "uborka", "label for the pickles", 2000)
        expect(textOf("NameLabelHu", findEnabled("NameLabel")), "pickles label").toBe("savanyú uborka")
        expect(textOf("NameLabelEn", findEnabled("NameLabel")), "pickles label EN").toBe("pickles")
        await tour.point("Learnable_uborka_friss", 0.6)
      } finally {
        sampling = false
        await sampler
      }
      expect(maxLabels, "only one hover label at a time").toBe(1)
      expect(a.voicePlayCount, "the sweep is silent").toBe(v0)
      expect(S.sfxPlayCount(), "the sweep starts no sound effect").toBe(sfxN0)

      tour.beat("L5", "SELECT TO LISTEN: pinch the cucumber → card, pronunciation once")
      await tour.tap("Learnable_uborka_friss") // frees the pointer first (same target)
      await waitFor(() => card.isVisible && S.cardWordId() === "uborka_friss", "word card for the cucumber")
      expect(S.cardPlayCount(), "played once on open").toBe(1)
      expect(a.lastVoiceKey, "pronunciation clip").toBe("w_uborka_friss")
      expect(a.voicePlayCount, "exactly one clip on open").toBe(v0 + 1)
      const cardRoot = findEnabled("WordCard")!
      expect(textOf("WordCardHu", cardRoot), "card Hungarian").toBe("uborka")
      expect(textOf("WordCardEn", cardRoot), "card English").toBe("cucumber")
      soft(textOf("Label", findEnabled("WordCardPlayButton")) === "Playing…", `the Listen button shows playback (got '${textOf("Label", findEnabled("WordCardPlayButton"))}')`)
      await waitFor(() => textOf("Label", findEnabled("WordCardPlayButton")) === "Listen" && card.playing === "",
        "the Listen button is back after the clip", 6000)
      await pause(1.5)

      tour.beat("L6", "Listen again")
      await tour.tap("WordCardPlayButton")
      await waitFor(() => S.cardPlayCount() === 2, "Listen again replays")
      expect(a.voicePlayCount, "one more clip").toBe(v0 + 2)
      await tour.waitAudioIdle()
      await pause(0.4)

      tour.beat("L7", "move the pointer onto the card's controls: the card stays steady")
      const cardPos0 = findEnabled("WordCard")!.getTransform().getWorldPosition()
      await tour.point("WordCardSaveButton", 0.6)
      await tour.unpoint()
      expect(card.isVisible && S.cardWordId() === "uborka_friss", "card still open").toBe(true)
      expect(findEnabled("WordCard")!.getTransform().getWorldPosition().distance(cardPos0) < 0.5, "card did not move").toBe(true)

      tour.beat("L8", "SAVE → 'Saved ✓'; the card stays; nothing is ordered")
      await tour.tap("WordCardSaveButton")
      await waitFor(() => card.savedShown && m.savedWords.indexOf("uborka_friss") >= 0, "cucumber saved")
      expect((textOf("Label", findEnabled("WordCardSaveButton")) ?? "").indexOf("Saved") === 0, "Save button shows Saved").toBe(true)
      await waitFor(() => textOf("SavedBadge") === "Saved: 1", "HUD 'Saved: 1'")
      expect(card.isVisible && S.cardWordId() === "uborka_friss", "card stays open after Save").toBe(true)
      expect(o.answers.length, "saving never orders (answers)").toBe(0)
      expect(o.orderStep, "saving never orders (step)").toBe(0)
      expect(S.phraseSlotIds(), "saving never fills the phrase").toBe("")
      await pause(1.1)

      tour.beat("L9-L11", "learn and save salami, tomato, cheese (the open card stays steady while pointing)")
      await tour.look(11, -22, 0.6)
      const more: [string, string, string][] = [["szalami", "szalámi", "salami"], ["paradicsom", "paradicsom", "tomato"], ["sajt", "sajt", "cheese"]]
      for (const [id, hu, en] of more) {
        const prevCard = S.cardWordId()
        await tour.point(`Learnable_${id}`, 0.8)
        await waitFor(() => S.labelForId() === id, `label for ${id}`, 2000)
        expect(textOf("NameLabelHu", findEnabled("NameLabel")), `${id} label HU`).toBe(hu)
        expect(textOf("NameLabelEn", findEnabled("NameLabel")), `${id} label EN`).toBe(en)
        expect(S.cardWordId(), "the open card does not change while pointing elsewhere").toBe(prevCard)
        await tour.tap(`Learnable_${id}`)
        await waitFor(() => card.isVisible && S.cardWordId() === id && S.cardPlayCount() === 1, `card for ${id}, played once`)
        expect(enabledCount("WordCard"), "one word card at a time").toBe(1)
        await tour.waitAudioIdle()
        await tour.tap("WordCardSaveButton")
        await waitFor(() => card.savedShown && m.savedWords.indexOf(id) >= 0, `${id} saved`)
        await pause(0.7)
      }
      expect(m.savedWords.join(","), "four saved words").toBe("uborka_friss,szalami,paradicsom,sajt")
      await waitFor(() => textOf("SavedBadge") === "Saved: 4", "HUD 'Saved: 4'")
      expect(o.orderStep, "still nothing ordered").toBe(0)
      expect(S.phraseSlotIds(), "four saved words, still an empty phrase").toBe("")

      tour.beat("L12", "select the LABEL: point at the cucumber, pinch its label")
      await tour.look(-3, -24, 0.6)
      await tour.point("Learnable_uborka_friss", 0.3)
      await waitFor(() => S.labelForId() === "uborka_friss", "cucumber label", 2000)
      await tour.tap("NameLabel")
      await waitFor(() => card.isVisible && S.cardWordId() === "uborka_friss", "card opened from the label")
      expect(S.cardPlayCount(), "played once").toBe(1)
      expect((textOf("Label", findEnabled("WordCardSaveButton")) ?? "").indexOf("Saved") === 0, "remembered as saved").toBe(true)
      await tour.waitAudioIdle()
      await tour.unpoint()
      await pause(0.8)

      tour.beat("L13", "OPEN USE IT LIVE from the card ('Use it live →')")
      const voiceBeforeLive = a.voicePlayCount
      await tour.tap("WordCardUseLiveButton")
      await waitFor(() => m.currentMode === "live" && !card.isVisible, "Use it live opened from the card", 4000)
      expect(m.currentModeLabel, "mode label").toBe("Use it live")
      await pause(0.5)

      // ════════════════════ ACT 3 — Use it live (≈ 0:52–2:13) ════════════════════
      tour.beat("U1", "prep: the phrase helper holds the carried word; the server has not noticed me yet")
      await tour.look(0, -27, 0.8)
      await waitFor(() => S.waitingFor() === "ready" && S.phraseHelperVisible() && findEnabled("PhraseHelper") !== undefined,
        "Use it live opens in its prep state with the phrase helper", 4000)
      const helper = findEnabled("PhraseHelper")!
      expect(o.orderStep, "prep keeps step 0").toBe(0)
      expect(S.orderStepName(), "prep step name").toBe("prep")
      expect(t.caption.isVisible, "the server stays quiet in prep (no caption)").toBe(false)
      expect(a.voicePlayCount, "nothing plays when Use it live opens").toBe(voiceBeforeLive)
      expect(textOf("ChipLabel", findEnabled("HudModeChip")), "the HUD chip names the mode (the phrase panel has none)").toBe("Use it live")
      expect(S.phraseSlotIds(), "carried word").toBe("uborka_friss")
      expect(S.phrasePattern(), "pattern").toBe("want")
      expect(S.phraseHu(), "phrase HU").toBe("Kérek uborkát a szendvicsembe.")
      expect(S.phraseEn(), "phrase EN").toBe("I'd like cucumber in my sandwich.")
      expect(S.phraseAudioKey(), "phrase audio").toBe("p_kerek_uborka_friss")
      expect(findEnabled("ReadyToOrderButton") === undefined, "no Ready to order button: the glasses only help").toBe(true)
      expect(S.waitingForSpeech(), "showing the helper opens no speak turn").toBe(false)
      soft(findEnabled("HudModeChip") !== undefined, "the compact HUD names the mode (HudModeChip)")
      await pause(READ_LONG)

      if (OPTIONAL_BEATS) {
        tour.beat("U1b", "Listen")
        await tour.tap("PhraseHelperListenButton")
        await waitFor(() => a.lastVoiceKey === "p_kerek_uborka_friss", "helper Listen plays the phrase")
        expect(o.orderStep, "listening never submits").toBe(0)
        await tour.waitAudioIdle()
        await pause(0.4)
      }

      tour.beat("U2", "REUSE: point at the salami → violet label with 'Use this word'")
      await tour.look(8, -26, 0.5)
      const helperId = helper.uniqueIdentifier
      const v2 = a.voicePlayCount
      await tour.point("Learnable_szalami", 0.3)
      await waitFor(() => S.labelForId() === "szalami", "salami label in Use it live", 2000)
      await waitFor(() => t.hasEnabledInteractable("UseThisWordButton") && t.hasEnabledInteractable("AddWordButton"), "Use this word and + és offered", 2000)
      soft(S.labelMode() === "live", `label in live styling (got '${S.labelMode()}')`)
      soft(findEnabled("NameLabelChip") === undefined, "no mode chip on the hover label")
      soft(textOf("NameLabelHu", findEnabled("NameLabel")) === "szalámi" && textOf("NameLabelEn", findEnabled("NameLabel")) === "salami", "label reads 'szalámi / salami'")
      expect(a.voicePlayCount, "pointing is silent in Use it live too").toBe(v2)
      await pause(1.0)

      tour.beat("U3", "Use this word → the SAME phrase updates")
      await tour.tap("UseThisWordButton")
      await waitFor(() => S.phraseSlotIds() === "szalami", "slot replaced by salami")
      expect(S.phraseHu(), "phrase HU").toBe("Kérek szalámit a szendvicsembe.")
      expect(S.phraseEn(), "phrase EN").toBe("I'd like salami in my sandwich.")
      expect(S.phraseAudioKey(), "phrase audio").toBe("p_kerek_szalami")
      expect(findEnabled("PhraseHelper")!.uniqueIdentifier, "same helper object, no new card").toBe(helperId)
      expect(findEnabled("WordCard") === undefined, "no word card in Use it live").toBe(true)
      expect(o.orderStep, "updating the phrase never submits").toBe(0)
      expect(S.waitingForSpeech(), "editing in prep opens no speak turn").toBe(false)
      await tour.unpoint()
      await tour.waitAudioIdle() // the updated phrase plays once
      await pause(1.5)

      tour.beat("U4", "+ és: add the tomato → combined phrase")
      await tour.point("Learnable_paradicsom", 0.8)
      await waitFor(() => S.labelForId() === "paradicsom" && t.hasEnabledInteractable("AddWordButton"), "tomato label with + és", 2000)
      await tour.tap("AddWordButton")
      await waitFor(() => S.phraseSlotIds() === "szalami,paradicsom", "tomato added")
      expect(S.phraseHu(), "combined HU").toBe("Kérek szalámit és paradicsomot a szendvicsembe.")
      expect(S.phraseEn(), "combined EN").toBe("I'd like salami and tomato in my sandwich.")
      expect(S.phraseAudioKey(), "combined audio").toBe("c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe")
      expect(findEnabled("PhraseHelper")!.uniqueIdentifier, "still the same helper").toBe(helperId)
      await tour.unpoint()
      await tour.waitAudioIdle(14000)
      await pause(1.0)

      tour.beat("U5", "Listen: hearing it never submits it")
      // "+ és" already played this exact key, so only a NEW playback proves the button. voicePlayCount
      // grows once per clip part, so it is compared only after the audio went idle (end of U4).
      await tour.waitAudioIdle(14000)
      const listen0 = a.voicePlayCount
      await tour.tap("PhraseHelperListenButton")
      await waitFor(() => a.voicePlayCount > listen0 && a.lastVoiceKey === S.phraseAudioKey(), "Listen plays the combined phrase again")
      expect(o.orderStep, "listening never submits").toBe(0)
      await tour.waitAudioIdle(14000)
      await pause(0.4)

      if (OPTIONAL_BEATS) {
        tour.beat("U5b", "switch to '… nélkül, kérem.' and back")
        await tour.tap("PatternWithoutButton")
        await waitFor(() => S.phrasePattern() === "without", "without pattern")
        expect(S.phraseHu(), "without HU").toBe("Szalámi és paradicsom nélkül, kérem.")
        expect(S.phraseAudioKey(), "without audio").toBe("w_szalami+c_es+w_paradicsom+c_nelkul+c_kerem")
        await tour.waitAudioIdle(14000)
        await pause(1.6)
        await tour.tap("PatternWantButton")
        await waitFor(() => S.phrasePattern() === "want" && S.phraseSlotIds() === "szalami,paradicsom", "back to want, slots kept")
        await tour.waitAudioIdle(14000)
      }

      tour.beat("U6", "look up at the server: he notices me and greets")
      await tour.lookUpAtServer(0.9)
      expect(S.waitingFor(), "the server waited while the phrase was reused").toBe("ready")
      expect(o.orderStep, "reusing the phrase ordered nothing").toBe(0)
      expect(o.answers.length, "nothing answered in prep").toBe(0)
      expect(o.lastServerLine, "the server has not spoken yet").toBe("")
      o.serverNotices = true // the scenario held him back while the phrase was prepared at the counter
      await waitFor(() => o.orderStep === 1 && o.lastServerLine === "Jó napot! Mit kér?", "facing the server starts his greeting (step 1)", 6000)
      o.serverNotices = false
      soft(a.lastVoiceKey === "s_mit_ker", `server clip s_mit_ker (got '${a.lastVoiceKey}')`)
      expect(S.phraseHelperVisible(), "the helper steps aside during step 1").toBe(false)
      expect(S.phraseHu(), "prepared phrase kept for step 2").toBe("Kérek szalámit és paradicsomot a szendvicsembe.")

      if (OPTIONAL_BEATS) {
        tour.beat("U7a", "'Jó napot!' back: said, but does not advance")
        await tour.answerTurn(1, "jonapot", "p_jonapot", false)
        expect(o.orderStep, "greeting back does not advance").toBe(1)
        await tour.lookUpAtServer(0.7)
      }
      tour.beat("U7", "step 1: 'Egy szendvicset kérek.' → say it")
      await tour.answerTurn(1, "szendvicset", "p_szendvicset_kerek")
      await tour.lookUpAtServer(0.7)

      tour.beat("U8", "step 2 'Mit kér bele?': the prepared phrase is the answer; say it")
      await t.waitForUserTurn(2)
      expect(o.orderStepName, "step 2 name").toBe("fillings")
      expect(o.offeredPhraseIds.length, "no step-2 phrase cards").toBe(0)
      expect(t.phrases.isVisible, "phrase card row hidden at step 2").toBe(false)
      for (const old of ["sonka_sajt", "kerhetek_oliva", "szalami_sajt", "csirke_paprika", "uborka_nelkul", "done"]) {
        expect(findEnabled(`PhraseCard_${old}`) === undefined, `old fixed card PhraseCard_${old} is gone`).toBe(true)
      }
      expect(S.phraseHelperVisible(), "helper is the answer surface").toBe(true)
      expect(S.phraseHu(), "prepared phrase kept").toBe("Kérek szalámit és paradicsomot a szendvicsembe.")
      await waitFor(() => S.waitingForSpeech(), "waiting for speech right after the question (phrase ready)", 3000)
      await tour.lookAt("PhraseHelper", 0.7, 0, -2, {yaw: 0, pitch: -28})
      await pause(1.4)
      const answers2 = o.answers.length
      await tour.sayIt(2)
      soft(o.answers.length === answers2 + 1 && o.answers[o.answers.length - 1] === "fillings", `answers +1 'fillings' (got ${o.answers.join(",")})`)
      await tour.lookUpAtServer(0.7)

      tour.beat("U9", "step 3: coffee")
      await tour.answerTurn(3, "tejes_kave", "p_tejes_kave")
      await tour.lookUpAtServer(0.7)

      tour.beat("U10", "step 4: 'Itt eszem.'")
      await tour.answerTurn(4, "itt_eszem", "p_itt_eszem")
      await tour.lookUpAtServer(0.7)

      tour.beat("U11", "step 5 'Hányas asztalnál ül?': the reply waits with its blank")
      await waitFor(() => o.orderStep === 5 && o.waitingFor === "table", "the order waits for a table", 15000)
      expect(t.hint.arrowVisible, "no edge arrow (real life: nothing sends me round)").toBe(false)
      expect(t.hint.hintText, "no coach hint at the table question").toBe("")
      expect(findEnabled("PhraseCard_table_blank") !== undefined, "'A … asztalnál ülök.' waits with its blank").toBe(true)
      // reading by looking waits until the head rests on table 8's number (the turn sweeps past other tables)
      const lookSec = o.tableLookSec
      o.tableLookSec = 60
      await pause(1.4)

      tour.beat("U12", "turn around to the seating (the door I came in through is ahead)")
      await tour.look(180, -8, 2.0, "left")
      await pause(0.6)

      tour.beat("U13", "walk toward table 8")
      await tour.glide({x: -140, z: 90, look: findEnabled("TableNumberButton_8") ? "TableNumberButton_8" : undefined, yaw: 141, pitch: -10}, 2.4)
      await pause(0.5)

      tour.beat("U14", "look at table 8's number → '8 = nyolc'")
      o.tableLookSec = lookSec
      try {
        await waitFor(() => tableCard(8).popupText === "8 = nyolc", "looking at table 8 reads it", 3000)
        soft(o.tableReadBy === "look", `table 8 read by looking (got '${o.tableReadBy}')`)
      } catch (e) {
        soft(false, "looking at table 8 reads it (tapped instead)")
        await tour.tap("TableNumberButton_8")
        await waitFor(() => tableCard(8).popupText === "8 = nyolc", "table 8 popup", 3000)
      }
      expect(a.lastVoiceKey, "number audio").toBe("n_8")
      expect(o.chosenTable, "chosen table").toBe(8)
      await pause(2.0)

      tour.beat("U15", "back to the counter: 'A nyolcas asztalnál ülök.'")
      await tour.glide({x: 0, z: 0, yaw: 0, pitch: -2}, 2.8, "inOut", "right")
      await t.waitForUserTurn(5, 10000)
      expect(o.offeredPhraseIds.join(","), "only the table-8 phrase").toBe("nyolcas_asztal")
      await tour.answerTurn(5, "nyolcas_asztal", "p_nyolcas_asztal")
      await tour.lookUpAtServer(0.7)

      tour.beat("U16", "step 6 'Jó étvágyat!' → 'Köszönöm!'")
      await tour.answerTurn(6, "koszonom", "p_koszonom")
      await waitFor(() => o.orderStep === 7 && o.waitingFor === "done", "order complete", 8000)
      expect(t.hint.hintText, "no instruction after the order: it is my visit").toBe("")
      await tour.lookUpAtServer(0.7)
      await pause(2.0)

      // ════════════════════ ACT 4 — Seated practice (≈ 2:13–2:45) ════════════════════
      tour.beat("P1", "walk to table 8")
      await tour.look(112, -8, 0.8, "left")
      await tour.glide({x: -270, z: 110, yaw: 150, pitch: -8}, 2.3)
      await tour.glide({x: -270, z: 345, yaw: 125, pitch: -8}, 1.9)
      await tour.glide({x: -470, z: 345, yaw: 160, pitch: -8}, 1.7)
      const table8 = tour.posOf("Table_8")
      if (SEATED_PRACTICE) {
        tour.beat("P2", "sit on the free chair at table 8")
        await tour.glide({at: table8.add(new vec3(-57, 120, 0)), yaw: 270, pitch: -12}, 1.6, "inOut", "left")
      } else {
        tour.beat("P2", "stand on the counter side of table 8")
        const eye = table8.add(new vec3(0, 160, -80))
        await tour.glide({at: eye, yaw: t.yawToward(eye, table8), pitch: -36}, 1.6)
      }
      await pause(0.6)

      tour.beat("P3", "open the menu → Practice")
      await tour.tap("MenuButton")
      await pause(0.5)
      await tour.tap("ModePracticeButton")
      const p = t.practice, b = t.board
      await waitFor(() => p.active && b.state === "board" && p.pairsTotal === 4, "practice board with 4 pairs", 5000)
      expect(p.placedAt, "board at the table").toBe("table")
      expect(p.boardTable, "board above table 8").toBe(8)
      const boardDist = horiz(findEnabled("PracticeBoard")!.getTransform().getWorldPosition(), t.camPos())
      soft(boardDist >= 58, `board about 65 cm away (got ${boardDist.toFixed(0)} cm)`)
      expect(b.progressText, "progress").toBe("0 / 4 pairs")
      expect(p.leftIds.slice().sort().join(","), "set uses the saved words").toBe(m.savedWords.slice().sort().join(","))
      await pause(2.3)

      tour.beat("P4", "a wrong pair → amber 'Try again'")
      const first = p.leftIds[0]
      const wrong = p.rightIds.filter((id) => id !== first)[0]
      const wrong0 = p.wrongAttempts
      await tour.tap(`PracticeHu_${first}`)
      await pause(0.4)
      await tour.tap(`PracticeEn_${wrong}`)
      await waitFor(() => p.wrongAttempts === wrong0 + 1, "wrong attempt counted")
      expect(b.feedbackText, "wrong feedback").toBe("Try again")
      await pause(1.3)

      tour.beat("P5", "match all four pairs (green + check, word plays)")
      let matched = 0
      for (const id of p.leftIds.slice()) {
        await tour.tap(`PracticeHu_${id}`)
        await pause(0.35)
        await tour.tap(`PracticeEn_${id}`)
        matched++
        await waitFor(() => p.pairsMatched === matched, `pair ${id} matched`)
        const w = wordById(id)
        soft(w !== null && a.lastVoiceKey === w.audio, `match plays ${w ? w.audio : id} (got '${a.lastVoiceKey}')`)
        await tour.waitAudioIdle()
        await pause(0.3)
      }

      tour.beat("P6", "completion")
      await waitFor(() => p.complete && b.state === "complete", "completion state", 8000)
      expect(textOf("Bravo"), "completion message").toBe("Szuper! All pairs matched.")
      await pause(2.3)

      tour.beat("P7", "stand up: the café, the diners, the server at the counter")
      await tour.glide({at: table8.add(new vec3(-45, 160, 0)), yaw: 324, pitch: -3}, 2.0, "inOut", "left")
      await pause(2.0)
      tour.beat("END", `tour complete (PACE ${PACE})`)
    } finally {
      await tour.unpoint()
      t.restoreHead()
    }
  }
}
