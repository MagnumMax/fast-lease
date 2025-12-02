export type FaqCategory = {
  id: string;
  name: string;
  questions: Array<{
    question: string;
    answer: string;
  }>;
};

export const publicFaqs: FaqCategory[] = [
  {
    id: "leasing",
    name: "Leasing Application",
    questions: [
      {
        question: "What documents are needed to start an application?",
        answer:
          "Passport, driving license, proof of income and UAE residency. For legal entities — license and financial statements.",
      },
      {
        question: "How long does approval take?",
        answer:
          "On average 6 business hours with correctly uploaded documents. We notify about status in the app and by email.",
      },
      {
        question: "Can I choose a vehicle from my own catalog?",
        answer:
          "Yes. You can select a car from Fast Lease catalog or provide VIN of a vehicle from dealer so we can calculate an offer.",
      },
    ],
  },
  {
    id: "payments",
    name: "Payments and Buy-out",
    questions: [
      {
        question: "How are monthly payments debited?",
        answer:
          "Payment is linked to bank card or account. We send reminder 3 days before debit and receipt after payment.",
      },
      {
        question: "Are there penalties for early repayment?",
        answer:
          "No. We fix buy-out discount when choosing Growth or Enterprise plans. Standard residual value applies to Foundation.",
      },
      {
        question: "Can I temporarily suspend payments?",
        answer:
          "Yes, Growth and Enterprise programs include holidays up to 60 days once every 12 months. Submit request to support, manager will coordinate details.",
      },
    ],
  },
  {
    id: "service",
    name: "Service and Insurance",
    questions: [
      {
        question: "What is included in the maintenance plan?",
        answer:
          "Regular service every 10,000 km, 24/7 roadside assistance and replacement vehicle for Growth and Enterprise plans.",
      },
      {
        question: "How to file an insurance claim?",
        answer:
          "Report to support via app or hotline, upload photos. We will coordinate repair and provide replacement vehicle.",
      },
      {
        question: "Is telematics provided?",
        answer:
          "Yes. All vehicles are equipped with telematics. You receive reports on driving style, energy consumption and geozones in your personal account.",
      },
    ],
  },
  {
    id: "account",
    name: "Personal Account",
    questions: [
      {
        question: "How to change personal data?",
        answer:
          "Go to Profile section, update information and confirm changes with code from email or SMS.",
      },
      {
        question: "Can I add a second driver?",
        answer:
          "Yes. In Documents section upload the second UAE driver's license, and we will activate it within 1 business day.",
      },
      {
        question: "How to set up notifications?",
        answer:
          "In Settings section you can enable push, email or SMS for different event types: payments, service, fines.",
      },
    ],
  },
];
