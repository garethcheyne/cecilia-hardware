// Shared drawing helpers: rounded boxes, the Cecilia mark, text from the
// brand font, and pipe-shaped vents.
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import jscad from "@jscad/modeling"
import opentype from "opentype.js"

const { primitives, booleans, transforms, extrusions, measurements } = jscad
const { roundedRectangle, polygon, polyhedron } = primitives
const { union, subtract } = booleans
const { translate } = transforms
const { extrudeLinear } = extrusions

const here = dirname(fileURLToPath(import.meta.url))
const font = opentype.parse(readFileSync(join(here, "fonts", "InstrumentSans.ttf")).buffer)

/** A rounded box, centred on x/y (or at cx, cy), from z0 to z0 + h. */
export function roundedBox(w, d, h, r, z0 = 0, cx = 0, cy = 0) {
  return translate(
    [cx, cy, z0],
    extrudeLinear({ height: h }, roundedRectangle({ size: [w, d], roundRadius: Math.min(r, w / 2 - 0.01, d / 2 - 0.01), segments: 32 }))
  )
}

function contoursOf(path, steps = 8) {
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
    } else if (c.type === "Q" || c.type === "C") {
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        let x
        let y
        if (c.type === "Q") {
          const a = (1 - t) ** 2
          const b = 2 * (1 - t) * t
          const d = t * t
          x = a * x0 + b * c.x1 + d * c.x
          y = a * y0 + b * c.y1 + d * c.y
        } else {
          const a = (1 - t) ** 3
          const b = 3 * (1 - t) ** 2 * t
          const e = 3 * (1 - t) * t * t
          const d = t ** 3
          x = a * x0 + b * c.x1 + e * c.x2 + d * c.x
          y = a * y0 + b * c.y1 + e * c.y2 + d * c.y
        }
        cur.push([x, -y])
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

/** Ear-clip a simple counter-clockwise polygon into triangles (indices). */
function earclip(pts) {
  const idx = pts.map((_, i) => i)
  const tris = []
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  const inTri = (p, a, b, c) => cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0
  let guard = 0
  while (idx.length > 3 && guard++ < 10000) {
    let cut = false
    for (let k = 0; k < idx.length; k++) {
      const [ia, ib, ic] = [idx[(k + idx.length - 1) % idx.length], idx[k], idx[(k + 1) % idx.length]]
      const [a, b, c] = [pts[ia], pts[ib], pts[ic]]
      if (cross(a, b, c) <= 1e-9) continue
      if (idx.some((j) => j !== ia && j !== ib && j !== ic && inTri(pts[j], a, b, c))) continue
      tris.push([ia, ib, ic])
      idx.splice(k, 1)
      cut = true
      break
    }
    if (!cut) idx.splice(0, 1) // degenerate leftovers
  }
  if (idx.length === 3) tris.push(idx)
  return tris
}

/**
 * Extrude a counter-clockwise outline by h, with triangulated caps. (JSCAD's
 * own extrusion leaves concave caps whole, which the booleans and the STL
 * writer mishandle: strokes of letters like L, H and B went missing.)
 */
function prism(pts, h, z0 = 0) {
  const n = pts.length
  const points = [...pts.map(([x, y]) => [x, y, z0]), ...pts.map(([x, y]) => [x, y, z0 + h])]
  const faces = []
  for (const [a, b, c] of earclip(pts)) faces.push([n + a, n + b, n + c], [c, b, a])
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    faces.push([i, j, n + j], [i, n + j, n + i])
  }
  return polyhedron({ points, faces, orientation: "outward" })
}

/** Text as a solid `h` deep, `size` mm em height, centred on x/y, from z = 0, reading +x. */
export function text3d(str, size, h, { letterSpacing = 0 } = {}) {
  const glyphs = [...str].map((ch) => font.charToGlyph(ch))
  let x = 0
  const scale = size / font.unitsPerEm
  const letters = []
  for (const g of glyphs) {
    const contours = contoursOf(g.getPath(x, 0, size))
      .map((c) => clean(c))
      .filter((c) => c.length > 2)
    const solids = []
    const holes = []
    // Fonts fill by winding: outlines turning the same way as the largest are
    // solid (a variable font's strokes overlap), the opposite way are holes.
    const largest = contours.reduce((big, c) => (Math.abs(area(c)) > Math.abs(area(big)) ? c : big), contours[0] ?? [])
    const solidSign = largest.length ? Math.sign(area(largest)) : 1
    contours.forEach((pts) => {
      const ccw = area(pts) > 0 ? pts : [...pts].reverse()
      if (Math.sign(area(pts)) === solidSign) solids.push(prism(ccw, h))
      else holes.push(prism(ccw, h + 0.2, -0.1))
    })
    if (solids.length) letters.push(holes.length ? subtract(union(solids), union(holes)) : union(solids))
    x += g.advanceWidth * scale + letterSpacing
  }
  const all = union(letters)
  const [[minX, minY], [maxX, maxY]] = measurements.measureBoundingBox(all)
  return translate([-(minX + maxX) / 2, -(minY + maxY) / 2, 0], all)
}

/** The Cecilia mark (five pipes on a plinth), `height` tall, `h` deep, centred, reading +y up. */
export function mark3d(height, h) {
  const s = height / 26
  const PIPES = [
    [4.5, 13],
    [10.25, 8],
    [16, 3],
    [21.75, 8],
    [27.5, 13],
  ]
  const pt = ([x, y]) => [(x - 16) * s, (16 - y) * s]
  const solid = (points) => extrudeLinear({ height: h }, polygon({ points: points.map(pt) }))
  const parts = []
  for (const [x, top] of PIPES) {
    parts.push(solid([[x - 2.5, 21], [x + 2.5, 21], [x + 2.5, top], [x - 2.5, top]]))
    parts.push(solid([[x - 2.5, 21.6], [x - 0.8, 27], [x + 0.8, 27], [x + 2.5, 21.6]]))
  }
  parts.push(solid([[2, 29], [30, 29], [30, 27.7], [2, 27.7]]))
  return translate([0, -3 * s, 0], union(parts))
}

/** A vent shaped like one of the mark's pipes, foot down, in the x–y plane. */
export function pipeVent2d(w, h) {
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
