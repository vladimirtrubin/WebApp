# iPhone Garage Door Automation — Open Near Home / Close When You Leave

**Goal:** Your iPhone automatically **opens** the garage door when you come within ~0.25 mi of home **or** join your home Wi‑Fi, and **closes** it when you leave that radius **or** drop off home Wi‑Fi.

This guide was assembled and cross‑checked from three perspectives:

- 🧩 **Shortcuts / automation** — how to build the triggers correctly
- 🔌 **Smart‑home hardware** — what opener actually lets an iPhone control the door
- 🔒 **Security** — the real risks of auto‑opening a garage, and how iOS limits it

> **Read this first — the one thing that changes everything:** an iPhone Shortcut cannot open a garage door by itself. It can only send a command to a **smart garage opener** that you've already installed. And Apple deliberately treats a garage door as a *security‑sensitive* accessory, which limits how "hands‑free" the **open** step can be. Both points are covered below — don't skip the [Reality Check](#reality-check) and [Security](#security--what-to-actually-do) sections.

> **⚠️ If you have myQ (Chamberlain / LiftMaster):** myQ is a special case — jump to **[If you have myQ](#if-you-have-myq--read-this)** before doing anything else. The standard iOS‑Shortcuts route below does **not** work with a stock myQ unit, and you have a decision to make.

---

## If you have myQ — read this

🔌 **Bad news first, then two real options.**

In **late 2023 Chamberlain shut off third‑party API access** to myQ and **discontinued the myQ Home Bridge** (the hardware that used to add HomeKit). The result for a stock myQ today:

- ❌ **No native Apple HomeKit** — so the iOS Shortcuts "Arrive/Leave/Wi‑Fi → control Garage Door" automations in this guide **have nothing to control**.
- ❌ **Homebridge / Home Assistant cloud integrations were blocked** — Chamberlain called them "unauthorized."
- ❌ **myQ's own Siri Shortcuts actions are minimal** and Chamberlain restricts automated *opening* for liability reasons.

So you pick one of these two paths:

### Option A — Use myQ's *own* built‑in geofence (no iPhone Shortcut)
This is the no‑extra‑hardware route, and it actually does the exact open/close behavior you asked for — just inside the myQ app instead of Apple Shortcuts.

1. Open the **myQ app → your garage door → Settings / Smart Features**.
2. Enable **geofence / "hands‑free" auto‑open & auto‑close**, and set your **preferred geofence distance** (this is your "0.25 mi" knob).
3. Allow **Location → Always + Precise** for the myQ app, and keep it running in the background.

**Caveats (be aware before you rely on it):**
- myQ's hands‑free **auto‑open** is increasingly tied to **myQ Smart Vehicle Access / connected‑car** support, and **geofenced open often requires the paid "myQ" subscription tier**. Auto‑*close* and alerts are generally available more freely.
- It's **Wi‑Fi‑independent** — myQ geofencing uses GPS, not your home Wi‑Fi. (You lose the "join home Wi‑Fi → open" trigger you originally wanted, but GPS geofence covers the same intent.)
- You're trusting Chamberlain's cloud and app reliability, which is the thing that broke everyone's integrations in the first place.

➡️ **Choose Option A if** you want it working today with zero hardware and you're OK living inside the myQ app (and possibly its subscription).

### Option B — Add a **ratgdo** board → real HomeKit → the iOS Shortcuts in this guide
This is the route that gives you **exactly what you originally asked for** (0.25 mi geofence **or** home Wi‑Fi, via Apple Shortcuts), by bypassing Chamberlain's cloud entirely.

1. Buy a **ratgdo** control board (≈ **$30**; ratgdo32 / ratgdo for Chamberlain‑LiftMaster security+2.0 openers).
2. Wire it to your opener's **wall‑button terminals + door sensor** (a few minutes; community guides + ESPHome firmware).
3. It exposes your existing myQ opener as a **native HomeKit "Garage Door" accessory** — local control, no myQ cloud.
4. Now follow **[Setup](#setup) Automations 1–3** below as written: **Arrive ~0.25 mi → Open**, **Join home Wi‑Fi → Open**, **Leave ~0.25 mi → Close**.

**Caveats:**
- Requires opening the opener's low‑voltage terminals (no mains wiring, but it's a small DIY job). Check your specific opener model is ratgdo‑compatible first.
- Because it's a *real* HomeKit garage accessory, iOS may still ask you to **confirm the OPEN** (the security‑accessory prompt) — see [Security](#security--what-to-actually-do).

➡️ **Choose Option B if** you specifically want the Apple Shortcuts experience (incl. the Wi‑Fi trigger), local control, and no myQ subscription — and you don't mind a ~$30 board and a few minutes of wiring.

| | Option A: myQ app geofence | Option B: ratgdo + HomeKit |
|---|---|---|
| Extra hardware | None | ~$30 board + wiring |
| iPhone Shortcuts / Wi‑Fi trigger | No (GPS geofence only) | **Yes** — full guide works |
| Subscription | Often required for auto‑open | None |
| Relies on Chamberlain cloud | Yes | No (local) |
| Setup effort | Minutes, in‑app | ~30 min DIY |

> My recommendation for what you described (proximity **or** home Wi‑Fi, your own Shortcut): **Option B** is the only one that delivers all of it. **Option A** is the fastest if you'll accept GPS‑only and possibly a subscription.

---

## What you need

| # | Requirement | Notes |
|---|-------------|-------|
| 1 | A **smart garage door controller** | e.g. **iSmartGate / ismartgate**, **Meross MSG100/200**, **Tailwind iQ3**, **Refoss**, **Konnected**, or a **ratgdo** board. **myQ owners:** stock myQ has no HomeKit anymore — see [If you have myQ](#if-you-have-myq--read-this). Most clamp onto your existing opener and wire to the door sensor. |
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

**For you (myQ):** stock myQ killed HomeKit + third‑party APIs, so the Apple‑Shortcuts route needs one of:
- **Option A:** turn on **myQ's own geofence** in the myQ app (GPS only, may need a subscription) — fastest, no hardware.
- **Option B (recommended for what you asked):** add a **~$30 ratgdo board** → your opener becomes a native HomeKit garage door → then build the 3 Shortcuts below. This is the only path that gives you the **0.25 mi geofence _and_ the home‑Wi‑Fi trigger** in your own Shortcut.

**The 3 Shortcuts automations (Option B / any HomeKit opener):**
1. **Arrive (~0.25 mi) → Open**, 2. **Join home Wi‑Fi → Open**, 3. **Leave (~0.25 mi) → Close**.
4. Turn **OFF "Ask Before Running"** on each (iOS 15+).
5. **Automate closing freely; automate opening cautiously** — and keep Precise Location on.

---

### Sources
- [Travel triggers in Shortcuts — Apple Support](https://support.apple.com/guide/shortcuts/travel-triggers-apd8ebfc4e8e/ios)
- [Home automation triggers in Shortcuts — Apple Support](https://support.apple.com/guide/shortcuts/home-automation-triggers-apdb450f6291/ios)
- [Create a new home automation in Shortcuts — Apple Support](https://support.apple.com/guide/shortcuts/create-a-new-home-automation-apd2a290f633/ios)
- [Setting triggers in Shortcuts (Wi‑Fi) — Apple Support](https://support.apple.com/en-om/guide/shortcuts/apde31e9638b/ios)
- [8 Useful Ways to Trigger Automations on Your iPhone — How‑To Geek](https://www.howtogeek.com/useful-ways-to-trigger-automations-on-your-iphone/)
- [Chamberlain shuts off access to myQ's APIs, breaking smart‑home integrations — Slashdot/StaceyOnIoT](https://tech.slashdot.org/story/23/11/08/001241/chamberlain-shuts-off-access-to-myqs-apis-breaking-smart-home-integrations)
- [Chamberlain myQ blocks Homebridge — 9to5Mac](https://9to5mac.com/2023/11/08/chamberlain-myq-blocks-homebridge/)
- [myQ HomeKit: native support dropped — ways to add it (ratgdo) — addtohomekit.com](https://www.addtohomekit.com/blog/myq-homekit/)
- [Connected Car Services & geofence — myQ.com](https://www.myq.com/auto)
