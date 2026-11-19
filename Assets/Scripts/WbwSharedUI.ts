// WbwSharedUI.ts — shared UIKit composition helpers for the Wbw*UI.ts modules ONLY.
// Owns: the type scale (applyTextRole), colour roles, the panel scaffold (Canvas → BackPlate
//       recoloured to the current mode tone → Content at +0.6 cm → FlexLayout), flex rows/columns
//       with addItems registration, Text / Image / Button builders (UIKit Button styled with
//       distinct idle / targeted / pressed / selected states + raw Text label).
// Visual language: Word by Word's own — one tone per mode (cobalt Learn, violet Use it live,
// magenta Practice), soft card corners, cream outlines, a "word by word" dash rule under headings.
// Accessibility ideas (panel opacity, readable sizes, clear outlines, visible states) as in Small Wins.
// Must NOT: be imported by non-UI scripts (Hard Rule 3), hold state, or set renderOrder.
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign, FlexAlignSelf, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {GradientParameters, RoundedRectangle} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"
import {RoundedRectangleVisual} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangleVisual"

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
// The type scale is calibrated for 110 cm. On the narrow Specs display text has to be larger
// than the plain distance maths suggests: like Small Wins, a panel at ~70 cm sizes its text
// as if it were READ_BOOST x further away (70 cm -> 140 cm).
export const READ_BOOST = 2.0
// Writing straight on a see-through panel is 15 % larger and gets a thin outline in its own
// colour, so it stays readable over the café behind it.
const ON_PANEL_SCALE = 1.15
const ON_PANEL_OUTLINE = 0.12
export function roleSize(role: TextRole, distanceCm: number = 110, boost: number = READ_BOOST): number {
  return TYPE_SCALE[role].size * FONT_SIZE_SCALE * ((distanceCm * boost) / 110)
}
export function applyTextRole(t: Text, role: TextRole, distanceCm: number = 110, boost: number = READ_BOOST): void {
  t.size = roleSize(role, distanceCm, boost)
  ;(t as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
}
/** Rough rendered width (cm) of `chars` characters at a role/distance (on-panel text by default). */
export function textWidthCm(chars: number, role: TextRole, distanceCm: number, onPanel: boolean = true, boost: number = READ_BOOST): number {
  return chars * 0.56 * (roleSize(role, distanceCm, boost) / 43.886) * (onPanel ? ON_PANEL_SCALE : 1)
}
/** Rough line height (cm) for a role/distance. */
export function lineHeightCm(role: TextRole, distanceCm: number, onPanel: boolean = true, boost: number = READ_BOOST): number {
  return 1.45 * (roleSize(role, distanceCm, boost) / 43.886) * (onPanel ? ON_PANEL_SCALE : 1)
}

// ── Colour roles (always paired with a label, icon or state change — never colour alone)
/** Main text: warm cream. */
export const TEXT_LIGHT = new vec4(1, 0.98, 0.9, 1)
/** Secondary text (translations, hints). */
export const TEXT_SOFT = new vec4(0.93, 0.92, 0.98, 1)
/** Unavailable / "coming soon" text: cream, dimmed. */
export const MUTED = new vec4(1, 0.98, 0.9, 0.66)
/** Current target / focus / selected — an aqua cyan that stays distinct on cobalt, violet and magenta. */
export const CYAN = new vec4(0.42, 0.98, 0.95, 1)
/** Success (saved, matched) — always with a checkmark or confirmation text. */
export const GREEN = new vec4(0.5, 0.95, 0.55, 1)
export const GREEN_FILL = new vec4(0.16, 0.56, 0.3, 1)
/** Incorrect — always with "Try again". */
export const AMBER = new vec4(1.0, 0.76, 0.3, 1)
// legacy names used by the modules
export const WHITE = TEXT_LIGHT
export const SOFT = TEXT_SOFT
export const GOLD = TEXT_LIGHT
export const RED = AMBER

// ── Word by Word tones: every mode has its own panel colour (never grey, black or white).
// Panels and their buttons use the tone of the context they belong to.
export interface Tone { name: string; base: vec4 }
function tone(name: string, r: number, g: number, b: number): Tone { return {name, base: new vec4(r, g, b, 1)} }
/** Learn (and app-level screens: setup, mode menu) — cobalt blue #2F6FE0. */
export const TONE_LEARN = tone("learn", 0.184, 0.435, 0.878)
/** Use it live (real-life ordering) — royal violet #6A4BD8. */
export const TONE_LIVE = tone("live", 0.416, 0.294, 0.847)
/** Practice (matching game) — magenta #C2348A. */
export const TONE_PRACTICE = tone("practice", 0.761, 0.204, 0.541)
let currentTone: Tone = TONE_LEARN
/** Tone used by panel() / button() built from now on (each UI module sets it in show()). */
export function useTone(t: Tone): void { currentTone = t }
export function toneOf(mode: string): Tone {
  const m = mode.toLowerCase()
  if (m.indexOf("practice") >= 0) return TONE_PRACTICE
  if (m.indexOf("live") >= 0) return TONE_LIVE
  return TONE_LEARN
}
/** Mix a tone toward cream (k > 0, lighter) or toward its own deep shade (k < 0). */
export function shade(c: vec4, k: number, alpha: number = 1): vec4 {
  if (k >= 0) return new vec4(c.r + (1 - c.r) * k, c.g + (0.98 - c.g) * k, c.b + (0.9 - c.b) * k, alpha)
  const f = 1 + k
  return new vec4(c.r * f, c.g * f, c.b * f, alpha)
}

// ── Surfaces (accessibility treatment: translucent big panels, solid strips, clear outlines)
// Big panels let the café show through (tinted); small message strips stay nearly solid.
const SEE_THROUGH_FROM_HEIGHT = 10
export const PANEL_ALPHA_SEE_THROUGH = 0.8
export const PANEL_ALPHA_STRIP = 0.95
// Word by Word's own shapes: soft card corners on panels, gentler corners on buttons
const PANEL_RADIUS = 1.6
const STRIP_RADIUS = 1.1
const BUTTON_RADIUS = 0.9
const BUTTON_OUTLINE = new vec4(1, 0.98, 0.9, 1)
const BUTTON_OUTLINE_SIZE = 0.14
const BUTTON_PRIMARY_OUTLINE_SIZE = 0.22
const BUTTON_FOCUS_OUTLINE_SIZE = 0.3

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

/**
 * Canvas + BackPlate (fixed size) + Content(+0.6) with a column FlexLayout.
 * The BackPlate's default dark grey is replaced by the current tone (cobalt / violet / magenta):
 * on an additive display a dark, mostly opaque panel hides the virtual café behind it and reads as
 * a see-through hole to the real room. A bright tone at 0.8 alpha keeps a tinted view of the café.
 */
export function panel(host: SceneObject, name: string, w: number, h: number, o?: FlexOpts, solid: boolean = false): Panel {
  const root = obj(host, name)
  root.createComponent("Component.Canvas")
  const plate = root.createComponent(BackPlate.getTypeName()) as BackPlate
  plate.size = new vec2(w, h)
  tintPanelWhenReady(plate, root, solid || h < SEE_THROUGH_FROM_HEIGHT, currentTone)
  const content = obj(root, "Content", new vec3(0, 0, 0.6))
  const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
  configureFlex(flex, FlexDirection.Column, w, h, o)
  return {root, plate, content, flex}
}

function tintPanelWhenReady(plate: BackPlate, root: SceneObject, solid: boolean, t: Tone): void {
  const apply = (): boolean => {
    if (isNull(root)) return true
    const rect = root.getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle | null
    if (!rect) return false
    rect.gradient = false
    rect.backgroundColor = shade(t.base, 0, solid ? PANEL_ALPHA_STRIP : PANEL_ALPHA_SEE_THROUGH)
    rect.cornerRadius = solid ? STRIP_RADIUS : PANEL_RADIUS
    return true
  }
  // BackPlate applies its own (grey) style in its OnStart, so keep re-applying for a few frames
  apply()
  const ev = plate.createEvent("UpdateEvent")
  let frames = 0
  ev.bind(() => {
    apply()
    if (++frames > 4) ev.enabled = false
  })
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
  /** On-panel emphasis (15 % larger + same-colour outline). Default true; button labels pass false. */
  onPanel?: boolean
  /** Override READ_BOOST (e.g. 1 for world-space signage at a known distance). */
  boost?: number
}

/** Raw Component.Text as a flex item. In columns it stretches; in rows give `w`. */
export function text(parent: SceneObject, name: string, str: string, role: TextRole, dist: number, o?: TextOpts): Text {
  const so = obj(parent, name, new vec3(0, 0, o?.z ?? 0.05))
  const t = so.createComponent("Component.Text") as Text
  t.text = str
  t.depthTest = true
  const onPanel = o?.onPanel ?? true
  applyTextRole(t, role, dist, o?.boost ?? READ_BOOST)
  if (onPanel) {
    t.size = t.size * ON_PANEL_SCALE
    t.outlineSettings.enabled = true
    t.outlineSettings.size = ON_PANEL_OUTLINE
  }
  const al = o?.align ?? "center"
  t.horizontalAlignment = al === "left" ? HorizontalAlignment.Left : al === "right" ? HorizontalAlignment.Right : HorizontalAlignment.Center
  t.verticalAlignment = VerticalAlignment.Center
  t.horizontalOverflow = o?.wrap ? HorizontalOverflow.Wrap : HorizontalOverflow.Overflow
  t.verticalOverflow = VerticalOverflow.Overflow
  setTextColor(t, o?.color ?? TEXT_LIGHT)
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

/** Text colour (and its same-colour outline). */
export function setTextColor(t: Text, c: vec4): void {
  t.textFill.color = c
  if (t.outlineSettings.enabled) t.outlineSettings.fill.color = c
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
  /** Primary action: slightly brighter idle fill. */
  primary?: boolean
  column?: boolean       // stack icon above label
  asItem?: boolean       // register as flex item of parent (default true)
  labelColor?: vec4
  /** Tone of the button (default: the tone of the panel being built). */
  tone?: Tone
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
    lbl = text(face, "Label", label, role, dist, {w: lw, h: o?.column ? Math.max(1.4, h - iconSize - 1) : Math.min(h, 2.8), color: o?.labelColor, onPanel: false})
  }
  if (o?.asItem !== false) register(parent, item(so, w, h))
  styleWhenReady(btn, !!o?.primary, o?.tone)
  btn.onTriggerUp.add(() => onClick())
  return {so, btn, face, label: lbl, icon}
}

function solidGradient(color: vec4): GradientParameters {
  return {
    type: "Linear",
    start: new vec2(-1, 0),
    end: new vec2(1, 0),
    stop0: {enabled: true, color, percent: 0},
    stop1: {enabled: true, color, percent: 1},
  } as GradientParameters
}

/** Apply the button style now if UIKit already built the visual, else once it has. */
export function styleWhenReady(btn: Button, primary: boolean = false, t?: Tone): void {
  const tn = t ?? currentTone
  if (btn.visual) styleButton(btn, primary, tn)
  else btn.onInitialized.add(() => styleButton(btn, primary, tn))
}

/**
 * Every state is painted in the button's tone — no UIKit grey anywhere:
 * idle = tone + cream outline (primary: thicker outline) · targeted (hover) = lighter tone + thick
 * CYAN outline · pressed = lightest tone · selected (toggled on) = deep tone + thick CYAN outline ·
 * inactive = deep tone with a cream outline. Both colour and gradient are set for each state,
 * because the UIKit style decides per state which of the two it shows.
 */
export function styleButton(btn: Button, primary: boolean = false, t: Tone = currentTone): void {
  const v = btn.visual as unknown as RoundedRectangleVisual
  if (!v) return
  try {
    const c = t.base
    const idle = primary ? shade(c, 0.08) : c
    const states: [string, vec4][] = [
      ["Default", idle], ["Hovered", shade(c, 0.2)], ["Triggered", shade(c, 0.36)],
      ["ToggledDefault", shade(c, -0.22)], ["ToggledHovered", shade(c, 0.1)], ["ToggledTriggered", shade(c, 0.36)],
      ["Inactive", shade(c, -0.3)],
    ]
    const anyV = v as unknown as {[k: string]: unknown}
    for (const [st, col] of states) {
      const lc = st.charAt(0).toLowerCase() + st.slice(1)
      anyV["base" + st + "Color"] = col
      anyV[lc + "BaseType"] = "Gradient"
      anyV[lc + "Gradient"] = solidGradient(col)
      const border = st === "Default" || st === "Inactive" ? BUTTON_OUTLINE : CYAN
      anyV["border" + st + "Color"] = border
      anyV["border" + st + "Gradient"] = solidGradient(border)
      anyV[lc + "BorderType"] = "Gradient"
      anyV[lc + "HasBorder"] = true
      anyV[lc + "BorderSize"] = st === "Default" ? (primary ? BUTTON_PRIMARY_OUTLINE_SIZE : BUTTON_OUTLINE_SIZE)
        : st === "Inactive" ? BUTTON_OUTLINE_SIZE : BUTTON_FOCUS_OUTLINE_SIZE
    }
    v.cornerRadius = BUTTON_RADIUS
  } catch (e) {
    print("WbwSharedUI: button style not applied: " + e)
  }
}

/** Paint a button's inactive state a solid colour and make it inactive (e.g. matched = green). */
export function setInactiveColor(btn: Button, color: vec4): void {
  const apply = () => {
    const v = btn.visual as unknown as {[k: string]: unknown}
    if (v) {
      try {
        v["inactiveBaseType"] = "Gradient"
        v["baseInactiveColor"] = color
        v["inactiveGradient"] = solidGradient(color)
      } catch (e) {
        print("WbwSharedUI: could not tint inactive state: " + e)
      }
    }
    btn.inactive = true
  }
  if (btn.visual) apply()
  else btn.onInitialized.add(apply)
}

/** Height (cm) a headerRule() takes in a column. */
export const HEADER_RULE_H = 0.52

/**
 * Word by Word heading mark: three cream dashes getting shorter ("word · by · word"),
 * placed under a panel heading. Registered as a flex item of `parent`.
 */
export function headerRule(parent: SceneObject, rowW: number = 0, name: string = "HeaderRule"): SceneObject {
  const lens = [2.4, 1.4, 0.7], h = 0.32, gap = 0.45
  const dashW = lens.reduce((a, b) => a + b, 0) + gap * (lens.length - 1)
  const w = Math.max(rowW, dashW)
  const row = obj(parent, name, new vec3(0, 0, 0.03))
  let x = rowW > 0 ? -w / 2 : -dashW / 2 // left-aligned under a left-aligned heading
  lens.forEach((l, i) => {
    const d = obj(row, `Dash${i}`, new vec3(x + l / 2, 0, 0))
    const rr = d.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
    rr.size = new vec2(l, h)
    rr.cornerRadius = h / 2
    rr.gradient = false
    rr.backgroundColor = new vec4(1, 0.98, 0.9, 0.9 - i * 0.15)
    x += l + gap
  })
  register(parent, item(row, w, h + 0.2))
  return row
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
