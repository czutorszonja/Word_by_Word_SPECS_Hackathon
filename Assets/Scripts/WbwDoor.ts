// WbwDoor.ts — the café's entrance door: swings open when the user comes close, closes behind them.
// Owns: the door leaf's hinge rotation only (eased). The door carries the two-sided sign (NYITVA
//       outside, ZÁRVA inside), so once the user is in and the door has closed, looking back shows
//       the ZÁRVA side — like a real shop's flip sign.
// Must NOT: teach, play audio or know about modes (the sign faces are ordinary learnables).
// Stable names: the hinge SceneObject is "DoorHinge" (child of "Entrance/Door").
import {camPos} from "./WbwSpatial"

@component
export class WbwDoor extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwDoor – entrance door that opens as you approach</span>')
  @ui.separator
  @input
  @hint("The door leaf's hinge; it turns about its local Y")
  hinge!: SceneObject

  @input
  @hint("Open angle (deg, about the hinge's local Y; negative swings the door into the café)")
  @widget(new SliderWidget(-120, 120, 1))
  openAngleDeg: number = -95

  @input
  @hint("Open when the user's head is this close to the doorway (cm, horizontal)")
  @widget(new SliderWidget(60, 250, 5))
  openDistanceCm: number = 120

  @input
  @hint("How fast the door swings (fraction of the full swing per second)")
  @widget(new SliderWidget(0.3, 4, 0.1))
  speed: number = 1.4

  /** 0 = closed, 1 = fully open (eased swing follows this). */
  openAmount: number = 0
  get isOpen(): boolean { return this.openAmount > 0.95 }
  get isClosed(): boolean { return this.openAmount < 0.02 }

  onAwake(): void {
    this.createEvent("UpdateEvent").bind(() => this.tick(getDeltaTime()))
  }

  private tick(dt: number): void {
    if (!this.hinge) return
    const c = camPos(), d = this.sceneObject.getTransform().getWorldPosition()
    const near = Math.hypot(c.x - d.x, c.z - d.z) < this.openDistanceCm
    const step = Math.min(1, dt * this.speed)
    this.openAmount = near ? Math.min(1, this.openAmount + step) : Math.max(0, this.openAmount - step)
    const e = this.openAmount * this.openAmount * (3 - 2 * this.openAmount)
    this.hinge.getTransform().setLocalRotation(quat.fromEulerAngles(0, e * this.openAngleDeg * Math.PI / 180, 0))
  }
}
