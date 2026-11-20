// WbwServerCharacter.ts — the scripted server standing behind the sandwich counter.
// Owns: the server's body (a swappable ObjectPrefab, or a stylised primitive stand-in when
//       none is assigned), idle motion (breathing, weight shift, glances at the user) and a
//       speaking animation. Exposes the head position for the caption bubble.
//       A rigged model (one with an AnimationPlayer, e.g. the Rocketbox barista) is driven by
//       WbwHumanRig instead: idle/talk clips, a nod on acknowledge(), eye contact, blinks, mouth.
// Must NOT: run the conversation (WbwOrderController) or create text.
import {box, cyl, group, rgb, sphere} from "./WbwGeo"
import {camPos} from "./WbwSpatial"
import {WbwHumanRig} from "./WbwHumanRig"

@component
export class WbwServerCharacter extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwServerCharacter – scripted server (idle + speaking)</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @allowUndefined
  @hint("Authored character model (child SceneObject) to animate. Empty = primitive stand-in figure.")
  bodyModel: SceneObject | undefined

  @ui.group_end
  @ui.group_start("Settings")
  @input
  @hint("Height of the top of the head above the floor (cm)")
  @widget(new SliderWidget(150, 195, 1))
  heightCm: number = 172

  @input
  @hint("Apron colour")
  @widget(new ColorWidget())
  apronColor: vec4 = new vec4(0.25, 0.62, 0.42, 1)

  @input
  @hint("How strongly the server turns their head toward the user (0–1)")
  @widget(new SliderWidget(0, 1, 0.05))
  lookAtUser: number = 0.7
  @ui.group_end

  /** True while a server line is playing. */
  isSpeaking: boolean = false

  private body!: SceneObject
  private baseRot: quat = quat.quatIdentity()
  private baseScale: vec3 = vec3.one()
  private head: SceneObject | null = null
  private torso: SceneObject | null = null
  private t0 = 0
  private rig: WbwHumanRig | null = null

  onAwake(): void {
    if (this.bodyModel && this.bodyModel.enabled) {
      this.body = this.bodyModel // authored model (rotated to face the user in the scene)
      const rig = new WbwHumanRig(this.bodyModel)
      if (rig.player) {
        // rigged person: clips + face, applied after the animation update every frame
        this.rig = rig
        this.createEvent("LateUpdateEvent").bind(() => this.rig!.update(getDeltaTime(), this.isSpeaking, camPos()))
        return
      }
      this.baseRot = this.body.getTransform().getLocalRotation()
      this.baseScale = this.body.getTransform().getLocalScale()
    } else {
      this.body = group(this.sceneObject, "ServerBody")
      this.buildStandIn()
    }
    this.t0 = getTime()
    this.createEvent("UpdateEvent").bind(() => this.animate())
  }

  setSpeaking(on: boolean): void {
    this.isSpeaking = on
  }

  /** The learner has answered: a small listening nod (rigged model only). */
  acknowledge(): void {
    this.rig?.acknowledge()
  }

  /** True when the body is a rigged person driven by WbwHumanRig. */
  get isRigged(): boolean {
    return this.rig !== null
  }

  /** World position just above the head — where the caption bubble goes. */
  getCaptionAnchor(): vec3 {
    return this.sceneObject.getTransform().getWorldPosition().add(new vec3(0, this.heightCm + 18, 0))
  }

  private buildStandIn(): void {
    const H = this.heightCm
    const skin = rgb(0.96, 0.8, 0.68)
    const shirt = rgb(0.97, 0.96, 0.92)
    const trousers = rgb(0.45, 0.52, 0.68)
    const hair = rgb(0.55, 0.36, 0.22)
    const b = this.body
    const legs = group(b, "Legs")
    cyl(legs, "LegL", new vec3(-8, 42, 0), new vec3(13, 84, 13), trousers)
    cyl(legs, "LegR", new vec3(8, 42, 0), new vec3(13, 84, 13), trousers)
    box(legs, "ShoeL", new vec3(-8, 3, 4), new vec3(11, 6, 24), rgb(0.62, 0.42, 0.28))
    box(legs, "ShoeR", new vec3(8, 3, 4), new vec3(11, 6, 24), rgb(0.62, 0.42, 0.28))
    const torso = group(b, "Torso", new vec3(0, 84, 0))
    this.torso = torso
    sphere(torso, "Chest", new vec3(0, 30, 0), new vec3(40, 62, 24), shirt)
    box(torso, "Apron", new vec3(0, 14, 11.5), new vec3(32, 50, 2), this.apronColor)
    box(torso, "ApronBib", new vec3(0, 40, 10.5), new vec3(20, 18, 2), this.apronColor)
    cyl(torso, "ArmL", new vec3(-24, 28, 2), new vec3(10, 52, 10), shirt, {rot: new vec3(0, 0, -8)})
    cyl(torso, "ArmR", new vec3(24, 28, 2), new vec3(10, 52, 10), shirt, {rot: new vec3(0, 0, 8)})
    sphere(torso, "HandL", new vec3(-27, 0, 3), new vec3(9, 10, 9), skin)
    sphere(torso, "HandR", new vec3(27, 0, 3), new vec3(9, 10, 9), skin)
    cyl(torso, "Neck", new vec3(0, 62, 0), new vec3(10, 10, 10), skin)
    const head = group(torso, "Head", new vec3(0, H - 84 - 13, 0))
    this.head = head
    sphere(head, "Face", new vec3(0, 0, 0), new vec3(21, 26, 23), skin)
    sphere(head, "Hair", new vec3(0, 6, -2), new vec3(23, 18, 24), hair)
    sphere(head, "Bun", new vec3(0, 6, -12), new vec3(11, 11, 11), hair)
    sphere(head, "EyeL", new vec3(-4.5, 1.5, 10.6), new vec3(2.6, 3.2, 1.5), rgb(0.25, 0.2, 0.18))
    sphere(head, "EyeR", new vec3(4.5, 1.5, 10.6), new vec3(2.6, 3.2, 1.5), rgb(0.25, 0.2, 0.18))
    box(head, "Mouth", new vec3(0, -6, 10.8), new vec3(5, 1.2, 1), rgb(0.8, 0.4, 0.4))
    sphere(head, "EarL", new vec3(-10.5, 0, 0), new vec3(3, 6, 4), skin)
    sphere(head, "EarR", new vec3(10.5, 0, 0), new vec3(3, 6, 4), skin)
  }

  private animate(): void {
    const t = getTime() - this.t0
    // whole-body weight shift
    const sway = Math.sin(t * 0.7) * 0.025
    if (!this.head) {
      // model body: gentle weight shift, breathing and a small nod while speaking
      const nod = this.isSpeaking ? Math.sin(t * 9) * 0.012 : 0
      const breathe = 1 + 0.008 * Math.sin(t * 1.6)
      this.body.getTransform().setLocalRotation(this.baseRot.multiply(quat.fromEulerAngles(nod, Math.sin(t * 0.33) * 0.05, sway * 0.3)))
      const b = this.baseScale // GLB prefabs carry a x100 root scale — keep it
      this.body.getTransform().setLocalScale(new vec3(b.x, b.y * breathe, b.z))
      return
    }
    this.body.getTransform().setLocalRotation(quat.fromEulerAngles(0, 0, sway * 0.3))
    if (this.torso) {
      const breathe = 1 + 0.012 * Math.sin(t * 1.6)
      this.torso.getTransform().setLocalScale(new vec3(1, breathe, 1 + 0.01 * Math.sin(t * 1.6)))
    }
    if (this.head) {
      // glance toward the user, with a small speaking nod
      const hp = this.head.getTransform().getWorldPosition()
      const to = camPos().sub(hp)
      const parentRot = this.sceneObject.getTransform().getWorldRotation()
      const local = parentRot.invert().multiplyVec3(to)
      const yaw = Math.max(-0.7, Math.min(0.7, Math.atan2(local.x, local.z))) * this.lookAtUser
      const idleYaw = Math.sin(t * 0.33) * 0.12 * (1 - this.lookAtUser)
      const nod = this.isSpeaking ? Math.sin(t * 9) * 0.06 : Math.sin(t * 0.9) * 0.015
      this.head.getTransform().setLocalRotation(quat.fromEulerAngles(nod, yaw + idleYaw, 0))
    }
  }
}
