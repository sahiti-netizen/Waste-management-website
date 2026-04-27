// Maps MobileNet / ImageNet class labels to a recyclable item in
// data/recyclables.js plus a friendlier material description.
//
// Matching is substring-based and case-insensitive. ImageNet class names
// often contain a comma-separated list of synonyms (a WordNet synset) —
// e.g. "water bottle, water bottle" — so any token in `match` that
// appears anywhere in the label is enough to win.
//
// `recyclableId` references an item id in window.RECYCLABLES so the
// scanner can borrow its category, points-per-kg and prep tip without
// duplicating that data.
window.MATERIAL_MAP = {
  patterns: [
    // ---- Plastic ----
    { match: ["water bottle", "pop bottle", "soda bottle"],
      recyclableId: "pet-bottle",
      material: "PET plastic (#1)" },
    { match: ["beer bottle", "wine bottle"],
      recyclableId: "glass-bottle",
      material: "Glass" },
    { match: ["plastic bag", "shopping bag", "carrier bag", "packet"],
      recyclableId: "carry-bag",
      material: "Thin plastic film" },
    { match: ["pill bottle", "shampoo", "lotion", "detergent"],
      recyclableId: "hdpe-bottle",
      material: "HDPE plastic (#2)" },
    { match: ["yogurt", "tub", "container"],
      recyclableId: "pp-container",
      material: "Polypropylene tub (#5)" },

    // ---- E-waste ----
    { match: ["cellular telephone", "cellphone", "cell phone", "smartphone",
              "iphone", "mobile phone", "ipod", "hand-held"],
      recyclableId: "phone",
      material: "Mixed metals + lithium battery" },
    { match: ["laptop", "notebook computer", "desktop computer", "monitor",
              "screen", "crt", "television"],
      recyclableId: "laptop",
      material: "Mixed metals + plastic + battery" },
    { match: ["battery"],
      recyclableId: "battery",
      material: "Lithium / alkaline cells" },
    { match: ["cable", "extension cord", "power cord", "charger"],
      recyclableId: "cables",
      material: "Copper + plastic insulation" },
    { match: ["light bulb", "fluorescent", "lamp"],
      recyclableId: "bulb",
      material: "Glass + tungsten / mercury" },
    { match: ["printer", "scanner", "modem", "router", "keyboard", "mouse",
              "remote control"],
      recyclableId: "laptop",
      material: "Mixed electronic waste" },

    // ---- Paper ----
    { match: ["newspaper", "newsprint", "comic book"],
      recyclableId: "newspaper",
      material: "Newsprint paper" },
    { match: ["envelope", "binder", "book jacket", "menu", "magazine"],
      recyclableId: "office-paper",
      material: "Mixed paper" },
    { match: ["carton", "cardboard", "shipping container", "crate", "packing"],
      recyclableId: "cardboard",
      material: "Corrugated cardboard" },
    { match: ["paper towel", "tissue", "diaper"],
      recyclableId: "tissue",
      material: "Paper fibre (too short to recycle)" },

    // ---- Metal ----
    { match: ["beer can", "soda can", "pop can"],
      recyclableId: "aluminium-can",
      material: "Aluminium" },
    { match: ["tin can", "milk can", "can opener"],
      recyclableId: "steel-can",
      material: "Steel" },
    { match: ["spoon", "fork", "knife", "ladle", "frying pan", "wok",
              "saucepan", "skillet", "pot"],
      recyclableId: "scrap-metal",
      material: "Stainless / scrap metal" },

    // ---- Glass ----
    { match: ["wine glass", "goblet", "beaker", "vase"],
      recyclableId: "glass-bottle",
      material: "Container glass" },

    // ---- Textile ----
    { match: ["jersey", "t-shirt", "tee shirt", "sweatshirt", "cardigan",
              "abaya", "kimono", "miniskirt", "jean", "trench coat",
              "lab coat", "sock", "stocking", "shoe", "running shoe",
              "sandal", "loafer", "sneaker", "bath towel"],
      recyclableId: "clothes",
      material: "Textile" },

    // ---- Organic ----
    { match: ["banana", "lemon", "orange", "apple", "pomegranate",
              "strawberry", "broccoli", "cabbage", "cucumber", "head cabbage",
              "mushroom", "pineapple"],
      recyclableId: "kitchen-scraps",
      material: "Organic waste" },
  ],

  // Fallback when nothing in the list matches — used to show a sensible
  // "we don't know, check the guide" state in the UI.
  unknown: {
    material: "Material unclear",
    note: "We couldn't match this to a known item. Try our guide below.",
  },
};
