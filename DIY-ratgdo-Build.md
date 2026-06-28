# Build Your Own ratgdo (DIY) — for a myQ / Security+ 2.0 Opener

**Goal:** Build, from parts, a Wi‑Fi board that controls your garage opener locally — the open‑source **ratgdo** — then feed it into Home Assistant so your **iPhone's location** opens/closes the door **clicklessly**. Total parts cost ≈ **$10–15** if you have an ESP32 already, ~$20 if not.

> ⚠️ **Your opener is Security+ 2.0** (myQ, **yellow** learn button). That is **not** a "short two wires" opener — Sec+2.0 talks an **encrypted single‑wire serial protocol** on the red control terminal. A plain relay will *not* work. The DIY ratgdo emulates the wall‑panel serial bus, which is the whole trick. Good news: over that bus you also get **door state, obstruction, light, and lock** for free — no separate reed sensor needed.

> 🔌 **Safety:** everything here is **low voltage** (12 V from the opener, 3.3 V on the ESP). You never touch mains. But you are connecting to your opener's logic board — work with it unplugged when wiring, and double‑check polarity. This is an intermediate electronics build; if a soldering iron isn't your thing, a pre‑made ratgdo is ~$30.

---

## How the Security+ 2.0 wire actually works (so the circuit makes sense)
- The opener's control terminals are **2 wires**: **GND (white)** and a **combined +12 V & serial‑data line (red)**.
- The red line **idles at ~12 V**. To send a bit, a device **pulls it down to GND**. It's **half‑duplex single‑wire** — both ends share the one wire.
- So our board needs to do two things on that one red wire:
  1. **Transmit** = momentarily yank 12 V → GND (an **N‑MOSFET** acting as an open‑drain pulldown).
  2. **Receive** = sense whether the line is high/low, but step **12 V down to 3.3 V** so the ESP survives (a second **N‑MOSFET** as an inverting level‑shifter).
- The firmware runs the UART **inverted** to match this MOSFET inversion — you don't have to think about it, just set `invert: true` (the ratgdo config already does).

---

## Bill of materials

| Qty | Part | Notes |
|----|------|-------|
| 1 | **ESP32 "D1 Mini" (LOLIN/WeMos) board** | Use this exact form factor so the published pin map matches. Any ESP32 works if you remap pins. |
| 1 | **2N7000** N‑channel MOSFET | the **RX** (receive) device |
| 1 | **AO3400A** logic‑level N‑MOSFET (on a SOT‑23→DIP adapter) | the **TX** (transmit) device. *You can try a 2N7000 here too, but 3.3 V may not fully switch it — AO3400A is reliable.* |
| 3 | **10 kΩ** resistors | pull‑up / gate resistors (see schematic) |
| 1 | **3‑position screw terminal** | to land the opener's red/white wires |
| — | red / white / black hookup wire, perfboard or breadboard, solder | |
| 1 | **USB 5 V supply** for the ESP (phone charger) *or* a **12 V→5 V buck (MP1584)** if powering from the opener | simplest: just power the ESP by USB and share ground with the opener |
| 1 | small **project enclosure** | optional, keeps it tidy by the motor unit |

---

## The circuit

Single red control wire shared by TX (pulldown) and RX (sense). ASCII view:

```
                         +3.3V (from ESP)
                           │
                          [10k]   ← RX pull-up
                           │
   ESP RX  ────────────────┴───────────●  drain
   (D2 / GPIO21)                        │
                                    2N7000 (RX)
   RED control ──[10k]──┬──────────────●  gate
   wire (~12V idle)     │
                       [10k]            ●  source ── GND
                        │                        │
                       GND ─────────────────────┘


   ESP TX  ───────────────────────────●  gate
   (GPIO16)                             │
                                   AO3400A (TX)
   RED control ───────────────────────●  drain
   wire                                 │
                                        ●  source ── GND

   WHITE opener terminal ── GND (common with ESP GND)
```

**The official BOM is exactly 3× 10 kΩ — and all three live in the RX path.** The TX MOSFET gate connects **straight to GPIO16** (no resistor):
- **TX (AO3400A):** GPIO16 → gate; drain → red line; source → GND. ESP drives gate high → MOSFET pulls the 12 V line to GND = sending a bit. Idle (gate low) releases the line to 12 V. *(Optional: if the door twitches at ESP power‑up, add a 4th 10k gate‑to‑GND pulldown — this is beyond the official 3‑resistor BOM.)*
- **RX (2N7000) — where all 3× 10k go:** red line → **R1 (10k) series** → gate; **R2 (10k)** gate → GND (the series+pulldown divider keeps the gate safe, not the full 12 V); drain → ESP RX (GPIO21) with **R3 (10k) pull‑up to 3.3 V**; source → GND. Line at 12 V → MOSFET on → RX reads LOW; line pulled down → MOSFET off → RX reads HIGH. (Inverted — the firmware's UART runs inverted to match.)
- **Grounds must be common:** ESP GND ↔ opener **white** terminal. Without a shared ground nothing works.

> 📐 **The authoritative drawing** is `kicad_files/D1 Mini - ESP32` in the **Kaldek/rat‑ratgdo** repo (link in Sources) — open the KiCad/PNG and match resistor placement to it. The topology and 3×10k roles above follow that design.

---

## ESP32 pin map — use the **v2.0** install

> ⚠️ **Critical:** for **any ESP32 board, flash the ratgdo _v2.0_ install (not v2.5).** Per the project's own board notes, these are the **actual ESP32 GPIO pins for v2.0 regardless of which ESP32 board you use** — only the silkscreen labels differ:

| Function | **ESP32 GPIO (v2.0)** | Needed for Sec+2.0? |
|---|---|---|
| UART **TX** (to opener) | **GPIO16** | ✅ yes |
| UART **RX** (from opener) | **GPIO21** | ✅ yes |
| Obstruction input | **GPIO23** | optional (state also comes over the protocol) |

That's the whole wiring for Security+ 2.0: **GPIO16 (TX)** and **GPIO21 (RX)** into the red‑wire circuit, plus common **GND**. (Dry‑contact open/close/light pins exist only for non‑Chamberlain "dumb" openers and stay unused here.)

- On an **ESP32 D1 Mini**, GPIO16/21/23 are the inner‑row pins (the outer row isn't used).
- On an **ESP‑WROOM‑32 DevKit**, use the pins literally labeled **GPIO16 / GPIO21 / GPIO23**.

---

## Assembly steps
1. **Unplug the garage opener.**
2. Build the TX and RX MOSFET circuits on perfboard/breadboard per the schematic; bring out 3 leads: **RED**, **WHITE/GND**, and (shared) **ESP GND**.
3. Connect **ESP GPIO16 → TX gate**, **ESP GPIO21 → RX drain node**, **ESP 3.3V → RX pull‑up (R3)**, **ESP GND → circuit GND**.
4. Land the opener side on the screw terminal: **RED → opener red terminal**, **WHITE → opener white terminal** (same terminals the wired wall button uses; you can piggy‑back alongside it).
5. Power the ESP (USB charger is simplest). Tidy into the enclosure near the motor unit.

---

## Flash the firmware (no coding required)
1. On a computer with **Chrome/Edge**, go to the **ESPHome ratgdo web installer** (`ratgdo.github.io/esphome-ratgdo`).
2. Plug the ESP32 in via USB → **Connect** → choose the **ESP32 _v2.0_ install** (per the caveat above — *not* v2.5 for ESP32) → flash.
3. Join its Wi‑Fi hotspot, enter your home Wi‑Fi credentials.
4. Pick the door type **Security+ 2.0** in the board's web UI. Test **Open/Close** from that page — confirm the door responds and shows correct **state**.

*(Alternative: add the board in the ESPHome dashboard using the ratgdo v2.0 ESP32 package and your own Wi‑Fi/API secrets — same result, more control.)*

---

## Tie it to your iPhone (the clickless part)
1. In **Home Assistant**, the board auto‑discovers as **ESPHome** → you get a `cover.garage_door` entity (plus door/obstruction sensors).
2. Install the **Home Assistant Companion app** on your iPhone → enable location → **Always + Precise**. This creates `device_tracker.your_iphone`.
3. Set your **Home zone radius to ~400 m (0.25 mi)** and add the two zone automations:

```yaml
# Open as you arrive
trigger:
  - platform: zone
    entity_id: device_tracker.your_iphone
    zone: zone.home
    event: enter
action:
  - service: cover.open_cover
    target: { entity_id: cover.garage_door }

# Close as you leave
trigger:
  - platform: zone
    entity_id: device_tracker.your_iphone
    zone: zone.home
    event: leave
action:
  - service: cover.close_cover
    target: { entity_id: cover.garage_door }
```

Now your **iPhone's location** opens/closes the door **server‑side — no tap, no prompt, no myQ subscription.** (Add a "still open after 5 min → close" safety automation if you like.)

---

## Troubleshooting
| Symptom | Fix |
|---|---|
| Door does nothing / no state | Swap your RED/WHITE leads; confirm **common ground** ESP↔opener white; verify door type set to **Security+ 2.0**. |
| State reads but won't open | TX MOSFET not switching — use the **AO3400A** (not 2N7000) for TX; check **GPIO16 → gate**. |
| Door twitches on ESP boot | Add the **10k gate‑to‑GND pulldown** on the TX MOSFET. |
| RX garbled / flapping | Check the RX divider values and the **10k pull‑up to 3.3 V**; keep wires short. |
| Interferes with wired wall button | Expected if you lack the 889LM smart panel; ratgdo's emulation shares the bus — usually fine, see ratgdo docs. |

---

## Complete parts list (with where to buy)

Generic, widely‑stocked parts — nothing exotic. Manufacturer part numbers given so you can search any vendor; links are starting points, not the only source.

| # | Part | Qty | Mfr part / spec | Where to buy (search these) | ~Price |
|---|------|-----|-----------------|------------------------------|--------|
| 1 | **ESP32 D1 Mini** (LOLIN/WeMos) or any ESP32 DevKit | 1 | ESP32‑based, USB | AliExpress "LOLIN D1 Mini ESP32"; Amazon "WeMos D1 Mini ESP32"; [wemos.cc](https://www.wemos.cc/) | $5–9 |
| 2 | **2N7000** N‑ch MOSFET (RX) | 1 | onsemi **2N7000** TO‑92 | Mouser/DigiKey "2N7000"; Amazon multipack | $0.10 |
| 3 | **AO3400A** logic‑level N‑ch MOSFET (TX) | 1 | **AO3400A** SOT‑23 | Mouser/DigiKey "AO3400A"; AliExpress | $0.15 |
| 4 | **SOT‑23 → DIP adapter** (to breadboard the AO3400A) | 1 | SOT‑23‑3 breakout | Amazon/AliExpress "SOT23 to DIP adapter" | $0.30 |
| 5 | **10 kΩ resistor**, ¼ W | 3 (get 5+) | 10kΩ 1% | any kit; Mouser/DigiKey "10k 1/4W" | $0.05 |
| 6 | **3‑position screw terminal**, 5 mm pitch | 1 | KF301‑3P or similar | Amazon/AliExpress "5.08mm screw terminal 3P" | $0.30 |
| 7 | **Perfboard** (or solderless breadboard to prototype) | 1 | ~3×7 cm protoboard | Amazon/AliExpress "prototype PCB board" | $0.50 |
| 8 | **Hookup wire** red/white/black, 22–24 AWG | — | stranded | any | — |
| 9 | **USB 5 V supply + cable** (power the ESP) | 1 | any phone charger | you already own one | — |
| 10 | *(optional)* **LM2596 buck module** to power from a battery‑backup opener instead of USB | 1 | LM2596 12→5 V | Amazon/AliExpress "LM2596 module" | $1 |
| 11 | *(optional)* small **project box** | 1 | ~60×40 mm ABS | Amazon "small project enclosure" | $2 |

**Total: ~$10–15** (≈$8 of that is the ESP32). The official ratgdo BOM is items 2–6; everything else is generic build stuff.

> 💡 The two MOSFETs (2N7000 + AO3400A) are the only parts worth buying from a reputable distributor (Mouser/DigiKey/onsemi) — counterfeit AO3400As exist and are the #1 cause of "won't transmit." Get the 2N7000 in a multipack; you'll want spares.

---

## Perfboard layout (top view)

A compact single‑board layout. `Q1` = 2N7000 (RX), `Q2` = AO3400A on adapter (TX). The ESP32 sits on female headers to the left; the 3‑pin screw terminal on the right edge.

```
   ESP32 D1 Mini                          Screw terminal
  ┌────────────┐                          ┌───────────┐
  │ 3V3 ●──────┼──[R3 10k]──┐             │ RED   ●───┼──┐
  │ GND ●──┐   │            │             │ WHITE ●───┼─┐│
  │ G21 ●──┼───┼────────────┴──● d        │ (GND)     │ ││
  │ (RX)   │   │        Q1 ┌──────┐        └───────────┘ ││
  │ G16 ●──┼───┼──● g ─────┤2N7000│ s ●──┐               ││
  │ (TX)   │   │           └──────┘      │               ││
  │        │   │   RED net ●──[R1 10k]●──┤ g (Q1)        ││
  │        │   │              │          │               ││
  │        │   │           [R2 10k]      │               ││
  │        │   │              │          │               ││
  │  GND rail ●┴──────────────┴──────────┴──● s(Q1) ─────┘│
  │            │                                          │
  │  Q2 (TX): G16 ●─ g │ drain ●─ RED net │ source ●─ GND─┘
  └────────────┘
```

**Net summary (the part that actually matters — wire to *these*, not the ASCII art):**
- **RED net** (opener red terminal) ↔ Q2 **drain**, and ↔ **R1**(10k)→ Q1 **gate**.
- **Q1 gate** ↔ **R2**(10k) → **GND**.  (R1+R2 = the safe divider off the 12 V line.)
- **Q1 drain** ↔ ESP **GPIO21 (RX)** ↔ **R3**(10k) → **3V3**.
- **Q1 source** & **Q2 source** ↔ **GND**.
- **Q2 gate** ↔ ESP **GPIO16 (TX)**.
- **GND net** ties together: ESP GND, Q1 source, Q2 source, R2, and the opener **WHITE** terminal.
- Opener **RED**→ screw terminal → RED net; opener **WHITE**→ screw terminal → GND net.

> Prototype on a **solderless breadboard first**, confirm open/close + state in Home Assistant, *then* solder to perfboard. Keep the RED‑net and gate wires short to avoid noise on the serial line.

---

## Honest reality check
- This is the **cheapest** path (~$10–20) and fully local, but it's a **soldering + electronics** project. The pre‑made ratgdo (~$30) or Konnected blaQ does the identical job if you'd rather skip the bench work.
- The **firmware and protocol are the hard parts — and they're already solved and open‑source.** You're really just building the tiny interface board around a published design.

---

### Sources
- [Kaldek/rat‑ratgdo — open‑source ratgdo schematics & circuit explanation](https://github.com/Kaldek/rat-ratgdo)
- [esphome‑ratgdo — firmware & web installer](https://ratgdo.github.io/esphome-ratgdo/)
- [esphome‑ratgdo GitHub (board YAML / pin configs)](https://github.com/ratgdo/esphome-ratgdo)
- [konnected‑io/esphome‑secplus‑gdo — alternative Sec+2.0 ESPHome component](https://github.com/konnected-io/esphome-secplus-gdo)
- [Secplus‑GDO setup guide — GelidusResearch](https://github.com/GelidusResearch/device.docs/blob/main/gdo.guides/Secplus-GDO-Setup-Guide.md)
- [ratgdo features / original project — Paul Wieland](https://paulwieland.github.io/ratgdo/01_features.html)
- [Home Assistant — presence detection / device_tracker](https://www.home-assistant.io/getting-started/presence-detection/)
