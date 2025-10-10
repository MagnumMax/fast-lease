export type SupportChannel = {
  id: string;
  title: string;
  description: string;
  contact: string;
  actionLabel: string;
  href: string;
  availability: string;
};

export type SupportStep = {
  title: string;
  description: string;
  eta: string;
};

export type OfficeLocation = {
  city: string;
  address: string;
  workingHours: string;
  phone: string;
  mapLink: string;
};

export const supportChannels: SupportChannel[] = [
  {
    id: "hotline",
    title: "Hotline",
    description:
      "For urgent questions about accidents, technical issues and emergency assistance.",
    contact: "+971 800 55 44",
    actionLabel: "Call",
    href: "tel:+9718005544",
    availability: "24/7, average response time — 2 minutes",
  },
  {
    id: "whatsapp",
    title: "WhatsApp Concierge",
    description:
      "Chat with operator, send document photos and track application status.",
    contact: "+971 50 123 45 67",
    actionLabel: "Write to WhatsApp",
    href: "https://wa.me/971501234567",
    availability: "Daily 08:00–22:00 GST",
  },
  {
    id: "email",
    title: "Email Support",
    description:
      "Informal inquiries, contract extensions, commercial proposals.",
    contact: "care@fastlease.ae",
    actionLabel: "Send email",
    href: "mailto:care@fastlease.ae",
    availability: "Response within 6 business hours",
  },
];

export const supportWorkflow: SupportStep[] = [
  {
    title: "Request Registration",
    description:
      "We record your question in a unified system and assign a responsible specialist.",
    eta: "less than 10 minutes",
  },
  {
    title: "Diagnosis and Resolution",
    description:
      "We check contract status, book service or replacement vehicle if required.",
    eta: "from 30 minutes",
  },
  {
    title: "Closure and Feedback",
    description:
      "We verify that the issue is resolved and send a summary via your chosen channel.",
    eta: "no later than 24 hours",
  },
];

export const officeLocations: OfficeLocation[] = [
  {
    city: "Dubai",
    address: "ICD Brookfield Place, DIFC, Level 12",
    workingHours: "Weekdays 09:00–18:00 GST",
    phone: "+971 4 555 0192",
    mapLink: "https://maps.app.goo.gl/JwcmmEgJXGwe2d9s5",
  },
  {
    city: "Abu Dhabi",
    address: "Al Maryah Island, Global Market Square, Tower 2",
    workingHours: "Weekdays 09:00–18:00 GST",
    phone: "+971 2 440 7711",
    mapLink: "https://maps.app.goo.gl/4T3jkqVQmUtsWn3QA",
  },
];
