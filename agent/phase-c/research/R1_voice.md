# R1: Voice activity detection ("say it out loud") for Word by Word

**Scope.** This covers how the Lens can tell that the learner **spoke** in Use it live (voice activity, not recognition), on Specs and in the Lens Studio Preview. It also covers whether Snap's ASR handles Hungarian.

**How to read it.**
- Line numbers refer to files in this repo as read on 2026-11-19. `WbwOrderController.ts` is being edited live, so re-check its lines.
- Skill paths are shortened to `skills/<name>/…`. They mean `C:/Users/czuto/.claude/plugins/cache/ls-extensions/ls-clad/1.0.0/skills/<name>/…`.
- Nothing outside `agent/phase-c/` was changed.

This version replaces an earlier R1 draft. It re-verifies every API line and aligns the integration with the AGREED PHASE C DESIGN: phrase helper in step 2, phrase cards in steps 1/3/4/5/6, "Said it" always available, and WbwSharedUI tones.

---

## 1. Key findings (TL;DR)

1. **Reading the mic.**
   - The Lens needs a **Microphone Audio** asset. It is an `AudioTrackAsset` whose `.control` is a `MicrophoneAudioProvider`.
   - Call `start()` once. Then, on every `UpdateEvent`, call `getAudioFrame(buf: Float32Array): vec3`. `shape.x` is the number of samples written, and it can be 0.
   - Set `sampleRate = 16000` and then read it back, because the device may keep its own rate.
   - Allocate `buf = new Float32Array(maxFrameSize)` **once**.
   - There is **no built-in VAD and no level API**. We compute RMS (in dBFS) and peak ourselves, over fixed 20 ms blocks of samples.
2. **Permissions.**
   - The first use of `MicrophoneAudioProvider` makes Lens Studio declare **"Microphone - SnapML"** automatically.
   - The project has no Internet, RemoteService, WebSocket or ASR modules in `Assets/` (grep: none). So there is no Transparent-Permission prompt or LED requirement, and the Lens stays publishable.
   - On Specs, a Lens that uses Microphone Audio gets the **Analysis** input profile (echo cancellation) automatically.
3. **Preview mic: yes.** A **microphone button appears in the bottom-left of the Preview panel**, but only once a Microphone Audio asset is referenced by a script.
   - You toggle it to start or stop grabbing input. It asks for OS permission the first time.
   - On Windows, right-click it to choose the input device.
   - With the toggle off there is no usable signal. The detector reports `nosignal`, and **"Said it" is the path**.
   - **LEAF cannot inject mic audio.** It only mocks `AsrModule`. Tests use `SaidItButton`, plus a synthetic-block test hook on the detector.
4. **Detector design (section 4).**
   - Per-block RMS after an 80 Hz high-pass.
   - An adaptive **noise floor**, learned only while the Lens is silent.
   - **Onset** at floor + 12 dB (never below -55 dBFS). **Release** at floor + 6 dB.
   - **Minimum speech duration:** `clamp(0.3 × model-clip length, 0.5 s, 0.8 s)` of voiced audio.
   - **Pre-confirm hangover:** gaps of up to 0.30 s are allowed.
   - **End-of-utterance hangover:** 0.70 s of silence, or an 8 s cap. The server then answers, so it never talks over the learner.
   - **Own-playback gate:** the detector arms only in the model clip's `onDone`. It ignores all audio while `WbwAudioController.isBusy()` is true, and for 0.35 s after.
   - **Nudge at 8 s** (4 s in a noisy room): "Said it" pulses. There is never an auto-advance and never amber or "Try again".
   - **No-signal watchdog:** 1.5 s.
5. **Hungarian ASR: not confirmed.**
   - Snap says only "40+ languages, including mixed language input". No list is published, and Hungarian is named in no Snap source found.
   - This project's API (Lens Scripting ≤ 372 in `Support/StudioLib.d.ts`) has **no `language` option**. Snap's docs say `language`/`secondaryLanguages` "need Lens Scripting Version 384 or later".
   - ASR also needs internet and is not recommended for short phrases. **VAD is the right tool**, and the brief already says recognition is out of scope (devpost/design-brief.md:88, :133).

---

## 2. Exact APIs (Support/StudioLib.d.ts unless noted)

| API (verbatim signature) | file:line | Notes |
|---|---|---|
| `declare class AudioTrackAsset extends Asset` | StudioLib.d.ts:3995 | The Microphone Audio asset is one of these. |
| `control: AudioTrackProvider;` | :4010 | Cast `asset.control as MicrophoneAudioProvider`. |
| `declare class AudioTrackProvider extends Provider` | :3832 | Base class. |
| `sampleRate: number;` | :3848 | "Sample rate (samples per second)". It is writable. Snap's sample sets 16000 and **reads it back** (see below). |
| `readonly maxFrameSize: number;` | :3854 | Upper bound for the `Float32Array` length. |
| `declare class MicrophoneAudioProvider extends AudioTrackProvider` | :26178 | "The Audio Track Provider of the audio from microphone." (Lens Scripting 145+) |
| `getAudioFrame(audioFrame: Float32Array): vec3;` | :26195 | "Writes current frame audio data to the passed in `Float32Array` and returns its shape. The length of the array can't be more than `maxFrameSize`." Tagged `@exposesUserData` (:26193). Use `shape.x` = samples written. |
| `getAudioFramePCM16(audioFrame: Int16Array): vec3;` | :26202 | Int16 variant. Not needed. |
| `start(): void;` | :26208 | "Start processing audio from microphone. Useful to avoid redundant processing." |
| `stop(): void;` | :26214 | "Stop processing audio from microphone." |
| (no `getAudioBuffer` on the mic provider) | | `getAudioBuffer(audioBuffer, readSize)` exists only on file and licensed providers (:4609, :26157). |
| `declare class FileAudioTrackProvider extends AudioTrackProvider` | :4587 | `readonly duration: number;` (:4615). Gives a clip's length via `(AUDIO[k].control as FileAudioTrackProvider).duration`. Optional (see 5.2). |
| `declare class AudioComponent extends Component` | :25902 | `play(loops: number): void` :25914, `isPlaying(): boolean` :25918, `setOnFinish(eventCallback: (audioComponent: AudioComponent) => void): void` :25926, `stop(fade: boolean): void` :25930, `readonly duration: number` :25954, `playbackMode: Audio.PlaybackMode` :25993. |
| `declare function getTime(): number;` | :9 | Wall-clock seconds, for the nudge and no-signal timers. Durations use sample counts instead. |
| `MachineLearning.createSpectrogramBuilder()` / `createMelSpectrogramBuilder()` / `createMFCCBuilder()` | :30321 / :30325 / :30329 | Available for a future spectral VAD. **Not needed for v1.** |
| `MachineLearning.createNoiseReductionBuilder(): NoiseReductionBuilder` | :30339 | Class `NoiseReduction` :20482 has `process(inTensor: Float32Array, inShape: vec3, outTensor: Float32Array): vec3` and `amount`. **Not recommended:** it adds latency and makes levels harder to reason about. |
| `declare class AsrModule extends Asset` | :6808 | `startTranscribing(transcriptionOptions: AsrModule.AsrTranscriptionOptions): void` :6835, `stopTranscribing(streamType?: number \| null): Promise<void>` :6843, both `@snapOS` (Lens Scripting 309+). |
| `class AsrTranscriptionOptions extends ScriptObject` | :27193 | Fields: `silenceUntilTerminationMs: number` (default 750) :27216, `mode: AsrModule.AsrMode` :27223, `onTranscriptionUpdateEvent` and `onTranscriptionErrorEvent` (until :27236). **No `language` field.** `enum AsrMode { HighAccuracy, Balanced, HighSpeed }` :27097. Error `NoInternet` :27147. |
| `declare class VoiceMLModule extends Asset` | :23218 | "@deprecated VoiceML capabilities are no longer supported. For Spectacles see options on ASRModule." (:23214). Its `languageCode` (:33630) is deprecated too. Do not use. |
| Highest "Lens Scripting Version" in this d.ts | 372 | From grepping every `@since` tag. |

### 2.1 Snap reference pattern

From `skills/specs-snap-cloud/resources/scripts/AudioCaptureUploader.ts`:

```ts
this.microphoneControl = this.microphoneAsset.control as MicrophoneAudioProvider   // :231
this.microphoneControl.sampleRate = this.sampleRate                                  // :234 (16000)
const actualSampleRate = this.microphoneControl.sampleRate                           // :237 read back
...
this.microphoneControl.start()                                                       // :358
...
const frameSize: number = this.microphoneControl.maxFrameSize                        // :392 (per update)
let audioFrame = new Float32Array(frameSize)
const audioFrameShape = this.microphoneControl.getAudioFrame(audioFrame)
if (audioFrameShape.x === 0) { return }                                              // :399
audioFrame = audioFrame.subarray(0, audioFrameShape.x)
```

- `skills/specs-ai-remote-service/resources/scripts/MicrophoneRecorder.ts:62-67` uses the same loop.
- That same file, at :53-54, has `require("LensStudio:VoiceMLModule")` under the comment "Require the VoiceML Module in order to get Bystander Rejection". See 3.3.
- **Our improvement:** allocate the buffer once, not every frame. That avoids per-frame GC churn.

---

## 3. Setup, permissions and platform behaviour

### 3.1 The Microphone Audio asset (needed for both device and Preview)

- **Docs:** "To add a **Microphone Audio** asset, click **+** in the **Asset Browser**", then search "microphone" and pick it; it is "Provided by MicrophoneAudioProvider." Source: docs.lensstudio.com/develop/foundation/audio-and-voice/audio-track-assets. The skill copy is `skills/specs-snap-cloud/resources/docs/examples/media.mdx:320`.
- **Wiring:** reference the asset from a script `@input` (`@input @allowUndefined micAudio: AudioTrackAsset` on the new detector). That reference is also what makes the Preview mic button appear.
- **Editor API:**
  - `Support/editor.d.ts:996` says "AudioTrackAsset is abstract — imported via file, not createNativeAsset".
  - `createNativeAsset(assetType: string, baseName: string, relativeDestinationDir)` is at editor.d.ts:14822.
  - **The native type string for Microphone Audio is not documented.** The building agent should try it once with ExecuteEditorCode and check `getTypeName()`. If that fails, ask the user for the one-click Asset Browser add, then wire the `@input`.
- **Guard for a missing asset:** with no asset, or no `control`, the Lens must run in **Said-it-only** mode with no errors.

### 3.2 Permissions and privacy

- **Mapping:** `skills/specs-camera/resources/docs/permissions-and-privacy.mdx:59` maps `| Microphone - SnapML | MicrophoneAudioProvider, VoiceMLModule, DialogModule |`. The same file, at :8, says "Lens Studio automatically declares the necessary permissions in the project."
- **When Transparent Permission applies:** only when a sensitive sensor is combined with internet or connectivity (`transparent-permission.mdx:25-36`). The mic mapping is "`AudioTrackAsset` w/ `MicrophoneAudioProvider` | Microphone - SnapML" (:63).
  - `Assets/Scripts` and `Assets/Tests` contain no `InternetModule`, `RemoteServiceModule`, `WebSocket`, `performHttpRequest` or `LensStudio:Asr` (grep, exit 1).
  - So there is **no prompt, no LED, and the Lens stays publishable.**
  - Adding ASR later would change that, because ASR streams over the internet.
- **Privacy:** `getAudioFrame` is `@exposesUserData`. The detector computes levels only. It never stores, records or uploads samples. Say this in the README and Devpost.

### 3.3 Specs mic input profiles

From `skills/specs-audio/SKILL.md:42-51`, and the docs page: "On SPECS, a Lens that uses Microphone Audio gets the Analysis audio input profile, which applies Echo Cancellation."

| Profile | Filters | Triggered by |
|---|---|---|
| Analysis | Echo cancellation | Microphone Audio feeds. **This is what we get.** |
| Voice | Echo cancellation + **bystander speech rejection** | `LensStudio:AsrModule` use in the project. It takes precedence. |

- **Echo cancellation reduces but does not guarantee** removal of our own clips. In the Preview, laptop speakers feed the laptop mic with **no** echo cancellation. **The playback gate (4.4) is mandatory.**
- **Optional and unverified:** a bare `require("LensStudio:AsrModule")` with no `startTranscribing` *might* switch the device to the Voice profile. That would add bystander rejection, which is useful in a real café. Snap's MicrophoneRecorder does the equivalent with VoiceML (:53-54).
  - Cost: it adds the "Microphone" descriptor (`transparent-permission.mdx:61`). Without internet it stays publishable.
  - Note: SpectaclesUIKit's `Services/VoiceInputProvider.ts:22` holds `require("LensStudio:AsrModule")`. Its class is a lazy `@Singleton` (`SpectaclesInteractionKit.lspkg/Decorators/Singleton.ts`), and only `VoiceInputButton` or TextInput call it. **Neither is used in `Assets/`**, so do not count on the Voice profile.
  - If wanted, try it on device later. Do not rely on it.
- **Other Lens sounds:** UIKit button audio defaults off (`SpectaclesUIKit.lspkg/Scripts/Components/Element.ts:72`, `_playAudio = false`). `playAudio` and SIK `InteractableAudioFeedback` are not used in `Assets/`. **So every sound the Lens makes goes through `WbwAudioController`**, which means one `isBusy()` accessor covers the whole gate.

### 3.4 Preview microphone (laptop)

Verbatim from docs.lensstudio.com/develop/foundation/audio-and-voice/audio-track-assets:
- "After the Microphone Audio asset is referenced somewhere in the scene … a microphone button appears in the bottom-left corner of the Preview panel."
- It is "only available if a Microphone Audio asset is present and referenced in Script or Script Graph somewhere in the project."
- "Toggle the button to start or stop grabbing the Audio Input for processing."
- "If Audio input is enabled the button provides visual feedback on the input sound."
- "You will also be asked for permissions at the first time."
- Windows: "right click on the button and select the Input Device if multiple ones are available." macOS: "the default input device is used, settings can be changed in the System Preferences."
- "While reading data from microphone don't forget to call `start` function."

What this means for us:
- Assume the toggle starts **off**, and verify it. The detector treats `x == 0`, or all-zero frames, for 1.5 s as **`nosignal`**, not as silence. The UI then shows "Mic off · tap Said it".
- For the demo video:
  - The presenter turns the button on.
  - Headphones stop the server voice reaching the laptop mic. The gate copes anyway.
  - The Preview button's own level feedback is a quick sanity check that the right input device is selected.

### 3.5 LEAF

- **What exists:** `Cache/TypeScript/Src/Packages/Leaf.lspkg/Interactors/interactor/voiceInput/LeafAsrModule.ts` patches `AsrModule.startTranscribing` (:39-57) and `AsrTranscriptionOptions.create` (:63-64). `LeafVoiceInteractor.say(text)` (:58) then emits fake transcripts.
- **What is missing:** Leaf has **no `MicrophoneAudioProvider` / `getAudioFrame` mock** (grep: none).
- **So tests should:**
  1. Drive `SaidItButton` for the normal path.
  2. Exercise the real state machine through `injectBlocksForTest(db, count)` (4.6), which feeds synthetic 20 ms block levels.
  3. Set `ignoreMicForTests = true` at test start, so a Preview mic left on (room noise) can never advance a test early. This matches R4's `voiceActivityEnabled` switch idea (R4_codemap.md:133).

---

## 4. Detector design: `WbwVoiceActivity.ts` (new, non-UI)

**Purpose:** tells the order flow that the learner spoke (voice activity), not what they said.
- **Owns:** mic start/stop, block levels, noise floor, and the speak-turn state machine.
- **Must NOT:** play audio, judge correctness, or decide what happens next. `WbwOrderController` decides that.

### 4.1 Signal path (per `UpdateEvent`)

```
n = mic.getAudioFrame(buf).x                    // buf allocated once: new Float32Array(mic.maxFrameSize)
frameHasSignal = any |buf[i]| > 1e-6            // for the no-signal watchdog
for i in 0..n-1:
    x = buf[i]
    y = R * (yPrev + x - xPrev)                 // one-pole high-pass, fc ≈ 80 Hz: R = exp(-2π·80/rate)
    xPrev = x; yPrev = y                        //   removes DC offset, HVAC/fridge rumble, footsteps
    sumSq += y*y; peak = max(peak, |y|); k++
    if k == blockLen:                           // blockLen = round(0.020 · rate) → 320 @ 16 kHz
        db = 10·log10(sumSq / blockLen + 1e-12) // RMS in dBFS (full-scale sine ≈ -3 dBFS)
        onBlock(db, peak, busy)                 // busy = audio.isBusy() sampled once per tick
        sumSq = 0; peak = 0; k = 0
```

- **All durations are counted in blocks** (fixed 20 ms of audio). That makes them independent of frame rate and of Specs' variable frame sizes.
- `getTime()` is used only for the wall-clock nudge and no-signal timers.
- `micLevelDb` is a smoothed `db` (EMA 0.3), which drives the mic-indicator pulse.
- Cost: about 16 k multiply-adds per second. Trivial.

### 4.2 States

```
 off ──arm()──► guard ──(guard blocks elapsed, floor known)──► listening ──(db ≥ onset)──► candidate
  ▲               ▲  ▲                                          ▲    ▲                          │
  │               │  └──────── own audio plays (any state but off/done) ──────────────────────┤
  │               │                                                    └── gap > 0.30 s ──────┤
  │               │                                                    voiced ≥ minSpeech ────▼
  │               │                                                                         speech  (speechDetected = true)
 disarm()         │                                                                           │
                  └─ signal returns ◄── nosignal ◄── no non-zero sample for 1.5 s (any armed state)
 done ◄── silence ≥ 0.70 s or utterance ≥ 8 s (from speech) ── or saidIt() from ANY armed state
```

- **`arm(onEnd, clipSec)`** is called by the order controller **inside the model clip's `onDone`** (see section 5). It resets the counters, sets `waitingForSpeech = true` and `speechDetected = false`, and sets `minSpeech = clamp(0.3·clipSec, 0.5, 0.8)`. It enters `guard` with `guardLeft = 18` blocks (0.35 s).
- **`speechDetected`** turns true on entering `speech`. The UI shows "Heard you" in green (`GREEN` from WbwSharedUI). **The server waits** until `done`, so it never talks over the learner.
- **`done`** fires `onEnd(source)` exactly once (`source` = `"mic" | "button" | "test"`).
- **`saidIt()`** goes straight to `done` with source `"button"`, from any armed state.
- **`disarm()`** sets `off`, drops the callback, and sets `waitingForSpeech = false`. The controller calls it on step change, mode exit, a new card choice, or a phrase change.

### 4.3 Thresholds (code constants; tune on device)

| Constant | Value | Why |
|---|---|---|
| `BLOCK_SEC` | 0.020 | Standard VAD frame. |
| `HPF_HZ` | 80 | Below the voice fundamental's harmonics that carry energy. Rejects rumble. |
| `START_DISCARD_SEC` | 0.15 | Skips start-up transients or a stale buffer after `start()`. |
| `TAIL_GUARD_SEC` | 0.35 (18 blocks) | Speaker ring-down and room reverb after our clip, plus LowLatency timing slop. |
| `ONSET` | `max(floor + 12 dB, -55 dBFS)` | Wearer speech near the mic is typically 15–30 dB above a room floor. The absolute minimum stops digital-silence floors (about -90) from making faint hiss "speech". |
| `RELEASE` | `max(floor + 6 dB, -61 dBFS)` | Hysteresis, so quiet syllables ("…szendvicsembe", "nélkül") don't split the utterance. |
| `MIN_SPEECH_SEC` | `clamp(0.3 × clipSec, 0.5, 0.8)` | Counted in voiced blocks only. Rejects coughs, claps, clicks and a muttered single word. Short phrases ("Jó napot!" ≈ 0.9 s, "Köszönöm." ≈ 0.7 s) give 0.5 s. The step-2 sentence ("Kérek uborkát a szendvicsembe." ≈ 2.5 s) gives 0.75–0.8 s, so browsing self-talk like "hmm, szalámi" does not submit. |
| `PRE_GAP_SEC` (pre-confirm hangover) | 0.30 | The longest pause between voiced blocks before an unconfirmed candidate is thrown away. |
| `END_SILENCE_SEC` (post-confirm hangover) | 0.70 | After confirmed speech, this much below-release time means "finished", and the server answers. |
| `MAX_UTTER_SEC` | 8.0 | Cap for continuous noise right after a real onset. |
| `NUDGE_SEC` / `NUDGE_NOISY_SEC` | 8 / 4 | With no confirmed speech, `nudgeSaidIt = true`. "Said it" pulses, and a neutral hint reads "Say it out loud, or tap Said it". **No amber, no "Try again"**: VAD cannot judge correctness, and amber means wrong in this design. Keep listening; never auto-advance. |
| `NO_SIGNAL_SEC` | 1.5 | No non-zero sample (or `x == 0` every tick) for this long gives `micAvailable = false` and `vadState = "nosignal"`. Covers a Preview toggle that is off, or no device. |
| Floor clamp | [-85, -30] dBFS | Guards against digital silence and absurd values. |
| `NOISY_FLOOR_DBFS` | -38 | If the floor is above this, set `noisy = true`, which brings the nudge forward. |

### 4.4 Noise floor and ignoring the Lens's own audio

**Mic lifecycle.**
- `setMicActive(true)` on entering Use it live, and `false` on leaving or finishing. This calls `start()` / `stop()`.
- Blocks are processed all the time the mic is on. So the floor is already learned when `arm()` comes. Typical quiet moments: while the learner reads cards, points at ingredients, or between steps.

**Floor update rule.**
- The floor is updated **only on blocks that are not gated and not in `candidate` or `speech`**.
- Asymmetric EMA per block:
  - if `db < floor`: `floor += 0.20·(db − floor)` (fast down, about 0.1 s)
  - else: `floor += 0.005·(db − floor)` (slow up, about 4 s)
- So speech barely raises the floor, but a quieter room is learned quickly.

**Initial calibration.**
- The first 20 eligible blocks (0.4 s) set the floor to their **20th percentile**. That is robust even if the learner starts talking partway through.
- No detection happens until calibrated. Default before then: -60 dBFS.

**Own-playback gate (the "listen only after the model clip ends" rule).**
1. The controller arms only in the model clip's `onDone`. Server lines play only after `done` or a disarm, so the detector is `off` during them.
2. `busy = audio.isBusy()` is sampled every tick. It is true while any voice or SFX `AudioComponent.isPlaying()`, **or** while `pendingDone` is set. The second case covers the muted-Preview case, where the finish callback never comes and the safety net fires at duration + 0.5 s (`WbwAudioController.ts:98-103`).
3. If busy:
   - reset the candidate and voiced count
   - set `guardLeft = 18` blocks
   - state goes back to `guard`, even from `speech`. Example: the learner tapped Listen again mid-sentence and wants to hear it first.
   - no floor update
4. Blocks while `guardLeft > 0` count down and are otherwise ignored.
5. Shadowing (speaking along with the model clip) is ignored by design. If the learner keeps talking after the clip and guard end, the onset is caught then, and END_SILENCE waits for them to finish.

**Accessor to add to `WbwAudioController`.** This is the only change the detector needs there.

```ts
/** True while any voice/SFX clip plays, or a voice clip's finish is still pending. */
isBusy(): boolean {
  if (this.pendingDone !== null || (this.voice && this.voice.isPlaying())) return true
  for (const a of this.sfx) if (a.isPlaying()) return true
  return false
}
```

### 4.5 No-signal and failure handling

| Situation | Behaviour |
|---|---|
| No mic asset or `control` | Said-it-only: `micAvailable = false`, `vadState = "nosignal"` while armed. The flow still completes. |
| Preview mic toggle off | Zero samples or zeros → `nosignal` within 1.5 s → "Mic off · tap Said it", with "Said it" styled primary. If the signal returns → `guard`. |
| Our clip leaks into the mic | Gate + 0.35 s guard. On Specs, Analysis-profile echo cancellation helps more. |
| Cough, click, pinch tap, door bang | Shorter than `MIN_SPEECH_SEC` (< 0.25 s typical), so ignored. |
| Café chatter or bystanders (device) | The floor rises slowly to cover steady chatter. Wearer speech is louder (mouth close to the mic). Min duration plus timing help. If false triggers appear on device: raise onset to +15 dB, or try the unverified Voice-profile trick (3.3). |
| Learner whispers or is very quiet | Nudge at 8 s. "Said it". |
| Very loud room (`noisy`) | Nudge at 4 s. Detection keeps running. |
| `getAudioFrame` delivers samples irregularly | Durations are in samples. Also log `samples/sec` versus `getTime()` over the first 2 s. If it is off by more than 20 %, scale the block-time constants (verify item 3). |

### 4.6 Skeleton for the implementer

```ts
// WbwVoiceActivity.ts — tells the order flow that the learner SPOKE (voice activity), not what they said.
// Owns: mic start/stop, block levels (RMS dBFS), noise floor, the speak-turn state machine.
// Must NOT: play audio, judge correctness, or decide what happens next (WbwOrderController does).
import {WbwAudioController} from "./WbwAudioController"

const BLOCK_SEC = 0.02, HPF_HZ = 80, START_DISCARD_SEC = 0.15, TAIL_GUARD_SEC = 0.35
const ONSET_DB = 12, RELEASE_DB = 6, ABS_MIN_ONSET = -55
const PRE_GAP_SEC = 0.3, END_SILENCE_SEC = 0.7, MAX_UTTER_SEC = 8
const NUDGE_SEC = 8, NUDGE_NOISY_SEC = 4, NO_SIGNAL_SEC = 1.5
const FLOOR_DEFAULT = -60, FLOOR_MIN = -85, FLOOR_MAX = -30, NOISY_FLOOR = -38
const FLOOR_DOWN = 0.2, FLOOR_UP = 0.005, CALIB_BLOCKS = 20

@component
export class WbwVoiceActivity extends BaseScriptComponent {
  @input @allowUndefined
  @hint("Microphone Audio asset (Asset Browser → + → Microphone Audio). Empty = Said-it only.")
  micAudio: AudioTrackAsset
  @input @hint("Detect that the learner spoke. Off = only the Said it button advances.")
  voiceActivityEnabled: boolean = true
  @input @hint("Print levels on state changes (tuning)")
  debugLog: boolean = false

  // ── readable state (LEAF / UI) ──
  vadState: string = "off"   // off | guard | listening | candidate | speech | done | nosignal
  waitingForSpeech = false
  speechDetected = false
  speechSource = ""          // "mic" | "button" | "test"
  micAvailable = false
  nudgeSaidIt = false
  noisy = false
  micLevelDb = -120
  noiseFloorDb = FLOOR_DEFAULT
  sampleRateActual = 0
  armCount = 0
  /** LEAF: ignore real mic frames (synthetic blocks still processed). */
  ignoreMicForTests = false

  private audio: WbwAudioController | null = null
  private mic: MicrophoneAudioProvider | null = null
  private buf: Float32Array | null = null
  private running = false
  private blockLen = 320
  private hpfR = 0.969
  private xPrev = 0
  private yPrev = 0
  private sumSq = 0
  private peak = 0
  private k = 0
  private calib: number[] = []
  private floorReady = false
  private guardLeft = 0
  private voiced = 0
  private gap = 0
  private silence = 0
  private utter = 0
  private minSpeech = 0.5
  private listenSince = 0
  private startedAt = 0
  private lastSignalAt = -1
  private onEnd: ((source: string) => void) | null = null

  init(audio: WbwAudioController): void { this.audio = audio }

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => this.setupMic())
    this.createEvent("UpdateEvent").bind(() => this.tick())
  }

  private setupMic(): void {
    if (!this.micAudio || !this.micAudio.control) return            // Said-it-only mode
    this.mic = this.micAudio.control as MicrophoneAudioProvider
    this.mic.sampleRate = 16000
    const rate = this.mic.sampleRate || 16000                        // device may keep its own rate
    this.sampleRateActual = rate
    this.blockLen = Math.max(80, Math.round(BLOCK_SEC * rate))
    this.hpfR = Math.exp((-2 * Math.PI * HPF_HZ) / rate)
    this.buf = new Float32Array(this.mic.maxFrameSize)
  }

  /** Use it live on/off. Keeps the floor current between turns. */
  setMicActive(on: boolean): void {
    if (!this.mic || on === this.running) return
    this.running = on
    if (on) {
      this.mic.start()
      this.startedAt = getTime()
      this.lastSignalAt = -1
      this.guardLeft = Math.ceil(START_DISCARD_SEC / BLOCK_SEC)
    } else {
      this.mic.stop()
    }
  }

  /** Call from the model clip's onDone. onEnd fires once: speech end, Said it, or test. */
  arm(onEnd: (source: string) => void, clipSec: number = 1.2): void {
    this.onEnd = onEnd
    this.waitingForSpeech = true
    this.speechDetected = false
    this.speechSource = ""
    this.nudgeSaidIt = false
    this.minSpeech = Math.min(0.8, Math.max(0.5, 0.3 * clipSec))
    this.voiced = this.gap = this.silence = this.utter = 0
    this.guardLeft = Math.max(this.guardLeft, Math.ceil(TAIL_GUARD_SEC / BLOCK_SEC))
    this.listenSince = getTime()
    this.vadState = this.mic && this.voiceActivityEnabled ? "guard" : "nosignal"
    this.armCount++
  }

  saidIt(): void { if (this.waitingForSpeech) this.finish("button") }

  disarm(): void { this.onEnd = null; this.waitingForSpeech = false; this.vadState = "off" }

  /** LEAF: feed `count` synthetic 20 ms blocks at `db` dBFS through the real state machine. */
  injectBlocksForTest(db: number, count: number, busy: boolean = false): void {
    for (let i = 0; i < count; i++) this.onBlock(db, busy)
  }

  private tick(): void {
    // nudge (wall clock): only while waiting for an onset (listenSince is reset whenever own audio plays)
    if (this.waitingForSpeech && this.vadState !== "speech" && this.vadState !== "done") {
      if (getTime() - this.listenSince > (this.noisy ? NUDGE_NOISY_SEC : NUDGE_SEC)) this.nudgeSaidIt = true
    }
    if (!this.mic || !this.buf || !this.running || this.ignoreMicForTests) return
    const n = this.mic.getAudioFrame(this.buf).x
    const busy = this.audio ? this.audio.isBusy() : false
    let signal = false
    for (let i = 0; i < n; i++) {
      const x = this.buf[i]
      if (x > 1e-6 || x < -1e-6) signal = true
      const y = this.hpfR * (this.yPrev + x - this.xPrev)
      this.xPrev = x
      this.yPrev = y
      this.sumSq += y * y
      const a = y < 0 ? -y : y
      if (a > this.peak) this.peak = a
      if (++this.k === this.blockLen) {
        this.onBlock(10 * Math.log10(this.sumSq / this.blockLen + 1e-12), busy)
        this.sumSq = 0; this.peak = 0; this.k = 0
      }
    }
    // no-signal watchdog
    const now = getTime()
    if (signal) {
      this.lastSignalAt = now
      if (!this.micAvailable) {
        this.micAvailable = true
        if (this.vadState === "nosignal" && this.waitingForSpeech) this.vadState = "guard"
      }
    } else if (now - Math.max(this.lastSignalAt, this.startedAt) > NO_SIGNAL_SEC) {
      this.micAvailable = false
      if (this.waitingForSpeech && this.vadState !== "done") this.vadState = "nosignal"
    }
  }

  private onBlock(db: number, busy: boolean): void {
    this.micLevelDb += 0.3 * (db - this.micLevelDb)
    if (busy) {                                        // own audio playing → ignore, restart guard
      this.guardLeft = Math.ceil(TAIL_GUARD_SEC / BLOCK_SEC)
      this.voiced = this.gap = this.silence = this.utter = 0
      if (this.waitingForSpeech && this.vadState !== "nosignal") { this.vadState = "guard"; this.speechDetected = false }
      this.listenSince = getTime()
      return
    }
    if (this.guardLeft > 0) { this.guardLeft--; return }
    if (this.vadState !== "candidate" && this.vadState !== "speech") this.updateFloor(db)
    if (!this.waitingForSpeech || !this.voiceActivityEnabled || !this.floorReady || this.vadState === "nosignal") return
    const onset = Math.max(this.noiseFloorDb + ONSET_DB, ABS_MIN_ONSET)
    const release = Math.max(this.noiseFloorDb + RELEASE_DB, ABS_MIN_ONSET - 6)
    switch (this.vadState) {
      case "guard":
        this.vadState = "listening"
      // falls through
      case "listening":
        if (db >= onset) { this.vadState = "candidate"; this.voiced = BLOCK_SEC; this.gap = 0 }
        break
      case "candidate":
        if (db >= release) { this.voiced += BLOCK_SEC; this.gap = 0 } else this.gap += BLOCK_SEC
        if (this.gap > PRE_GAP_SEC) { this.vadState = "listening"; this.voiced = 0 }
        else if (this.voiced >= this.minSpeech) {
          this.vadState = "speech"; this.speechDetected = true; this.speechSource = "mic"
          this.silence = 0; this.utter = this.voiced
        }
        break
      case "speech":
        this.utter += BLOCK_SEC
        this.silence = db >= release ? 0 : this.silence + BLOCK_SEC
        if (this.silence >= END_SILENCE_SEC || this.utter >= MAX_UTTER_SEC) this.finish("mic")
        break
    }
  }

  private updateFloor(db: number): void {
    const clamp = (v: number) => Math.min(FLOOR_MAX, Math.max(FLOOR_MIN, v))
    if (!this.floorReady) {
      this.calib.push(db)
      if (this.calib.length >= CALIB_BLOCKS) {
        const s = this.calib.slice().sort((a, b) => a - b)
        this.noiseFloorDb = clamp(s[Math.floor(0.2 * s.length)])
        this.floorReady = true
      }
      return
    }
    const a = db < this.noiseFloorDb ? FLOOR_DOWN : FLOOR_UP
    this.noiseFloorDb = clamp(this.noiseFloorDb + a * (db - this.noiseFloorDb))
    this.noisy = this.noiseFloorDb > NOISY_FLOOR
  }

  private finish(source: string): void {
    if (!this.waitingForSpeech) return
    this.waitingForSpeech = false
    this.speechDetected = true
    if (!this.speechSource || source !== "mic") this.speechSource = source
    this.vadState = "done"
    this.nudgeSaidIt = false
    if (this.debugLog) print(`WbwVAD done via ${source} floor=${this.noiseFloorDb.toFixed(1)} level=${this.micLevelDb.toFixed(1)}`)
    const cb = this.onEnd
    this.onEnd = null
    if (cb) cb(source)
  }
}
```

Implementation notes:
- **Placement:** put it on its own SceneObject near the top of the hierarchy, next to the audio controller. `WbwMain` calls `vad.init(audio)` and hands it to the order controller.
- **TypeScript check:** the `switch` fall-through is intentional. If TS lint complains, write `guard` as an `if` before the `switch`.
- **Wall-clock dependency:** the guard is counted in blocks, not wall time. So `injectBlocksForTest` works synchronously: tests need no real-time waits, except the nudge, which is wall-clock.

---

## 5. Integration with the agreed Phase C flow

### 5.1 One speak turn, for every answer

**Phrase cards (steps 1, 3, 4, 5, 6: `PhraseCard_<id>`).**
1. Tap = choose. Mark it picked, `vad.disarm()`, then play its clip.
2. In the clip's `onDone` (epoch-guarded), call `beginSpeakTurn(id, clipSec)`.
3. Tapping the same card again is "listen again". The gate handles it, and the turn re-arms in the new `onDone`.
4. Tapping a different card replaces the choice (disarm, play, re-arm).

**Phrase helper (step 2 "Mit kér bele?": `PhraseHelper`).**
1. Arm after any playback of the current phrase ends: `PhraseHelperListenButton`, or the auto-play below.
2. Any change to `phraseSlotIds` or `phrasePattern` (via `UseThisWordButton`, `AddWordButton`, `PatternWantButton` or `PatternWithoutButton`) calls `vad.disarm()` first. A phrase that changed must be heard or re-read before it can be "said".
3. **Recommendation (needs an orchestrator decision):** when the phrase changes through a deliberate select, auto-play the updated phrase once, then arm in its `onDone`. This matches "Select to listen", and the learner can always speak right after hearing it.
   - Without auto-play, the learner must press Listen before the mic counts.
   - Arming on "phrase ready" with no playback is possible, but self-talk while browsing ingredients could then submit early. The 0.8 s minimum lowers that risk; it does not remove it.
4. **Hover is silent and never gates or arms** (agreed design §2).

**`beginSpeakTurn(answerId, clipSec)` in `WbwOrderController`:**

```ts
private beginSpeakTurn(def: OrderStep, answerId: string, clipSec: number): void {
  const ep = this.epoch
  this.speak.show()                     // SpeakPrompt: "Say it out loud" + MicIndicator + SaidItButton
  this.vad.arm((source) => {
    if (ep !== this.epoch || !this.active) return
    this.answers.push(answerId)         // step 2: push the phraseAudioKey or "fillings" (decide once for DC3)
    this.speak.showHeard()              // GREEN "Heard you ✓" (~0.6 s), then hide
    this.next(def, source === "mic" ? 0.3 : this.replyPauseSec)  // mic path already waited END_SILENCE 0.7 s
  }, clipSec)
}
```

- **`SaidItButton`** calls `this.vad.saidIt()`, which goes through the same callback with source `"button"`. Show it whenever an answer is chosen and waiting to be said, in **every** mic state. This is "always available". Only one enabled `SaidItButton` at a time (`WbwLeafHelpers.ts:108` takes the first enabled match).
  - Open question for the orchestrator: should Said it also be enabled before any card is chosen? Recommendation: no. Until a phrase is chosen there is nothing that was "said".
- **Disarm points:** `runStep` (top), `finish`, `setActive(false)`, a new card choice, and any phrase-helper change. **`next()` already disarms implicitly**, because `finish("…")` cleared `waitingForSpeech`. Keep the epoch guard (`WbwOrderController.ts:280-290`) as the second safety.
- **Mic lifecycle:** `vad.setMicActive(true)` in `setActive(true)` (`WbwOrderController.ts:124`), and `false` in `setActive(false)` and `finish()` (:292).
- **Remove the current auto-advance:** today `onPhrase` advances in the clip's `onDone` (`if (advance) this.next(def)`, :273-276). Replace that with `beginSpeakTurn`. **Showing or playing a phrase never submits it.**

### 5.2 Clip length for `minSpeech`

- **Simplest:** measure it. `const t0 = getTime(); audio.playVoice(key, () => { const clipSec = getTime() - t0; ... })`. In a muted Preview this over-estimates by 0.5 s (safety net), which is harmless because of the clamp.
- **Alternative:** add `durationOf(key)` to `WbwAudioController`, summing `(AUDIO[k].control as FileAudioTrackProvider).duration` (StudioLib.d.ts:4615) over `key.split("+")`, with a fallback of 1.2 s. **Verify the cast on device.**

### 5.3 Readable state (LEAF and UI)

**On `WbwVoiceActivity`:**
- `waitingForSpeech`, `speechDetected`, `speechSource`
- `vadState`, `micAvailable`, `nudgeSaidIt`, `noisy`
- `micLevelDb`, `noiseFloorDb`, `sampleRateActual`, `armCount`
- `voiceActivityEnabled`, `ignoreMicForTests`

**On `WbwOrderController`:** mirror `waitingForSpeech` / `speechDetected` as getters, so tests read them in the agreed place.

**New object names:** `SpeakPrompt`, `MicIndicator`, `SaidItButton`.

### 5.4 UI (mic indicator and Said it)

Use WbwSharedUI only. No hex values.
- Mode tone: `useTone(TONE_LIVE)` / `toneOf("live")`, with `styleButton(btn, primary)` for "Said it".
- Text: `TEXT_SOFT` / `MUTED`. Success: `GREEN` / `GREEN_FILL`.
- **Never `AMBER` here.** VAD cannot know whether the answer was right.

| `vadState` | MicIndicator | Text (example) |
|---|---|---|
| guard / listening | soft pulse driven by `micLevelDb − noiseFloorDb` | "Say it out loud" |
| candidate | pulse brighter | (same) |
| speech | `GREEN` dot | "Heard you…" |
| done | `GREEN` check, ~0.6 s | "Heard you ✓" |
| nosignal | dim mic glyph, Said it styled primary | "Mic off · tap Said it" |
| `nudgeSaidIt` | Said it pulses | "Say it out loud, or tap Said it" |
| `voiceActivityEnabled = false` | hidden | "Say it out loud, then tap Said it" |

- Keep the small "Use it live" mode chip visible. Colour is never the only cue.
- Place the prompt directly under the phrase cards or `PhraseHelper`, so it does not cover the server or caption.

### 5.5 LEAF tests (proposed)

- **Every existing and new order test:**
  - set `vad.ignoreMicForTests = true` at start
  - answer with `sayIt()`: wait for `waitingForSpeech` and an enabled `SaidItButton` → tap → wait for `speechDetected` and the next `orderStep`
- **New `DC3b_VoiceActivity`:**
  1. Reach step 1. Tap `PhraseCard_jo_napot`. Wait for `waitingForSpeech`.
  2. `injectBlocksForTest(-60, 40)`: calibrate and pass the guard. Expect `vadState === "listening"`.
  3. `injectBlocksForTest(-38, 10)` then `(-60, 20)` (a 0.2 s cough). Expect `speechDetected === false` and the step unchanged.
  4. `injectBlocksForTest(-38, 15, true)` (busy, so our own playback). Expect no detection, and `vadState === "guard"`.
  5. `injectBlocksForTest(-60, 20)`, then `(-38, 30)` (0.6 s). Expect `speechDetected === true`, still the same `orderStep`.
  6. `injectBlocksForTest(-60, 40)` (0.8 s of silence). Expect `speechSource === "mic"`, and `orderStep` advances after `replyPauseSec`.
  7. Without a mic asset or signal, wait 9 s. Expect `nudgeSaidIt === true` and the step **not** advanced.
- **Preview runs:** keep the Preview mic toggle off. For a "real voice" demo take, toggle it on and speak during the `sayIt()` pause (R5_arrival.md:336).

---

## 6. Snap ASR / VoiceML and Hungarian

**Snap's claim.**
- Current docs: "It supports 40+ languages, including mixed language input." The page also says "The ASR Module works in the Lens Studio Preview and on SPECS". It needs "An internet connection: transcription streams over the internet", and lists SPECS as "Fully supported" and Snapchat or Camera Kit as "Not supported" (docs.lensstudio.com/develop/foundation/audio-and-voice/asr-module).
- Skill copies:
  - `skills/specs-asr/resources/docs/asr-module.mdx:10`: "support for 40+ languages, including mixed language input … accommodating various accents and non-native speakers".
  - `skills/specs-asr/SKILL.md:3`, :137 ("Mixed languages handled automatically").
- The two skill files disagree about the Preview. `asr-module.mdx:19` says "This API is only available on Spectacles", while `SKILL.md:18` and the current docs say it works in the Preview too.

**Is Hungarian supported?**
- **No language list is published.** The current page only says `language` / `secondaryLanguages` take ISO 639 codes, and `language` defaults to `"auto"`.
- **Hungarian is not mentioned** on either Snap page. A web search found no Snap source naming it.
- A Snap staff Reddit reply only says ASR has "more languages supported" than VoiceML.
- Verdict: **unverified.** Plausible, given the 40+ count, but undocumented.

**This project cannot select a language.**
- `AsrModule.AsrTranscriptionOptions` (StudioLib.d.ts:27193-27236) has no `language` or `secondaryLanguages`. The docs say "The language, secondaryLanguages, and contentType options need Lens Scripting Version 384 or later", and this d.ts tops out at 372.
- So ASR would run auto-detect on short, non-native Hungarian phrases, a likely misdetection case.

**Snap advises against keyword or short-phrase use.**
- `skills/specs-asr/SKILL.md:16`: "Not recommended for voice commands / keyword spotting … short command words are often misrecognized".
- `skills/specs-27-migration/references/migration-speech-voiceml-asr.md:14-20`: "ASR currently has no biased / keyterm-aware mode".

**Costs if added.**
- Internet (`AsrStatusCode.NoInternet`, StudioLib.d.ts:27147).
- The Microphone descriptor, plus a Transparent-Permission prompt once internet is present (`transparent-permission.mdx:29-30`).
- "Accessing ASR disables camera frame access" (`SKILL.md:136`). Not used here.

**VoiceML** is deprecated (StudioLib.d.ts:23214) and is not an option.

**Conclusion.**
- Do **not** use ASR for the demo. VAD meets the brief: "The microphone only detects that they spoke (voice activity), not what they said" (design-brief.md:88), and "Real speech recognition of the user speaking Hungarian" is out of scope (:133).
- A possible later device experiment: `startTranscribing` while saying "Kérek uborkát a szendvicsembe". Check whether the partials come back as Hungarian.
- A non-empty partial could also act as a bystander-robust "spoke" signal, since ASR gets the Voice profile. LEAF already mocks it (`LeafVoiceInteractor.say()`). It would cost the internet dependency.

---

## 7. To verify on device or in the Preview (cannot be settled from files)

1. **Asset creation:** the native type string for creating Microphone Audio through the Editor API (3.1). Otherwise, the user adds it via Asset Browser → + → Microphone Audio.
2. **Preview behaviour:** whether the Preview mic button starts off. When off, does `getAudioFrame` return `x = 0` or zero-filled frames? The watchdog handles both. Check that the button appears once the `@input` is assigned.
3. **Rates and frame sizes:** the real `sampleRate` after asking for 16000, the typical `shape.x` per update, and samples per second versus `getTime()`, on Specs and in the Preview. Log once at start.
4. **Levels:** floor and speech levels in dBFS, on Specs (with echo cancellation) and on the laptop mic. Use `debugLog` and tune `ONSET_DB` / `ABS_MIN_ONSET`.
5. **Stale audio:** whether audio from before `start()` (a stale buffer) appears. The first 0.15 s is discarded.
6. **Clip duration:** whether `(AUDIO[k].control as FileAudioTrackProvider).duration` is valid for the WAV clips (5.2). Otherwise, measure.
7. **Optional:** whether `require("LensStudio:AsrModule")` alone switches Specs to the Voice profile (bystander rejection), and how Project Settings then shows permissions.

## Sources

**Repo**
- Support/StudioLib.d.ts (lines above)
- Support/editor.d.ts:996, :14822
- Assets/Scripts/WbwAudioController.ts:31-49, 61-128
- Assets/Scripts/WbwOrderController.ts:36, 73-92, 124-143, 161-187, 247-302
- Assets/Scripts/WbwSharedUI.ts:58-89, 363 (tones and colours)
- Assets/Tests/Leaf/WbwLeafHelpers.ts
- devpost/design-brief.md:83, :88, :105, :127, :133
- Cache/TypeScript/Src/Packages/Leaf.lspkg/Interactors/interactor/voiceInput/{LeafAsrModule,LeafVoiceInteractor}.ts
- Cache/TypeScript/Src/Packages/SpectaclesUIKit.lspkg/Scripts/{Services/VoiceInputProvider.ts, Components/Element.ts}
- Cache/TypeScript/Src/Packages/SpectaclesInteractionKit.lspkg/Decorators/Singleton.ts
- agent/phase-c/research/R4_codemap.md:128-134, R5_arrival.md:336

**Skills**
- specs-audio/SKILL.md
- specs-asr/SKILL.md, resources/docs/asr-module.mdx
- specs-camera/resources/docs/{permissions-and-privacy,transparent-permission}.mdx
- specs-snap-cloud/resources/scripts/AudioCaptureUploader.ts, resources/docs/examples/media.mdx
- specs-ai-remote-service/resources/scripts/MicrophoneRecorder.ts
- specs-27-migration/references/migration-speech-voiceml-asr.md

**Web**
- https://docs.lensstudio.com/develop/foundation/audio-and-voice/audio-track-assets
- https://docs.lensstudio.com/develop/foundation/audio-and-voice/asr-module
- https://developers.snap.com/spectacles/about-spectacles-features/apis/asr-module
