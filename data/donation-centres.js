// Orphanages, NGOs and government schools that accept donated goods
// directly. Different from RECYCLERS — these places want usable items,
// not raw materials. Each entry lists what they take and the condition
// guidelines so donors don't show up with torn clothes or broken toys.
window.DONATION_CENTRES = [
  {
    id: "dc-snehagram",
    name: "Snehagram Children's Home",
    type: "orphanage",
    address: "Banjara Hills, Hyderabad",
    lat: 17.4180, lng: 78.4380,
    phone: "+91 90000 51111",
    needs: ["Textile", "Books", "Toys", "Stationery"],
    capacity: "60 children · ages 4-16",
    pickup: true,
  },
  {
    id: "dc-asha",
    name: "Asha Kiran Girls' Shelter",
    type: "orphanage",
    address: "Secunderabad",
    lat: 17.4435, lng: 78.4983,
    phone: "+91 90000 52222",
    needs: ["Textile", "Hygiene", "Books", "Stationery"],
    capacity: "45 girls · ages 6-18",
    pickup: true,
  },
  {
    id: "dc-zphs-kondapur",
    name: "ZPHS Kondapur (Govt. School)",
    type: "school",
    address: "Kondapur, Hyderabad",
    lat: 17.4670, lng: 78.3640,
    phone: "+91 90000 53333",
    needs: ["Books", "Stationery", "E-waste", "Games"],
    capacity: "320 students · classes 6-10",
    pickup: false,
  },
  {
    id: "dc-mpps-uppal",
    name: "MPPS Uppal (Govt. Primary)",
    type: "school",
    address: "Uppal, Hyderabad",
    lat: 17.4060, lng: 78.5590,
    phone: "+91 90000 54444",
    needs: ["Books", "Toys", "Stationery", "Textile"],
    capacity: "180 students · classes 1-5",
    pickup: false,
  },
  {
    id: "dc-goonj",
    name: "Goonj Hyderabad Hub",
    type: "ngo",
    address: "HITEC City, Hyderabad",
    lat: 17.4490, lng: 78.3905,
    phone: "+91 90000 55555",
    needs: ["Textile", "Hygiene", "Toys", "Books", "Stationery"],
    capacity: "Distributes across 23 states",
    pickup: true,
  },
  {
    id: "dc-bhumi",
    name: "Bhumi Volunteering Centre",
    type: "ngo",
    address: "Gachibowli, Hyderabad",
    lat: 17.4400, lng: 78.3490,
    phone: "+91 90000 56666",
    needs: ["Books", "Toys", "Games", "E-waste", "Stationery"],
    capacity: "After-school programme · 800 kids",
    pickup: true,
  },
];

// What a donor must check before a centre accepts a category.
// Centres use the same keys as `needs` above. Anything not listed here
// is taken as long as it isn't damaged.
window.DONATION_GUIDELINES = {
  Textile: {
    accept: [
      "Clean and freshly washed",
      "No tears, holes or major stains",
      "Buttons and zippers intact",
      "School uniforms in any size are especially welcome",
    ],
    reject: ["Innerwear (hygiene)", "Torn / heavily worn-out fabric", "Wet or musty items"],
  },
  Books: {
    accept: [
      "Textbooks (any board, last 5 years)",
      "Storybooks, comics, picture books",
      "Reference books, dictionaries, atlases",
      "Notebooks with at least 50% blank pages",
    ],
    reject: ["Books with missing pages or torn covers", "Heavily marked-up textbooks"],
  },
  Toys: {
    accept: [
      "Working condition with all parts",
      "Batteries optional but appreciated",
      "Soft toys must be cleaned / sanitised",
    ],
    reject: ["Broken pieces", "Toys with sharp edges", "Choking-hazard items for younger centres"],
  },
  Games: {
    accept: [
      "Board games with all pieces and rules",
      "Puzzles with no missing pieces",
      "Sports equipment in usable condition",
    ],
    reject: ["Incomplete sets", "Damaged boards or cards"],
  },
  Stationery: {
    accept: [
      "Pens, pencils, sharpeners, erasers (used or new)",
      "Notebooks and exam pads",
      "Geometry boxes, calculators, drawing tools",
      "School bags in good condition",
    ],
    reject: ["Dried-up markers / pens"],
  },
  "E-waste": {
    accept: [
      "Working laptops, tablets, phones (with chargers)",
      "Functional printers and projectors",
      "Wiped of personal data",
    ],
    reject: [
      "Items with cracked screens beyond repair",
      "Devices missing batteries or power adapters",
    ],
  },
  Hygiene: {
    accept: [
      "Sealed sanitary products",
      "Soaps, shampoos, toothpaste (sealed)",
      "New menstrual cups / reusable products",
    ],
    reject: ["Opened or expired items"],
  },
};
