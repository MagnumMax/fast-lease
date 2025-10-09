export type PricingPlan = {
  id: string;
  name: string;
  description: string;
  priceAED: number;
  termMonths: number;
  downPaymentPercent: number;
  includes: string[];
  recommended?: boolean;
};

export type PricingComparisonRow = {
  label: string;
  foundation: boolean;
  growth: boolean;
  enterprise: boolean;
};

export type PricingFaq = {
  question: string;
  answer: string;
};

export const pricingPlans: PricingPlan[] = [
  {
    id: "foundation",
    name: "Foundation",
    description:
      "Идеально для клиентов, берущих автомобиль в лизинг впервые. Поддерживает базовый пакет услуг и прозрачный buy-out.",
    priceAED: 1750,
    termMonths: 36,
    downPaymentPercent: 15,
    includes: [
      "Поддержка 5/2, SLA 6 часов",
      "Базовая телематика и страхование",
      "Раз в квартал технический осмотр",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    description:
      "Для растущих семей и малого бизнеса. Дополнительные страховки, сервисы и гибкие условия выкупа.",
    priceAED: 3200,
    termMonths: 48,
    downPaymentPercent: 12,
    includes: [
      "Поддержка 7/7, SLA 3 часа",
      "Расширенная телематика и страхование КАСКО",
      "Подменный автомобиль в случае сервисных работ",
      "Опция замены автомобиля на 24 месяце",
    ],
    recommended: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description:
      "Корпоративный флот с персональным менеджером, страхованием и сервисами Fast Lease Premium.",
    priceAED: 5600,
    termMonths: 60,
    downPaymentPercent: 10,
    includes: [
      "24/7 dedicated concierge, SLA 1 час",
      "Полный пакет страховок + расширенный GAP",
      "Техобслуживание и хранение зимней резины",
      "Ежемесячный отчёт по TCO и телематике",
      "Включены услуги водителя (8 часов / мес)",
    ],
  },
];

export const pricingComparison: PricingComparisonRow[] = [
  {
    label: "Онлайн-оформление заявки",
    foundation: true,
    growth: true,
    enterprise: true,
  },
  {
    label: "Телематика и мониторинг",
    foundation: true,
    growth: true,
    enterprise: true,
  },
  {
    label: "Подменный автомобиль",
    foundation: false,
    growth: true,
    enterprise: true,
  },
  {
    label: "Консьерж и выделенный менеджер",
    foundation: false,
    growth: false,
    enterprise: true,
  },
  {
    label: "Антиугонный пакет и Smart-страхование",
    foundation: false,
    growth: true,
    enterprise: true,
  },
  {
    label: "Ежемесячный отчёт об эксплуатации",
    foundation: false,
    growth: true,
    enterprise: true,
  },
  {
    label: "Скидка на buy-out после 24 мес",
    foundation: false,
    growth: true,
    enterprise: true,
  },
  {
    label: "Опция замены авто в середине срока",
    foundation: false,
    growth: true,
    enterprise: true,
  },
  {
    label: "Доступ к корпоративному тарифу Fast Fuel",
    foundation: false,
    growth: true,
    enterprise: true,
  },
  {
    label: "Финансовый аудит и отчёты TCO",
    foundation: false,
    growth: false,
    enterprise: true,
  },
];

export const pricingFaqs: PricingFaq[] = [
  {
    question: "Как рассчитывается ежемесячный платеж?",
    answer:
      "Платёж формируется из стоимости автомобиля, выбранного срока, страховок и сервисов. Вы можете зафиксировать ставку на весь срок договора.",
  },
  {
    question: "Можно ли досрочно выкупить автомобиль?",
    answer:
      "Да. В тарифах Growth и Enterprise предусмотрены скидки при досрочном выкупе после 24 месяцев. Для Foundation действуют стандартные условия buy-out.",
  },
  {
    question: "Что входит в страховку и обслуживание?",
    answer:
      "Базовый тариф покрывает ОСАГО и сервис каждые 10 000 км. Более высокие тарифы включают КАСКО, расширенный GAP и подменный автомобиль.",
  },
  {
    question: "Какие документы нужны для подачи заявки?",
    answer:
      "Паспорт, водительское удостоверение, подтверждение дохода и резидентства. Для компаний — регистрационные документы и финансовая отчётность.",
  },
  {
    question: "Можно ли изменить тариф во время договора?",
    answer:
      "Да. Мы можем пересмотреть тариф при изменении потребностей. Подайте заявку в поддержке, и менеджер предложит оптимальные условия.",
  },
];
