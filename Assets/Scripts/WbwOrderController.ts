// WbwOrderController.ts — "Use it live": real-life conversation help at the counter. The phrase helper
// is the learner's own sentence, prepared by pointing at things; the server starts talking when the
// learner walks up to him (no "Ready to order" button: the glasses only help, the learner orders out
// loud), his words show as a subtitle, and the learner answers out loud. 28 Nov (learner: "I keep
// looking down at the card… too much talking"): everything sits in ONE conversation strip in the line
// of sight to the server's face (his subtitle, then the reply, then the say-it strip), never on the
// counter; there are three replies (what you'd like, what's in it, your table) and his "Jó étvágyat!"
// ends it; and a suggested reply ("You could say") appears only when the learner hesitates — answer by
// yourself and nothing is shown. Table numbers: looking at an empty table's number (or tapping it)
// shows "8 = nyolc" + audio; at the table question this fills "A … asztalnál ülök.". The words of the
// sentence the learner said are kept for Practice ("used today").
// Owns: order state (step, answers said, chosen table); the phrase being built (one
//       PhraseHelperModel: Use this word / Add (+ és) / pattern); when the server notices the learner
//       (near the counter, facing him, for a moment); server line timing (audio → subtitle → answer
//       surface); the speak turns (choose or build → hear → say it: only voice activity or Said it
//       records an answer and lets the server go on); where the answer surface and the say-it strip go;
//       and reading the table number the learner looks at.
// Expects: init(session, audio, learn?, vad?) from WbwMain; @inputs for caption, phrase cards, hint,
//          server and the seating root (Table_<n>/TableCard_<n> children); the phrase helper and
//          speak prompt views (wired in the scene, or assigned by WbwMain before init()).
// Must NOT: build UI itself; read or change saved words (looking up or saving a word never changes
//           the order or the phrase); or treat showing, choosing, playing or editing a phrase as
//           an answer.
import {WbwServerCaptionUI} from "./WbwServerCaptionUI"
import {PhraseCardData, WbwPhraseChoicesUI} from "./WbwPhraseChoicesUI"
import {WbwPhraseHelperUI} from "./WbwPhraseHelperUI"
import {WbwSpeakPromptUI} from "./WbwSpeakPromptUI"
import {WbwHintUI} from "./WbwHintUI"
import {WbwTableCardUI} from "./WbwTableCardUI"
import {WbwServerCharacter} from "./WbwServerCharacter"
import {WbwAudioController} from "./WbwAudioController"
import {WbwVoiceActivity} from "./WbwVoiceActivity"
import {LiveEntry, WbwSession} from "./WbwSession"
import {WbwLearnController} from "./WbwLearnController"
import {ORDER_DONE, ORDER_STEPS, OrderStep, WORDS, lineById, phraseById, tableByNum} from "./WbwVocab"
import {PhraseBuild, PhraseHelperModel, PhrasePattern, canListen, canUseInPhrase, checkAgainstVocab, missingClips} from "./WbwPhraseHelperModel"
import {PICTURES} from "./WbwIllustrations"
import {camLook, camLookFlat, camPos, camTransform, flat, horizDist, placeFacingUser} from "./WbwSpatial"

// Gap between the answer surface and the say-it strip below it (cm)
const PROMPT_GAP_CM = 1

/** Answer surface prompt: the replies are suggestions, the learner says one out loud. */
const SUGGEST = "You could say"
/** At the table question before a number was read: the reply with its blank, filled by looking at a number. */
const TABLE_BLANK_HU = "A … asztalnál ülök."
const TABLE_BLANK_EN = "I'm at table … (look at its number)"

@component
export class WbwOrderController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwOrderController – Use it live (scripted order + tables)</span>')
  @ui.separator
  @ui.group_start("References")
  @input @hint("Server caption bubble UI") caption!: WbwServerCaptionUI
  @input @hint("Phrase cards UI") phrases!: WbwPhraseChoicesUI
  @input @hint("Hint line + edge arrow UI") hint!: WbwHintUI
  @input @hint("The scripted server character") server!: WbwServerCharacter
  @input @hint("Seating root: children Table_<n>, each with a TableCard_<n> child") seating!: SceneObject
  @input @allowUndefined @hint("Authored tray on the sandwich counter where the phrase cards lie (tilted toward the user)") phraseTray: SceneObject | undefined
  @input @allowUndefined @hint("Phrase helper view (SAY IT AT THE COUNTER). Empty = WbwMain creates one at start") phraseHelper: WbwPhraseHelperUI | undefined
  @input @allowUndefined @hint("Say-it strip with the Said it button. Empty = WbwMain creates one at start") speakPrompt: WbwSpeakPromptUI | undefined
  @ui.group_end
  @ui.group_start("Settings")
  @input
  @hint("Pause between the user's answer and the server's next line (s)")
  @widget(new SliderWidget(0, 3, 0.1))
  replyPauseSec: number = 0.6

  @input
  @hint("Seconds the caption stays after the server's line ends")
  @widget(new SliderWidget(0, 10, 0.5))
  captionLingerSec: number = 4

  @input
  @hint("Lay the phrase cards on the counter tray (user looks down to pick). Off = float in front of the user.")
  phrasesOnCounter: boolean = true

  @input
  @hint("Cards lie on the counter tray only while the user is within this distance of it (cm); further away they float in front of the user")
  @widget(new SliderWidget(100, 500, 10))
  maxTrayDistanceCm: number = 260

  @input
  @hint("Distance of the phrase cards in front of the user when NOT on the counter (cm)")
  @widget(new SliderWidget(40, 90, 1))
  phraseDistanceCm: number = 68

  @input
  @hint("How far below eye level the phrase cards sit (cm)")
  @widget(new SliderWidget(0, 40, 1))
  phraseDropCm: number = 7

  @input
  @hint("The server starts talking once the learner is this close to him (cm)...")
  @widget(new SliderWidget(100, 400, 10))
  serverNoticeCm: number = 260

  @input
  @hint("...faces him within this angle (deg)...")
  @widget(new SliderWidget(10, 60, 1))
  serverNoticeDeg: number = 30

  @input
  @hint("...for this long (s)")
  @widget(new SliderWidget(0, 4, 0.1))
  serverNoticeSec: number = 1.2

  @input
  @hint("The server notices the learner by himself (near + facing). Off = the order starts only from code (tests)")
  serverNotices: boolean = true

  @input
  @hint("A table's number is read when the learner looks within this angle of it (deg)...")
  @widget(new SliderWidget(2, 20, 0.5))
  tableLookDeg: number = 8

  @input
  @hint("...for this long (s)")
  @widget(new SliderWidget(0.1, 2, 0.05))
  tableLookSec: number = 0.5

  @input
  @hint("Farthest a table number can be read by looking (cm)")
  @widget(new SliderWidget(100, 800, 10))
  tableLookCm: number = 520

  @input
  @hint("Objects within this angle (deg) of the view direction count as 'in view' for the arrow")
  @widget(new SliderWidget(10, 45, 1))
  arrowInViewDeg: number = 24

  @input
  @hint("While the server talks, his subtitle, the reply and the say-it strip sit together in the line of sight to his face (28 Nov). Off = the old placement (cards on the counter tray)")
  conversationInView: boolean = true

  @input
  @hint("Distance of the conversation strip from the learner (cm)")
  @widget(new SliderWidget(50, 150, 1))
  stripDistanceCm: number = 80

  @input
  @hint("How far below the server's face the top of the strip sits (deg): his face stays visible above it")
  @widget(new SliderWidget(0, 25, 0.5))
  stripBelowFaceDeg: number = 3.5

  @input
  @hint("Gap between the subtitle, the reply and the say-it strip (cm)")
  @widget(new SliderWidget(0, 4, 0.1))
  stripSpacingCm: number = 0.5

  @input
  @hint("Lowest the strip may reach below the server's face (deg; the Specs view reaches ~18° below its centre). A stack that would go lower lets his subtitle give way to the reply")
  @widget(new SliderWidget(8, 30, 0.5))
  stripMaxBelowDeg: number = 16.5

  @input
  @hint("Seconds of silence after the server's question before a suggested reply appears (answering out loud first shows nothing)")
  @widget(new SliderWidget(0, 6, 0.1))
  hesitationSec: number = 2

  @input
  @hint("Distance of the phrase helper in front of the learner while preparing the sentence (cm)")
  @widget(new SliderWidget(45, 120, 1))
  prepDistanceCm: number = 70

  @input
  @hint("While preparing, the helper's centre follows the gaze this far above it (deg): it sits over the ingredients being pointed at and their labels, never on them (a ray must reach the label's Use this word)…")
  @widget(new SliderWidget(0, 30, 0.5))
  prepAboveGazeDeg: number = 10.5

  @input
  @hint("…but no lower than this (deg, negative = below eye level)…")
  @widget(new SliderWidget(-45, 0, 0.5))
  prepLowestDeg: number = -30

  @input
  @hint("…and no higher than this: looking up at the server it stays under his face")
  @widget(new SliderWidget(-40, 0, 0.5))
  prepHighestDeg: number = -12

  @input
  @hint("Use this word, Add (+ és) and the pattern switch play the updated phrase once")
  playPhraseOnChange: boolean = true

  @input
  @hint("Listen for the learner's voice to end a speak turn. Off = only the Said it button ends it (use for recordings)")
  voiceDetection: boolean = true
  @ui.group_end

  // ── readable state for tests ──
  /** True while Use it live is the active mode. */
  active: boolean = false
  /** 0 = prep / not started, 1..4 = that step of the order, 5 (ORDER_DONE) = done. */
  orderStep: number = 0
  /** Name of the current step: "" before Use it live was opened, then prep, greet, fillings, drink,
   *  table, enjoy, done. */
  orderStepName: string = ""
  /** "" before Use it live was opened · "ready" in prep (the server has not noticed the learner yet) ·
   *  "server" while a server line plays · "user" while an answer surface waits · "table" while waiting
   *  for an empty table to be selected · "done" when the order is complete. */
  waitingFor: string = ""
  /** Ids of the answers the learner has SAID in this order, in order ("fillings" = the phrase helper's
   *  sentence). Pushed when an answer was said (voice or Said it), never when a card is pressed. */
  answers: string[] = []
  /** Table chosen in the table step (or by tapping an empty table's number card); 0 = none. */
  chosenTable: number = 0
  /** Last table number card tapped (any time); 0 = none. */
  lastTableTapped: number = 0
  /** Phrase ids currently offered as cards (empty in prep, at the fillings step, and while the learner may still answer by themselves). */
  offeredPhraseIds: string[] = []
  /** Hungarian text of the last server line. */
  lastServerLine: string = ""
  /** Ingredient ids in the phrase, in order (mirrors the phrase model). */
  phraseSlotIds: string[] = []
  /** "want" = "Kérek … a szendvicsembe." · "without" = "… nélkül, kérem." */
  phrasePattern: PhrasePattern = "want"
  /** The phrase as shown, Hungarian ("Kérek … a szendvicsembe." while empty; never "" after init()). */
  phraseHu: string = ""
  /** The phrase as shown, English. */
  phraseEn: string = ""
  /** Clip key of the phrase ("a+b+c" = clips in sequence); "" while it is empty. */
  phraseAudioKey: string = ""
  /** The phrase helper panel is up. */
  get phraseHelperVisible(): boolean { return !!this.phraseHelper && this.phraseHelper.isVisible }
  /** The phrase can be changed and listened to now: in prep, and at the fillings step once the server's
   *  question has ended. Never while the server speaks (a new clip would drop the end of its line). */
  get phraseEditable(): boolean {
    return this.active && this.phraseHelperVisible &&
      (this.waitingFor === "ready" || (this.waitingFor === "user" && !!this.stepDef && !!this.stepDef.helper))
  }
  /** A speak turn is open: an answer was chosen (or the phrase is ready) and waits to be said. */
  get waitingForSpeech(): boolean { return this.speakTurn !== null }
  /** The last answer was ended by the microphone (voice activity), not by Said it. */
  speechDetected: boolean = false
  /** What ended the last answer: "mic" or "button" ("" while a turn is open or before the first one). */
  speechSource: string = ""
  /** Phrase card chosen and waiting to be said ("" = none). */
  chosenPhraseId: string = ""
  /** The phrase (Hungarian) at the moment the fillings answer was said. */
  fillingsSaid: string = ""
  /** True while a question waits for the learner and nothing is shown yet (help appears after hesitationSec). */
  hesitating: boolean = false
  /** Word ids of the said sentence that were kept for Practice ("used today"). */
  keptFromOrder: string[] = []
  /** The voice activity detector passed to init() (null = Said it only). */
  vad: WbwVoiceActivity | null = null

  private session!: WbwSession
  private audio!: WbwAudioController
  private learn: WbwLearnController | null = null
  private stepDef: OrderStep | null = null
  private phrase = new PhraseHelperModel()
  private speakTurn: {answerId: string; epoch: number; silent: boolean} | null = null
  private tableCards: {[n: number]: WbwTableCardUI} = {}
  private captionHideAt = -1
  private arrowTarget: vec3 | null = null
  private epoch = 0
  private hasClip = (key: string): boolean => this.audio.has(key)
  private noticeT = 0
  private lookTable = 0
  private lookT = 0
  private placedFrom: vec3 | null = null
  private placedNearTray = false
  private prepFollowing = false
  /** Seconds the learner has been near and facing the server in prep (tests). */
  get noticeProgress(): number { return this.noticeT }
  /** How the last table number was read: "look" | "tap" ("" = none yet). */
  tableReadBy: string = ""

  init(session: WbwSession, audio: WbwAudioController, learn?: WbwLearnController, vad?: WbwVoiceActivity | null): void {
    this.session = session
    this.audio = audio
    this.learn = learn ?? null
    this.vad = vad ?? null
    this.phrases.onPick.add((id) => this.onPhrase(id))
    if (this.phraseHelper) {
      this.phraseHelper.onListen.add(() => { this.listenPhrase() })
      this.phraseHelper.onPattern.add((p) => { this.setPattern(p, true) })
    } else {
      print("WbwOrder: no phrase helper view: prep and the fillings step have no answer surface")
    }
    if (this.speakPrompt) this.speakPrompt.onSaidIt.add(() => this.saidIt())
    else print("WbwOrder: no speak prompt view: there is no Said it button")
    if (this.learn) {
      // the hover label's buttons in Use it live; the phrase model decides whether a press counts
      this.learn.onUse.add((id) => { this.useWord(id) })
      this.learn.onAdd.add((id) => { this.addWord(id) })
    }
    // find the table number cards under Seating/Table_<n>/TableCard_<n>
    for (let i = 0; i < this.seating.getChildrenCount(); i++) {
      const t = this.seating.getChild(i)
      for (let j = 0; j < t.getChildrenCount(); j++) {
        const c = t.getChild(j)
        const ui = c.getComponent(WbwTableCardUI.getTypeName()) as WbwTableCardUI
        if (ui) {
          this.tableCards[ui.tableNumber] = ui
          ui.onSelected.add((n) => this.onTable(n))
        }
      }
    }
    // Loud start-up checks: the audio controller skips a missing clip silently in the middle of a
    // sentence, and a phrase table that drifted from the vocabulary would show one form and say another.
    const miss = missingClips(this.hasClip)
    if (miss.length > 0) print("WbwOrder: missing phrase clips: " + miss.join(","))
    const drift = checkAgainstVocab(WORDS)
    if (drift.length > 0) print("WbwOrder: phrase table differs from WbwVocab: " + drift.join("; "))
    this.mirrorPhrase()
    this.createEvent("UpdateEvent").bind(() => this.tick())
  }

  setActive(on: boolean): void {
    if (on === this.active) return
    this.active = on
    this.epoch++
    if (on) {
      this.vad?.setVoiceDetection(this.voiceDetection)
      this.vad?.setMicActive(true)
      // only the word carried from a word card may pre-fill an empty phrase; nothing plays on entry
      this.seedPhrase(this.session.takeLiveEntry())
      this.mirrorPhrase()
      if (this.orderStep === 0 || this.orderStep >= ORDER_DONE) this.enterPrep()
      else this.runStep(this.orderStep)
    } else {
      this.closeSpeakTurn()
      this.speakPrompt?.hide()
      this.phraseHelper?.hide()
      this.vad?.setMicActive(false)
      this.learn?.setLiveSlots([], false)
      this.chosenPhraseId = ""
      this.phrases.hide()
      this.clearHighlight()
      this.caption.hide()
      this.server.setSpeaking(false)
      this.audio.stopVoice()
      this.hint.setArrow(false)
      this.hint.hideHint()
      this.arrowTarget = null
      this.offeredPhraseIds = []
      this.hesitating = false
      if (this.waitingFor === "server") this.waitingFor = "user"
    }
  }

  /**
   * Prep: the phrase helper is up and can be changed and listened to; the server stays quiet until he
   * notices the learner (near the counter, facing him). Entered when Use it live opens (unless an order
   * is under way) and when it is picked again in the menu. Keeps the phrase. Plays nothing.
   */
  enterPrep(): void {
    if (!this.active) return
    this.epoch++
    this.closeSpeakTurn()
    this.speakPrompt?.hide()
    this.chosenPhraseId = ""
    this.orderStep = 0
    this.orderStepName = "prep"
    this.stepDef = null
    this.waitingFor = "ready"
    this.answers = []
    this.chosenTable = 0
    this.offeredPhraseIds = []
    this.hesitating = false
    this.keptFromOrder = []
    this.phrases.hide()
    this.caption.hide()
    this.captionHideAt = -1
    this.server.setSpeaking(false)
    this.audio.stopVoice()
    this.hint.hideHint()
    this.hint.setArrow(false)
    this.arrowTarget = null
    this.vad?.setMicActive(true)
    this.noticeT = 0
    const b = this.phrase.build()
    this.phraseHelper?.show(b, this.canHear(b), true)
    this.placeSurface()
    this.refreshHighlight()
    this.refreshEditable()
  }

  /** The server noticed the learner (or a test says so): he greets and the scripted order starts. */
  readyToOrder(): void {
    if (!this.active || this.waitingFor !== "ready") return
    this.startOrder()
  }

  /** Start the scripted order at step 1 (the server's greeting). The phrase is kept. */
  startOrder(): void {
    this.answers = []
    this.chosenTable = 0
    this.hint.hideHint()
    this.runStep(1)
  }

  /** Programmatic choose (same as pressing a phrase card: plays it and opens its speak turn) — handy for tests. */
  pickPhrase(id: string): boolean {
    if (this.offeredPhraseIds.indexOf(id) < 0) return false
    this.onPhrase(id)
    return true
  }

  // ── steps ──
  private runStep(step: number): void {
    const ep = ++this.epoch
    this.closeSpeakTurn()
    this.chosenPhraseId = ""
    this.orderStep = step
    this.phrases.hide()
    this.clearHighlight()
    this.offeredPhraseIds = []
    this.hesitating = false
    if (step > ORDER_STEPS.length) {
      this.finish()
      return
    }
    const def = ORDER_STEPS[step - 1]
    this.stepDef = def
    this.orderStepName = def.name
    const line = lineById(def.line)!
    this.waitingFor = "server"
    this.lastServerLine = line.hu
    // in the strip his subtitle shows alone first: the prep card must be gone before the column is laid
    // out (else it would not fit with it and the subtitle would give way to a card that is about to go)
    if (this.conversationInView) this.phraseHelper?.hide()
    this.showCaption(line.hu, line.en)
    this.server.setSpeaking(true)
    this.placeSurface()
    // The phrase helper is the answer surface of the fillings step only: up while the server asks,
    // usable once the question has ended. Every other step has its own phrase cards.
    if (def.helper && !this.conversationInView) {
      const b = this.phrase.build()
      this.phraseHelper?.show(b, this.canHear(b), false)
      this.placeSurface()
    } else if (def.helper) {
      // in the conversation strip his question shows alone; the learner's sentence takes its place
      // once he has asked (showHelperTurn): both together did not fit under his face
      this.phraseHelper?.hide()
      this.placeSurface()
    } else {
      this.phraseHelper?.hide()
    }
    this.refreshHighlight()
    this.refreshEditable()
    this.audio.playVoice(line.audio, () => this.lineEnded(def, ep))
  }

  /** The server's line has ended (or an empty table's number took its place, see onTable). */
  private lineEnded(def: OrderStep, ep: number): void {
    if (ep !== this.epoch || !this.active || this.waitingFor !== "server") return
    this.server.setSpeaking(false)
    this.captionHideAt = getTime() + this.captionLingerSec
    this.afterLine(def)
  }

  private afterLine(def: OrderStep): void {
    if (def.helper) {
      this.showHelperTurn()
      return
    }
    if (def.name === "table") {
      if (this.chosenTable > 0) {
        this.offerTablePhrase()
      } else {
        // real life: the learner glances at their table's number; the glasses read it (tickTableLook) and
        // fill the reply. Until then the reply shows its blank. No coach hint, chime or arrow (26 Nov).
        this.waitingFor = "table"
        this.showCaption(lineById(def.line)!.hu, lineById(def.line)!.en)
        this.captionHideAt = -1
        this.closeSpeakTurn()
        this.chosenPhraseId = ""
        this.offeredPhraseIds = []
        this.phrases.show([{id: "table_blank", hu: TABLE_BLANK_HU, en: TABLE_BLANK_EN, picture: null, chosen: false, blank: true}], SUGGEST)
        this.placeSurface()
        this.lookTable = 0
        this.lookT = 0
      }
      return
    }
    if (def.choices.length === 0) {
      // nothing to answer ("Jó étvágyat!"): the line ends the conversation, its subtitle lingers
      this.finish()
      return
    }
    this.awaitAnswer(def)
  }

  /** A question: the learner may answer out loud at once and nothing is shown. Only after hesitationSec
   *  of silence does the ONE suggested reply appear, with the say-it strip (28 Nov). */
  private awaitAnswer(def: OrderStep): void {
    const id = def.advanceOn[0] ?? def.choices[0]
    this.waitingFor = "user"
    this.offeredPhraseIds = []
    this.phrases.hide()
    this.refreshHighlight()
    this.refreshEditable()
    if (this.hesitationSec <= 0) {
      this.offer([id])
      return
    }
    this.hesitating = true
    this.beginSpeakTurn(id, true)
    this.vad?.arm((src) => this.onSaid(src), 0)
    const ep = this.epoch
    const ev = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
    ev.bind(() => {
      if (ep !== this.epoch || !this.active || !this.hesitating) return
      // still speaking when the time is up: let them finish
      if (this.vad && this.vad.vadState === "speech") {
        ev.reset(0.5)
        return
      }
      this.hesitating = false
      this.offer([id])
    })
    ev.reset(this.hesitationSec)
  }

  /** Fillings step, after "Mit kér bele?" has ended: the phrase helper is the one answer surface. */
  private showHelperTurn(): void {
    this.waitingFor = "user"
    this.offeredPhraseIds = []
    this.phrases.hide()
    const b = this.phrase.build()
    if (this.phraseHelper) {
      const compact = this.conversationInView // in the strip: the sentence only, no button row
      if (this.phraseHelper.isVisible && this.phraseHelper.compact === compact) this.phraseHelper.setPhrase(b, this.canHear(b))
      else this.phraseHelper.show(b, this.canHear(b), false, compact)
    }
    this.placeSurface()
    this.refreshHighlight()
    this.refreshEditable()
    // A phrase that is ready can be said at once: Said it shows and the mic listens, with no replay
    // (the server's question stays the last thing heard). An empty phrase has nothing to say yet:
    // its turn opens when the first word is chosen (rebuildPhrase).
    if (!b.empty) {
      this.beginSpeakTurn("fillings")
      this.armVoice(b.audioKey)
    }
  }

  /** Offer phrase cards for the current step. Choosing one plays it and opens its speak turn (onPhrase). */
  private offer(ids: string[]): void {
    // a re-offer (e.g. another table was tapped) must never leave a turn open for a card that is gone
    this.closeSpeakTurn()
    this.chosenPhraseId = ""
    const cards: PhraseCardData[] = []
    const list: string[] = []
    for (const pid of ids) {
      const p = phraseById(pid)
      if (!p) continue
      cards.push({id: p.id, hu: p.hu, en: p.en, picture: PICTURES[p.picture] ?? null, chosen: false})
      list.push(p.id)
    }
    this.waitingFor = "user"
    this.offeredPhraseIds = list
    this.phrases.show(cards, SUGGEST)
    // one suggestion: it can be said straight away (Said it shows); tapping it plays it first
    if (list.length === 1 && this.stepDef && this.stepDef.name !== "table") {
      this.beginSpeakTurn(list[0])
      this.vad?.arm((src) => this.onSaid(src), 0)
    }
    this.placeSurface()
    this.refreshHighlight()
    this.refreshEditable()
  }

  /** A phrase card was pressed: choose it and play it. Never an answer by itself (see onSaid). */
  private onPhrase(id: string): void {
    if (!this.active || !this.stepDef || this.waitingFor !== "user" || this.stepDef.helper) return
    if (this.offeredPhraseIds.indexOf(id) < 0) return
    const p = phraseById(id)
    if (!p) return
    // another card (or the same one again = listen again) replaces the choice: the old turn ends first
    this.closeSpeakTurn()
    this.chosenPhraseId = id
    this.phrases.setChosen(id)
    this.audio.playVoice(p.audio)   // first, so the detector's gate is already busy when it arms
    this.beginSpeakTurn(id)
    this.armVoice(p.audio)          // the mic counts nothing until the clip has ended (+ its tail guard)
  }

  private next(def: OrderStep): void {
    this.phrases.hide()
    this.offeredPhraseIds = []
    this.waitingFor = "server"
    this.refreshEditable()
    const ep = this.epoch
    const ev = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
    ev.bind(() => {
      if (ep === this.epoch && this.active) this.runStep(def.step + 1)
    })
    ev.reset(this.replyPauseSec)
  }

  private finish(): void {
    this.closeSpeakTurn()
    this.speakPrompt?.hide()
    this.phraseHelper?.hide()
    this.vad?.setMicActive(false)
    this.learn?.setLiveSlots([], false)
    this.clearHighlight()
    this.orderStep = ORDER_DONE
    this.orderStepName = "done"
    this.hesitating = false
    this.waitingFor = "done"
    this.stepDef = null
    this.phrases.hide()
    this.captionHideAt = getTime() + this.captionLingerSec
    // the conversation is over: nothing tells the learner where to go next (it is their café visit)
    this.arrowTarget = null
    this.hint.setArrow(false)
  }

  // ── speak turns: one per answer. Showing, choosing, listening and editing never answer ──
  /** Open the turn for an answer: Said it shows now. Callers arm the mic with armVoice. */
  private beginSpeakTurn(answerId: string, silent: boolean = false): void {
    this.speakTurn = {answerId: answerId, epoch: this.epoch, silent: silent}
    this.speechDetected = false
    this.speechSource = ""
    if (silent) return // the learner may answer by themselves: nothing on screen yet
    this.speakPrompt?.show()
    this.placePrompt()
  }

  /** Let the mic end the open turn once the learner has spoken. `key` is the phrase they are to say. */
  private armVoice(key: string): void {
    this.vad?.arm((src) => this.onSaid(src), this.audio.durationOf(key))
  }

  /** The Said it button: answers the open speak turn without the microphone. */
  saidIt(): void {
    if (!this.waitingForSpeech) return
    // the detector reports "button" itself while it holds an armed turn; else (no detector, or the mic
    // is waiting for a changed phrase to be heard first) the turn is answered here
    if (!this.vad || !this.vad.saidIt()) this.onSaid("button")
  }

  /** The learner said the answer (voice activity) or pressed Said it: the ONLY place an answer is recorded. */
  private onSaid(source: string): void {
    const turn = this.speakTurn
    if (!turn || turn.epoch !== this.epoch || !this.active) return
    const def = this.stepDef
    this.speakTurn = null
    this.hesitating = false
    this.speechSource = source
    this.speechDetected = source === "mic"
    this.vad?.disarm()
    if (turn.silent) this.speakPrompt?.hide()
    else this.speakPrompt?.showHeard()   // "Heard you ✓" stays for a moment, also across the step change
    this.server.acknowledge()       // the server nods: heard you
    if (def) {
      if (def.helper) {
        this.answers.push("fillings")
        this.fillingsSaid = this.phraseHu
        this.keepUsedWords()
        this.next(def)
      } else {
        const id = turn.answerId
        this.answers.push(id)
        this.chosenPhraseId = ""
        if (def.advanceOn.indexOf(id) >= 0) {
          this.next(def)
        } else {
          // answered, but the step goes on (e.g. greeting back): the cards stay, nothing is chosen
          this.phrases.setChosen("")
        }
      }
    }
    this.refreshEditable()
  }

  /** End an open turn without an answer. The "Heard you ✓" of an answer just given is left alone. */
  private closeSpeakTurn(): void {
    this.vad?.disarm()
    this.hesitating = false
    if (!this.speakTurn) return
    this.speakTurn = null
    this.speakPrompt?.hide()
  }

  /** The sentence was said: its words are kept with the saved words, for Practice ("used today"). */
  private keepUsedWords(): void {
    for (const id of this.phraseSlotIds) {
      if (this.session.save(id)) this.keptFromOrder.push(id)
    }
  }

  // ── the phrase (prep and the fillings step). The model is the only authority on what a press does ──
  /** "Use this word": the phrase becomes that one ingredient. True if the phrase changed. */
  useWord(id: string): boolean {
    if (!this.phraseEditable) return false
    if (!this.phrase.useWord(id)) return false
    this.rebuildPhrase(true)
    return true
  }

  /** "Add (+ és)": append the ingredient to the phrase. True if the phrase changed. */
  addWord(id: string): boolean {
    if (!this.phraseEditable) return false
    if (!this.phrase.addWord(id)) return false
    this.rebuildPhrase(true)
    return true
  }

  /** Switch between "Kérek … a szendvicsembe." and "… nélkül, kérem."; the words stay. True if it changed. */
  setPattern(p: PhrasePattern, fromUser: boolean = true): boolean {
    if (!this.phraseEditable) return false
    if (!this.phrase.setPattern(p)) return false
    this.rebuildPhrase(fromUser)
    return true
  }

  /** The helper's Listen button: play the phrase. Never an answer. True if it played. */
  listenPhrase(): boolean {
    if (!this.phraseEditable) return false
    const b = this.phrase.build()
    if (!this.canHear(b)) return false
    this.audio.playVoice(b.audioKey)
    if (this.speakTurn) this.armVoice(b.audioKey)   // the mic listens again once this playback has ended
    return true
  }

  /** The phrase changed: mirror it, update the helper, the highlight and the label, and replay it once. */
  private rebuildPhrase(fromUser: boolean): void {
    const b = this.phrase.build()
    this.mirrorPhrase()
    const hear = this.canHear(b)
    this.phraseHelper?.setPhrase(b, hear)
    this.refreshHighlight()
    this.learn?.setLiveSlots(this.phraseSlotIds, this.phraseEditable)
    const helperTurn = !!this.stepDef && !!this.stepDef.helper && this.waitingFor === "user"
    const play = fromUser && this.playPhraseOnChange && hear
    if (helperTurn) {
      if (b.empty) {
        this.closeSpeakTurn()
      } else {
        // a changed phrase has to be heard before the mic may accept it; the turn and Said it stay open
        this.vad?.disarm()
        if (!this.speakTurn) this.beginSpeakTurn("fillings")
      }
    }
    if (play) this.audio.playVoice(b.audioKey)
    // Armed right after the playback starts: the detector waits for the clip to end. Without playback the
    // mic stays off until Listen is pressed; Said it answers either way.
    if (helperTurn && !b.empty && play) this.armVoice(b.audioKey)
  }

  /** Pre-fill an EMPTY phrase with the word carried from a word card. Never from the saved list. */
  private seedPhrase(e: LiveEntry): void {
    if (!this.phrase.isEmpty) return
    const id = canUseInPhrase(e.wordId) ? e.wordId : canUseInPhrase(this.session.liveWord) ? this.session.liveWord : ""
    if (!id) return
    this.phrase.setPattern("want")
    this.phrase.useWord(id)
  }

  /** Copy the model's state into the readable phrase fields. */
  private mirrorPhrase(): void {
    const s = this.phrase.testState()
    this.phraseSlotIds = s.phraseSlotIds
    this.phrasePattern = s.phrasePattern
    this.phraseHu = s.phraseHu
    this.phraseEn = s.phraseEn
    this.phraseAudioKey = s.phraseAudioKey
  }

  /** Listen is possible: the phrase has a word and every clip of its sequence is in the bank. */
  private canHear(b: PhraseBuild): boolean {
    return canListen(b, this.hasClip)
  }

  /** Tell the helper and the hover label whether the phrase can be changed right now. */
  private refreshEditable(): void {
    const on = this.phraseEditable
    this.phraseHelper?.setEditable(on)
    this.learn?.setLiveSlots(this.phraseSlotIds, on)
  }

  // ── tables ──
  /** Tapping an empty table's number card (the look path calls readTable directly). */
  private onTable(n: number): void {
    this.readTable(n, "tap")
  }

  /** An empty table's number was read (looked at in the table step, or tapped): "8 = nyolc" + audio. */
  private readTable(n: number, by: string): void {
    const info = tableByNum(n)
    if (!info || !info.empty) return
    this.tableReadBy = by
    this.lastTableTapped = n
    const card = this.tableCards[n]
    if (card) card.showTranslation(`${n} = ${info.hu}`)
    const def = this.stepDef, ep = this.epoch
    const tableStep = this.active && !!def && def.name === "table"
    if (tableStep) {
      // this table's phrase is about to be offered: a turn still open for another table's phrase ends now
      this.closeSpeakTurn()
      this.chosenPhraseId = ""
      this.phrases.setChosen("")
    }
    if (this.active && def && this.waitingFor === "server" && this.server.isSpeaking) {
      // Tapped while the server is still speaking: the number replaces the rest of the line and its end
      // counts as the line's end (a bare playVoice would drop the line's finish and stall the order).
      this.audio.playVoice(info.audio, () => this.lineEnded(def, ep))
    } else {
      this.audio.playVoice(info.audio)
    }
    if (tableStep) {
      this.chosenTable = n
      if (this.waitingFor === "table" || this.waitingFor === "user") {
        const ev = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
        ev.bind(() => {
          if (ep === this.epoch && this.active) this.offerTablePhrase()
        })
        ev.reset(1.2)
      }
    } else {
      // outside the table step, tapping an empty table still teaches its number and sets
      // "my table" for Practice placement
      this.chosenTable = n
    }
  }

  private offerTablePhrase(): void {
    const info = tableByNum(this.chosenTable)
    if (!info) return
    const line = lineById("hanyas_asztal")!
    this.showCaption(line.hu, line.en)
    this.captionHideAt = getTime() + 8
    this.offer([info.phraseId]) // only the phrase for the chosen table is offered
  }

  // ── helpers ──
  private clearHighlight(): void {
    if (this.learn && this.learn.highlightIds.length > 0) this.learn.setHighlight([])
  }

  /** Softly highlight the real ingredients/items the offered cards name and, while the helper is up, the phrase's words. */
  private refreshHighlight(): void {
    if (!this.learn) return
    const ids: string[] = []
    for (const pid of this.offeredPhraseIds) {
      const p = phraseById(pid)
      if (p) for (const w of p.words) if (ids.indexOf(w) < 0) ids.push(w)
    }
    if (this.phraseHelperVisible) for (const w of this.phraseSlotIds) if (ids.indexOf(w) < 0) ids.push(w)
    if (ids.length > 0) this.learn.setHighlight(ids)
    else this.clearHighlight()
  }

  /** The one visible answer surface (the phrase helper or the phrase cards; never both), or null. */
  private surface(): {so: SceneObject; size: vec2} | null {
    if (this.phraseHelper && this.phraseHelper.isVisible) return {so: this.phraseHelper.getSceneObject(), size: this.phraseHelper.sizeCm}
    if (this.phrases.isVisible) return {so: this.phrases.getSceneObject(), size: this.phrases.sizeCm}
    return null
  }

  private nearTray(): boolean {
    return this.phraseTray ? this.phraseTray.getTransform().getWorldPosition().distance(camPos()) <= this.maxTrayDistanceCm : false
  }

  /** The conversation is on: from the server's first line until the order is done. */
  private get talking(): boolean {
    return this.active && this.orderStep >= 1 && this.orderStep < ORDER_DONE
  }

  /** The server's face (world). */
  private serverFace(): vec3 {
    return this.server.getSceneObject().getTransform().getWorldPosition().add(new vec3(0, this.server.heightCm - 12, 0))
  }

  /** Put the answer surface where it belongs, and the say-it strip below it. While the server talks:
   *  the conversation strip in the line of sight to his face. While preparing: in front, a little low. */
  private placeSurface(): void {
    if (this.conversationInView) {
      this.placedFrom = camPos()
      this.placedNearTray = this.nearTray()
      if (this.talking) this.placeStrip()
      else this.placePrep()
      return
    }
    const s = this.surface()
    const nearTray = this.nearTray()
    this.placedFrom = camPos()
    this.placedNearTray = nearTray
    if (s) {
      // after walking away from the counter, the cards come to the user instead of staying on the tray
      if (this.phrasesOnCounter && this.phraseTray && nearTray) {
        // lying on the counter in front of the user, tilted up toward them (authored tray)
        const tt = this.phraseTray.getTransform(), pt = s.so.getTransform()
        pt.setWorldPosition(tt.getWorldPosition())
        pt.setWorldRotation(tt.getWorldRotation())
      } else {
        // ~60 cm ahead, below eye level: toward the server when near the counter, else where the user looks
        const cam = camPos()
        const toServer = this.phrasesOnCounter && !nearTray
          ? camLookFlat()
          : flat(this.server.getSceneObject().getTransform().getWorldPosition().sub(cam))
        placeFacingUser(s.so, cam.add(toServer.uniformScale(this.phraseDistanceCm)).add(new vec3(0, -this.phraseDropCm, 0)))
      }
    }
    this.placePrompt()
  }

  /** Preparing the sentence: the helper in front of the learner, toward where they look (never lying on
   *  the counter). Its height follows the gaze, prepAboveGazeDeg above it, between prepLowestDeg and
   *  prepHighestDeg: looking down at the ingredients it sits just above them and their labels,
   *  looking up at the server it sits under his face (28 Nov). */
  private prepGoal(): vec3 {
    const look = camLook()
    const lookPitch = Math.asin(Math.max(-1, Math.min(1, look.y))) * 180 / Math.PI
    const pitch = Math.max(this.prepLowestDeg, Math.min(this.prepHighestDeg, lookPitch + this.prepAboveGazeDeg)) * Math.PI / 180
    const dir = camLookFlat().uniformScale(Math.cos(pitch)).add(new vec3(0, Math.sin(pitch), 0))
    return camPos().add(dir.uniformScale(this.prepDistanceCm))
  }

  private placePrep(): void {
    const s = this.surface()
    if (!s) return
    placeFacingUser(s.so, this.prepGoal())
    this.prepFollowing = false
    this.placePrompt()
  }

  /** In prep the helper glides after the gaze (gently, like the menu), so it is in view while pointing at
   *  the ingredients and while walking up to the counter; small head moves leave it still. */
  private tickPrepFollow(): void {
    if (!this.conversationInView || !this.active || this.orderStep !== 0 || !this.phraseHelper || !this.phraseHelper.isVisible) {
      this.prepFollowing = false
      return
    }
    const so = this.phraseHelper.getSceneObject()
    const t = so.getTransform()
    const pos = t.getWorldPosition(), goal = this.prepGoal()
    if (!this.prepFollowing && pos.distance(goal) < 14) return
    this.prepFollowing = true
    const next = vec3.lerp(pos, goal, Math.min(1, getDeltaTime() * 5))
    placeFacingUser(so, next)
    if (next.distance(goal) < 1.5) this.prepFollowing = false
  }

  /** The conversation strip: one column in the line of sight to the server's face, starting just below
   *  his face — his subtitle, then the reply (phrase card or the learner's own sentence), then the
   *  say-it strip. Looking at him is enough to see all of it (28 Nov). */
  private placeStrip(): void {
    const cam = camPos()
    const toFace = this.serverFace().sub(cam)
    const dir = toFace.length > 1 ? toFace.normalize() : camLook()
    const fd = flat(dir)
    const flatDir = fd.length > 1e-3 ? fd.normalize() : camLookFlat()
    const d = this.stripDistanceCm
    const right = flatDir.cross(vec3.up()).normalize()
    const up = right.cross(dir).normalize()
    const top = cam.add(dir.uniformScale(d)).sub(up.uniformScale(Math.tan(this.stripBelowFaceDeg * Math.PI / 180) * d))
    let y = 0
    const stack: {so: SceneObject; h: number}[] = []
    if (this.caption.isVisible) stack.push({so: this.caption.getSceneObject(), h: this.caption.sizeCm.y})
    const s = this.surface()
    if (s) stack.push({so: s.so, h: s.size.y})
    if (this.speakPrompt && this.speakTurn && !this.speakTurn.silent) stack.push({so: this.speakPrompt.getSceneObject(), h: this.speakPrompt.sizeCm.y})
    // the whole column must stay inside the view below his face: if it would not, his subtitle (already
    // heard and read) gives way to the reply
    const room = (Math.tan(this.stripMaxBelowDeg * Math.PI / 180) - Math.tan(this.stripBelowFaceDeg * Math.PI / 180)) * d
    const total = (list: {h: number}[]) => list.reduce((a, it) => a + it.h, 0) + Math.max(0, list.length - 1) * this.stripSpacingCm
    if (stack.length > 1 && this.caption.isVisible && total(stack) > room) {
      this.caption.hide()
      this.captionHideAt = -1
      stack.shift()
    }
    for (const it of stack) {
      placeFacingUser(it.so, top.sub(up.uniformScale(y + it.h / 2)))
      y += it.h + this.stripSpacingCm
    }
  }

  /** While a speak turn is open, the say-it strip sits directly below the answer surface, turned like it. */
  private placePrompt(): void {
    if (!this.speakPrompt || !this.speakTurn || this.speakTurn.silent) return
    if (this.conversationInView && this.talking) {
      this.placeStrip()
      return
    }
    const s = this.surface()
    if (!s) return
    const st = s.so.getTransform(), pt = this.speakPrompt.getSceneObject().getTransform()
    const drop = s.size.y / 2 + PROMPT_GAP_CM + this.speakPrompt.sizeCm.y / 2
    pt.setWorldPosition(st.getWorldPosition().sub(st.up.uniformScale(drop)))
    pt.setWorldRotation(st.getWorldRotation())
  }

  private showCaption(hu: string, en: string): void {
    this.caption.show(hu, en)
    this.captionHideAt = -1
    if (this.conversationInView) {
      this.placeStrip()
      return
    }
    // in front of his chest like a subtitle: above his head it floated over the menu board's text,
    // beside his head it ran off the edge of the narrow view
    placeFacingUser(this.caption.getSceneObject(), this.server.getCaptionAnchor(), true)
  }

  /** Prep: the server notices a learner who stands near the counter and faces him for a moment. */
  private tickNotice(): void {
    if (!this.active || this.waitingFor !== "ready") {
      this.noticeT = 0
      return
    }
    const cam = camPos()
    // walking in with the sentence half-built: the panel comes along until the counter tray takes it
    if (this.phraseHelperVisible && this.placedFrom) {
      const near = this.nearTray()
      if (near !== this.placedNearTray || (!near && horizDist(cam, this.placedFrom) > 120)) this.placeSurface()
    }
    if (!this.serverNotices) return
    const sp = this.server.getSceneObject().getTransform().getWorldPosition()
    // facing = looking up at his face, not down at the counter: building the sentence by pointing at the
    // ingredients in front of him must not count (26 Nov: a flat angle made him greet mid-sentence)
    const face = sp.add(new vec3(0, this.server.heightCm - 12, 0))
    const toFace = face.sub(cam)
    const ang = toFace.length < 1 ? 180 : (Math.acos(Math.max(-1, Math.min(1, toFace.normalize().dot(camLook())))) * 180) / Math.PI
    const busy = !!this.learn && this.learn.hoveredId !== "" // pointing at something: still preparing
    if (horizDist(cam, sp) <= this.serverNoticeCm && ang <= this.serverNoticeDeg && !busy) this.noticeT += getDeltaTime()
    else this.noticeT = 0
    if (this.noticeT >= this.serverNoticeSec) {
      this.noticeT = 0
      this.readyToOrder()
    }
  }

  /** Table question: the empty table number the learner keeps looking at is read like a tap. */
  private tickTableLook(): void {
    if (!this.active || this.waitingFor !== "table") return
    const cam = camPos(), look = camLook()
    let best = 0, bestAng = this.tableLookDeg
    for (const k in this.tableCards) {
      const card = this.tableCards[k]
      const info = tableByNum(card.tableNumber)
      if (!info || !info.empty) continue
      const to = card.getSceneObject().getTransform().getWorldPosition().sub(cam)
      if (to.length > this.tableLookCm) continue
      const ang = (Math.acos(Math.max(-1, Math.min(1, to.normalize().dot(look)))) * 180) / Math.PI
      if (ang <= bestAng) { bestAng = ang; best = card.tableNumber }
    }
    if (best !== this.lookTable) {
      this.lookTable = best
      this.lookT = 0
      return
    }
    if (!best) return
    this.lookT += getDeltaTime()
    if (this.lookT >= this.tableLookSec) {
      this.lookT = 0
      this.lookTable = 0
      this.readTable(best, "look")
    }
  }

  private tick(): void {
    this.tickNotice()
    this.tickTableLook()
    // the strip stays in the line of sight to the server while the learner shifts or steps
    if (this.conversationInView && this.talking && this.placedFrom && horizDist(camPos(), this.placedFrom) > 25) this.placeSurface()
    this.tickPrepFollow()
    if (this.captionHideAt > 0 && getTime() > this.captionHideAt) {
      this.captionHideAt = -1
      if (this.waitingFor !== "table") this.caption.hide()
    }
    // the say-it strip follows the detector only while a turn is open (never after "Heard you ✓")
    if (this.speakTurn !== null && this.speakPrompt) {
      const v = this.vad
      this.speakPrompt.setState(!v || !this.voiceDetection ? "off" : v.vadState, v ? v.pulse : 0, v ? v.nudgeSaidIt : false)
    }
    // edge-of-view arrow toward whatever needs attention
    if (!this.arrowTarget || (!this.active && this.orderStep < ORDER_DONE)) {
      if (this.hint.arrowVisible) this.hint.setArrow(false)
      return
    }
    const cam = camTransform()
    const to = this.arrowTarget.sub(cam.getWorldPosition())
    const look = camLook()
    const ang = (Math.acos(Math.max(-1, Math.min(1, to.normalize().dot(look)))) * 180) / Math.PI
    if (ang < this.arrowInViewDeg) {
      this.hint.setArrow(false)
      if (this.waitingFor === "done" && to.length < 160) this.arrowTarget = null
      return
    }
    // project into the view plane: x = right, y = up
    const right = cam.right, up = cam.up
    let x = to.dot(right), y = to.dot(up)
    if (Math.abs(x) + Math.abs(y) < 1e-3) x = 1
    // behind the user: point straight left/right ("turn around") rather than diagonally
    const angle = to.dot(look) < 0 ? (x >= 0 ? 0 : Math.PI) : Math.atan2(y, x)
    this.hint.setArrow(true, angle)
  }
}
