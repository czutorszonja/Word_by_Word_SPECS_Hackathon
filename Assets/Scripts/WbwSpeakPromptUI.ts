// WbwSpeakPromptUI.ts — the "Say it out loud" strip of Use it live (passive view).
// Owns: ONE solid strip in the Use it live tone, shown under the answer surface while a speak turn is
//       open: the mode chip, a mic dot that grows and brightens with the learner's voice level, one
//       status line ("Say it out loud" → "Heard you…" → "Heard you ✓") and the always-available
//       "Said it" button. Built once on the first show(), then only enabled / disabled, so the scene
//       never holds two SaidItButton objects. Emits onSaidIt.
// Must NOT: play audio or SFX (any Lens sound restarts the detector's guard and would eat the learner's
//           first syllables), read the microphone, decide when a turn opens or ends, judge the answer
//           (never AMBER: voice activity cannot tell right from wrong), or place itself
//           (WbwOrderController moves the host; the strip is centred on it).
// Stable names: SpeakPrompt, ModeChip, MicIndicator, SpeakPromptText, SaidItButton.
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {RoundedRectangle} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"
import {button, ButtonParts, flexBox, item, lineHeightCm, obj, panel, register, text, textWidthCm, toward, useTone, GREEN, MUTED, TONE_LIVE, modeChip, modeChipH} from "./WbwSharedUI"

const ICON_CHECK = requireAsset("../Icons/check_circle.png") as Texture
const ICON_SIZE = 2.2 // Said it icon (cm)

// ── Wording, one line per state. The glyphs sit in constants so one can be dropped after the capture
//    check of the UI font (fallback for HEARD_DONE: "Heard you").
const SAY_IT = "Say it out loud"                          // guard, calibrating, listening, candidate
const HEARD_SPEAKING = "Heard you…"                       // speech: the learner is talking
const HEARD_DONE = "Heard you ✓"                          // done: the answer was taken
const MIC_OFF = "Mic off · tap Said it"                   // nosignal: no microphone signal
const NUDGE = "Say it out loud, or tap Said it"           // nudge: waited a while, any state but speech / done
const DETECTION_OFF = "Say it out loud, then tap Said it" // off: voice detection is switched off
const SAID_IT = "Said it"
const LONGEST_LINE = [SAY_IT, HEARD_SPEAKING, HEARD_DONE, MIC_OFF, NUDGE, DETECTION_OFF].reduce((n, s) => Math.max(n, s.length), 0)

/** Seconds "Heard you ✓" stays after showHeard() before the strip hides. */
const HEARD_HOLD_SEC = 0.6
// strip layout (cm)
const PAD_X = 1.0, PAD_Y = 0.7, ROW_GAP = 0.3, COL_GAP = 1.2, DOT_GAP = 0.7
// the generic width estimate runs wide for this font (see WbwPhraseChoicesUI); 0.95 keeps a safety margin
const WIDTH_FIT = 0.95
/** Mic dot at rest: the Use it live fill mixed this far toward its light tint (0 = fill, 1 = tint). */
const DOT_REST = 0.45
/** How quickly the dot follows the voice level (higher = snappier). */
const LEVEL_SMOOTH = 12

interface StripLayout {
  W: number; H: number
  innerW: number; innerH: number
  statusW: number; statusH: number
  lineH: number; textW: number; dotD: number
  btnW: number; btnH: number
}

@component
export class WbwSpeakPromptUI extends BaseScriptComponent {
  @ui.label("WbwSpeakPromptUI – say-it strip (mic indicator + Said it)")
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Distance the strip's text is sized for (cm). It lies under the phrase cards / phrase helper on the counter (~125 cm away); sizing for less keeps it compact")
  @widget(new SliderWidget(60, 140, 5))
  viewDistanceCm: number = 100

  @input
  @hint("How much the mic dot grows with the learner's voice level (0 = it only brightens)")
  @widget(new SliderWidget(0, 0.8, 0.05))
  micPulse: number = 0.45
  @ui.group_end

  private root: SceneObject | null = null
  private dot: RoundedRectangle | null = null
  private dotT: Transform | null = null
  private label: Text | null = null
  private said: ButtonParts | null = null
  private builtSize: vec2 | null = null
  private level = 0
  private shownLevel = 0
  private nudge = false
  private iconPulsing = false
  // done state latched by showHeard(): nothing overwrites it until the next show()
  private heard = false
  private heardTok = -1
  private heardHideAt = -1
  private _onSaidIt = new Event<void>()
  /** The Said it button was pressed. */
  get onSaidIt(): PublicApi<void> { return this._onSaidIt.publicApi() }

  /** Last state applied: "off" | "guard" | "calibrating" | "listening" | "candidate" | "speech" | "done" |
   *  "nosignal" ("" before the first show; "done" after showHeard()). */
  state: string = ""
  /** Text in SpeakPromptText. */
  stateText: string = ""
  /** Bumps on every show() / hide() / showHeard(): a newer call always wins over a pending hide. */
  showToken: number = 0
  get isVisible(): boolean { return this.root !== null && !isNull(this.root) && this.root.enabled }
  /** Size (cm) of the strip. It never changes, and it is valid before the first show(). */
  get sizeCm(): vec2 {
    if (this.builtSize) return this.builtSize
    const m = this.measure()
    return new vec2(m.W, m.H)
  }

  onAwake(): void {
    this.createEvent("UpdateEvent").bind(() => this.tick())
  }

  /** Show the strip for a new speak turn: "Say it out loud" until the first setState() arrives. */
  show(): void {
    this.showToken++
    this.heardHideAt = -1
    this.heard = false
    this.build()
    if (this.root) this.root.enabled = true
    this.level = 0
    this.shownLevel = 0
    this.nudge = false
    this.apply("listening")
    this.paint(0)
  }

  /** Hide the strip now (also cancels a pending "Heard you ✓" hide). */
  hide(): void {
    this.showToken++
    this.hideNow()
  }

  /**
   * Follow the detector while a turn is open. `state` is the detector's state, or "off" when voice
   * detection is switched off; `level01` (0..1) drives the mic dot; `nudge` asks for "… or tap Said it"
   * and a gently pulsing Said it button. Ignored after showHeard() until the next show().
   */
  setState(state: string, level01: number, nudge: boolean): void {
    if (this.heard) return
    this.level = level01 > 0 ? Math.min(1, level01) : 0
    this.nudge = nudge && state !== "speech" && state !== "done"
    this.apply(state)
  }

  /** The answer was taken: "Heard you ✓" with a green dot for a moment, then the strip hides, unless
   *  show() or hide() was called in the meantime. */
  showHeard(): void {
    const tok = ++this.showToken
    this.build()
    if (this.root) this.root.enabled = true
    this.level = 0
    this.nudge = false
    this.apply("done")
    this.heard = true
    this.heardTok = tok
    this.heardHideAt = getTime() + HEARD_HOLD_SEC
    this.paint(0)
  }

  private hideNow(): void {
    this.heardHideAt = -1
    if (this.root && !isNull(this.root)) this.root.enabled = false
  }

  private apply(state: string): void {
    this.state = state
    const str = this.lineFor(state, this.nudge)
    if (str === this.stateText) return
    this.stateText = str
    if (this.label && !isNull(this.label)) this.label.text = str
  }

  private lineFor(state: string, nudge: boolean): string {
    if (state === "done") return HEARD_DONE
    if (state === "speech") return HEARD_SPEAKING
    if (nudge) return NUDGE
    if (state === "nosignal") return MIC_OFF
    if (state === "off") return DETECTION_OFF
    return SAY_IT
  }

  /** Fixed strip: sized for the longest status line, so nothing moves when the state changes. */
  private measure(): StripLayout {
    const d = this.viewDistanceCm
    const lineH = lineHeightCm("Caption", d, false)
    const chipW = textWidthCm(TONE_LIVE.label.length, "Caption", d, false) + 1.4 // as modeChip() sizes it
    const dotD = Math.max(0.9, lineH * 0.5)
    const textW = textWidthCm(LONGEST_LINE, "Caption", d, false) * WIDTH_FIT + 0.4
    const statusW = Math.max(chipW, dotD + DOT_GAP + textW)
    const statusH = modeChipH(d) + ROW_GAP + lineH
    // icon beside a short label; at least 3.8 cm tall so it stays easy to pinch
    const btnW = Math.max(9, textWidthCm(SAID_IT.length, "Button", d, false) + ICON_SIZE + 2.1)
    const btnH = Math.max(3.8, Math.min(4.4, statusH))
    const innerW = statusW + COL_GAP + btnW, innerH = Math.max(statusH, btnH)
    return {W: innerW + 2 * PAD_X, H: innerH + 2 * PAD_Y, innerW, innerH, statusW, statusH, lineH, textW, dotD, btnW, btnH}
  }

  /** Build the strip once; show() / hide() only enable / disable it afterwards. */
  private build(): void {
    if (this.root && !isNull(this.root)) return
    const m = this.measure(), d = this.viewDistanceCm
    useTone(TONE_LIVE)
    // a strip this low is drawn solid, so the line stays readable over the counter
    const p = panel(this.sceneObject, "SpeakPrompt", m.W, m.H, {padX: PAD_X, padY: PAD_Y, justify: FlexJustify.Center, align: FlexAlign.Center}, true)
    this.root = p.root
    const row = flexBox(p.content, "SpeakPromptRow", "row", m.innerW, m.innerH, {gap: COL_GAP, justify: FlexJustify.SpaceBetween, align: FlexAlign.Center})
    // left: the mode is always named (chip), then the mic dot with the status line
    const status = flexBox(row, "SpeakPromptStatus", "column", m.statusW, m.statusH, {gap: ROW_GAP, justify: FlexJustify.Center, align: FlexAlign.Start})
    modeChip(status, d)
    const line = flexBox(status, "SpeakPromptLine", "row", m.statusW, m.lineH, {gap: DOT_GAP, justify: FlexJustify.Start, align: FlexAlign.Center})
    const dotSo = obj(line, "MicIndicator", new vec3(0, 0, 0.03))
    const rr = dotSo.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
    rr.size = new vec2(m.dotD, m.dotD)
    rr.cornerRadius = m.dotD / 2
    rr.gradient = false
    rr.backgroundColor = toward(TONE_LIVE, DOT_REST)
    register(line, item(dotSo, m.dotD, m.dotD))
    this.dot = rr
    this.dotT = dotSo.getTransform()
    this.label = text(line, "SpeakPromptText", this.stateText, "Caption", d, {w: m.textW, h: m.lineH, align: "left", onPanel: false})
    this.label.horizontalOverflow = HorizontalOverflow.Shrink
    // right: the way on that never depends on the microphone
    this.said = button(row, "SaidItButton", m.btnW, m.btnH, SAID_IT, d, () => this._onSaidIt.invoke(), {icon: ICON_CHECK, iconSize: ICON_SIZE, primary: true})
    this.iconPulsing = false
    this.builtSize = new vec2(m.W, m.H)
  }

  private tick(): void {
    if (this.heardHideAt >= 0 && getTime() >= this.heardHideAt) {
      this.heardHideAt = -1
      if (this.heardTok === this.showToken) this.hideNow() // a show() / hide() since showHeard() wins
    }
    if (!this.isVisible) return
    this.paint(getDeltaTime())
  }

  /** Mic dot and the Said it nudge. The state is never colour alone: the status line names it. */
  private paint(dt: number): void {
    const s = this.state, now = getTime()
    if (this.dot && this.dotT && !isNull(this.dot)) {
      let color: vec4, scale: number
      if (s === "speech" || s === "done") {
        // heard: green, never a right / wrong verdict
        color = GREEN
        scale = s === "speech" ? 1.15 + 0.1 * Math.sin(now * 8) : 1.15
        this.shownLevel = 0
      } else if (s === "nosignal" || s === "off") {
        // the microphone is not listening: small and dim
        color = MUTED
        scale = 0.75
        this.shownLevel = 0
      } else {
        // guard … candidate: the Use it live tint, brighter and larger with the learner's voice
        this.shownLevel += (this.level - this.shownLevel) * (dt > 0 ? Math.min(1, dt * LEVEL_SMOOTH) : 1)
        const lv = s === "candidate" ? Math.max(this.shownLevel, 0.6) : this.shownLevel
        color = toward(TONE_LIVE, DOT_REST + (1 - DOT_REST) * lv)
        scale = 0.85 + this.micPulse * lv
      }
      this.dot.backgroundColor = color
      this.dotT.setLocalScale(new vec3(scale, scale, 1))
    }
    // nudge: the Said it icon pulses gently (the button itself keeps its size and its collider)
    const b = this.said
    if (b && b.icon && !isNull(b.so) && (this.nudge || this.iconPulsing)) {
      const size = ICON_SIZE * (this.nudge ? 1 + 0.15 * Math.sin(now * 6) : 1)
      b.icon.getSceneObject().getTransform().setLocalScale(new vec3(size, size, 1))
      this.iconPulsing = this.nudge
    }
  }
}
