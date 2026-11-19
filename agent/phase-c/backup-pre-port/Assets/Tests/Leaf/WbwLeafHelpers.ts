// WbwLeafHelpers.ts — shared LEAF test helpers for the Word by Word done-criteria scenarios.
// Read-only access to the game's exposed state (WbwMain + controllers + UI modules), polling
// waits (the order flow waits on audio, so tests wait on state, never on fixed sleeps),
// real SIK interaction (DefaultLeafInteractor.trigger on the named SceneObject's Interactable —
// the same hover → select → release path a mouse click / pinch takes), and head-pose control
// for the preview camera (needed to face the counter, turn around to the seating, walk away).
// Test-only: never edits game scripts or scene content. Camera changes are runtime-only and are
// undone by the Lens reset LEAF performs before each scenario.
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
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

export class WbwTester {
  readonly main: WbwMain
  readonly interactor: DefaultLeafInteractor
  private disabledTracking: DeviceTracking | null = null

  constructor() {
    this.main = getMain()
    this.interactor = new DefaultLeafInteractor("WbwLeafInteractor")
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

  // ── real interaction ────────────────────────────────────────────────────
  /** Trigger (hover → pinch/select → release) the enabled Interactable on SceneObject `name`
   *  through SIK, exactly like a mouse click / pinch in the preview. */
  async tap(name: string, timeoutMs: number = 6000): Promise<void> {
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

  restoreHead(): void {
    if (this.disabledTracking && !isNull(this.disabledTracking)) this.disabledTracking.enabled = true
    this.disabledTracking = null
  }

  // ── flows shared by several scenarios ───────────────────────────────────
  /** Setup panel → choose English/Hungarian → Start → "Café detected (demo)" toast → Learn. */
  async completeSetup(): Promise<void> {
    await waitFor(() => this.main.setupPanel.isVisible && this.hasEnabledInteractable("SetupConfirmButton"), "setup panel visible", 15000)
    if (this.main.setupComplete) throw new Error("setupComplete was already true before Start was pressed")
    if (this.main.currentMode !== "none") throw new Error(`mode before setup should be 'none', got '${this.main.currentMode}'`)
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
    await waitFor(() => this.main.currentMode === "learn", "Learn mode starts automatically after the toast (firstMode)", 8000)
    if (!this.learn.active) throw new Error("WbwLearnController.active is false after auto-start of Learn")
    await waitFor(() => textOf("ModeLabel") === "Mode: Learn", "HUD ModeLabel 'Mode: Learn'", 3000)
    log("setup complete → Learn")
  }

  /** Open the mode menu with the "Menu" stand-in and pick a mode button. */
  async switchModeViaMenu(buttonName: string, expectedMode: string): Promise<void> {
    if (!this.main.menuOpen) await this.tap("MenuButton")
    await waitFor(() => this.main.menuOpen, "mode menu open after MenuButton")
    await this.tap(buttonName)
    await waitFor(() => this.main.currentMode === expectedMode && !this.main.menuOpen, `mode '${expectedMode}' via ${buttonName}`)
  }

  /** Learn mode: click a learnable object, then Save on its word card. */
  async learnAndSave(id: string): Promise<void> {
    const before = this.main.savedCount
    await waitFor(() => !this.card.isVisible, "word card closed before selecting a new object", 5000)
    await this.tap(`Learnable_${id}`)
    await waitFor(() => this.card.isVisible && this.card.currentWordId === id, `word card open for '${id}'`)
    await this.tap("WordCardSaveButton")
    await waitFor(() => this.main.savedCount === before + 1 && this.main.savedWords.indexOf(id) >= 0, `'${id}' saved`)
    await waitFor(() => !this.card.isVisible, "word card hidden after save (fly-to-counter)", 4000)
  }

  /** Use it live: wait until the server has finished `step` and phrase cards are offered. */
  async waitForUserTurn(step: number, timeoutMs: number = 25000): Promise<void> {
    await waitFor(() => this.order.orderStep === step && this.order.waitingFor === "user" && this.phrases.isVisible,
      `order step ${step} waiting for the user (got step ${this.order.orderStep}, waitingFor '${this.order.waitingFor}')`, timeoutMs)
  }
}
