export type CarBodyType = "SUV" | "Sedan" | "Hatchback" | "Pickup";

export type CarSpecification = {
  label: string;
  value: string;
};

export type CarReview = {
  author: string;
  text: string;
};

export type CarRecord = {
  id: string;
  name: string;
  brand: string;
  year: number;
  body: CarBodyType;
  heroImage: string;
  badges: string[];
  description: string;
  specs: CarSpecification[];
  metrics: {
    range: string;
    acceleration: string;
  };
  lease: {
    title: string;
    monthlyAED: number;
    buyoutAED: number;
    termMonths: number;
  };
  advantages: string[];
  reviews: CarReview[];
};

const CAR_DATA: CarRecord[] = [
  {
    id: "rolls-royce-cullinan",
    name: "Rolls-Royce Cullinan",
    brand: "Rolls-Royce",
    year: 2024,
    body: "SUV",
    heroImage: "/assets/rolls-royce-cullinan-exterior.jpg",
    badges: ["Electric", "Insurance Included"],
    description:
      "Rolls-Royce Cullinan — a luxury SUV with V12 engine, all-wheel drive, and maximum comfort. Ideal for luxury trips with unparalleled finish and technology.",
    specs: [
      { label: "Power", value: "563 hp" },
      { label: "Top Speed", value: "250 km/h" },
      { label: "Acceleration 0–100", value: "5.2 seconds" },
      { label: "Mileage", value: "8 000 km" },
    ],
    metrics: {
      range: "520 km",
      acceleration: "5.2 sec",
    },
    lease: {
      title: "Buy-out Program",
      monthlyAED: 30000,
      buyoutAED: 1000000,
      termMonths: 36,
    },
    advantages: [
      "Personalized finishing at the Rolls-Royce atelier.",
      "Service at authorized Rolls-Royce service centers.",
      "Exclusive events for Cullinan owners.",
    ],
    reviews: [
      {
        author: "Omar Al-Zahra",
        text: "The Rolls-Royce Cullinan is the ultimate luxury SUV. The ride is incredibly smooth on Dubai roads.",
      },
      {
        author: "Layla Al-Hamad",
        text: "Dubai Fast Lease made leasing this Rolls-Royce seamless. The Cullinan arrived in perfect condition.",
      },
    ],
  },
  {
    id: "lamborghini-huracan",
    name: "Lamborghini Huracan",
    brand: "Lamborghini",
    year: 2024,
    body: "Sedan",
    heroImage: "/assets/lamborghini-huracan.jpg",
    badges: ["Performance", "Autopilot"],
    description:
      "Huracan — Italian supercar with V10 engine, all-wheel drive, and 0-100 km/h in 2.9 seconds. Icon of style and performance from Lamborghini.",
    specs: [
      { label: "Power", value: "470 kW" },
      { label: "Top Speed", value: "325 km/h" },
      { label: "Acceleration 0–100", value: "2.9 seconds" },
      { label: "Mileage", value: "5 000 km" },
    ],
    metrics: {
      range: "580 km",
      acceleration: "2.9 sec",
    },
    lease: {
      title: "Performance Ownership",
      monthlyAED: 25000,
      buyoutAED: 750000,
      termMonths: 36,
    },
    advantages: [
      "Personalized paint and finish at Lamborghini atelier.",
      "Technical maintenance at authorized Lamborghini service.",
      "Exclusive events for Huracan owners.",
    ],
    reviews: [
      {
        author: "Ahmed Al-Mansoori",
        text: "The roar of the V10 engine is incredible. Driving the Huracan on Dubai highways is pure adrenaline.",
      },
      {
        author: "Fatima Hassan",
        text: "Dubai Fast Lease made leasing this supercar seamless. The Huracan arrived in perfect condition.",
      },
    ],
  },
  {
    id: "ferrari-488-spider",
    name: "Ferrari 488 Spider",
    brand: "Ferrari",
    year: 2024,
    body: "Sedan",
    heroImage: "/assets/ferrari-458-italia.jpg",
    badges: ["M-package", "HUD"],
    description:
      "Italian roadster with V8 turbo engine, retractable hardtop, and 0-100 km/h in 3.0 seconds. Ferrari icon with advanced technologies.",
    specs: [
      { label: "Power", value: "492 kW" },
      { label: "Top Speed", value: "330 km/h" },
      { label: "Acceleration 0–100", value: "3.0 seconds" },
      { label: "Mileage", value: "3 000 km" },
    ],
    metrics: {
      range: "510 km",
      acceleration: "3.0 sec",
    },
    lease: {
      title: "Driving Experience",
      monthlyAED: 22500,
      buyoutAED: 700000,
      termMonths: 36,
    },
    advantages: [
      "Personalization at Ferrari atelier with unique colors and materials.",
      "Maintenance at official Ferrari service with priority.",
      "Access to exclusive Ferrari Club events.",
    ],
    reviews: [
      {
        author: "Khalid Al-Rashid",
        text: "The Ferrari 488 Spider is a masterpiece. The V8 sound is intoxicating on Dubai roads.",
      },
      {
        author: "Aisha Al-Farsi",
        text: "Leasing through Dubai Fast Lease was effortless. The Spider arrived in pristine condition.",
      },
    ],
  },
  {
    id: "bentley-bentayga",
    name: "Bentley Bentayga",
    brand: "Bentley",
    year: 2024,
    body: "Hatchback",
    heroImage: "/assets/bentley-bw.jpg",
    badges: ["V2L", "800V Charging"],
    description:
      "Bentley Bentayga — luxury SUV with V8 engine, all-wheel drive, and opulent interior. Perfect for comfortable and dynamic journeys.",
    specs: [
      { label: "Power", value: "542 hp" },
      { label: "Top Speed", value: "290 km/h" },
      { label: "Acceleration 0–100", value: "4.5 seconds" },
      { label: "Mileage", value: "7 000 km" },
    ],
    metrics: {
      range: "470 km",
      acceleration: "4.5 sec",
    },
    lease: {
      title: "Urban Mobility",
      monthlyAED: 21000,
      buyoutAED: 950000,
      termMonths: 36,
    },
    advantages: [
      "Personalized finish at Bentley atelier.",
      "Maintenance at authorized Bentley service.",
      "Exclusive events for Bentayga owners.",
    ],
    reviews: [
      {
        author: "Rashid Al-Khalifa",
        text: "The Bentley Bentayga is pure luxury. The ride is incredibly smooth on Dubai highways.",
      },
      {
        author: "Sara Al-Mansouri",
        text: "Leasing through Dubai Fast Lease was effortless. The Bentayga arrived in pristine condition.",
      },
    ],
  },
  {
    id: "rivian-r1t-adventure",
    name: "Rivian R1T Adventure",
    brand: "Rivian",
    year: 2024,
    body: "Pickup",
    heroImage: "/assets/rivian-r1t-adventure.jpg",
    badges: ["Quad Motor", "Air Suspension"],
    description:
      "Electric adventure pickup with quad motors, adaptive suspension, and Gear Tunnel storage. Designed for off-road exploration and urban comfort.",
    specs: [
      { label: "Power", value: "562 kW" },
      { label: "Range", value: "500 km" },
      { label: "Acceleration 0–100", value: "3.5 seconds" },
      { label: "Mileage", value: "4 500 km" },
    ],
    metrics: {
      range: "500 km",
      acceleration: "3.5 sec",
    },
    lease: {
      title: "Adventure Package",
      monthlyAED: 3500,
      buyoutAED: 225000,
      termMonths: 36,
    },
    advantages: [
      "Gear Tunnel and kitchen module included in Adventure package.",
      "Air suspension adjusts ground clearance from 200 to 380 mm.",
      "Free maintenance included at Rivian Service Center.",
    ],
    reviews: [
      {
        author: "Jamal Al-Fayed",
        text: "Chose a pickup with range and cool interior. Rivian impressed with build quality and dynamics.",
      },
      {
        author: "Nour Al-Zahra",
        text: "On weekends we transported everything for camping, Gear Tunnel is super convenient.",
      },
    ],
  },
  {
    id: "volvo-xc40-recharge",
    name: "Volvo XC40 Recharge",
    brand: "Volvo",
    year: 2024,
    body: "SUV",
    heroImage: "/assets/volvo-xc40-recharge.jpg",
    badges: ["Twin Motor", "ADAS Pilot Assist"],
    description:
      "Compact premium SUV with Volvo's signature safety. All-wheel drive and intelligent lane-keeping system make every trip calm.",
    specs: [
      { label: "Power", value: "300 kW" },
      { label: "Range", value: "420 km" },
      { label: "Acceleration 0–100", value: "6.7 seconds" },
      { label: "Mileage", value: "8 600 km" },
    ],
    metrics: {
      range: "420 km",
      acceleration: "6.7 sec",
    },
    lease: {
      title: "Scandinavian Comfort",
      monthlyAED: 1750,
      buyoutAED: 150000,
      termMonths: 36,
    },
    advantages: [
      "Winter package and heated seats included at no extra cost.",
      "Pilot Assist system included for the entire lease term.",
      "Volvo battery warranty — 8 years or 160,000 km.",
    ],
    reviews: [
      {
        author: "Fatima Al-Rashid",
        text: "Comfort and quiet in the cabin — like in more expensive models. Energy consumption stable even in heat.",
      },
      {
        author: "Khalid Al-Mansouri",
        text: "Fast Lease organized delivery with the dealer, all documents arrived in advance.",
      },
    ],
  },
];

export function getAllCars(): CarRecord[] {
  return CAR_DATA;
}

export function getCarById(id: string): CarRecord | undefined {
  return CAR_DATA.find((car) => car.id === id);
}
