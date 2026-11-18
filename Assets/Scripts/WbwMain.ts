// WbwMain.ts — Word by Word orchestrator (entry point).
// Owns: start-up sequence (build café → setup panel → "Café detected (demo)" toast → first
//       mode), the mode menu (opened from the "✋ Menu" stand-in), mode switching, and the
//       WbwSession instance. Exposes readable session state for tests.
// Expects @inputs: the UI modules (setup, toast, HUD, mode menu), the café builder, the three
//       mode controllers and the audio controller — all wired by the scene bootstrap.
// Must NOT: build UI, create text, or implement mode logic (each controller owns its mode).
import {WbwSetupPanelUI} from "./WbwSetupPanelUI"
import {WbwToastUI} from "./WbwToastUI"
import {WbwHudUI} from "./WbwHudUI"
import {WbwModeMenuUI} from "./WbwModeMenuUI"
import {WbwCafeBuilder} from "./WbwCafeBuilder"
import {WbwLearnController} from "./WbwLearnController"
import {WbwOrderController} from "./WbwOrderController"
import {WbwPracticeController} from "./WbwPracticeController"
import {WbwAudioController} from "./WbwAudioController"
import {MODE_LABEL, Mode, WbwSession} from "./WbwSession"
import {camLook, camPos, camRightFlat, inView, placeFacingUser} from "./WbwSpatial"

@component
export class WbwMain extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwMain – Word by Word café (setup, menu, modes)</span>')
  @ui.separator
  @ui.group_start("References")
  @input @hint("Language setup panel") setupPanel!: WbwSetupPanelUI
  @input @hint("'Café detected (demo)' toast") toast!: WbwToastUI
  @input @hint("HUD with the ✋ Menu stand-in button") hud!: WbwHudUI
  @input @hint("Mode menu") modeMenu!: WbwModeMenuUI
  @input @hint("Café builder (virtual café stand-in)") cafe!: WbwCafeBuilder
  @input @hint("Learn mode controller") learn!: WbwLearnController
  @input @hint("Use it live controller") order!: WbwOrderController
  @input @hint("Practice controller") practice!: WbwPracticeController
  @input @hint("Audio controller") audio!: WbwAudioController
  @ui.group_end
  @ui.group_start("Settings")
  @input
  @hint("Stand-in for location recognition, shown after setup")
  toastText: string = "Café detected (demo)"

  @input
  @hint("Seconds the toast stays (brief: about 3 s)")
  @widget(new SliderWidget(1, 8, 0.5))
  toastSeconds: number = 3

  @input
  @hint("Mode entered automatically after setup")
  @widget(new ComboBoxWidget([new ComboBoxItem("Learn", "learn"), new ComboBoxItem("Use it live", "live"), new ComboBoxItem("Practice", "practice"), new ComboBoxItem("None (menu only)", "none")]))
  firstMode: string = "learn"

  @input
  @hint("Distance of the setup panel in front of the user (cm) — brief: ~70 cm")
  @widget(new SliderWidget(40, 110, 1))
  setupDistanceCm: number = 70

  @input
  @hint("Skip the setup panel and toast (handy while iterating)")
  skipSetup: boolean = false
  @ui.group_end

  private session = new WbwSession()

  // ── readable state for tests ──
  get currentMode(): string { return this.session.mode }
  get currentModeLabel(): string { return MODE_LABEL[this.session.mode] }
  get savedWords(): string[] { return this.session.saved }
  get savedCount(): number { return this.session.savedCount }
  get setupComplete(): boolean { return this.session.setupComplete }
  get menuOpen(): boolean { return this.modeMenu ? this.modeMenu.isVisible : false }
  /** Number of mode switches this session. */
  modeSwitches: number = 0

  getSession(): WbwSession { return this.session }

  onAwake(): void {
    const missing = ["setupPanel", "toast", "hud", "modeMenu", "cafe", "learn", "order", "practice", "audio"]
      .filter((k) => !(this as unknown as {[k: string]: unknown})[k])
    if (missing.length > 0) {
      print(`WbwMain: required @input not wired: ${missing.join(", ")} — check the scene bootstrap.`)
      return
    }
    this.createEvent("OnStartEvent").bind(() => this.start())
  }

  private start(): void {
    this.cafe.build()
    this.learn.init(this.session, this.audio, this.hud, this.cafe.learnables)
    this.order.init(this.session, this.audio, this.learn)
    this.practice.init(this.session, this.audio, this.cafe, this.order, () => this.selectMode("none"))
    this.session.onSavedChanged.add((s) => this.hud.setSaved(s.length))
    this.session.onModeChanged.add((m) => this.applyMode(m))
    this.hud.onMenu.add(() => this.toggleMenu())
    this.modeMenu.onPick.add((m) => this.selectMode(m as Mode))
    this.modeMenu.onClose.add(() => this.modeMenu.hide())
    this.setupPanel.onConfirm.add(() => this.confirmSetup())
    print(`WbwMain: camera start at ${camPos()} looking ${camLook()}`)
    if (this.skipSetup) {
      this.confirmSetup()
      return
    }
    this.setupPanel.show()
    placeFacingUser(this.setupPanel.getSceneObject(), inView(this.setupDistanceCm, -7))
  }

  private confirmSetup(): void {
    if (this.session.setupComplete) return
    this.session.setupComplete = true
    this.audio.playSfx("ToastPop")
    this.setupPanel.hide()
    this.hud.show()
    this.hud.setSaved(this.session.savedCount)
    this.hud.setMode(MODE_LABEL[this.session.mode])
    this.toast.show(this.toastText, this.toastSeconds)
    placeFacingUser(this.toast.getSceneObject(), inView(80, 14))
    const ev = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
    ev.bind(() => {
      if (this.session.mode === "none" && this.firstMode !== "none") this.selectMode(this.firstMode as Mode)
    })
    ev.reset(this.toastSeconds + 0.2)
  }

  /** Open/close the mode menu (what the "✋ Menu" stand-in does). */
  toggleMenu(): void {
    if (this.modeMenu.isVisible) {
      this.modeMenu.hide()
      return
    }
    this.audio.playSfx("ToastPop")
    this.modeMenu.show(this.session.mode, MODE_LABEL[this.session.mode], this.session.savedCount)
    // near the raised hand: just above and inward of the low-side HUD
    const hudPos = this.hud.getSceneObject().getTransform().getWorldPosition()
    const pos = hudPos.add(new vec3(0, 18, 0)).add(camRightFlat().uniformScale(6))
    placeFacingUser(this.modeMenu.getSceneObject(), pos)
  }

  /** Switch mode (closes the menu). Saved words are kept across switches. */
  selectMode(m: Mode): void {
    this.modeMenu.hide()
    if (!this.session.setupComplete) this.confirmSetup()
    if (m === this.session.mode) {
      // re-selecting the active mode restarts it (e.g. a new Practice set)
      this.applyMode(m, true)
      return
    }
    this.session.setMode(m)
  }

  private applyMode(m: Mode, restart: boolean = false): void {
    this.modeSwitches++
    if (restart) {
      if (m === "practice") this.practice.setActive(false)
      if (m === "learn") this.learn.setActive(false)
      if (m === "live") this.order.startOrder()
    }
    this.learn.setActive(m === "learn")
    this.order.setActive(m === "live")
    this.practice.setActive(m === "practice")
    this.hud.setMode(MODE_LABEL[m])
    print(`WbwMain: mode → ${m} (saved: ${this.session.savedCount})`)
  }
}
