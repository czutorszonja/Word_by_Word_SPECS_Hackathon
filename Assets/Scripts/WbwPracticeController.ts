// WbwPracticeController.ts — Practice mode: match 4 saved Hungarian words with their English.
// Owns: set selection from saved words (today's café words first, then words saved on earlier
//       outings, so a set can always be made), shuffling, selection, match judging, progress,
//       completion, and placing the board upright just above the user's table when that table is in
//       front of them, else in front of the user (26 Nov: it opened over a table behind the learner,
//       so "nothing opened").
// Expects: init(session, audio, cafe, order) from WbwMain; @input board.
// Must NOT: own saved words (WbwSession) or build UI.
import {WbwPracticeBoardUI, PracticeLeft, PracticePick, PracticeRight} from "./WbwPracticeBoardUI"
import {WbwAudioController} from "./WbwAudioController"
import {WbwCafeBuilder} from "./WbwCafeBuilder"
import {WbwOrderController} from "./WbwOrderController"
import {WbwSession} from "./WbwSession"
import {EARLIER_WORDS, earlierWordById, learnableWord, wordById} from "./WbwVocab"
import {PICTURES} from "./WbwIllustrations"
import {WORD_ICONS} from "./WbwWordIcons"
import {camLookFlat, camPos, flat, horizDist, inView, placeFacingUser} from "./WbwSpatial"
import {TABLES} from "./WbwVocab"

@component
export class WbwPracticeController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwPracticeController – matching game with saved words</span>')
  @ui.separator
  @ui.group_start("References")
  @input @hint("Practice board UI module") board!: WbwPracticeBoardUI
  @ui.group_end
  @ui.group_start("Settings")
  @input
  @hint("Pairs per set (brief: 4)")
  @widget(new SliderWidget(2, 6, 1))
  pairsPerSet: number = 4

  @input
  @hint("Height of the board centre above the table top (cm)")
  @widget(new SliderWidget(10, 60, 1))
  boardAboveTableCm: number = 30

  @input
  @hint("If the user is farther than this from their table (cm), the board opens in front of them instead")
  @widget(new SliderWidget(100, 600, 10))
  nearTableCm: number = 250

  @input
  @hint("The board goes over the table only while the table is within this angle of where the user looks (deg); else in front of them")
  @widget(new SliderWidget(15, 90, 1))
  tableInViewDeg: number = 40

  @input
  @hint("Distance of the board from the user (cm), at the table and when it opens in front of them")
  @widget(new SliderWidget(40, 90, 1))
  boardDistanceCm: number = 65
  @ui.group_end

  // ── readable state for tests ──
  active: boolean = false
  /** Pairs matched in the current set. */
  pairsMatched: number = 0
  /** Pairs in the current set (0 when no set). */
  pairsTotal: number = 0
  /** Word ids in the left (Hungarian) column, top to bottom. */
  leftIds: string[] = []
  /** Word ids in the right (English) column, top to bottom (shuffled). */
  rightIds: string[] = []
  /** Word ids already matched. */
  matchedIds: string[] = []
  /** Currently selected card, e.g. "hu:sonka" ("" if none). */
  selected: string = ""
  /** True when the current set is complete. */
  complete: boolean = false
  /** Wrong attempts in the current set. */
  wrongAttempts: number = 0
  /** Where the board was placed: "table" or "front". */
  placedAt: string = ""
  /** Table the board was placed above (0 if in front of the user). */
  boardTable: number = 0

  private session!: WbwSession
  private audio!: WbwAudioController
  private cafe!: WbwCafeBuilder
  private order!: WbwOrderController
  private lastSet: string[] = []
  private _onCloseRequested: (() => void) | null = null

  init(session: WbwSession, audio: WbwAudioController, cafe: WbwCafeBuilder, order: WbwOrderController, onClose: () => void): void {
    this.session = session
    this.audio = audio
    this.cafe = cafe
    this.order = order
    this._onCloseRequested = onClose
    this.board.onCardPick.add((p) => this.onPick(p))
    this.board.onNewSet.add(() => this.newSet())
    this.board.onClose.add(() => { if (this._onCloseRequested) this._onCloseRequested() })
  }

  setActive(on: boolean): void {
    this.active = on
    if (on) {
      this.place()
      this.newSet()
    } else {
      this.board.hide()
      this.pairsTotal = 0
      this.selected = ""
    }
  }

  /** Start a fresh set from saved words (or show the "save more words" state). */
  newSet(): void {
    this.pairsMatched = 0
    this.matchedIds = []
    this.selected = ""
    this.complete = false
    this.wrongAttempts = 0
    // today's café words first; words saved on earlier outings (street, park) fill up the set
    const today = this.session.saved.filter((id) => !!wordById(id))
    const earlier = EARLIER_WORDS.map((e) => e.id).filter((id) => today.indexOf(id) < 0)
    const saved = today.concat(earlier)
    if (saved.length < this.pairsPerSet) {
      this.pairsTotal = 0
      this.leftIds = []
      this.rightIds = []
      this.board.showNeedWords(saved.length, this.pairsPerSet)
      return
    }
    // prefer today's words, then words not used in the previous set
    const fresh = (ids: string[]) => this.shuffle(ids.filter((w) => this.lastSet.indexOf(w) < 0))
    const old = (ids: string[]) => this.shuffle(ids.filter((w) => this.lastSet.indexOf(w) >= 0))
    const pick = fresh(today).concat(fresh(earlier), old(today), old(earlier)).slice(0, this.pairsPerSet)
    this.lastSet = pick
    this.leftIds = this.shuffle(pick)
    this.rightIds = this.shuffle(pick)
    // never show the columns in the same order
    if (this.rightIds.join() === this.leftIds.join()) this.rightIds.push(this.rightIds.shift()!)
    this.pairsTotal = pick.length
    const left: PracticeLeft[] = this.leftIds.map((id) => ({id: id, hu: learnableWord(id)!.hu, picture: this.pictureOf(id)}))
    const right: PracticeRight[] = this.rightIds.map((id) => ({id: id, en: learnableWord(id)!.en}))
    this.board.showSet(left, right, 0, this.pairsTotal)
  }

  /** Programmatic pick (same as pinching a card) — handy for tests. */
  pick(side: "hu" | "en", id: string): void {
    this.onPick({side: side, id: id})
  }

  private onPick(p: PracticePick): void {
    if (!this.active || this.complete || this.matchedIds.indexOf(p.id) >= 0) return
    this.audio.playSfx("UiClick")
    if (!this.selected) {
      this.selected = `${p.side}:${p.id}`
      this.board.setSelected(p.side, p.id, true)
      this.board.setFeedback("", true)
      return
    }
    const [side, id] = this.selected.split(":")
    if (side === p.side) {
      // switch selection within the same column
      this.board.setSelected(side, id, false)
      this.selected = `${p.side}:${p.id}`
      this.board.setSelected(p.side, p.id, true)
      return
    }
    this.selected = ""
    if (id === p.id) {
      this.matchedIds.push(id)
      this.pairsMatched++
      this.board.markMatched(id)
      this.board.setProgress(this.pairsMatched, this.pairsTotal)
      const w = learnableWord(id)!
      this.board.setFeedback(`${w.hu} = ${w.en}`, true)
      this.audio.playSfx("MatchCorrect")
      this.audio.playVoice(w.audio, () => {
        if (this.pairsMatched >= this.pairsTotal && this.active && !this.complete) this.completeSet()
      })
    } else {
      this.wrongAttempts++
      this.board.setSelected(side, id, false)
      this.board.setSelected(p.side, p.id, false)
      this.board.setFeedback("Try again", false)
      this.audio.playSfx("MatchWrong")
    }
  }

  private completeSet(): void {
    this.complete = true
    this.audio.playSfx("PracticeComplete")
    this.board.showComplete(this.pairsTotal)
  }

  private place(): void {
    const cam = camPos()
    let table = this.order ? this.order.chosenTable : 0
    let best = 1e9
    if (!table) {
      for (const t of TABLES) {
        if (!t.empty) continue
        const pos = this.cafe.getTablePosition(t.num)
        if (pos && horizDist(pos, cam) < best) { best = horizDist(pos, cam); table = t.num }
      }
    }
    const tp = table ? this.cafe.getTablePosition(table) : null
    // only over a table the user is facing: a board behind them looks like nothing opened
    const toTable = tp ? flat(tp.sub(cam)) : null
    const facing = !!toTable && (Math.acos(Math.max(-1, Math.min(1, toTable.dot(camLookFlat())))) * 180) / Math.PI <= this.tableInViewDeg
    if (tp && facing && horizDist(tp, cam) < this.nearTableCm) {
      // upright just above the table, shifted along the user's line so it sits boardDistanceCm away:
      // toward a user standing back from the table, or past the centre (at most 15 cm, still over the
      // top) when they sit close — seated at a small table they are only ~57 cm from its centre
      const toUser = flat(cam.sub(tp))
      const shift = Math.max(-15, Math.min(25, horizDist(tp, cam) - this.boardDistanceCm))
      const pos = tp.add(new vec3(0, 76 + this.boardAboveTableCm, 0)).add(toUser.uniformScale(shift))
      placeFacingUser(this.board.getSceneObject(), pos)
      this.placedAt = "table"
      this.boardTable = table
    } else {
      // a little above the gaze, clear of the low HUD; follows the gaze down to 45° (27 Nov: opened while
      // looking down at the counter, a 30° limit put the board above the gaze with its title at the top edge)
      placeFacingUser(this.board.getSceneObject(), inView(this.boardDistanceCm, 3, 0, 45))
      this.placedAt = "front"
      this.boardTable = 0
    }
  }

  /** Café words have an illustration; street and park words their icon. */
  private pictureOf(id: string): Texture | null {
    const w = wordById(id)
    if (w) return PICTURES[w.picture] ?? null
    const e = earlierWordById(id)
    return e ? WORD_ICONS[e.icon] ?? null : null
  }

  private shuffle<T>(a: T[]): T[] {
    const r = a.slice()
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const t = r[i]
      r[i] = r[j]
      r[j] = t
    }
    return r
  }
}
