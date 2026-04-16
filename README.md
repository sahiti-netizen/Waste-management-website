# ManaChetta — Hyderabad's Citizen Garbage Map

A crowdsourced, citizen-first platform that lets Hyderabad residents report
garbage and sanitation issues in 30 seconds — one photo, auto-detected GHMC
ward, auto-attached MLA / MP, and one-tap forwarding to the GHMC citizen
helpline on WhatsApp.

> Inspired by [NammaKasa](https://www.nammakasa.in) (Bengaluru). Adapted for
> GHMC wards, Telangana MLAs, and Hyderabad Lok Sabha MPs.

**Brand**: *ManaChetta* — Telugu for *"our garbage"* (మన చెత్త).

---

## What it does

1. **One-photo reports.** Citizens take a picture of a garbage pile, black
   spot, illegal dump, or broken drain. The browser captures location from
   GPS.
2. **Auto-detect ward / MLA / MP.** Coordinates are matched against a GHMC
   ward dataset to tag the correct ward, Assembly constituency MLA, and Lok
   Sabha MP.
3. **Public map.** Every report is pinned to a Leaflet map of Hyderabad and
   color-coded by age (new / open / ignored / cleared).
4. **Accountability leaderboard.** Wards, MLAs, and MPs are ranked by
   unresolved reports — public list, public accountability.
5. **One-tap WhatsApp to GHMC.** The "Send to GHMC" button opens WhatsApp
   with a pre-filled message to the GHMC citizen helpline, containing the
   category, ward, MLA, MP, landmark, and a Google Maps link to the
   location.

---

## Stack

- **Pure HTML / CSS / JS** — no build step, no framework. Deploy anywhere.
- **[Leaflet](https://leafletjs.com/)** for the interactive map with
  OpenStreetMap tiles.
- **Inter + Noto Sans Telugu** via Google Fonts.
- Browser **Geolocation API** for location detection.
- Static sample data in `data/wards.js` and `data/reports.js`.

## File layout

```
.
├── index.html              Landing page (all sections)
├── css/styles.css          All styling
├── js/app.js               Nav, form, geolocation, WhatsApp hand-off
├── js/map.js               Leaflet map + pins
├── js/leaderboard.js       Ranked ward / MLA / MP leaderboard
├── data/wards.js           Sample GHMC ward → MLA / MP dataset
└── data/reports.js         Sample reports seeding the map + leaderboard
```

## Running locally

No build step required. Just serve the folder:

```bash
# Python
python3 -m http.server 8080

# or Node
npx serve .
```

Then open <http://localhost:8080>.

> **Geolocation requires HTTPS** on most browsers (except `localhost`). When
> deployed, host behind HTTPS — GitHub Pages, Netlify, Vercel, Cloudflare
> Pages all work out of the box.

## Deploying

Because the site is fully static, you can drop the folder onto any host:

- **GitHub Pages** — push to `main` and enable Pages (root directory).
- **Netlify / Vercel / Cloudflare Pages** — connect the repo, no build
  command, publish directory is the repo root.

---

## Data disclaimer

`data/wards.js` contains an **illustrative, community-sourced** mapping of
~50 prominent GHMC wards to Assembly constituencies, MLAs, and MPs. It is
*not* an official dataset.

For production:

1. Replace the flat ward list with official **GHMC ward polygons**
   (GeoJSON). Hyderabad has ~150 GHMC wards in total.
2. Replace the `findNearestWard()` helper with a proper
   **point-in-polygon** check (`@turf/boolean-point-in-polygon` or
   similar).
3. Refresh the MLA / MP mapping after each election cycle — Telangana
   Assembly elections and Lok Sabha general elections.
4. Back the reports with a persistent store (Supabase / Firebase /
   Cloudflare D1 etc.) so the map survives page reloads.

---

## Roadmap

- [ ] Swap sample wards for official GHMC ward GeoJSON polygons.
- [ ] Persist citizen reports on a backend (currently in-memory only).
- [ ] Photo upload + storage (S3 / R2 / Supabase Storage).
- [ ] GHMC complaint ticket lookup — check status by ticket ID.
- [ ] Push notifications when your report is resolved.
- [ ] Telugu-language UI toggle.
- [ ] Weekly email to MLAs with their unresolved reports.

---

## Credits

- [NammaKasa](https://www.nammakasa.in) for the original idea and template.
- [Leaflet](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/) for the map.
- GHMC and local authorities — the people this is meant to help, not
  shame.

## License

MIT — do whatever you want, credit appreciated.
