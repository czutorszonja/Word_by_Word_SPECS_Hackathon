// WbwLeafHelpers.ts — shared LEAF test helpers for the Word by Word done-criteria scenarios.
// Read-only access to the game's exposed state (WbwMain + controllers + UI modules), polling
// waits (the order flow waits on audio, so tests wait on state, never on fixed sleeps),
// real SIK interaction (DefaultLeafInteractor.trigger on the named SceneObject's Interactable —
// the same hover → select → release path a mouse click / pinch takes), a second interactor that
// HOLDS a hover without selecting (pointing at an object to reveal its label), and head-pose
// control for the preview camera (needed to face the counter, turn around to the seating, walk away).
// While a scenario runs, SIK's Preview mouse interactors are switched off (a stale mouse hover blocks
// LEAF hovers and would feed the hover label) and the voice detector ignores the microphone (room
// noise must never answer a speak turn: tests answer with the Said it button).
// Test-only: never edits game scripts or scene content. Camera changes are runtime-only and are
// undone by the Lens reset LEAF performs before each scenario.
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {InteractionManager} from "SpectaclesInteractionKit.lspkg/Core/InteractionManager/InteractionManager"
import {Interactor, InteractorInputType} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractablesByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {findSceneObjectByName, findSceneObjectsByName, nextFrame, sleep, withTimeout} from "Leaf.lspkg/Utils/common/Utils"
import {WbwMain} from "../../Scripts/WbwMain"
import {WbwTableCardUI} from "../../Scripts/WbwTableCardUI"

const D2R = Math.PI / 180

export function log(msg: string): void {
  print(`[WbwLeaf] ${msg}`)
}

/** Poll every frame until `cond` is true; throws a labelled error on timeout. */
export async function waitFor(cond: () => boolean, label: string, timeoutMs: number = 10000): Promise<void> {
  const t0 = getTime()
  for (;;) {
    let ok = false
    try {
      ok = cond()
    } catch (e) {
      ok = false
    }
    if (ok) return
    if ((getTime() - t0) * 1000 > timeoutMs) throw new Error(`Timed out after ${timeoutMs} ms waiting for: ${label}`)
    await nextFrame()
  }
}

/** First SceneObject with this name that is enabled in the hierarchy (UI is rebuilt often and
 *  retired copies linger disabled for a frame or two). */
export function findEnabled(name: string, root?: SceneObject): SceneObject | undefined {
  return findSceneObjectsByName(name, root).filter((o) => !isNull(o) && o.isEnabledInHierarchy)[0]
}

/** Text of the first enabled SceneObject with this name that carries a Text component. */
export function textOf(name: string, root?: SceneObject): string | null {
  for (const o of findSceneObjectsByName(name, root)) {
    if (isNull(o) || !o.isEnabledInHierarchy) continue
    const t = o.getComponent("Component.Text") as Text
    if (t) return t.text
  }
  return null
}

/** Recursive child lookup under `root` (exact name). */
export function child(root: SceneObject, name: string): SceneObject | undefined {
  return findSceneObjectByName(name, root)
}

export function horiz(a: vec3, b: vec3): number {
  const dx = a.x - b.x, dz = a.z - b.z
  return Math.sqrt(dx * dx + dz * dz)
}

export function getMain(): WbwMain {
  const so = findSceneObjectByName("WordByWord")
  if (!so) throw new Error("SceneObject 'WordByWord' not found")
  const m = so.getComponent(WbwMain.getTypeName()) as WbwMain
  if (!m) throw new Error("WbwMain component not found on 'WordByWord'")
  return m
}

export function tableCard(n: number): WbwTableCardUI {
  const so = findSceneObjectByName(`TableCard_${n}`)
  if (!so) throw new Error(`SceneObject 'TableCard_${n}' not found`)
  const ui = so.getComponent(WbwTableCardUI.getTypeName()) as WbwTableCardUI
  if (!ui) throw new Error(`WbwTableCardUI not found on 'TableCard_${n}'`)
  return ui
}

/** LEAF test interactor that can HOLD a hover (LEAF's enterHover / exitHover are protected).
 *  A SEPARATE interactor from WbwTester.interactor, so "point at the object" can stay while tap()
 *  presses a label button. Never let it hover the object tap() is about to trigger: both interactors
 *  are CustomController and share one hover bit, so the tap's hover-enter would never fire
 *  (WbwTester.tap() releases it first when the names match). */
export class WbwPointer extends DefaultLeafInteractor {
  /** Name of the SceneObject being hovered ("" when free). */
  currentName: string = ""
  private current: Interactable | null = null

  /** Hover `target` (no select) until release(); a previous hold is released first. */
  async hold(target: Interactable, name: string): Promise<void> {
    if (this.current) await this.release()
    await withTimeout(this.enterHover(target), 3000, `pointer could not hover "${name}"`)
    this.current = target
    this.currentName = name
  }

  async release(): Promise<void> {
    if (!this.current) return
    const was = this.currentName
    this.current = null
    this.currentName = ""
    try {
      await withTimeout(this.exitHover(), 2000, `pointer release of "${was}"`)
    } catch (e) {
      // a target that disabled itself (label hidden, card retired) already sent its hover exit
      log(`pointer release of ${was}: ${e}`)
    }
  }
}

export class WbwTester {
  readonly main: WbwMain
  /** Taps: hover → select → release. */
  readonly interactor: DefaultLeafInteractor
  /** Hover holds (pointing without selecting). */
  readonly pointer: WbwPointer
  private disabledTracking: DeviceTracking | null = null
  private mice: Interactor[] = []

  constructor() {
    this.main = getMain()
    this.interactor = new DefaultLeafInteractor("WbwLeafInteractor")
    this.pointer = new WbwPointer("WbwLeafPointer")
    this.quietMouse()
    // the microphone is NOT silenced here: WbwMain creates the voice detector in its OnStart, which may
    // run after this constructor. quietMic() is called lazily by completeSetup() and sayIt().
  }

  get learn() { return this.main.learn }
  get order() { return this.main.order }
  get practice() { return this.main.practice }
  get audio() { return this.main.audio }
  get hud() { return this.main.hud }
  get toast() { return this.main.toast }
  get card() { return this.main.learn.wordCard }
  get caption() { return this.main.order.caption }
  get phrases() { return this.main.order.phrases }
  get hint() { return this.main.order.hint }
  get board() { return this.main.practice.board }
  get helper() { return this.main.order.phraseHelper }
  get speak() { return this.main.order.speakPrompt }
  get nameLabel() { return this.main.learn.nameLabel }
  get suggestion() { return this.main.suggestion }
  get vad() { return this.main.vad }

  // ── real interaction ────────────────────────────────────────────────────
  /** Trigger (hover → pinch/select → release) the enabled Interactable on SceneObject `name`
   *  through SIK, exactly like a mouse click / pinch in the preview. */
  async tap(name: string, timeoutMs: number = 6000): Promise<void> {
    if (this.pointer.currentName === name) await this.pointer.release()
    let target: Interactable | undefined
    await waitFor(() => {
      target = findInteractablesByName(name, undefined, true)[0]
      return target !== undefined
    }, `enabled Interactable on "${name}"`, timeoutMs)
    await nextFrame()
    log(`tap ${name}`)
    let fired = false
    const sub = target!.onTriggerEnd.add(() => { fired = true })
    try {
      await withTimeout(this.interactor.trigger(target!), 5000, `SIK trigger on "${name}" did not complete within 5 s`)
    } catch (e) {
      // A button that closes its own panel (e.g. a close button) is destroyed ~0.05 s after
      // its trigger end; LEAF's hover-exit cleanup can then touch the destroyed object. That is
      // a harness artifact only if the trigger itself was delivered and the target is gone.
      const gone = isNull(target!) || isNull(target!.getSceneObject()) || !target!.getSceneObject().isEnabledInHierarchy
      log(`trigger on ${name} threw '${e}' (triggerEnd delivered: ${fired}, target gone/disabled: ${gone}) ${(e as Error).stack ?? ""}`)
      if (!(fired && gone)) throw e
    } finally {
      sub()
    }
    if (!fired) throw new Error(`"${name}" never received onTriggerEnd`)
    await sleep(120)
  }

  hasEnabledInteractable(name: string): boolean {
    return findInteractablesByName(name, undefined, true).length > 0
  }

  /** Hold a pointer hover on Learnable_<id> (no select) until pointRelease(); waits for its label. */
  async pointHold(id: string): Promise<void> {
    const it = findInteractablesByName(`Learnable_${id}`, undefined, true)[0]
    if (!it) throw new Error(`Learnable_${id} not found`)
    await this.pointer.hold(it, `Learnable_${id}`)
    await waitFor(() => this.learn.labelForId === id, `label for ${id}`, 2000)
  }

  async pointRelease(): Promise<void> {
    await this.pointer.release()
  }

  // ── quiet inputs while a scenario runs ──────────────────────────────────
  /** Disable every enabled SIK Mouse interactor (idempotent). A stale Preview mouse hover makes LEAF's
   *  hover-enter wait forever and feeds the hover label. Undone by restoreMouse() / restoreHead(). */
  quietMouse(): void {
    try {
      let n = 0
      for (const m of InteractionManager.getInstance().getInteractorsByType(InteractorInputType.Mouse)) {
        if (!m || isNull(m) || !m.enabled || this.mice.indexOf(m) >= 0) continue
        m.enabled = false
        this.mice.push(m)
        n++
      }
      if (n > 0) log(`mouse interactors disabled while the scenario runs: ${n}`)
    } catch (e) {
      log(`could not disable the mouse interactor: ${e}`)
    }
  }

  restoreMouse(): void {
    for (const m of this.mice) if (!isNull(m)) m.enabled = true
    this.mice = []
  }

  /** Make the voice detector ignore the microphone (set lazily: the detector exists once WbwMain has
   *  started). Speak turns are then answered only by sayIt(). */
  quietMic(): void {
    const v = this.main.vad
    if (v && !v.ignoreMicForTests) v.ignoreMicForTests = true
  }

  // ── head pose (preview camera) ──────────────────────────────────────────
  cameraObject(): SceneObject {
    const so = findSceneObjectByName("Camera Object")
    if (!so) throw new Error("SceneObject 'Camera Object' not found")
    return so
  }

  camPos(): vec3 {
    return this.cameraObject().getTransform().getWorldPosition()
  }

  /** Café floor origin (the user's start spot at the counter). */
  cafeOrigin(): vec3 {
    return this.main.cafe.getSceneObject().getTransform().getWorldPosition()
  }

  /** Eye position at café-local (x, z), 160 cm above the café floor. */
  eyeAt(x: number, z: number): vec3 {
    return this.cafeOrigin().add(new vec3(x, 160, z))
  }

  /** Place the head at `pos`, looking toward yaw (0 = café forward, -Z, the counter;
   *  180 = behind, the seating) and pitch (negative = look down). DeviceTracking on the
   *  camera is paused for the rest of the scenario so the pose sticks. */
  async setHead(pos: vec3, yawDeg: number, pitchDeg: number = 0): Promise<void> {
    const cam = this.cameraObject()
    const dt = cam.getComponent("Component.DeviceTracking") as DeviceTracking
    if (dt && dt.enabled) {
      dt.enabled = false
      this.disabledTracking = dt
    }
    const rot = quat.fromEulerAngles(0, yawDeg * D2R, 0).multiply(quat.fromEulerAngles(pitchDeg * D2R, 0, 0))
    const t = cam.getTransform()
    t.setWorldPosition(pos)
    t.setWorldRotation(rot)
    await nextFrame()
    await nextFrame()
    const now = t.getWorldPosition()
    if (now.distance(pos) > 1) throw new Error(`Camera pose did not stick: wanted ${pos}, got ${now}`)
    log(`head at ${pos} yaw ${yawDeg} pitch ${pitchDeg} (look ${t.back})`)
  }

  /** Yaw (deg) that makes the head at `from` look horizontally toward `to`. */
  yawToward(from: vec3, to: vec3): number {
    return Math.atan2(-(to.x - from.x), -(to.z - from.z)) / D2R
  }

  /** Face the sandwich counter from the start spot (keeps the current head position). */
  async faceCounter(pitchDeg: number = -15): Promise<void> {
    await this.setHead(this.camPos(), 0, pitchDeg)
  }

  /** Undo what the scenario changed outside the Lens state: head tracking, the mouse interactors and a
   *  hover the pointer may still hold. Every scenario calls it in `finally`. */
  restoreHead(): void {
    if (this.disabledTracking && !isNull(this.disabledTracking)) this.disabledTracking.enabled = true
    this.disabledTracking = null
    this.restoreMouse()
    void this.pointer.release() // fire and forget: release() never throws
  }

  // ── flows shared by several scenarios ───────────────────────────────────
  /** Setup panel → choose English/Hungarian → Start → "Café detected (demo)" toast → arrival
   *  suggestion (nothing starts by itself) → pick Learn → head at the counter spot. */
  async completeSetup(): Promise<void> {
    await waitFor(() => this.main.setupPanel.isVisible && this.hasEnabledInteractable("SetupConfirmButton"), "setup panel visible", 15000)
    // lazily: WbwMain.start() has run by now, so the voice detector and SIK's mouse interactor exist
    this.quietMouse()
    this.quietMic()
    if (this.main.setupComplete) throw new Error("setupComplete was already true before Start was pressed")
    if (this.main.currentMode !== "none") throw new Error(`mode before setup should be 'none', got '${this.main.currentMode}'`)
    // these scenarios begin at the counter (the café normally starts the user outside the entrance;
    // DC6_Entrance covers that start)
    this.main.cafe.useCounterStart()
    // face the counter as a user standing at the start spot would
    await this.faceCounter()
    // UI rework: functional heading; "soon" languages are a small muted line, not selectable buttons
    await waitFor(() => textOf("Title", this.main.setupPanel.getSceneObject()) === "Choose your languages", "setup heading 'Choose your languages'")
    await waitFor(() => (textOf("SetupSoon", this.main.setupPanel.getSceneObject()) ?? "").indexOf("soon") >= 0, "muted 'more languages soon' line")
    if (this.hasEnabledInteractable("SetupSpeakOther")) throw new Error("unavailable languages must not be selectable")
    await this.tap("SetupSpeakEnglish")
    await this.tap("SetupLearnHungarian")
    await this.tap("SetupConfirmButton")
    await waitFor(() => this.main.setupComplete, "setupComplete after SetupConfirmButton")
    await waitFor(() => !this.main.setupPanel.isVisible, "setup panel hidden")
    await waitFor(() => this.toast.isVisible && this.toast.lastMessage === "Café detected (demo)", "toast 'Café detected (demo)'", 3000)
    await waitFor(() => textOf("Message") === "Café detected (demo)", "toast Message text visible", 3000)
    // the arrival suggestion replaces the automatic Learn start: nothing starts until the learner picks
    await waitFor(() => this.main.suggestionVisible && this.hasEnabledInteractable("SuggestLearnButton"), "arrival suggestion panel", 8000)
    if (this.main.currentMode !== "none") throw new Error("no mode may start before the learner picks one")
    if (this.hud.isVisible) throw new Error("the HUD must stay hidden until a pick")
    await this.tap("SuggestLearnButton")
    await waitFor(() => this.main.currentMode === "learn" && !this.main.suggestionVisible, "Learn picked on the suggestion", 4000)
    await this.setHead(this.eyeAt(0, 0), 0, -15) // tests expect the counter spot
    if (!this.learn.active) throw new Error("WbwLearnController.active is false after picking Learn")
    await waitFor(() => textOf("ModeLabel") === "Mode: Learn", "HUD ModeLabel 'Mode: Learn'", 3000)
    log("setup complete → suggestion → Learn")
  }

  /** Open the mode menu with the "Menu" stand-in and pick a mode button. */
  async switchModeViaMenu(buttonName: string, expectedMode: string): Promise<void> {
    if (!this.main.menuOpen) await this.tap("MenuButton")
    await waitFor(() => this.main.menuOpen, "mode menu open after MenuButton")
    await this.tap(buttonName)
    await waitFor(() => this.main.currentMode === expectedMode && !this.main.menuOpen, `mode '${expectedMode}' via ${buttonName}`)
  }

  /** Learn mode: click a learnable object, Save on its word card (the card stays), then close it. */
  async learnAndSave(id: string): Promise<void> {
    const before = this.main.savedCount
    await waitFor(() => !this.card.isVisible, "word card closed before selecting a new object", 5000)
    await this.tap(`Learnable_${id}`)
    await waitFor(() => this.card.isVisible && this.card.currentWordId === id, `word card open for '${id}'`)
    await this.tap("WordCardSaveButton")
    await waitFor(() => this.main.savedCount === before + 1 && this.main.savedWords.indexOf(id) >= 0, `'${id}' saved`)
    await waitFor(() => this.card.savedShown && this.card.isVisible, `'${id}' card stays open showing Saved`)
    await this.tap("WordCardCloseButton")
    await waitFor(() => !this.card.isVisible, "word card closed")
  }

  /** Use it live: wait until the server has finished `step` and the answer surface is up
   *  (phrase cards, or the phrase helper at step 2). */
  async waitForUserTurn(step: number, timeoutMs: number = 25000): Promise<void> {
    await waitFor(() => this.order.orderStep === step && this.order.waitingFor === "user" && (this.phrases.isVisible || this.order.phraseHelperVisible),
      `order step ${step} waiting for the user (got step ${this.order.orderStep}, waitingFor '${this.order.waitingFor}')`, timeoutMs)
  }

  /** Use it live: leave the prep state with "Ready to order"; the server's greeting has started (step 1). */
  async startOrdering(): Promise<void> {
    await waitFor(() => this.order.active && this.order.waitingFor === "ready" && this.order.phraseHelperVisible && this.hasEnabledInteractable("ReadyToOrderButton"),
      "Use it live prep state with Ready to order", 6000)
    if (this.order.orderStep !== 0) throw new Error(`prep must keep orderStep 0, got ${this.order.orderStep}`)
    await this.tap("ReadyToOrderButton")
    await waitFor(() => this.order.orderStep === 1 && this.order.waitingFor !== "ready", "Ready to order starts the greeting (step 1)", 4000)
  }

  /** Answer the open speak turn with the Said it button (the Preview stand-in for speaking). */
  async sayIt(): Promise<void> {
    this.quietMic()
    const step = this.order.orderStep, n = this.order.answers.length
    await waitFor(() => this.order.waitingForSpeech && this.hasEnabledInteractable("SaidItButton"), `step ${step} waits for the learner to say it`, 12000)
    await this.tap("SaidItButton")
    await waitFor(() => !this.order.waitingForSpeech && this.order.answers.length === n + 1, `step ${step}: Said it accepted`, 4000)
  }

  /** Use it live: point at an ingredient and press Use this word (or "+ és" when add = true). */
  async useWord(id: string, add: boolean = false): Promise<void> {
    const btn = add ? "AddWordButton" : "UseThisWordButton"
    await this.pointHold(id)
    await waitFor(() => this.hasEnabledInteractable(btn), `${btn} for ${id}`, 2000)
    await this.tap(btn)
    await waitFor(() => this.order.phraseSlotIds.indexOf(id) >= 0, `${id} in the phrase`, 2000)
    await this.pointRelease()
  }

  /** Wait until no Lens sound plays. voicePlayCount grows once per clip PART, so compare it only after this. */
  async waitAudioIdle(timeoutMs: number = 15000): Promise<void> {
    await nextFrame()
    await waitFor(() => !this.audio.isBusy(), "audio idle", timeoutMs)
  }
}
