// WbwSuggestionUI.ts — the arrival suggestion "What would you like to do here?" (passive view).
// Owns: one panel in the app-level tone: the question, three mode tiles (Learn / Practice / Use it live),
//       each in its own mode tone with its icon and its mode name, a one-line description that follows
//       the pointed-at option, and a "Later" button. The suggested tile wears the thicker primary outline
//       and the description names it, so the suggestion is never colour alone. Panel sized around its
//       contents. Emits onPick(option) and onHover(option).
// Must NOT: start a mode, hide itself after a pick, pick anything by itself (nothing auto-starts), play
//           audio, or position itself (WbwMain does all of that).
// Stable names: SuggestionPanel, SuggestTitle, SuggestDescription, SuggestLearnButton,
//               SuggestPracticeButton, SuggestLiveButton, SuggestLaterButton (each button has a scoped Label).
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {button, flexBox, lineHeightCm, panel, retire, text, textWidthCm, TEXT_SOFT, useTone, headerRule, HEADER_RULE_H, Tone, TONE_LEARN, TONE_LIVE, TONE_PRACTICE} from "./WbwSharedUI"

const ICON_LEARN = requireAsset("../Icons/school.png") as Texture
const ICON_PRACTICE = requireAsset("../Icons/extension.png") as Texture
const ICON_LIVE = requireAsset("../Icons/local_cafe.png") as Texture

// ── Wording
const TITLE = "What would you like to do here?"
const LATER = "Later"
const DESC_SUGGESTED = "Suggested here: start with " // + the suggested mode's name
const DESC_LEARN = "Point at food to see its Hungarian name"
const DESC_PRACTICE = "Match the words you saved"
const DESC_PRACTICE_NEEDS_WORDS = "Save 4 words first, then match them"
const DESC_LIVE = "Order at the counter in Hungarian"
const DESC_LATER = "Close; the Menu has every mode"
/** Saved words the matching game needs. */
const PRACTICE_NEEDS = 4

// Same order as the mode menu. Each tile wears its own mode tone and is labelled with that mode's name
// (Tone.label, the text the mode chips use), so the colours become learnable.
interface SuggestTile { option: string; name: string; icon: Texture; tone: Tone }
const TILES: SuggestTile[] = [
  {option: "learn", name: "SuggestLearnButton", icon: ICON_LEARN, tone: TONE_LEARN},
  {option: "practice", name: "SuggestPracticeButton", icon: ICON_PRACTICE, tone: TONE_PRACTICE},
  {option: "live", name: "SuggestLiveButton", icon: ICON_LIVE, tone: TONE_LIVE},
]

// panel layout (cm): tiles at least 1.6 cm apart so the ray cannot hit the wrong one
const PAD = 1.6, GAP = 1.3, TILE_GAP = 1.6, TITLE_GAP = 0.3, TILE_ICON = 2.6, LATER_W = 12, LATER_H = 3.8

interface PanelLayout { W: number; H: number; inner: number; titleH: number; titleBlockH: number; descH: number }

@component
export class WbwSuggestionUI extends BaseScriptComponent {
  @ui.label("WbwSuggestionUI – arrival suggestion (Learn / Practice / Use it live / Later)")
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Viewing distance the text is sized for (cm); WbwMain opens the panel about this far away")
  @widget(new SliderWidget(40, 120, 5))
  viewDistanceCm: number = 70

  @input
  @hint("Width of each mode tile (cm)")
  @widget(new SliderWidget(7, 14, 0.1))
  tileWidthCm: number = 8.9

  @input
  @hint("Height of each mode tile (cm): the icon sits above the mode name")
  @widget(new SliderWidget(5.2, 9, 0.1))
  tileHeightCm: number = 6.6
  @ui.group_end

  private root: SceneObject | null = null
  private descText: Text | null = null
  private savedCount = 0
  // bumps on every show() / hide(): events from a retired panel are ignored
  private buildGen = 0
  private _onPick = new Event<string>()
  private _onHover = new Event<string>()
  /** A tile or Later was pressed: "learn" | "practice" | "live" | "later". */
  get onPick(): PublicApi<string> { return this._onPick.publicApi() }
  /** The pointed-at option changed ("" = none). */
  get onHover(): PublicApi<string> { return this._onHover.publicApi() }

  /** Option the pointer is on: "learn" | "practice" | "live" | "later" ("" = none, and when hidden). */
  hoveredOption: string = ""
  /** Text in SuggestDescription ("" when hidden). */
  descriptionText: string = ""
  /** The value passed to show(): the option the panel recommends. */
  suggestedOption: string = ""
  get isVisible(): boolean { return this.root !== null }
  /** Size (cm) of the panel; valid before the first show(). */
  get sizeCm(): vec2 {
    const m = this.measure()
    return new vec2(m.W, m.H)
  }

  /** Show the panel. `suggested` ("learn" | "practice" | "live") gets the primary outline and is named
   *  in the description; `savedCount` decides what the Practice description says. */
  show(savedCount: number, suggested: string): void {
    this.hide()
    this.savedCount = savedCount
    this.suggestedOption = suggested
    const gen = this.buildGen
    const m = this.measure(), d = this.viewDistanceCm
    useTone(TONE_LEARN)
    const p = panel(this.sceneObject, "SuggestionPanel", m.W, m.H, {gap: GAP, padX: PAD, padY: PAD, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.root = p.root
    const titleBlock = flexBox(p.content, "SuggestTitleBlock", "column", m.inner, m.titleBlockH, {gap: TITLE_GAP, justify: FlexJustify.Center, align: FlexAlign.Center})
    text(titleBlock, "SuggestTitle", TITLE, "Headline2", d, {h: m.titleH})
    headerRule(titleBlock)

    const row = flexBox(p.content, "SuggestTiles", "row", m.inner, this.tileHeightCm, {gap: TILE_GAP, justify: FlexJustify.Center, align: FlexAlign.Center})
    const suggestedTile = this.suggestedTile()
    for (const t of TILES) {
      const b = button(row, t.name, this.tileWidthCm, this.tileHeightCm, t.tone.label, d, () => this.pick(t.option, gen),
        {icon: t.icon, iconSize: TILE_ICON, column: true, tone: t.tone, primary: t === suggestedTile})
      this.watchHover(b.btn, t.option, gen)
    }

    this.descriptionText = this.descriptionFor("")
    this.descText = text(p.content, "SuggestDescription", this.descriptionText, "Caption", d, {w: m.inner, h: m.descH, color: TEXT_SOFT})
    this.descText.horizontalOverflow = HorizontalOverflow.Shrink
    const later = button(p.content, "SuggestLaterButton", LATER_W, LATER_H, LATER, d, () => this.pick("later", gen))
    this.watchHover(later.btn, "later", gen)
  }

  hide(): void {
    this.buildGen++
    retire(this.root, this)
    this.root = null
    this.descText = null
    this.descriptionText = ""
    if (this.hoveredOption !== "") {
      this.hoveredOption = ""
      this._onHover.invoke("")
    }
  }

  /** Optional override of the description line. The view writes its own text again on the next hover change. */
  setDescription(str: string): void {
    if (!this.root) return
    this.renderDescription(str)
  }

  private pick(option: string, gen: number): void {
    if (gen !== this.buildGen || !this.root) return
    this._onPick.invoke(option)
  }

  private watchHover(btn: Button, option: string, gen: number): void {
    btn.onHoverEnter.add(() => {
      if (gen === this.buildGen) this.setHovered(option)
    })
    // moving from one tile to the next may report the new enter before the old exit
    btn.onHoverExit.add(() => {
      if (gen === this.buildGen && this.hoveredOption === option) this.setHovered("")
    })
  }

  private setHovered(option: string): void {
    if (option === this.hoveredOption) return
    this.hoveredOption = option
    this.renderDescription(this.descriptionFor(option))
    this._onHover.invoke(option)
  }

  private renderDescription(str: string): void {
    this.descriptionText = str
    if (this.descText && !isNull(this.descText)) this.descText.text = str
  }

  /** The tile the panel recommends; an unknown value falls back to Learn, the first step. */
  private suggestedTile(): SuggestTile {
    for (const t of TILES) if (t.option === this.suggestedOption) return t
    return TILES[0]
  }

  private descriptionFor(option: string): string {
    if (option === "learn") return DESC_LEARN
    if (option === "practice") return this.savedCount >= PRACTICE_NEEDS ? DESC_PRACTICE : DESC_PRACTICE_NEEDS_WORDS
    if (option === "live") return DESC_LIVE
    if (option === "later") return DESC_LATER
    return DESC_SUGGESTED + this.suggestedTile().tone.label
  }

  private measure(): PanelLayout {
    const d = this.viewDistanceCm
    const titleH = lineHeightCm("Headline2", d), descH = lineHeightCm("Caption", d)
    const tilesW = TILES.length * this.tileWidthCm + (TILES.length - 1) * TILE_GAP
    const inner = Math.max(tilesW, LATER_W, textWidthCm(TITLE.length, "Headline2", d) + 0.4)
    const titleBlockH = titleH + TITLE_GAP + HEADER_RULE_H
    return {
      W: inner + 2 * PAD,
      H: 2 * PAD + titleBlockH + this.tileHeightCm + descH + LATER_H + 3 * GAP,
      inner, titleH, titleBlockH, descH,
    }
  }
}
