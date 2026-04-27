# ReLoop — Recycle, get paid, shop greener

A static, no-build recycling-rewards website. Tells users what's recyclable,
identifies items from a photo with an in-browser AI model, surfaces nearby
verified recyclers on a map, books doorstep pickups, credits **Green Points**
for every kilogram, and lets users spend those points on UPI cash-outs,
vouchers, eco-friendly goods or donations.

> Built as a single page with anchor navigation. Pure HTML / CSS / vanilla JS.
> Deployable as-is to GitHub Pages, Netlify, Vercel, Cloudflare Pages.

---

## What it does

1. **What can I recycle?** A searchable, chip-filterable guide of ~28 common
   household items with verdicts (`yes` / `sometimes` / `no`), points-per-kg
   and prep tips.
2. **Snap & Sort (AI scanner).** Drag a photo onto the page (or use your
   phone camera). TensorFlow.js + MobileNet classify the object **entirely
   in your browser** — image bytes never leave the device. We map the
   prediction to a recyclable item, show the verdict, top-3 guesses, and
   offer a one-tap *"Add to my pickup"* hand-off.
3. **Local recyclers.** A Leaflet + OpenStreetMap directory of verified
   collectors. Tap **Use my location** to sort by distance, filter by
   material or doorstep-pickup capability, then call or get directions.
4. **Doorstep pickup.** Pick a date and slot, tick rough kilograms per
   material — the form runs a live points + cash-equivalent estimator.
   Confirming credits points to your wallet and writes a structured history
   entry.
5. **Rewards dashboard.** Live points balance, total kilograms recycled,
   estimated CO₂ averted, and a timeline of every earn/spend event.
6. **Reward shop.** Redeem points for UPI cash, retail vouchers, eco
   goods, or donations to partner NGOs. Items you can't afford gracefully
   show a "need N more pts" hint.

---

## Stack

- **Pure HTML / CSS / JS** — no framework, no build step.
- **[Leaflet](https://leafletjs.com/)** + **OpenStreetMap** for the recycler map.
- **[TensorFlow.js](https://www.tensorflow.org/js) + [MobileNet](https://github.com/tensorflow/tfjs-models/tree/master/mobilenet)**
  for the AI scanner (loaded lazily from CDN; the ~5 MB model is fetched
  on first scan and cached).
- Browser **Geolocation API** for distance sorting.
- **`localStorage`** keyed at `reloop:user` for points + history + profile.
- **Inter** via Google Fonts.

---

## File layout

```
.
├── index.html                 Single-page shell (all sections)
├── css/styles.css             Eco green/sand theme, responsive
├── js/
│   ├── app.js                 Shared state, modal, nav drawer, data-bind paint
│   ├── guide.js               Recyclables guide (search + chip filters)
│   ├── scan.js                Snap & Sort: TF.js + MobileNet + mapping
│   ├── recyclers.js           Leaflet map + geolocation + distance sort
│   ├── pickup.js              Pickup form, live estimator, scanner hand-off
│   ├── rewards.js             Dashboard history list
│   └── shop.js                Reward shop + redemption modal
└── data/
    ├── recyclables.js         ~28 items with category, verdict, pts/kg, tip
    ├── recyclers.js           Sample verified recyclers (Hyderabad seed data)
    ├── products.js            Reward shop catalogue
    └── material-map.js        ImageNet labels → recyclable item IDs
```

---

## Running locally

No build step. Serve the folder:

```bash
# Python
python3 -m http.server 8080
# or Node
npx serve .
```

Open <http://localhost:8080>.

> **Geolocation requires HTTPS** on most browsers (except `localhost`).
> When deployed, host behind HTTPS — GitHub Pages, Netlify, Vercel and
> Cloudflare Pages do this out of the box.

---

## State model

Everything user-specific lives at `localStorage["reloop:user"]`:

```jsonc
{
  "points": 1240,
  "profile": { "name": "...", "phone": "...", "pin": "...", "address": "..." },
  "history": [
    { "type": "earn",   "ts": 1714050000000, "kg": 4.2, "points": 340,
      "materials": ["Paper", "Plastic"], "items": [/* ... */],
      "date": "2026-04-30", "slot": "9-11 AM" },
    { "type": "redeem", "ts": 1714060000000, "productId": "upi-100",
      "points": -1000 }
  ]
}
```

Modules call `ReLoop.getState()` / `ReLoop.updateState(fn)`. Every save
fires a `reloop:state` CustomEvent so the dashboard, shop and points chip
re-paint automatically.

---

## How the AI scanner works

1. The user drops or selects a photo.
2. `scan.js` lazy-loads MobileNet (cached after first run).
3. `model.classify(img, 5)` returns ImageNet predictions.
4. We walk the predictions against `data/material-map.js`. The first
   substring match wins (so `"water bottle, water bottle"` matches the
   `pet-bottle` pattern and inherits its category and per-kg points).
5. Unmatched predictions fall through to an "Unknown" verdict pointing
   the user at the guide.

The model and image bytes never leave the browser.

---

## Demo data disclaimer

Recyclers in `data/recyclers.js` are illustrative samples in Hyderabad.
Per-kg point rates are tuned for a smooth demo, not market-accurate.
For production:

- Back recyclers with a real directory + admin tooling.
- Replace the points formula with rates negotiated per partner.
- Add a backend (Supabase / Firebase / Cloudflare D1) to sync state
  across devices and enable real cash-outs / voucher fulfilment.
- Swap MobileNet for a finer-grained recyclables-specific model, or
  proxy to a vision API for higher accuracy.

---

## Roadmap

- [ ] Backend for state sync + real fulfilment.
- [ ] Phone OTP login.
- [ ] Per-partner per-material pricing.
- [ ] Push notifications when a recycler accepts a slot.
- [ ] Custom recyclables-only image model to replace MobileNet.
- [ ] Multilingual UI (Hindi, Telugu, Tamil, Kannada).
- [ ] Carbon-credit reporting export for businesses.

---

## License

MIT — do whatever you want, credit appreciated.
