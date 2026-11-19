// WbwSpatial.ts — camera-relative placement helpers (pure functions).
// Owns: "where is the user / where are they looking" math and face-the-user rotation.
// Must NOT: hold state or create scene content.
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"

export function camTransform(): Transform {
  return WorldCameraFinderProvider.getInstance().getTransform()
}
export function camPos(): vec3 {
  return camTransform().getWorldPosition()
}
/** Direction the user is looking (SIK convention: camera.back). */
export function camLook(): vec3 {
  return camTransform().back
}
export function flat(v: vec3): vec3 {
  const f = new vec3(v.x, 0, v.z)
  return f.length < 1e-4 ? new vec3(0, 0, -1) : f.normalize()
}
export function camLookFlat(): vec3 {
  return flat(camLook())
}
export function camRightFlat(): vec3 {
  const f = camLookFlat()
  return new vec3(-f.z, 0, f.x)
}

/** Rotation that turns an object's +Z (UI front) toward `target`, yaw + gentle pitch. */
export function faceRotation(from: vec3, target: vec3, withPitch: boolean = true): quat {
  const d = target.sub(from)
  const len = d.length
  if (len < 1e-4) return quat.quatIdentity()
  const n = d.uniformScale(1 / len)
  const yaw = Math.atan2(n.x, n.z)
  const pitch = withPitch ? -Math.asin(Math.max(-0.95, Math.min(0.95, n.y))) : 0
  return quat.fromEulerAngles(0, yaw, 0).multiply(quat.fromEulerAngles(pitch, 0, 0))
}

/** Place `so` at a world position and turn it to face the user. */
export function placeFacingUser(so: SceneObject, worldPos: vec3, withPitch: boolean = true): void {
  const t = so.getTransform()
  t.setWorldPosition(worldPos)
  t.setWorldRotation(faceRotation(worldPos, camPos(), withPitch))
}

/** A point `dist` cm in front of the user, offset right/up in cm. */
export function inFront(dist: number, up: number = 0, right: number = 0): vec3 {
  return camPos().add(camLookFlat().uniformScale(dist)).add(camRightFlat().uniformScale(right)).add(new vec3(0, up, 0))
}

/** Like inFront, but follows the user's actual gaze pitch (clamped to ±maxPitchDeg) so a panel
 *  opens where the user is looking even when they look down at the counter or up at signage. */
export function inView(dist: number, up: number = 0, right: number = 0, maxPitchDeg: number = 30): vec3 {
  const lf = camLookFlat()
  const look = camLook()
  const lim = Math.sin((maxPitchDeg * Math.PI) / 180)
  const y = Math.max(-lim, Math.min(lim, look.y))
  const dir = lf.uniformScale(Math.sqrt(1 - y * y)).add(new vec3(0, y, 0))
  return camPos().add(dir.uniformScale(dist)).add(camRightFlat().uniformScale(right)).add(new vec3(0, up, 0))
}

/** Angle in degrees between the look direction and the direction to `p`. */
export function angleToDeg(p: vec3): number {
  const d = p.sub(camPos())
  if (d.length < 1e-4) return 0
  const look = camLook()
  const cos = d.normalize().dot(look)
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI
}

export function horizDist(a: vec3, b: vec3): number {
  const dx = a.x - b.x, dz = a.z - b.z
  return Math.sqrt(dx * dx + dz * dz)
}

/**
 * Lazy view-follow for a world-placed panel (toast, suggestion). Call every frame while the panel is visible.
 * Starts gliding to inView(dist, up) when the panel is more than maxAngleDeg off the gaze or its horizontal
 * distance to the user leaves [minD, maxD]; keeps gliding until it is within 2 cm of the goal; always turns
 * the panel to face the user; never moves it while `frozen` (a button on it is hovered).
 * @returns true while it is gliding: pass the value back in as `following` on the next frame.
 */
export function lazyFollowStep(so: SceneObject, dist: number, up: number, dt: number, following: boolean = false,
                               frozen: boolean = false, maxAngleDeg: number = 18, minD: number = 55, maxD: number = 95): boolean {
  if (!so || isNull(so)) return false
  const t = so.getTransform()
  const pos = t.getWorldPosition()
  const cam = camPos()
  if (frozen) {
    t.setWorldRotation(faceRotation(pos, cam))
    return false
  }
  const d = horizDist(pos, cam)
  let glide = following || angleToDeg(pos) > maxAngleDeg || d < minD || d > maxD
  let next = pos
  if (glide) {
    const goal = inView(dist, up)
    next = vec3.lerp(pos, goal, Math.min(1, dt * 5))
    if (next.distance(goal) < 2) { next = goal; glide = false }
    t.setWorldPosition(next)
  }
  t.setWorldRotation(faceRotation(next, cam))
  return glide
}
