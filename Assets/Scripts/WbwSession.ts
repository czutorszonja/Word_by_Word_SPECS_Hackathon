// WbwSession.ts — the single owner of session-wide state (pure logic, no scene access).
// Owns: active mode, setup completion, the saved-word collection (one session only), and the word
//       carried from a word card into Use it live ("Use it live →").
// Controllers READ it and request changes through its methods; UI never touches it.
// Must NOT: touch the scene, play audio, or persist across Lens sessions (out of scope).
//           Saving a word never changes the carried word: saving is not ordering.
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"

export type Mode = "none" | "learn" | "practice" | "live"

export const MODE_LABEL: {[m: string]: string} = {
  none: "—",
  learn: "Learn",
  practice: "Practice",
  live: "Use it live",
}

/** How Use it live is being entered: from a word card (with that card's word) or from the menu / suggestion. */
export interface LiveEntry { via: "card" | "menu"; wordId: string }

export class WbwSession {
  private _mode: Mode = "none"
  private _saved: string[] = []
  private _liveEntry: LiveEntry | null = null
  setupComplete: boolean = false
  /** Last word carried from a word card into Use it live ("" if none). Read by the order controller's seeding. */
  liveWord: string = ""

  private _onModeChanged = new Event<Mode>()
  private _onSavedChanged = new Event<string[]>()
  get onModeChanged(): PublicApi<Mode> { return this._onModeChanged.publicApi() }
  get onSavedChanged(): PublicApi<string[]> { return this._onSavedChanged.publicApi() }

  get mode(): Mode { return this._mode }
  setMode(m: Mode): void {
    if (m === this._mode) return
    this._mode = m
    this._onModeChanged.invoke(m)
  }

  /** Saved word ids, in the order they were saved. */
  get saved(): string[] { return this._saved.slice() }
  get savedCount(): number { return this._saved.length }
  isSaved(id: string): boolean { return this._saved.indexOf(id) >= 0 }
  save(id: string): boolean {
    if (this.isSaved(id)) return false
    this._saved.push(id)
    this._onSavedChanged.invoke(this.saved)
    return true
  }

  /** Remember how Use it live is being entered; read once by the order controller when it activates. */
  setLiveEntry(via: "card" | "menu", wordId: string): void {
    this._liveEntry = {via: via, wordId: wordId}
    if (wordId) this.liveWord = wordId
  }

  /** Returns the pending entry and clears it; {via: "menu", wordId: ""} when none is pending. */
  takeLiveEntry(): LiveEntry {
    const e: LiveEntry = this._liveEntry ?? {via: "menu", wordId: ""}
    this._liveEntry = null
    return e
  }
}
