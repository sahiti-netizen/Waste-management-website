/* ==========================================================
   Sample reports used to seed the public map + leaderboard
   on a fresh visit. In a real deployment these would come
   from an API. Citizen-submitted reports (via the form) are
   appended to this list in memory for the current session.
   ========================================================== */

window.SAMPLE_REPORTS = [
  { id: "r-001", lat: 17.4156, lng: 78.4347, ward: "Banjara Hills",   category: "Overflowing bin",       ageDays: 1,  status: "new"  },
  { id: "r-002", lat: 17.4314, lng: 78.4132, ward: "Jubilee Hills",   category: "Illegal dump",          ageDays: 4,  status: "open" },
  { id: "r-003", lat: 17.4483, lng: 78.3915, ward: "Madhapur",        category: "Construction debris",   ageDays: 2,  status: "new"  },
  { id: "r-004", lat: 17.4400, lng: 78.3489, ward: "Gachibowli",      category: "Overflowing bin",       ageDays: 6,  status: "open" },
  { id: "r-005", lat: 17.4948, lng: 78.4011, ward: "Kukatpally",      category: "Blocked drain",         ageDays: 20, status: "ignored" },
  { id: "r-006", lat: 17.3473, lng: 78.5508, ward: "LB Nagar",        category: "Illegal dump",          ageDays: 18, status: "ignored" },
  { id: "r-007", lat: 17.4055, lng: 78.5590, ward: "Uppal",           category: "Overflowing bin",       ageDays: 9,  status: "open" },
  { id: "r-008", lat: 17.3616, lng: 78.4747, ward: "Charminar",       category: "Dead animal",           ageDays: 3,  status: "new"  },
  { id: "r-009", lat: 17.3320, lng: 78.4683, ward: "Falaknuma",       category: "Illegal dump",          ageDays: 22, status: "ignored" },
  { id: "r-010", lat: 17.3969, lng: 78.4667, ward: "Nampally",        category: "Overflowing bin",       ageDays: 5,  status: "open" },
  { id: "r-011", lat: 17.4446, lng: 78.4616, ward: "Begumpet",        category: "Blocked drain",         ageDays: 7,  status: "open" },
  { id: "r-012", lat: 17.4399, lng: 78.4983, ward: "Secunderabad",    category: "Construction debris",   ageDays: 11, status: "open" },
  { id: "r-013", lat: 17.5047, lng: 78.5059, ward: "Alwal",           category: "Overflowing bin",       ageDays: 15, status: "ignored" },
  { id: "r-014", lat: 17.4501, lng: 78.5272, ward: "Malkajgiri",      category: "Illegal dump",          ageDays: 17, status: "ignored" },
  { id: "r-015", lat: 17.3939, lng: 78.4376, ward: "Mehdipatnam",     category: "Overflowing bin",       ageDays: 2,  status: "new"  },
  { id: "r-016", lat: 17.4020, lng: 78.4202, ward: "Tolichowki",      category: "Blocked drain",         ageDays: 10, status: "open" },
  { id: "r-017", lat: 17.4375, lng: 78.4483, ward: "Ameerpet",        category: "Overflowing bin",       ageDays: 1,  status: "done" },
  { id: "r-018", lat: 17.3755, lng: 78.5025, ward: "Malakpet",        category: "Illegal dump",          ageDays: 25, status: "ignored" },
  { id: "r-019", lat: 17.5050, lng: 78.3726, ward: "Miyapur",         category: "Construction debris",   ageDays: 12, status: "open" },
  { id: "r-020", lat: 17.4641, lng: 78.3654, ward: "Kondapur",        category: "Overflowing bin",       ageDays: 3,  status: "new"  },
  { id: "r-021", lat: 17.3345, lng: 78.5052, ward: "Chandrayangutta", category: "Illegal dump",          ageDays: 30, status: "ignored" },
  { id: "r-022", lat: 17.3378, lng: 78.6057, ward: "Hayathnagar",     category: "Blocked drain",         ageDays: 8,  status: "open" },
  { id: "r-023", lat: 17.3470, lng: 78.5416, ward: "Saroornagar",     category: "Overflowing bin",       ageDays: 16, status: "ignored" },
  { id: "r-024", lat: 17.4521, lng: 78.4356, ward: "Sanathnagar",     category: "Construction debris",   ageDays: 5,  status: "open" },
  { id: "r-025", lat: 17.4283, lng: 78.5377, ward: "Tarnaka",         category: "Overflowing bin",       ageDays: 6,  status: "open" },
  { id: "r-026", lat: 17.4236, lng: 78.5051, ward: "Musheerabad",     category: "Illegal dump",          ageDays: 21, status: "ignored" }
];

// Live reports added via the form are appended here (in-memory only)
window.LIVE_REPORTS = [];
