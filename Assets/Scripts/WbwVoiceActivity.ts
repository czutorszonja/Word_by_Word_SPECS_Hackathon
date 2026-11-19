// WbwVoiceActivity.ts — "Say it out loud" (Use it live): tells the order flow that the learner
// SPOKE (voice activity), never WHAT they said. Non-UI. No recognition, no internet.
// Owns: the Microphone Audio feed (start/stop), the mic level (RMS dBFS of 20 ms blocks after an
//       80 Hz high-pass), the room noise model (floor + spread: a brief calibration, then slow
//       tracking while the Lens is silent) and the one-turn speak state machine
//       guard → listening → candidate → speech → done.
// CONTRACT = this header + the sketch at the bottom. It supersedes the R1_voice.md §4.6 skeleton and the
//   §5.1 snippets, but keeps their names, so INTEGRATION_PLAN §3.7 / §4.9 / §4.10 code compiles unchanged:
//   init(gate, micAudio?)  WbwMain, once. gate = the WbwAudioController (isBusy(), optional isVoiceBusy())
//                          or a () => boolean. micAudio = WbwMain's Microphone Audio @input: a component
//                          created at runtime gets no @inputs before onAwake (plan D21).
//   setMicActive(on)       entering / leaving Use it live, so the floor is known before a turn starts.
//   setVoiceDetection(on)  the inspector toggle WbwOrderController.voiceDetection (Phase C decision Q13):
//                          off = the mic path is off for recordings, only the Said it button ends a turn.
//   Arming: two equivalent styles. Pick ONE per controller:
//     a) plan / R1 style: arm(onEnd, clipSec) → onEnd("mic") once, after the learner stopped speaking;
//        saidIt() → onEnd("button") (returns false if no turn was armed); disarm() closes silently.
//     b) start(timeoutSec, clipSec) + onSpeechDetected; stop() closes silently (Said it, step change,
//        mode exit: the controller then handles Said it itself).
//   Re-arming an open turn (the same call again) keeps arm()'s callback, drops any half-heard
//   utterance, restarts the tail guard and recomputes minSpeech for the new clip length.
// THE CONTROLLER OWNS waitingForSpeech: it sets it when it arms and clears it in its onSaid (R4 c.4,
//   plan 4.9 `speakTurn !== null`). Never mirror this detector's `listening` / `waitingForSpeech`, and never
//   guard onSaid on them: they are already false while onEnd / onSpeechDetected run.
// speechDetected HERE = confirmed MIC speech only (Said it never sets it). The controller sets
//   speechDetected = (source === "mic") and speechSource = source in its onSaid. After tapping
//   SaidItButton, LEAF waits on !order.waitingForSpeech (StoryTour.ts:274, plan §8.1), not on
//   speechDetected. The "wait for speechDetected" wording in R1 §5.5 and R5_arrival.md:260 is superseded.
// WHEN TO ARM (agreed design item 7; plan D13 / D14). clipSec always = audio.durationOf(key) (sketch):
//   phrase card (steps 1, 3, 4, 5, 6): playVoice(card clip), then arm right away (the gate holds detection
//     until the clip ends + tailGuardSec), or arm in the clip's onDone. Both are fine.
//   step 2 helper: when "Mit kér bele?" ends and phraseSlotIds is non-empty (or later, when the first word
//     is chosen), arm with durationOf(phraseAudioKey). There is no playback, so minSpeech must come from
//     the phrase length (p_kerek_* = 2.19–2.77 s → 0.66–0.8 s, R1 §4.3). The 0.5 s default lets
//     self-talk submit while the learner browses ingredients.
//   UseThisWord / AddWord / pattern change at step 2: optionally playVoice(new phrase) first, then re-arm
//     with the new phrase's duration. The controller's turn stays open (R4 c.4).
//   Listen again / PhraseHelperListenButton: playVoice only. The gate covers it; no re-arm needed.
// NO SOUND BETWEEN ARMING AND THE END OF THE TURN. "Heard you…" on onSpeechStarted is VISUAL only.
//   Any Lens clip restarts the guard: an SFX before speech is confirmed, a voice clip at any time. So a
//   "your turn" or "heard you" chime would eat the learner's first syllables or their whole answer.
//   With a gate that has isVoiceBusy(), an SFX during confirmed speech is tolerated. Don't rely on it.
// Events: onSpeechStarted (speech confirmed; the turn is not over), onSpeechDetected (once per turn,
//   AFTER the learner stops, so the server never talks over them), onTimeout (UI nudges "Said it"),
//   onStateChanged, onMicStatusChanged.
// Must NOT: play audio, show UI, judge correctness, decide what happens next, advance on a timeout,
//   or keep/record/upload samples (levels only; getAudioFrame is @exposesUserData).
// No microphone (no asset, wrong asset, start() throws, Preview mic toggle off, maxFrameSize 0, or
//   voiceActivityEnabled off): micAvailable = false, vadState "nosignal", no speech event ever fires.
//   The Said it button is the way on. onTimeout still fires so the UI can nudge.
// Detector changes vs R1 §4.3 (review fixes):
//   - floor tracker down 0.05 / up 0.01 (≈ mean − 0.6σ, not − 1.4σ), plus a tracked spread σ;
//   - release = floor + max(releaseDb, 2.5σ); onset keeps its gap above release;
//   - `voiced` counts only blocks ≥ (onset + release) / 2;
//   - speech ends when ≥ 85 % of the end window is quiet: endSilenceSec 0.7 s once half the model phrase
//     is voiced, otherwise hesitationSilenceSec 1.2 s (beginners pause between words);
//   - maxUtterSec of continuous sound is NOISE: no event, the floor is raised to it, listening goes on;
//   - exact-zero blocks are quiet time inside an utterance; the gate is checked before them;
//   - a stuck gate cannot hold the timeout nudge forever.
// Readable state (LEAF / UI): listening (= waitingForSpeech, detector side only), vadState, level,
//   micLevelDb, noiseFloor (= noiseFloorDb), noiseSpread, calibrated, speechDetected, speechSource,
//   micAvailable, micStatus, gated, timedOut, nudgeSaidIt, noisy, pulse, turnCount (= armCount),
//   detectCount, noiseRejectCount, lastSpeechSec, lastResult, sampleRateActual, measuredRate.
//   Test hooks: ignoreMicForTests (setter), injectBlocksForTest(db, count, gated), recalibrate(),
//   settleBlocks, minSpeechBlocks, endSilenceBlocksMax.
// Lens API used (Support/StudioLib.d.ts): getTime :9, print :56, isNull :60,
//   ScriptObject.getTypeName :91 + .isOfType :95, AudioTrackProvider.sampleRate :3848 +
//   .maxFrameSize :3854, AudioTrackAsset.control :4010, MicrophoneAudioProvider :26178
//   (static getTypeName :26188, .getAudioFrame :26195, .start :26208, .stop :26214),
//   ScriptComponent.createEvent :14196 with EventNameMap keys
//   "OnDestroyEvent" :34319, "OnDisableEvent" :34322, "OnEnableEvent" :34323, "UpdateEvent" :34350.
//   Sketch only: AudioComponent.isPlaying :25918, FileAudioTrackProvider.duration :4615.
//   Decorators + SliderWidget: Cache/TypeScript/lib/LensifyTS/Declarations (as every Wbw script).
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"

/** The playback gate init() accepts. WbwAudioController fits once isBusy() is added (sketch). */
export interface PlaybackGate {
  /** True while ANY Lens clip plays (voice or SFX) or a voice clip's finish is still pending. */
  isBusy(): boolean
  /** Optional: the same for the voice channel only (SFX ignored). Used while speech is confirmed. */
  isVoiceBusy?(): boolean
}

/** One finished speak turn (payload of onSpeechDetected). */
export interface VoiceTurnResult {
  /** turnCount of the start()/arm() that armed this turn. */
  turn: number
  /** "mic" = real microphone audio; "synthetic" = injectBlocksForTest (LEAF). onEnd gets "mic" for both. */
  source: "mic" | "synthetic"
  /** Seconds from the speech onset to the start of the closing silence. */
  speechSec: number
  /** Seconds of clearly voiced blocks (≥ the middle threshold) in the utterance. */
  voicedSec: number
  /** Loudest 20 ms block of the utterance (dBFS). */
  peakDb: number
  /** Noise floor when the turn ended (dBFS). */
  noiseFloorDb: number
  /** Noise spread σ when the turn ended (dB). */
  noiseSpreadDb: number
  /** The end window that closed the turn (s): endSilenceSec (fluent) or hesitationSilenceSec. */
  endWindowSec: number
}

const SILENT_DB = -120          // level reported with no signal, the mic off, or while a Lens clip plays
const BLOCK_SEC = 0.02          // VAD block length (R1 §4.3)
const REQUESTED_RATE = 16000    // asked for; the device may keep its own rate (read back)
const HPF_HZ = 80               // one-pole high-pass: DC offset, HVAC/fridge rumble, footsteps
const START_DISCARD_SEC = 0.15  // start-up transient / stale buffer right after start()
const FLOOR_DEFAULT = -60
const FLOOR_MIN = -85           // digital-silence guard
const FLOOR_MAX = -30
// Floor tracker (asymmetric EMA per block). 0.05 / 0.01 settles near mean − 0.6σ of the block levels.
// R1's 0.2 / 0.005 settled near mean − 1.4σ, which put "release" inside babble-type noise.
const FLOOR_DOWN = 0.05         // per block when quieter than the floor (~0.4 s)
const FLOOR_UP = 0.01           // per block when louder but below onset (~2 s)
const FLOOR_UP_LOUD = 0.001     // per block when above onset outside an utterance (~20 s: steady chatter only)
const SPREAD_ALPHA = 0.02       // noise mean/variance EMA per quiet block (~1 s)
const SPREAD_DEFAULT = 2        // dB, before the first calibration
const SPREAD_MAX = 8            // dB
const RELEASE_SPREAD_K = 2.5    // release ≥ floor + 2.5σ, so noise rarely counts as voiced
const CALIB_PERCENTILE = 0.2    // robust even if the learner talks during part of the calibration
const END_QUIET_FRACTION = 0.85 // speech ends when this share of the end window is below release
const FLUENT_VOICED_FRACTION = 0.5  // voiced ≥ this × expectedPhraseSec → the short (fluent) end window
const QUIET_RING = 160          // end-window history in blocks (3.2 s at 20 ms; slider max is 2.5 s)
const RUN_RING = 800            // levels of the current utterance in blocks (16 s), for the noise rejection
const LEVEL_EMA = 0.3
const NONZERO = 1e-6
const PULSE_RANGE_DB = 24       // level above the floor that maps to pulse = 1
const RATE_MEASURE_DELAY_SEC = 0.5
const RATE_MEASURE_SEC = 2
const STANDARD_RATES = [8000, 11025, 16000, 22050, 24000, 32000, 44100, 48000]
const GATE_HOLD_MIN_PHRASE_SEC = 3  // one continuous gate holds the timeout ≤ max(expectedPhraseSec, 3) + 2.5 s
const GATE_HOLD_EXTRA_SEC = 2.5
const GATE_STUCK_WARN_SEC = 10

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

function round(v: number, digits: number): number {
  const f = Math.pow(10, digits)
  return Math.round(v * f) / f
}

@component
export class WbwVoiceActivity extends BaseScriptComponent {
  @ui.label('WbwVoiceActivity – "say it out loud" detector (voice activity only, no recognition)')
  @ui.separator
  @ui.group_start("Microphone")
  @input
  @allowUndefined
  @hint("Microphone Audio asset (Asset Browser → + → Microphone Audio). Empty = Said-it-only mode, unless init() passes one. Referencing it also shows the Preview mic button (bottom-left).")
  micAudio: AudioTrackAsset | undefined

  @input
  @hint("Detect that the learner spoke. Off = only the Said it button advances (the mic is never started).")
  voiceActivityEnabled: boolean = true
  @ui.group_end
  @ui.group_start("Detection (tune on device)")
  @input
  @hint("Speech onset: dB above the noise floor (raised automatically in fluctuating noise so it stays this far above release)")
  @widget(new SliderWidget(6, 24, 1))
  onsetDb: number = 12

  @input
  @hint("Release (hysteresis): dB above the floor that still counts as sound, so quiet syllables don't split the phrase. Never below 2.5 × the noise spread.")
  @widget(new SliderWidget(2, 12, 1))
  releaseDb: number = 6

  @input
  @hint("Onset is never below this level (dBFS), so faint hiss in a digitally quiet room is not speech")
  @widget(new SliderWidget(-75, -35, 1))
  absMinOnsetDbfs: number = -55

  @input
  @hint("Minimum voiced time for short phrases (s). Rejects coughs, clicks, pinch taps, a muttered word.")
  @widget(new SliderWidget(0.2, 1.5, 0.05))
  minSpeechMinSec: number = 0.5

  @input
  @hint("Minimum voiced time for long phrases (s). Per turn: 0.3 × expectedPhraseSec, clamped to [min, max].")
  @widget(new SliderWidget(0.3, 2, 0.05))
  minSpeechMaxSec: number = 0.8

  @input
  @hint("Longest pause inside an unconfirmed onset before it is dropped (s)")
  @widget(new SliderWidget(0.1, 0.6, 0.05))
  preGapSec: number = 0.3

  @input
  @hint("End window once the learner has voiced at least half of the model phrase (s): 85 % of it quiet = finished, onSpeechDetected fires")
  @widget(new SliderWidget(0.3, 1.5, 0.05))
  endSilenceSec: number = 0.7

  @input
  @hint("End window before that, or when the phrase length is unknown (s). Beginners pause 0.7–1.2 s between words.")
  @widget(new SliderWidget(0.6, 2.5, 0.05))
  hesitationSilenceSec: number = 1.2

  @input
  @hint("Continuous sound this long is NOT an answer (order phrases are 1–3 s): no event, the floor is raised to it, listening goes on (s)")
  @widget(new SliderWidget(3, 15, 0.5))
  maxUtterSec: number = 8
  @ui.group_end
  @ui.group_start("Timing")
  @input
  @hint("Brief noise-floor calibration after the mic starts or its signal returns (s of quiet, non-gated audio)")
  @widget(new SliderWidget(0.2, 2, 0.1))
  calibrationSec: number = 0.4

  @input
  @hint("Ignore the mic this long after any Lens clip stops (s): speaker ring-down, room echo, timing slop")
  @widget(new SliderWidget(0, 1, 0.05))
  tailGuardSec: number = 0.35

  @input
  @hint("Listen timeout when start() gets none (s): onTimeout fires and the UI nudges Said it. Never auto-advances.")
  @widget(new SliderWidget(2, 20, 0.5))
  defaultListenTimeoutSec: number = 8

  @input
  @hint("Listen timeout in a noisy room (s); the shorter of this and the turn's timeout wins")
  @widget(new SliderWidget(2, 10, 0.5))
  noisyListenTimeoutSec: number = 4

  @input
  @hint("A noise floor above this (dBFS) counts as a noisy room")
  @widget(new SliderWidget(-50, -25, 1))
  noisyFloorDbfs: number = -38

  @input
  @hint("No non-zero sample for this long = no mic signal, e.g. the Preview mic toggle is off (s)")
  @widget(new SliderWidget(0.5, 5, 0.1))
  noSignalSec: number = 1.5
  @ui.group_end
  @ui.group_start("Debug")
  @input
  @hint("Print state changes with level, floor and spread (for tuning on device)")
  debugLog: boolean = false
  @ui.group_end

  // ── readable state (LEAF / UI) ──
  /** Detector side: a turn is armed (start()/arm() called, not yet ended or stopped). Also true without
   *  a mic. NOT the controller's waitingForSpeech: it is already false inside onEnd / onSpeechDetected. */
  listening: boolean = false
  /** off | guard | calibrating | listening | candidate | speech | done | nosignal */
  vadState: string = "off"
  /** Smoothed mic level in dBFS. SILENT_DB (-120) with no signal, the mic off, or while a Lens clip plays. */
  level: number = SILENT_DB
  /** Learned room noise floor in dBFS. */
  noiseFloor: number = FLOOR_DEFAULT
  /** Spread (σ, dB) of the 20 ms noise levels: 0.3–1 dB for steady hiss, 2–4 dB for babble. */
  noiseSpread: number = SPREAD_DEFAULT
  /** The brief calibration finished since the mic last started or its signal returned. */
  calibrated: boolean = false
  /** Confirmed MIC speech (≥ minimum voiced time) in the current or last turn. Reset by start(); cleared
   *  if a Lens voice clip starts mid-utterance or the sound is rejected as noise. Said it never sets it. */
  speechDetected: boolean = false
  /** How the last turn ended: "" (open or stopped), "mic" (detection, injected blocks included), "button" (saidIt()). */
  speechSource: string = ""
  /** The mic delivers real (non-zero) audio right now. */
  micAvailable: boolean = false
  /** none (no usable mic) | idle (not running) | checking | ok | nosignal | error */
  micStatus: string = "none"
  /** A Lens clip is playing (isPlaybackActive): detection is held. */
  gated: boolean = false
  /** The listen timeout passed in this turn without confirmed speech (UI: pulse Said it). */
  timedOut: boolean = false
  /** The noise floor is above noisyFloorDbfs. */
  noisy: boolean = false
  /** Number of start()/arm() calls this session (re-arms included). */
  turnCount: number = 0
  /** Number of turns ended by detected speech this session. */
  detectCount: number = 0
  /** Number of maxUtterSec runs of continuous sound rejected as noise this session. */
  noiseRejectCount: number = 0
  /** speechSec of the last detected turn (0 after start()). */
  lastSpeechSec: number = 0
  /** Payload of the last onSpeechDetected. */
  lastResult: VoiceTurnResult | null = null
  /** Sample rate in use (read back after asking for 16000, or adopted from measurement). */
  sampleRateActual: number = 0
  /** Samples per second actually delivered (real audio only), measured ~2.5 s after the mic starts (0 = not yet). */
  measuredRate: number = 0

  private _onSpeechStarted = new Event<number>()
  private _onSpeechDetected = new Event<VoiceTurnResult>()
  private _onTimeout = new Event<number>()
  private _onStateChanged = new Event<string>()
  private _onMicStatusChanged = new Event<string>()
  /** Speech confirmed in the current turn (arg: turnCount). The turn is not over yet. Visual feedback only. */
  get onSpeechStarted(): PublicApi<number> { return this._onSpeechStarted.publicApi() }
  /** The learner spoke and has stopped: fires once per turn, never while a Lens voice clip plays. */
  get onSpeechDetected(): PublicApi<VoiceTurnResult> { return this._onSpeechDetected.publicApi() }
  /** The listen timeout passed without speech (arg: turnCount). Listening goes on. */
  get onTimeout(): PublicApi<number> { return this._onTimeout.publicApi() }
  /** vadState changed (arg: the new state). */
  get onStateChanged(): PublicApi<string> { return this._onStateChanged.publicApi() }
  /** micStatus changed (arg: the new status). */
  get onMicStatusChanged(): PublicApi<string> { return this._onMicStatusChanged.publicApi() }

  /** Same as listening (R1 name). Detector side only: see the header before mirroring anything. */
  get waitingForSpeech(): boolean { return this.listening }
  /** R1 name: the timeout passed and the turn is still open (Said it pulses). */
  get nudgeSaidIt(): boolean { return this.timedOut && this.listening }
  /** R1 name: the level for the mic indicator, SILENT_DB while our own clip or its tail guard is held. */
  get micLevelDb(): number { return this.gated || this.skipBlocks > 0 ? SILENT_DB : this.level }
  /** R1 name for noiseFloor. */
  get noiseFloorDb(): number { return this.noiseFloor }
  /** R1 name for turnCount. */
  get armCount(): number { return this.turnCount }
  /** 0..1 for the mic indicator pulse: level above the floor, over 24 dB. 0 while a Lens clip plays or
   *  its tail guard runs, so the indicator never pulses with the Lens's own voice. */
  get pulse(): number {
    if (!this.micAvailable || this.gated || this.skipBlocks > 0 || this.level <= SILENT_DB) return 0
    return clamp((this.level - this.noiseFloor) / PULSE_RANGE_DB, 0, 1)
  }
  /** A Microphone Audio provider is wired and has not failed. */
  get hasMic(): boolean { return this.mic !== null && !this.micBroken }
  /** The mic is started (start() on the provider). */
  get micRunning(): boolean { return this.running }
  /** LEAF: quiet blocks that take an armed turn through the tail guard and calibration to "listening". */
  get settleBlocks(): number {
    const calibLeft = this.calibrated ? 0 : Math.max(0, this.blocks(this.calibrationSec) - this.calib.length)
    return this.skipBlocks + calibLeft + 1
  }
  /** LEAF: voiced blocks the current turn needs before "speech" (25–40 at 20 ms, by clip length). */
  get minSpeechBlocks(): number { return this.blocks(this.minSpeechSec) }
  /** LEAF: quiet blocks that always end a confirmed utterance (the longer end window). */
  get endSilenceBlocksMax(): number {
    return Math.min(QUIET_RING, this.blocks(Math.max(this.endSilenceSec, this.hesitationSilenceSec)))
  }
  /** LEAF: ignore real mic frames and don't run the mic (synthetic blocks are still processed). Setting it
   *  takes effect at once: the mic stops and the floor is learned again from the injected blocks. */
  get ignoreMicForTests(): boolean { return this._ignoreMic }
  set ignoreMicForTests(v: boolean) {
    const on = !!v
    if (on === this._ignoreMic) return
    this._ignoreMic = on
    if (on) this.recalibrate()
    this.syncMic()
    if (this.listening && this.vadState === "nosignal" && this.canDetect()) this.setState("guard")
  }

  private isPlaybackActive: () => boolean = () => false
  private isVoicePlaying: (() => boolean) | null = null
  private onEnd: ((source: "mic" | "button") => void) | null = null
  private _ignoreMic = false
  private gateSet = false
  private gateWarned = false
  private gateErrorWarned = false
  private gateStuckWarned = false
  private gateSince = -1
  private noMicAnnounced = false
  private mic: MicrophoneAudioProvider | null = null
  private micBroken = false
  private running = false
  private micWanted = false
  private componentActive = true
  private buf: Float32Array | null = null
  private rate = REQUESTED_RATE
  private blockLen = 320
  private blockSec = BLOCK_SEC
  private hpfR = 0.969
  private xPrev = 0
  private yPrev = 0
  private sumSq = 0
  private k = 0
  private blockNonZero = false
  private skipBlocks = 0
  private calib: number[] = []
  private noiseMean = FLOOR_DEFAULT
  private noiseVar = SPREAD_DEFAULT * SPREAD_DEFAULT
  private onsetNow = FLOOR_DEFAULT + 12
  private releaseNow = FLOOR_DEFAULT + 6
  private midNow = FLOOR_DEFAULT + 9
  private timeoutSec = 8
  private timeoutFired = true
  private listenSince = 0
  private expectedSec = 0
  private minSpeechSec = 0.5
  private voiced = 0
  private gap = 0
  private silence = 0
  private utter = 0
  private peakDb = SILENT_DB
  private quietRing = new Uint8Array(QUIET_RING)
  private quietHead = 0
  private quietFilled = 0
  private runLevels = new Float32Array(RUN_RING)
  private runHead = 0
  private runCount = 0
  private injecting = false
  private micStartedAt = 0
  private lastSignalAt = -1
  private rateFrom = 0
  private rateT0 = -1
  private rateSamples = 0
  private rateDone = false

  onAwake(): void {
    this.applyRate(REQUESTED_RATE)
    this.resolveMic(false)                        // silent if empty: init() may still pass the asset (D21)
    this.createEvent("UpdateEvent").bind(() => this.tick())
    this.createEvent("OnDisableEvent").bind(() => this.onDisabled())
    this.createEvent("OnEnableEvent").bind(() => this.onEnabled())
    this.createEvent("OnDestroyEvent").bind(() => {
      this.componentActive = false
      this.listening = false
      this.onEnd = null
      this.stopMic()
    })
  }

  // ── public API ──

  /**
   * Wire the playback gate (and the mic asset when the component was created at runtime, plan D21).
   * @param gate the WbwAudioController (isBusy(), optional isVoiceBusy()) or a () => boolean that is true
   *        while ANY Lens audio plays or a clip's finish is pending.
   * @param micAudio Microphone Audio asset; omitted or empty keeps the @input (empty = Said-it-only mode).
   */
  init(gate: PlaybackGate | (() => boolean), micAudio?: AudioTrackAsset | null): void {
    if (typeof gate === "function") {
      this.isPlaybackActive = gate
      this.isVoicePlaying = null
    } else if (gate) {
      const g = gate
      this.isPlaybackActive = () => g.isBusy()
      const vb = g.isVoiceBusy
      this.isVoicePlaying = vb ? () => vb.call(g) : null
    }
    this.gateSet = true
    if (micAudio && !isNull(micAudio) && micAudio !== this.micAudio) {
      this.stopMic()
      this.micAudio = micAudio
      this.micBroken = false
      this.resolveMic(true)
    } else if (!this.mic) {
      this.resolveMic(true)
    }
    this.syncMic()
  }

  /** Keep the mic running between turns (Use it live on/off), so the floor is known in advance. */
  setMicActive(on: boolean): void {
    this.micWanted = on
    this.syncMic()
  }

  /**
   * Inspector toggle hook (WbwOrderController.voiceDetection, Phase C decision Q13). false = the mic path is
   * off: the mic is never started and only the Said it button ends a turn (for recordings). true = normal.
   * Safe at any time: an armed turn stays open and drops any half-heard utterance; it shows "nosignal"
   * (Said it) while off and returns to "guard" when detection comes back.
   */
  setVoiceDetection(on: boolean): void {
    const v = !!on
    if (v === this.voiceActivityEnabled) return
    this.voiceActivityEnabled = v
    this.syncMic()
    if (!this.listening) return
    this.speechDetected = false
    this.resetTurnCounters()
    this.listenSince = getTime()
    this.gateSince = -1
    this.setState(this.canDetect() ? "guard" : "nosignal")
  }

  /**
   * Arm one speak turn, or re-arm the open one (keeps an arm() callback). Safe while our own clip plays:
   * nothing counts while isPlaybackActive() is true, nor for tailGuardSec after it.
   * @param listenTimeoutSec seconds of quiet listening before onTimeout (UI nudges Said it).
   *        Omitted or < 0: defaultListenTimeoutSec. 0: no timeout. Listening continues after it.
   * @param expectedPhraseSec length of the phrase to be said (audio.durationOf(key)); the minimum voiced
   *        time is 0.3 × this, clamped to [minSpeechMinSec, minSpeechMaxSec], and the fluent end window
   *        applies once half of it is voiced. Omitted: minSpeechMinSec and always hesitationSilenceSec.
   */
  start(listenTimeoutSec?: number, expectedPhraseSec?: number): void {
    if (!this.gateSet && !this.gateWarned) {
      this.gateWarned = true
      print("WbwVoice: init(gate) not called; only tailGuardSec keeps the Lens's own clips out")
    }
    this.turnCount++
    this.listening = true
    this.speechDetected = false
    this.speechSource = ""
    this.timedOut = false
    this.timeoutFired = false
    this.lastSpeechSec = 0
    this.timeoutSec = listenTimeoutSec === undefined || listenTimeoutSec === null || listenTimeoutSec < 0
      ? this.defaultListenTimeoutSec
      : listenTimeoutSec
    this.expectedSec = expectedPhraseSec !== undefined && expectedPhraseSec !== null && expectedPhraseSec > 0
      ? expectedPhraseSec
      : 0
    const maxSec = Math.max(this.minSpeechMinSec, this.minSpeechMaxSec)
    this.minSpeechSec = this.expectedSec > 0
      ? clamp(0.3 * this.expectedSec, this.minSpeechMinSec, maxSec)
      : this.minSpeechMinSec
    this.resetTurnCounters()
    this.skipBlocks = Math.max(this.skipBlocks, this.blocks(this.tailGuardSec))
    this.listenSince = getTime()
    this.gateSince = -1                            // each arm gets its own gate-hold budget
    this.syncMic()
    this.setState(this.canDetect() ? "guard" : "nosignal")
    this.log(`start turn ${this.turnCount} timeout=${this.timeoutSec}s minSpeech=${this.minSpeechSec.toFixed(2)}s expected=${this.expectedSec.toFixed(2)}s`)
  }

  /** Close the current turn without an event or callback (step change, mode exit, Said it in style b). */
  stop(): void {
    this.listening = false
    this.onEnd = null
    this.timeoutFired = true
    this.resetTurnCounters()
    this.setState("off")
    this.syncMic()
  }

  /** Plan / R1 style: start() plus a one-shot callback ("mic" after the learner stopped, or "button"). */
  arm(onEnd: (source: "mic" | "button") => void, clipSec: number = 1.2): void {
    this.start(-1, clipSec)
    this.onEnd = onEnd
  }

  /** Plan / R1 style Said it: ends the armed turn with onEnd("button"). False if no turn was armed (then
   *  the controller calls its own onSaid("button")). Does not fire onSpeechDetected or set speechDetected. */
  saidIt(): boolean {
    if (!this.listening) return false
    this.listening = false
    this.timeoutFired = true
    this.speechSource = "button"
    this.resetTurnCounters()
    this.setState("done")
    this.log(`said it (button), turn ${this.turnCount}`)
    const cb = this.onEnd
    this.onEnd = null
    if (cb) cb("button")
    this.syncMic()
    return true
  }

  /** Plan / R1 name for stop(). */
  disarm(): void {
    this.stop()
  }

  /** Forget the noise floor and calibrate again from the next quiet blocks. */
  recalibrate(): void {
    this.calib = []
    this.calibrated = false
  }

  /**
   * LEAF: feed `count` synthetic 20 ms blocks at `db` dBFS through the real state machine,
   * synchronously. `gated` simulates our own (voice) playback; the real gate still applies.
   * Works without a mic asset (a "nosignal" turn switches to "guard").
   */
  injectBlocksForTest(db: number, count: number, gated: boolean = false): void {
    if (this.listening && this.vadState === "nosignal" && this.voiceActivityEnabled) this.setState("guard")
    this.injecting = true
    for (let i = 0; i < count; i++) {
      const all = gated || this.safeGate()
      this.onBlock(db, all, true, gated || this.safeVoiceGate(all))
    }
    this.injecting = false
  }

  // ── mic lifecycle ──

  private resolveMic(announce: boolean): void {
    this.mic = null
    if (!this.micAudio || isNull(this.micAudio)) {
      if (announce && !this.noMicAnnounced) {
        this.noMicAnnounced = true
        print("WbwVoice: no Microphone Audio asset; Said-it-only mode")
      }
      this.setMicStatus("none")
      return
    }
    // AudioTrackAsset.control (:4010). Accept it by type (ScriptObject.isOfType :95 with the static
    // MicrophoneAudioProvider.getTypeName :26188), else by shape: only MicrophoneAudioProvider
    // (:26178) has start/stop next to getAudioFrame; a file (FileAudioTrackProvider :4587) has
    // getAudioFrame but no start/stop.
    const ctrl = this.micAudio.control
    const c = ctrl as any
    let isMic = false
    try {
      isMic = !!ctrl && ctrl.isOfType(MicrophoneAudioProvider.getTypeName())
    } catch (e) {
      isMic = false
    }
    if (!isMic) isMic = !!ctrl && typeof c.getAudioFrame === "function" && typeof c.start === "function" && typeof c.stop === "function"
    if (!isMic) {
      print(`WbwVoice: micAudio is not a Microphone Audio asset (${ctrl ? ctrl.getTypeName() : "no control"}); Said-it-only mode`)
      this.setMicStatus("none")
      return
    }
    this.mic = ctrl as MicrophoneAudioProvider
    this.requestRate()
    this.setMicStatus(this.micUsable() ? "idle" : "none")
  }

  private requestRate(): void {
    if (!this.mic) return
    try {
      this.mic.sampleRate = REQUESTED_RATE        // AudioTrackProvider.sampleRate :3848 (writable)
      const actual = this.mic.sampleRate          // read back: the device may keep its own rate
      this.applyRate(actual > 0 ? actual : REQUESTED_RATE)
    } catch (e) {
      this.applyRate(REQUESTED_RATE)
    }
  }

  private applyRate(rate: number): void {
    this.rate = rate
    this.sampleRateActual = rate
    this.blockLen = Math.max(80, Math.round(BLOCK_SEC * rate))
    this.blockSec = this.blockLen / rate
    this.hpfR = Math.exp((-2 * Math.PI * HPF_HZ) / rate)
  }

  private micUsable(): boolean {
    return this.voiceActivityEnabled && this.mic !== null && !this.micBroken
  }

  /** Mic runs while wanted by Use it live or by an armed turn, and the component is enabled. */
  private syncMic(): void {
    const want = this.micUsable() && this.componentActive && !this._ignoreMic && (this.micWanted || this.listening)
    if (want && !this.running) this.startMic()
    else if (!want && this.running) this.stopMic()
  }

  private startMic(): void {
    if (!this.mic || this.running) return
    try {
      this.requestRate()
      this.mic.start()                            // MicrophoneAudioProvider.start :26208
      const after = this.mic.sampleRate
      if (after > 0 && after !== this.rate) this.applyRate(after)
    } catch (e) {
      this.micBroken = true
      print(`WbwVoice: microphone failed to start (${e}); Said-it-only mode`)
      this.setMicStatus("error")
      this.enterNoMic()
      return
    }
    this.running = true
    this.micStartedAt = getTime()
    this.lastSignalAt = -1
    this.resetBlockAccumulator()
    this.skipBlocks = Math.max(this.skipBlocks, this.blocks(START_DISCARD_SEC))
    this.recalibrate()
    this.restartRateMeasure(this.micStartedAt)
    this.setMicStatus("checking")
  }

  private stopMic(): void {
    if (!this.mic || !this.running) return
    this.running = false
    try {
      this.mic.stop()                             // MicrophoneAudioProvider.stop :26214
    } catch (e) {
      // already stopped
    }
    this.level = SILENT_DB
    this.micAvailable = false
    this.setMicStatus(this.micUsable() ? "idle" : "none")
  }

  /** The mic stopped working mid-session: the armed turn falls back to Said it. */
  private enterNoMic(): void {
    this.running = false
    this.micAvailable = false
    this.level = SILENT_DB
    if (this.listening) {
      this.speechDetected = false
      this.resetTurnCounters()
      this.setState("nosignal")
    }
  }

  private canDetect(): boolean {
    if (!this.voiceActivityEnabled) return false
    if (this._ignoreMic) return true
    return this.running && this.micStatus !== "nosignal" && this.micStatus !== "error"
  }

  /** Nothing is heard while disabled: drop any half-heard utterance (UpdateEvent stops too). */
  private onDisabled(): void {
    this.componentActive = false
    this.syncMic()
    if (this.listening) {
      this.speechDetected = false
      this.resetTurnCounters()
      this.setState("nosignal")
    }
  }

  private onEnabled(): void {
    this.componentActive = true
    this.syncMic()                                 // restarts the mic: discard + recalibration
    if (this.listening) {
      this.listenSince = getTime()                 // no stale timeout from before the disable
      this.gateSince = -1
      this.setState(this.canDetect() ? "guard" : "nosignal")
    }
  }

  // ── per frame ──

  private tick(): void {
    const now = getTime()
    const gatedNow = this.safeGate()
    const voiceGatedNow = this.safeVoiceGate(gatedNow)
    this.gated = gatedNow
    if (gatedNow) {
      if (this.gateSince < 0) this.gateSince = now
    } else {
      this.gateSince = -1
    }
    if (gatedNow && this.listening) this.holdTimeout(now)   // the timeout counts quiet listening only
    this.checkTimeout(now)
    if (!this.running || !this.mic || this._ignoreMic) return

    let n = 0
    try {
      const max = this.mic.maxFrameSize           // AudioTrackProvider.maxFrameSize :3854
      if (!this.buf || this.buf.length !== max) this.buf = max > 0 ? new Float32Array(max) : null
      // No buffer (maxFrameSize 0): n stays 0 and the watchdog below still reaches "nosignal".
      // MicrophoneAudioProvider.getAudioFrame :26195; shape.x = samples written (may be 0)
      if (this.buf) n = Math.max(0, Math.min(this.buf.length, Math.floor(this.mic.getAudioFrame(this.buf).x)))
    } catch (e) {
      this.micBroken = true
      print(`WbwVoice: reading the microphone failed (${e}); Said-it-only mode`)
      try { this.mic.stop() } catch (e2) { /* ignore */ }
      this.setMicStatus("error")
      this.enterNoMic()
      return
    }

    const buf = this.buf
    let signal = false
    if (buf) {
      for (let i = 0; i < n; i++) {
        const x = buf[i]
        if (x > NONZERO || x < -NONZERO) { signal = true; this.blockNonZero = true }
        const y = this.hpfR * (this.yPrev + x - this.xPrev)
        this.xPrev = x
        this.yPrev = y
        this.sumSq += y * y
        if (++this.k >= this.blockLen) {
          const db = 10 * Math.log10(this.sumSq / this.blockLen + 1e-12)
          const nonZero = this.blockNonZero
          this.sumSq = 0
          this.k = 0
          this.blockNonZero = false
          this.onBlock(db, gatedNow, nonZero, voiceGatedNow)
          if (!this.running) return                // a callback stopped the mic
        }
      }
    }
    this.watchdog(now, signal)
    this.measureRate(now, n, signal)
  }

  private checkTimeout(now: number): void {
    if (!this.listening || this.timeoutFired || this.timeoutSec <= 0) return
    if (this.vadState === "speech") return         // the learner is talking: wait for the end instead
    const limit = this.noisy ? Math.min(this.timeoutSec, this.noisyListenTimeoutSec) : this.timeoutSec
    if (now - this.listenSince < limit) return
    this.timeoutFired = true
    this.timedOut = true
    this.log(`timeout after ${limit}s (turn ${this.turnCount})`)
    this._onTimeout.invoke(this.turnCount)
  }

  /** Our clip holds the timeout, but one continuous gate only for a phrase's length plus a margin:
   *  a stuck gate (isPlaying() stuck in a muted Preview, a throwing gate) must not silence the nudge. */
  private holdTimeout(now: number): void {
    const held = this.gateSince < 0 ? 0 : now - this.gateSince
    if (held <= Math.max(this.expectedSec, GATE_HOLD_MIN_PHRASE_SEC) + GATE_HOLD_EXTRA_SEC) this.listenSince = now
    if (held > GATE_STUCK_WARN_SEC && !this.gateStuckWarned) {
      this.gateStuckWarned = true
      print(`WbwVoice: the playback gate has been on for ${held.toFixed(0)} s while listening (AudioComponent.isPlaying() stuck, e.g. a muted Preview?); nothing can be detected, the Said it nudge still fires`)
    }
  }

  /** No non-zero sample for noSignalSec = no usable signal (Preview toggle off, no device). */
  private watchdog(now: number, signal: boolean): void {
    if (signal) {
      this.lastSignalAt = now
      if (this.micStatus !== "ok") {
        const returned = this.micStatus === "nosignal"
        this.micAvailable = true
        this.setMicStatus("ok")
        if (returned) {
          // The input may have changed (Preview toggle, another device, a louder room): learn the floor
          // again and re-measure the rate. Caveat: an input chain that sends exact zeros whenever the room
          // is quiet (noise gate) would calibrate on whatever reopened it; tune noSignalSec on device (R1 §7).
          this.recalibrate()
          this.restartRateMeasure(now)
        }
        if (this.listening && this.vadState === "nosignal" && this.voiceActivityEnabled) {
          this.skipBlocks = Math.max(this.skipBlocks, this.blocks(START_DISCARD_SEC))
          this.setState("guard")
        }
      }
      return
    }
    if (this.micStatus === "nosignal") return
    if (now - Math.max(this.lastSignalAt, this.micStartedAt) <= this.noSignalSec) return
    this.micAvailable = false
    this.level = SILENT_DB
    this.setMicStatus("nosignal")
    if (this.listening && this.vadState !== "done") {
      this.speechDetected = false
      this.resetTurnCounters()
      this.setState("nosignal")
    }
  }

  private restartRateMeasure(now: number): void {
    this.rateFrom = now
    this.rateT0 = -1
    this.rateSamples = 0
    this.rateDone = false
  }

  /**
   * Durations are counted in blocks of samples, so they are only right if the device delivers the
   * rate it reports. Measure once per signal period, on real audio only (micStatus "ok"; a zero-filled
   * frame restarts the window, since a Preview with its mic toggle off may deliver those, R1 §7.2).
   * If it delivers clearly MORE than reported (the 16000 request was ignored), adopt the nearest
   * standard rate. Fewer samples mean dropped frames: log only.
   */
  private measureRate(now: number, n: number, signal: boolean): void {
    if (this.rateDone || this.micStatus !== "ok" || now - this.rateFrom < RATE_MEASURE_DELAY_SEC) return
    if (n > 0 && !signal) {                        // zero-filled frame: not real audio, start over
      this.rateT0 = -1
      return
    }
    if (this.rateT0 < 0) {
      if (n > 0) { this.rateT0 = now; this.rateSamples = 0 }   // window starts at a frame boundary
      return
    }
    this.rateSamples += n
    const dt = now - this.rateT0
    if (dt < RATE_MEASURE_SEC) return
    this.rateDone = true
    this.measuredRate = Math.round(this.rateSamples / dt)
    const ratio = this.measuredRate / this.rate
    this.log(`rate reported=${this.rate} measured=${this.measuredRate}/s maxFrame=${this.buf ? this.buf.length : 0}`)
    if (ratio <= 1.2) {
      if (ratio < 0.8) print(`WbwVoice: mic delivered ${this.measuredRate} samples/s for ${this.rate} Hz (dropped frames?)`)
      return
    }
    let best = 0
    for (const r of STANDARD_RATES) if (Math.abs(this.measuredRate / r - 1) < 0.1) best = r
    if (best > 0 && best !== this.rate) {
      print(`WbwVoice: mic delivers ~${this.measuredRate} samples/s but reports ${this.rate} Hz; using ${best}`)
      this.applyRate(best)
      this.resetBlockAccumulator()
    }
  }

  // ── detector ──

  /**
   * One 20 ms block. `gated` = any Lens clip; `voiceGated` = the voice channel only (= gated without
   * an isVoiceBusy gate). Confirmed speech is cut only by a voice clip; everything else by any clip.
   */
  private onBlock(db: number, gated: boolean, nonZero: boolean, voiceGated: boolean): void {
    // Own playback first, whatever the samples: echo cancellation may output exact zeros while we play.
    if (this.vadState === "speech" ? voiceGated : gated) {
      this.level = SILENT_DB                       // the indicator never follows the Lens's own voice
      this.holdForPlayback()
      return
    }
    if (!nonZero) {
      // Exact zeros: no level, floor or calibration update, but time passes. Inside an utterance the
      // block counts as quiet, so a gating input chain still ends the turn by silence or maxUtterSec.
      this.level = SILENT_DB
      if (this.skipBlocks > 0) {
        this.skipBlocks--
        return
      }
      if (this.listening && (this.vadState === "candidate" || this.vadState === "speech")) this.step(SILENT_DB)
      return
    }
    this.level = this.level <= SILENT_DB ? db : this.level + LEVEL_EMA * (db - this.level)
    if (this.skipBlocks > 0) {
      this.skipBlocks--
      return
    }
    this.updateThresholds()
    if (this.vadState !== "candidate" && this.vadState !== "speech") this.updateFloor(db, db >= this.onsetNow)
    if (!this.listening || !this.voiceActivityEnabled || this.vadState === "nosignal") return
    if (!this.calibrated) {
      this.setState("calibrating")
      return
    }
    if (this.vadState === "guard" || this.vadState === "calibrating") this.setState("listening")
    this.step(db)
  }

  /** Onset / release / middle thresholds from the floor and the spread. */
  private updateThresholds(): void {
    const rel = Math.min(this.releaseDb, this.onsetDb)
    const hyst = this.onsetDb - rel
    const relM = Math.max(rel, RELEASE_SPREAD_K * this.noiseSpread)
    this.releaseNow = Math.max(this.noiseFloor + relM, this.absMinOnsetDbfs - hyst)
    this.onsetNow = Math.max(this.noiseFloor + relM + hyst, this.absMinOnsetDbfs)
    this.midNow = (this.onsetNow + this.releaseNow) / 2
  }

  /** The turn state machine (listening / candidate / speech). */
  private step(db: number): void {
    if (this.vadState === "listening") {
      if (db >= this.onsetNow) {
        this.resetTurnCounters()
        this.voiced = 1
        this.utter = 1
        this.peakDb = db
        this.pushRun(db)
        this.setState("candidate")
      }
      return
    }
    if (this.vadState === "candidate") {
      this.utter++
      this.pushRun(db)
      if (db >= this.releaseNow) {
        this.gap = 0
        if (db >= this.midNow) this.voiced++       // only clearly voiced blocks count toward minSpeech
        if (db > this.peakDb) this.peakDb = db
      } else {
        this.gap++
      }
      if (this.gap > this.blocks(this.preGapSec)) {
        this.resetTurnCounters()
        this.setState("listening")
      } else if (this.voiced >= this.blocks(this.minSpeechSec)) {
        this.speechDetected = true
        this.silence = 0
        this.quietHead = 0
        this.quietFilled = 0
        this.setState("speech")
        this._onSpeechStarted.invoke(this.turnCount)
      }
      return
    }
    if (this.vadState === "speech") {
      this.utter++
      this.pushRun(db)
      const quiet = db < this.releaseNow
      if (quiet) {
        this.silence++
      } else {
        this.silence = 0
        if (db >= this.midNow) this.voiced++
        if (db > this.peakDb) this.peakDb = db
      }
      this.quietRing[this.quietHead] = quiet ? 1 : 0
      this.quietHead = (this.quietHead + 1) % QUIET_RING
      if (this.quietFilled < QUIET_RING) this.quietFilled++
      if (quiet) {
        const win = this.endWindowBlocks()
        if (this.quietFilled >= win && this.quietInLast(win) >= Math.ceil(END_QUIET_FRACTION * win)) {
          this.finishTurn(win)
          if (this.vadState !== "speech") return
        }
      }
      if (this.utter >= this.blocks(this.maxUtterSec)) this.rejectAsNoise()
    }
  }

  /** endSilenceSec once half of the expected phrase is voiced, else the longer hesitation window. */
  private endWindowBlocks(): number {
    const fluent = this.expectedSec > 0 && this.voiced * this.blockSec >= FLUENT_VOICED_FRACTION * this.expectedSec
    const sec = fluent ? this.endSilenceSec : Math.max(this.endSilenceSec, this.hesitationSilenceSec)
    return Math.min(QUIET_RING, this.blocks(sec))
  }

  private quietInLast(win: number): number {
    let q = 0
    for (let i = 1; i <= win; i++) q += this.quietRing[(this.quietHead - i + QUIET_RING) % QUIET_RING]
    return q
  }

  private pushRun(db: number): void {
    if (db <= SILENT_DB) return                    // exact-zero blocks say nothing about the room level
    this.runLevels[this.runHead] = db
    this.runHead = (this.runHead + 1) % RUN_RING
    if (this.runCount < RUN_RING) this.runCount++
  }

  /** Our own clip is playing: drop any onset, restart the tail guard, freeze the floor. */
  private holdForPlayback(): void {
    this.skipBlocks = Math.max(this.skipBlocks, this.blocks(this.tailGuardSec))
    if (!this.listening) return
    this.holdTimeout(getTime())
    const s = this.vadState
    if (s === "listening" || s === "calibrating" || s === "candidate" || s === "speech") {
      if (s === "speech") this.speechDetected = false   // the learner chose to listen again first
      this.resetTurnCounters()
      this.setState("guard")
    }
  }

  private updateFloor(db: number, loud: boolean): void {
    if (!this.calibrated) {
      this.calib.push(db)
      if (this.calib.length >= this.blocks(this.calibrationSec)) {
        const s = this.calib.slice().sort((a, b) => a - b)
        const at = (f: number) => s[Math.floor(f * (s.length - 1))]
        this.noiseFloor = clamp(at(CALIB_PERCENTILE), FLOOR_MIN, FLOOR_MAX)
        // Spread from the low half only (speech in part of the window would inflate it):
        // p30 − p10 = 0.76σ for Gaussian levels.
        const sigma = clamp((at(0.3) - at(0.1)) / 0.76, 0, SPREAD_MAX)
        this.noiseSpread = sigma
        this.noiseVar = sigma * sigma
        this.noiseMean = at(0.3) + 0.52 * sigma
        this.calib = []
        this.calibrated = true
        this.noisy = this.noiseFloor > this.noisyFloorDbfs
        this.updateThresholds()
        this.log(`calibrated floor=${this.noiseFloor.toFixed(1)} dBFS spread=${sigma.toFixed(1)} dB onset=${this.onsetNow.toFixed(1)} release=${this.releaseNow.toFixed(1)}${this.noisy ? " (noisy)" : ""}`)
      }
      return
    }
    const a = db < this.noiseFloor ? FLOOR_DOWN : loud ? FLOOR_UP_LOUD : FLOOR_UP
    this.noiseFloor = clamp(this.noiseFloor + a * (db - this.noiseFloor), FLOOR_MIN, FLOOR_MAX)
    if (!loud) {                                    // spread from quiet blocks only (talk outside turns would inflate it)
      const d = db - this.noiseMean
      this.noiseMean += SPREAD_ALPHA * d
      this.noiseVar = (1 - SPREAD_ALPHA) * (this.noiseVar + SPREAD_ALPHA * d * d)
      this.noiseSpread = Math.min(SPREAD_MAX, Math.sqrt(this.noiseVar))
    }
    this.noisy = this.noiseFloor > this.noisyFloorDbfs
  }

  private finishTurn(windowBlocks: number): void {
    if (!this.listening) return
    const anyClip = this.safeGate()
    if (this.safeVoiceGate(anyClip)) {             // a voice clip (Listen again): never report over it
      this.holdForPlayback()
      return
    }
    if (anyClip) return                            // a UI cue is still ringing: finish on a later quiet block
    const result: VoiceTurnResult = {
      turn: this.turnCount,
      source: this.injecting ? "synthetic" : "mic",
      speechSec: round((this.utter - this.silence) * this.blockSec, 2),
      voicedSec: round(this.voiced * this.blockSec, 2),
      peakDb: round(this.peakDb, 1),
      noiseFloorDb: round(this.noiseFloor, 1),
      noiseSpreadDb: round(this.noiseSpread, 1),
      endWindowSec: round(windowBlocks * this.blockSec, 2),
    }
    this.listening = false
    this.timeoutFired = true
    this.speechSource = "mic"
    this.detectCount++
    this.lastSpeechSec = result.speechSec
    this.lastResult = result
    this.setState("done")
    this.log(`speech ${result.speechSec}s voiced=${result.voicedSec}s peak=${result.peakDb} floor=${result.noiseFloorDb} spread=${result.noiseSpreadDb} window=${result.endWindowSec}s (${result.source})`)
    const cb = this.onEnd
    this.onEnd = null
    if (cb) cb("mic")
    this._onSpeechDetected.invoke(result)
    this.syncMic()                                   // stops a mic only this turn needed
  }

  /**
   * maxUtterSec of continuous sound after an onset is not an order phrase (1–3 s): a fan, music, a
   * coffee machine, a louder room. No event; speechDetected is cleared (the UI drops "Heard you…" on
   * onStateChanged → "listening"); the floor is raised to the run's 20th percentile so the same sound
   * does not trigger again; the timeout nudge may fire now.
   */
  private rejectAsNoise(): void {
    const n = this.runCount
    if (n >= 10) {
      const s: number[] = []
      for (let i = 0; i < n; i++) s.push(this.runLevels[i])
      s.sort((a, b) => a - b)
      const at = (f: number) => s[Math.floor(f * (n - 1))]
      const floor = clamp(at(CALIB_PERCENTILE), FLOOR_MIN, FLOOR_MAX)
      if (floor > this.noiseFloor) {
        const sigma = clamp((at(0.84) - at(0.16)) / 2, 0, SPREAD_MAX)
        this.noiseFloor = floor
        this.noiseSpread = sigma
        this.noiseVar = sigma * sigma
        this.noiseMean = at(0.5)
      }
      this.noisy = this.noiseFloor > this.noisyFloorDbfs
    }
    this.noiseRejectCount++
    this.speechDetected = false
    this.log(`rejected ${round(this.utter * this.blockSec, 1)}s of continuous sound as noise; floor=${this.noiseFloor.toFixed(1)} spread=${this.noiseSpread.toFixed(1)}`)
    this.resetTurnCounters()
    this.setState("listening")
  }

  // ── helpers ──

  private safeGate(): boolean {
    try {
      return !!this.isPlaybackActive()
    } catch (e) {
      if (!this.gateErrorWarned) {
        this.gateErrorWarned = true
        print(`WbwVoice: isPlaybackActive threw (${e}); treating as playing`)
      }
      return true
    }
  }

  /** The voice-channel gate; without one (a plain function gate) it is the full gate. */
  private safeVoiceGate(all: boolean): boolean {
    if (!this.isVoicePlaying) return all
    try {
      return !!this.isVoicePlaying()
    } catch (e) {
      return all
    }
  }

  private blocks(sec: number): number {
    return sec <= 0 ? 0 : Math.max(1, Math.round(sec / this.blockSec))
  }

  private resetTurnCounters(): void {
    this.voiced = 0
    this.gap = 0
    this.silence = 0
    this.utter = 0
    this.peakDb = SILENT_DB
    this.quietHead = 0
    this.quietFilled = 0
    this.runHead = 0
    this.runCount = 0
  }

  private resetBlockAccumulator(): void {
    this.xPrev = 0
    this.yPrev = 0
    this.sumSq = 0
    this.k = 0
    this.blockNonZero = false
  }

  private setState(s: string): void {
    if (s === this.vadState) return
    const old = this.vadState
    this.vadState = s
    this.log(`${old} → ${s} level=${this.level.toFixed(1)} floor=${this.noiseFloor.toFixed(1)} spread=${this.noiseSpread.toFixed(1)}`)
    this._onStateChanged.invoke(s)
  }

  private setMicStatus(s: string): void {
    if (this.micBroken) s = "error"
    if (s === this.micStatus) return
    this.micStatus = s
    this.log(`mic ${s}`)
    this._onMicStatusChanged.invoke(s)
  }

  private log(msg: string): void {
    if (this.debugLog) print(`WbwVoice: ${msg}`)
  }
}

// ── Integration sketch (the contract with the header; R4_codemap.md c.4, INTEGRATION_PLAN §4.2 / §4.9 / §4.10) ──
// WbwAudioController — add:
//   /** Mic gate: any Lens clip (voice or SFX), or a voice clip whose finish is still pending. */
//   isBusy(): boolean {
//     if (this.isVoiceBusy()) return true
//     for (const a of this.sfx) if (a.isPlaying()) return true          // AudioComponent.isPlaying :25918
//     return false
//   }
//   /** Voice channel only: the detector uses it while speech is confirmed. */
//   isVoiceBusy(): boolean { return this.pendingDone !== null || (!!this.voice && this.voice.isPlaying()) }
//   /** Seconds of a key; "a+b+c" = the sum. FileAudioTrackProvider.duration (StudioLib.d.ts:4615), or 1.2 s per
//    *  part without one (check the cast on device, R1 §7.6). Better than timing playVoice: a muted Preview
//    *  adds the 0.5 s safety net (WbwAudioController.ts:98), and step 2 arms with no playback at all. */
//   durationOf(key: string): number {
//     let s = 0
//     for (const k of key.split("+")) {
//       const t = AUDIO[k]
//       const d = t ? (t.control as FileAudioTrackProvider).duration : 0
//       s += d > 0 ? d : 1.2
//     }
//     return s
//   }
// WbwMain.start (D21): this.vad = this.sceneObject.createComponent(WbwVoiceActivity.getTypeName()) as WbwVoiceActivity
//   this.vad.init(this.audio, this.micAudio); this.vad.setVoiceDetection(this.order.voiceDetection)
//   this.order.init(session, audio, learn, this.vad)
// WbwOrderController — it OWNS the turn (plan 4.9 names; LEAF reads these three on the controller):
//   private speakTurn: {answerId: string; epoch: number} | null = null
//   get waitingForSpeech(): boolean { return this.speakTurn !== null }
//   speechDetected = false; speechSource = ""
//   setActive(true) → vad?.setMicActive(true)        setActive(false) / finish() → closeSpeakTurn(); vad?.setMicActive(false)
//   armVoice(key)      { this.vad?.arm((src) => this.onSaid(src), this.audio.durationOf(key)) }
//                      (style b instead: vad.start(-1, durationOf(key)) once + vad.onSpeechDetected.add(() => this.onSaid("mic")))
//   phrase card chosen (steps 1, 3, 4, 5, 6): audio.playVoice(p.audio); beginSpeakTurn(id); armVoice(p.audio)
//   showHelperTurn (step 2, after "Mit kér bele?" ends; no playback):
//                      if (phraseSlotIds.length > 0) { beginSpeakTurn("fillings"); armVoice(phraseAudioKey) }
//   first word at step 2 (slots were empty): beginSpeakTurn("fillings"); armVoice(phraseAudioKey)
//   UseThisWord / AddWord / pattern change at step 2 (turn open):
//                      if (playPhraseOnChange) audio.playVoice(phraseAudioKey); armVoice(phraseAudioKey)
//                      (re-arm: the turn stays open; a half-heard utterance of the old phrase is dropped)
//   slots emptied / runStep / next / finish / mode exit → closeSpeakTurn() { speakTurn = null; vad?.disarm() }
//   Listen (card or helper) → audio.playVoice(key) only.
//   saidIt() (SaidItButton) → if (!this.waitingForSpeech) return; if (!this.vad || !this.vad.saidIt()) this.onSaid("button")
//   onSaid(source) { if (!this.speakTurn || this.speakTurn.epoch !== this.epoch || !this.active) return   // its OWN flag
//                    speakTurn = null; speechSource = source; speechDetected = source === "mic"; vad?.stop(); push; next(def) }
//   Never playSfx / playVoice from onSpeechStarted, onSpeechDetected or the speak prompt while a turn is armed.
//   UI reads vadState / micAvailable / pulse (or micLevelDb − noiseFloorDb) / nudgeSaidIt. No AMBER here.
// LEAF (the injected counts follow the turn's clip length, so read them from the detector):
//   vad.ignoreMicForTests = true                                    // setter: real mic off, clean calibration
//   (open a turn through the UI, e.g. tap PhraseCard_jonapot → waitFor(() => order.waitingForSpeech))
//   vad.injectBlocksForTest(-60, vad.settleBlocks)                  → vadState "listening" (guard + calibration)
//   vad.injectBlocksForTest(-38, 10); vad.injectBlocksForTest(-60, 20)    → a cough: candidate dropped, nothing fires
//   vad.injectBlocksForTest(-38, 15, true)                          → own playback: "guard"
//   vad.injectBlocksForTest(-60, vad.settleBlocks)                  → "listening" again
//   vad.injectBlocksForTest(-38, vad.minSpeechBlocks + 2)           → "speech" (25–40 blocks, by clip length)
//   vad.injectBlocksForTest(-60, vad.endSilenceBlocksMax + 2)       → "done"; order.speechSource === "mic"
//   vad.injectBlocksForTest(-38, Math.ceil(vad.maxUtterSec / 0.02) + 2)  → continuous sound: rejected, still
//     "listening", nothing fires, noiseRejectCount + 1 (the floor is now -38: call vad.recalibrate() before more steps)
//   Said it: tap SaidItButton → waitFor(() => !order.waitingForSpeech); speechSource "button", speechDetected false.
