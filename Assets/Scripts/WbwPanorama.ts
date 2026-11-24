// WbwPanorama.ts — the world outside the café: one real 360° street panorama (Poly Haven "Zawiszy
// Czarnego", CC0) on a large band around the room, seen through the windows and the door.
// Owns: building the band mesh at start (two halves, one texture each), its heading and render order.
// Must NOT: touch the room; the windows are made see-through by their own depth-only panes
//           (Wbw_WindowOpening, render order between this band and the walls).
// Every window and the door look at the SAME picture from their own position and angle, so the outside
// is one coherent place that shifts naturally as the learner moves.

@component
export class WbwPanorama extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwPanorama – 360° street outside the windows</span>')
  @input @hint("Unlit material with the left half of the panorama (image columns 0–50 %)") halfA!: Material
  @input @hint("Unlit material with the right half of the panorama (image columns 50–100 %)") halfB!: Material

  @input @hint("Radius of the band around the café (cm) — beyond the walls and the street outside")
  @widget(new SliderWidget(800, 4000, 10))
  radiusCm: number = 2000

  @input @hint("Latitude of the band's top edge (degrees) — must match the texture crop")
  latTopDeg: number = 55

  @input @hint("Latitude of the band's bottom edge (degrees) — must match the texture crop")
  latBottomDeg: number = -70

  @input @hint("Turns the panorama: the image column at heading H is placed at H + this (degrees). 270 = café-local -X (the door side)")
  @widget(new SliderWidget(-180, 180, 1))
  headingOffsetDeg: number = -30

  @input @hint("Height of the band's centre above the floor (cm) — about eye height, where the photo was taken")
  centreHeightCm: number = 150

  @input @hint("Render order: lower than the window openings (which are lower than the walls)")
  renderOrder: number = -100

  onAwake(): void {
    this.build(this.halfA, 0)
    this.build(this.halfB, 1)
  }

  private build(mat: Material, half: number): void {
    if (!mat) return
    const so = global.scene.createSceneObject("PanoramaHalf" + (half === 0 ? "A" : "B"))
    so.setParent(this.sceneObject)
    so.getTransform().setLocalPosition(new vec3(0, this.centreHeightCm, 0))
    const b = new MeshBuilder([
      {name: "position", components: 3},
      {name: "normal", components: 3, normalized: true},
      {name: "texture0", components: 2},
    ])
    b.topology = MeshTopology.Triangles
    b.indexType = MeshIndexType.UInt16
    const segs = 64, rings = 32, R = this.radiusCm
    const d2r = Math.PI / 180
    const verts: number[] = []
    const idx: number[] = []
    for (let j = 0; j <= rings; j++) {
      const v = j / rings // 0 = bottom edge, 1 = top edge (texture v grows upward)
      const lat = (this.latBottomDeg + v * (this.latTopDeg - this.latBottomDeg)) * d2r
      for (let i = 0; i <= segs; i++) {
        const u = i / segs // across this half
        // compass heading of this image column, clockwise seen from above; direction (sin h, 0, -cos h)
        const h = ((half + u) * 180 + this.headingOffsetDeg) * d2r
        const x = Math.cos(lat) * Math.sin(h), y = Math.sin(lat), z = -Math.cos(lat) * Math.cos(h)
        verts.push(R * x, R * y, R * z, -x, -y, -z, u, v)
      }
    }
    // seen from inside, u runs to the right and v up: (a, b, c) and (a, c, d) are counter-clockwise
    for (let j = 0; j < rings; j++) {
      for (let i = 0; i < segs; i++) {
        const a = j * (segs + 1) + i, bb = a + 1, d = a + segs + 1, c = d + 1
        idx.push(a, bb, c, a, c, d)
      }
    }
    b.appendVerticesInterleaved(verts)
    b.appendIndices(idx)
    b.updateMesh()
    const rmv = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mesh = b.getMesh()
    rmv.mainMaterial = mat
    rmv.setRenderOrder(this.renderOrder)
  }
}
