// WbwGeo.ts — code-authored primitive geometry for the café stand-in shapes.
// Owns: cached unit meshes (box / cylinder / sphere built with MeshBuilder, outward
//       normals, CCW winding) and a colour-keyed material cache cloned from the two
//       project materials (lit SimplePBR + unlit).
// Must NOT: create colliders or interaction (wrappers in WbwCafeBuilder own those),
//           hold game state, or create text.
// Every visual made here is a LEAF: scale = size in cm on a unit mesh.

const LIT_BASE = requireAsset("../Materials/WbwLit.mat") as Material
const UNLIT_BASE = requireAsset("../Materials/WbwUnlit.mat") as Material

export type Col = vec4

export function rgb(r: number, g: number, b: number, a: number = 1): vec4 {
  return new vec4(r, g, b, a)
}

let boxMesh: RenderMesh | null = null
let cylMesh: RenderMesh | null = null
let sphMesh: RenderMesh | null = null
const matCache: {[k: string]: Material} = {}

function newBuilder(): MeshBuilder {
  const b = new MeshBuilder([
    {name: "position", components: 3},
    {name: "normal", components: 3, normalized: true},
    {name: "texture0", components: 2},
  ])
  b.topology = MeshTopology.Triangles
  b.indexType = MeshIndexType.UInt16
  return b
}

function unitBox(): RenderMesh {
  if (boxMesh) return boxMesh
  const b = newBuilder()
  // [normal, u, v] with u x v = normal → CCW seen from outside
  const faces: number[][][] = [
    [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
    [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 0, 0], [0, 0, -1]],
    [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
    [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
  ]
  const verts: number[] = []
  const idx: number[] = []
  let base = 0
  for (const [n, u, v] of faces) {
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
    for (const [cu, cv] of corners) {
      verts.push(
        0.5 * (n[0] + cu * u[0] + cv * v[0]),
        0.5 * (n[1] + cu * u[1] + cv * v[1]),
        0.5 * (n[2] + cu * u[2] + cv * v[2]),
        n[0], n[1], n[2],
        (cu + 1) / 2, (cv + 1) / 2,
      )
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
    base += 4
  }
  b.appendVerticesInterleaved(verts)
  b.appendIndices(idx)
  b.updateMesh()
  boxMesh = b.getMesh()
  return boxMesh
}

function unitCylinder(): RenderMesh {
  if (cylMesh) return cylMesh
  const b = newBuilder()
  const seg = 24
  const verts: number[] = []
  const idx: number[] = []
  // side
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2
    const x = Math.cos(a), z = Math.sin(a)
    verts.push(0.5 * x, -0.5, 0.5 * z, x, 0, z, i / seg, 0)
    verts.push(0.5 * x, 0.5, 0.5 * z, x, 0, z, i / seg, 1)
  }
  for (let i = 0; i < seg; i++) {
    const a = i * 2, b2 = a + 1, c = a + 2, d = a + 3
    // outward CCW: viewed from outside, (a, b2, d) and (a, d, c)
    idx.push(a, b2, d, a, d, c)
  }
  // caps
  for (const y of [0.5, -0.5]) {
    const center = verts.length / 8
    const ny = y > 0 ? 1 : -1
    verts.push(0, y, 0, 0, ny, 0, 0.5, 0.5)
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2
      verts.push(0.5 * Math.cos(a), y, 0.5 * Math.sin(a), 0, ny, 0, 0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a))
    }
    for (let i = 0; i < seg; i++) {
      if (ny > 0) idx.push(center, center + 2 + i, center + 1 + i)
      else idx.push(center, center + 1 + i, center + 2 + i)
    }
  }
  b.appendVerticesInterleaved(verts)
  b.appendIndices(idx)
  b.updateMesh()
  cylMesh = b.getMesh()
  return cylMesh
}

function unitSphere(): RenderMesh {
  if (sphMesh) return sphMesh
  const b = newBuilder()
  const rings = 14, segs = 20
  const verts: number[] = []
  const idx: number[] = []
  for (let r = 0; r <= rings; r++) {
    const th = (r / rings) * Math.PI
    for (let s = 0; s <= segs; s++) {
      const ph = (s / segs) * Math.PI * 2
      const x = Math.sin(th) * Math.cos(ph), y = Math.cos(th), z = Math.sin(th) * Math.sin(ph)
      verts.push(0.5 * x, 0.5 * y, 0.5 * z, x, y, z, s / segs, r / rings)
    }
  }
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segs; s++) {
      const a = r * (segs + 1) + s, c = a + segs + 1
      idx.push(a, a + 1, c + 1, a, c + 1, c)
    }
  }
  b.appendVerticesInterleaved(verts)
  b.appendIndices(idx)
  b.updateMesh()
  sphMesh = b.getMesh()
  return sphMesh
}

export function material(color: vec4, unlit: boolean = false): Material {
  const key = `${unlit ? "u" : "l"}${color.x.toFixed(3)},${color.y.toFixed(3)},${color.z.toFixed(3)},${color.w.toFixed(3)}`
  const cached = matCache[key]
  if (cached) return cached
  const m = (unlit ? UNLIT_BASE : LIT_BASE).clone()
  m.mainPass.baseColor = color
  m.mainPass.twoSided = true
  if (color.w < 0.999) {
    m.mainPass.blendMode = BlendMode.PremultipliedAlphaAuto
    m.mainPass.depthWrite = false
  }
  matCache[key] = m
  return m
}

export interface PrimOpts {
  unlit?: boolean
  rot?: vec3 // euler degrees
}

function prim(mesh: RenderMesh, parent: SceneObject, name: string, pos: vec3, size: vec3, color: vec4, opts?: PrimOpts): SceneObject {
  const so = global.scene.createSceneObject(name)
  so.setParent(parent)
  const t = so.getTransform()
  t.setLocalPosition(pos)
  t.setLocalScale(size)
  if (opts && opts.rot) {
    const d = Math.PI / 180
    t.setLocalRotation(quat.fromEulerAngles(opts.rot.x * d, opts.rot.y * d, opts.rot.z * d))
  }
  const rmv = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
  rmv.mesh = mesh
  rmv.mainMaterial = material(color, !!(opts && opts.unlit))
  return so
}

/** Box centred at pos (local cm), size in cm. */
export function box(parent: SceneObject, name: string, pos: vec3, size: vec3, color: vec4, opts?: PrimOpts): SceneObject {
  return prim(unitBox(), parent, name, pos, size, color, opts)
}
/** Upright cylinder centred at pos; size = (diameterX, height, diameterZ). */
export function cyl(parent: SceneObject, name: string, pos: vec3, size: vec3, color: vec4, opts?: PrimOpts): SceneObject {
  return prim(unitCylinder(), parent, name, pos, size, color, opts)
}
/** Ellipsoid centred at pos; size = diameters. */
export function sphere(parent: SceneObject, name: string, pos: vec3, size: vec3, color: vec4, opts?: PrimOpts): SceneObject {
  return prim(unitSphere(), parent, name, pos, size, color, opts)
}

export function group(parent: SceneObject, name: string, pos?: vec3, rotYDeg?: number): SceneObject {
  const so = global.scene.createSceneObject(name)
  so.setParent(parent)
  if (pos) so.getTransform().setLocalPosition(pos)
  if (rotYDeg) so.getTransform().setLocalRotation(quat.fromEulerAngles(0, (rotYDeg * Math.PI) / 180, 0))
  return so
}

/** Swap the colour of every RenderMeshVisual under `root` (used for bracket hover). */
export function tint(root: SceneObject, color: vec4, unlit: boolean): void {
  const rmv = root.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
  if (rmv) rmv.mainMaterial = material(color, unlit)
  for (let i = 0; i < root.getChildrenCount(); i++) tint(root.getChild(i), color, unlit)
}

/**
 * Many axis-aligned boxes merged into ONE mesh (one draw call) — tiles, bricks, checker
 * floors. Each entry: [cx, cy, cz, w, h, d] in the parent's local cm.
 */
export function mergedBoxes(parent: SceneObject, name: string, boxes: number[][], color: vec4, unlit: boolean = false): SceneObject {
  const b = newBuilder()
  const faces: number[][][] = [
    [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
    [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 0, 0], [0, 0, -1]],
    [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
    [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
  ]
  const verts: number[] = []
  const idx: number[] = []
  let base = 0
  for (const bx of boxes) {
    const [cx, cy, cz, w, h, d] = bx
    for (const [n, u, v] of faces) {
      for (const [cu, cv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const px = 0.5 * (n[0] + cu * u[0] + cv * v[0])
        const py = 0.5 * (n[1] + cu * u[1] + cv * v[1])
        const pz = 0.5 * (n[2] + cu * u[2] + cv * v[2])
        verts.push(cx + px * w, cy + py * h, cz + pz * d, n[0], n[1], n[2], (cu + 1) / 2, (cv + 1) / 2)
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
      base += 4
    }
    if (base > 60000) break // UInt16 index limit guard
  }
  b.appendVerticesInterleaved(verts)
  b.appendIndices(idx)
  b.updateMesh()
  const so = global.scene.createSceneObject(name)
  so.setParent(parent)
  const rmv = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
  rmv.mesh = b.getMesh()
  rmv.mainMaterial = material(color, unlit)
  return so
}

/** Deterministic pseudo-random in [0,1) for repeatable decor variation. */
export function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

const texCache: {[k: string]: Material} = {}
/** Lit material showing a texture (white base colour so the texture reads true). */
export function texMaterial(tex: Texture, key: string, tint: vec4 = new vec4(1, 1, 1, 1)): Material {
  const cached = texCache[key]
  if (cached) return cached
  const m = LIT_BASE.clone()
  m.mainPass.baseTex = tex
  m.mainPass.baseColor = tint
  m.mainPass.twoSided = true
  texCache[key] = m
  return m
}

/** A box whose every face shows the whole texture — use it for one surface (wall, floor, panel). */
export function texturedBox(parent: SceneObject, name: string, pos: vec3, size: vec3, tex: Texture, key: string, tint?: vec4): SceneObject {
  const so = box(parent, name, pos, size, new vec4(1, 1, 1, 1))
  const rmv = so.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
  rmv.mainMaterial = texMaterial(tex, key, tint)
  return so
}
