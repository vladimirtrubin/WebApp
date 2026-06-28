# Clickless Garage Geofencing — Complete, No‑Tap Automation

**Goal:** Garage **opens as you arrive** and **closes as you leave**, by location alone — **zero taps, phone stays in your pocket/locked**. True "set it and forget it."

> **The blunt truth about myQ:** a stock **myQ has no phone‑based auto‑open geofence at all**, and Apple/myQ both treat *opening* as a security action that demands a confirmation tap. So **there is no clickless‑open path that uses myQ‑by‑itself + iPhone.** Every genuinely clickless solution below either **bypasses myQ's cloud** (ratgdo) , **replaces the controller** (Tailwind), or **uses a supported car** (myQ Smart Vehicle Access). This is a platform limitation, not a settings toggle you're missing.

Ranked by how well they deliver *complete, clickless* automation:

---

## 🥇 #1 — Home Assistant + ratgdo (most complete, fully clickless both ways)

**Why it wins:** the trigger fires **server‑side**, so the door just opens/closes — *the phone doesn't need to be unlocked and you do nothing*. Works in both directions, no Apple security prompt, no myQ cloud, no subscription. This is what the home‑automation community uses after Chamberlain's lockdown.

**What you need:** a **ratgdo board (~$30)** on your existing opener + **Home Assistant** running (a $40–60 Raspberry Pi / mini‑PC, or an old machine) + the **Home Assistant Companion app** on your iPhone.

**How it works:**
1. ratgdo exposes your opener to Home Assistant as a `cover.garage_door` entity (local control, no Chamberlain cloud).
2. The **HA Companion app** reports your iPhone's location → HA creates a `device_tracker.your_iphone` entity. Grant **Location → Always + Precise**.
3. You define a **zone** for home with your ~0.25 mi radius and two automations:

```yaml
# Open as you arrive
alias: Garage - open on arrival
trigger:
  - platform: zone
    entity_id: device_tracker.your_iphone
    zone: zone.home          # set this zone's radius to ~400 m (0.25 mi)
    event: enter
action:
  - service: cover.open_cover
    target: { entity_id: cover.garage_door }

# Close as you leave
alias: Garage - close on departure
trigger:
  - platform: zone
    entity_id: device_tracker.your_iphone
    zone: zone.home
    event: leave
action:
  - service: cover.close_cover
    target: { entity_id: cover.garage_door }
```

**Make it bulletproof (optional but recommended):**
- Tighten/loosen `zone.home` radius from real behavior; the open zone can be a bit larger so it's up by the time you reach the driveway.
- Add a guard so it only closes if it's actually open, and a "still open after 5 min" safety auto‑close.
- Combine with **home Wi‑Fi** as a second condition (HA Companion app reports SSID) if you want "near home **and/or** on Wi‑Fi."

**Trade‑off:** you run a small always‑on HA box and do ~30 min of setup (wiring + YAML). After that it's hands‑off forever.

---

## 🥈 #2 — Tailwind iQ3 (clickless with **no server, no code** — easiest hardware route)

**Why it's great:** built‑in geofence **auto‑open as you approach** (5–10 s response) with **zero phone interaction** — it's a feature of the device itself, no Shortcuts, no HA. ~$50, replaces your reliance on myQ.

**What you do:**
1. Install the Tailwind iQ3 on your opener.
2. In the Tailwind app, enable **auto‑open geofencing** and set your distance.
3. Done — it opens on approach and can auto‑close on leave/timer.

**Trade‑off:** ~$50 hardware swap; you leave the myQ ecosystem. But it's the **least‑effort fully‑clickless** option — no server, no scripting.

---

## 🥉 #3 — ratgdo + Apple HomeKit, with the "dummy‑switch" trick (clickless, all‑Apple, no HA server)

Apple **refuses to silently open** a garage from a location/time automation (it's a secure accessory → confirmation prompt). The well‑known community workaround makes it clickless:

1. ratgdo presents your door to HomeKit as a native **Garage Door** accessory.
2. Add a **non‑secure HomeKit switch** (a cheap smart plug or a virtual switch). Toggling a plug **never** asks for confirmation.
3. **Automation A (presence):** *When I arrive → turn the switch ON.* (Silent — plugs aren't secure.)
4. **Automation B (accessory‑triggered):** *When that switch turns ON → set Garage Door to Open.* Automations triggered by **another accessory's state** run **silently** — the security prompt only hits *presence/time*‑triggered secure actions.
5. Mirror it for leaving → switch OFF → close.

**Trade‑off:** clever but fiddly; the silent‑open behavior has historically been **iOS‑version dependent**, so test after iOS updates. You also need that extra switch/virtual accessory (often itself easiest via Homebridge/HA — at which point #1 is cleaner).

---

## 🏅 #4 — myQ Smart Vehicle Access (clickless **only** if you have a supported car)

If you drive a **Tesla, or a Nissan/Infiniti/GM (and other) myQ‑partner vehicle**, myQ's **connected‑car geofence** opens/closes **hands‑free using the car's location** — genuinely clickless, and it reuses your existing myQ hardware. The car is the trusted key, which is why Apple/phone restrictions don't apply.

**What you do:** in the myQ app, set up **Smart Vehicle Access** / pair your vehicle, enable geofenced open/close, set distance.

**Trade‑off:** only works in/near that specific car, may need the **myQ subscription**, and it's car‑presence not phone‑presence (no good for arriving on foot/bike).

> 💡 **Tesla owners who don't want the myQ subscription:** skip myQ entirely and use **Tesla HomeLink** (the car triggers your opener's radio directly, with built‑in Auto‑Open/Auto‑Close geofence — no subscription). Full walkthrough: **[`Tesla-HomeLink-Bypass-myQ.md`](./Tesla-HomeLink-Bypass-myQ.md)**.

---

## Quick chooser

| Want… | Pick |
|---|---|
| The most complete, reliable, free‑software, both‑directions clickless | **#1 HA + ratgdo** |
| Clickless with the **least effort**, no server/coding, just buy a box | **#2 Tailwind iQ3** |
| Stay all‑Apple/HomeKit and avoid a server | **#3 ratgdo + dummy‑switch** |
| You have a supported car and want to reuse myQ | **#4 myQ Smart Vehicle Access** |
| ❌ Clickless open from **stock myQ + iPhone only** | **Not possible** — platform limitation |

**My recommendation for "complete automation, clickless":** **#1 (Home Assistant + ratgdo)** if you don't mind a small always‑on box — it's the only option that does silent open *and* close, phone‑based, both ways, free, no Apple prompt, no myQ cloud. If you want zero tinkering, **#2 Tailwind iQ3**.

---

### Sources
- [Home Assistant — presence detection / device_tracker](https://www.home-assistant.io/getting-started/presence-detection/)
- [Open garage door when entering a zone — Home Assistant / Konnected community](https://community.konnected.io/t/open-garage-door-when-enter-zone/36214)
- [Smart garage automation with Home Assistant + ESP32 ratgdo (2026 guide)](https://homeautomationworkshop.com/smart-garage-door-automation-with-home-assistant-complete-esp32-ratgdo-setup-guide-2026/)
- [ratgdo features](https://paulwieland.github.io/ratgdo/01_features.html)
- [HomeKit: use automation in a Shortcut without confirmation (dummy‑switch trick) — MacRumors forums](https://forums.macrumors.com/threads/use-automation-in-shortcut-without-confirmation.2202175/)
- [Best smart garage controllers 2026: myQ vs Tailwind vs Meross (Tailwind clickless auto‑open)](https://www.smarthomeexplorer.com/guides/smart-garage-door-controllers-2026)
- [tesla‑geogdo — geofence GDO control app](https://github.com/brchri/tesla-geogdo)
- [Connected Car Services & geofence — myQ.com](https://www.myq.com/auto)
