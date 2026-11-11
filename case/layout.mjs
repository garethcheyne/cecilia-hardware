// Where everything sits in the Cecilia unit (Raspberry Pi 5 + Cecilia HAT),
// shared by the case, the internal models and the renders. Millimetres.
//
// Case coordinates: x left to right as seen from the BACK (so the front
// panel's right is −x), y from back (−) to front (+), z up from the bottom.
//
// The Pi 5's connector positions follow Raspberry Pi's mechanical drawing as
// best known here; CHECK them against the current "Raspberry Pi 5 mechanical
// drawing" PDF before ordering a case.

export const CASE = {
  w: 126,
  d: 66,
  wall: 2.4,
  floor: 2.4,
  baseH: 0, // base tray, floor to rim (the lid's underside): set below from the standoff stack
  lidH: 4,
  r: 6,
}
export const IN = { w: CASE.w - 2 * CASE.wall, d: CASE.d - 2 * CASE.wall }

// The Pi sits against the right and back walls, so its ports reach them.
export const PI = {
  w: 85,
  d: 56,
  t: 1.6,
  x0: IN.w / 2 - 0.6 - 85, // case x of the Pi's left edge
  y0: -IN.d / 2 + 1.6, // case y of the Pi's back edge (power, HDMI)
  z: CASE.floor + 4, // underside of the Pi's board (on 4 mm bosses)
  holes: [
    [3.5, 3.5],
    [61.5, 3.5],
    [3.5, 52.5],
    [61.5, 52.5],
  ],
}
PI.top = PI.z + PI.t
/** A point on the Pi (its own coordinates) in case coordinates. */
export const onPi = (px, py, z = PI.top) => [PI.x0 + px, PI.y0 + py, z]

// The Cecilia HAT: standard HAT+ size (65 x 56), 12 mm above the Pi. Its
// sockets line its back edge, above the Pi's power and HDMI sockets.
export const HAT = { z: PI.top + 12, t: 1.6, w: 65, d: 56 }
HAT.top = HAT.z + HAT.t

// The lid sits on stock 25 mm standoffs above the HAT, so the base's height
// follows from the stack: no cut-to-length parts.
CASE.baseH = HAT.top + 25

// Front panel (y = +d/2): kept clean. x in case coordinates; the panel's
// left, seen from the front, is +x.
export const FRONT = {
  // Window for the 1.3" OLED. The module's board is 35.5 x 33.5 with the
  // glass 1 mm above its centre; the board's top stays clear of the lid.
  oled: { x: -42.8, z: 28, w: 31, h: 17 },
  led: { x: -15, z: 28, d: 3.2 }, // status light, beside the screen
  brand: { x: 22, z: 28 }, // the mark and wordmark, engraved
}

// Back panel (y = −d/2). Seen from the back, left to right is +x.
// Lower row: the Pi's own power and screen sockets.
export const BACK = [
  { x: onPi(11.2, 0)[0], z: PI.top + 1.6, w: 12, h: 7.5, label: "USB-C 5V", shape: "slot" },
  { x: onPi(25.8, 0)[0], z: PI.top + 1.5, w: 11, h: 7.5, label: "HDMI 0", shape: "rect" },
  { x: onPi(39.2, 0)[0], z: PI.top + 1.5, w: 11, h: 7.5, label: "HDMI 1", shape: "rect" },
]

// Upper row: the HAT's organ and audio sockets. "above" puts the label over the port.
export const BACK_HAT = [
  { x: onPi(17, 0)[0], z: HAT.top + 10.5, d: 15.8, label: "MIDI IN", din: true, above: true },
  { x: onPi(40, 0)[0], z: HAT.top + 10.5, d: 15.8, label: "MIDI OUT", din: true, above: true },
  { x: onPi(54, 0)[0], z: HAT.top + 2.6, d: 6.2, label: "LINE OUT" },
]

// ON/OFF (to the Pi 5's power-button header) and a recessed RESET pinhole,
// on a small button board behind the free left end of the back panel.
export const BUTTONS = { x: -41, z: 28, w: 26, h: 14 }
export const BACK_CONTROLS = [
  { x: -34, z: BUTTONS.z, d: 6.4, label: "ON/OFF" },
  { x: -48, z: BUTTONS.z, d: 2.2, label: "RESET" },
]

// Right panel (x = +w/2): the Pi's USB and Ethernet. y in case coordinates.
export const RIGHT = [
  { y: onPi(0, 9)[1], z: PI.top + 8, w: 15.5, h: 16.6, label: "USB" },
  { y: onPi(0, 27)[1], z: PI.top + 8, w: 15.5, h: 16.6, label: "USB 3" },
  { y: onPi(0, 45.75)[1], z: PI.top + 6.9, w: 16.2, h: 14, label: "ETHERNET" },
]

// Screw and standoff positions: the Pi's four mounting holes, which the HAT
// and the lid share (one stack of standard M2.5 standoffs).
export const STACK = PI.holes.map(([x, y]) => onPi(x, y))
