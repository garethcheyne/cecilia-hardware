# Ordering from PCBWay

Two orders: the Cecilia HAT and its button board (made and assembled), and the
case. The Raspberry Pi 5, its power supply, the OLED module and the screws are
bought separately ([bom/off-board.csv](../bom/off-board.csv)).

## 1. HAT and button board (PCB + assembly)

Both boards go on one panel, and are snapped apart after assembly.

### What PCBWay needs

| File | Where it comes from | Status |
| --- | --- | --- |
| Gerber and drill files | The KiCad layout | To do: needs the schematic and layout |
| Pick-and-place (CPL / centroid) file | The KiCad layout | To do |
| Bill of materials | [bom/hat-bom.csv](../bom/hat-bom.csv) (PCBWay's column layout) | Draft: final counts and designators come from the schematic |
| Assembly drawing | The KiCad layout | To do |

### Board options

| Option | Choose |
| --- | --- |
| Size | HAT 65 × 56 mm and button board 26 × 14 mm, panelised with V-cuts or mouse bites |
| Quantity | 5 panels for the first prototypes |
| Layers | 2 |
| Material | FR-4, TG150 |
| Thickness | 1.6 mm |
| Min track / spacing | 0.15 mm / 0.15 mm (6 mil) |
| Min hole | 0.3 mm |
| Impedance control | No |
| Surface finish | HASL lead-free (ENIG if the price difference is small) |
| Solder mask | Matt black |
| Silkscreen | White |
| Copper | 1 oz |

### Assembly options

| Option | Choose |
| --- | --- |
| Service | Turnkey (PCBWay sources parts) |
| Sides | Top side SMT, plus through-hole (40-pin header, DIN sockets, jack) |
| Quantity | 5 |
| Consigned | None |

### Notes to put on the order

- The 40-pin header (J1) goes on the **underside** of the HAT; everything else
  on top.
- The HAT+ EEPROM (U1) is programmed after assembly; we do this.

## 2. Case

Plastic, not metal: the Pi's own Wi-Fi has to get out. Four parts, made by
`npm run build` in [case/](../case/):

| File | Part |
| --- | --- |
| `case/out/case-base.stl` | Base tray |
| `case/out/case-lid.stl` | Lid |
| `case/out/case-window.stl` | Smoked window for the OLED (or cut it from 1 mm smoked acrylic) |
| `case/out/case-labels.stl` | Not printed: the shape of the white label fill, for reference |

Sizes are in `case/out/dimensions.json`.

### Prototypes: 3D printed

| Option | Choose |
| --- | --- |
| Process | MJF (HP Multi Jet Fusion) |
| Material | PA12 nylon, dyed black |
| Finish | Bead-blasted |
| Inserts | M2.5 heat-set inserts in the four bosses under the Pi (we fit these) |
| Quantity | 2 sets |

SLA in a tough resin is an alternative with a smoother finish. The engraved
mark and labels print as recesses; fill them with white paint (or ask PCBWay
for UV printing on the panels).

### Production: injection moulding

At a few hundred units, injection moulding becomes cheaper per case than
printing. Moulding needs a tooling quote from PCBWay, and the design needs:

- draft angles on every wall (about 1°);
- even wall thickness (2–2.5 mm);
- the bosses joined to the walls by ribs, not solid;
- the labels as raised pad-print areas, or printed after moulding, rather
  than engraved.

| Option | Choose |
| --- | --- |
| Material | PC/ABS, black, matt texture (e.g. MT-11010) |
| Marking | Pad print or UV print the mark and labels in white |
| Quantity | Quote 250, 500 and 1000 |

PCBWay will want STEP files for moulding: model the case in Fusion or FreeCAD
from `case/out/dimensions.json`, using the STL files as the reference.
