// Simple models of what goes inside, for fit checks and renders: the Pi 5 and
// its Active Cooler, the optional Raspberry Pi DAC+, the Cecilia I/O board
// with its MIDI sockets and ribbon, the display module, and the panel-mount
// parts on the back. Shapes are simplified; sizes and positions are what matter.
import jscad from "@jscad/modeling"

import { CASE, FACES, PI, PI_HOLES, DAC, IO, BACK, FRONT, OLED_MODULE } from "./layout.mjs"

const { primitives, booleans, transforms } = jscad
const { cuboid, cylinder } = primitives
const { union, subtract } = booleans
const { translate, rotateX, rotateY } = transforms

const { backIn, frontIn } = FACES
const outside = -CASE.d / 2 // the back wall's outside face

/** A box by its minimum corner and size. */
const box = ([x, y, z], [sx, sy, sz]) => cuboid({ center: [x + sx / 2, y + sy / 2, z + sz / 2], size: [sx, sy, sz] })
/** A box in the Pi's own coordinates (px along its long edge, py across), turned into the case. */
const piBox = (px, py, z, sx, sy, sz) => box([PI.x0 + py, PI.edgeY + PI.w - px - sx, z], [sy, sx, sz])
/** A cylinder along y (through the front or back wall). */
const alongY = (x, y, z, radius, length, segments = 40) =>
  translate([x, y, z], rotateX(Math.PI / 2, cylinder({ radius, height: length, segments })))
/** A cylinder along x. */
const alongX = (x, y, z, radius, length) => translate([x, y, z], rotateY(Math.PI / 2, cylinder({ radius, height: length, segments: 32 })))
const holesIn = (z, t, points) => points.map(([x, y]) => translate([x, y, z + t / 2], cylinder({ radius: 1.35, height: t + 2, segments: 16 })))

// The I/O board's mounting holes: clear of the MIDI sockets at the back.
export const IO_HOLES = [
  [IO.x0 + 3.5, IO.y0 + 26],
  [IO.x1 - 3.5, IO.y0 + 26],
  [IO.x0 + 3.5, IO.y1 - 3.5],
  [IO.x1 - 3.5, IO.y1 - 3.5],
]

export function buildParts() {
  // ---- Raspberry Pi 5 ----
  const piBoard = subtract(piBox(0, 0, PI.z, PI.w, PI.d, PI.t), ...holesIn(PI.z, PI.t, PI_HOLES))
  const piChips = union(piBox(26, 22, PI.top, 15, 15, 1.4), piBox(46, 22, PI.top, 10, 12, 1.2), piBox(12, 34, PI.top, 12, 10, 1.1))
  const piMetal = union(
    // USB pairs and Ethernet, through the back wall.
    piBox(85 - 17.5 + 2.5, 9 - 6.6, PI.top, 17.5, 13.2, 16),
    piBox(85 - 17.5 + 2.5, 27 - 6.6, PI.top, 17.5, 13.2, 16),
    piBox(85 - 21 + 3, 45.75 - 8, PI.top, 21, 16, 13.5),
    // USB-C and the two micro HDMI, on the edge facing left.
    piBox(11.2 - 4.5, -1.2, PI.top, 9, 7.5, 3.2),
    piBox(25.8 - 3.5, -1.2, PI.top, 7, 7.5, 3),
    piBox(39.2 - 3.5, -1.2, PI.top, 7, 7.5, 3)
  )
  const piHeader = piBox(7.1, 50, PI.top, 50.8, 5, 8.5)
  // Raspberry Pi Active Cooler: heatsink with a blower fan.
  const cooler = union(
    piBox(17, 8, PI.top + 1.4, 42, 38, 1.6),
    ...Array.from({ length: 8 }, (_, i) => piBox(19 + i * 5, 8, PI.top + 3, 1.4, 22, 4.5)),
    piBox(34, 30, PI.top + 3, 24, 16, 5.5)
  )

  // ---- Raspberry Pi DAC+ (optional), on the Pi's header ----
  const dacBoard = subtract(piBox(0, 0, DAC.z, DAC.w, 56.5, DAC.t), ...holesIn(DAC.z, DAC.t, PI_HOLES))
  const rcaH = DAC.top - DAC.boardTop
  const dacParts = union(
    // Two phono sockets and the headphone jack, on the edge away from the header (CHECK).
    ...[20, 36].map((px) => piBox(px - 6, -1, DAC.boardTop, 12, 14, rcaH)),
    piBox(50, -1, DAC.boardTop, 7, 12, 6),
    piBox(26, 22, DAC.boardTop, 9, 9, 1.2), // the DAC chip
    piBox(7.1, 50, PI.top + 8.5, 50.8, 5, DAC.z - PI.top - 8.5), // its female header, onto the Pi's pins
    piBox(7.1, 50, DAC.boardTop, 50.8, 5, 2.5) // the pass-through pins on top
  )
  const dacGold = union(...[20, 36].map((px) => alongX(PI.x0 - 1, PI.edgeY + PI.w - px, DAC.boardTop + rcaH - 6.5, 4, 3)))
  const dacStandoffs = union(
    ...PI_HOLES.map(([x, y]) => translate([x, y, (PI.top + DAC.z) / 2], cylinder({ radius: 2.5, height: DAC.z - PI.top, segments: 6 })))
  )
  // The 40-way ribbon from the DAC+'s pass-through header to the I/O board.
  const hx = PI.x0 + 52.5
  const ribbonY = PI.edgeY + PI.w - 57.9 - 3
  const ioHeaderX = IO.x0 + 8 // the I/O board's ribbon header, clear of its mounting hole
  const ribbon = union(
    box([hx - 3.3, ribbonY, DAC.boardTop + 2.5], [6.6, 57, 6.5]), // IDC socket on the pass-through pins
    box([hx, ribbonY + 3, DAC.boardTop + 9], [ioHeaderX + 4.8 - hx, 51, 0.8]),
    box([ioHeaderX + 4, ribbonY + 3, IO.top + 9], [0.8, 51, DAC.boardTop + 9.8 - IO.top - 9])
  )

  // ---- Cecilia I/O board ----
  const ioBoard = subtract(box([IO.x0, IO.y0, IO.z], [IO.x1 - IO.x0, IO.y1 - IO.y0, IO.t]), ...holesIn(IO.z, IO.t, IO_HOLES))
  const dins = BACK.filter((p) => p.part === "din")
  const ioDin = union(
    ...dins.map((p) => union(box([p.x - 10, backIn + 1.5, IO.top], [20, 20, 20.5]), alongY(p.x, backIn + 0.6, p.z, 7.6, 1.6)))
  )
  const ioDinRings = union(...dins.map((p) => subtract(alongY(p.x, backIn - 0.3, p.z, 7.6, 0.4), alongY(p.x, backIn - 0.3, p.z, 6.6, 1))))
  const ioParts = union(
    box([ioHeaderX, ribbonY + 0.5, IO.top], [8.8, 58, 9]), // shrouded 2x20 header, for the ribbon
    box([77, backIn + 30, IO.top], [6, 5, 2.4]), // optocoupler (MIDI IN)
    box([87, backIn + 30, IO.top], [3, 3, 1.1]), // buffer (MIDI OUT)
    box([IO.x1 - 9, IO.y1 - 30, IO.top], [6, 8, 3]), // display connector
    box([IO.x1 - 9, IO.y1 - 44, IO.top], [6, 6, 3]), // button and light connector
    box([IO.x1 - 9, IO.y1 - 56, IO.top], [6, 5, 3]) // ON/OFF lead to the Pi's power-button header
  )

  // ---- The display module behind its window ----
  const { x: ox, z: oz } = FRONT.oled
  const [pw, ph] = OLED_MODULE.pcb
  const [gw, gh] = OLED_MODULE.glass
  const [hxo, hzo] = OLED_MODULE.holes
  const oledPcb = subtract(
    box([ox - pw / 2, frontIn - 7, oz - ph / 2], [pw, 1.6, ph]),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => alongY(ox + sx * hxo, frontIn - 6.2, oz + sz * hzo, 1.3, 3, 16)))
  )
  const oledGlass = box([ox - gw / 2, frontIn - 5.4, oz - gh / 2], [gw, 2, gh])

  // ---- Panel-mount parts on the back ----
  const at = (part) => BACK.filter((p) => p.part === part)
  const panelDark = union(
    // HDMI and USB-C panel sockets: bodies inside, openings dark.
    ...at("hdmi").map((p) => box([p.x - 8.5, backIn, p.z - 4.5], [17, 16, 9])),
    ...at("usbc").map((p) => box([p.x - 6.5, backIn, p.z - 3.5], [13, 14, 7])),
    // ON/OFF: the switch body inside, and its cap.
    ...at("onoff").map((p) => union(alongY(p.x, backIn + 11, p.z, 6.5, 22), alongY(p.x, outside - 0.4, p.z, 4.6, 2))),
    // RESET: a small recessed button.
    ...at("reset").map((p) => union(alongY(p.x, backIn + 6, p.z, 4.5, 12), alongY(p.x, outside + 1.6, p.z, 2.4, 1.2)))
  )
  const panelMetal = union(
    ...at("hdmi").map((p) => subtract(box([p.x - 16.5, outside - 1.2, p.z - 5.5], [33, 1.2, 11]), box([p.x - 8, outside - 2, p.z - 3.5], [16, 3, 7]))),
    ...at("usbc").map((p) => subtract(box([p.x - 13.5, outside - 1, p.z - 4.5], [27, 1, 9]), box([p.x - 6.3, outside - 2, p.z - 3.2], [12.6, 3, 6.4]))),
    ...at("onoff").map((p) => subtract(alongY(p.x, outside - 0.75, p.z, 7.6, 1.5), alongY(p.x, outside - 0.75, p.z, 5.4, 3)))
  )
  const panelGold = union(
    ...at("rca").map((p) =>
      union(
        subtract(alongY(p.x, outside - 4, p.z, 4, 8), alongY(p.x, outside - 5, p.z, 2.4, 8)),
        alongY(p.x, outside - 0.9, p.z, 6.2, 1.8, 6) // the nut
      )
    )
  )
  const onoffRing = union(...at("onoff").map((p) => subtract(alongY(p.x, outside - 0.5, p.z, 5.3, 1), alongY(p.x, outside - 0.5, p.z, 4.7, 2))))

  return {
    "pi-board": piBoard,
    "pi-chips": piChips,
    "pi-metal": piMetal,
    "pi-header": piHeader,
    cooler,
    "dac-board": dacBoard,
    "dac-parts": dacParts,
    "dac-gold": dacGold,
    "dac-standoffs": dacStandoffs,
    ribbon,
    "io-board": ioBoard,
    "io-din": ioDin,
    "io-din-rings": ioDinRings,
    "io-parts": ioParts,
    "oled-pcb": oledPcb,
    "oled-glass": oledGlass,
    "panel-dark": panelDark,
    "panel-metal": panelMetal,
    "panel-gold": panelGold,
    "onoff-ring": onoffRing,
  }
}
