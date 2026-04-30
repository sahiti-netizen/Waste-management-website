// Database of household recyclables. Each item carries three payout
// options the user picks between at pickup time:
//
//   cashPerKg     — rupees paid in person by the recycler
//   upiPerKg      — rupees credited to the user's UPI within 48h
//   pointsPerKg   — Green Points credited instantly (1 point = ₹0.10
//                   redeem value, but rates are calibrated at ×12 so
//                   choosing points gives a ~20 % bonus over cash)
//
// `image` is an Iconify Noto SVG URL — each item gets a unique
// full-colour illustration so the Guide isn't a sea of identical emojis.
//
// Items that aren't recyclable at all (expired medicines, broken glass,
// styrofoam, multi-laminate wrappers, tissue) have been dropped — the
// guide is meant to be actionable, not a discouragement list.

const ICON = name => `https://api.iconify.design/noto/${name}.svg`;

window.RECYCLABLES = [
  // ---- Paper ----
  { id: "newspaper",     name: "Newspaper",                category: "Paper",
    image: ICON("newspaper"),
    recyclable: "yes",
    cashPerKg: 14, upiPerKg: 14, pointsPerKg: 168,
    tip: "Keep dry. Bundle and tie. Avoid mixing with food-soiled paper." },
  { id: "cardboard",     name: "Cardboard / Box",          category: "Paper",
    image: ICON("package"),
    recyclable: "yes",
    cashPerKg: 10, upiPerKg: 10, pointsPerKg: 120,
    tip: "Flatten boxes. Remove tape and plastic windows." },
  { id: "office-paper",  name: "Office paper",             category: "Paper",
    image: ICON("bookmark-tabs"),
    recyclable: "yes",
    cashPerKg: 12, upiPerKg: 12, pointsPerKg: 144,
    tip: "Staples are fine. Shredded paper goes in a paper bag." },
  { id: "tetrapak",      name: "Tetra Pak carton",         category: "Paper",
    image: ICON("milk"),
    recyclable: "sometimes",
    cashPerKg: 4,  upiPerKg: 4,  pointsPerKg: 48,
    tip: "Rinse. Drop at a Tetra Pak collection point — most curb-side recyclers won't take these." },

  // ---- Plastic ----
  { id: "pet-bottle",    name: "PET bottle (#1)",          category: "Plastic",
    image: ICON("bottle-with-popping-cork"),
    recyclable: "yes",
    cashPerKg: 10, upiPerKg: 10, pointsPerKg: 120,
    tip: "Empty, rinse, replace cap. PET is the most recycled plastic in India." },
  { id: "hdpe-bottle",   name: "Shampoo / detergent bottle (#2)", category: "Plastic",
    image: ICON("lotion-bottle"),
    recyclable: "yes",
    cashPerKg: 15, upiPerKg: 15, pointsPerKg: 180,
    tip: "Rinse. Caps and pumps can stay on." },
  { id: "pp-container",  name: "Curd / takeaway tub (#5)", category: "Plastic",
    image: ICON("takeout-box"),
    recyclable: "yes",
    cashPerKg: 10, upiPerKg: 10, pointsPerKg: 120,
    tip: "Rinse off oil and food. Lids are usually a different plastic — separate them." },
  { id: "carry-bag",     name: "Thin carry bag / film",    category: "Plastic",
    image: ICON("shopping-bags"),
    recyclable: "sometimes",
    cashPerKg: 3,  upiPerKg: 3,  pointsPerKg: 36,
    tip: "Curb-side machines jam on these. Take to a soft-plastic drop-off point." },

  // ---- Metal ----
  { id: "aluminium-can", name: "Aluminium can",            category: "Metal",
    image: ICON("cup-with-straw"),
    recyclable: "yes",
    cashPerKg: 120, upiPerKg: 120, pointsPerKg: 1440,
    tip: "Rinse. Aluminium recycles forever and is the most valuable curb-side material." },
  { id: "steel-can",     name: "Steel / tin can",          category: "Metal",
    image: ICON("canned-food"),
    recyclable: "yes",
    cashPerKg: 30, upiPerKg: 30, pointsPerKg: 360,
    tip: "Rinse. Remove paper labels if you can." },
  { id: "scrap-metal",   name: "Scrap metal / utensils",   category: "Metal",
    image: ICON("hammer-and-wrench"),
    recyclable: "yes",
    cashPerKg: 35, upiPerKg: 35, pointsPerKg: 420,
    tip: "Most local kabadiwalas pay by weight." },
  { id: "foil",          name: "Aluminium foil",           category: "Metal",
    image: ICON("scroll"),
    recyclable: "sometimes",
    cashPerKg: 15, upiPerKg: 15, pointsPerKg: 180,
    tip: "Only if clean and balled up to roughly tennis-ball size." },

  // ---- Glass ----
  { id: "glass-bottle",  name: "Glass bottle / jar",       category: "Glass",
    image: ICON("wine-glass"),
    recyclable: "yes",
    cashPerKg: 3,  upiPerKg: 3,  pointsPerKg: 36,
    tip: "Rinse. Lids off (metal lids recycle separately)." },

  // ---- E-waste ----
  { id: "phone",         name: "Old smartphone",           category: "E-waste",
    image: ICON("mobile-phone"),
    recyclable: "yes",
    cashPerKg: 2500, upiPerKg: 2500, pointsPerKg: 30000,
    tip: "Factory reset and remove the SIM. Drop at an authorised e-waste collector." },
  { id: "laptop",        name: "Laptop",                   category: "E-waste",
    image: ICON("laptop"),
    recyclable: "yes",
    cashPerKg: 600, upiPerKg: 600, pointsPerKg: 7200,
    tip: "Wipe the disk. Most manufacturers run take-back programs." },
  { id: "battery",       name: "Used batteries",           category: "E-waste",
    image: ICON("battery"),
    recyclable: "yes",
    cashPerKg: 60, upiPerKg: 60, pointsPerKg: 720,
    tip: "Tape over the terminals on lithium batteries before drop-off." },
  { id: "cables",        name: "Cables / chargers",        category: "E-waste",
    image: ICON("electric-plug"),
    recyclable: "yes",
    cashPerKg: 80, upiPerKg: 80, pointsPerKg: 960,
    tip: "Bundle and tie. Copper inside is valuable." },
  { id: "bulb",          name: "CFL / fluorescent bulb",   category: "E-waste",
    image: ICON("light-bulb"),
    recyclable: "sometimes",
    cashPerKg: 15, upiPerKg: 15, pointsPerKg: 180,
    tip: "Contains mercury — never bin it. Drop at a hazardous-waste collection point." },

  // ---- Organic ----
  { id: "kitchen-scraps", name: "Vegetable peels / scraps", category: "Organic",
    image: ICON("banana"),
    recyclable: "yes",
    cashPerKg: 2,  upiPerKg: 2,  pointsPerKg: 24,
    tip: "Compost at home or hand to a wet-waste collector." },
  { id: "garden-waste",  name: "Garden trimmings / leaves", category: "Organic",
    image: ICON("fallen-leaf"),
    recyclable: "yes",
    cashPerKg: 2,  upiPerKg: 2,  pointsPerKg: 24,
    tip: "Great for community compost pits." },

  // ---- Textile ----
  { id: "clothes",       name: "Old clothes / textiles",   category: "Textile",
    image: ICON("t-shirt"),
    recyclable: "yes",
    cashPerKg: 15, upiPerKg: 15, pointsPerKg: 180,
    tip: "Wearable goes to donation. Worn-out fabric goes to textile recyclers." },

  // ---- Hazardous (still recyclable through special channels) ----
  { id: "paint",         name: "Paint cans / solvents",    category: "Hazardous",
    image: ICON("artist-palette"),
    recyclable: "sometimes",
    cashPerKg: 8,  upiPerKg: 8,  pointsPerKg: 96,
    tip: "Never pour down the drain. Drop at a hazardous-waste centre." },
];

window.CATEGORIES = [
  { id: "Paper",     icon: "📄", color: "#b08a3e" },
  { id: "Plastic",   icon: "🧴", color: "#1a82c4" },
  { id: "Metal",     icon: "🥫", color: "#7a7a7a" },
  { id: "Glass",     icon: "🍾", color: "#3aa68f" },
  { id: "E-waste",   icon: "🔌", color: "#7d4cdb" },
  { id: "Organic",   icon: "🥬", color: "#5aa84a" },
  { id: "Textile",   icon: "👕", color: "#c9637a" },
  { id: "Hazardous", icon: "☣️",  color: "#c44b3a" },
];

// Conversion constants used across the app.
window.RATES = {
  POINTS_PER_RUPEE: 10,   // 1000 pts = ₹100 redeem value
  POINTS_BONUS:     1.20, // points payout is 20 % richer than cash payout
};
