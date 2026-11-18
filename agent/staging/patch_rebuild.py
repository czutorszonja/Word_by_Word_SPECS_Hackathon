import os
os.chdir("C:/LensProjects/Word_by_Word_SPECS_Hackhaton/Assets/Scripts")
def sub(p, a, b):
    s = open(p, encoding='utf-8').read()
    if a not in s: raise SystemExit("MISSING " + p + ": " + a[:90])
    open(p, 'w', encoding='utf-8').write(s.replace(a, b))

# ---- Server: animate the authored model if present
p = 'WbwServerCharacter.ts'
sub(p, '''  @input
  @allowUndefined
  @hint("Optional character model (GLB prefab). Empty = primitive stand-in figure.")
  bodyPrefab: ObjectPrefab | undefined
''', '''  @input
  @allowUndefined
  @hint("Authored character model (child SceneObject) to animate. Empty = primitive stand-in figure.")
  bodyModel: SceneObject | undefined
''')
sub(p, '''    this.body = group(this.sceneObject, "ServerBody")
    if (this.bodyPrefab) {
      // generated models are baked facing -Z; turn them to face the user (+Z here)
      const holder = group(this.body, "Model", vec3.zero(), 180)
      this.bodyPrefab.instantiate(holder)
    } else {
      this.buildStandIn()
    }''', '''    if (this.bodyModel) {
      this.body = this.bodyModel // authored model (rotated to face the user in the scene)
      this.baseRot = this.body.getTransform().getLocalRotation()
    } else {
      this.body = group(this.sceneObject, "ServerBody")
      this.buildStandIn()
    }''')
sub(p, '''  private body!: SceneObject''', '''  private body!: SceneObject
  private baseRot: quat = quat.quatIdentity()''')
sub(p, '''      this.body.getTransform().setLocalRotation(quat.fromEulerAngles(nod, Math.sin(t * 0.33) * 0.05, sway * 0.3))''',
    '''      this.body.getTransform().setLocalRotation(this.baseRot.multiply(quat.fromEulerAngles(nod, Math.sin(t * 0.33) * 0.05, sway * 0.3)))''')

# ---- Learn: soft warm highlight on ingredients named by offered phrases
p = 'WbwLearnController.ts'
sub(p, '''  /** Ids of every learnable object in the café. */
  learnableIds: string[] = []''', '''  /** Ids of every learnable object in the café. */
  learnableIds: string[] = []
  /** Ids highlighted outside Learn mode (ingredients named by offered phrases). */
  highlightIds: string[] = []''')
sub(p, '''  /** Programmatic select (same as pinching the object) — handy for tests. */''', '''  /** Soft warm highlight on these objects while Learn mode is off (e.g. ordering). */
  setHighlight(ids: string[]): void {
    this.highlightIds = ids.filter((id) => this.learnableIds.indexOf(id) >= 0)
    if (!this.active) for (const t of this.tracked) {
      const on = this.highlightIds.indexOf(t.l.id) >= 0
      t.bracket.enabled = on
      if (on) tint(t.bracket, this.highlightColor, true)
    }
  }

  /** Programmatic select (same as pinching the object) — handy for tests. */''')
sub(p, '''  @input
  @hint("Bracket colour (subtle, warm)")''', '''  @input
  @hint("Highlight colour for ingredients named by the offered phrase cards")
  @widget(new ColorWidget())
  highlightColor: vec4 = new vec4(1.0, 0.78, 0.35, 1)

  @input
  @hint("Bracket colour (subtle, warm)")''')
sub(p, '''  private tick(): void {
    if (!this.active) return
    const cam = camPos()''', '''  private tick(): void {
    if (!this.active) {
      if (this.highlightIds.length > 0) this.faceBrackets(camPos())
      return
    }
    const cam = camPos()''')
sub(p, '''    // brackets face the user and stay attached (children of the object)
    for (const t of this.tracked) {''', '''    this.faceBrackets(cam)
    // walk-away hides the card
    if (this.wordCard.isVisible && this.activeCardWordId && horizDist(cam, this.openedAt) > this.walkAwayCm) this.closeCard()
    this.scan(cam)
  }

  private faceBrackets(cam: vec3): void {
    // brackets face the user and stay attached (children of the object)
    for (const t of this.tracked) {''')
sub(p, '''      bt.setWorldPosition(t.l.so.getTransform().getWorldPosition().add(d.uniformScale(t.l.size.z / 2 + 0.5)))
    }
    // walk-away hides the card
    if (this.wordCard.isVisible && this.activeCardWordId && horizDist(cam, this.openedAt) > this.walkAwayCm) this.closeCard()
    // rescan the nearest objects in view a few times per second
    const now = getTime()''', '''      bt.setWorldPosition(t.l.so.getTransform().getWorldPosition().add(d.uniformScale(t.l.size.z / 2 + 0.5)))
    }
  }

  private scan(cam: vec3): void {
    // rescan the nearest objects in view a few times per second
    const now = getTime()''')
sub(p, '''    if (!on) {
      this.closeCard()
      for (const t of this.tracked) t.bracket.enabled = false
      this.bracketedIds = []
    } else {
      this.nextScan = 0
    }''', '''    if (!on) {
      this.closeCard()
      for (const t of this.tracked) t.bracket.enabled = false
      this.bracketedIds = []
    } else {
      this.highlightIds = []
      for (const t of this.tracked) tint(t.bracket, this.bracketColor, true)
      this.nextScan = 0
    }''')

# ---- Order: phrase cards on the counter tray + ingredient highlight
p = 'WbwOrderController.ts'
sub(p, '''  @input @hint("Seating root: children Table_<n>, each with a TableCard_<n> child") seating!: SceneObject''',
    '''  @input @hint("Seating root: children Table_<n>, each with a TableCard_<n> child") seating!: SceneObject
  @input @allowUndefined @hint("Authored tray on the sandwich counter where the phrase cards lie (tilted toward the user)") phraseTray: SceneObject | undefined''')
sub(p, '''  @input
  @hint("Distance of the phrase cards in front of the user (cm) — brief: ~60 cm")''', '''  @input
  @hint("Lay the phrase cards on the counter tray (user looks down to pick). Off = float in front of the user.")
  phrasesOnCounter: boolean = true

  @input
  @hint("Distance of the phrase cards in front of the user when NOT on the counter (cm)")''')
sub(p, '''  private session!: WbwSession
  private audio!: WbwAudioController''', '''  private session!: WbwSession
  private audio!: WbwAudioController
  private learn: WbwLearnController | null = null''')
sub(p, '''  init(session: WbwSession, audio: WbwAudioController): void {
    this.session = session
    this.audio = audio''', '''  init(session: WbwSession, audio: WbwAudioController, learn?: WbwLearnController): void {
    this.session = session
    this.audio = audio
    this.learn = learn ?? null''')
sub(p, '''import {WbwSession} from "./WbwSession"''', '''import {WbwSession} from "./WbwSession"
import {WbwLearnController} from "./WbwLearnController"''')
sub(p, '''    // ~60 cm ahead, below eye level, between the user and the server
    const cam = camPos()
    const toServer = flat(this.server.getSceneObject().getTransform().getWorldPosition().sub(cam))
    placeFacingUser(this.phrases.getSceneObject(), cam.add(toServer.uniformScale(this.phraseDistanceCm)).add(new vec3(0, -this.phraseDropCm, 0)))''', '''    if (this.phrasesOnCounter && this.phraseTray) {
      // lying on the counter in front of the user, tilted up toward them (authored tray)
      const tt = this.phraseTray.getTransform(), pt = this.phrases.getSceneObject().getTransform()
      pt.setWorldPosition(tt.getWorldPosition())
      pt.setWorldRotation(tt.getWorldRotation())
    } else {
      // ~60 cm ahead, below eye level, between the user and the server
      const cam = camPos()
      const toServer = flat(this.server.getSceneObject().getTransform().getWorldPosition().sub(cam))
      placeFacingUser(this.phrases.getSceneObject(), cam.add(toServer.uniformScale(this.phraseDistanceCm)).add(new vec3(0, -this.phraseDropCm, 0)))
    }
    // softly highlight the real ingredients/items the offered phrases name
    if (this.learn) {
      const ids: string[] = []
      for (const pid of list) for (const w of phraseById(pid)!.words) if (ids.indexOf(w) < 0) ids.push(w)
      this.learn.setHighlight(ids)
    }''')
s = open(p, encoding='utf-8').read()
n0 = s.count('this.clearHighlight()')
s = s.replace('''    this.phrases.hide()
    this.offeredPhraseIds = []
    this.picked = []''', '''    this.phrases.hide()
    this.clearHighlight()
    this.offeredPhraseIds = []
    this.picked = []''')
s = s.replace('''    } else {
      this.phrases.hide()
      this.caption.hide()''', '''    } else {
      this.phrases.hide()
      this.clearHighlight()
      this.caption.hide()''')
s = s.replace('''  // ── helpers ──''', '''  // ── helpers ──
  private clearHighlight(): void {
    if (this.learn && this.learn.highlightIds.length > 0) this.learn.setHighlight([])
  }
''')
s = s.replace('''  private finish(): void {
    this.orderStep = 7''', '''  private finish(): void {
    this.clearHighlight()
    this.orderStep = 7''')
open(p, 'w', encoding='utf-8').write(s)
print("clearHighlight calls:", s.count('this.clearHighlight()'))

# ---- Main passes learn to order
sub('WbwMain.ts', '''    this.order.init(this.session, this.audio)''', '''    this.order.init(this.session, this.audio, this.learn)''')

# ---- Phrase cards sized for ~125 cm (on the counter)
p = 'WbwPhraseChoicesUI.ts'
sub(p, 'cardWidthCm: number = 9', 'cardWidthCm: number = 14')
sub(p, 'cardHeightCm: number = 10.5', 'cardHeightCm: number = 13')
sub(p, 'viewDistanceCm: number = 68', 'viewDistanceCm: number = 125')
print("ok")
