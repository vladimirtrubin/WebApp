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
   (D1 / GPIO22)                        │
                                   AO3400A (TX)
   RED control ───────────────────────●  drain
   wire                                 │
                                        ●  source ── GND

   WHITE opener terminal ── GND (common with ESP GND)
```

**What each part does**
- **TX (AO3400A):** ESP TX → gate. When the ESP drives the gate high, the MOSFET pulls the red line to GND = sending a bit. Idle (gate low) releases the line back to 12 V. *(Tip: a 10k gate‑to‑GND pulldown keeps it from floating/triggering during ESP boot — use one of your 10k here if you see the door twitch on power‑up.)*
- **RX (2N7000):** the red line drives the gate **through a 10k series + 10k divider to GND** so the gate sees a safe voltage, not the full 12 V. Drain → ESP RX with a **10k pull‑up to 3.3 V**. Line at 12 V → MOSFET on → RX reads LOW; line pulled down → MOSFET off → RX reads HIGH. (Inverted — the firmware expects that.)
- **Grounds must be common:** ESP GND ↔ opener **white** terminal. Without a shared ground nothing works.

> 📐 **Verify against the authoritative schematic before soldering:** the canonical KiCad drawing is `schematics/ratgdo open source D1 Mini_KiCad.png` in the **Kaldek/rat‑ratgdo** repo (link in Sources). Exact resistor placement there is the reference — match it.

---

## ESP32 "D1 Mini" pin map (firmware defaults)

The ESPHome ratgdo config (`v25board_esp32_d1_mini.yaml`) uses these board labels → real GPIO:

| Function | Board label | ESP32 GPIO | Needed for Sec+2.0? |
|---|---|---|---|
| UART **TX** (to opener) | D1 | **GPIO22** | ✅ yes |
| UART **RX** (from opener) | D2 | **GPIO21** | ✅ yes |
| Obstruction input | D7 | GPIO23 | optional (comes over protocol anyway) |
| Status: door | D0 | GPIO26 | optional LED |
| Status: obstruction | D8 | GPIO5 | optional LED |
| Dry‑contact open / close / light | D5 / D6 / D3 | GPIO18 / GPIO19 / GPIO17 | ❌ only for non‑Chamberlain openers |

For a Security+ 2.0 opener you only **must** wire **TX (GPIO22)** and **RX (GPIO21)** to the red‑wire circuit, plus **GND**. The dry‑contact pins are for dumb openers and stay unused.

---

## Assembly steps
1. **Unplug the garage opener.**
2. Build the TX and RX MOSFET circuits on perfboard/breadboard per the schematic; bring out 3 leads: **RED**, **WHITE/GND**, and (shared) **ESP GND**.
3. Connect **ESP GPIO22 → TX gate**, **ESP GPIO21 → RX drain node**, **ESP 3.3V → RX pull‑up**, **ESP GND → circuit GND**.
4. Land the opener side on the screw terminal: **RED → opener red terminal**, **WHITE → opener white terminal** (same terminals the wired wall button uses; you can piggy‑back alongside it).
5. Power the ESP (USB charger is simplest). Tidy into the enclosure near the motor unit.

---

## Flash the firmware (no coding required)
1. On a computer with **Chrome/Edge**, go to the **ESPHome ratgdo web installer** (`ratgdo.github.io/esphome-ratgdo`).
2. Plug the ESP32 in via USB → **Connect** → choose the **ESP32 / "v2.5i ESP32 d1 mini"** install → flash.
3. Join its Wi‑Fi hotspot, enter your home Wi‑Fi credentials.
4. Pick the door type **Security+ 2.0** in the board's web UI. Test **Open/Close** from that page — confirm the door responds and shows correct **state**.

*(Alternative: add the board in the ESPHome dashboard using the `v25board_esp32_d1_mini.yaml` package and your own Wi‑Fi/API secrets — same result, more control.)*

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
| State reads but won't open | TX MOSFET not switching — use the **AO3400A** (not 2N7000) for TX; check GPIO22 → gate. |
| Door twitches on ESP boot | Add the **10k gate‑to‑GND pulldown** on the TX MOSFET. |
| RX garbled / flapping | Check the RX divider values and the **10k pull‑up to 3.3 V**; keep wires short. |
| Interferes with wired wall button | Expected if you lack the 889LM smart panel; ratgdo's emulation shares the bus — usually fine, see ratgdo docs. |

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
