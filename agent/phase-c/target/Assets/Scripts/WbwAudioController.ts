// WbwAudioController.ts — plays clips by file name.
// Owns: one voice channel (Hungarian words/phrases/server lines — a new clip interrupts the
//       previous one) and a small SFX pool. Clips resolve by key = file base name, so a
//       recording dropped into Assets/Audio/hu/ under the same name replaces the placeholder.
//       Also answers "is a Lens sound playing?" (isBusy / isVoiceBusy: the playback gate of
//       WbwVoiceActivity, so the Lens never hears its own clips as the learner speaking) and
//       "how long is this clip?" (durationOf, also for "a+b+c" sentences).
// Must NOT: decide when to play (controllers do) or hold experience state.
import {AUDIO} from "./WbwAudioBank"

/** Length assumed for a clip part whose duration cannot be read (s). */
const FALLBACK_PART_SEC = 1.2

@component
export class WbwAudioController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwAudioController – voice + SFX playback by file name</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Volume of the Hungarian voice clips")
  @widget(new SliderWidget(0, 1, 0.05))
  voiceVolume: number = 1.0

  @input
  @hint("Volume of UI sound effects (chime, save, match)")
  @widget(new SliderWidget(0, 1, 0.05))
  sfxVolume: number = 0.6
  @ui.group_end

  /** Key of the last voice clip started (for tests), e.g. "w_olivabogyo". */
  lastVoiceKey: string = ""
  /** Key of the last SFX started. */
  lastSfxKey: string = ""
  /** Number of voice clips started this session ("a+b+c" counts one per clip part). */
  voicePlayCount: number = 0
  /** Number of SFX started this session. */
  sfxPlayCount: number = 0

  private voice!: AudioComponent
  private sfx: AudioComponent[] = []
  private sfxIdx = 0
  private token = 0
  private pendingDone: (() => void) | null = null

  onAwake(): void {
    const vObj = global.scene.createSceneObject("VoiceChannel")
    vObj.setParent(this.sceneObject)
    this.voice = vObj.createComponent("Component.AudioComponent") as AudioComponent
    this.voice.playbackMode = Audio.PlaybackMode.LowLatency
    this.voice.setOnFinish(() => this.voiceFinished())
    for (let i = 0; i < 3; i++) {
      const s = global.scene.createSceneObject(`SfxChannel${i}`)
      s.setParent(this.sceneObject)
      const a = s.createComponent("Component.AudioComponent") as AudioComponent
      a.playbackMode = Audio.PlaybackMode.LowLatency
      this.sfx.push(a)
    }
  }

  /** True if the clip exists ("a+b+c": every clip of the sequence exists). */
  has(key: string): boolean {
    return key.length > 0 && key.split("+").every((k) => !!AUDIO[k])
  }

  /** Voice channel only: a clip plays or its finish is still pending (between the parts of "a+b+c" too). */
  isVoiceBusy(): boolean {
    return this.pendingDone !== null || (!!this.voice && this.voice.isPlaying())
  }

  /** Any Lens sound: the voice channel (see isVoiceBusy) or an SFX channel. The mic gate of WbwVoiceActivity. */
  isBusy(): boolean {
    if (this.isVoiceBusy()) return true
    for (const a of this.sfx) if (a.isPlaying()) return true
    return false
  }

  /**
   * Seconds of a key; "a+b+c" = the sum of its parts. A part that is missing from the bank, or whose
   * duration cannot be read, counts as 1.2 s. Never plays anything.
   */
  durationOf(key: string): number {
    let sec = 0
    for (const k of key.split("+")) {
      const track = AUDIO[k]
      const control = track ? track.control : null
      const d = control ? (control as FileAudioTrackProvider).duration : 0
      sec += d > 0 ? d : FALLBACK_PART_SEC
    }
    return sec
  }

  /**
   * Play a voice clip; `onDone` fires when it ends (or immediately if the clip is missing).
   * "a+b+c" plays the clips one after another (sentences composed from word and connector clips).
   */
  playVoice(key: string, onDone?: () => void): void {
    if (key.indexOf("+") >= 0) {
      this.playSequence(key, key.split("+"), onDone)
      return
    }
    this.playOne(key, key, onDone)
  }

  private playSequence(fullKey: string, parts: string[], onDone?: () => void): void {
    let i = 0
    const next = () => {
      if (i >= parts.length) { if (onDone) onDone(); return }
      const tokenBefore = this.token
      this.playOne(fullKey, parts[i++], () => {
        // a newer playVoice/stopVoice cancels the rest of the sentence
        if (this.token === tokenBefore + 1) next()
      })
    }
    next()
  }

  private playOne(reportKey: string, key: string, onDone?: () => void): void {
    this.token++
    const track = AUDIO[key]
    this.lastVoiceKey = reportKey
    this.voicePlayCount++
    if (!track) {
      print(`WbwAudio: no clip named '${key}'`)
      if (onDone) onDone()
      return
    }
    if (this.voice.isPlaying()) this.voice.stop(false)
    this.pendingDone = onDone ?? null
    const myToken = this.token
    this.voice.audioTrack = track
    this.voice.volume = this.voiceVolume
    this.voice.play(1)
    // Safety net in case the finish callback never arrives (e.g. muted preview).
    const ev = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
    ev.bind(() => {
      if (myToken === this.token && this.pendingDone) this.voiceFinished()
    })
    ev.reset(Math.max(0.6, this.voice.duration + 0.5))
  }

  stopVoice(): void {
    this.token++
    this.pendingDone = null
    if (this.voice && this.voice.isPlaying()) this.voice.stop(false)
  }

  playSfx(key: string): void {
    this.sfxPlayCount++
    const track = AUDIO[key]
    this.lastSfxKey = key
    if (!track) return
    const a = this.sfx[this.sfxIdx]
    this.sfxIdx = (this.sfxIdx + 1) % this.sfx.length
    if (a.isPlaying()) a.stop(false)
    a.audioTrack = track
    a.volume = this.sfxVolume
    a.play(1)
  }

  private voiceFinished(): void {
    const cb = this.pendingDone
    this.pendingDone = null
    if (cb) cb()
  }
}
