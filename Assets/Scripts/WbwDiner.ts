// WbwDiner.ts — a seated café guest: a rigged, textured person (Rocketbox, see licenses/) on a chair at a table.
// Owns: the guest's quiet life at the table — the seated idle loop, blinks, now and then a glance around the
//       room ("look" clip); two guests at one table take turns talking (gesture + mouth) and look at each other.
// Must NOT: react to the learner's flow, look at the learner, or play sounds (the café stays quiet for the lesson).
import {WbwHumanRig} from "./WbwHumanRig"

const rand = (a: number, b: number) => a + Math.random() * (b - a)

@component
export class WbwDiner extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwDiner – seated café guest (idle, glances, chats with a partner)</span>')
  @input
  @hint("The person model (GLB prefab instance with an AnimationPlayer)")
  model!: SceneObject

  @input
  @allowUndefined
  @hint("The other guest at the same table — they take turns talking and look at each other")
  partner: WbwDiner | undefined

  @input
  @hint("Runs the pair's conversation (set on one of the two)")
  leads: boolean = false

  @input
  @hint("Resting smile (0–1)")
  @widget(new SliderWidget(0, 1, 0.05))
  smile: number = 0.15

  /** True while this guest is talking (the pair's leader sets both). */
  speaking: boolean = false

  private rig: WbwHumanRig | null = null
  private t = 0
  private nextGlance = rand(6, 20)
  private turnUntil = rand(1, 4)
  private turn: "me" | "partner" | "none" = "none"

  onAwake(): void {
    if (!this.model) return
    const rig = new WbwHumanRig(this.model)
    if (!rig.player) return
    rig.smile = this.smile
    rig.headFollow = 0.6
    rig.headMax = 0.35
    this.rig = rig
    this.createEvent("LateUpdateEvent").bind(() => this.tick(getDeltaTime()))
  }

  get isRigged(): boolean {
    return this.rig !== null
  }

  /** World position of the head (for a partner's eye contact). */
  headPos(): vec3 | null {
    return this.rig && this.rig.head ? this.rig.head.getWorldPosition() : null
  }

  private tick(dt: number): void {
    if (!this.rig) return
    this.t += dt
    if (this.partner && this.leads) this.runConversation()
    if (!this.partner && this.t >= this.nextGlance) {
      // alone at the table: now and then look around the room
      this.rig.playOnce("look")
      this.nextGlance = this.t + rand(14, 28)
    }
    const target = this.partner ? this.partner.headPos() : null
    this.rig.update(dt, this.speaking, target)
  }

  /** Turn-taking: one talks for a few seconds, a short pause, then the other; now and then both are quiet. */
  private runConversation(): void {
    if (this.t < this.turnUntil) return
    const p = this.partner!
    if (this.turn === "none") {
      this.turn = Math.random() < 0.5 ? "me" : "partner"
      this.turnUntil = this.t + rand(2.5, 6)
    } else {
      this.turn = Math.random() < 0.25 ? "none" : this.turn === "me" ? "partner" : "me"
      this.turnUntil = this.t + (this.turn === "none" ? rand(1.5, 4) : rand(2.5, 6))
    }
    this.speaking = this.turn === "me"
    p.speaking = this.turn === "partner"
  }
}
