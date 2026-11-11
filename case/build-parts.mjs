// Simple models of what goes inside, for fit checks and renders: the Pi 5,
// its heatsink, the Cecilia HAT with its sockets, the standoff stack, the
// OLED module, the button and the status light. Shapes are simplified; sizes
// and positions are what matter.
import jscad from "@jscad/modeling"

import { CASE, PI, HAT, FRONT, BACK_HAT, BUTTONS, BACK_CONTROLS, STACK, onPi } from "./layout.mjs"

const { primitives, booleans, transforms } = jscad
const { cuboid, cylinder } = primitives
const { union, subtract } = booleans
const { translate, rotateX } = transforms

/** A box by its minimum corner and size. */
const box = ([x, y, z], [sx, sy, sz]) => cuboid({ center: [x + sx / 2, y + sy / 2, z + sz / 2], size: [sx, sy, sz] })

export function buildParts() {
  const { d } = CASE
  const front = d / 2 - CASE.wall

  // Raspberry Pi 5 board.
  const piBoard = subtract(
    box(onPi(0, 0, PI.z), [PI.w, PI.d, PI.t]),
    ...STACK.map(([x, y]) => translate([x, y, PI.z + PI.t / 2], cylinder({ radius: 1.35, height: 4, segments: 16 })))
  )
  const piChips = union(
    box(onPi(26, 22), [15, 15, 1.4]), // the SoC
    box(onPi(46, 22), [10, 12, 1.2]), // RP1
    box(onPi(12, 34), [12, 10, 1.1]) // memory
  )
  // Metal: USB pairs and Ethernet on the right edge; USB-C and micro HDMI at the back.
  const piMetal = union(
    box(onPi(85 - 17.5 + 2.5, 9 - 6.6), [17.5, 13.2, 16]),
    box(onPi(85 - 17.5 + 2.5, 27 - 6.6), [17.5, 13.2, 16]),
    box(onPi(85 - 21 + 3, 45.75 - 8), [21, 16, 13.5]),
    box(onPi(11.2 - 4.5, -1.2), [9, 7.5, 3.2]),
    box(onPi(25.8 - 3.5, -1.2), [7, 7.5, 3]),
    box(onPi(39.2 - 3.5, -1.2), [7, 7.5, 3])
  )
  const piHeader = box(onPi(7.1, 50), [50.8, 5, 8.5])
  const heatsink = union(
    box(onPi(21, 15, PI.top + 1.4), [26, 26, 2]),
    ...Array.from({ length: 7 }, (_, i) => box(onPi(21.5 + i * 3.7, 15, PI.top + 3.4), [1.2, 26, 5.5]))
  )

  // The Cecilia HAT (standard HAT+ size) with its parts. Its sockets face
  // the back wall.
  const back = -CASE.d / 2 + CASE.wall
  const hatBoard = subtract(
    box(onPi(0, 0, HAT.z), [HAT.w, HAT.d, HAT.t]),
    ...STACK.map(([x, y]) => translate([x, y, HAT.z + HAT.t / 2], cylinder({ radius: 1.35, height: 4, segments: 16 })))
  )
  const dins = BACK_HAT.filter((p) => p.din)
  const lineOut = BACK_HAT.find((p) => !p.din)
  const along = (x, y, z, r, h) => translate([x, y, z], rotateX(Math.PI / 2, cylinder({ radius: r, height: h, segments: 40 })))
  const hatDin = union(
    ...dins.map((p) => union(box([p.x - 10, back + 1.5, HAT.top], [20, 20, 20.5]), along(p.x, back + 0.6, p.z, 7.6, 1.6)))
  )
  const dinRings = union(...dins.map((p) => subtract(along(p.x, back - 0.3, p.z, 7.6, 0.4), along(p.x, back - 0.3, p.z, 6.6, 1))))
  const hatParts = union(
    box([lineOut.x - 3, back + 0.2, HAT.top], [6, 12, 5.2]), // line-out jack
    box(onPi(50, 24), [7, 7, 1.2]), // audio DAC
    box(onPi(30, 26), [4, 4, 1.4]), // optocoupler
    box(onPi(40, 26), [3, 3, 1.1]), // buffer
    box(onPi(12, 40), [5, 3, 1.4]), // HAT+ EEPROM
    box(onPi(2, 26), [6, 4.5, 3]), // OLED cable socket
    box(onPi(2, 33), [6, 4.5, 3]), // status light socket
    box(onPi(2, 40), [6, 4.5, 3]) // button board socket
  )
  const header = box(onPi(7.1, 50, PI.top + 8.5), [50.8, 5, HAT.z - PI.top - 8.5])

  // The standoff stack: Pi to HAT (12 mm), HAT to lid.
  const standoffsLow = union(
    ...STACK.map(([x, y]) => translate([x, y, PI.top + 6], cylinder({ radius: 2.5, height: 12, segments: 6 })))
  )
  const standoffsHigh = union(
    ...STACK.map(([x, y]) => {
      const h = CASE.baseH - HAT.top
      return translate([x, y, HAT.top + h / 2], cylinder({ radius: 2.5, height: h, segments: 6 }))
    })
  )

  // The 1.3" OLED module behind its window.
  const { x: ox, z: oz } = FRONT.oled
  const pcbZ = oz - 1
  const oledPcb = subtract(
    box([ox - 17.75, front - 7, pcbZ - 16.75], [35.5, 1.6, 33.5]),
    ...[-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) =>
        translate([ox + sx * 15.2, front - 6.2, pcbZ + sz * 14.25], rotateX(Math.PI / 2, cylinder({ radius: 1.1, height: 3, segments: 16 })))
      )
    )
  )
  const oledGlass = box([ox - 17.25, front - 5.4, oz - 11.5], [34.5, 1.4, 23])

  // The button board behind the back panel: ON/OFF and RESET.
  const buttonBoard = box([BUTTONS.x - BUTTONS.w / 2, back + 5.4, BUTTONS.z - BUTTONS.h / 2], [BUTTONS.w, 1.6, BUTTONS.h])
  const switches = union(...BACK_CONTROLS.map((c) => box([c.x - 3, back + 1.9, c.z - 3], [6, 3.5, 6])))
  const [onOff, reset] = BACK_CONTROLS
  const button = union(
    along(onOff.x, back - 0.2, onOff.z, 2.9, 4.2),
    along(reset.x, back + 1.2, reset.z, 0.9, 1.4)
  )
  const led = translate([FRONT.led.x, front + 1.4, FRONT.led.z], rotateX(Math.PI / 2, cylinder({ radius: 1.5, height: 5, segments: 24 })))

  return {
    "pi-board": piBoard,
    "pi-chips": piChips,
    "pi-metal": piMetal,
    "pi-header": union(piHeader, header),
    heatsink,
    "hat-board": hatBoard,
    "hat-din": hatDin,
    "hat-din-rings": dinRings,
    "hat-parts": hatParts,
    "button-board": buttonBoard,
    switches,
    "standoffs-low": standoffsLow,
    "standoffs-high": standoffsHigh,
    "oled-pcb": oledPcb,
    "oled-glass": oledGlass,
    button,
    led,
  }
}
