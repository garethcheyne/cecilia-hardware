# Cecilia unit: specification

An all-in-one Cecilia box. A standard **Raspberry Pi 5** does the computing.
The **Cecilia HAT** sits on top and adds what an organ needs: MIDI sockets, a
line out, a status screen and the controls. Both go in a printed plastic case.
This document is the brief for the HAT's schematic and layout. An electronics
designer must review it before any board is ordered.

![Exploded view](../case/renders/unit-exploded.png)

## Why a Pi 5 and a HAT

- **Approvals carry over.** The Pi 5 is already tested and certified, radio
  included, and nothing changes its Wi-Fi or its antenna. The HAT has no
  radio, no mains and no fast signals beyond I2S (audio, about 3 MHz), so
  the product's own EMC testing should be short. It still needs that testing
  before it is sold: see [Certification](#certification).
- **Repairable.** Every part is standard and swaps with a screwdriver: the
  Pi, the HAT, the screen, the microSD card and the power supply. A failed Pi
  is replaced by any Pi 5 from any shop, with the same card moved across.
- **Small first order.** The HAT is a simple 2-layer board. No 0.4 mm
  connectors and no impedance control.

## What the unit does

- Runs Cecilia from the Cecilia Raspberry Pi image on a microSD card.
- Connects to the organ by **MIDI IN and MIDI OUT** (5-pin DIN on the back),
  or by **USB** for organs with a USB port (the Pi's own USB sockets).
- Joins the church network by **Wi-Fi** (the Pi's own) or **Ethernet**.
- Drives **one or two screens** at the console from the Pi's micro HDMI
  sockets, for the Service page and the music.
- Plays the simulator and spoken prompts through a **line out**.
- Shows its **status, address and what's playing** on a small OLED screen.
- Powers from the **Raspberry Pi 27 W USB-C supply**, straight into the Pi.

## Panels

| Panel | Left to right |
| --- | --- |
| Front | The Cecilia mark · status light · OLED screen. Nothing to plug in: the front stays clean |
| Back, upper row | RESET (recessed pinhole) · ON/OFF · MIDI IN · MIDI OUT · LINE OUT |
| Back, lower row | USB-C 5V (power) · HDMI 0 · HDMI 1 |
| Right side | USB (2.0 pair) · USB 3 (pair) · ETHERNET |
| Left side | Vents shaped like organ pipes (and slots in the floor) |

The panel cut-outs come from the case model ([case/layout.mjs](../case/layout.mjs)).
The positions of the Pi's sockets there are marked CHECK. Confirm them against
Raspberry Pi's current *Raspberry Pi 5 mechanical drawing* before ordering a case.

## Block diagram

```
 USB-C 27 W supply ─▶ Raspberry Pi 5 ─┬─ 40-pin header ─▶ Cecilia HAT
                                      ├─ micro HDMI ×2 ─▶ back panel
                                      ├─ USB ×4, Ethernet ─▶ right side
                                      └─ J2 power-button header ◀─ ON/OFF (button board)

 Cecilia HAT (on the 40-pin header)
   GPIO14 (UART0 TX) ─▶ 74LVC1G125 ─▶ 10 Ω / 33 Ω ─▶ MIDI OUT (DIN)
   GPIO15 (UART0 RX) ◀─ H11L1 optocoupler ◀─ 220 Ω ◀─ MIDI IN (DIN)
   GPIO18/19/21 (I2S) ─▶ PCM5102A ─▶ RC filter ─▶ LINE OUT (3.5 mm)
   GPIO2/3 (I2C1) ─▶ 4-pin JST SH ─▶ 1.3" OLED module (front, behind a window)
   GPIO13 ─▶ status light (3 mm LED, front)
   GPIO26 ◀─ RESET (button board)
   4-pin JST SH ─▶ button board (ON/OFF to the Pi's J2, RESET to GPIO26)
   GPIO0/1 (ID) ─▶ HAT+ EEPROM (identifies the HAT, loads its settings)
   5 V ─▶ AP2112K 3.3 V LDO ─▶ DAC and MIDI (a quiet supply for the audio)
```

## Pins used

| Pin | Use | Notes |
| --- | --- | --- |
| GPIO0, GPIO1 | HAT+ EEPROM (ID_SD, ID_SC) | Required by the HAT+ specification |
| GPIO2, GPIO3 | I2C1 to the OLED | The Pi has its own pull-ups on these |
| GPIO14, GPIO15 | UART0: MIDI OUT, MIDI IN | 31 250 baud |
| GPIO18, GPIO19, GPIO21 | I2S: bit clock, word clock, data to the DAC | The standard `hifiberry-dac` layout |
| GPIO13 | Status light | PWM, so the light can breathe or blink |
| GPIO26 | RESET switch | Internal pull-up; switch to ground |

## MIDI (MIDI 1.0 electrical specification, 3.3 V)

- **MIDI IN:** DIN pin 4 through 220 Ω to the H11L1's LED anode, and pin 5 to
  its cathode, with a 1N4148 across the LED in reverse. The output is open
  collector with a 470 Ω pull-up to 3.3 V, into GPIO15. Pin 2 is not
  connected (isolation).
- **MIDI OUT:** GPIO14 through a 74LVC1G125 buffer and 10 Ω to DIN pin 5.
  Pin 4 goes to 3.3 V through 33 Ω, and pin 2 to ground. There are ferrite
  beads on pins 4 and 5.
- **Software:** Cecilia reads and writes `/dev/ttyAMA0` at 31 250 baud. That
  needs a small serial-MIDI input added to Cecilia (to do). Linux sets the
  non-standard rate directly. CHECK that `dtparam=uart0=on` is the right
  Pi 5 setting for GPIO14/15.

## Audio

PCM5102A on I2S, with its own 3.3 V LDO. The output goes through 470 Ω and
2.2 nF to the 3.5 mm jack. The Pi needs `dtoverlay=hifiberry-dac`, which is
standard and works on the Pi 5. The HAT+ EEPROM can carry this setting, so the
image needs no manual setup (CHECK in the HAT+ specification).

## Status screen

A 1.3-inch 128 × 64 OLED module (SH1106, I2C, address 0x3C). It sits behind a
smoked window in the front panel, on four printed bosses, and connects to the
HAT by a 4-wire JST SH cable (3.3 V, ground, SDA, SCL).

Cecilia drives it through `/dev/i2c-1` (a display service, to do). The pages
cycle by themselves:

| Page | Shows |
| --- | --- |
| Status | Ready / Playing / Recording; `cecilia.local` and the IP address |
| Playing | The piece, the verse, and progress |
| Network | Wi-Fi name, address, whether Ethernet is connected |
| Update | "Updating to 0.2.0", with progress (from the self-updater) |

Pictures of each page are in [case/renders/](../case/renders/) (`oled-*.png`).

## Controls (back panel)

| Control | What it does |
| --- | --- |
| **ON/OFF** | Wired to the Pi 5's own power-button header (J2). Press once to turn on; press again for a safe shutdown; hold to force off. The Pi 5's firmware and Raspberry Pi OS handle all of this. (CHECK the J2 position and connector against the Pi 5 documentation.) |
| **RESET** (pinhole, use a paperclip) | Short press: restart Cecilia. Hold for 10 seconds: put the network settings back to defaults, so a unit moved to a new church can be set up again. Recessed so it can't be pressed by accident. |

Both sit on a small **button board** (26 × 14 mm, two tactile switches),
screwed to two bosses behind the back panel's left end. A 4-wire lead joins it
to the HAT. A printed cap on ON/OFF reaches through the back wall; RESET sits
behind a 2.2 mm hole.

## Power

The Pi 5 takes the Raspberry Pi 27 W USB-C supply (5.1 V, 5 A) directly. The
HAT draws less than 100 mA from the Pi's 5 V and 3.3 V pins. With the 27 W
supply, the Pi gives its USB sockets the full 1.6 A, enough for an organ's
USB-MIDI port.

## Repairing the unit

1. Unplug everything, then remove the four lid screws (M2.5, countersunk).
   They go straight into the standoffs, so the lid lifts off.
2. Unplug the OLED, status-light and button-board cables from the HAT.
3. Unscrew the four upper standoffs. The HAT lifts straight off the 40-pin
   header.
4. Unscrew the four lower standoffs. The Pi lifts out.
5. Move the microSD card to the replacement Pi 5 (or flash a new card with
   Raspberry Pi Imager: Cecilia is in the list). Rebuild in reverse.

The screen and the button board each come out with their own screws. Nothing
is glued.

## Case

[case/](../case/) holds the case as code: `npm run build` makes the STL files
and `npm run render` makes the pictures. It measures 126 × 66 × 51 mm, with a
base tray and a lid:

- **Plastic, not metal,** so the Pi's own Wi-Fi works through it with no
  external antenna.
- The Cecilia mark and wordmark are engraved in the lid and on the front, and
  the port labels on the other panels (white fill).
- Vents in the left wall are shaped like the mark's organ pipes, with slots in
  the floor under the Pi.
- The lid screws into the standoff stack: one set of screws holds everything.
- The height comes from stock parts: 12 mm standoffs from the Pi to the HAT,
  and 25 mm from the HAT to the lid.
- There are recesses for rubber feet.

## Board

| | |
| --- | --- |
| Size | 65 × 56 mm, the standard HAT+ size; the DIN sockets and jack sit on its back edge, above the Pi's HDMI sockets |
| Mounting | 4 × M2.5 on the Pi's hole pattern (58 × 49 mm) |
| Layers | 2 |
| Header | 2 × 20 female, raised to suit the 12 mm stack (CHECK the height) |
| Cooling | The Pi's heatsink sits under the HAT. Keep the HAT's underside clear above the SoC |

## Certification

Raspberry Pi's approvals cover the Pi 5 itself, radio included, and this
design changes nothing about its radio or antenna. The finished product
(Pi + HAT + case + supply) is still a product, and before it is sold it
generally needs:

- **EMC testing of the complete unit** (unintentional emissions). For New
  Zealand and Australia that is RCM; Europe and the UK need CE/UKCA; the US
  needs FCC Part 15B. The HAT is simple and slow, so this should be a short,
  low-risk test.
- **Electrical safety:** covered by using Raspberry Pi's own certified power
  supply and nothing mains-powered inside.

Raspberry Pi's *Powered by Raspberry Pi* programme and its compliance guidance
are worth reading first. Selling the HAT and case as a kit, with the customer
supplying the Pi, changes the paperwork. That is a question for the test lab.

## Open questions for the designer

- Confirm every part marked CHECK in [bom/hat-bom.csv](../bom/hat-bom.csv).
- The DIN sockets' height on the HAT, so they line up with the back-panel
  holes (the case expects their centres 10.5 mm above the HAT).
- The header height for a 12 mm stack, and clearance over the Pi's heatsink.
- The ON/OFF wiring to the Pi 5's J2 header (through the HAT, from the
  button board).
- Whether the HAT+ EEPROM can load `hifiberry-dac`, `uart0` and I2C settings
  by itself.
- A second MIDI IN, for consoles that send stops and notes separately (UART2
  on GPIO4/5 is free).
