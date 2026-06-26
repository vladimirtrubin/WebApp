# iPhone Garage Door Automation — Open Near Home / Close When You Leave

**Goal:** Your iPhone automatically **opens** the garage door when you come within ~0.25 mi of home **or** join your home Wi‑Fi, and **closes** it when you leave that radius **or** drop off home Wi‑Fi.

This guide was assembled and cross‑checked from three perspectives:

- 🧩 **Shortcuts / automation** — how to build the triggers correctly
- 🔌 **Smart‑home hardware** — what opener actually lets an iPhone control the door
- 🔒 **Security** — the real risks of auto‑opening a garage, and how iOS limits it

> **Read this first — the one thing that changes everything:** an iPhone Shortcut cannot open a garage door by itself. It can only send a command to a **smart garage opener** that you've already installed. And Apple deliberately treats a garage door as a *security‑sensitive* accessory, which limits how "hands‑free" the **open** step can be. Both points are covered below — don't skip the [Reality Check](#reality-check) and [Security](#security--what-to-actually-do) sections.

---

## What you need

| # | Requirement | Notes |
|---|-------------|-------|
| 1 | A **smart garage door controller** | e.g. **iSmartGate / ismartgate**, **Meross MSG100/200**, **Tailwind iQ3**, **Refoss**, **Konnected**, or **MyQ** + a HomeKit bridge. Most clamp onto your existing opener and wire to the door sensor. |
| 2 | iPhone on **iOS 15 or later** | iOS 15+ allows personal automations to "Run Immediately" (no tap) — older iOS always asks. |
| 3 | **Location Services → Always**, **Precise Location ON** for the controlling app/Home | Geofencing won't fire reliably otherwise. |
| 4 | Home set in the **Home app** (or the Apple **Contacts** "me" card → home address) | Gives the automations a "Home" location to anchor to. |

**Hardware decision that matters a lot (see Security):**
- A **HomeKit‑native** garage controller is the cleanest to set up — but iOS flags it as a security accessory and will usually **ask you to confirm the OPEN** rather than doing it silently.
- A **non‑HomeKit** opener controlled through its own app's Shortcuts action or an **HTTP/webhook** action (Tailwind, MyQ, Konnected, Home Assistant, etc.) is *not* flagged as an Apple security accessory, so it **can** open fully hands‑free — at the cost of you owning that security trade‑off yourself.

---

## Reality Check

A few iOS facts that shape what's actually possible (verified against Apple's current Shortcuts documentation):

1. **There is no single "if near home OR on Wi‑Fi" shortcut.** iOS personal automations are *one trigger each*. So you build **three small automations** that share the same two actions (Open / Close). Multiple automations calling "open" is harmless — opening an already‑open door is a no‑op.
2. **Location triggers have an adjustable radius.** When you pick *Arrive*/*Leave*, you drag the blue circle on the map to size the geofence. ~0.25 mi ≈ **400 m**. (iOS minimum geofence is ~100 m; 400 m is comfortably valid.)
3. **Wi‑Fi automations fire reliably on _joining_ a network**, not on leaving. "Network Left" exists on newer iOS but is flaky — Wi‑Fi can drop and rejoin in your driveway. So **Wi‑Fi = open trigger only**; rely on the **Leave geofence** to close. (When you drive away you leave the radius anyway, so closing is covered.)
4. **Opening a garage may force a confirmation.** For HomeKit security accessories iOS often shows a "Run? / notification" instead of acting silently. That's by design. The non‑HomeKit/webhook route avoids it. See [Security](#security--what-to-actually-do).

---

## Setup

### Step 0 — Install & name the opener
Install your smart garage controller per its instructions and confirm you can open/close it from its app (and, if HomeKit, from the **Home** app). Note the **accessory name** (e.g. "Garage Door") — you'll select it inside the shortcut actions.

---

### Automation 1 — OPEN when you arrive within ~0.25 mi

1. Open **Shortcuts** → **Automation** tab → **+** → **Create Personal Automation**.
2. Choose **Arrive**.
3. **Location** → set to **Home** (or search your address).
4. **Drag the blue circle** on the map so its radius is about **0.25 mi (~400 m)**. (Pinch to zoom; the circle is the trigger boundary.)
5. Time range: leave **Any Time** (or restrict, e.g. evenings only — a nice security tightener).
6. **Next** → **New Blank Automation** (or add action) → search **"Control <Home name>"** / **"Set <accessory>"** → pick **Garage Door → Open** (HomeKit), *or* add your opener's own "Open" action / an **HTTP webhook** action.
7. **Next**, then turn **OFF "Ask Before Running"** → confirm **Run Immediately**.
   - If iOS refuses to let you turn this off for a HomeKit garage (security accessory), that's expected — see [Security](#security--what-to-actually-do) for the workaround.

---

### Automation 2 — OPEN when you join home Wi‑Fi

1. **+ → Create Personal Automation → Wi‑Fi**.
2. **Network → Choose** → select your **home Wi‑Fi SSID**.
3. Action: same **Open** action as Automation 1.
4. Turn **OFF "Ask Before Running" → Run Immediately**.

> This covers the case where GPS is slow but you've already connected to Wi‑Fi at the door. Both Automation 1 and 2 calling "Open" is fine.

---

### Automation 3 — CLOSE when you leave the ~0.25 mi radius

1. **+ → Create Personal Automation → Leave**.
2. **Location → Home**, drag the circle to the **same ~0.25 mi / 400 m** radius as Automation 1.
3. Action: **Garage Door → Close** (or your opener's Close / webhook).
4. Turn **OFF "Ask Before Running" → Run Immediately**.

> **Why no "disconnect from Wi‑Fi → close" automation?** Wi‑Fi "leave" triggers are unreliable (the signal flaps as you pull out). The Leave‑geofence is the dependable close signal, and by the time you're out of Wi‑Fi range you're also leaving the radius. If your iOS shows a stable "Network Left" option and you want belt‑and‑suspenders, add it pointing to Close — but treat the geofence as the real one.

---

## Optional — a smarter single "Close" shortcut

To avoid closing the door on someone (pets, a car in the bay, family still in the garage), make the Leave automation call a **shortcut** instead of a raw Close, with a safety check:

```
If <Garage Door is Open>
    Send Notification "Leaving home — closing garage in 30s"
    Wait 30 seconds
    Set Garage Door → Closed
End If
```

This gives you a window to cancel and avoids redundant commands. Build it in the **Shortcuts** tab, then have Automation 3 **Run Shortcut → (this shortcut)**.

---

## Security — what to actually do

🔒 **This is the part the experts argued about most. Read it.**

- **Auto‑opening a garage is the riskier half.** A garage is an entry point to your home. Anything that opens it on GPS/Wi‑Fi alone can be tricked by **location drift** (door opens while you're a block away and out of sight) or, in rare cases, **GPS/Wi‑Fi spoofing**. Apple's confirmation prompt on HomeKit garage doors exists *for exactly this reason* — it's a feature, not a bug.
- **Strong recommendation: automate CLOSING freely, automate OPENING cautiously.** Auto‑close is almost pure upside (it fixes the "did I leave it open?" anxiety). Auto‑open is the part to think twice about.
- **If you want truly hands‑free open**, you're choosing a non‑HomeKit path (opener's own Shortcuts action or an HTTP/webhook) so iOS won't force the prompt. That's legitimate, but **you** now own the risk. Mitigate it:
  - Tighten the geofence (smaller radius opens the door only when you're genuinely at the driveway).
  - Add a **time window** (e.g. don't auto‑open overnight).
  - Require **both** conditions if your platform supports it (home Wi‑Fi joined *and* inside geofence) rather than either/or.
  - Keep a **camera or notification** on the garage so an unexpected open is visible.
- **Keep "Precise Location" ON** — coarse location makes a 0.25 mi geofence wander badly.
- **Don't rely on Wi‑Fi as a security boundary** — SSIDs can be impersonated. Treat Wi‑Fi as a convenience trigger, geofence as the primary.

---

## Reliability & troubleshooting

| Symptom | Fix |
|---|---|
| Automation never fires | Location Services → **Always** + **Precise**; Background App Refresh ON; keep Wi‑Fi/Bluetooth on (geofencing uses them). |
| Fires late / from too far | Geofences trigger on a *boundary cross*, and iOS adds hysteresis. 0.25 mi is fine; smaller than ~100 m won't work. |
| Still asks "Run? Yes/No" | iOS < 15, or a HomeKit **security accessory** (garage/lock) that won't allow silent open — expected; use non‑HomeKit/webhook for hands‑free, or accept the tap. |
| Door closes at a bad moment | Use the [smart Close shortcut](#optional--a-smarter-single-close-shortcut) with the 30‑second notification/cancel window. |
| Opens when just passing by | Shrink the radius and/or add a time window; consider requiring Wi‑Fi + geofence together. |

---

## TL;DR

1. Buy/install a **smart garage opener** (HomeKit‑native is easiest; non‑HomeKit/webhook is what lets *opening* be fully hands‑free).
2. Build **3 personal automations** in Shortcuts: **Arrive (~0.25 mi) → Open**, **Join home Wi‑Fi → Open**, **Leave (~0.25 mi) → Close**.
3. Turn **OFF "Ask Before Running"** on each (iOS 15+).
4. **Automate closing freely; automate opening cautiously** — and keep Precise Location on.

---

### Sources
- [Travel triggers in Shortcuts — Apple Support](https://support.apple.com/guide/shortcuts/travel-triggers-apd8ebfc4e8e/ios)
- [Home automation triggers in Shortcuts — Apple Support](https://support.apple.com/guide/shortcuts/home-automation-triggers-apdb450f6291/ios)
- [Create a new home automation in Shortcuts — Apple Support](https://support.apple.com/guide/shortcuts/create-a-new-home-automation-apd2a290f633/ios)
- [Setting triggers in Shortcuts (Wi‑Fi) — Apple Support](https://support.apple.com/en-om/guide/shortcuts/apde31e9638b/ios)
- [8 Useful Ways to Trigger Automations on Your iPhone — How‑To Geek](https://www.howtogeek.com/useful-ways-to-trigger-automations-on-your-iphone/)
