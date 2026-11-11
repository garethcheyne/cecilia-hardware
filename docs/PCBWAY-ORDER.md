# Ordering from PCBWay

Two orders: the carrier board (made and assembled), and the case.

## 1. Carrier board (PCB + assembly)

### What PCBWay needs

| File | Where it comes from | Status |
| --- | --- | --- |
| Gerber and drill files | The KiCad layout | To do: needs the schematic and layout |
| Pick-and-place (CPL / centroid) file | The KiCad layout | To do |
| Bill of materials | `bom/carrier-bom.csv` (PCBWay's column layout) | Draft: final counts and designators come from the schematic |
| Assembly drawing (top and bottom) | The KiCad layout | To do |
| Notes | This page | |

### Board options to choose on the order form

| Option | Choose |
| --- | --- |
| Size | 124 × 94 mm |
| Quantity | 5 for the first prototypes |
| Layers | 4 |
| Material | FR-4, TG170 |
| Thickness | 1.6 mm |
| Min track / spacing | 0.1 mm / 0.1 mm (4 mil) |
| Min hole | 0.2 mm |
| Impedance control | Yes: 90 Ω and 100 Ω differential (stack-up from PCBWay) |
| Surface finish | ENIG (flat pads for the 0.4 mm CM5 connectors) |
| Solder mask | Matt black |
| Silkscreen | White |
| Copper | 1 oz outer, 0.5 oz inner |

### Assembly options

| Option | Choose |
| --- | --- |
| Service | Turnkey (PCBWay sources parts) |
| Sides | Top side SMT, plus through-hole (DIN, RJ45, USB-A, jack, switch) |
| Quantity | 5 |
| Inspection | X-ray for the QFN parts (RP2040, STUSB4500) and the CM5 connectors |
| Not fitted | J12 (fan) unless requested |
| Consigned | None (the CM5, cooler, antenna and battery are fitted by us, see `bom/off-board.csv`) |

### Notes to put on the order

- The two 100-pin connectors (J2, J3) take a Raspberry Pi Compute Module 5;
  the module is not part of this order.
- U1 (STUSB4500) needs its NVM programming after assembly; we do this.
- U7 (RP2040) is programmed over USB after assembly; we do this.

## 2. Case

Two parts: `case/out/case-base.stl` and `case/out/case-lid.stl`
(`npm run build` in `case/`). Sizes are in `case/out/dimensions.json`.

### Prototypes: 3D printed

| Option | Choose |
| --- | --- |
| Process | MJF (HP Multi Jet Fusion) |
| Material | PA12 nylon, dyed black |
| Finish | Bead-blasted |
| Inserts | M3 heat-set inserts into the lid's four bosses (we fit these) |
| Quantity | 2 sets |

The engraved mark and labels print as recesses; a white paint-fill makes them
stand out.

### Production: CNC aluminium

| Option | Choose |
| --- | --- |
| Process | CNC milling |
| Material | Aluminium 6061-T6 |
| Finish | Bead-blast, then black or graphite anodise (Type II) |
| Marking | Laser-engrave the mark, wordmark and port labels after anodising (they come out bright silver, as in the renders) |
| Threads | M3 tapped in the lid's four bosses |
| Quantity | 5 (quote 50 and 100 as well) |

For CNC, PCBWay prefers STEP files: import the STL into Fusion or FreeCAD and
export STEP, or have the case modelled in CAD from `case/out/dimensions.json`.
Anodised aluminium blocks radio, which is why the Wi-Fi antenna is external.
