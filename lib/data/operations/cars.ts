export type OpsCarRecord = {
  vin: string;
  name: string;
  year: number;
  type: string;
  price: string;
  mileage: string;
  battery: string;
  detailHref: string;
};

export const OPS_CARS: OpsCarRecord[] = [
  {
    vin: "AAX-341",
    name: "Rolls-Royce Cullinan",
    year: 2024,
    type: "Luxury SUV",
    price: "AED 2,000,000",
    mileage: "12,800 km",
    battery: "97%",
    detailHref: "/ops/cars/rolls-royce-cullinan",
  },
  {
    vin: "BBY-342",
    name: "Bentley Continental GT",
    year: 2024,
    type: "Luxury sedan",
    price: "AED 1,800,000",
    mileage: "8,500 km",
    battery: "98%",
    detailHref: "/ops/cars/bentley-continental-gt",
  },
  {
    vin: "LLY-343",
    name: "Lamborghini Huracan",
    year: 2024,
    type: "Sports car",
    price: "AED 1,500,000",
    mileage: "5,200 km",
    battery: "96%",
    detailHref: "/ops/cars/lamborghini-huracan",
  },
  {
    vin: "BTY-344",
    name: "Bentley Bentayga",
    year: 2024,
    type: "Luxury SUV",
    price: "AED 1,900,000",
    mileage: "10,200 km",
    battery: "97%",
    detailHref: "/ops/cars/bentley-bentayga",
  },
  {
    vin: "TS3-345",
    name: "Tesla Model 3",
    year: 2024,
    type: "Electric car",
    price: "AED 800,000",
    mileage: "15,000 km",
    battery: "95%",
    detailHref: "/ops/cars/tesla-model-3",
  },
];

export type OpsVehicleDocument = {
  id: string;
  title: string;
  status: string;
  icon: string;
};

export const OPS_VEHICLE_DOCUMENTS: OpsVehicleDocument[] = [
  { id: "registration", title: "Registration Card", status: "Scan confirmed", icon: "id-card" },
  { id: "insurance", title: "Insurance", status: "Valid until 14.09.2025", icon: "shield-check" },
  { id: "telematics", title: "Telematics Report", status: "Updated 12.01.2025", icon: "radar" },
];

export type OpsVehicleServiceLogEntry = {
  id: string;
  date: string;
  description: string;
  note?: string;
  icon?: string;
};

export const OPS_VEHICLE_SERVICE_LOG: OpsVehicleServiceLogEntry[] = [
  {
    id: "service-1",
    date: "2025-01-12",
    description: "Scheduled Maintenance Aurora Service Center",
    note: "Brake pads replacement",
    icon: "calendar-days",
  },
  {
    id: "service-2",
    date: "2024-12-01",
    description: "Telematics Alert",
    note: "Checked, no criticality",
    icon: "radar",
  },
  {
    id: "service-3",
    date: "2024-11-18",
    description: "Software Update",
    note: "Firmware version 1.4.6",
    icon: "cpu",
  },
];

export type OpsVehicleProfile = {
  heading: string;
  subtitle: string;
  image: string;
  specs: Array<{ label: string; value: string }>;
};

export const OPS_VEHICLE_PROFILE: OpsVehicleProfile = {
  heading: "Rolls-Royce Cullinan · VIN AAX-341",
  subtitle: "Year of manufacture — 2024 · Luxury SUV · Cost AED 2 000 000",
  image: "/assets/rolls-royce-cullinan-exterior.jpg",
  specs: [
    { label: "Engine Type", value: "Dual Motor" },
    { label: "Range", value: "520 km" },
    { label: "Mileage", value: "12 800 km" },
    { label: "Battery Condition", value: "97%" },
  ],
};
