// The Cecilia unit's case (Raspberry Pi 5 + Cecilia HAT), as code.
//
//   npm run build   → out/case-base.stl, out/case-lid.stl, out/case-window.stl,
//                     out/case-engraving.stl, and out/parts/*.stl (the parts inside)
//
// Repairable by design: the lid is held by four M2.5 screws into the same
// standoff stack that holds the HAT to the Pi. Undo four screws, lift the lid,
// unscrew the four standoffs, lift the HAT off the header, and the Pi lifts
// out. Every part is standard and replaceable.
//
// Printed in nylon or polycarbonate (not metal), so the Pi's own Wi-Fi works.
import { writeFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import jscad from "@jscad/modeling"
import stl from "@jscad/stl-serializer"

import { roundedBox, text3d, mark3d, pipeVent2d } from "./geometry.mjs"
import { CASE, IN, PI, HAT, FRONT, BACK, BACK_HAT, BUTTONS, BACK_CONTROLS, RIGHT, STACK } from "./layout.mjs"
import { buildParts } from "./build-parts.mjs"

const { primitives, booleans, transforms, extrusions, hulls } = jscad
const { cylinder, cylinderElliptic, roundedRectangle, cuboid, circle } = primitives
const { union, subtract } = booleans
const { translate, rotateX, rotateZ } = transforms
const { extrudeLinear } = extrusions
const { hull } = hulls

const here = dirname(fileURLToPath(import.meta.url))
const { w, d, wall, floor, baseH, lidH, r } = CASE

// ---------------------------------------------------------------------------
// Panels: cut-outs and labels, oriented for each wall.
// ---------------------------------------------------------------------------

/** A through-cut for a port, shaped in the wall's plane, along that wall's normal. */
function cutter(panel, along, z, cw, ch, shape = "rect") {
  const depth = wall * 4
  const face =
    shape === "round"
      ? circle({ radius: cw / 2, segments: 48 })
      : roundedRectangle({ size: [cw, ch], roundRadius: shape === "slot" ? ch / 2 - 0.01 : 0.6, segments: 24 })
  // Stand the face up in the x–z plane, cutting along y.
  let body = rotateX(Math.PI / 2, translate([0, 0, -depth / 2], extrudeLinear({ height: depth }, face)))
  if (panel === "front") return translate([along, d / 2, z], body)
  if (panel === "back") return translate([along, -d / 2, z], body)
  body = rotateZ(Math.PI / 2, body) // the y–z plane, cutting along x
  return translate([panel === "right" ? w / 2 : -w / 2, along, z], body)
}

// Every label is also kept as a thin fill (the printed lettering in the renders).
const labelFills = []

/**
 * A label cut 0.5 mm into a wall, reading left to right for someone facing it.
 * Stood up with rotateX it reads +x with its depth along −y: right for the
 * back wall; the others are turned from there.
 */
function label(panel, along, z, text, size = 3.2) {
  labelFills.push(placeLabel(panel, along, z, rotateX(Math.PI / 2, text3d(text, size, 0.45, { letterSpacing: 0.25 }))))
  return placeLabel(panel, along, z, rotateX(Math.PI / 2, text3d(text, size, 1, { letterSpacing: 0.25 })))
}
function placeLabel(panel, along, z, t) {
  if (panel === "back") return translate([along, -d / 2 + 0.5, z], t)
  if (panel === "front") return translate([along, d / 2 - 0.5, z], rotateZ(Math.PI, t))
  if (panel === "right") return translate([w / 2 - 0.5, along, z], rotateZ(Math.PI / 2, t))
  return translate([-w / 2 + 0.5, along, z], rotateZ(-Math.PI / 2, t))
}

/** The mark beside the wordmark, as one lockup reading left to right, h deep. */
function brandLockup(h) {
  return rotateX(Math.PI / 2, union(translate([-19, 0, 0], mark3d(11, h)), translate([7, 0, 0], text3d("Cecilia", 9, h))))
}

function panelCuts() {
  const cuts = []
  const { oled, led, brand } = FRONT
  // Front: the screen, the status light and the brand. Nothing else.
  cuts.push(cutter("front", oled.x, oled.z, oled.w, oled.h))
  cuts.push(translate([oled.x, d / 2 - wall + 0.5, oled.z], cuboid({ size: [oled.w + 4, 1.2, oled.h + 4] })))
  cuts.push(cutter("front", led.x, led.z, led.d, led.d, "round"))
  cuts.push(placeLabel("front", brand.x, brand.z, brandLockup(1)))
  labelFills.push(placeLabel("front", brand.x, brand.z, brandLockup(0.45)))
  // Back, lower row: the Pi's sockets, labelled underneath.
  for (const p of BACK) {
    cuts.push(cutter("back", p.x, p.z, p.w, p.h, p.shape))
    cuts.push(label("back", p.x, p.z - p.h / 2 - 3, p.label, 2.8))
  }
  // Back, upper row: MIDI and line out on the HAT.
  for (const p of BACK_HAT) {
    cuts.push(cutter("back", p.x, p.z, p.d, p.d, "round"))
    cuts.push(label("back", p.x, p.above ? p.z + p.d / 2 + 3.2 : p.z - p.d / 2 - 3.2, p.label, 2.8))
  }
  for (const p of BACK_CONTROLS) {
    cuts.push(cutter("back", p.x, p.z, p.d, p.d, "round"))
    cuts.push(label("back", p.x, p.z + Math.max(p.d / 2, 1.6) + 3, p.label, 2.6))
  }
  for (const p of RIGHT) {
    cuts.push(cutter("right", p.y, p.z, p.w, p.h))
    cuts.push(label("right", p.y, p.z + p.h / 2 + 3.4, p.label))
  }
  return cuts
}

/** Pipe-shaped vents in the left wall, and slots in the floor under the Pi. */
function vents() {
  const out = []
  const tall = [11, 15, 19, 15, 11]
  for (const groupY of [-14, 14]) {
    tall.forEach((h, i) => {
      const y = groupY + (i - 2) * 4.8
      const v = rotateX(Math.PI / 2, translate([0, 0, -wall * 2], extrudeLinear({ height: wall * 4 }, pipeVent2d(2.8, h))))
      out.push(translate([-w / 2, y, floor + 8], rotateZ(Math.PI / 2, v)))
    })
  }
  for (let i = 0; i < 7; i++) {
    const x = PI.x0 + 18 + i * 8
    out.push(roundedBox(3, 34, floor + 1, 1.4, -0.5, x, -2))
  }
  return out
}

// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

function base() {
  let shell = subtract(roundedBox(w, d, baseH, r), roundedBox(IN.w, IN.d, baseH, r - wall, floor))
  // Bosses the Pi sits on (M2.5 heat-set inserts).
  const bosses = STACK.map(([x, y]) => translate([x, y, floor + 2], cylinder({ radius: 3.2, height: 4, segments: 24 })))
  // Bosses for the OLED module's four corner holes (M2 self-tapping), clear of its glass.
  const pcbZ = FRONT.oled.z - 1
  const oledBosses = [-1, 1].flatMap((sx) =>
    [-1, 1].map((sz) =>
      translate(
        [FRONT.oled.x + sx * 15.2, d / 2 - wall - 2.7, pcbZ + sz * 14.25],
        rotateX(Math.PI / 2, cylinder({ radius: 1.8, height: 5.4, segments: 16 }))
      )
    )
  )
  // Bosses for the button board, behind the back panel's left end (M2 self-tapping).
  const buttonBosses = [-1, 1].map((sx) =>
    translate(
      [BUTTONS.x + sx * (BUTTONS.w / 2 - 2.5), -d / 2 + wall + 2.7, BUTTONS.z],
      rotateX(Math.PI / 2, cylinder({ radius: 1.8, height: 5.4, segments: 16 }))
    )
  )
  shell = union(shell, ...bosses, ...oledBosses, ...buttonBosses)
  return subtract(
    shell,
    ...panelCuts(),
    ...vents(),
    ...STACK.map(([x, y]) => translate([x, y, floor + 2.5], cylinder({ radius: 1.6, height: 4, segments: 16 }))),
    // Recesses for rubber feet.
    ...[
      [w / 2 - 12, d / 2 - 10],
      [-w / 2 + 12, d / 2 - 10],
      [w / 2 - 12, -d / 2 + 10],
      [-w / 2 + 12, -d / 2 + 10],
    ].map(([x, y]) => translate([x, y, 0.3], cylinder({ radius: 4.6, height: 0.6, segments: 32 })))
  )
}

// ---------------------------------------------------------------------------
// Lid
// ---------------------------------------------------------------------------

/** The mark above the wordmark, centred between the lid screws, reading the right way up from the front. */
function engraving(z, depth) {
  const group = union(translate([0, 6, 0], mark3d(20, depth)), translate([0, -13, 0], text3d("Cecilia", 11, depth)))
  const cx = (STACK[0][0] + STACK[1][0]) / 2
  const cy = (STACK[0][1] + STACK[2][1]) / 2
  return translate([cx, cy, z], rotateZ(Math.PI, group))
}

function lid() {
  const plate = hull(roundedBox(w, d, lidH - 1.2, r, 0), roundedBox(w - 2.4, d - 2.4, lidH, r - 1.2, 0))
  const lip = subtract(
    roundedBox(IN.w - 0.4, IN.d - 0.4, 2, r - wall - 0.2, -2),
    roundedBox(IN.w - 3.6, IN.d - 3.6, 2, r - wall - 1.8, -2)
  )
  // Countersunk holes for the four M2.5 screws into the standoff stack.
  const holes = STACK.flatMap(([x, y]) => [
    translate([x, y, lidH / 2], cylinder({ radius: 1.4, height: lidH + 2, segments: 20 })),
    translate([x, y, lidH - 0.7], cylinderElliptic({ startRadius: [1.4, 1.4], endRadius: [2.8, 2.8], height: 1.42, segments: 24 })),
  ])
  return translate([0, 0, baseH], subtract(union(plate, lip), ...holes, engraving(lidH - 0.6, 1.6)))
}

/** The smoked window in front of the OLED. */
function oledWindow() {
  const { x, z, w: ow, h: oh } = FRONT.oled
  const pane = extrudeLinear({ height: 1 }, roundedRectangle({ size: [ow + 3.6, oh + 3.6], roundRadius: 1, segments: 16 }))
  return translate([x, d / 2 - wall + 0.5, z], rotateX(Math.PI / 2, translate([0, 0, -0.5], pane)))
}

// ---------------------------------------------------------------------------

const out = join(here, "out")
mkdirSync(join(out, "parts"), { recursive: true })
const write = (name, geom) => {
  const data = stl.serialize({ binary: true }, geom)
  writeFileSync(join(out, name), Buffer.concat(data.map((a) => Buffer.from(a))))
  console.log("wrote", name)
}
write("case-base.stl", base())
write("case-lid.stl", lid())
write("case-window.stl", oledWindow())
write("case-labels.stl", union(labelFills))
write("case-engraving.stl", engraving(baseH + lidH - 0.6, 0.58))
for (const [name, geom] of Object.entries(buildParts())) write(`parts/${name}.stl`, geom)
writeFileSync(join(out, "dimensions.json"), JSON.stringify({ CASE, IN, PI, HAT, FRONT, BACK, BACK_HAT, BUTTONS, BACK_CONTROLS, RIGHT, STACK }, null, 2))
