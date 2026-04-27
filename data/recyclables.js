// Database of common items and how to recycle them.
// pointsPerKg: green points awarded per kilogram for that item.
// recyclable: yes / no / sometimes (special drop-off needed).
window.RECYCLABLES = [
  // Paper
  { id: "newspaper",     name: "Newspaper",                 category: "Paper",     recyclable: "yes",       pointsPerKg: 8,
    tip: "Keep dry. Bundle and tie. Avoid mixing with food-soiled paper." },
  { id: "cardboard",     name: "Cardboard / Corrugated box", category: "Paper",    recyclable: "yes",       pointsPerKg: 10,
    tip: "Flatten boxes. Remove tape and plastic windows." },
  { id: "office-paper",  name: "Office paper",              category: "Paper",     recyclable: "yes",       pointsPerKg: 12,
    tip: "Staples are fine. Shredded paper goes in a paper bag." },
  { id: "tetrapak",      name: "Tetra Pak carton",          category: "Paper",     recyclable: "sometimes", pointsPerKg: 6,
    tip: "Rinse. Most curb-side bins won't take these — drop at a Tetra Pak collection point." },
  { id: "tissue",        name: "Tissue / paper napkin",     category: "Paper",     recyclable: "no",        pointsPerKg: 0,
    tip: "Fibres are too short to recycle. Compost if unsoiled." },

  // Plastic
  { id: "pet-bottle",    name: "PET bottle (#1)",           category: "Plastic",   recyclable: "yes",       pointsPerKg: 18,
    tip: "Empty, rinse, replace cap. PET is the most recycled plastic in India." },
  { id: "hdpe-bottle",   name: "Shampoo / detergent bottle (#2 HDPE)", category: "Plastic", recyclable: "yes", pointsPerKg: 16,
    tip: "Rinse. Caps and pumps can stay on." },
  { id: "pp-container",  name: "Curd / takeaway tub (#5 PP)", category: "Plastic", recyclable: "yes",       pointsPerKg: 14,
    tip: "Rinse off oil and food. Lids are usually a different plastic — separate them." },
  { id: "carry-bag",     name: "Thin carry bag / plastic film", category: "Plastic", recyclable: "sometimes", pointsPerKg: 4,
    tip: "Curb-side machines jam on these. Take to a soft-plastic drop-off point." },
  { id: "ps-foam",       name: "Thermocol / styrofoam (#6 PS)", category: "Plastic", recyclable: "no",       pointsPerKg: 0,
    tip: "Most cities can't recycle this. Reuse or refuse." },
  { id: "multi-laminate", name: "Chips / biscuit wrapper (multi-layer)", category: "Plastic", recyclable: "no", pointsPerKg: 0,
    tip: "Mixed materials can't be separated. Bundle and dispose with dry waste." },

  // Metal
  { id: "aluminium-can", name: "Aluminium can",             category: "Metal",     recyclable: "yes",       pointsPerKg: 60,
    tip: "Rinse. Aluminium recycles forever and is the most valuable curb-side material." },
  { id: "steel-can",     name: "Steel / tin can",           category: "Metal",     recyclable: "yes",       pointsPerKg: 30,
    tip: "Rinse. Remove paper labels if you can." },
  { id: "scrap-metal",   name: "Scrap metal / utensils",    category: "Metal",     recyclable: "yes",       pointsPerKg: 35,
    tip: "Most local kabadiwalas pay by weight." },
  { id: "foil",          name: "Aluminium foil",            category: "Metal",     recyclable: "sometimes", pointsPerKg: 12,
    tip: "Only if clean and balled up to roughly tennis-ball size." },

  // Glass
  { id: "glass-bottle",  name: "Glass bottle / jar",        category: "Glass",     recyclable: "yes",       pointsPerKg: 6,
    tip: "Rinse. Lids off (metal lids recycle separately)." },
  { id: "broken-glass",  name: "Broken window / mirror glass", category: "Glass",  recyclable: "no",        pointsPerKg: 0,
    tip: "Different chemistry from container glass. Wrap and dispose with care." },

  // E-waste
  { id: "phone",         name: "Old smartphone",            category: "E-waste",   recyclable: "yes",       pointsPerKg: 400,
    tip: "Factory reset and remove the SIM. Drop at an authorised e-waste collector." },
  { id: "laptop",        name: "Laptop",                    category: "E-waste",   recyclable: "yes",       pointsPerKg: 250,
    tip: "Wipe the disk. Most manufacturers run take-back programs." },
  { id: "battery",       name: "Used batteries",            category: "E-waste",   recyclable: "yes",       pointsPerKg: 80,
    tip: "Tape over the terminals on lithium batteries before drop-off." },
  { id: "cables",        name: "Cables / chargers",         category: "E-waste",   recyclable: "yes",       pointsPerKg: 60,
    tip: "Bundle and tie. Copper inside is valuable." },
  { id: "bulb",          name: "CFL / fluorescent bulb",    category: "E-waste",   recyclable: "sometimes", pointsPerKg: 30,
    tip: "Contains mercury — never bin it. Drop at a hazardous-waste collection point." },

  // Organic
  { id: "kitchen-scraps", name: "Vegetable peels / kitchen scraps", category: "Organic", recyclable: "yes", pointsPerKg: 3,
    tip: "Compost at home or hand to a wet-waste collector." },
  { id: "garden-waste",  name: "Garden trimmings / leaves", category: "Organic",   recyclable: "yes",       pointsPerKg: 2,
    tip: "Great for community compost pits." },

  // Textile
  { id: "clothes",       name: "Old clothes / textiles",    category: "Textile",   recyclable: "yes",       pointsPerKg: 20,
    tip: "Wearable goes to donation. Worn-out fabric goes to textile recyclers." },

  // Hazardous (not curb-side)
  { id: "paint",         name: "Paint cans / solvents",     category: "Hazardous", recyclable: "sometimes", pointsPerKg: 10,
    tip: "Never pour down the drain. Drop at a hazardous-waste centre." },
  { id: "medicines",     name: "Expired medicines",         category: "Hazardous", recyclable: "no",        pointsPerKg: 0,
    tip: "Return to a pharmacy take-back program. Don't flush." },
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
