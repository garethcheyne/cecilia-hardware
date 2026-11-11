# Cecilia unit: carrier board specification

An all-in-one Cecilia box: a Raspberry Pi Compute Module 5 on a carrier board
that adds everything an organ needs, in the Cecilia case. This document is the
brief for the schematic and layout. It must be reviewed by an electronics
designer before any board is ordered.

## What the unit does

- Runs Cecilia (the Cecilia Raspberry Pi image, on the CM5's eMMC).
- Connects to the organ by **MIDI IN and MIDI OUT** (5-pin DIN), or by **USB**
  for organs with a USB port.
- Joins the church network by **Wi-Fi** or **Ethernet**, so phones and tablets
  can open it.
- Drives **one or two screens** at the console (HDMI), for the Service page
  and the music.
- Plays the simulator and spoken prompts through a **line out**.
- Powers from one **USB-C** supply (the Raspberry Pi 27 W supply).

## Block diagram

```
 USB-C 5 V/5 A ──▶ PD sink (STUSB4500) ──▶ 5 V rail ──┬─▶ CM5 VIN
                                                      ├─▶ USB-A power switch (TPS2553) ─▶ USB-A
                                                      └─▶ 3.3 V LDO ─▶ RP2040, DAC, MIDI
 CM5 ── Gigabit PHY ─────────────────────────▶ RJ45 MagJack
 CM5 ── HDMI0, HDMI1 ─▶ TPD12S016 ×2 ─────────▶ HDMI ×2
 CM5 ── USB 3.0 ─▶ TPD4EUSB30 ────────────────▶ USB-A (organs with USB)
 CM5 ── USB 2.0 ─▶ RP2040 (USB MIDI device) ──▶ MIDI OUT (buffer, 33 Ω/10 Ω) ─▶ DIN
                                              ◀─ MIDI IN (H11L1 optocoupler) ◀─ DIN
 CM5 ── I2S ─────▶ PCM5102A ──────────────────▶ 3.5 mm line out
 CM5 ── GPIO ────▶ RGB status LED, power button (PWR_BUT), fan (optional)
 CM5 ── VBAT ────◀ RTC battery (JST SH)
 CM5 ── U.FL ────▶ antenna cable ─▶ SMA bulkhead (back panel)
```

## Why an RP2040 for MIDI

The RP2040 runs a small TinyUSB firmware and appears to the CM5 as a standard
(class-compliant) USB MIDI device with one input and one output. Cecilia then
needs no changes: it sees the box's MIDI sockets exactly as it sees a Roland
UM-ONE. The same firmware works if the board is ever used with another
computer. (The alternative, the CM5's UART at 31 250 baud, needs a serial-MIDI
driver in Cecilia and is less robust.)

Firmware tasks: USB MIDI 1 in / 1 out; status LED colours on request from
Cecilia (vendor-specific SysEx); bootloader entry by holding BOOTSEL.

## Power

| | |
| --- | --- |
| Input | USB-C, USB Power Delivery: request **5 V, 5 A** (the CM5 accepts 5 V only) |
| PD controller | STUSB4500 with its NVM set to PDO1 5 V 5 A; falls back to 5 V 3 A, and Cecilia warns when only 3 A is available |
| Protection | TVS and resettable fuse on VBUS; reverse-current protection through Q1 |
| USB-A | Current-limited to 1.2 A (TPS2553) |
| 3.3 V | AP2112K for the RP2040, DAC and MIDI circuits (the CM5's own 3.3 V output is not loaded) |

## MIDI circuits (MIDI 1.0 electrical specification, 3.3 V)

- **MIDI IN:** DIN pin 4 through 220 Ω to the H11L1's LED anode; pin 5 to its
  cathode; 1N4148 reverse across the LED. Output open-collector with 470 Ω
  pull-up to 3.3 V, to an RP2040 UART RX. Pin 2 not connected (isolation).
- **MIDI OUT:** RP2040 UART TX through a 74LVC1G125 buffer and 10 Ω to DIN
  pin 5; pin 4 to 3.3 V through 33 Ω; pin 2 to ground; ferrite beads on pins
  4 and 5.

## Connector layout (matches the case)

Positions are the centre of each connector, from the board's left edge as seen
looking at that panel; heights are above the board's top face. The case model
(`case/build-case.mjs`, `PORTS`) uses the same numbers; change both together.

**Back panel**, left to right: POWER (USB-C), ETHERNET (RJ45), HDMI 1, HDMI 2,
USB (USB-A), WI-FI (SMA bulkhead).

**Front panel**, left to right: MIDI IN, MIDI OUT, LINE OUT, button, status
light.

| Board | |
| --- | --- |
| Size | 124 × 94 mm |
| Mounting | 4 × M2.5 holes, 4 mm in from each corner |
| Layers | 4 (signal / ground / power / signal) |
| Impedance | 90 Ω differential (USB), 100 Ω differential (HDMI, Ethernet) |
| Reference | The Raspberry Pi CM5 IO Board's published design files: CM5 connector pinout, power sequencing, HDMI and Ethernet layout |

## Case

`case/` holds the case as code (`npm run build` makes the STL files;
`npm run render` makes the pictures). 132 × 102 × 37 mm, base tray and lid:

- the Cecilia mark and wordmark engraved in the lid;
- port labels engraved on both panels;
- side vents shaped like the mark's organ pipes;
- screws hidden underneath (M3 into the lid's bosses);
- recesses for rubber feet.

## Certification

Before selling: electrical safety and EMC testing for each market (RCM for
New Zealand and Australia; CE or UKCA; FCC). Using the CM5's certified radio
with Raspberry Pi's own antenna kit keeps the wireless approvals; the finished
unit still needs testing.

## Open questions for the designer

- Confirm every part marked CHECK in `bom/carrier-bom.csv`.
- Q1 and F1 ratings at 5 A continuous.
- Whether a fan is ever needed (the CM5 cooler is passive; the vents should
  be enough at the expected load).
- Second MIDI IN, for consoles that send stops and notes separately.
