/* ==========================================================
   Sample Hyderabad / GHMC ward + MLA + MP dataset.

   NOTE: This is an illustrative, community-sourced dataset
   seeded with well-known GHMC divisions and their Assembly
   constituencies + Lok Sabha seats. It is *not* official —
   treat it as a starting point that the community can
   expand. Each ward is represented by an approximate
   center point; we pick the nearest ward to the user's
   GPS for "auto-detect".
   ========================================================== */

window.WARDS = [
  // ---------------- Central / Old City ----------------
  { id: 1,  name: "Charminar",        ac: "Charminar",           mla: "Mir Zulfeqar Ali",    mp: "Asaduddin Owaisi", lat: 17.3616, lng: 78.4747 },
  { id: 2,  name: "Ghansi Bazaar",    ac: "Charminar",           mla: "Mir Zulfeqar Ali",    mp: "Asaduddin Owaisi", lat: 17.3664, lng: 78.4712 },
  { id: 3,  name: "Falaknuma",        ac: "Chandrayangutta",     mla: "Akbaruddin Owaisi",   mp: "Asaduddin Owaisi", lat: 17.3320, lng: 78.4683 },
  { id: 4,  name: "Barkas",           ac: "Chandrayangutta",     mla: "Akbaruddin Owaisi",   mp: "Asaduddin Owaisi", lat: 17.3292, lng: 78.4972 },
  { id: 5,  name: "Chandrayangutta",  ac: "Chandrayangutta",     mla: "Akbaruddin Owaisi",   mp: "Asaduddin Owaisi", lat: 17.3345, lng: 78.5052 },
  { id: 6,  name: "Santosh Nagar",    ac: "Malakpet",            mla: "Ahmed Balala",        mp: "Asaduddin Owaisi", lat: 17.3522, lng: 78.5040 },
  { id: 7,  name: "Malakpet",         ac: "Malakpet",            mla: "Ahmed Balala",        mp: "Asaduddin Owaisi", lat: 17.3755, lng: 78.5025 },
  { id: 8,  name: "Nampally",         ac: "Nampally",            mla: "Mohammed Majid Hussain", mp: "Asaduddin Owaisi", lat: 17.3969, lng: 78.4667 },
  { id: 9,  name: "Mehdipatnam",      ac: "Karwan",              mla: "Kausar Mohiuddin",    mp: "Asaduddin Owaisi", lat: 17.3939, lng: 78.4376 },
  { id: 10, name: "Karwan",           ac: "Karwan",              mla: "Kausar Mohiuddin",    mp: "Asaduddin Owaisi", lat: 17.3790, lng: 78.4450 },
  { id: 11, name: "Tolichowki",       ac: "Karwan",              mla: "Kausar Mohiuddin",    mp: "Asaduddin Owaisi", lat: 17.4020, lng: 78.4202 },
  { id: 12, name: "Yakutpura",        ac: "Yakutpura",           mla: "Jaffar Hussain",      mp: "Asaduddin Owaisi", lat: 17.3525, lng: 78.4794 },

  // ---------------- Secunderabad / North ----------------
  { id: 13, name: "Begumpet",         ac: "Sanathnagar",         mla: "Kolan Hanumantha Reddy", mp: "Etala Rajender", lat: 17.4446, lng: 78.4616 },
  { id: 14, name: "Ameerpet",         ac: "Khairatabad",         mla: "Danam Nagender",      mp: "Etala Rajender",   lat: 17.4375, lng: 78.4483 },
  { id: 15, name: "Sanathnagar",      ac: "Sanathnagar",         mla: "Kolan Hanumantha Reddy", mp: "Etala Rajender", lat: 17.4521, lng: 78.4356 },
  { id: 16, name: "Khairatabad",      ac: "Khairatabad",         mla: "Danam Nagender",      mp: "Etala Rajender",   lat: 17.4140, lng: 78.4638 },
  { id: 17, name: "Somajiguda",       ac: "Khairatabad",         mla: "Danam Nagender",      mp: "Etala Rajender",   lat: 17.4242, lng: 78.4603 },
  { id: 18, name: "Banjara Hills",    ac: "Khairatabad",         mla: "Danam Nagender",      mp: "Etala Rajender",   lat: 17.4156, lng: 78.4347 },
  { id: 19, name: "Jubilee Hills",    ac: "Jubilee Hills",       mla: "Maganti Sunita",      mp: "Etala Rajender",   lat: 17.4314, lng: 78.4132 },
  { id: 20, name: "Yousufguda",       ac: "Jubilee Hills",       mla: "Maganti Sunita",      mp: "Etala Rajender",   lat: 17.4382, lng: 78.4297 },
  { id: 21, name: "Borabanda",        ac: "Jubilee Hills",       mla: "Maganti Sunita",      mp: "Etala Rajender",   lat: 17.4489, lng: 78.4216 },
  { id: 22, name: "Musheerabad",      ac: "Musheerabad",         mla: "Anjan Kumar Yadav",   mp: "Etala Rajender",   lat: 17.4236, lng: 78.5051 },
  { id: 23, name: "Ramgopalpet",      ac: "Musheerabad",         mla: "Anjan Kumar Yadav",   mp: "Etala Rajender",   lat: 17.4358, lng: 78.4925 },
  { id: 24, name: "Gandhinagar",      ac: "Musheerabad",         mla: "Anjan Kumar Yadav",   mp: "Etala Rajender",   lat: 17.4418, lng: 78.5008 },
  { id: 25, name: "Secunderabad",     ac: "Secunderabad",        mla: "T. Padma Rao Goud",   mp: "Etala Rajender",   lat: 17.4399, lng: 78.4983 },
  { id: 26, name: "Marredpally",      ac: "Secunderabad",        mla: "T. Padma Rao Goud",   mp: "Etala Rajender",   lat: 17.4488, lng: 78.5062 },
  { id: 27, name: "Tarnaka",          ac: "Secunderabad Cantt",  mla: "G. Lasya Nanditha",   mp: "Etala Rajender",   lat: 17.4283, lng: 78.5377 },
  { id: 28, name: "Bowenpally",       ac: "Secunderabad Cantt",  mla: "G. Lasya Nanditha",   mp: "Etala Rajender",   lat: 17.4698, lng: 78.4857 },

  // ---------------- IT / West ----------------
  { id: 29, name: "Madhapur",         ac: "Serilingampally",     mla: "A. Gandhi",           mp: "Kothapally Geetha", lat: 17.4483, lng: 78.3915 },
  { id: 30, name: "HITEC City",       ac: "Serilingampally",     mla: "A. Gandhi",           mp: "Kothapally Geetha", lat: 17.4435, lng: 78.3772 },
  { id: 31, name: "Gachibowli",       ac: "Serilingampally",     mla: "A. Gandhi",           mp: "Kothapally Geetha", lat: 17.4400, lng: 78.3489 },
  { id: 32, name: "Kondapur",         ac: "Serilingampally",     mla: "A. Gandhi",           mp: "Kothapally Geetha", lat: 17.4641, lng: 78.3654 },
  { id: 33, name: "Kukatpally",       ac: "Kukatpally",          mla: "Madhavaram Krishna Rao", mp: "Kothapally Geetha", lat: 17.4948, lng: 78.4011 },
  { id: 34, name: "Moosapet",         ac: "Kukatpally",          mla: "Madhavaram Krishna Rao", mp: "Kothapally Geetha", lat: 17.4706, lng: 78.4278 },
  { id: 35, name: "Miyapur",          ac: "Kukatpally",          mla: "Madhavaram Krishna Rao", mp: "Kothapally Geetha", lat: 17.5050, lng: 78.3726 },
  { id: 36, name: "Hafeezpet",        ac: "Serilingampally",     mla: "A. Gandhi",           mp: "Kothapally Geetha", lat: 17.4830, lng: 78.3769 },
  { id: 37, name: "Chanda Nagar",     ac: "Serilingampally",     mla: "A. Gandhi",           mp: "Kothapally Geetha", lat: 17.4993, lng: 78.3430 },
  { id: 38, name: "Lingampally",      ac: "Serilingampally",     mla: "A. Gandhi",           mp: "Kothapally Geetha", lat: 17.4830, lng: 78.3161 },

  // ---------------- North / LB Nagar ring ----------------
  { id: 39, name: "Alwal",            ac: "Quthbullapur",        mla: "KP Vivekanand",       mp: "Etala Rajender",   lat: 17.5047, lng: 78.5059 },
  { id: 40, name: "Quthbullapur",     ac: "Quthbullapur",        mla: "KP Vivekanand",       mp: "Etala Rajender",   lat: 17.5107, lng: 78.4556 },
  { id: 41, name: "Jeedimetla",       ac: "Quthbullapur",        mla: "KP Vivekanand",       mp: "Etala Rajender",   lat: 17.5215, lng: 78.4516 },
  { id: 42, name: "Malkajgiri",       ac: "Malkajgiri",          mla: "Mynampally Hanumantha Rao", mp: "Eatala Rajender", lat: 17.4501, lng: 78.5272 },
  { id: 43, name: "Neredmet",         ac: "Malkajgiri",          mla: "Mynampally Hanumantha Rao", mp: "Eatala Rajender", lat: 17.4744, lng: 78.5497 },
  { id: 44, name: "Uppal",            ac: "Uppal",               mla: "Bandari Laxma Reddy", mp: "Kondapalli Sridhar", lat: 17.4055, lng: 78.5590 },
  { id: 45, name: "Nagole",           ac: "Uppal",               mla: "Bandari Laxma Reddy", mp: "Kondapalli Sridhar", lat: 17.3878, lng: 78.5588 },
  { id: 46, name: "LB Nagar",         ac: "LB Nagar",            mla: "Sudheer Reddy",       mp: "Kondapalli Sridhar", lat: 17.3473, lng: 78.5508 },
  { id: 47, name: "Vanasthalipuram",  ac: "LB Nagar",            mla: "Sudheer Reddy",       mp: "Kondapalli Sridhar", lat: 17.3360, lng: 78.5711 },
  { id: 48, name: "Saroornagar",      ac: "LB Nagar",            mla: "Sudheer Reddy",       mp: "Kondapalli Sridhar", lat: 17.3470, lng: 78.5416 },
  { id: 49, name: "Hayathnagar",      ac: "LB Nagar",            mla: "Sudheer Reddy",       mp: "Kondapalli Sridhar", lat: 17.3377, lng: 78.6057 },
  { id: 50, name: "Abids",            ac: "Nampally",            mla: "Mohammed Majid Hussain", mp: "Asaduddin Owaisi", lat: 17.3925, lng: 78.4747 }
];

/**
 * Find the nearest ward to a given coordinate. This is an MVP
 * approximation — a production site would use actual ward polygon
 * boundaries (GeoJSON) + point-in-polygon.
 */
window.findNearestWard = function (lat, lng) {
  let best = null;
  let bestDist = Infinity;
  for (const w of window.WARDS) {
    const dLat = w.lat - lat;
    const dLng = w.lng - lng;
    const d2 = dLat * dLat + dLng * dLng; // good enough for ranking
    if (d2 < bestDist) {
      bestDist = d2;
      best = w;
    }
  }
  return best;
};
