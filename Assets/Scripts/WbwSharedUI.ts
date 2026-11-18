// WbwSharedUI.ts — shared UIKit composition helpers for the Wbw*UI.ts modules ONLY.
// Owns: the type scale (applyTextRole), BackPlate panel scaffold (Canvas → BackPlate →
//       Content at +0.6 cm → FlexLayout), flex rows/columns with addItems registration,
//       Text / Image / Button builders (UIKit Button + raw Text label lifted +0.08 cm).
// Must NOT: be imported by non-UI scripts (Hard Rule 3), hold state, or set renderOrder.
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign, FlexAlignSelf, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"

const imageMaterial = requireAsset("../Materials/ImageMaterial.mat") as Material

// ── Type scale — single source of truth (patterns.md → Typography)
export const FONT_SIZE_SCALE = 1.0
export type TextRole =
  | "Title1" | "Title2" | "HeadlineXL" | "Headline1" | "Headline2"
  | "Subheadline" | "Button" | "Callout" | "Body" | "Caption"
const TYPE_SCALE: Record<TextRole, {size: number; weight: number}> = {
  Title1: {size: 105, weight: 700}, Title2: {size: 93, weight: 700},
  HeadlineXL: {size: 62, weight: 700}, Headline1: {size: 54, weight: 700},
  Headline2: {size: 48, weight: 700}, Subheadline: {size: 41, weight: 700},
  Button: {size: 39, weight: 500}, Callout: {size: 39, weight: 700},
  Body: {size: 39, weight: 500}, Caption: {size: 38, weight: 500},
}
export function roleSize(role: TextRole, distanceCm: number = 110): number {
  return TYPE_SCALE[role].size * FONT_SIZE_SCALE * (distanceCm / 110)
}
export function applyTextRole(t: Text, role: TextRole, distanceCm: number = 110): void {
  t.size = roleSize(role, distanceCm)
  ;(t as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
}
/** Rough rendered width (cm) of `chars` characters at a role/distance. */
export function textWidthCm(chars: number, role: TextRole, distanceCm: number): number {
  return chars * 0.56 * (roleSize(role, distanceCm) / 43.886)
}

export const WHITE = new vec4(1, 1, 1, 1)
export const SOFT = new vec4(1, 1, 1, 0.78)
export const GOLD = new vec4(1.0, 0.85, 0.45, 1)
export const GREEN = new vec4(0.45, 0.92, 0.55, 1)
export const RED = new vec4(1.0, 0.55, 0.5, 1)

export function obj(parent: SceneObject, name: string, pos?: vec3): SceneObject {
  const so = global.scene.createSceneObject(name)
  so.setParent(parent)
  if (pos) so.getTransform().setLocalPosition(pos)
  return so
}

export interface FlexOpts {
  gap?: number
  padX?: number
  padY?: number
  justify?: FlexJustify
  align?: FlexAlign
}

function configureFlex(f: FlexLayout, dir: FlexDirection, w: number, h: number, o?: FlexOpts): void {
  f.onInitialized.add(() => {
    f.width = w
    f.height = h
    f.direction = dir
    if (dir === FlexDirection.Row) f.columnGap = o?.gap ?? 0
    else f.rowGap = o?.gap ?? 0
    f.paddingTop = o?.padY ?? 0
    f.paddingBottom = o?.padY ?? 0
    f.paddingLeft = o?.padX ?? 0
    f.paddingRight = o?.padX ?? 0
    f.justifyContent = o?.justify ?? FlexJustify.Start
    f.alignItems = o?.align ?? FlexAlign.Center
  })
}

/** Register a FlexItem with its parent's FlexLayout (mandatory, else items stack at origin). */
export function register(parent: SceneObject, item: FlexItem): void {
  const pf = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
  if (!pf) return
  // Before the layout initializes, autoDiscoverItemsOnStart picks up every FlexItem child
  // by itself (and addItems would throw). After init, children must be added explicitly.
  const initialized = (pf as unknown as {_initialized?: boolean})._initialized === true
  if (pf.autoDiscoverItemsOnStart && !initialized) return
  pf.addItems([item])
}

export function item(so: SceneObject, w?: number, h?: number, stretch: boolean = false): FlexItem {
  const it = so.createComponent(FlexItem.getTypeName()) as FlexItem
  if (w !== undefined && w > 0) it.overrideWidth = w
  if (h !== undefined && h > 0) it.overrideHeight = h
  it.flexGrow = 0
  it.flexShrink = 0
  if (stretch) it.alignSelf = FlexAlignSelf.Stretch
  return it
}

export interface Panel {
  root: SceneObject
  plate: BackPlate
  content: SceneObject
  flex: FlexLayout
}

/** Canvas + BackPlate (fixed size) + Content(+0.6) with a column FlexLayout. */
export function panel(host: SceneObject, name: string, w: number, h: number, o?: FlexOpts): Panel {
  const root = obj(host, name)
  root.createComponent("Component.Canvas")
  const plate = root.createComponent(BackPlate.getTypeName()) as BackPlate
  plate.size = new vec2(w, h)
  const content = obj(root, "Content", new vec3(0, 0, 0.6))
  const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
  configureFlex(flex, FlexDirection.Column, w, h, o)
  return {root, plate, content, flex}
}

/** A nested flex container that is itself an item of `parent`'s layout. */
export function flexBox(parent: SceneObject, name: string, dir: "row" | "column", w: number, h: number, o?: FlexOpts): SceneObject {
  const so = obj(parent, name, new vec3(0, 0, 0.02))
  const f = so.createComponent(FlexLayout.getTypeName()) as FlexLayout
  const it = item(so, w, h)
  configureFlex(f, dir === "row" ? FlexDirection.Row : FlexDirection.Column, w, h, o)
  register(parent, it)
  return so
}

export interface TextOpts {
  w?: number           // explicit rect width (rows); omit to stretch in a column
  h?: number           // row height
  color?: vec4
  align?: "left" | "center" | "right"
  wrap?: boolean
  z?: number
}

/** Raw Component.Text as a flex item. In columns it stretches; in rows give `w`. */
export function text(parent: SceneObject, name: string, str: string, role: TextRole, dist: number, o?: TextOpts): Text {
  const so = obj(parent, name, new vec3(0, 0, o?.z ?? 0.05))
  const t = so.createComponent("Component.Text") as Text
  t.text = str
  t.depthTest = true
  applyTextRole(t, role, dist)
  const al = o?.align ?? "center"
  t.horizontalAlignment = al === "left" ? HorizontalAlignment.Left : al === "right" ? HorizontalAlignment.Right : HorizontalAlignment.Center
  t.verticalAlignment = VerticalAlignment.Center
  t.horizontalOverflow = o?.wrap ? HorizontalOverflow.Wrap : HorizontalOverflow.Overflow
  t.verticalOverflow = VerticalOverflow.Overflow
  t.textFill.color = o?.color ?? WHITE
  const h = o?.h ?? 2
  if (o?.w) {
    t.layoutRect = Rect.create(-o.w / 2, o.w / 2, -h / 2, h / 2)
    register(parent, item(so, o.w, h))
  } else {
    t.layoutRect = Rect.create(-0.5, 0.5, -0.5, 0.5)
    register(parent, item(so, undefined, h, true))
  }
  return t
}

/** Component.Image with a cloned ImageMaterial (depthTest on, depthWrite off). */
export function image(parent: SceneObject, name: string, tex: Texture, w: number, h?: number, tint?: vec4, asItem: boolean = true): Image {
  const so = obj(parent, name, new vec3(0, 0, 0.04))
  so.getTransform().setLocalScale(new vec3(w, h ?? w, 1))
  const img = so.createComponent("Component.Image") as Image
  const mat = imageMaterial.clone()
  mat.mainPass.baseTex = tex
  mat.mainPass.depthTest = true
  mat.mainPass.depthWrite = false
  if (tint) mat.mainPass.baseColor = tint
  img.clearMaterials()
  img.addMaterial(mat)
  if (asItem) register(parent, item(so, w, h ?? w))
  return img
}

export interface ButtonParts {
  so: SceneObject
  btn: Button
  face: SceneObject
  label: Text | null
  icon: Image | null
}

export interface ButtonOpts {
  icon?: Texture | null
  iconSize?: number
  role?: TextRole
  toggle?: boolean
  column?: boolean       // stack icon above label
  asItem?: boolean       // register as flex item of parent (default true)
  labelColor?: vec4
}

/**
 * UIKit Button (collider + Interactable + press visual are created by UIKit) with a
 * width-budgeted raw Text label lifted +0.08 cm in front of the face.
 * `name` becomes the Button SceneObject name — stable for LEAF targeting.
 */
export function button(parent: SceneObject, name: string, w: number, h: number, label: string, dist: number,
                       onClick: () => void, o?: ButtonOpts): ButtonParts {
  const so = obj(parent, name, new vec3(0, 0, 0.1))
  const btn = so.createComponent(Button.getTypeName()) as Button
  btn.size = new vec3(w, h, 1)
  if (o?.toggle) btn.setIsToggleable(true)
  const face = obj(so, "Face", new vec3(0, 0, 0.08))
  const ff = face.createComponent(FlexLayout.getTypeName()) as FlexLayout
  configureFlex(ff, o?.column ? FlexDirection.Column : FlexDirection.Row, w, h, {gap: 0.5, justify: FlexJustify.Center, align: FlexAlign.Center})
  let icon: Image | null = null
  const iconSize = o?.iconSize ?? Math.min(h * 0.55, 3)
  if (o?.icon) icon = image(face, "Icon", o.icon, iconSize)
  let lbl: Text | null = null
  if (label.length > 0) {
    const role = o?.role ?? "Button"
    const lw = o?.column ? w - 0.6 : Math.max(1, w - 0.8 - (icon ? iconSize + 0.5 : 0))
    lbl = text(face, "Label", label, role, dist, {w: lw, h: Math.min(h, 2.4), color: o?.labelColor})
  }
  if (o?.asItem !== false) register(parent, item(so, w, h))
  btn.onTriggerUp.add(() => onClick())
  return {so, btn, face, label: lbl, icon}
}

/** Paint a button's inactive state a solid colour and make it inactive (e.g. matched = green). */
export function setInactiveColor(btn: Button, color: vec4): void {
  const apply = () => {
    const v = btn.visual as unknown as {inactiveBaseType?: string; baseInactiveColor?: vec4}
    if (v) {
      try {
        v.inactiveBaseType = "Color"
        v.baseInactiveColor = color
      } catch (e) {
        print("WbwSharedUI: could not tint inactive state: " + e)
      }
    }
    btn.inactive = true
  }
  if (btn.visual) apply()
  else btn.onInitialized.add(apply)
}

/** Disable now, destroy shortly after (safe to call from inside a Button callback). */
export function retire(so: SceneObject | null, owner: ScriptComponent): void {
  if (!so || isNull(so)) return
  so.enabled = false
  const ev = owner.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
  ev.bind(() => {
    if (!isNull(so)) so.destroy()
  })
  ev.reset(0.05)
}

/** Set a toggle button's on-state one frame later (wins over UIKit's own click toggle). */
export function setToggleLater(btn: Button, on: boolean, owner: ScriptComponent): void {
  const ev = owner.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
  ev.bind(() => {
    if (!isNull(btn)) btn.isOn = on
  })
  ev.reset(0.02)
}
