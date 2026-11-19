// WbwAudioController.ts — plays clips by file name.
// Owns: one voice channel (Hungarian words/phrases/server lines — a new clip interrupts the
//       previous one) and a small SFX pool. Clips resolve by key = file base name, so a
//       recording dropped into Assets/Audio/hu/ under the same name replaces the placeholder.
// Must NOT: decide when to play (controllers do) or hold experience state.
import {AUDIO} from "./WbwAudioBank"

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
  /** Number of voice clips started this session. */
  voicePlayCount: number = 0

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
