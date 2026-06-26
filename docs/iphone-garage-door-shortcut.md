# 🚗 iPhone Garage Door Auto Open/Close — Shortcut & Automation Guide

**Goal:** Open the garage door when your iPhone comes within ~0.25 mi of home **or**
connects to your home Wi‑Fi, and close it when your iPhone leaves home **and** is both
out of the ~0.25 mi radius **and** disconnected from home Wi‑Fi.

This was designed as a continuous **arm/disarm loop**: every "I'm arriving" signal opens,
and every "I'm leaving" signal triggers a safe close‑check. Built and reviewed across four
expert lenses — automation, garage hardware, geofencing/networking, and security.

---

## ⚠️ Read this first (security — the most important section)

A garage door is a door into your house. Auto‑**opening** it from GPS is convenient but has
real risks, so decide your tolerance before building:

1. **GPS drift / false triggers.** A geofence is accurate to roughly ±100 m. Driving *past*
   home, or GPS bouncing, can pop the door open when you aren't actually arriving.
2. **OR logic on the open side is intentionally generous.** "Within 0.25 mi **OR** on Wi‑Fi"
   means either signal opens it. Wi‑Fi is the stronger "I'm really home" signal; geofence is
   the early/hands‑free one.
3. **Safest posture:** auto‑**close** aggressively, auto‑**open** conservatively. Many people
   run **close fully automatic** and leave **open as a one‑tap confirmation** (iOS shows a
   notification you tap). If you want fully hands‑free open, use *Run Immediately* (below) and
   accept the tradeoff.

> 💡 Recommendation: if in doubt, make **closing** automatic and **opening** confirmation‑based.
> An accidental close is harmless; an accidental open is not.

---

## ✅ What you need

- **iPhone** on iOS 14 or later (iOS 17+ recommended — more reliable automations).
- The **Shortcuts** app (built in).
- A garage door your phone can actually control. Best → worst:
  - **HomeKit‑compatible garage controller** (★ recommended): Meross MSG100/200,
    Tailwind iQ3, Aqara, iSmartGate/Gogogate, Refoss, Konnected. These expose a native
    **Open/Close** action in Shortcuts and report door state. Local, fast, secure.
  - **Home Assistant** (advanced): control any opener via a webhook / REST action.
  - **Chamberlain/LiftMaster MyQ**: ⚠️ MyQ blocked free third‑party/Shortcuts access in 2023.
    You'll need a paid integration or a HomeKit bridge (Home Assistant + RATGDO board is the
    popular fix). Plain MyQ + Shortcuts will *not* work reliably.
  - **Generic relay / webhook** (Konnected, Shelly, IFTTT): use "Get Contents of URL" to hit
    a webhook. Works, but secure the endpoint (token/HTTPS).

You also need your **home address** and your **home Wi‑Fi network name (SSID)**.

---

## 🧠 The design: why two helper shortcuts + four automations

iOS Personal Automations **cannot** combine an "OR" across trigger types, and **cannot**
express "Leave AND off‑Wi‑Fi" in a single trigger. So we split responsibility:

- **Triggers** (the automations) just *fire on an event* — arrive, leave, Wi‑Fi on, Wi‑Fi off.
- **Decisions** (two helper shortcuts) hold the real logic and run a state/condition check.

This keeps the "OR to open / AND to close" logic in one place and makes it a clean loop:

```
ARRIVE region (≤0.25mi) ─┐
CONNECT home Wi‑Fi      ─┴─► [Open Garage] helper ─► open (if currently closed)

LEAVE region (>0.25mi)  ─┐
DISCONNECT home Wi‑Fi   ─┴─► [Close Garage Safely] helper ─► close ONLY if (off Wi‑Fi)
```

The **Close** helper re‑checks Wi‑Fi so that merely toggling Wi‑Fi while you're standing in
the kitchen never closes the door on you — it only closes when you're genuinely gone.

---

## Step 1 — Build helper shortcut: **"Open Garage"**

Shortcuts ▸ **+** (new) ▸ name it **Open Garage**. Add actions:

**If your opener is HomeKit (recommended), make it idempotent (don't double‑toggle):**

1. **Get the state of accessory** → choose your garage door (the *Current State* attribute).
   *(In HomeKit setups, search the "Home" actions; or use "Get Home State".)*
2. **If** `Current State` `is` `Closed`
3.   **Control Home** ▸ set **Garage Door** to **Open**
4. **End If**

> Why the state check: a HomeKit garage accessory is stateful, so "Open" is safe even without
> the check. But if you're driving a **momentary relay** (a single "toggle" pulse), opening an
> already‑open door would *close* it. The state check prevents that. Keep it.

**If your opener is a webhook/Home Assistant instead of HomeKit:** replace steps 1–4 with:

1. **Get Contents of URL** → `https://your-endpoint/open` , Method **POST**,
   Header `Authorization: Bearer <your-token>`.

Test it: tap ▶ to run. The door should open.

---

## Step 2 — Build helper shortcut: **"Close Garage Safely"**

New shortcut ▸ name it **Close Garage Safely**. This is the brain of the close‑loop — it
enforces the **AND** (out of proximity *and* off Wi‑Fi) by aborting if you're still on Wi‑Fi.

1. **Get Network Details** → select detail **Wi‑Fi Network** (current SSID).
   *(Older iOS: "Get Current Wi‑Fi Network".)*
2. **If** `Wi‑Fi Network` `is` `YourHomeSSID`
   - **Comment / Stop:** "Still on home Wi‑Fi → I'm home, do nothing."
   - **Stop Shortcut**
3. **Otherwise** (not on home Wi‑Fi)
   - **(HomeKit)** *Get the state of accessory* → **If** state `is` `Open` →
     **Control Home** ▸ set **Garage Door** to **Closed** → **End If**
   - **(Webhook)** **Get Contents of URL** → `https://your-endpoint/close` (POST + token)
4. **End If**

> The geofence "Leave" event already guarantees you're outside ~0.25 mi when this runs, and the
> Wi‑Fi check above guarantees you're off home Wi‑Fi. Together that's your required AND.

---

## Step 3 — Create the four Personal Automations

Shortcuts ▸ **Automation** tab ▸ **+** ▸ **Create Personal Automation**.

### A) Arrive home → Open  (the 0.25 mi proximity, in)
- Trigger: **Arrive**
- **Location:** your home address.
- **Radius (your 0.25):** after picking the location, drag the blue circle on the map to size
  the region. iOS doesn't let you *type* a number; **0.25 mi ≈ 0.4 km ≈ 400 m** — size the
  circle to roughly that. (Apple's minimum geofence is ~100 m; 400 m is comfortably valid.)
- Time range: Any Time.
- **Run Immediately** ✅ (toggle on so it's hands‑free; *Notify When Run* optional).
- Action: **Run Shortcut** → **Open Garage**.

### B) Connect to home Wi‑Fi → Open  (the OR branch)
- Trigger: **Wi‑Fi** ▸ Network = **YourHomeSSID** ▸ "When connecting".
- **Run Immediately** ✅
- Action: **Run Shortcut** → **Open Garage**.

> A + B together = "within 0.25 mi **OR** on home Wi‑Fi → open." Opening twice is harmless
> because **Open Garage** only acts when the door is currently closed.

### C) Leave home → Close‑check  (the 0.25 mi proximity, out)
- Trigger: **Leave** ▸ same home location ▸ **same ~400 m radius** as automation A.
- **Run Immediately** ✅
- Action: **Run Shortcut** → **Close Garage Safely**.

### D) Disconnect from home Wi‑Fi → Close‑check
- Trigger: **Wi‑Fi** ▸ Network = **YourHomeSSID** ▸ "When disconnecting".
  *(If your iOS build lacks a disconnect option, automation C alone still covers leaving;
  Wi‑Fi disconnect is a redundancy.)*
- **Run Immediately** ✅
- Action: **Run Shortcut** → **Close Garage Safely**.

> C + D both route through **Close Garage Safely**, which refuses to close while you're still on
> home Wi‑Fi — enforcing "out of 0.25 mi **AND** off Wi‑Fi" before it ever closes the door.

---

## Step 4 — Test the loop

1. **Open helper:** run "Open Garage" manually → door opens, run again → stays open (no toggle).
2. **Wi‑Fi guard:** stand at home on Wi‑Fi, run "Close Garage Safely" → it should **do nothing**.
3. **Real close:** turn Wi‑Fi off (or walk out of range), run "Close Garage Safely" → it closes.
4. **Drive test:** leave home → within a minute you should get the Leave automation; return →
   Arrive and/or Wi‑Fi connect fires and opens. Watch the Automation list's run history.

---

## 🔧 Troubleshooting & tuning

| Symptom | Fix |
|---|---|
| Automation asks to confirm each time | Turn **Run Immediately** ON and **Notify When Run** OFF in the automation. |
| Door opens when just driving past | Shrink the Arrive radius; or make Open **confirmation‑based** and rely on Wi‑Fi for hands‑free open. |
| Door doesn't open on arrival | Enable **Precise Location** + **Always** location permission for Shortcuts; iOS needs Location Services + background. Keep Wi‑Fi/Bluetooth on (improves geofencing). |
| Closes while I'm home | Confirm the SSID in **Close Garage Safely** exactly matches your network (case‑sensitive); guest/extender SSIDs count as "not home." |
| Momentary relay double‑toggles | Keep the **Get state → If Closed/Open** checks; never send a blind "toggle." |
| MyQ won't control | MyQ blocks free Shortcuts access — bridge it via Home Assistant + RATGDO, or use a HomeKit‑native opener. |
| Geofence radius won't go to exactly 0.25 mi | iOS sizes regions by dragging, not numbers; ~400 m on the map is 0.25 mi. Minimum is ~100 m. |

---

## 📋 Quick reference

**Open Garage** (helper): `if door Closed → set Open` (or POST /open).
**Close Garage Safely** (helper): `if on home Wi‑Fi → stop; else if door Open → set Closed` (or POST /close).
**Automations:** Arrive→Open · Wi‑Fi connect→Open · Leave→Close Safely · Wi‑Fi disconnect→Close Safely.
**All four:** Run Immediately = ON.

---

*Built as an arm/disarm loop: arrival signals (proximity OR Wi‑Fi) open; departure signals route
through a guarded close that requires both out‑of‑range and off‑Wi‑Fi before it acts.*
