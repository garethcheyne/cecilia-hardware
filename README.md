# Cecilia hardware

An all-in-one Cecilia unit. Plug it into the organ, the church network and the
power, and Cecilia is ready on every phone and tablet in the building.

![The Cecilia unit](case/renders/unit-front.png)

It is a standard **Raspberry Pi 5** with the **Cecilia HAT** on top, in a
printed case. The HAT adds MIDI, a line out, a status screen and the controls.
The Pi keeps its own approvals, Wi-Fi included. Anything that fails can be
swapped with a screwdriver.

| | |
| --- | --- |
| Computer | Raspberry Pi 5 (4 GB), any from any shop |
| Organ | MIDI IN and MIDI OUT (5-pin DIN), or USB for organs with a USB port |
| Network | Wi-Fi (the Pi's own, through the plastic case) and Gigabit Ethernet |
| Screens | Two HDMI (micro HDMI), for the console |
| Sound | 3.5 mm line out |
| Status | 1.3-inch OLED: ready, address, what's playing, updates |
| Controls | ON/OFF and a recessed RESET, on the back |
| Power | USB-C, Raspberry Pi 27 W supply |
| Size | 126 × 66 × 51 mm |

The front stays clean: the mark, a status light and the screen.

![Front panel](case/renders/unit-front-panel.png)

Everything you plug in is on the back:

![Back panel](case/renders/unit-back-panel.png)

Lift the lid (four screws) and every part is standard:

![Exploded view](case/renders/unit-exploded.png)

## The status screen

| | |
| --- | --- |
| ![Status](case/renders/oled-status.png) | ![Playing](case/renders/oled-playing.png) |
| ![Network](case/renders/oled-network.png) | ![Update](case/renders/oled-update.png) |

## In this repository

| | |
| --- | --- |
| [docs/SPEC.md](docs/SPEC.md) | The unit and the HAT: block diagram, pins, MIDI and audio circuits, controls, repairs, certification |
| [docs/PCBWAY-ORDER.md](docs/PCBWAY-ORDER.md) | What to order from PCBWay, and the options to choose |
| [bom/hat-bom.csv](bom/hat-bom.csv) | Bill of materials for the HAT and button board, in PCBWay's layout |
| [bom/off-board.csv](bom/off-board.csv) | Everything else in the box: the Pi 5, supply, screen, standoffs, screws |
| [case/](case/) | The case as code: `npm install`, `npm run build` (STL files), `npm run render` (pictures) |
| [docs/future/CM5-CARRIER.md](docs/future/CM5-CARRIER.md) | A later option: a Compute Module 5 carrier board instead of the Pi 5 + HAT |

## Where it's up to

| | |
| --- | --- |
| Specification | Draft, ready for an electronics designer to review |
| Bill of materials | Draft: parts marked CHECK need confirming; final counts come from the schematic |
| Schematic and layout (KiCad) | Not started: a simple 2-layer HAT+ board |
| Case | Designed and rendered; the Pi 5's socket positions need checking against Raspberry Pi's mechanical drawing before printing |
| Cecilia software | To do: serial MIDI on the HAT's UART, the OLED status service, the RESET button |
| Certification | EMC test of the finished unit before selling (see the spec) |

Until then, Cecilia runs on an ordinary Raspberry Pi 4 or 5 with a USB MIDI
interface: see [cecilia-pi](https://github.com/garethcheyne/cecilia-pi).

## Licence

Hardware design (boards, case, drawings): CERN-OHL-P v2, in
[LICENSE-HARDWARE](LICENSE-HARDWARE). Code (the case scripts): MIT, in
[LICENSE-CODE](LICENSE-CODE). The case uses Instrument Sans (SIL Open Font
License, `case/fonts/OFL.txt`).
