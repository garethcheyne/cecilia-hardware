// The Cecilia unit's case, as code: a flat box with every socket on the back
// and only the display on the front.
//
//   npm run build   → out/case-base.stl, out/case-lid.stl, out/case-window.stl,
//                     out/case-engraving.stl, out/case-labels.stl, and
//                     out/parts/*.stl (the parts inside, for fit checks and renders)
//
// Repairable by design: four screws hold the lid; every part inside is
// standard and comes out with a screwdriver. Printed in nylon or moulded in
// PC/ABS (not metal), so the Pi's own Wi-Fi works.
import { writeFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import jscad from "@jscad/modeling"
import stl from "@jscad/stl-serializer"

import { roundedBox, text3d, mark3d, pipeVent2d } from "./geometry.mjs"
import { CASE, IN, FACES, PI, PI_HOLES, DAC, IO, BACK, LABEL_Z, FRONT, OLED_MODULE, PILLARS } from "./layout.mjs"
import { buildParts, IO_HOLES } from "./build-parts.mjs"

const { primitives, booleans, transforms, extrusions, hulls } = jscad
const { cylinder, cylinderElliptic, roundedRectangle, cuboid, circle } = primitives
const { union, subtract } = booleans
const { translate, rotateX, rotateZ } = transforms
const { extrudeLinear } = extrusions
const { hull } = hulls

const here = dirname(fileURLToPath(import.meta.url))
const { w, d, wall, floor, baseH, lidH, r } = CASE
const { backIn, frontIn } = FACES

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
  let body = rotateX(Math.PI / 2, translate([0, 0, -depth / 2], extrudeLinear({ height: depth }, face)))
  if (panel === "front") return translate([along, d / 2, z], body)
  if (panel === "back") return translate([along, -d / 2, z], body)
  body = rotateZ(Math.PI / 2, body)
  return translate([panel === "right" ? w / 2 : -w / 2, along, z], body)
}

// Every label is also kept as a thin fill (the printed lettering in the renders).
const labelFills = []

/**
 * A label cut 0.5 mm into a wall, reading left to right for someone facing it.
 * Stood up with rotateX it reads +x with its depth along −y: right for the
 * back wall; the others are turned from there.
 */
function label(panel, along, z, text, size = 2.8) {
  labelFills.push(placeLabel(panel, along, z, rotateX(Math.PI / 2, text3d(text, size, 0.45, { letterSpacing: 0.25 }))))
  return placeLabel(panel, along, z, rotateX(Math.PI / 2, text3d(text, size, 1, { letterSpacing: 0.25 })))
}
function placeLabel(panel, along, z, t) {
  if (panel === "back") return translate([along, -d / 2 + 0.5, z], t)
  if (panel === "front") return translate([along, d / 2 - 0.5, z], rotateZ(Math.PI, t))
  if (panel === "right") return translate([w / 2 - 0.5, along, z], rotateZ(Math.PI / 2, t))
  return translate([-w / 2 + 0.5, along, z], rotateZ(-Math.PI / 2, t))
}

function panelCuts() {
  const cuts = []
  // Front: the display window, with a rebate inside for the smoked window.
  const { oled } = FRONT
  cuts.push(cutter("front", oled.x, oled.z, oled.w, oled.h))
  cuts.push(translate([oled.x, frontIn + 0.5, oled.z], cuboid({ size: [oled.w + 5, 1.2, oled.h + 5] })))
  // Back: everything else.
  for (const p of BACK) {
    const round = p.shape === "round"
    cuts.push(cutter("back", p.x, p.z, round ? p.d : p.w, round ? p.d : p.h, p.shape))
    if (p.screws) for (const s of [-1, 1]) cuts.push(cutter("back", p.x + s * p.screws, p.z, 3.2, 3.2, "round"))
    cuts.push(label("back", p.x, LABEL_Z[p.at], p.label))
  }
  return cuts
}

/** Pipe-shaped vents in both side walls, and slots in the floor under the Pi. */
function vents() {
  const out = []
  const tall = [11, 15, 19, 15, 11]
  for (const side of [-1, 1]) {
    for (const groupY of [-6, 22]) {
      tall.forEach((h, i) => {
        const y = groupY + (i - 2) * 4.8
        const v = rotateX(Math.PI / 2, translate([0, 0, -wall * 2], extrudeLinear({ height: wall * 4 }, pipeVent2d(2.8, h))))
        out.push(translate([(side * w) / 2, y, floor + 8], rotateZ(Math.PI / 2, v)))
      })
    }
  }
  for (let i = 0; i < 7; i++) out.push(roundedBox(3, 40, floor + 1, 1.4, -0.5, PI.x0 + 6 + i * 7, PI.edgeY + 50))
  return out
}

// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

const boss = ([x, y], h, radius) => translate([x, y, floor + h / 2], cylinder({ radius, height: h, segments: 24 }))
const along = (x, y, z, radius, length) => translate([x, y, z], rotateX(Math.PI / 2, cylinder({ radius, height: length, segments: 16 })))

function base() {
  let shell = subtract(roundedBox(w, d, baseH, r), roundedBox(IN.w, IN.d, baseH, r - wall, floor))
  const pillarH = baseH - floor
  shell = union(
    shell,
    // Corner pillars for the lid screws.
    ...PILLARS.map(([x, y]) => boss([x, y], pillarH, 4.5)),
    // Bosses for the Pi and the I/O board (M2.5 heat-set inserts).
    ...PI_HOLES.map(([x, y]) => boss([x, y], 3, 3)),
    ...IO_HOLES.map(([x, y]) => boss([x, y], 3, 3)),
    // Bosses for the display module's corner holes (M2.5 self-tapping), clear of its glass.
    ...[-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) =>
        along(FRONT.oled.x + sx * OLED_MODULE.holes[0], frontIn - 2.7, FRONT.oled.z + sz * OLED_MODULE.holes[1], 2, 5.4)
      )
    )
  )
  return subtract(
    shell,
    ...panelCuts(),
    ...vents(),
    ...PILLARS.map(([x, y]) => translate([x, y, baseH - 3.5], cylinder({ radius: 2.1, height: 7.2, segments: 20 }))),
    ...[...PI_HOLES, ...IO_HOLES].map(([x, y]) => translate([x, y, floor + 2.5], cylinder({ radius: 1.6, height: 4, segments: 16 }))),
    // Recesses for rubber feet.
    ...[-1, 1].flatMap((sx) =>
      [-1, 1].map((sy) => translate([sx * (w / 2 - 16), sy * (d / 2 - 16), 0.3], cylinder({ radius: 5.6, height: 0.6, segments: 32 })))
    )
  )
}

// ---------------------------------------------------------------------------
// Lid
// ---------------------------------------------------------------------------

/** The mark above the wordmark, centred, reading the right way up from the front. */
function engraving(z, depth) {
  const group = union(translate([0, 12, 0], mark3d(40, depth)), translate([0, -22, 0], text3d("Cecilia", 21, depth)))
  return translate([0, 4, z], rotateZ(Math.PI, group))
}

function lid() {
  const plate = hull(roundedBox(w, d, lidH - 1.2, r, 0), roundedBox(w - 2.4, d - 2.4, lidH, r - 1.2, 0))
  const lip = subtract(
    roundedBox(IN.w - 0.4, IN.d - 0.4, 2, r - wall - 0.2, -2),
    roundedBox(IN.w - 3.6, IN.d - 3.6, 2, r - wall - 1.8, -2),
    ...PILLARS.map(([x, y]) => translate([x, y, -1], cylinder({ radius: 5.2, height: 2.2, segments: 24 })))
  )
  // Countersunk holes for the four M3 screws into the corner pillars.
  const holes = PILLARS.flatMap(([x, y]) => [
    translate([x, y, lidH / 2], cylinder({ radius: 1.7, height: lidH + 2, segments: 20 })),
    translate([x, y, lidH - 0.85], cylinderElliptic({ startRadius: [1.7, 1.7], endRadius: [3.4, 3.4], height: 1.72, segments: 24 })),
  ])
  return translate([0, 0, baseH], subtract(union(plate, lip), ...holes, engraving(lidH - 0.6, 1.6)))
}

/** The smoked window in front of the display. */
function oledWindow() {
  const { x, z, w: ow, h: oh } = FRONT.oled
  const pane = extrudeLinear({ height: 1 }, roundedRectangle({ size: [ow + 4.6, oh + 4.6], roundRadius: 1, segments: 16 }))
  return translate([x, frontIn + 0.5, z], rotateX(Math.PI / 2, translate([0, 0, -0.5], pane)))
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
writeFileSync(
  join(out, "dimensions.json"),
  JSON.stringify({ CASE, IN, FACES, PI, PI_HOLES, DAC, IO, IO_HOLES, BACK, LABEL_Z, FRONT, OLED_MODULE, PILLARS }, null, 2)
)
