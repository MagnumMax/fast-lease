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
    title: "Горячая линия",
    description:
      "Для срочных вопросов по ДТП, техническим неисправностям и экстренной помощи.",
    contact: "+971 800 55 44",
    actionLabel: "Позвонить",
    href: "tel:+9718005544",
    availability: "24/7, среднее время ответа — 2 минуты",
  },
  {
    id: "whatsapp",
    title: "WhatsApp Concierge",
    description:
      "Чат с оператором, отправка фото документов и отслеживание статуса заявки.",
    contact: "+971 50 123 45 67",
    actionLabel: "Написать в WhatsApp",
    href: "https://wa.me/971501234567",
    availability: "Ежедневно 08:00–22:00 GST",
  },
  {
    id: "email",
    title: "Email Поддержка",
    description:
      "Неформальные запросы, продление договора, коммерческие предложения.",
    contact: "care@fastlease.ae",
    actionLabel: "Написать письмо",
    href: "mailto:care@fastlease.ae",
    availability: "Ответ в течение 6 рабочих часов",
  },
];

export const supportWorkflow: SupportStep[] = [
  {
    title: "Регистрация запроса",
    description:
      "Мы фиксируем ваш вопрос в единой системе и назначаем ответственного специалиста.",
    eta: "менее 10 минут",
  },
  {
    title: "Диагностика и решение",
    description:
      "Проверяем статус договора, бронируем сервис или подменный автомобиль, если требуется.",
    eta: "от 30 минут",
  },
  {
    title: "Закрытие и обратная связь",
    description:
      "Проверяем, что проблема решена, и отправляем резюме по каналу, который вы выбрали.",
    eta: "не позднее 24 часов",
  },
];

export const officeLocations: OfficeLocation[] = [
  {
    city: "Dubai",
    address: "ICD Brookfield Place, DIFC, Level 12",
    workingHours: "Будни 09:00–18:00 GST",
    phone: "+971 4 555 0192",
    mapLink: "https://maps.app.goo.gl/JwcmmEgJXGwe2d9s5",
  },
  {
    city: "Abu Dhabi",
    address: "Al Maryah Island, Global Market Square, Tower 2",
    workingHours: "Будни 09:00–18:00 GST",
    phone: "+971 2 440 7711",
    mapLink: "https://maps.app.goo.gl/4T3jkqVQmUtsWn3QA",
  },
];
