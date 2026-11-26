// WbwWordListUI.ts — the saved-words viewer (passive view), opened from the menu's "Words saved".
// Owns: one panel in the Learn tone that shows ONE step at a time (learner, 26 Nov: "everything is all
//       in one page, and it is very overwhelming"):
//         home        "Saved words": how to look at them — By category · By date added · A to Z
//         categories  the categories that have words, A–Z (Café, Park, Street), each with its count
//         periods     Most recent · Last 7 days · Last 30 days · All, each with its count
//         words       up to six word tiles (picture, Hungarian in bold, meaning; "when" only by date),
//                     for date added also Newest first / Oldest first, and a pager only when needed
//       Back steps one level up; close closes. Tapping a tile asks to hear the word (onPlay).
// Must NOT: play audio itself, own the saved words (WbwMain passes them in), or place itself.
// Stable names: WordList, WordsTitle, WordsCloseButton, WordsBackButton,
//               WordsViewCategory, WordsViewDate, WordsViewAlpha,
//               WordsCategory_<category>, WordsPeriod_<recent|week|month|all>,
//               WordsNewestFirst, WordsOldestFirst, WordTile_<id>, WordsPrevButton, WordsNextButton, WordsPage.
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {button, flexBox, image, lineHeightCm, panel, retire, text, TEXT_SOFT, useTone, TONE_LEARN} from "./WbwSharedUI"

const ICON_CLOSE = requireAsset("../Icons/close.png") as Texture
const ICON_NEXT = requireAsset("../Icons/arrow_forward.png") as Texture
/** Shown on every word tile: tapping the tile plays the word (learner feedback 2026-11-21: make listening obvious). */
const ICON_LISTEN = requireAsset("../Icons/volume_up.png") as Texture
const LISTEN = 2.4

/** How the words are reached: by category, by date added, or straight A–Z. */
export type WordView = "category" | "date" | "alpha"
/** Kept for callers of the old viewer. */
export type WordSort = WordView
export type WordScreen = "home" | "categories" | "periods" | "words"
export type WordPeriod = "recent" | "week" | "month" | "all"
export type DateOrder = "newest" | "oldest"

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
function wordsText(n: number): string {
  return `${n} word${n === 1 ? "" : "s"}`
}

const PERIODS: [WordPeriod, string][] = [["recent", "Most recent"], ["week", "Last 7 days"], ["month", "Last 30 days"], ["all", "All"]]
const VIEWS: [WordView, string, string][] = [["category", "WordsViewCategory", "By category"], ["date", "WordsViewDate", "By date added"], ["alpha", "WordsViewAlpha", "A to Z"]]

const PER_PAGE = 6
// layout (cm)
const PAD = 1.4, GAP = 1.3, CLOSE = 3.8, CHOICE_H = 5.6, ORDER_H = 3.8, TILE_H = 5.6, PAGER_H = 3.8, PIC = 3.6, ARROW = 2.2

@component
export class WbwWordListUI extends BaseScriptComponent {
  @ui.label("WbwWordListUI – saved words, one step at a time (category / date added / A–Z)")
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
  private list: WordListEntry[] = []
  private hoverCount = 0
  private _onPlay = new Event<WordListEntry>()
  private _onClose = new Event<void>()
  /** A tile was tapped: play this word. */
  get onPlay(): PublicApi<WordListEntry> { return this._onPlay.publicApi() }
  get onClose(): PublicApi<void> { return this._onClose.publicApi() }

  // ── readable state (LEAF) ──
  /** The step shown. */
  screen: WordScreen = "home"
  /** How the words were reached ("" on the home screen). */
  view: WordView | "" = ""
  /** Category of the word list (view "category"), else "". */
  category: string = ""
  /** Time range of the word list (view "date"), else "". */
  period: WordPeriod | "" = ""
  /** Order of the date-added list. */
  dateOrder: DateOrder = "newest"
  page: number = 0
  /** Title shown at the top. */
  title: string = ""
  get pageCount(): number { return Math.max(1, Math.ceil(this.list.length / PER_PAGE)) }
  /** Word ids on the page shown, in order. */
  shownIds: string[] = []
  /** All saved words. */
  get entryCount(): number { return this.entries.length }
  /** Words in the list shown (screen "words"). */
  get listCount(): number { return this.list.length }
  get isVisible(): boolean { return this.root !== null && !isNull(this.root) }
  /** True while the pointer is on one of the viewer's buttons (the follow pauses then). */
  get hovered(): boolean { return this.hoverCount > 0 }

  /** Open on the first step: how to look at the saved words. */
  show(entries: WordListEntry[]): void {
    this.entries = entries.slice()
    this.goHome()
  }

  hide(): void {
    if (this.root) retire(this.root, this)
    this.root = null
    this.hoverCount = 0
    this.shownIds = []
  }

  goHome(): void {
    this.screen = "home"
    this.view = ""
    this.category = ""
    this.period = ""
    this.list = []
    this.build()
  }

  /** Home → one of the three ways in. A to Z goes straight to the words. */
  chooseView(v: WordView): void {
    this.view = v
    this.category = ""
    this.period = ""
    if (v === "category") {
      this.screen = "categories"
      this.list = []
      this.build()
    } else if (v === "date") {
      this.screen = "periods"
      this.list = []
      this.build()
    } else {
      this.openList(this.entries.slice().sort((a, b) => huCompare(a.hu, b.hu)))
    }
  }

  /** Categories → the words of one category, A–Z. */
  openCategory(cat: string): void {
    this.view = "category"
    this.category = cat
    this.openList(this.entries.filter((e) => e.category === cat).sort((a, b) => huCompare(a.hu, b.hu)))
  }

  /** Periods → the words saved in that time range, newest first unless changed. */
  openPeriod(p: WordPeriod): void {
    this.view = "date"
    this.period = p
    this.openList(this.sortByDate(this.inPeriod(p)))
  }

  setDateOrder(o: DateOrder): void {
    this.dateOrder = o
    if (this.screen === "words" && this.view === "date" && this.period) this.openList(this.sortByDate(this.inPeriod(this.period)))
  }

  /** One step up: words → categories / periods / home; categories or periods → home. */
  back(): void {
    if (this.screen === "words" && this.view === "category") this.chooseView("category")
    else if (this.screen === "words" && this.view === "date") this.chooseView("date")
    else this.goHome()
  }

  setPage(p: number): void {
    this.page = Math.max(0, Math.min(this.pageCount - 1, p))
    this.build()
  }

  /** Categories that have words, in alphabetical order. */
  categories(): string[] {
    const cats: string[] = []
    for (const e of this.entries) if (cats.indexOf(e.category) < 0) cats.push(e.category)
    return cats.sort(huCompare)
  }

  /** Words saved in a time range ("recent" = the latest day anything was saved). */
  inPeriod(p: WordPeriod): WordListEntry[] {
    if (p === "all") return this.entries.slice()
    if (p === "recent") {
      let latest = 1e9
      for (const e of this.entries) latest = Math.min(latest, e.daysAgo)
      return this.entries.filter((e) => e.daysAgo === latest)
    }
    const max = p === "week" ? 6 : 29
    return this.entries.filter((e) => e.daysAgo <= max)
  }

  private sortByDate(es: WordListEntry[]): WordListEntry[] {
    return this.dateOrder === "newest"
      ? es.sort((a, b) => a.daysAgo - b.daysAgo || b.order - a.order)
      : es.sort((a, b) => b.daysAgo - a.daysAgo || a.order - b.order)
  }

  private openList(es: WordListEntry[]): void {
    this.screen = "words"
    this.list = es
    this.page = 0
    this.build()
  }

  // ── building ──
  private build(): void {
    if (this.root) retire(this.root, this)
    this.root = null
    this.hoverCount = 0
    this.shownIds = []
    if (this.screen === "home") this.buildHome()
    else if (this.screen === "categories") this.buildCategories()
    else if (this.screen === "periods") this.buildPeriods()
    else this.buildWords()
  }

  /** The panel and its header (Back when not home, title, close); returns the content and inner width. */
  private frame(title: string, bodyH: number, rows: number): {content: SceneObject; inner: number} {
    const d = this.viewDistanceCm
    const W = this.widthCm, inner = W - 2 * PAD
    const titleH = Math.max(CLOSE, lineHeightCm("Headline2", d))
    const H = 2 * PAD + titleH + bodyH + rows * GAP
    this.title = title
    useTone(TONE_LEARN)
    const p = panel(this.sceneObject, "WordList", W, H, {gap: GAP, padX: PAD, padY: PAD, justify: FlexJustify.Start, align: FlexAlign.Center})
    this.root = p.root
    const head = flexBox(p.content, "Header", "row", inner, titleH, {gap: 1, justify: FlexJustify.SpaceBetween, align: FlexAlign.Center})
    const home = this.screen === "home"
    if (!home) {
      const b = button(head, "WordsBackButton", CLOSE, CLOSE, "", d, () => this.back(), {icon: ICON_NEXT, iconSize: 1.9})
      if (b.icon) b.icon.getSceneObject().getTransform().setLocalRotation(quat.fromEulerAngles(0, 0, Math.PI))
      this.track(b.btn)
    }
    const titleW = inner - CLOSE - 1 - (home ? 0 : CLOSE + 1)
    text(head, "WordsTitle", title, "Headline2", d, {w: titleW, h: titleH, align: "left"})
    this.track(button(head, "WordsCloseButton", CLOSE, CLOSE, "", d, () => this._onClose.invoke(), {icon: ICON_CLOSE, iconSize: 1.9}).btn)
    return {content: p.content, inner}
  }

  /** A full-width choice: a label, one soft line under it, and an arrow. Inactive when `off`. */
  private choice(parent: SceneObject, name: string, w: number, label: string, sub: string, onClick: () => void, off: boolean = false): void {
    const d = this.viewDistanceCm
    const b = button(parent, name, w, CHOICE_H, "", d, onClick)
    b.btn.inactive = off
    this.track(b.btn)
    const tw = w - ARROW - 3
    const col = flexBox(b.face, "Words", "column", tw, CHOICE_H - 0.8, {gap: 0, justify: FlexJustify.Center, align: FlexAlign.Start})
    const lab = text(col, "Label", label, "Subheadline", d, {w: tw, h: lineHeightCm("Subheadline", d, false), align: "left", onPanel: false})
    lab.horizontalOverflow = HorizontalOverflow.Shrink
    if (sub) {
      const s = text(col, "Sub", sub, "Body", d, {w: tw, h: lineHeightCm("Body", d, false), align: "left", color: TEXT_SOFT, onPanel: false})
      s.horizontalOverflow = HorizontalOverflow.Shrink
    }
    image(b.face, "Arrow", ICON_NEXT, ARROW, ARROW, TEXT_SOFT)
  }

  private buildHome(): void {
    const f = this.frame("Saved words", 3 * CHOICE_H, 3)
    const cats = this.categories()
    const subs: {[v: string]: string} = {
      category: cats.join(", "),
      date: "Most recent, last week, last month",
      alpha: `All ${wordsText(this.entries.length)}`,
    }
    for (const [v, name, label] of VIEWS) this.choice(f.content, name, f.inner, label, subs[v], () => this.chooseView(v), this.entries.length === 0)
  }

  private buildCategories(): void {
    const cats = this.categories()
    const f = this.frame("By category", Math.max(1, cats.length) * CHOICE_H, Math.max(1, cats.length))
    for (const c of cats) {
      const n = this.entries.filter((e) => e.category === c).length
      this.choice(f.content, `WordsCategory_${c}`, f.inner, c, wordsText(n), () => this.openCategory(c))
    }
  }

  private buildPeriods(): void {
    const f = this.frame("By date added", PERIODS.length * CHOICE_H, PERIODS.length)
    for (const [p, label] of PERIODS) {
      const es = this.inPeriod(p)
      const sub = p === "recent" && es.length > 0 ? `${whenText(es[0].daysAgo)}, ${wordsText(es.length)}` : wordsText(es.length)
      this.choice(f.content, `WordsPeriod_${p}`, f.inner, label, sub, () => this.openPeriod(p), es.length === 0)
    }
  }

  private buildWords(): void {
    const d = this.viewDistanceCm
    const dated = this.view === "date"
    const start = this.page * PER_PAGE
    const pageEntries = this.list.slice(start, start + PER_PAGE)
    const rows = Math.max(1, Math.ceil(pageEntries.length / 2))
    const paged = this.pageCount > 1
    const gridH = rows * TILE_H + (rows - 1) * GAP
    const bodyH = gridH + (dated ? ORDER_H : 0) + (paged ? PAGER_H : 0)
    const nRows = 1 + (dated ? 1 : 0) + (paged ? 1 : 0)
    const title = this.view === "category" ? this.category : this.view === "date" ? (PERIODS.filter((p) => p[0] === this.period)[0] || ["", "By date added"])[1] : "A to Z"
    const f = this.frame(title, bodyH, nRows)

    if (dated) {
      // the one customisation of the date list: which end comes first
      const row = flexBox(f.content, "Order", "row", f.inner, ORDER_H, {gap: GAP, justify: FlexJustify.Center, align: FlexAlign.Center})
      const w = (f.inner - GAP) / 2
      for (const [o, name, label] of [["newest", "WordsNewestFirst", "Newest first"], ["oldest", "WordsOldestFirst", "Oldest first"]] as [DateOrder, string, string][]) {
        const b = button(row, name, w, ORDER_H, label, d, () => this.setDateOrder(o), {toggle: true})
        b.btn.isOn = o === this.dateOrder
        this.track(b.btn)
      }
    }

    // up to six tiles: two columns
    const grid = flexBox(f.content, "Grid", "column", f.inner, gridH, {gap: GAP, justify: FlexJustify.Start, align: FlexAlign.Center})
    this.shownIds = pageEntries.map((e) => e.id)
    const tileW = (f.inner - GAP) / 2
    for (let r = 0; r < rows; r++) {
      const row = flexBox(grid, `Row${r}`, "row", f.inner, TILE_H, {gap: GAP, justify: FlexJustify.Start, align: FlexAlign.Center})
      for (let c = 0; c < 2; c++) {
        const e = pageEntries[r * 2 + c]
        if (e) this.tile(row, e, tileW)
      }
    }

    if (paged) {
      const pager = flexBox(f.content, "Pager", "row", f.inner, PAGER_H, {gap: GAP, justify: FlexJustify.Center, align: FlexAlign.Center})
      const prev = button(pager, "WordsPrevButton", 9, PAGER_H, "Previous", d, () => this.setPage(this.page - 1))
      prev.btn.inactive = this.page <= 0
      this.track(prev.btn)
      text(pager, "WordsPage", `${this.page + 1} / ${this.pageCount}`, "Body", d, {w: 7, h: PAGER_H, color: TEXT_SOFT})
      const next = button(pager, "WordsNextButton", 9, PAGER_H, "Next", d, () => this.setPage(this.page + 1), {icon: ICON_NEXT})
      next.btn.inactive = this.page >= this.pageCount - 1
      this.track(next.btn)
    }
  }

  /** One word: picture, Hungarian (bold), meaning, and — by date only — when it was saved. Tapping plays it. */
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
    if (this.view === "date") {
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
