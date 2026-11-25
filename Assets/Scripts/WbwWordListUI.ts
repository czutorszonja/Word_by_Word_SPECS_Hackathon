// WbwWordListUI.ts — the saved-words viewer (passive view), opened from the menu's "Words saved".
// Owns: one panel in the Learn tone: a header with close, three sort buttons (Category · Date added ·
//       A–Z), an index row (category buttons, or the letters that have words, to jump straight there),
//       six word tiles per page (picture, Hungarian word in bold, meaning; when it was saved only while sorted
//       by date — 2026-11-25 readability pass: two lines per tile, not three) and a pager.
//       Tapping a tile asks to hear the word (onPlay). Rebuilt in place when the sort or page changes.
// Must NOT: play audio itself, own the saved words (WbwMain passes them in), or place itself.
// Stable names: WordList, WordsCloseButton, WordsSortCategory, WordsSortDate, WordsSortAlpha,
//               WordsJump_<category>, WordsLetter_<letter>, WordTile_<id>, WordsPrevButton,
//               WordsNextButton, WordsPage.
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {button, flexBox, image, lineHeightCm, panel, retire, text, TEXT_SOFT, useTone, TONE_LEARN} from "./WbwSharedUI"

const ICON_CLOSE = requireAsset("../Icons/close.png") as Texture
const ICON_NEXT = requireAsset("../Icons/arrow_forward.png") as Texture
/** Shown on every word tile: tapping the tile plays the word (learner feedback 2026-11-21: make listening obvious). */
const ICON_LISTEN = requireAsset("../Icons/volume_up.png") as Texture
const LISTEN = 2.4

export type WordSort = "category" | "date" | "alpha"

/** One saved word as the viewer shows it. */
export interface WordListEntry {
  id: string
  hu: string
  en: string
  audio: string
  picture: Texture | null
  category: string
  /** 0 = saved today; larger = longer ago. */
  daysAgo: number
  /** Order within the same day (larger = saved later). */
  order: number
}

/** Hungarian alphabet order, so "ö" sorts after "o" and "sz" words sit under S. */
const HU_ORDER = "aábcdeéfghiíjklmnoóöőpqrstuúüűvwxyz"
function letterRank(ch: string): number {
  const i = HU_ORDER.indexOf(ch.toLowerCase())
  return i < 0 ? 100 + ch.charCodeAt(0) : i
}
export function huCompare(a: string, b: string): number {
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    const d = letterRank(a[i]) - letterRank(b[i])
    if (d !== 0) return d
  }
  return a.length - b.length
}
export function initialOf(hu: string): string {
  return hu.length > 0 ? hu[0].toUpperCase() : "?"
}
function whenText(daysAgo: number): string {
  return daysAgo <= 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`
}

const PER_PAGE = 6
// layout (cm)
const PAD = 1.4, GAP = 0.9, CLOSE = 3.4, SORT_H = 3.8, INDEX_H = 3.4, TILE_H = 5.6, PAGER_H = 3.8, PIC = 3.6

@component
export class WbwWordListUI extends BaseScriptComponent {
  @ui.label("WbwWordListUI – saved words (by category, date added or A–Z)")
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Viewing distance the text is sized for (cm)")
  @widget(new SliderWidget(40, 100, 5))
  viewDistanceCm: number = 72   // sized for where WbwMain places it (WORDS_DIST)

  @input
  @hint("Panel width (cm)")
  @widget(new SliderWidget(30, 50, 1))
  widthCm: number = 38          // fits the Specs view at that distance (42 cm was cut off at the sides)
  @ui.group_end

  private root: SceneObject | null = null
  private entries: WordListEntry[] = []
  private hoverCount = 0
  private _onPlay = new Event<WordListEntry>()
  private _onClose = new Event<void>()
  /** A tile was tapped: play this word. */
  get onPlay(): PublicApi<WordListEntry> { return this._onPlay.publicApi() }
  get onClose(): PublicApi<void> { return this._onClose.publicApi() }

  // ── readable state (LEAF) ──
  sort: WordSort = "category"
  page: number = 0
  get pageCount(): number { return Math.max(1, Math.ceil(this.entries.length / PER_PAGE)) }
  /** Word ids on the page shown, in order. */
  shownIds: string[] = []
  get entryCount(): number { return this.entries.length }
  get isVisible(): boolean { return this.root !== null && !isNull(this.root) }
  /** True while the pointer is on one of the viewer's buttons (the follow pauses then). */
  get hovered(): boolean { return this.hoverCount > 0 }

  show(entries: WordListEntry[], sort: WordSort = "category"): void {
    this.entries = entries.slice()
    this.sort = sort
    this.page = 0
    this.sortEntries()
    this.build()
  }

  hide(): void {
    if (this.root) retire(this.root, this)
    this.root = null
    this.hoverCount = 0
    this.shownIds = []
  }

  setSort(s: WordSort): void {
    this.sort = s
    this.page = 0
    this.sortEntries()
    this.build()
  }

  setPage(p: number): void {
    this.page = Math.max(0, Math.min(this.pageCount - 1, p))
    this.build()
  }

  /** Jump to the page holding the first word of a category ("category" sort) or letter ("alpha" sort). */
  jumpTo(key: string): void {
    const i = this.entries.findIndex((e) => (this.sort === "category" ? e.category === key : initialOf(e.hu) === key))
    if (i >= 0) this.setPage(Math.floor(i / PER_PAGE))
  }

  /** Index keys for the current sort: categories in order, or the initials that have words. */
  indexKeys(): string[] {
    const keys: string[] = []
    for (const e of this.entries) {
      const k = this.sort === "category" ? e.category : this.sort === "alpha" ? initialOf(e.hu) : ""
      if (k && keys.indexOf(k) < 0) keys.push(k)
    }
    return keys
  }

  private sortEntries(): void {
    const cats: string[] = []
    for (const e of this.entries) if (cats.indexOf(e.category) < 0) cats.push(e.category)
    const byAlpha = (a: WordListEntry, b: WordListEntry) => huCompare(a.hu, b.hu)
    if (this.sort === "alpha") this.entries.sort(byAlpha)
    else if (this.sort === "date") this.entries.sort((a, b) => a.daysAgo - b.daysAgo || b.order - a.order)
    else this.entries.sort((a, b) => cats.indexOf(a.category) - cats.indexOf(b.category) || byAlpha(a, b))
  }

  private build(): void {
    if (this.root) retire(this.root, this)
    this.root = null
    this.hoverCount = 0
    const d = this.viewDistanceCm
    const W = this.widthCm, inner = W - 2 * PAD
    const titleH = Math.max(CLOSE, lineHeightCm("Headline2", d))
    const H = 2 * PAD + titleH + SORT_H + INDEX_H + 3 * TILE_H + PAGER_H + 7 * GAP
    useTone(TONE_LEARN)
    const p = panel(this.sceneObject, "WordList", W, H, {gap: GAP, padX: PAD, padY: PAD, justify: FlexJustify.Start, align: FlexAlign.Center})
    this.root = p.root

    // header: the mode chip names where the words come from, then the title and close
    const head = flexBox(p.content, "Header", "row", inner, titleH, {gap: 1, justify: FlexJustify.SpaceBetween, align: FlexAlign.Center})
    text(head, "Title", "Saved words", "Headline2", d, {w: inner - CLOSE - 1, h: titleH, align: "left"})
    this.track(button(head, "WordsCloseButton", CLOSE, CLOSE, "", d, () => this._onClose.invoke(), {icon: ICON_CLOSE, iconSize: 1.9}).btn)

    // sort: three choices, the active one selected
    const sortRow = flexBox(p.content, "Sort", "row", inner, SORT_H, {gap: 1, justify: FlexJustify.Center, align: FlexAlign.Center})
    const sortW = (inner - 2) / 3
    const sorts: [WordSort, string, string][] = [["category", "WordsSortCategory", "Category"], ["date", "WordsSortDate", "Date added"], ["alpha", "WordsSortAlpha", "A–Z"]]
    for (const [s, name, label] of sorts) {
      const b = button(sortRow, name, sortW, SORT_H, label, d, () => this.setSort(s), {toggle: true})
      b.btn.isOn = s === this.sort
      this.track(b.btn)
    }

    // index: jump to a category or a letter; for date added, a short line instead
    const idx = flexBox(p.content, "Index", "row", inner, INDEX_H, {gap: 0.5, justify: FlexJustify.Center, align: FlexAlign.Center})
    const keys = this.indexKeys()
    if (this.sort === "date" || keys.length === 0) {
      text(idx, "IndexNote", this.sort === "date" ? "Newest first" : "", "Caption", d, {w: inner, h: INDEX_H, color: TEXT_SOFT})
    } else if (this.sort === "category") {
      const w = Math.min(12, (inner - 0.5 * (keys.length - 1)) / keys.length)
      for (const k of keys) this.track(button(idx, `WordsJump_${k}`, w, INDEX_H, k, d, () => this.jumpTo(k)).btn)
    } else {
      const w = Math.min(3.2, (inner - 0.5 * (keys.length - 1)) / keys.length)
      for (const k of keys) this.track(button(idx, `WordsLetter_${k}`, w, INDEX_H, k, d, () => this.jumpTo(k), {role: "Caption"}).btn)
    }

    // six tiles: two columns, three rows
    const grid = flexBox(p.content, "Grid", "column", inner, 3 * TILE_H + 2 * GAP, {gap: GAP, justify: FlexJustify.Start, align: FlexAlign.Center})
    const start = this.page * PER_PAGE
    const pageEntries = this.entries.slice(start, start + PER_PAGE)
    this.shownIds = pageEntries.map((e) => e.id)
    const tileW = (inner - GAP) / 2
    for (let r = 0; r < 3; r++) {
      const row = flexBox(grid, `Row${r}`, "row", inner, TILE_H, {gap: GAP, justify: FlexJustify.Start, align: FlexAlign.Center})
      for (let c = 0; c < 2; c++) {
        const e = pageEntries[r * 2 + c]
        if (e) this.tile(row, e, tileW)
      }
    }

    // pager
    const pager = flexBox(p.content, "Pager", "row", inner, PAGER_H, {gap: 1.2, justify: FlexJustify.Center, align: FlexAlign.Center})
    const prev = button(pager, "WordsPrevButton", 7, PAGER_H, "Back", d, () => this.setPage(this.page - 1))
    prev.btn.inactive = this.page <= 0
    this.track(prev.btn)
    text(pager, "WordsPage", `Page ${this.page + 1} / ${this.pageCount}`, "Caption", d, {w: 10, h: PAGER_H, color: TEXT_SOFT})
    const next = button(pager, "WordsNextButton", 7, PAGER_H, "Next", d, () => this.setPage(this.page + 1), {icon: ICON_NEXT})
    next.btn.inactive = this.page >= this.pageCount - 1
    this.track(next.btn)
  }

  /** One word: picture, Hungarian (bold), meaning, and — sorted by date only — when it was saved. Tapping plays it. */
  private tile(row: SceneObject, e: WordListEntry, w: number): void {
    const d = this.viewDistanceCm
    const b = button(row, `WordTile_${e.id}`, w, TILE_H, "", d, () => this._onPlay.invoke(e))
    this.track(b.btn)
    const face = b.face
    if (e.picture) image(face, "Picture", e.picture, PIC)
    const tw = w - PIC - LISTEN - 2.6
    const col = flexBox(face, "Words", "column", tw, TILE_H - 0.8, {gap: 0, justify: FlexJustify.Center, align: FlexAlign.Start})
    const huH = lineHeightCm("Subheadline", d, false), enH = lineHeightCm("Body", d, false), capH = lineHeightCm("Caption", d, false)
    const hu = text(col, "Hu", e.hu, "Subheadline", d, {w: tw, h: huH, align: "left", onPanel: false})
    hu.horizontalOverflow = HorizontalOverflow.Shrink
    const en = text(col, "En", e.en, "Body", d, {w: tw, h: enH, align: "left", color: TEXT_SOFT, onPanel: false})
    en.horizontalOverflow = HorizontalOverflow.Shrink
    if (this.sort === "date") {
      const tag = text(col, "Tag", whenText(e.daysAgo), "Caption", d, {w: tw, h: capH * 0.85, align: "left", color: TEXT_SOFT, onPanel: false})
      tag.size = tag.size * 0.85
      tag.horizontalOverflow = HorizontalOverflow.Shrink
    }
    image(face, "Listen", ICON_LISTEN, LISTEN, LISTEN, TEXT_SOFT)
  }

  /** Count hovers on our buttons, so the panel stays still while the pointer is on it. */
  private track(btn: Button): void {
    btn.onHoverEnter.add(() => { this.hoverCount++ })
    btn.onHoverExit.add(() => { this.hoverCount = Math.max(0, this.hoverCount - 1) })
  }
}
