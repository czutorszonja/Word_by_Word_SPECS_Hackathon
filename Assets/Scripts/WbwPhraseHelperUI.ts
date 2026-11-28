// WbwPhraseHelperUI.ts — the reusable phrase of Use it live (passive view).
// Owns: ONE compact panel in the Use it live tone (2026-11-25 readability pass: no mode chip or title;
//       28 Nov: a smaller, evenly padded card in front of the learner or in the conversation strip, the
//       hint sharing the English line's place so no empty band is left): the Hungarian phrase
//       on two fixed lines (line 1 "Kérek" + the ingredient slot, line 2 the tail "a szendvicsembe." or
//       "nélkül, kérem."), the English line (or, while the phrase is empty, the hint), Listen and the pattern pair
//       ("Kérek …" / "… nélkül"). No "Ready to order" (26 Nov): the learner orders out loud from the real
//       server; the glasses only help prepare and hear the sentence.
//       The reusable part never moves: everything is left-aligned, "Kérek" and the tail keep their place,
//       and only the slot text changes (gently emphasised in the tone's light tint).
//       Built once; setPhrase() and setEditable() update it in place,
//       so the PhraseHelper object stays the same across edits.
// Must NOT: play audio, judge whether a phrase can be heard (the controller passes canListen), place
//           itself (WbwOrderController moves the host), or know the order step.
// Stable names: PhraseHelper, PhraseHelperHu, PhraseHelperHead,
//               PhraseHelperSlot, PhraseHelperTail, PhraseHelperEn, PhraseHelperHint,
//               PhraseHelperListenButton, PatternWantButton, PatternWithoutButton.
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {PhraseBuild, PhrasePattern} from "./WbwPhraseHelperModel"
import {button, ButtonParts, flexBox, item, lineHeightCm, obj, panel, register, retire, setTextColor, setToggleLater, text, textWidthCm, useTone, TEXT_LIGHT, TEXT_SOFT, TONE_LIVE} from "./WbwSharedUI"

const ICON_PLAY = requireAsset("../Icons/volume_up.png") as Texture

const HINT = "Point at an ingredient, then Use this word"
const LISTEN = "Listen"
const WANT = "Kérek …"
const WITHOUT = "… nélkül"
const HEAD_WANT = "Kérek"

// layout (cm): the same padding on every side
const PAD_X = 1.4, PAD_Y = 1.4, GAP = 0.6, BTN_GAP = 1.3, HEAD_GAP = 0.45
const BTN_H = 3.8

@component
export class WbwPhraseHelperUI extends BaseScriptComponent {
  @ui.label("WbwPhraseHelperUI – the reusable phrase of Use it live")
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Distance the text is sized for (cm): the card sits about this far away (in front while preparing, in the conversation strip at the counter)")
  @widget(new SliderWidget(50, 200, 5))
  readDistanceCm: number = 75

  @input
  @hint("Panel width (cm). Fixed, so the frame never jumps when the phrase changes")
  @widget(new SliderWidget(24, 70, 1))
  cardWidthCm: number = 32
  @ui.group_end

  private root: SceneObject | null = null
  private builtReady: boolean | null = null
  private headT: Text | null = null
  private slotT: Text | null = null
  private tailT: Text | null = null
  private enT: Text | null = null
  private hintSo: SceneObject | null = null
  private listen: ButtonParts | null = null
  private want: ButtonParts | null = null
  private without: ButtonParts | null = null
  private canHear = false
  private stored: PhraseBuild | null = null
  private lastSize: vec2 | null = null

  private _onListen = new Event<void>()
  private _onPattern = new Event<PhrasePattern>()
  get onListen(): PublicApi<void> { return this._onListen.publicApi() }
  get onPattern(): PublicApi<PhrasePattern> { return this._onPattern.publicApi() }

  /** [LEAF] Hungarian phrase shown ("" before the first show / setPhrase). */
  plainHu: string = ""
  /** [LEAF] English line shown. */
  plainEn: string = ""
  pattern: PhrasePattern = "want"
  editable: boolean = false
  listenEnabled: boolean = false
  /** Kept for tests: always false (there is no Ready to order button any more). */
  readyShown: boolean = false
  /** +1 each time the panel object is (re)built. */
  showCount: number = 0

  get isVisible(): boolean { return this.root !== null && !isNull(this.root) && this.root.enabled }
  /** True while the compact variant is shown: the sentence only, no Listen / pattern row (the
   *  conversation strip at the counter, 28 Nov: the full card did not fit under the server's face). */
  get compact(): boolean { return this.builtReady === true }
  /** Panel size of the variant last shown (the answer variant before any show). */
  get sizeCm(): vec2 {
    if (this.lastSize) return this.lastSize
    const m = this.measure(false)
    return new vec2(m.W, m.H)
  }

  /** Build (or update in place) and show. `prep` (before the server talks) looks the same today.
   *  `compact`: the sentence only (Hungarian + English), for the conversation strip. */
  show(b: PhraseBuild, canListen: boolean, prep: boolean = false, compact: boolean = false): void {
    if (!this.root || isNull(this.root) || this.builtReady !== compact) this.build(compact)
    if (this.root) this.root.enabled = true
    this.readyShown = false
    this.setPhrase(b, canListen)
  }

  /** Update the phrase in place. Before the first show it only stores the values. */
  setPhrase(b: PhraseBuild, canListen: boolean): void {
    this.stored = b
    this.canHear = canListen
    this.plainHu = b.hu
    this.plainEn = b.en
    this.pattern = b.pattern
    if (!this.root || isNull(this.root)) return
    const want = b.pattern === "want"
    const m = this.measure(this.builtReady === true)
    if (this.headT && !isNull(this.headT)) {
      this.headT.text = want ? HEAD_WANT : ""
      this.headT.getSceneObject().enabled = want
    }
    if (this.slotT && !isNull(this.slotT)) {
      // In "without" the slot starts at the left edge (capitalised there); in "want" it follows "Kérek".
      const left = want ? m.headW + HEAD_GAP : 0
      const w = m.innerW - left
      this.slotT.text = b.empty ? "…" : b.huParts.slot.trim()
      this.slotT.layoutRect = Rect.create(-w / 2, w / 2, -m.line1H / 2, m.line1H / 2)
      this.slotT.getSceneObject().getTransform().setLocalPosition(new vec3(-m.innerW / 2 + left + w / 2, 0, 0.05))
    }
    if (this.tailT && !isNull(this.tailT)) this.tailT.text = b.huParts.right.trim()
    if (this.enT && !isNull(this.enT)) {
      this.enT.text = b.en
      this.enT.getSceneObject().enabled = !b.empty
    }
    if (this.hintSo && !isNull(this.hintSo)) this.hintSo.enabled = b.empty
    this.applyButtons()
  }

  /** false: Listen and both pattern buttons are inactive. Stored while hidden. */
  setEditable(on: boolean): void {
    this.editable = on
    this.applyButtons()
  }

  hide(): void {
    if (this.root && !isNull(this.root)) retire(this.root, this)
    this.root = null
    this.builtReady = null
    this.readyShown = false
    this.headT = this.slotT = this.tailT = this.enT = null
    this.hintSo = null
    this.listen = this.want = this.without = null
  }

  private applyButtons(): void {
    this.listenEnabled = this.editable && this.canHear
    if (this.listen && !isNull(this.listen.so)) this.listen.btn.inactive = !this.listenEnabled
    const p = this.stored ? this.stored.pattern : this.pattern
    for (const [bp, on] of [[this.want, p === "want"], [this.without, p === "without"]] as [ButtonParts | null, boolean][]) {
      if (!bp || isNull(bp.so)) continue
      bp.btn.inactive = !this.editable
      setToggleLater(bp.btn, on, this)
    }
  }

  /** Fixed size per variant: sized for the frame, never for the current phrase. */
  private measure(compact: boolean): {W: number; H: number; innerW: number; headW: number;
                                         line1H: number; line2H: number; enH: number; hintH: number; btnW: number; patW: number} {
    const d = this.readDistanceCm
    const W = this.cardWidthCm, innerW = W - 2 * PAD_X
    const line1H = lineHeightCm("Headline2", d)
    const line2H = lineHeightCm("Headline2", d)
    const enH = lineHeightCm("Body", d)
    const hintH = lineHeightCm("Body", d)
    const headW = textWidthCm(HEAD_WANT.length, "Headline2", d) + 0.2
    const btnW = Math.max(8, textWidthCm(LISTEN.length, "Button", d, false) + 4.2)
    const patW = Math.max(7.5, textWidthCm(WANT.length, "Button", d, false) + 1.6)
    // the hint takes the English line's place while the phrase is empty: one row for both
    const H = 2 * PAD_Y + line1H + line2H + GAP + Math.max(enH, hintH) + (compact ? 0 : GAP + BTN_H)
    return {W, H, innerW, headW, line1H, line2H, enH, hintH, btnW, patW}
  }

  private build(compact: boolean): void {
    if (this.root && !isNull(this.root)) retire(this.root, this)
    const m = this.measure(compact), d = this.readDistanceCm
    useTone(TONE_LIVE)
    const p = panel(this.sceneObject, "PhraseHelper", m.W, m.H, {padX: PAD_X, padY: PAD_Y, gap: GAP, justify: FlexJustify.Start, align: FlexAlign.Start})
    this.root = p.root
    this.builtReady = compact
    this.showCount++

    // the phrase: line 1 "Kérek" + slot (placed by hand so the slot can start at the left edge),
    // line 2 the tail on its own, so neither "Kérek" nor the tail ever moves
    const hu = obj(p.content, "PhraseHelperHu", new vec3(0, 0, 0.02))
    register(p.content, item(hu, m.innerW, m.line1H + m.line2H))
    const line1 = obj(hu, "Line1", new vec3(0, m.line2H / 2, 0))
    const headT = text(line1, "PhraseHelperHead", HEAD_WANT, "Headline2", d, {w: m.headW, h: m.line1H, align: "left", color: TEXT_LIGHT})
    headT.getSceneObject().getTransform().setLocalPosition(new vec3(-m.innerW / 2 + m.headW / 2, 0, 0.05))
    const slotT = text(line1, "PhraseHelperSlot", "…", "Headline2", d, {w: m.innerW, h: m.line1H, align: "left", color: TONE_LIVE.tint})
    slotT.horizontalOverflow = HorizontalOverflow.Shrink
    const tailT = text(hu, "PhraseHelperTail", "", "Headline2", d, {w: m.innerW, h: m.line2H, align: "left", color: TEXT_LIGHT})
    tailT.getSceneObject().getTransform().setLocalPosition(new vec3(0, -m.line1H / 2, 0.05))
    this.headT = headT
    this.slotT = slotT
    this.tailT = tailT

    // the English line and the hint share one row (only one shows), so no empty band is left
    const lineH = Math.max(m.enH, m.hintH)
    const lines = obj(p.content, "PhraseHelperLines", new vec3(0, 0, 0.02))
    register(p.content, item(lines, m.innerW, lineH))
    const enT = text(lines, "PhraseHelperEn", "", "Body", d, {w: m.innerW, h: lineH, align: "left", color: TEXT_SOFT})
    enT.horizontalOverflow = HorizontalOverflow.Shrink
    enT.getSceneObject().getTransform().setLocalPosition(new vec3(0, 0, 0.05))
    this.enT = enT
    const hintT = text(lines, "PhraseHelperHint", HINT, "Body", d, {w: m.innerW, h: lineH, align: "left", color: TEXT_SOFT})
    hintT.horizontalOverflow = HorizontalOverflow.Shrink
    hintT.getSceneObject().getTransform().setLocalPosition(new vec3(0, 0, 0.05))
    this.hintSo = hintT.getSceneObject()

    // buttons: Listen, then the pattern pair (a toggle pair; the controller decides, the view snaps back).
    // The compact variant (in the conversation) has none: the sentence was prepared, now it is said.
    this.listen = this.want = this.without = null
    if (!compact) {
      const row = flexBox(p.content, "Buttons", "row", m.innerW, BTN_H, {gap: BTN_GAP, justify: FlexJustify.Start, align: FlexAlign.Center})
      this.listen = button(row, "PhraseHelperListenButton", m.btnW, BTN_H, LISTEN, d, () => this._onListen.invoke(), {icon: ICON_PLAY})
      this.want = button(row, "PatternWantButton", m.patW, BTN_H, WANT, d, () => this.pickPattern("want"), {toggle: true})
      this.without = button(row, "PatternWithoutButton", m.patW, BTN_H, WITHOUT, d, () => this.pickPattern("without"), {toggle: true})
    }

    this.lastSize = new vec2(m.W, m.H)
    // re-apply the stored phrase onto the new objects
    if (this.stored) this.setPhrase(this.stored, this.canHear)
    else this.applyButtons()
    if (slotT && !isNull(slotT)) setTextColor(slotT, TONE_LIVE.tint)
  }

  private pickPattern(p: PhrasePattern): void {
    this._onPattern.invoke(p)
    // a refused change snaps back to the pattern the controller kept
    this.applyButtons()
  }
}
