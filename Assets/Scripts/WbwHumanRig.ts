// WbwHumanRig.ts — makes a rigged, textured person (Microsoft Rocketbox avatar, imported as GLB)
// look alive: idle/talk/nod clip blending, eye contact, blinking and mouth shapes while speaking.
// Owns: the AnimationPlayer clip weights, the head/eye bones' extra look-at turn (applied after the
//       animation each frame) and the face blendshape weights.
// Must NOT: decide when the person speaks (the owner calls update(dt, speaking, lookTarget)).
// Expected rig: Rocketbox biped bone names ("Bip01 Head", "Bip01 LEye", "Bip01 REye"), clips named
// idle / talk / nod, face shapes AA_VI_* (visemes), AK_09/10 (blinks), AK_44/45 (smile).

const VOWELS = ["AA_VI_10_aa", "AA_VI_11_E", "AA_VI_12_I", "AA_VI_13_O", "AA_VI_14_U"]
const CONSONANTS = ["AA_VI_01_PP", "AA_VI_02_FF", "AA_VI_04_DD", "AA_VI_05_KK", "AA_VI_07_SS", "AA_VI_08_nn", "AA_VI_09_RR"]
const BLINK = ["AK_09_EyeBlinkLeft", "AK_10_EyeBlinkRight"]
const SMILE = ["AK_44_MouthSmileLeft", "AK_45_MouthSmileRight"]
const JAW = "AK_25_JawOpen"

function findByName(root: SceneObject, name: string): SceneObject | null {
  if (root.name === name) return root
  for (let i = 0; i < root.getChildrenCount(); i++) {
    const r = findByName(root.getChild(i), name)
    if (r) return r
  }
  return null
}

function collect<T extends Component>(root: SceneObject, type: string, out: T[]): T[] {
  const cs = root.getComponents(type as any) as any[]
  for (const c of cs) out.push(c as T)
  for (let i = 0; i < root.getChildrenCount(); i++) collect(root.getChild(i), type, out)
  return out
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export class WbwHumanRig {
  readonly player: AnimationPlayer | null
  readonly head: Transform | null
  /** Resting smile (0–1) — a friendly face without looking fixed. */
  smile = 0.32
  /** How far the head turns toward the look target (fraction of the angle, capped). */
  headFollow = 0.7

  private face: RenderMeshVisual | null = null
  private eyes: Transform[] = []
  private eyeRest: quat[] = []
  private eyeFwd: vec3[] = []
  private headFwd = new vec3(0, 0, 1)
  private bodyFwd = new vec3(0, 0, 1)
  private root: Transform
  private talkW = 0
  private nodT = -1
  private headAmt = 0
  private eyeAmt = 0
  private t = 0
  private nextBlink = 2
  private blinkT = -1
  private syl = {name: "", amp: 0, start: 0, len: 0.15}
  private mouthNames: string[] = []

  constructor(root: SceneObject) {
    this.root = root.getTransform()
    const players = collect<AnimationPlayer>(root, "Component.AnimationPlayer", [])
    this.player = players.length ? players[0] : null
    const h = findByName(root, "Bip01 Head")
    this.head = h ? h.getTransform() : null
    for (const n of ["Bip01 LEye", "Bip01 REye"]) {
      const e = findByName(root, n)
      if (e) this.eyes.push(e.getTransform())
    }
    for (const v of collect<RenderMeshVisual>(root, "Component.RenderMeshVisual", [])) {
      const names = v.getBlendShapeNames ? v.getBlendShapeNames() : []
      if (names.indexOf(BLINK[0]) >= 0) {
        this.face = v
        this.mouthNames = VOWELS.concat(CONSONANTS, [JAW]).filter((n) => names.indexOf(n) >= 0)
      }
    }
    // Calibrate at bind pose (onAwake, before the first animation update): the avatar faces its root's +Z.
    this.bodyFwd = this.root.getWorldRotation().multiplyVec3(new vec3(0, 0, 1))
    if (this.head) this.headFwd = this.head.getWorldRotation().invert().multiplyVec3(this.bodyFwd)
    for (const e of this.eyes) {
      this.eyeRest.push(e.getLocalRotation())
      this.eyeFwd.push(e.getWorldRotation().invert().multiplyVec3(this.bodyFwd))
    }
    this.startClips()
  }

  get hasFace(): boolean {
    return this.face !== null
  }

  private clip(name: string): AnimationClip | null {
    if (!this.player) return null
    try {
      return this.player.getClip(name)
    } catch (e) {
      return null
    }
  }

  private startClips(): void {
    const p = this.player
    if (!p) return
    p.stopAll()
    for (const c of p.clips) {
      c.weight = 0
      c.playbackMode = c.name === "nod" ? PlaybackMode.Single : PlaybackMode.Loop
    }
    const idle = this.clip("idle")
    if (idle) {
      idle.weight = 1
      p.playClipAt("idle", Math.random() * Math.max(0, idle.end - 1))
    }
  }

  /** A short "mm-hm" nod — the listener accepting what was said. */
  acknowledge(): void {
    const nod = this.clip("nod")
    if (!nod || !this.player) return
    this.nodT = 0
    this.player.playClipAt("nod", 0)
  }

  /** Call every frame from LateUpdate (after the AnimationPlayer has posed the skeleton). */
  update(dt: number, speaking: boolean, lookTarget: vec3 | null): void {
    this.t += dt
    this.updateClips(dt, speaking)
    if (lookTarget) this.lookAt(dt, lookTarget)
    this.updateFace(dt, speaking)
  }

  private updateClips(dt: number, speaking: boolean): void {
    const p = this.player
    if (!p) return
    const talk = this.clip("talk")
    if (talk) {
      if (speaking && this.talkW < 0.05 && !p.getClipIsPlaying("talk")) {
        // each utterance starts at a different moment of the long gesture clip
        p.playClipAt("talk", Math.random() * Math.max(0, talk.end - 8))
      }
      this.talkW = clamp(this.talkW + (speaking ? 2.2 : -1.4) * dt, 0, 1)
      talk.weight = this.talkW * this.talkW * (3 - 2 * this.talkW) * 0.85
      if (this.talkW <= 0 && p.getClipIsPlaying("talk")) p.stopClip("talk")
    }
    const nod = this.clip("nod")
    if (nod && this.nodT >= 0) {
      this.nodT += dt
      const len = nod.end - nod.begin
      const w = Math.min(1, this.nodT / 0.25, (len - this.nodT) / 0.4)
      nod.weight = clamp(w, 0, 1) * 0.9
      if (this.nodT >= len) {
        this.nodT = -1
        nod.weight = 0
      }
    }
  }

  private lookAt(dt: number, target: vec3): void {
    if (this.head) {
      const hp = this.head.getWorldPosition()
      const to = target.sub(hp)
      const toN = to.normalize()
      const bf = this.root.getWorldRotation().multiplyVec3(new vec3(0, 0, 1))
      // only when the target is in front of the person (not behind their shoulder)
      const flatTo = new vec3(to.x, 0, to.z).normalize()
      const front = bf.x * flatTo.x + bf.z * flatTo.z > 0.25
      const hr = this.head.getWorldRotation()
      const f = hr.multiplyVec3(this.headFwd).normalize()
      const ang = Math.acos(clamp(f.dot(toN), -1, 1))
      const want = front ? Math.min(ang * this.headFollow, 0.5) : 0
      this.headAmt += (want - this.headAmt) * Math.min(1, dt * 3)
      if (ang > 1e-3 && this.headAmt > 1e-3) {
        const q = quat.slerp(quat.quatIdentity(), quat.rotationFromTo(f, toN), clamp(this.headAmt / ang, 0, 1))
        this.head.setWorldRotation(q.multiply(hr))
      }
    }
    for (let i = 0; i < this.eyes.length; i++) {
      const e = this.eyes[i]
      e.setLocalRotation(this.eyeRest[i])
      const er = e.getWorldRotation()
      const f = er.multiplyVec3(this.eyeFwd[i]).normalize()
      const toN = target.sub(e.getWorldPosition()).normalize()
      const ang = Math.acos(clamp(f.dot(toN), -1, 1))
      if (i === 0) this.eyeAmt += (Math.min(ang, 0.35) - this.eyeAmt) * Math.min(1, dt * 12)
      if (ang > 1e-3) {
        const q = quat.slerp(quat.quatIdentity(), quat.rotationFromTo(f, toN), clamp(this.eyeAmt / ang, 0, 1))
        e.setWorldRotation(q.multiply(er))
      }
    }
  }

  private updateFace(dt: number, speaking: boolean): void {
    const v = this.face
    if (!v) return
    // blinks every 2–6 s, ~0.16 s each, now and then a double blink
    if (this.blinkT < 0 && this.t >= this.nextBlink) {
      this.blinkT = 0
      this.nextBlink = this.t + 2 + Math.random() * 4
      if (Math.random() < 0.15) this.nextBlink = this.t + 0.35
    }
    let b = 0
    if (this.blinkT >= 0) {
      this.blinkT += dt
      b = Math.sin(Math.PI * clamp(this.blinkT / 0.16, 0, 1))
      if (this.blinkT >= 0.16) this.blinkT = -1
    }
    for (const n of BLINK) v.setBlendShapeWeight(n, b)
    for (const n of SMILE) v.setBlendShapeWeight(n, this.smile * (speaking ? 0.6 : 1))
    // mouth: syllables of 0.11–0.22 s, mostly vowels with consonant closures in between
    const s = this.syl
    if (speaking && this.t >= s.start + s.len) {
      const vowel = Math.random() < 0.68
      const pool = vowel ? VOWELS : CONSONANTS
      s.name = pool[Math.floor(Math.random() * pool.length)]
      s.amp = vowel ? 0.3 + Math.random() * 0.3 : 0.3 + Math.random() * 0.25
      s.start = this.t
      s.len = 0.11 + Math.random() * 0.11
    }
    const phase = clamp((this.t - s.start) / s.len, 0, 1)
    const env = speaking ? Math.sin(Math.PI * phase) * s.amp : 0
    for (const n of this.mouthNames) {
      const target = n === s.name ? env : n === JAW ? (speaking && VOWELS.indexOf(s.name) >= 0 ? env * 0.25 : 0) : 0
      const cur = v.hasBlendShapeWeight(n) ? v.getBlendShapeWeight(n) : 0
      v.setBlendShapeWeight(n, cur + (target - cur) * Math.min(1, dt * 18))
    }
  }
}
