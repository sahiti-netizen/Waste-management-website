// Things users can redeem with their Green Points.
// 1 kg of mixed dry waste ≈ 10–20 points, so prices are tuned for that.
window.PRODUCTS = [
  // Cash-out
  { id: "upi-100",       name: "₹100 UPI cash-out",        type: "cashout",  price: 1000, kind: "cash",
    desc: "Direct UPI transfer to your bank account within 48 hours.", emoji: "💸" },
  { id: "upi-500",       name: "₹500 UPI cash-out",        type: "cashout",  price: 4800, kind: "cash",
    desc: "Direct UPI transfer to your bank account within 48 hours.", emoji: "💸" },

  // Vouchers
  { id: "amazon-200",    name: "₹200 Amazon voucher",      type: "voucher",  price: 2200, kind: "voucher",
    desc: "Digital code delivered to your registered email.", emoji: "🎁" },
  { id: "bigbasket-300", name: "₹300 BigBasket voucher",   type: "voucher",  price: 3300, kind: "voucher",
    desc: "Stock up on groceries — delivered as a digital code.", emoji: "🛒" },
  { id: "metro-100",     name: "₹100 Metro card top-up",   type: "voucher",  price: 1100, kind: "voucher",
    desc: "Top up your Hyderabad Metro smart card.", emoji: "🚇" },

  // Eco goods
  { id: "tote",          name: "Organic cotton tote bag",  type: "good",     price: 600,  kind: "ship",
    desc: "Replace 100+ plastic carry bags. Hand-stitched, fair-trade.", emoji: "👜" },
  { id: "bamboo-kit",    name: "Bamboo cutlery kit",       type: "good",     price: 900,  kind: "ship",
    desc: "Spoon, fork, knife, chopsticks and a brush in a cloth pouch.", emoji: "🥢" },
  { id: "compost-bin",   name: "2-tier home compost bin",  type: "good",     price: 4500, kind: "ship",
    desc: "Turn your kitchen scraps into garden gold. Free shipping.", emoji: "🪴" },
  { id: "steel-bottle",  name: "Insulated steel bottle",   type: "good",     price: 1500, kind: "ship",
    desc: "750ml. Replaces ~1,000 PET bottles a year.", emoji: "🧴" },
  { id: "menstrual-cup", name: "Reusable menstrual cup",   type: "good",     price: 1200, kind: "ship",
    desc: "Medical-grade silicone. Replaces years of disposable products.", emoji: "🌸" },

  // Services
  { id: "plant-sapling", name: "Tree planted in your name", type: "service", price: 300,  kind: "donate",
    desc: "We plant a native sapling with a partner NGO. You get a photo + GPS pin.", emoji: "🌳" },
  { id: "cleanup-spot",  name: "Sponsor a beach clean-up (1 hour)", type: "service", price: 800, kind: "donate",
    desc: "Funds one volunteer-hour of coastal clean-up. Photo proof shared.", emoji: "🏖️" },
  { id: "school-kit",    name: "Donate a school kit to a child", type: "service", price: 1500, kind: "donate",
    desc: "Notebooks + pens + bag for one child for a school year.", emoji: "🎒" },
];
