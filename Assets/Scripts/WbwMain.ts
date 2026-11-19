// WbwMain.ts — Word by Word orchestrator (entry point).
// Owns: start-up sequence (build café → host the views that are not wired + the voice detector →
//       setup panel → arrival: walk in → "Café detected (demo)" toast → suggestion panel; no mode
//       starts by itself), the mode menu (opened from the "✋ Menu" stand-in), mode switching, the
//       hand-off of a word card's "Use it live →" word, and the WbwSession instance. Exposes
//       readable session and arrival state for tests.
// Expects @inputs: the UI modules (setup, toast, HUD, mode menu), the café builder, the three
//       mode controllers and the audio controller — all wired by the scene bootstrap. Optional:
//       the arrival suggestion panel (created at start if empty) and a Microphone Audio asset
//       (empty = only the Said it button ends a speak turn).
// Must NOT: build UI, create text, or implement mode logic (each controller owns its mode). For a
//       view that is not wired it only creates the empty host object and the view component.
import {WbwSetupPanelUI} from "./WbwSetupPanelUI"
import {WbwToastUI} from "./WbwToastUI"
import {WbwHudUI} from "./WbwHudUI"
import {WbwModeMenuUI} from "./WbwModeMenuUI"
import {WbwSuggestionUI} from "./WbwSuggestionUI"
import {WbwNameLabelUI} from "./WbwNameLabelUI"
import {WbwPhraseHelperUI} from "./WbwPhraseHelperUI"
import {WbwSpeakPromptUI} from "./WbwSpeakPromptUI"
import {WbwCafeBuilder} from "./WbwCafeBuilder"
import {WbwLearnController} from "./WbwLearnController"
import {WbwOrderController} from "./WbwOrderController"
import {WbwPracticeController} from "./WbwPracticeController"
import {WbwAudioController} from "./WbwAudioController"
import {WbwVoiceActivity} from "./WbwVoiceActivity"
import {MODE_LABEL, Mode, WbwSession} from "./WbwSession"
import {camLook, camPos, camRightFlat, horizDist, inView, lazyFollowStep, placeFacingUser} from "./WbwSpatial"
import {WbwRaiseHand} from "./WbwRaiseHand"

// Arrival placement: distance in front of the user and height relative to the gaze line (cm).
const TOAST_DIST = 80, TOAST_UP = 14
const SUGGEST_DIST = 70, SUGGEST_UP = -3
/** The toast's own shrink-fade (WbwToastUI), then a short pause before the suggestion appears (s). */
const TOAST_FADE_SEC = 0.35, SUGGEST_PAUSE_SEC = 0.3
/** Option the arrival suggestion recommends: nothing is saved yet, so Learn comes first. */
const SUGGESTED_OPTION = "learn"

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
  @input @allowUndefined @hint("Arrival suggestion panel (Learn / Practice / Use it live / Later). Empty = created at start") suggestion: WbwSuggestionUI | undefined
  @input @allowUndefined @hint("Microphone Audio asset (Asset Browser → + → Microphone Audio) for 'say it out loud' in Use it live. Empty = only the Said it button ends a speak turn") micAudio: AudioTrackAsset | undefined
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
  @hint("Mode entered by itself after the toast. Used only when the arrival suggestion is off or setup is skipped")
  @widget(new ComboBoxWidget([new ComboBoxItem("Learn", "learn"), new ComboBoxItem("Use it live", "live"), new ComboBoxItem("Practice", "practice"), new ComboBoxItem("None (menu only)", "none")]))
  firstMode: string = "learn"

  @input
  @hint("Distance of the setup panel in front of the user (cm) — brief: ~70 cm")
  @widget(new SliderWidget(40, 110, 1))
  setupDistanceCm: number = 70

  @input
  @hint("On Specs: raising an open hand (palm toward you) opens the mode menu next to it. The HUD Menu button is the preview stand-in.")
  raiseHandOpensMenu: boolean = true

  @input
  @hint("Skip the setup panel, the walk-in and the suggestion (handy while iterating): toast, then the first mode")
  skipSetup: boolean = false
  @ui.group_end
  @ui.group_start("Arrival")
  @input
  @hint("After the toast, offer Learn / Practice / Use it live / Later and wait for a pick: no mode starts by itself and the HUD stays hidden until then. Off = the first mode (Settings) starts by itself after the toast")
  arrivalSuggestion: boolean = true

  @input
  @hint("The toast appears once the learner has walked this far after Start (cm)...")
  @widget(new SliderWidget(0, 300, 5))
  toastAfterWalkCm: number = 80

  @input
  @hint("...or this many seconds after Start, whichever comes first")
  @widget(new SliderWidget(0, 6, 0.1))
  toastFallbackSec: number = 1.5

  @input
  @hint("Kiosk only: seconds on the suggestion panel after which the suggested option is picked by itself. 0 = never (nothing starts by itself)")
  @widget(new SliderWidget(0, 60, 1))
  suggestAutoPickSec: number = 0
  @ui.group_end

  private session = new WbwSession()
  private raiseHand: WbwRaiseHand | null = null
  private walkStart: vec3 = vec3.zero()
  private walkT0 = 0
  private toastT0 = 0
  private suggestT0 = 0
  private toastFollowing = false
  private suggestFollowing = false

  // ── readable state for tests ──
  get currentMode(): string { return this.session.mode }
  get currentModeLabel(): string { return MODE_LABEL[this.session.mode] }
  get savedWords(): string[] { return this.session.saved }
  get savedCount(): number { return this.session.savedCount }
  get setupComplete(): boolean { return this.session.setupComplete }
  get menuOpen(): boolean { return this.modeMenu ? this.modeMenu.isVisible : false }
  /** Number of mode switches this session. */
  modeSwitches: number = 0
  /** Arrival: "setup" → "walkIn" → "toast" → "suggest" → "done". */
  arrivalPhase: string = "setup"
  /** True while the arrival suggestion panel is up. */
  get suggestionVisible(): boolean { return !!this.suggestion && this.suggestion.isVisible }
  /** Option picked on the suggestion panel: "learn" | "practice" | "live" | "later" ("" = none). */
  suggestionPick: string = ""
  /** What made the toast appear: "walk" | "timeout", or "skip" when the arrival was skipped ("" = not yet). */
  toastTrigger: string = ""
  /** Horizontal distance walked since Start, measured until the toast appears (cm). */
  walkedSinceStartCm: number = 0
  /** The "say it out loud" detector, created at start (null if it could not be created). */
  vad: WbwVoiceActivity | null = null

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
    // views and the detector come first: the controllers subscribe to them in init()
    this.ensureViews()
    this.createVoiceDetector()
    this.learn.init(this.session, this.audio, this.hud, this.cafe.learnables)
    this.order.init(this.session, this.audio, this.learn, this.vad)
    this.practice.init(this.session, this.audio, this.cafe, this.order, () => this.selectMode("none"))
    this.session.onSavedChanged.add((s) => this.hud.setSaved(s.length))
    this.session.onModeChanged.add((m) => this.applyMode(m))
    this.hud.onMenu.add(() => this.toggleMenu())
    this.modeMenu.onPick.add((m) => this.selectMode(m as Mode))
    this.modeMenu.onClose.add(() => this.modeMenu.hide())
    this.setupPanel.onConfirm.add(() => this.confirmSetup())
    // "Use it live →" on a word card: carry the word, then switch mode (the order controller reads it once).
    // The label's "Use this word" / "Add" buttons need no wiring here: order.init() subscribes learn.onUse / onAdd.
    this.learn.onUseLive.add((id) => {
      this.session.setLiveEntry("card", id)
      this.selectMode("live")
    })
    if (this.suggestion) this.suggestion.onPick.add((o) => this.onSuggestionPick(o))
    // HUD: in Use it live collapse to a small Menu chip (low-left) so it never covers the server or cards
    this.createEvent("UpdateEvent").bind(() => {
      this.hud.setCompact(this.order.active)
      this.tickArrival()
    })
    if (this.raiseHandOpensMenu) {
      this.raiseHand = new WbwRaiseHand()
      this.createEvent("UpdateEvent").bind(() => this.checkRaisedHand())
    }
    print(`WbwMain: camera start at ${camPos()} looking ${camLook()}`)
    if (this.skipSetup) {
      this.confirmSetup(true)
      return
    }
    this.setupPanel.show()
    placeFacingUser(this.setupPanel.getSceneObject(), inView(this.setupDistanceCm, -7))
  }

  // ── runtime views and the voice detector ──

  /** Host every view the scene did not wire: an empty object under the UI root plus the view component.
   *  Such a view keeps its code-default settings; wire one in the scene to tune it in the inspector. */
  private ensureViews(): void {
    const made: string[] = []
    if (!this.learn.nameLabel) {
      this.hostView("NameLabelRoot", made, (so) => { this.learn.nameLabel = so.createComponent(WbwNameLabelUI.getTypeName()) as WbwNameLabelUI })
    }
    if (!this.order.phraseHelper) {
      this.hostView("PhraseHelperRoot", made, (so) => { this.order.phraseHelper = so.createComponent(WbwPhraseHelperUI.getTypeName()) as WbwPhraseHelperUI })
    }
    if (!this.order.speakPrompt) {
      this.hostView("SpeakPromptRoot", made, (so) => { this.order.speakPrompt = so.createComponent(WbwSpeakPromptUI.getTypeName()) as WbwSpeakPromptUI })
    }
    if (!this.suggestion) {
      this.hostView("SuggestionRoot", made, (so) => { this.suggestion = so.createComponent(WbwSuggestionUI.getTypeName()) as WbwSuggestionUI })
    }
    if (made.length > 0) print(`WbwMain: views not wired in the scene, created at start: ${made.join(", ")}`)
  }

  /** A failure is logged and leaves that view missing: its controller guards every use. */
  private hostView(name: string, made: string[], create: (host: SceneObject) => void): void {
    try {
      const so = global.scene.createSceneObject(name)
      const uiRoot = this.hud.getSceneObject().getParent()
      so.setParent(uiRoot ? uiRoot : this.sceneObject)
      create(so)
      made.push(name)
    } catch (e) {
      print(`WbwMain: could not create ${name}: ${e}`)
    }
  }

  /** The detector has no scene wiring: it is created here and gets the audio controller as its playback
   *  gate (it never counts the Lens's own clips) and the optional Microphone Audio asset. No asset, or no
   *  detector at all = Said-it-only mode. The inspector toggle is WbwOrderController.voiceDetection. */
  private createVoiceDetector(): void {
    try {
      const vad = this.sceneObject.createComponent(WbwVoiceActivity.getTypeName()) as WbwVoiceActivity
      vad.init(this.audio, this.micAudio)
      vad.setVoiceDetection(this.order.voiceDetection)
      this.vad = vad
    } catch (e) {
      this.vad = null
      print(`WbwMain: no voice detector (${e}); only the Said it button ends a speak turn`)
    }
  }

  // ── arrival: setup → walkIn → toast → suggest → done ──

  /** Start was pressed. `skipArrival` (or the suggestion switched off): toast now, HUD now, then the
   *  first mode by itself. Otherwise the learner walks in and nothing starts until they pick. */
  private confirmSetup(skipArrival: boolean = false): void {
    if (this.session.setupComplete) return
    this.session.setupComplete = true
    this.audio.playSfx("ToastPop")
    this.setupPanel.hide()
    if (skipArrival || !this.arrivalSuggestion || !this.suggestion) {
      this.arrivalPhase = "done"
      this.toastTrigger = "skip"
      this.hud.show()
      this.hud.setSaved(this.session.savedCount)
      this.hud.setMode(MODE_LABEL[this.session.mode])
      this.toast.show(this.toastText, this.toastSeconds)
      placeFacingUser(this.toast.getSceneObject(), inView(TOAST_DIST, TOAST_UP))
      const ev = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
      ev.bind(() => {
        if (this.session.mode === "none" && this.firstMode !== "none") this.selectMode(this.firstMode as Mode)
      })
      ev.reset(this.toastSeconds + 0.2)
      return
    }
    // the HUD stays hidden until a pick
    this.arrivalPhase = "walkIn"
    this.walkStart = camPos()
    this.walkT0 = getTime()
    this.walkedSinceStartCm = 0
  }

  /** Every frame. Plays no voice; the only sounds of the arrival are ToastPop and the pick's UiClick. */
  private tickArrival(): void {
    if (this.arrivalPhase === "walkIn") {
      this.walkedSinceStartCm = horizDist(camPos(), this.walkStart)
      const walked = this.walkedSinceStartCm >= this.toastAfterWalkCm
      if (!walked && getTime() - this.walkT0 < this.toastFallbackSec) return
      this.toastTrigger = walked ? "walk" : "timeout"
      this.toast.show(this.toastText, this.toastSeconds)
      placeFacingUser(this.toast.getSceneObject(), inView(TOAST_DIST, TOAST_UP))
      this.toastFollowing = false
      this.toastT0 = getTime()
      this.arrivalPhase = "toast"
      print(`WbwMain: arrival → toast (${this.toastTrigger}, walked ${Math.round(this.walkedSinceStartCm)} cm)`)
    } else if (this.arrivalPhase === "toast") {
      // the toast keeps up with a walking learner instead of being left behind
      if (this.toast.isVisible) {
        this.toastFollowing = lazyFollowStep(this.toast.getSceneObject(), TOAST_DIST, TOAST_UP, getDeltaTime(), this.toastFollowing)
      }
      if (getTime() - this.toastT0 >= this.toastSeconds + TOAST_FADE_SEC + SUGGEST_PAUSE_SEC) this.showSuggestion()
    } else if (this.arrivalPhase === "suggest") {
      const s = this.suggestion
      if (!s || !s.isVisible) {
        // the panel did not come up: never leave the learner without the HUD and its Menu
        if (getTime() - this.suggestT0 > 1) {
          print("WbwMain: the suggestion panel is not visible; showing the HUD instead")
          this.finishArrival()
        }
        return
      }
      // frozen while a button on it is pointed at, so the target never slides out from under the pointer
      this.suggestFollowing = lazyFollowStep(s.getSceneObject(), SUGGEST_DIST, SUGGEST_UP, getDeltaTime(), this.suggestFollowing, s.hoveredOption !== "")
      if (this.suggestAutoPickSec > 0 && getTime() - this.suggestT0 >= this.suggestAutoPickSec) this.onSuggestionPick(SUGGESTED_OPTION)
    }
  }

  private showSuggestion(): void {
    if (!this.suggestion) {
      this.finishArrival()
      return
    }
    this.arrivalPhase = "suggest"
    this.audio.playSfx("ToastPop")
    this.suggestion.show(this.session.savedCount, SUGGESTED_OPTION)
    placeFacingUser(this.suggestion.getSceneObject(), inView(SUGGEST_DIST, SUGGEST_UP))
    this.suggestFollowing = false
    this.suggestT0 = getTime()
    print("WbwMain: arrival → suggestion (waiting for a pick)")
  }

  /** A tile or Later on the suggestion panel. "later" leaves the mode at "none": the Menu has every mode. */
  private onSuggestionPick(o: string): void {
    if (this.arrivalPhase !== "suggest") return
    this.suggestionPick = o
    this.audio.playSfx("UiClick")
    this.finishArrival()
    print(`WbwMain: arrival → done (picked ${o})`)
    if (o === "live") this.session.setLiveEntry("menu", "")
    if (o === "learn" || o === "practice" || o === "live") this.selectMode(o as Mode)
  }

  /** Ends the arrival for good (the suggestion never comes back): the panel goes, the HUD shows. */
  private finishArrival(): void {
    if (this.suggestion) this.suggestion.hide()
    this.arrivalPhase = "done"
    if (!this.hud.isVisible) {
      this.hud.show()
      this.hud.setSaved(this.session.savedCount)
      this.hud.setMode(MODE_LABEL[this.session.mode])
    }
  }

  /** Raised open hand → menu next to the palm. It stays where it opened: the hand can drop. */
  private checkRaisedHand(): void {
    if (!this.raiseHand || !this.session.setupComplete || this.arrivalPhase !== "done") return
    const palm = this.raiseHand.update()
    if (!palm || this.modeMenu.isVisible) return
    this.openMenuAt(palm.add(new vec3(0, 14, 0)).add(camPos().sub(palm).normalize().uniformScale(4)))
  }

  /** Open/close the mode menu (what the "✋ Menu" stand-in does). */
  toggleMenu(): void {
    if (this.modeMenu.isVisible) {
      this.modeMenu.hide()
      return
    }
    // preview stand-in: just above and inward of the low-side HUD (where a raised hand would be)
    const hudPos = this.hud.getSceneObject().getTransform().getWorldPosition()
    this.openMenuAt(hudPos.add(new vec3(0, 20.5, 0)).add(camRightFlat().uniformScale(6)))
  }

  private openMenuAt(pos: vec3): void {
    this.audio.playSfx("ToastPop")
    this.modeMenu.show(this.session.mode, MODE_LABEL[this.session.mode], this.session.savedCount)
    placeFacingUser(this.modeMenu.getSceneObject(), pos)
  }

  /** Switch mode (closes the menu). Saved words are kept across switches. Any mode chosen before the
   *  arrival is over ends it: setup counts as confirmed and the suggestion is not shown. */
  selectMode(m: Mode): void {
    this.modeMenu.hide()
    if (!this.session.setupComplete) this.confirmSetup(true)
    if (this.arrivalPhase !== "done") this.finishArrival()
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
      // Use it live starts over in its prep state: the phrase helper, the server waits for "Ready to order"
      if (m === "live") this.order.enterPrep()
    }
    this.learn.setActive(m === "learn")
    // pointing labels: Learn (select opens the card) and Use it live (phrase buttons); set before the order
    // controller activates, so the live slots it pushes are styled in the new mode
    this.learn.setPointMode(m === "learn" ? "learn" : m === "live" ? "live" : "off")
    this.order.setActive(m === "live")
    this.practice.setActive(m === "practice")
    this.hud.setMode(MODE_LABEL[m])
    print(`WbwMain: mode → ${m} (saved: ${this.session.savedCount})`)
  }
}
