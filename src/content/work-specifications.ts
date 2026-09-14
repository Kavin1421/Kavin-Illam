export type WorkSpecSection = {
  id: string;
  number: string;
  title: string;
  items: string[];
};

export type MaterialRow = {
  sno: number;
  description: string;
  brand: string;
  rate: string;
};

/** Civil works package for Kavin Illam (M1 technical specification). */
export const WORK_SPEC_META = {
  title: "Technical specification",
  subtitle: "Civil works package — framed residential construction",
  note: "Any item not mentioned in this specification is an exclusion.",
} as const;

export const WORK_SPEC_SECTIONS: WorkSpecSection[] = [
  {
    id: "structure",
    number: "01",
    title: "Structure",
    items: [
      "Structure will be designed as a framed structure.",
      "Foundation trenches shall be dug to exact length, breadth, and depth from normal ground level as per issued drawing.",
      "Excavation of footing up to hard stratum from ground level is in contractor scope.",
      "PCC shall be 100 mm thick; concrete mixed properly, rammed and levelled.",
      "Centering materials with necessary supports for RCC footings, columns, plinth beams, lintel beams, roof beams & roof slab.",
      "All RCC members (footings, columns, plinth/lintel/roof beams & roof slab) in M20 grade concrete.",
      "Cut lintel on all doors & windows with 9 inch bearing on both sides.",
      "Slab concrete 125 mm thick — site mix or RMC at contractor convenience.",
      "Earth filling and soil consolidation up to finished floor levels.",
      "Finished floor level 2.25 ft from road; parking area 1.5 ft from road level.",
      "Basic pest control before flooring PCC.",
      "Double wash M-sand for concrete works.",
      "Floor height 11 ft from rough floor level.",
    ],
  },
  {
    id: "masonry",
    number: "02",
    title: "Masonry works",
    items: [
      "Sufficient red bricks & fly ash bricks supplied by contractor.",
      "9 inch exterior walls; 4.5 inch interior walls (red / fly ash).",
      "Brickwork in 1:6 cement mortar with M-sand.",
      "Every course done to plumb.",
      "Staircase waist slab in concrete; tread & riser in bricks (MS staircase not in package).",
      "Balcony, terrace & utility parapet: 3 ft brickwork.",
      "Cement: PPC Grade 43 for brickwork & plastering (JSW or equivalent).",
      "Fine P-sand for internal & external plastering.",
      "Internal & external plaster 1:5; ceiling plaster 1:4 — min 12 mm, steel float / sponge finish.",
      "Steel shutters removed and hacked before plastering.",
      "Water-cutting borders for chejjas; corners & edges pointed in 1:4.",
    ],
  },
  {
    id: "doors-windows",
    number: "03",
    title: "Doors & windows",
    items: [
      "Main door frame: seasoned country teak 5″×4″ or 6″×3″.",
      "Main door: teak, 40 mm thick; opening 4′3″ × 7′6″.",
      "Main door lock: cylindrical (Europa / Dorset) at ₹3,000; 4 ball-bearing hinges; 2 brass tower bolts.",
      "Internal frames: seasoned sal wood 5″×3″; flush doors at ₹3,000 each; opening 3′3″ × 7′6″.",
      "Internal hardware: 3 hinges, 2 SS tower bolts & stopper; locks at ₹1,200.",
      "Bathroom doors: PVC single panel; opening 2′6″ × 7′0″.",
      "Windows: UPVC open or sliding with 5 mm plain glass; MS grills 12 mm sq. rods.",
      "Total window/ventilator openings including frames: 15% of built-up area.",
      "Window chajja: up to 1.5 ft outward projection with 9″ bearing each side.",
    ],
  },
  {
    id: "kitchen",
    number: "04",
    title: "Kitchen / pantry",
    items: [
      "Concrete counter tops 3″ thick as per drawing.",
      "Granite finish on counters at ₹120 / sqft.",
      "SS sink 2′ × 1.5′ × 1′ worth ₹2,500.",
      "Kitchen wall tiles up to 7′ above counter.",
      "Water purifier provision near main sink.",
      "Exhaust fan provision with 9″ core cutting if desired.",
      "Main sink faucet at ₹2,500.",
    ],
  },
  {
    id: "bathrooms",
    number: "05",
    title: "Bathroom / toilets",
    items: [
      "Basic waterproofing — Dr. Fixit or Fosroc, 2 coats.",
      "Sunken slabs filled with brickbat and cement mortar finish.",
      "Each toilet: floor-mounted western closet, 2-in-1 wall mixer, head shower, health faucet, wash basin.",
      "Hot water provision for wall mixers only.",
      "Sanitary ware & CP fittings: Parryware basic model.",
      "Washing machine provision as per client choice.",
      "16A geyser provision per bathroom.",
      "Ventilators up to 2′×3′ — UPVC with fixed glass and exhaust fan hole.",
    ],
  },
  {
    id: "floorings",
    number: "06",
    title: "Floorings",
    items: [
      "Surface cleaned; dead mortar chipped before flooring.",
      "Terrace: full waterproofing followed by chips concrete flooring.",
      "Waterproof chemical in screed cement mortar.",
      "Floor tiles on 1:5 cement mortar with paper joints; powder grouts.",
      "4″ skirting tiles for living, bedrooms & kitchen.",
      "Internal floor tiles allowance ₹50 / sft; wall tiles (kitchen/toilet) ₹40 / sft; portico ₹50 / sft.",
      "Step treads & risers: leather-finish granite at ₹120 / sft.",
      "Bathroom walls: vitrified tiles to 7′ at ₹40 / sft.",
      "Bathroom floors: 1′3″×1′3″ vitrified at ₹45 / sft with 3 mm spacer & epoxy grout.",
      "Flooring / dado / skirting must be level to plumb.",
    ],
  },
  {
    id: "electrical",
    number: "07",
    title: "Electrical",
    items: [
      "Concealed internal wiring pipes and switch boards.",
      "Modular metal switch boxes — Legrand / GM.",
      "Switch positions marked on building and approved by owner.",
      "Main & branch distribution; each sub-circuit protected by fuse / MCB.",
      "Wall/floor conduits through 1.5 mm ISI PVC sleeves; ceiling points through 2 mm PVC sleeves.",
      "Wires: Kundan; switches & sockets: HIFI.",
      "Distribution board: Legrand or equivalent; UPS provision in all switch boxes.",
      "Main EB service, cable & panel work not in scope.",
      "Living / dining / family hall points as per architectural drawing.",
    ],
  },
  {
    id: "plumbing",
    number: "08",
    title: "Plumbing",
    items: [
      "Fully operational cold-water system — piping, vents, drains, sewage & supply.",
      "Bore to OHT supply in 1.25″ UPVC; outlet lines 1.25″ UPVC.",
      "Internal concealed water in 0.75″ CPVC.",
      "Toilet & kitchen waste in 2.5″ PVC; sewage to septic in 4″ / 4-gauge PVC.",
      "Waste & sewage chambers as site requires; rainwater from terrace in 4″ PVC.",
      "Solar water provisions in kitchen & bathrooms.",
      "Corporation water line to sump; sump to OHT intake included.",
      "Manholes with 2′×2′ FRP lids; sewage chambers closed with 30 mm Kadappa stone.",
    ],
  },
  {
    id: "paintings",
    number: "09",
    title: "Paintings",
    items: [
      "Surfaces prepared — loose material, dust & stains removed.",
      "Internal walls & ceilings: 2 coats Asian wall putty; buff with emery.",
      "One coat Asian interior primer; two coats Asian Tractor Emulsion.",
      "External: one coat Birla White, one coat Asian exterior primer, two coats Asian Ace.",
      "MS window grills: anti-corrosion primer + 2 coats enamel.",
      "Inner door frames: 2 coats enamel; main door frames: 2 coats melamine polish.",
    ],
  },
  {
    id: "miscellaneous",
    number: "10",
    title: "Miscellaneous & extras",
    items: [
      "Rock drilling during excavation charged extra.",
      "RCC overhead tank charged extra on mutual understanding.",
      "Underground sump (fly ash brickwork + concrete cover) — 6,000 Ltr.",
      "SS staircase handrail included.",
      "Main gate & compound wall not in package — mutual understanding.",
      "Front elevation basic civil works included.",
      "Lifting structure above 2′6″ charged extra pro-rata.",
      "Underground septic tank 4,000 Ltr; two 1,000 Ltr overhead PVC tanks.",
      "Final bill on site with actual measurements.",
    ],
  },
];

export const MATERIAL_SPEC_ROWS: MaterialRow[] = [
  {
    sno: 1,
    description: "Cement",
    brand: "JSW / Ultratech (concrete) or equivalent",
    rate: "₹400 / bag",
  },
  {
    sno: 2,
    description: "Steel",
    brand: "Vizag or Agni",
    rate: "₹80 / kg",
  },
  {
    sno: 3,
    description: "M-sand",
    brand: "Optional",
    rate: "—",
  },
  {
    sno: 4,
    description: "P-sand",
    brand: "Optional",
    rate: "—",
  },
  {
    sno: 5,
    description: "Bricks",
    brand: "Chamber red bricks",
    rate: "₹10.50 / no",
  },
  {
    sno: 6,
    description: "Filling material",
    brand: "Soil / M-sand dust",
    rate: "₹2,000 / unit",
  },
  {
    sno: 7,
    description: "Plumbing",
    brand: "Astral",
    rate: "—",
  },
  {
    sno: 8,
    description: "Electrical",
    brand: "Kundan cables / HIFI switches",
    rate: "As in spec",
  },
  {
    sno: 9,
    description: "Painting",
    brand: "Asian Paints",
    rate: "—",
  },
  {
    sno: 10,
    description: "Window grills",
    brand: "MS 12 sq.mm",
    rate: "₹75 / kg",
  },
  {
    sno: 11,
    description: "UPVC windows",
    brand: "EITI or Baydee",
    rate: "₹450 / sft",
  },
  {
    sno: 12,
    description: "Tiles",
    brand: "As mentioned in flooring",
    rate: "As in spec",
  },
  {
    sno: 13,
    description: "Sanitary & CP fittings",
    brand: "Parryware basic",
    rate: "—",
  },
];
