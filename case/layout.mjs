// Where everything sits in the Cecilia unit, shared by the case, the models
// of the parts inside and the renders. Millimetres.
//
// A flat box: a Raspberry Pi 5 (with room for a Raspberry Pi DAC+ on top), the
// Cecilia I/O board (MIDI) and a wide OLED. Every socket and control is on
// the back; the front has only the display.
//
// Case coordinates: x left to right as seen from the BACK (so the front's
// left is +x), y from back (−) to front (+), z up from the bottom.
//
// The Pi 5's connector positions follow Raspberry Pi's mechanical drawing as
// best known here, and the panel-mount parts are typical sizes: everything
// marked CHECK must be measured against the real part before ordering a case.

export const CASE = { w: 220, d: 150, h: 42, wall: 2.4, floor: 2.4, lidH: 3.2, r: 8 }
CASE.baseH = CASE.h - CASE.lidH // base tray, floor to rim (the lid's underside)
export const IN = { w: CASE.w - 2 * CASE.wall, d: CASE.d - 2 * CASE.wall }
const backIn = -CASE.d / 2 + CASE.wall // inside face of the back wall
const frontIn = CASE.d / 2 - CASE.wall // inside face of the front wall
export const FACES = { backIn, frontIn }

// The Raspberry Pi 5, turned so its USB and Ethernet come straight through the
// back wall. Its power and micro HDMI edge faces left (seen from the back);
// short panel-mount cables bring those to the back panel.
export const PI = {
  w: 85,
  d: 56,
  t: 1.6,
  z: CASE.floor + 3, // underside of the board, on 3 mm bosses
  x0: -13, // case x of the Pi's power/HDMI edge
  edgeY: backIn + 2.5, // case y of the Pi's USB/Ethernet edge (its sockets reach the wall)
  holes: [
    [3.5, 3.5],
    [61.5, 3.5],
    [3.5, 52.5],
    [61.5, 52.5],
  ],
}
PI.top = PI.z + PI.t
/** A point on the Pi in case coordinates. px runs along the Pi's long edge
 * (85 = the USB/Ethernet end), py across it (0 = the power/HDMI edge). */
export const onPi = (px, py, z = PI.top) => [PI.x0 + py, PI.edgeY + (PI.w - px), z]
export const PI_HOLES = PI.holes.map(([px, py]) => onPi(px, py))

// The optional Raspberry Pi DAC+ (65 x 58 mm) on the Pi's header: about
// 31 mm tall fitted, from the Pi's underside to the top of its phono sockets.
// Its phono sockets are drawn on the edge away from the header (CHECK).
export const DAC = { z: PI.top + 11.5, t: 1.6, w: 65, d: 58, top: PI.z + 31 }
DAC.boardTop = DAC.z + DAC.t

// The Cecilia I/O board: MIDI IN and OUT, the display and button connections.
// Flat on the floor at the back right, joined to the Pi's GPIO (or the DAC+'s
// pass-through header) by a short 40-way ribbon.
export const IO = { x0: 49, x1: 97, y0: backIn + 1, y1: backIn + 86, z: CASE.floor + 3, t: 1.6 }
IO.top = IO.z + IO.t

// Back panel (y = −d/2). Seen from the back, left to right is +x. Two label
// lines: above the upper row, below the lower row.
const UPPER = 24.5
const LOWER = 12
export const LABEL_Z = { above: 33.2, below: 4.4 }
export const BACK = [
  // Power and controls
  { x: -91, z: UPPER, d: 12.2, shape: "round", label: "ON/OFF", at: "above", part: "onoff" },
  { x: -78, z: UPPER, d: 7.2, shape: "round", label: "RESET", at: "above", part: "reset" },
  { x: -84, z: LOWER, w: 12.6, h: 6.4, shape: "slot", label: "USB-C 5V", at: "below", part: "usbc", screws: 10 },
  // Screens (micro HDMI to HDMI panel-mount cables)
  { x: -52, z: UPPER, w: 16, h: 7, shape: "rect", label: "HDMI 1", at: "above", part: "hdmi", screws: 13 },
  { x: -52, z: LOWER, w: 16, h: 7, shape: "rect", label: "HDMI 2", at: "below", part: "hdmi", screws: 13 },
  // Audio from the optional DAC+ (through-panel phono couplers)
  { x: -26, z: UPPER, d: 8.2, shape: "round", label: "AUDIO L", at: "above", part: "rca" },
  { x: -26, z: LOWER, d: 8.2, shape: "round", label: "AUDIO R", at: "below", part: "rca" },
  // The Pi's own sockets
  { x: onPi(0, 9)[0], z: PI.top + 8, w: 15.5, h: 16.6, shape: "rect", label: "USB", at: "above" },
  { x: onPi(0, 27)[0], z: PI.top + 8, w: 15.5, h: 16.6, shape: "rect", label: "USB 3", at: "above" },
  { x: onPi(0, 45.75)[0], z: PI.top + 6.9, w: 16.2, h: 14, shape: "rect", label: "ETHERNET", at: "above" },
  // The organ (on the I/O board)
  { x: 61, z: IO.top + 10.5, d: 15.8, shape: "round", label: "MIDI IN", at: "above", part: "din" },
  { x: 85, z: IO.top + 10.5, d: 15.8, shape: "round", label: "MIDI OUT", at: "above", part: "din" },
]

// Front panel (y = +d/2): only the display. A 3.12" 256 x 64 OLED (SSD1322):
// active area 76.8 x 19.2 mm; module outline varies by maker (CHECK).
export const FRONT = {
  oled: { x: 0, z: (CASE.floor + CASE.baseH) / 2, w: 80, h: 22.4, active: [76.8, 19.2] },
}
export const OLED_MODULE = { pcb: [100, 31], glass: [88, 27.8], holes: [47, 12.5] }

// Corner pillars for the lid's four screws (M3 into heat-set inserts).
export const PILLARS = [-1, 1].flatMap((sx) => [-1, 1].map((sy) => [sx * (CASE.w / 2 - 7), sy * (CASE.d / 2 - 7)]))
