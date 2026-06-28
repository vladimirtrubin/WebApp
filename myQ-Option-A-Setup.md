# myQ Geofence Setup (Option A) — Step‑by‑Step for iPhone

**Goal:** Use the **myQ app's own geofence** so your garage **closes automatically when you leave** and **opens when you arrive** within ~0.25 mi of home — no extra hardware, no Apple Shortcut.

> **Set expectations first (honest version):**
> - ✅ **Auto‑CLOSE on leaving** and **"you left the door open" reminders** work well from the iPhone app.
> - ⚠️ **Hands‑free AUTO‑OPEN from the phone is deliberately limited.** Chamberlain treats *opening* as a safety action, so a phone‑only geofence usually gives you a **one‑tap "Arriving home — Open?" notification** rather than opening silently. **Fully silent auto‑open is a _connected‑car_ feature** (myQ Smart Vehicle Access — Tesla, Nissan, Infiniti, GM, etc.), not a phone feature.
> - 💳 The hands‑free **open** experience and some smart features may require the **paid myQ subscription** tier. Auto‑close, reminders, and manual control are free.
> - 📍 myQ geofence is **GPS‑based** — it does **not** use your home Wi‑Fi. (You lose the "join Wi‑Fi → open" trigger, but the GPS radius covers the same arrive/leave intent.)
>
> If silent, hands‑free **open** without a supported car is a hard requirement, that's **Option B (ratgdo + HomeKit)** in the main guide — Option A can't fully deliver it.

---

## Before you start
- iPhone with the **myQ app** installed and your garage door already added & working (you can open/close it manually in the app).
- You're signed in to your myQ account.
- A few minutes near your home address (the app uses your current location to set the geofence center).

---

## Step 1 — Give myQ the location permission it needs (this is the #1 reason geofence fails)

1. iPhone **Settings → Privacy & Security → Location Services** → make sure it's **ON**.
2. Scroll to **myQ** → set to **Always**.
   - "While Using" is **not** enough — geofencing has to run in the background.
3. Turn **Precise Location → ON** (a 0.25 mi geofence drifts badly without it).
4. Back in iPhone **Settings → myQ**, also enable **Background App Refresh** and **Notifications** (the open/close prompts and "door left open" alerts come through as notifications).

> If you ever see *"Location Services must be enabled in the myQ app under Discovered Devices,"* it's this step — set myQ to **Always + Precise** and reopen the app.

---

## Step 2 — Turn on geofencing in the myQ app

Exact labels vary slightly by app version; the flow is the same:

1. Open **myQ** → tap the **gear / Settings** (or the **≡ menu**).
2. Tap **Smart Features** (sometimes shown as **Automation**, **Rules**, or **Geofencing**).
3. Tap **Geofencing** → toggle it **ON**.
4. When prompted to **"Allow While Using / Change to Always Allow,"** choose **Always Allow** (confirms Step 1).

---

## Step 3 — Set your home location and the ~0.25 mi range

1. In **Geofencing**, tap **Set Garage Location** (or **Add Location**).
2. When the map shows your current spot on/near your driveway, tap **Set**.
3. Set the **Geofencing Range** to your ~0.25 mi target:
   - **0.25 mi ≈ 1,320 ft ≈ 400 m.** Enter whichever unit the app uses.
   - Bigger range = triggers sooner/farther out; smaller = only right at the house. Start at ~1,320 ft and tune from real‑world behavior.
4. Save.

---

## Step 4 — Configure what happens on arrive / leave

In the geofence/smart‑features screen you'll have toggles roughly like these — set them to taste:

- **Close when I leave** → **ON** (this is the reliable, valuable one — set it).
- **Open when I arrive** → **ON** if available. Expect a **tap‑to‑confirm notification** on arrival rather than a silent open, unless you have a supported connected car.
- **"Garage left open" reminder** → **ON**, set the delay (e.g. **5–10 minutes** after leaving) as a safety net in case geofence close is slow.

---

## Step 5 — Test it (do this before you rely on it)

1. With the door **open**, drive (or walk) **past the geofence radius**. Within a few minutes you should get a **close** action and/or a "door is open" reminder. Confirm the door closed.
2. Leave the area, then **drive back toward home**. As you cross the radius you should get an **"Arriving — Open?"** notification (tap to open), or a silent open if your setup supports it.
3. If nothing fires: re‑check **Always + Precise location**, **Background App Refresh**, and that geofencing is still toggled on (iOS sometimes silently downgrades background location — re‑confirm after iOS updates).

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Geofence never triggers | myQ Location = **Always**, **Precise ON**, **Background App Refresh ON**. Reopen the app once after setting. |
| Triggers too late / from too far | Adjust **Geofencing Range**; GPS geofences have built‑in lag — 0.25 mi is reasonable. |
| Open won't happen automatically | Expected on phone‑only — it's a confirm‑tap by design. Silent open needs **myQ Smart Vehicle Access** (supported car) or **Option B**. |
| Stops working after a while | iOS power/location throttling. Re‑enable Always location + Background App Refresh; keep myQ logged in. |
| Asked to pay | Hands‑free **open**/some smart features sit behind the **myQ subscription**; auto‑close + reminders are free. |

---

## If Option A's open limitation bugs you
The only way to get **silent, hands‑free OPEN by proximity *or* home Wi‑Fi in your own iPhone Shortcut** is to bypass myQ's cloud with a **~$30 ratgdo board → native HomeKit** (Option B in `iPhone-Garage-Door-Shortcut.md`). Say the word and I'll write the ratgdo wiring + HomeKit pairing steps for your specific opener model.

---

### Sources
- [Fix "Location Services must be enabled in the myQ App" — Chamberlain Support](https://support.chamberlaingroup.com/s/article/How-to-fix-Location-Services-must-be-enabled-in-the-MyQ-App-under-Discovered-Devices)
- [Connected Car Services & geofence — myQ.com](https://www.myq.com/auto)
- [myQ Connected Garage Door Opener (geofencing range setup example) — NissanConnect](https://www.nissanusa.com/owners/connect/features-apps/garage-door-opener.html)
- [myQ Smart Home — Chamberlain](https://www.chamberlain.com/myq)
