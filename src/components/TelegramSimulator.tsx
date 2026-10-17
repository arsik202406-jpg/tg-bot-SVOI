import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, RefreshCw, Smartphone, Monitor, ExternalLink, 
  Check, CheckCheck, Sparkles, MapPin, Bus, ShieldAlert,
  Compass, UserCheck, MessageSquareHeart, ChevronLeft, ArrowRight
} from 'lucide-react';
import { TRIPS_LIST, MEETING_STOPS } from '../data/tripsData';
import { SimMessage, InlineBtn, LeadItem } from '../types';

interface TelegramSimulatorProps {
  onNewLead: (lead: LeadItem) => void;
  onOpenCarModal?: () => void;
}

const BOT_TOKEN = "8969834514:AAGjza7gfBInTsGhnR4jVWvHQR0Hcx2Mnd4";
const MANAGER_URL = "https://t.me/SVOI_travel_admin";
const CHANNEL_URL = "https://t.me/+Flt_2r6vi3U4ZDg6";
const GROUP_URL = "https://t.me/+J50liyDUHPgzYTQy";

export const TelegramSimulator: React.FC<TelegramSimulatorProps> = ({ onNewLead, onOpenCarModal }) => {
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [inputText, setInputText] = useState('');
  const [fsmState, setFsmState] = useState<'idle' | 'feedback_waiting' | 'booking_waiting'>('idle');
  const [pendingBookingTrip, setPendingBookingTrip] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMainKeyboard = (): InlineBtn[][] => [
    [
      { text: '🗺 Поездки', callbackData: 'cb_trips' },
      { text: '💺 Забронировать место', callbackData: 'cb_book' }
    ],
    [
      { text: '❓ Частые вопросы (FAQ)', callbackData: 'cb_faq' },
      { text: '🎮 Игры и викторины', callbackData: 'cb_games' }
    ],
    [
      { text: '🚐 Фото авто', callbackData: 'cb_car' },
      { text: '📍 Точки сбора', callbackData: 'cb_meeting' }
    ],
    [
      { text: '📜 Условия поездок', callbackData: 'cb_terms' },
      { text: '🤝 Стать партнером', callbackData: 'cb_partner' }
    ],
    [
      { text: '✍️ Оставить пожелания', callbackData: 'cb_feedback' }
    ],
    [
      { text: '🆘 Поддержка (Менеджер)', url: MANAGER_URL },
      { text: '📢 Наш Канал', url: CHANNEL_URL }
    ]
  ];

  const getMainWelcomeText = () => (
    `🌟 <b>Добро пожаловать в туристический клуб SVOI!</b> 🌍✨\n\n` +
    `Мы организуем душевные и продуманные поездки по самым красивым уголкам Европы ` +
    `на комфортабельном минивэне Opel Vivaro без стресса, спешки и языковых барьеров!\n\n` +
    `✨ <b>Почему выбирают SVOI:</b>\n` +
    `• 🚐 <i>Комфорт в дороге:</i> 8-местный минивэн с кондиционером, регулируемыми сиденьями и USB\n` +
    `• 📍 <i>Удобный старт:</i> отправление из Саарбрюккена + подсадка по пути\n` +
    `• 👨‍✈️ <i>Опытные водители и дружелюбная атмосфера</i>\n` +
    `• 👥 <i>Маленькие душевные группы</i> (до 7-8 человек)\n\n` +
    `👇 <b>Выберите интересующий раздел в меню:</b>`
  );

  const [messages, setMessages] = useState<SimMessage[]>([
    {
      id: 'msg-start',
      sender: 'bot',
      text: getMainWelcomeText(),
      time: getCurrentTime(),
      inlineKeyboard: getMainKeyboard()
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  // Reusable callback handler simulating edit_text
  const handleCallbackClick = (btn: InlineBtn) => {
    if (btn.url) {
      window.open(btn.url, '_blank');
      return;
    }

    const data = btn.callbackData;
    if (!data) return;

    // Simulate await callback.answer()
    showToast(`Нажато: ${btn.text}`);

    if (data === 'cb_back') {
      setFsmState('idle');
      setPendingBookingTrip(null);
      editLastBotMessage(getMainWelcomeText(), getMainKeyboard());
      return;
    }

    if (data === 'cb_trips') {
      const tripsKeyboard: InlineBtn[][] = TRIPS_LIST.map((trip) => [
        {
          text: `📍 ${trip.shortTitle} — ${trip.price}€`,
          callbackData: `cb_trip_${trip.id}`
        }
      ]);
      tripsKeyboard.push([
        { text: '🔙 Назад в меню', callbackData: 'cb_back' }
      ]);

      const headerText = 
        `🗺 <b>Актуальные направления и расписание туров SVOI</b> 🇪🇺✨\n\n` +
        `Все поездки осуществляются из <b>Саарбрюккена / Саарланда</b> (с забором по адресу и подсадкой по пути) ` +
        `на комфортабельном минивэне Opel Vivaro.\n\n` +
        `👇 <i>Нажмите на направление для просмотра программы и бронирования:</i>`;

      editLastBotMessage(headerText, tripsKeyboard);
      return;
    }

    if (data.startsWith('cb_trip_')) {
      const tripId = data.replace('cb_trip_', '');
      const trip = TRIPS_LIST.find((t) => t.id === tripId);
      if (!trip) return;

      const detailText = 
        `✨ <b>${trip.title}</b> (${trip.duration})\n` +
        `🏷 <b>Статус:</b> ${trip.badge}\n` +
        `💵 <b>Стоимость:</b> ${trip.price}€\n\n` +
        `📍 <b>Программа и главные впечатления:</b>\n` +
        `${trip.description}\n\n` +
        `🚩 <b>Сбор пассажиров:</b> По адресу (Саарланд, Трир, Люксембург) + подсадка по пути\n` +
        `🚐 <b>Трансфер:</b> Opel Vivaro комфортное авто со всеми удобствами.`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '💺 Забронировать этот тур', callbackData: `cb_book_target_${trip.id}` }
        ],
        [
          { text: '🗺 Все направления', callbackData: 'cb_trips' },
          { text: '🔙 Главное меню', callbackData: 'cb_back' }
        ]
      ];

      editLastBotMessage(detailText, keyboard, trip.image);
      return;
    }

    if (data === 'cb_car') {
      const carText = 
        `🚐 <b>Наш минивэн: Opel Vivaro (8 пассажирских мест)</b> 🚗\n\n` +
        `Мы заботимся о том, чтобы дорога была легкой и приятной!\n\n` +
        `💺 <b>Схема мест в салоне (всего 8 мест):</b>\n` +
        `• <b>1-й ряд (рядом с водителем):</b> 2 места (Место 1 — центр, Место 2 — панорамное окно)\n` +
        `• <b>2-й ряд:</b> 3 места (Место 3 — окно, Место 4 — центр, Место 5 — окно)\n` +
        `• <b>3-й ряд:</b> 3 места (Место 6 — окно, Место 7 — центр, Место 8 — окно)\n\n` +
        `🌟 <b>Оснащение и удобства:</b>\n` +
        `• 💺 <b>Удобные сиденья:</b> индивидуальные ремни, откидные спинки для сна в пути\n` +
        `• 📏 <b>Пространство для ног:</b> свободно даже для высоких пассажиров\n` +
        `• ❄️🔥 <b>Кондиционер и отопление салона</b>\n` +
        `• ⚡️ <b>Зарядка телефонов:</b> USB-порты для ваших смартфонов\n` +
        `• 🧳 <b>Багажное отделение:</b> 10 кг при дальних поездках + ручная кладь в салон\n` +
        `• 🧼 <b>Чистота:</b> регулярная влажная уборка перед каждым рейсом\n\n` +
        `<i>Вы можете выбрать конкретное место при бронировании (+5€) или занять свободное при посадке (0€).</i>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '💺 Открыть схему мест в салоне', callbackData: 'cb_open_car_visualizer' }
        ],
        [
          { text: '💺 Выбрать место (+5€)', callbackData: 'cb_book' },
          { text: '🔙 Назад в меню', callbackData: 'cb_back' }
        ]
      ];

      editLastBotMessage(carText, keyboard);
      return;
    }

    if (data === 'cb_open_car_visualizer') {
      onOpenCarModal?.();
      return;
    }

    if (data === 'cb_meeting') {
      const meetingText = 
        `📍 <b>Точки сбора пассажиров & Логистика клуба SVOI</b> 🗺\n\n` +
        `🏡 <b>Сбор и развоз по адресу (Door-to-Door):</b>\n` +
        `• <b>Забираем всех по адресу</b> по земле <b>Саарланд (Saarland)</b>, в <b>Трире (Trier)</b> и <b>Люксембурге (Luxembourg)</b>!\n` +
        `• Развозим также обратно прямо по адресу.\n\n` +
        `🛣 <b>Сбор в других землях и возможность подсадки:</b>\n` +
        `Можем забрать и в других землях — это зависит от маршрута (по пути или нет) или же если не однодневный тур.\n` +
        `👉 <b>При наличии от 4-х человек можем забрать с других земель!</b>\n\n` +
        `Города и условия подсадки:\n` +
        `• <b>Хомбург (Homburg Saar)</b> — уточняйте\n` +
        `• <b>Кайзерслаутерн (Kaiserslautern)</b> — возможен если более 4х человек и не однодневный тур\n` +
        `• <b>Мангейм / Людвигсхафен (Mannheim)</b> — возможен если более 4х человек и не однодневный тур\n` +
        `• <b>Франкфурт-на-Майне (Frankfurt am Main)</b> — возможен если более 4х человек и не однодневный тур\n` +
        `• <b>Карлсруэ (Karlsruhe)</b> — для южных направлений по пути\n` +
        `• <b>Страсбург (Strasbourg)</b> — по Франции и Швейцарии\n` +
        `• <b>Бельгия</b> — при поездках в Нормандию, Голландию и Париж\n\n` +
        `💬 <i>Писать менеджеру для уточнения — возможность подсадки уточняйте!</i>\n\n` +
        `⏰ <b>Точное время выезда:</b>\n` +
        `Точное время, за которым за вами заедут, высылается <b>в личный чат за день вечером перед поездкой</b>.\n\n` +
        `👥 <b>Чат поездки с водителем:</b>\n` +
        `Основные вопросы водителю и по поездке вы сможете задать в новосозданной однодневной группе для коммуникации группы. <b>Через день группа удаляется.</b>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '💬 Уточнить подсадку у менеджера', url: MANAGER_URL }
        ],
        [
          { text: '🗺 Выбрать направление тура', callbackData: 'cb_trips' },
          { text: '🔙 Назад в меню', callbackData: 'cb_back' }
        ]
      ];

      editLastBotMessage(meetingText, keyboard);
      return;
    }


    if (data === 'cb_terms') {
      const termsText = 
        `📜 <b>Условия поездок туристического клуба SVOI</b> 📌\n\n` +
        `🛂 <b>Необходимые документы:</b>\n` +
        `• Действующий заграничный паспорт\n` +
        `• Действующий ВНЖ (Aufenthaltstitel), ПМЖ или шенгенская виза\n` +
        `• 🏥 <b>Медицинская туристическая страховка:</b> Обязательна для людей без ВНЖ в Европе\n\n` +
        `🧳 <b>Багаж:</b>\n` +
        `• <b>10 кг при дальних поездках</b> в багажный отсек\n` +
        `• 1 небольшая <b>ручная кладь</b> с личными вещами в салон авто\n\n` +
        `💳 <b>Бронирование и оплата:</b>\n` +
        `• 🔥 <b>Бронь у нас БЕЗ ПРЕДОПЛАТЫ!</b> Оплата тура происходит при посадке в день поездки\n` +
        `• Предоплата требуется <b>ТОЛЬКО при поездках на несколько дней</b> для бронирования отелей\n\n` +
        `🔄 <b>Правила отмены и возврата:</b>\n` +
        `• Отмена за 72+ часа — перенос даты или отмена без удержаний\n` +
        `• Менее 24 часов — бронь можно передать другу\n\n` +
        `🚭 <b>Курение и алкоголь в салоне строго запрещены.</b>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '🔙 Назад в меню', callbackData: 'cb_back' }
        ]
      ];

      editLastBotMessage(termsText, keyboard);
      return;
    }

    if (data === 'cb_partner') {
      const partnerText = 
        `🤝 <b>Партнерская программа & Сотрудничество</b> 💼\n\n` +
        `Клуб SVOI открыт для друзей, блогеров, гидов и активных путешественников!\n\n` +
        `🌟 <b>Форматы сотрудничества:</b>\n` +
        `1. <b>Приведи друзей:</b> соберите компанию от 4 человек и получите скидку 15% на всю поездку!\n` +
        `2. <b>Индивидуальный чартер:</b> аренда всего минивэна с водителем под ключ.\n` +
        `3. <b>Для блогеров:</b> бартерные поездки за честные отметки и рилсы.\n` +
        `4. <b>Локальные гиды:</b> предлагайте авторские маршруты.\n\n` +
        `📩 <i>Свяжитесь напрямую с основателем клуба:</i> @SVOI_travel_admin`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '💬 Написать основателю', url: MANAGER_URL },
          { text: '🔙 Назад в меню', callbackData: 'cb_back' }
        ]
      ];

      editLastBotMessage(partnerText, keyboard);
      return;
    }

    if (data === 'cb_feedback') {
      setFsmState('feedback_waiting');
      const feedbackText = 
        `✍️ <b>Оставить отзыв или пожелание</b> 💌\n\n` +
        `Мы постоянно улучшаем наши маршруты и сервис. Напишите в ответном сообщении:\n` +
        `• Ваши впечатления от прошедшей поездки\n` +
        `• Куда бы вы хотели поехать в следующий раз\n` +
        `• Любые предложения по развитию клуба SVOI\n\n` +
        `<i>Отправьте ваш текст прямо в строку ввода сообщения ниже:</i>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '❌ Отмена', callbackData: 'cb_cancel_feedback' }
        ]
      ];

      editLastBotMessage(feedbackText, keyboard);
      return;
    }

    if (data === 'cb_cancel_feedback') {
      setFsmState('idle');
      editLastBotMessage(getMainWelcomeText(), getMainKeyboard());
      return;
    }

    if (data === 'cb_faq') {
      const faqText = 
        `❓ <b>Частые вопросы о поездках клуба SVOI (FAQ)</b> 💡\n\n` +
        `Собрали для вас подробные ответы на самые важные вопросы:\n\n` +
        `• 💳 Оплата: <b>работаем без предоплаты на однодневные поездки</b>!\n` +
        `• 📍 Точки сбора: <b>забираем по адресу</b> (Саарланд, Трир, Люксембург)!\n` +
        `• ⏱ Маршруты и тайминг: примеры комбинированных туров\n` +
        `• 🎯 Как выбрать тур: размеренные прогулки vs. активный темп\n` +
        `• 💺 Салон Opel Vivaro: 8 мест (2 спереди, 3 во 2-м и 3 во 3-м ряду)\n\n` +
        `👇 <i>Нажмите на вопрос для подробностей:</i>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '📍 Точки сбора: откуда забираете?', callbackData: 'cb_faq_pickup' },
          { text: '💳 Когда оплата? (Без предоплаты)', callbackData: 'cb_faq_payment' }
        ],
        [
          { text: '⏱ Сколько времени на локациях?', callbackData: 'cb_faq_time' },
          { text: '🎯 Размеренный vs темп: как выбрать тур?', callbackData: 'cb_faq_choose' }
        ],
        [
          { text: '💺 Схема мест (2+3+3) и регулировки', callbackData: 'cb_faq_seats' },
          { text: '🚶 Как мы гуляем по локациям?', callbackData: 'cb_faq_walking' }
        ],
        [
          { text: '📌 Читать тему в канале (FAQ)', url: 'https://t.me/c/3876884115/5' }
        ],
        [
          { text: '🔙 Главное меню', callbackData: 'cb_back' }
        ]
      ];

      editLastBotMessage(faqText, keyboard);
      return;
    }

    if (data === 'cb_faq_pickup') {
      const text = 
        `📍 <b>Точки сбора пассажиров: откуда забираем и куда привозим?</b> 🗺\n\n` +
        `🏡 <b>Земля Саарланд, Трир и Люксембург:</b>\n` +
        `• <b>Забираем всех по адресу</b> и развозим также по адресу!\n\n` +
        `🛣 <b>Сбор в других землях:</b>\n` +
        `Можем забрать и в других землях — зависит от маршрута (по пути или нет) или если тур не однодневный.\n` +
        `👉 <b>При наличии от 4х человек можем забрать с других земель:</b>\n` +
        `• <b>Хомбург (Homburg Saar)</b> — уточняйте\n` +
        `• <b>Кайзерслаутерн (Kaiserslautern)</b> — возможен если более 4х человек и не однодневный тур\n` +
        `• <b>Мангейм / Людвигсхафен (Mannheim)</b> — возможен если более 4х человек и не однодневный тур\n` +
        `• <b>Франкфурт-на-Майне (Frankfurt am Main)</b> — возможен если более 4х человек и не однодневный тур\n` +
        `• <b>Карлсруэ (Karlsruhe)</b> — для южных направлений по пути\n` +
        `• <b>Страсбург (Strasbourg)</b> — по Франции и Швейцарии\n` +
        `• <b>Бельгия</b> — при поездках в Нормандию, Голландию и Париж\n\n` +
        `💬 <i>Писать менеджеру для уточнения — возможность подсадки уточняйте!</i>\n\n` +
        `⏰ <b>Точное время подачи:</b>\n` +
        `Точное время, за которым за вами заедут, высылается <b>в личный чат за день вечером перед поездкой</b>.\n\n` +
        `👥 <b>Чат поездки с водителем:</b>\n` +
        `Основные вопросы водителю и по поездке вы сможете задать в новосозданной однодневной группе для коммуникации группы. <b>Через день группа удаляется.</b>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '💬 Уточнить подсадку у менеджера', url: MANAGER_URL },
          { text: '🔙 К списку вопросов', callbackData: 'cb_faq' }
        ],
        [
          { text: '🏠 Главное меню', callbackData: 'cb_back' }
        ]
      ];
      editLastBotMessage(text, keyboard);
      return;
    }


    if (data === 'cb_faq_walking') {
      const text = 
        `🚶 <b>Как мы гуляем по локациям?</b>\n\n` +
        `1. <b>Вводная прогулка:</b> По прибытии мы вместе знакомимся с ключевыми достопримечательностями и видовыми точками.\n\n` +
        `2. <b>Свободное время:</b> Вы не привязаны к группе с флажком! Гуляйте в своем темпе, посещайте музеи, сидите в уютных кафе или устраивайте шопинг.\n\n` +
        `3. <b>Поддержка:</b> Организатор всегда на связи в чате поездки и делится точными локациями лучших заведений.`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '🔙 К списку вопросов', callbackData: 'cb_faq' },
          { text: '🏠 Главное меню', callbackData: 'cb_back' }
        ]
      ];
      editLastBotMessage(text, keyboard);
      return;
    }

    if (data === 'cb_faq_time') {
      const text = 
        `⏱ <b>Сколько времени на локациях?</b>\n\n` +
        `Мы рассчитываем маршрут так, чтобы не было ощущения суеты:\n\n` +
        `• <b>Однодневные туры (Париж, Амстердам, Брюгге):</b> от 5 до 8 часов чистого времени в городе!\n\n` +
        `• <b>Комбинированные маршруты:</b>\n` +
        `  — 🌊 <b>Этрета + Париж:</b> к примеру, <b>5 часов на скалах Этрета</b> и океане + <b>2–3 часа</b> в вечернем Париже!\n` +
        `  — 🇨🇭 <b>Швейцария комбо:</b> <b>3 часа Лаутербруннен</b> (долина 72 водопадов), <b>2 часа ущелье Ааре</b>, <b>2 часа Берн</b>!\n\n` +
        `• <b>Туры на выходные (2–3 дня):</b> размеренная программа с ночевкой в комфортабельном отеле.`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '🔙 К списку вопросов', callbackData: 'cb_faq' },
          { text: '🏠 Главное меню', callbackData: 'cb_back' }
        ]
      ];
      editLastBotMessage(text, keyboard);
      return;
    }

    if (data === 'cb_faq_payment') {
      const text = 
        `💳 <b>Когда и как оплата поездки?</b>\n\n` +
        `🔥 <b>Мы работаем БЕЗ ПРЕДОПЛАТЫ на все однодневные поездки!</b>\n\n` +
        `• <b>Однодневные туры:</b> Вы бронируете место, а оплачиваете поездку непосредственно при посадке в минивэн!\n` +
        `• <b>Многодневные поездки (2–3 дня):</b> Предоплата требуется <b>ТОЛЬКО для многодневных туров</b> (для бронирования номеров в отелях).\n` +
        `• <b>Способы оплаты:</b> Наличные при посадке (в евро), банковский перевод SEPA / IBAN (Германия/ЕС), PayPal.\n` +
        `• <b>Отмена:</b> При предупреждении за 72+ часа — перенос или отмена без удержаний.`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '🔙 К списку вопросов', callbackData: 'cb_faq' },
          { text: '🏠 Главное меню', callbackData: 'cb_back' }
        ]
      ];
      editLastBotMessage(text, keyboard);
      return;
    }

    if (data === 'cb_faq_seats') {
      const text = 
        `💺 <b>Как расположены и регулируются сидения?</b>\n\n` +
        `В нашем 8-местном минивэне Opel Vivaro сиденья расположены по схеме 2+3+3:\n\n` +
        `• <b>1-й ряд (рядом с водителем):</b> 2 места (Место 1 — центр, Место 2 — панорамное окно)\n` +
        `• <b>2-й ряд:</b> 3 места (Место 3 — окно, Место 4 — центр, Место 5 — окно)\n` +
        `• <b>3-й ряд:</b> 3 места (Место 6 — окно, Место 7 — центр, Место 8 — окно)\n\n` +
        `🛋 <b>Комфорт:</b> Регулируемый наклон спинки для сна, USB-зарядки для смартфонов, кондиционер.\n` +
        `💵 <b>Выбор места:</b> Фиксация конкретного места по порядку — <b>5€</b>. Без выбора (свободная посадка) — <b>0€</b>.`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '🔙 К списку вопросов', callbackData: 'cb_faq' },
          { text: '🏠 Главное меню', callbackData: 'cb_back' }
        ]
      ];
      editLastBotMessage(text, keyboard);
      return;
    }

    if (data === 'cb_faq_choose') {
      const text = 
        `🎯 <b>Как выбрать тур новичку?</b>\n\n` +
        `🌿 <b>Размеренные туры (для спокойных прогулок и релакса):</b>\n` +
        `• <b>Брюгге (110€)</b> — каналы, лебеди, шоколад, уютные террасы\n` +
        `• <b>Эльзас + Страсбург (80€)</b> — пряничные фахверковые улочки\n` +
        `• <b>Замок Нойшванштайн (120€)</b> — прогулка к озеру Альпзее и замку\n` +
        `• <b>Лазурный берег (3 дня, 440€)</b> — курортный отдых у моря с отелем\n\n` +
        `⚡️ <b>Туры в темпе (активно, «галопом по Европам»):</b>\n` +
        `• <b>Лихтенштейн (3 страны за 1 день, 120€)</b> — Лихтенштейн + Австрия + Швейцария\n` +
        `• <b>Этрета + Париж (140€)</b> — 5 ч скалы Нормандии + 2–3 ч Париж\n` +
        `• <b>Швейцария комбо (120€)</b> — 3 ч Лаутербруннен + 2 ч ущелье Ааре + 2 ч Берн\n` +
        `• <b>Париж или Амстердам (120€)</b> — максимум впечатлений за 1 день\n\n` +
        `Напишите менеджеру @SVOI_travel_admin — мы поможем подобрать тур!`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '🔙 К списку вопросов', callbackData: 'cb_faq' },
          { text: '🗺 Каталог туров', callbackData: 'cb_trips' }
        ]
      ];
      editLastBotMessage(text, keyboard);
      return;
    }

    if (data === 'cb_games') {
      const gamesText = 
        `🎮 <b>Игры и викторины клуба SVOI</b> 🏆\n\n` +
        `Любите путешествия и загадки? Участвуйте в играх, выигрывайте бонусы и Карту Приоритета!\n\n` +
        `👇 <i>Выберите активность:</i>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '🕵️ Игра «Гео-Детектив»', callbackData: 'cb_game_geo' }
        ],
        [
          { text: '🧠 Викторина «Правда или Ложь»', callbackData: 'cb_game_quiz' }
        ],
        [
          { text: '🎁 Розыгрыши в группе SVOI', callbackData: 'cb_game_group_info' }
        ],
        [
          { text: '🔙 Главное меню', callbackData: 'cb_back' }
        ]
      ];
      editLastBotMessage(gamesText, keyboard);
      return;
    }

    if (data === 'cb_game_geo') {
      const geoText = 
        `🕵️ <b>Гео-Детектив: Угадайте локацию по описанию!</b>\n\n` +
        `«Белоснежные алебастровые скалы и природные арки над Атлантикой, вдохновлявшие Клода Моне на шедевры импрессионизма».\n\n` +
        `<i>Кто первый угадает, где сделан этот снимок?</i>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '🇫🇷 Этрета (Нормандия, Франция)', callbackData: 'cb_geocheck_correct' }
        ],
        [
          { text: '🇮🇹 Побережье Амальфи', callbackData: 'cb_geocheck_wrong' },
          { text: '🇬🇧 Скалы Дувра', callbackData: 'cb_geocheck_wrong' }
        ],
        [
          { text: '🔙 Меню игр', callbackData: 'cb_games' }
        ]
      ];
      editLastBotMessage(geoText, keyboard, 'https://images.unsplash.com/photo-1549144511-f099e773c147?auto=format&fit=crop&w=1000&q=80');
      return;
    }

    if (data === 'cb_geocheck_correct') {
      const text = 
        `🎉 <b>БРАВО! ВЫ НАСТОЯЩИЙ ГЕО-ДЕТЕКТИВ!</b> 🏆\n\n` +
        `Это знаменитые скалы <b>Этрета</b> в Нормандии! Мы едем сюда в туре «Этрета + Париж» (140€).\n\n` +
        `🎁 <b>Ваш приз: КАРТА ПРИОРИТЕТА</b>\n` +
        `Промокод: <code>PRIORITY-SVOI5</code>\n` +
        `Даёт право <b>бесплатно выбрать любое место в минивэне (экономия 5€)</b> или скидку 10% на первую поездку!\n\n` +
        `<i>Отправьте промокод менеджеру @SVOI_travel_admin при бронировании!</i>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '💬 Отправить менеджеру', url: 'https://t.me/SVOI_travel_admin?text=Здравствуйте! Я отгадал локацию в Гео-Детективе. Мой промокод PRIORITY-SVOI5.' }
        ],
        [
          { text: '🗺 Выбрать тур', callbackData: 'cb_trips' },
          { text: '🔙 Меню игр', callbackData: 'cb_games' }
        ]
      ];
      editLastBotMessage(text, keyboard);
      return;
    }

    if (data === 'cb_geocheck_wrong') {
      const text = 
        `🔍 <b>Не совсем так!</b>\n\n` +
        `Правильный ответ — легендарные скалы <b>Этрета во Франции</b> на берегу Атлантики.\n\n` +
        `Попробуйте еще раз или выберите другую игру!`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '🔄 Попробовать снова', callbackData: 'cb_game_geo' },
          { text: '🔙 Меню игр', callbackData: 'cb_games' }
        ]
      ];
      editLastBotMessage(text, keyboard);
      return;
    }

    if (data === 'cb_game_quiz') {
      const text = 
        `🧠 <b>Квиз «Правда или Ложь» (Швейцария):</b>\n\n` +
        `Правда ли, что в Швейцарии законом запрещено иметь только одну морскую свинку?`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '👍 ПРАВДА', callbackData: 'cb_qcheck_1' },
          { text: '👎 ЛОЖЬ', callbackData: 'cb_qcheck_0' }
        ],
        [
          { text: '🔙 Меню игр', callbackData: 'cb_games' }
        ]
      ];
      editLastBotMessage(text, keyboard);
      return;
    }

    if (data === 'cb_qcheck_1' || data === 'cb_qcheck_0') {
      const isTrue = data === 'cb_qcheck_1';
      const text = (
        (isTrue ? '🎉 <b>В точку! Это чистая правда!</b> 🐹\n\n' : '😮 <b>Сюрприз! Это на самом деле ПРАВДА!</b> 🐹\n\n') +
        `В Швейцарии закон о защите животных признает морских свинок социальными существами, страдающими в одиночестве. Их разрешено заводить только парами!\n\n` +
        `Такие необычные факты мы рассказываем в наших турах!`
      );

      const keyboard: InlineBtn[][] = [
        [
          { text: '🗺 Посмотреть туры в Швейцарию', callbackData: 'cb_trip_swiss_rhine_zurich' },
          { text: '🔙 Меню игр', callbackData: 'cb_games' }
        ]
      ];
      editLastBotMessage(text, keyboard);
      return;
    }

    if (data === 'cb_game_group_info') {
      const text = 
        `📢 <b>Розыгрыши и викторины в группе Telegram!</b> 🎟✨\n\n` +
        `<b>Может ли бот делать викторины в группе?</b>\n` +
        `👉 <b>ДА!</b> Бот публикует викторины через механизм <code>Telegram Quiz</code> с конфетти при правильном ответе.\n\n` +
        `🔥 <b>Розыгрыши билетов:</b>\n` +
        `Бот публикует пост с кнопкой участия и в назначенное время автоматически выбирает случайного победителя среди подписчиков группы!\n\n` +
        `Присоединяйтесь к нашей группе путешественников:`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '💬 Перейти в группу SVOI', url: GROUP_URL }
        ],
        [
          { text: '🔙 Меню игр', callbackData: 'cb_games' }
        ]
      ];
      editLastBotMessage(text, keyboard);
      return;
    }

    if (data === 'cb_book') {
      const bookText = 
        `💺 <b>Выбор места в минивэне Opel Vivaro (8 пассажирских мест)</b>\n\n` +
        `Схема рассадки:\n` +
        `• <b>1-й ряд:</b> 2 места рядом с водителем\n` +
        `• <b>2-й ряд:</b> 3 места (окно / центр / окно)\n` +
        `• <b>3-й ряд:</b> 3 места (окно / центр / окно)\n\n` +
        `💵 <b>Условия:</b>\n` +
        `• Фиксация конкретного места по порядку: <b>+5€</b>\n` +
        `• Без выбора места (свободная посадка): <b>0€</b>\n\n` +
        `👇 <i>Выберите место по порядку:</i>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '💺 Место 1 (рядом с водителем) — 5€', callbackData: 'cb_seat_1_general' },
          { text: '💺 Место 2 (водитель, окно) — 5€', callbackData: 'cb_seat_2_general' }
        ],
        [
          { text: '💺 Место 3 (2-й ряд, окно) — 5€', callbackData: 'cb_seat_3_general' },
          { text: '💺 Место 4 (2-й ряд, центр) — 5€', callbackData: 'cb_seat_4_general' },
          { text: '💺 Место 5 (2-й ряд, окно) — 5€', callbackData: 'cb_seat_5_general' }
        ],
        [
          { text: '💺 Место 6 (3-й ряд, окно) — 5€', callbackData: 'cb_seat_6_general' },
          { text: '💺 Место 7 (3-й ряд, центр) — 5€', callbackData: 'cb_seat_7_general' },
          { text: '💺 Место 8 (3-й ряд, окно) — 5€', callbackData: 'cb_seat_8_general' }
        ],
        [
          { text: '🎲 Без выбора места (свободная посадка) — 0€', callbackData: 'cb_seat_none_general' }
        ],
        [
          { text: '🗺 Выбрать тур из каталога', callbackData: 'cb_trips' },
          { text: '🔙 Назад в меню', callbackData: 'cb_back' }
        ]
      ];

      editLastBotMessage(bookText, keyboard);
      return;
    }

    if (data.startsWith('cb_book_target_')) {
      const tripId = data.replace('cb_book_target_', '');
      setPendingBookingTrip(tripId);
      const trip = TRIPS_LIST.find((t) => t.id === tripId);
      const title = trip ? trip.title : 'Выбранный тур';

      const text = 
        `🎯 <b>Бронирование тура: ${title}</b>\n\n` +
        `Выберите интерактивное место в минивэне Opel Vivaro:\n` +
        `• 1-й ряд (рядом с водителем): 2 места\n` +
        `• 2-й ряд: 3 места\n` +
        `• 3-й ряд: 3 места\n\n` +
        `💵 <b>Стоимость:</b>\n` +
        `• Конкретное место: <b>+5€</b>\n` +
        `• Без выбора места: <b>0€</b>\n\n` +
        `👇 <i>Нажмите плашку нужного места по порядку:</i>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '💺 Место 1 (рядом с водителем) — 5€', callbackData: `cb_seat_1_${tripId}` },
          { text: '💺 Место 2 (водитель, окно) — 5€', callbackData: `cb_seat_2_${tripId}` }
        ],
        [
          { text: '💺 Место 3 (2-й ряд, окно) — 5€', callbackData: `cb_seat_3_${tripId}` },
          { text: '💺 Место 4 (2-й ряд, центр) — 5€', callbackData: `cb_seat_4_${tripId}` },
          { text: '💺 Место 5 (2-й ряд, окно) — 5€', callbackData: `cb_seat_5_${tripId}` }
        ],
        [
          { text: '💺 Место 6 (3-й ряд, окно) — 5€', callbackData: `cb_seat_6_${tripId}` },
          { text: '💺 Место 7 (3-й ряд, центр) — 5€', callbackData: `cb_seat_7_${tripId}` },
          { text: '💺 Место 8 (3-й ряд, окно) — 5€', callbackData: `cb_seat_8_${tripId}` }
        ],
        [
          { text: '🎲 Без выбора места (свободная посадка) — 0€', callbackData: `cb_seat_none_${tripId}` }
        ],
        [
          { text: '🔙 Назад к описанию тура', callbackData: `cb_trip_${tripId}` }
        ]
      ];

      editLastBotMessage(text, keyboard);
      return;
    }

    if (data.startsWith('cb_seat_')) {
      const parts = data.split('_');
      const seatCode = parts[2]; // 1..8, none
      const tripId = parts[3];

      const SEAT_DESCRIPTIONS: Record<string, string> = {
        '1': '💺 Место 1 (1-й ряд, рядом с водителем, центр)',
        '2': '💺 Место 2 (1-й ряд, рядом с водителем, окно)',
        '3': '💺 Место 3 (2-й ряд, у окна слева)',
        '4': '💺 Место 4 (2-й ряд, по центру)',
        '5': '💺 Место 5 (2-й ряд, у окна справа)',
        '6': '💺 Место 6 (3-й ряд, у окна слева)',
        '7': '💺 Место 7 (3-й ряд, по центру)',
        '8': '💺 Место 8 (3-й ряд, у окна справа)',
      };

      let seatName = '🎲 Без выбора места (свободная посадка)';
      let seatFee = 0;
      if (seatCode !== 'none' && SEAT_DESCRIPTIONS[seatCode]) {
        seatName = SEAT_DESCRIPTIONS[seatCode];
        seatFee = 5;
      }

      const trip = TRIPS_LIST.find((t) => t.id === tripId);
      const tripTitle = trip ? trip.title : 'Индивидуальный маршрут';
      const duration = trip ? trip.duration : '1 день';
      const basePrice = trip ? trip.price : 120;
      const totalCost = basePrice + seatFee;
      const bookingCode = `SVOI-${Math.floor(1000 + Math.random() * 9000)}`;

      // Log detailed lead to CRM
      const newLead: LeadItem = {
        id: `lead-${Date.now()}`,
        type: 'booking',
        bookingCode: bookingCode,
        tripTitle: tripTitle,
        duration: duration,
        seatType: seatName,
        basePrice: basePrice,
        seatFee: seatFee,
        totalCost: totalCost,
        meetingPoint: 'Саарбрюккен Hbf (или по пути)',
        userName: 'Александр',
        userHandle: '@alex_travel_de',
        userId: 984128574,
        timestamp: new Date().toLocaleString('ru-RU'),
        status: 'new'
      };
      onNewLead(newLead);

      const managerUrlWithData = `https://t.me/SVOI_travel_admin?text=${encodeURIComponent(`Здравствуйте! Мой номер брони: #${bookingCode}. Тур: ${tripTitle}, ${seatName}, к оплате: ${totalCost}€.`)}`;

      const confirmText = 
        `🎉 <b>ПОДТВЕРЖДЕНИЕ БРОНИРОВАНИЯ #${bookingCode}</b>\n\n` +
        `Здравствуйте, <b>Александр</b>! Ваша заявка в туристический клуб <b>SVOI</b> успешно зафиксирована.\n\n` +
        `📋 <b>Детали поездки:</b>\n` +
        `• 🗺 <b>Направление:</b> ${tripTitle}\n` +
        `• ⏱ <b>Длительность:</b> ${duration}\n` +
        `• 🚐 <b>Транспорт:</b> Минивэн Opel Vivaro (8 мест, кондиционер)\n` +
        `• 💺 <b>Выбранное место:</b> ${seatName}\n` +
        `• 📍 <b>Точка сбора:</b> Саарбрюккен Hbf (или по пути)\n\n` +
        `🧾 <b>Расчет стоимости:</b>\n` +
        `• Базовый билет тура: <b>${basePrice}€</b>\n` +
        `• Выбор места: <b>+${seatFee}€</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💳 <b>ИТОГО К ОПЛАТЕ: ${totalCost}€</b>\n` +
        (duration === '1 день' 
          ? `🔥 <b>Бронь БЕЗ ПРЕДОПЛАТЫ!</b> Оплата производится при посадке.\n\n` 
          : `🏨 <i>Предоплата требуется только для бронирования отеля.</i>\n\n`) +
        `👉 <b>Следующий шаг:</b> Нажмите кнопку ниже для отправки данных менеджеру @SVOI_travel_admin для связи:`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '💬 Отправить бронь менеджеру в Telegram', url: managerUrlWithData }
        ],
        [
          { text: '❓ Частые вопросы (FAQ)', callbackData: 'cb_faq' },
          { text: '📍 Точки сбора', callbackData: 'cb_meeting' }
        ],
        [
          { text: '🗺 Другие туры', callbackData: 'cb_trips' },
          { text: '🔙 Главное меню', callbackData: 'cb_back' }
        ]
      ];

      editLastBotMessage(confirmText, keyboard);
      return;
    }
  };

  const editLastBotMessage = (newText: string, newKeyboard: InlineBtn[][], photoUrl?: string) => {
    setMessages((prev) => {
      const copy = [...prev];
      let lastBotIndex = -1;
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].sender === 'bot') {
          lastBotIndex = i;
          break;
        }
      }

      if (lastBotIndex !== -1) {
        copy[lastBotIndex] = {
          ...copy[lastBotIndex],
          text: newText,
          inlineKeyboard: newKeyboard,
          photoUrl: photoUrl || undefined,
          edited: true
        };
        return copy;
      }

      return [
        ...copy,
        {
          id: `msg-${Date.now()}`,
          sender: 'bot',
          text: newText,
          time: getCurrentTime(),
          inlineKeyboard: newKeyboard,
          photoUrl: photoUrl
        }
      ];
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    setInputText('');

    // Add user message to chat stream
    const userMsg: SimMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: userText,
      time: getCurrentTime()
    };

    setMessages((prev) => [...prev, userMsg]);

    // Handle FSM Feedback
    if (fsmState === 'feedback_waiting') {
      setFsmState('idle');

      // Create CRM lead
      const feedbackLead: LeadItem = {
        id: `fb-${Date.now()}`,
        type: 'feedback',
        userName: 'Александр',
        userHandle: '@alex_travel_de',
        userId: 984128574,
        text: userText,
        timestamp: new Date().toLocaleString('ru-RU'),
        status: 'new'
      };
      onNewLead(feedbackLead);

      setTimeout(() => {
        const thanksText = 
          `❤️ <b>Спасибо за ваше обращение!</b>\n\n` +
          `Ваш отзыв/пожелание успешно передано руководству клуба SVOI. ` +
          `Мы внимательно изучаем каждое сообщение и делаем наши поездки еще ярче!\n\n` +
          `До встречи на борту Opel Vivaro VIP! 🚐✨`;

        const keyboard: InlineBtn[][] = [
          [
            { text: '🔙 Назад в меню', callbackData: 'cb_back' }
          ]
        ];

        setMessages((prev) => [
          ...prev,
          {
            id: `bot-fb-${Date.now()}`,
            sender: 'bot',
            text: thanksText,
            time: getCurrentTime(),
            inlineKeyboard: keyboard
          }
        ]);
      }, 400);

      return;
    }

    // Default handling for /start or random text
    if (userText === '/start' || userText.toLowerCase().includes('старт') || userText.toLowerCase().includes('меню')) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-start-${Date.now()}`,
            sender: 'bot',
            text: getMainWelcomeText(),
            time: getCurrentTime(),
            inlineKeyboard: getMainKeyboard()
          }
        ]);
      }, 350);
      return;
    }

    // Default bot reply
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-reply-${Date.now()}`,
          sender: 'bot',
          text: `👋 Я вас понял! Для навигации воспользуйтесь кнопками меню или отправьте команду /start.`,
          time: getCurrentTime(),
          inlineKeyboard: getMainKeyboard()
        }
      ]);
    }, 400);
  };

  const handleReset = () => {
    setFsmState('idle');
    setPendingBookingTrip(null);
    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'bot',
        text: getMainWelcomeText(),
        time: getCurrentTime(),
        inlineKeyboard: getMainKeyboard()
      }
    ]);
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Simulator View Controls */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-xl text-xs">
            <button
              onClick={() => setViewMode('mobile')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
                viewMode === 'mobile'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Смартфон (Mobile)
            </button>
            <button
              onClick={() => setViewMode('desktop')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
                viewMode === 'desktop'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Telegram Desktop
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl transition-all hover:bg-slate-800"
            title="Перезапустить бота (/start)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Сброс /start</span>
          </button>
        </div>
      </div>

      {/* Simulator Container */}
      <div
        className={`transition-all duration-300 w-full ${
          viewMode === 'mobile'
            ? 'max-w-[420px] rounded-[36px] p-3 bg-slate-950 border-[6px] border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]'
            : 'max-w-4xl rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl'
        }`}
      >
        {/* Telegram Header */}
        <div className="bg-[#17212b] text-white px-4 py-3 rounded-t-2xl flex items-center justify-between border-b border-[#0e1621] select-none">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md text-sm ring-2 ring-blue-500/30">
                SVOI
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#17212b]" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-white">SVOI Travel EU</span>
                <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-1.5 py-0.2 rounded border border-blue-500/30">
                  bot
                </span>
              </div>
              <p className="text-[11px] text-[#708499]">@Svoi_TravelEU_bot</p>
            </div>
          </div>

          {/* Quick links dropdown / icons */}
          <div className="flex items-center gap-1.5">
            <a
              href={CHANNEL_URL}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] bg-[#242f3d] hover:bg-[#2b394a] text-blue-400 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
            >
              Канал
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <a
              href={MANAGER_URL}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] bg-[#242f3d] hover:bg-[#2b394a] text-emerald-400 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
            >
              Менеджер
            </a>
          </div>
        </div>

        {/* Telegram Chat Message Stream */}
        <div className="bg-[#0e1621] p-3 sm:p-4 min-h-[460px] max-h-[580px] overflow-y-auto space-y-3 relative font-sans">
          {/* Subtle Telegram Wallpaper Pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Toast Notification (Simulating callback.answer() alert) */}
          {toastMessage && (
            <div className="sticky top-2 z-30 mx-auto w-max max-w-xs px-3 py-1.5 rounded-full bg-slate-900/95 text-slate-200 border border-slate-700/80 text-xs shadow-xl backdrop-blur-md text-center animate-fade-in flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-3 shadow-md relative ${
                  msg.sender === 'user'
                    ? 'bg-[#2b5278] text-white rounded-br-none'
                    : 'bg-[#182533] text-slate-100 rounded-bl-none border border-slate-800/80'
                }`}
              >
                {/* Photo preview if available */}
                {msg.photoUrl && (
                  <div className="mb-2.5 rounded-xl overflow-hidden border border-white/10 shadow-inner">
                    <img
                      src={msg.photoUrl}
                      alt="Travel destination"
                      className="w-full h-44 object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}

                {/* HTML content rendering */}
                <div
                  className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap select-text"
                  dangerouslySetInnerHTML={{ __html: msg.text }}
                />

                {/* Message Timestamp & Checkmarks */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 select-none">
                  {msg.edited && <span className="text-[9px] text-slate-500">изменено</span>}
                  <span>{msg.time}</span>
                  {msg.sender === 'user' && <CheckCheck className="w-3 h-3 text-blue-300" />}
                </div>

                {/* Inline Keyboard Container */}
                {msg.inlineKeyboard && msg.inlineKeyboard.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-700/50 space-y-1.5">
                    {msg.inlineKeyboard.map((row, rIdx) => (
                      <div key={rIdx} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
                        {row.map((btn, bIdx) => (
                          <button
                            key={bIdx}
                            onClick={() => handleCallbackClick(btn)}
                            className="w-full text-center py-2 px-2.5 rounded-xl bg-[#242f3d] hover:bg-[#2e3b4d] active:bg-[#344257] text-blue-300 hover:text-white text-xs font-medium transition-all border border-slate-700/40 hover:border-blue-500/40 flex items-center justify-center gap-1 shadow-sm select-none"
                          >
                            <span className="truncate">{btn.text}</span>
                            {btn.url && <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* FSM Notice Bar (Active when waiting for user input) */}
        {fsmState === 'feedback_waiting' && (
          <div className="bg-amber-950/60 border-t border-amber-500/30 px-3 py-1.5 text-xs text-amber-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MessageSquareHeart className="w-3.5 h-3.5 text-amber-400" />
              <span>Режим FSM: <b>FeedbackState.waiting_for_text</b></span>
            </span>
            <button
              onClick={() => handleCallbackClick({ text: 'Отмена', callbackData: 'cb_cancel_feedback' })}
              className="text-[11px] underline text-amber-300 hover:text-white"
            >
              Отменить ввод
            </button>
          </div>
        )}

        {/* Telegram Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="bg-[#17212b] p-2.5 flex items-center gap-2 rounded-b-2xl border-t border-[#0e1621]"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              fsmState === 'feedback_waiting'
                ? 'Напишите ваш отзыв или пожелание...'
                : 'Напишите сообщение или /start...'
            }
            className={`flex-1 bg-[#242f3d] text-white text-xs sm:text-sm px-3.5 py-2.5 rounded-xl outline-none placeholder:text-[#708499] border transition-colors ${
              fsmState === 'feedback_waiting'
                ? 'border-amber-500/60 focus:border-amber-400 ring-1 ring-amber-500/30'
                : 'border-transparent focus:border-blue-500/60'
            }`}
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white flex items-center justify-center transition-all shadow-md shrink-0"
            title="Отправить сообщение"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>

      {/* Simulator Quick Tips */}
      <div className="mt-3 text-center text-xs text-slate-500">
        💡 Интерактивный симулятор воспроизводит реальную логику aiogram 3.x с сохранением состояний FSM и заменой текста (edit_text)
      </div>
    </div>
  );
};
