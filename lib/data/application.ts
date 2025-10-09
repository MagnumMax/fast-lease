export type ResidencyStatus = "resident" | "nonresident";

export type ApplicationStep = {
  id: "start" | "profile" | "documents" | "summary" | "status";
  title: string;
  description: string;
};

export type ApplicationDocumentDefinition = {
  id: string;
  title: string;
  description: string;
  optional?: boolean;
};

export const applicationSteps: ApplicationStep[] = [
  {
    id: "start",
    title: "Предпочтения",
    description: "Выберите автомобиль и условия выкупа",
  },
  {
    id: "profile",
    title: "Профиль",
    description: "Личные данные и контакты",
  },
  {
    id: "documents",
    title: "Документы",
    description: "Загрузите копии для проверки",
  },
  {
    id: "summary",
    title: "Подтверждение",
    description: "Проверьте данные перед отправкой",
  },
  {
    id: "status",
    title: "Статус",
    description: "Отслеживайте прогресс заявки",
  },
];

export const applicationDocuments: Record<
  ResidencyStatus,
  ApplicationDocumentDefinition[]
> = {
  resident: [
    {
      id: "passport",
      title: "Паспорт (страницы с фото и регистрацией)",
      description: "Файл в цвете, формат PDF или JPG, размер до 10 МБ.",
    },
    {
      id: "eid",
      title: "Emirates ID (обе стороны)",
      description: "Фотография или скан в высоком разрешении.",
    },
    {
      id: "license",
      title: "Водительское удостоверение ОАЭ",
      description: "Проверяем стаж не менее 12 месяцев.",
    },
    {
      id: "salary_certificate",
      title: "Справка о доходах или письмо работодателя",
      description: "Должно быть выдано не позднее 30 дней назад.",
    },
    {
      id: "bank_statements",
      title: "Выписка из банка за 3 месяца",
      description: "Формат PDF, можно загрузить несколько файлов.",
      optional: true,
    },
  ],
  nonresident: [
    {
      id: "passport",
      title: "Заграничный паспорт",
      description: "Цветная копия, страница с фото и подписью.",
    },
    {
      id: "visa",
      title: "Виза резидента или въездной штамп",
      description: "Если виза в статусе оформления, приложите подтверждение.",
    },
    {
      id: "license",
      title: "Водительское удостоверение вашей страны",
      description: "При необходимости приложите международное удостоверение.",
    },
    {
      id: "proof_of_income",
      title: "Подтверждение дохода",
      description: "Справка с работы, налоговая декларация или контракт.",
    },
    {
      id: "uae_contact",
      title: "Контактное лицо в ОАЭ",
      description: "Имя, телефон и адрес резидента, который может подтвердить данные.",
      optional: true,
    },
  ],
};
