// WbwSuggestionUI.ts — the arrival offer (passive view): "Looks like you're at Kifli Kávézó. Want help
// ordering?" [Yes, help me order] [Not now].
// 28 Nov (learner: "it was not obvious that the Specs recognised I'm in a café… a polite question when
// I go in"): one small card about the learner's need, not the app's modes (the old "What would you like
// to do here?" with Learn / Practice / Use it live tiles). Learn and Practice stay in the menu.
// Owns: the place line (the café's name), the question, two buttons and a muted line saying the location
//       is simulated in this demo. Panel sized around its contents. Emits onPick(option) and onHover(option).
// Must NOT: start a mode, hide itself after a pick, pick anything by itself (nothing auto-starts), play
//           audio, or position itself (WbwMain does all of that).
// Stable names: SuggestionPanel, SuggestPlace, SuggestTitle, SuggestDescription, SuggestLiveButton (Yes),
//               SuggestLaterButton (Not now) (each button has a scoped Label).
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {button, flexBox, lineHeightCm, panel, retire, text, textWidthCm, MUTED, TEXT_SOFT, useTone, TONE_LIVE} from "./WbwSharedUI"
import {CAFE_NAME} from "./WbwVocab"

const ICON_LIVE = requireAsset("../Icons/local_cafe.png") as Texture

// ── Wording
const PLACE_LEAD = "Looks like you're at"
const QUESTION = "Want help ordering?"
const YES = "Yes, help me order"
const NOT_NOW = "Not now"
const DEMO_NOTE = "Location is simulated in this demo"

// layout (cm): buttons at least 1.6 cm apart so the ray cannot hit the wrong one
const PAD = 1.6, GAP = 0.9, BTN_GAP = 1.6, BTN_H = 4.2, YES_W = 17, NO_W = 10

interface PanelLayout { W: number; H: number; inner: number; leadH: number; placeH: number; qH: number; noteH: number }

@component
export class WbwSuggestionUI extends BaseScriptComponent {
  @ui.label("WbwSuggestionUI – arrival offer: Looks like you're at … Want help ordering?")
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Viewing distance the text is sized for (cm); WbwMain opens the panel about this far away")
  @widget(new SliderWidget(40, 120, 5))
  viewDistanceCm: number = 70
  @ui.group_end

  private root: SceneObject | null = null
  // bumps on every show() / hide(): events from a retired panel are ignored
  private buildGen = 0
  private _onPick = new Event<string>()
  private _onHover = new Event<string>()
  /** A button was pressed: "live" (Yes) | "later" (Not now). */
  get onPick(): PublicApi<string> { return this._onPick.publicApi() }
  /** The pointed-at option changed ("" = none). */
  get onHover(): PublicApi<string> { return this._onHover.publicApi() }

  /** Option the pointer is on: "live" | "later" ("" = none, and when hidden). */
  hoveredOption: string = ""
  /** The question shown ("" when hidden). Kept under the old name for tests. */
  descriptionText: string = ""
  /** The place named on the card ("" when hidden). */
  placeName: string = ""
  /** The value passed to show() (kept for callers; the offer always suggests help ordering). */
  suggestedOption: string = ""
  get isVisible(): boolean { return this.root !== null }
  /** Size (cm) of the panel; valid before the first show(). */
  get sizeCm(): vec2 {
    const m = this.measure()
    return new vec2(m.W, m.H)
  }

  /** Show the offer. Both arguments are kept for callers (the card always offers help ordering). */
  show(savedCount: number, suggested: string): void {
    this.hide()
    this.suggestedOption = suggested
    const gen = this.buildGen
    const m = this.measure(), d = this.viewDistanceCm
    useTone(TONE_LIVE)
    const p = panel(this.sceneObject, "SuggestionPanel", m.W, m.H, {gap: GAP, padX: PAD, padY: PAD, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.root = p.root
    text(p.content, "SuggestLead", PLACE_LEAD, "Body", d, {w: m.inner, h: m.leadH, color: TEXT_SOFT})
    this.placeName = CAFE_NAME
    text(p.content, "SuggestPlace", CAFE_NAME, "Headline1", d, {w: m.inner, h: m.placeH})
    this.descriptionText = QUESTION
    text(p.content, "SuggestTitle", QUESTION, "Subheadline", d, {w: m.inner, h: m.qH})
    const row = flexBox(p.content, "SuggestButtons", "row", m.inner, BTN_H, {gap: BTN_GAP, justify: FlexJustify.Center, align: FlexAlign.Center})
    const yes = button(row, "SuggestLiveButton", YES_W, BTN_H, YES, d, () => this.pick("live", gen), {icon: ICON_LIVE, primary: true})
    this.watchHover(yes.btn, "live", gen)
    const no = button(row, "SuggestLaterButton", NO_W, BTN_H, NOT_NOW, d, () => this.pick("later", gen))
    this.watchHover(no.btn, "later", gen)
    text(p.content, "SuggestDescription", DEMO_NOTE, "Caption", d, {w: m.inner, h: m.noteH, color: MUTED, onPanel: false})
  }

  hide(): void {
    this.buildGen++
    retire(this.root, this)
    this.root = null
    this.descriptionText = ""
    this.placeName = ""
    if (this.hoveredOption !== "") {
      this.hoveredOption = ""
      this._onHover.invoke("")
    }
  }

  /** Kept for callers: the offer's wording is fixed. */
  setDescription(str: string): void {}

  private pick(option: string, gen: number): void {
    if (gen !== this.buildGen || !this.root) return
    this._onPick.invoke(option)
  }

  private watchHover(btn: Button, option: string, gen: number): void {
    btn.onHoverEnter.add(() => {
      if (gen === this.buildGen && option !== this.hoveredOption) {
        this.hoveredOption = option
        this._onHover.invoke(option)
      }
    })
    btn.onHoverExit.add(() => {
      if (gen === this.buildGen && this.hoveredOption === option) {
        this.hoveredOption = ""
        this._onHover.invoke("")
      }
    })
  }

  private measure(): PanelLayout {
    const d = this.viewDistanceCm
    const leadH = lineHeightCm("Body", d), placeH = lineHeightCm("Headline1", d), qH = lineHeightCm("Subheadline", d)
    const noteH = lineHeightCm("Caption", d, false)
    const inner = Math.max(YES_W + BTN_GAP + NO_W, textWidthCm(CAFE_NAME.length, "Headline1", d) + 0.6,
      textWidthCm(QUESTION.length, "Subheadline", d) + 0.6, textWidthCm(DEMO_NOTE.length, "Caption", d, false) + 0.6)
    return {
      W: inner + 2 * PAD,
      H: 2 * PAD + leadH + placeH + qH + BTN_H + noteH + 4 * GAP,
      inner, leadH, placeH, qH, noteH,
    }
  }
}
