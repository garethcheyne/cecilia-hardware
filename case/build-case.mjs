// The Cecilia unit's case, as code: a base tray and a lid, with every port
// cut where the carrier board puts it, the Cecilia mark and wordmark cut into
// the lid, port labels on the panels, and side vents shaped like the mark's
// organ pipes.
//
//   npm install && npm run build      → out/case-base.stl, out/case-lid.stl
//
// All sizes are millimetres. Port positions come from PORTS below; keep them
// in step with the carrier board layout (docs/SPEC.md, "Connector layout").
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import jscad from "@jscad/modeling"
import stl from "@jscad/stl-serializer"
import opentype from "opentype.js"

const { primitives, booleans, transforms, extrusions, hulls, measurements } = jscad
const { cylinder, roundedRectangle, polygon } = primitives
const { union, subtract } = booleans
const { translate, rotateX, rotateZ } = transforms
const { extrudeLinear } = extrusions
const { hull } = hulls

const here = dirname(fileURLToPath(import.meta.url))
const font = opentype.parse(readFileSync(join(here, "fonts", "InstrumentSans.ttf")).buffer)

// ---------------------------------------------------------------------------
// Dimensions
// ---------------------------------------------------------------------------

export const CASE = {
  w: 132, // x, left to right as seen from the front
  d: 102, // y, front (+) to back (−)
  baseH: 33, // base tray height, floor to rim
  lidH: 4, // lid plate
  wall: 2.4,
  floor: 2.4,
  r: 7, // corner radius
}
// The carrier board sits on standoffs; its top face height sets the ports.
export const PCB = { w: 124, d: 94, t: 1.6, standoff: 5 }
const pcbTop = CASE.floor + PCB.standoff + PCB.t

// Ports: [panel, x centre, z centre above the board's top, width, height, shape, label]
// x is as seen looking at that panel. Shapes: "slot" (rounded rectangle),
// "rect", "round" (diameter = width).
export const PORTS = [
  // Back panel, left to right as seen from behind.
  ["back", -50, 1.8, 9.4, 3.6, "slot", "POWER"],
  ["back", -28, 6.9, 16.4, 13.8, "rect", "ETHERNET"],
  ["back", -5, 3.1, 15.4, 6.4, "rect", "HDMI 1"],
  ["back", 15, 3.1, 15.4, 6.4, "rect", "HDMI 2"],
  ["back", 35, 3.6, 13.6, 6.0, "rect", "USB"],
  ["back", 54, 12.5, 6.6, 6.6, "round", "WI-FI"],
  // Front panel, left to right as seen from the front.
  ["front", -38, 10.5, 15.8, 15.8, "round", "MIDI IN"],
  ["front", -14, 10.5, 15.8, 15.8, "round", "MIDI OUT"],
  ["front", 14, 3.2, 6.2, 6.2, "round", "LINE OUT"],
  ["front", 36, 14, 6.4, 6.4, "round", ""], // button
  ["front", 50, 14, 3.2, 3.2, "round", ""], // status light pipe
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A rounded box, centred on x/y, from z0 to z0 + h. */
function roundedBox(w, d, h, r, z0 = 0) {
  return translate(
    [0, 0, z0],
    extrudeLinear({ height: h }, roundedRectangle({ size: [w, d], roundRadius: r, segments: 48 }))
  )
}

/** Flatten an opentype path into closed contours of [x, y] points (y up). */
function contoursOf(path, steps = 10) {
  const out = []
  let cur = []
  let x0 = 0
  let y0 = 0
  for (const c of path.commands) {
    if (c.type === "M") {
      if (cur.length > 2) out.push(cur)
      cur = [[c.x, -c.y]]
      x0 = c.x
      y0 = c.y
    } else if (c.type === "L") {
      cur.push([c.x, -c.y])
      x0 = c.x
      y0 = c.y
    } else if (c.type === "Q") {
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        const a = (1 - t) ** 2
        const b = 2 * (1 - t) * t
        const d = t * t
        cur.push([a * x0 + b * c.x1 + d * c.x, -(a * y0 + b * c.y1 + d * c.y)])
      }
      x0 = c.x
      y0 = c.y
    } else if (c.type === "C") {
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        const a = (1 - t) ** 3
        const b = 3 * (1 - t) ** 2 * t
        const e = 3 * (1 - t) * t * t
        const d = t ** 3
        cur.push([a * x0 + b * c.x1 + e * c.x2 + d * c.x, -(a * y0 + b * c.y1 + e * c.y2 + d * c.y)])
      }
      x0 = c.x
      y0 = c.y
    } else if (c.type === "Z") {
      if (cur.length > 2) out.push(cur)
      cur = []
    }
  }
  if (cur.length > 2) out.push(cur)
  return out
}

/** Points closer than this (mm) are merged, so outlines stay clean. */
function clean(pts, eps = 0.02) {
  const out = []
  for (const p of pts) {
    const last = out[out.length - 1]
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > eps) out.push(p)
  }
  while (out.length > 2 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= eps) out.pop()
  return out
}

const area = (pts) =>
  pts.reduce((s, [x, y], i) => {
    const [x2, y2] = pts[(i + 1) % pts.length]
    return s + x * y2 - x2 * y
  }, 0) / 2

function inside([px, py], pts) {
  let hit = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

/**
 * Text as a solid `h` mm deep, `size` mm em height, centred on x/y, from
 * z = 0. Each outline is made solid on its own and the letters' holes are
 * cut in 3D, which copes with fonts' tiny outline gaps.
 */
function text3d(str, size, h, { letterSpacing = 0 } = {}) {
  // One glyph per character (the font's ligature rules aren't needed here).
  const glyphs = [...str].map((ch) => font.charToGlyph(ch))
  let x = 0
  const scale = size / font.unitsPerEm
  const letters = []
  for (const g of glyphs) {
    const contours = contoursOf(g.getPath(x, 0, size), 8)
      .map((c) => clean(c))
      .filter((c) => c.length > 2)
    const solids = []
    const holes = []
    contours.forEach((pts, i) => {
      const depth = contours.filter((o, j) => j !== i && inside(pts[0], o)).length
      const ccw = area(pts) > 0 ? pts : [...pts].reverse()
      if (depth % 2 === 0) solids.push(extrudeLinear({ height: h }, polygon({ points: ccw })))
      else holes.push(translate([0, 0, -0.1], extrudeLinear({ height: h + 0.2 }, polygon({ points: ccw }))))
    })
    if (solids.length) letters.push(holes.length ? subtract(union(solids), union(holes)) : union(solids))
    x += g.advanceWidth * scale + letterSpacing
  }
  const all = union(letters)
  const [[minX, minY], [maxX, maxY]] = measurements.measureBoundingBox(all)
  return translate([-(minX + maxX) / 2, -(minY + maxY) / 2, 0], all)
}

/** The Cecilia mark (five pipes on a plinth), `height` mm tall, `h` deep, centred. */
function mark3d(height, h) {
  const s = height / 26 // the mark spans y 3..29 in its 32-unit box
  const PIPES = [
    [4.5, 13],
    [10.25, 8],
    [16, 3],
    [21.75, 8],
    [27.5, 13],
  ]
  const pt = ([x, y]) => [(x - 16) * s, (16 - y) * s] // y up, centred
  const solid = (points) => extrudeLinear({ height: h }, polygon({ points: points.map(pt) }))
  const parts = []
  for (const [x, top] of PIPES) {
    parts.push(solid([[x - 2.5, 21], [x + 2.5, 21], [x + 2.5, top], [x - 2.5, top]]))
    parts.push(solid([[x - 2.5, 21.6], [x - 0.8, 27], [x + 0.8, 27], [x + 2.5, 21.6]]))
  }
  parts.push(solid([[2, 29], [30, 29], [30, 27.7], [2, 27.7]]))
  return translate([0, -3 * s, 0], union(parts))
}

/** A vent shaped like one of the mark's pipes: a body with a pointed foot. */
function pipeVent2d(w, h) {
  const foot = w * 1.3
  return polygon({
    points: [
      [-w / 2, h],
      [-w / 2, foot],
      [0, 0],
      [w / 2, foot],
      [w / 2, h],
    ],
  })
}

// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

function portCutter([panel, x, z, w, h, shape]) {
  const zc = pcbTop + z
  const depth = CASE.wall * 4
  let body
  if (shape === "round") body = rotateX(Math.PI / 2, cylinder({ radius: w / 2, height: depth, segments: 48 }))
  else {
    const r = shape === "slot" ? h / 2 - 0.01 : 0.6
    body = rotateX(
      Math.PI / 2,
      translate([0, 0, -depth / 2], extrudeLinear({ height: depth }, roundedRectangle({ size: [w, h], roundRadius: r, segments: 24 })))
    )
  }
  const y = panel === "front" ? CASE.d / 2 : -CASE.d / 2
  // Facing the front you look along −y, so your right is −x; at the back, +x.
  const px = panel === "front" ? -x : x
  return translate([px, y, zc], body)
}

/** Labels cut 0.5 mm into the panel, above each port. */
function portLabel([panel, x, z, , h, , label]) {
  if (!label) return null
  // Stood up on the panel, reading left to right for someone facing it,
  // cut 0.5 mm into the surface.
  const t = rotateX(Math.PI / 2, text3d(label, 3.6, 1, { letterSpacing: 0.3 }))
  const zc = pcbTop + z + h / 2 + 4.4
  if (panel === "front") return translate([-x, CASE.d / 2 - 0.5, zc], rotateZ(Math.PI, t))
  return translate([x, -CASE.d / 2 + 0.5, zc], t)
}

function sideVents() {
  const tall = [10, 13, 16, 13, 10]
  const out = []
  for (const side of [1, -1]) {
    for (const groupY of [-24, 24]) {
      tall.forEach((h, i) => {
        const y = groupY + (i - 2) * 5.2
        // A vent in the x–z plane: foot pointing down, body rising.
        const v = rotateX(Math.PI / 2, translate([0, 0, -CASE.wall * 2], extrudeLinear({ height: CASE.wall * 4 }, pipeVent2d(3, h))))
        // Turn it to face out of the side wall.
        out.push(translate([side * (CASE.w / 2), y, CASE.floor + 9], rotateZ(Math.PI / 2, v)))
      })
    }
  }
  return out
}

function base() {
  const { w, d, baseH, wall, floor, r } = CASE
  let shell = subtract(roundedBox(w, d, baseH, r), roundedBox(w - 2 * wall, d - 2 * wall, baseH, r - wall, floor))
  // Corner bosses: the lid screws come up through the floor into the lid.
  const bossXY = [
    [w / 2 - 8, d / 2 - 8],
    [-w / 2 + 8, d / 2 - 8],
    [w / 2 - 8, -d / 2 + 8],
    [-w / 2 + 8, -d / 2 + 8],
  ]
  const bosses = bossXY.map(([x, y]) => translate([x, y, baseH / 2], cylinder({ radius: 4.2, height: baseH, segments: 32 })))
  // Board standoffs, under the carrier's four M2.5 mounting holes.
  const holes = [
    [PCB.w / 2 - 4, PCB.d / 2 - 4],
    [-PCB.w / 2 + 4, PCB.d / 2 - 4],
    [PCB.w / 2 - 4, -PCB.d / 2 + 4],
    [-PCB.w / 2 + 4, -PCB.d / 2 + 4],
  ]
  const standoffs = holes.map(([x, y]) =>
    translate([x, y, floor + PCB.standoff / 2], cylinder({ radius: 3, height: PCB.standoff, segments: 24 }))
  )
  shell = union(shell, ...bosses, ...standoffs)
  const cuts = [
    ...PORTS.map(portCutter),
    ...PORTS.map(portLabel).filter(Boolean),
    // Screw holes through the bosses (M3 clearance, counterbored underneath).
    ...bossXY.map(([x, y]) => translate([x, y, baseH / 2], cylinder({ radius: 1.7, height: baseH + 2, segments: 24 }))),
    ...bossXY.map(([x, y]) => translate([x, y, 1.5], cylinder({ radius: 3.1, height: 3.2, segments: 24 }))),
    // Pilot holes in the standoffs for M2.5 screws.
    ...holes.map(([x, y]) =>
      translate([x, y, floor + PCB.standoff / 2 + 0.5], cylinder({ radius: 1.05, height: PCB.standoff, segments: 16 }))
    ),
    // Recesses for rubber feet.
    ...[
      [w / 2 - 16, d / 2 - 14],
      [-w / 2 + 16, d / 2 - 14],
      [w / 2 - 16, -d / 2 + 14],
      [-w / 2 + 16, -d / 2 + 14],
    ].map(([x, y]) => translate([x, y, 0.3], cylinder({ radius: 5.2, height: 0.6, segments: 32 }))),
    // Side vents: two flats of five pipes on each side, like the mark.
    ...sideVents(),
  ]
  return subtract(shell, ...cuts)
}

/**
 * The mark above the wordmark, reading the right way up for someone in front
 * of the unit (the front is +y, so "up" on the lid points to −y).
 */
function engraving(z, depth) {
  const group = union(translate([0, 9, 0], mark3d(30, depth)), translate([0, -20, 0], text3d("Cecilia", 16, depth)))
  return translate([0, 0, z], rotateZ(Math.PI, group))
}

// ---------------------------------------------------------------------------
// Lid
// ---------------------------------------------------------------------------

function lid() {
  const { w, d, baseH, lidH, wall, r } = CASE
  // A plate with softened top edges, and a lip that sits inside the base.
  const plate = hull(roundedBox(w, d, lidH - 1.2, r, 0), roundedBox(w - 2.4, d - 2.4, lidH, r - 1.2, 0))
  const lip = roundedBox(w - 2 * wall - 0.4, d - 2 * wall - 0.4, 2.2, r - wall - 0.2, -2.2)
  const lipHollow = roundedBox(w - 2 * wall - 3.6, d - 2 * wall - 3.6, 2.2, r - wall - 1.8, -2.2)
  // Bosses the bottom screws thread into (M3 heat-set inserts).
  const bossXY = [
    [w / 2 - 8, d / 2 - 8],
    [-w / 2 + 8, d / 2 - 8],
    [w / 2 - 8, -d / 2 + 8],
    [-w / 2 + 8, -d / 2 + 8],
  ]
  let body = union(plate, subtract(lip, lipHollow))
  body = subtract(body, ...bossXY.map(([x, y]) => translate([x, y, -1], cylinder({ radius: 2.1, height: 4, segments: 24 }))))

  // The Cecilia mark and wordmark, cut 0.7 mm into the top.
  const depth = 0.7
  return translate([0, 0, baseH], subtract(body, engraving(lidH - depth, depth + 1)))
}

// ---------------------------------------------------------------------------

const out = join(here, "out")
mkdirSync(out, { recursive: true })
const write = (name, geom) => {
  const data = stl.serialize({ binary: true }, geom)
  writeFileSync(join(out, name), Buffer.concat(data.map((a) => Buffer.from(a))))
  console.log("wrote", name)
}
write("case-base.stl", base())
write("case-lid.stl", lid())
// The engraved mark and wordmark on their own, for previews (laser-engraved
// anodised aluminium shows bright metal there).
{
  const depth = 0.68
  const z = CASE.baseH + CASE.lidH - 0.7
  write("case-engraving.stl", engraving(z, depth))
}
writeFileSync(join(out, "dimensions.json"), JSON.stringify({ CASE, PCB, PORTS, pcbTop }, null, 2))
