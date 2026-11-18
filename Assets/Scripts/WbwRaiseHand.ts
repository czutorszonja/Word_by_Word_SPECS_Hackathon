// WbwRaiseHand.ts — detects "raise an open hand" on Specs via SIK hand tracking.
// Owns: per-frame check of both hands: tracked, palm facing the user and raised to about chest /
//       face height, held for `holdSeconds`. Fires once per raise (the hand must drop again
//       before it can fire a second time). Reports where the palm is so the menu can open near it.
// Must NOT: open UI itself (WbwMain does), or run in the Lens Studio preview without hands
//           (it simply never fires there; the HUD "Menu" button is the preview stand-in).
import {HandInputData} from "SpectaclesInteractionKit.lspkg/Providers/HandInputData/HandInputData"
import {camPos} from "./WbwSpatial"

export class WbwRaiseHand {
  /** Seconds the palm must stay raised before the menu opens. */
  holdSeconds = 0.35
  /** The palm counts as raised when it is no more than this far below the eyes (cm). */
  maxBelowEyesCm = 35
  /** ...and within this distance of the head (cm). */
  maxReachCm = 70

  private since: {[hand: string]: number} = {left: -1, right: -1}
  private armed: {[hand: string]: boolean} = {left: true, right: true}
  private hands: HandInputData | null = null

  constructor() {
    try {
      this.hands = HandInputData.getInstance()
    } catch (e) {
      this.hands = null
    }
  }

  /** Call every frame. Returns the palm position when a raise completes, else null. */
  update(): vec3 | null {
    if (!this.hands) return null
    const now = getTime()
    for (const side of ["left", "right"] as const) {
      let hand
      try {
        hand = this.hands.getHand(side)
      } catch (e) {
        continue
      }
      if (!hand || !hand.isTracked()) {
        this.since[side] = -1
        this.armed[side] = true
        continue
      }
      const palm = hand.getPalmCenter()
      const eye = camPos()
      const raised = palm !== null && hand.isFacingCamera() && palm.y > eye.y - this.maxBelowEyesCm && palm.distance(eye) < this.maxReachCm
      if (!raised) {
        this.since[side] = -1
        this.armed[side] = true
        continue
      }
      if (!this.armed[side]) continue
      if (this.since[side] < 0) this.since[side] = now
      if (now - this.since[side] >= this.holdSeconds) {
        this.armed[side] = false
        this.since[side] = -1
        return palm
      }
    }
    return null
  }
}
