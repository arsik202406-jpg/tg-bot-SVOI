import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { TRIPS_LIST } from './src/data/tripsData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Enable iframe embedding across AI Studio preview, Telegram WebApps, mobile & desktop
  app.use((_req, res, next) => {
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    next();
  });

  // API endpoint to verify Telegram Bot token directly
  app.post('/api/telegram/verify', async (req, res) => {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ ok: false, error: 'Token is required' });
    }
    try {
      const resp = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await resp.json();
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // API endpoint to send a real test message or notification to admin
  app.post('/api/telegram/send-message', async (req, res) => {
    const { token, chatId, text, parseMode } = req.body;
    if (!token || !chatId || !text) {
      return res.status(400).json({ ok: false, error: 'token, chatId and text are required' });
    }
    try {
      const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: parseMode || 'HTML',
        }),
      });
      const data = await resp.json();
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // API endpoint to update MenuButtonWebApp URL in Telegram Bot
  app.post('/api/telegram/set-miniapp-url', async (req, res) => {
    const { token, miniAppUrl } = req.body;
    const botToken = token || '8969834514:AAHl3mDZU00jncjJ52TyGTHmcs_-l5CBjPM';
    if (!miniAppUrl || !miniAppUrl.startsWith('https://')) {
      return res.status(400).json({ ok: false, error: 'Вкажіть публічний HTTPS URL (починається з https://)' });
    }
    try {
      currentMiniAppUrl = miniAppUrl;
      const resp = await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_button: {
            type: 'web_app',
            text: '🚀 SVOI Mini App',
            web_app: { url: miniAppUrl },
          },
        }),
      });
      const data = await resp.json();
      res.json({ ...data, miniAppUrl });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Bind port 3000 immediately so readiness probes succeed without waiting for Vite cold-start
  app.listen(port, '0.0.0.0', () => {
    console.log(`SVOI Travel server running on http://0.0.0.0:${port}`);
    startLiveTelegramBotPolling();
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vitePromise = createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  }
}

// Live Telegram Bot Polling so @Svoi_TravelEU_bot immediately responds with single-window message editing,
// unified tour cards, 1-2 click booking ([1], [2], [3+], request_contact=True, auto @username), and admin date/poster/seats controls
const DEFAULT_BOT_TOKEN = process.env.BOT_TOKEN || '8969834514:AAHl3mDZU00jncjJ52TyGTHmcs_-l5CBjPM';
const ADMIN_ID = Number(process.env.ADMIN_ID) || 8450153980;
let currentMiniAppUrl =
  process.env.MINI_APP_URL ||
  'https://arsik202406-jpg.github.io/tg-bot-SVOI/?miniapp=1';
let currentChannelTarget = process.env.CHANNEL_CHAT_ID || '@svoi_traveleu';

// Dynamic tour overrides for Admin (seats, dates, posters)
const liveSeatsOverride: Record<string, number> = {
  paris: 4,
  etretat_paris: 6,
  amsterdam: 5,
  bruges: 4,
  liechtenstein: 4,
  neuschwanstein: 2,
  berlin_dresden: 4,
  legoland: 5,
  stuttgart: 4,
  europa_park: 2,
  eltz_cochem: 5,
  heidelberg_baden: 6,
  cote_dazur: 5,
  mont_saint_michel: 6,
  swiss_rhine_zurich: 4,
  swiss_aare_bern: 3,
  brussels: 5,
  prague: 5,
  alsace_strasbourg: 6,
  como_milan: 2,
};
const liveDateOverride: Record<string, string> = {};
const livePosterOverride: Record<string, string> = {};

function getCountryFlag(country?: string): string {
  const c = country || '';
  if (c.includes('Ліхтенштейн')) return '🇱🇮';
  if (c.includes('Франція')) return '🇫🇷';
  if (c.includes('Голландія') || c.includes('Нідерланди')) return '🇳🇱';
  if (c.includes('Бельгія')) return '🇧🇪';
  if (c.includes('Німеччина')) return '🇩🇪';
  if (c.includes('Швейцарія')) return '🇨🇭';
  if (c.includes('Люксембург')) return '🇱🇺';
  if (c.includes('Чехія')) return '🇨🇿';
  if (c.includes('Італія')) return '🇮🇹';
  return '🇪🇺';
}

function getLiveTripDate(tripId: string, fallbackDates?: string[]): string {
  if (liveDateOverride[tripId]) return liveDateOverride[tripId];
  return fallbackDates && fallbackDates.length > 0 ? fallbackDates[0] : 'Найближчі вихідні';
}

function getLiveTripPoster(tripId: string, fallbackImg: string): string {
  return livePosterOverride[tripId] || fallbackImg;
}

function getLiveFreeSeats(tripId: string): number {
  return liveSeatsOverride[tripId] ?? 4;
}

// Track per-chat state for admin & 1-2 click booking
interface ChatSessionState {
  mode:
    | 'waiting_gw_prize'
    | 'waiting_channel_id'
    | 'waiting_admin_date'
    | 'waiting_admin_poster'
    | 'waiting_booking_contact'
    | null;
  tripId?: string;
  paxCount?: string;
}
const chatSessions: Record<number, ChatSessionState> = {};

const activeGiveaway = {
  id: 'gw_active',
  prize: 'Безкоштовна поїздка до Парижа на 1 день (Версаль + яхта) 🥐🗼',
  participants: [] as Array<{ user_id: number; username: string; first_name: string }>,
  is_active: true,
};

function getMainMenuMarkup(userId?: number) {
  const isAdmin = userId === ADMIN_ID;
  const rows: any[][] = [
    [
      { text: '🗺 Напрямки та дати', callback_data: 'cb_trips' },
      { text: '⭐ Відгуки туристів', callback_data: 'cb_reviews' },
    ],
    [{ text: '💺 ЗАБРОНЮВАТИ МІСЦЕ', callback_data: 'cb_book' }],
    [
      { text: '❓ Часті питання (FAQ)', callback_data: 'cb_faq' },
      { text: '🤝 Стати партнером клубу', callback_data: 'cb_partner' },
    ],
    [
      { text: '🎮 Ігри та вікторини', callback_data: 'cb_games' },
      { text: '📢 Наш канал', url: 'https://t.me/+Flt_2r6vi3U4ZDg6' },
    ],
    [{ text: "💬 ЗВ'ЯЗОК З МЕНЕДЖЕРОМ", url: 'https://t.me/SVOI_travel_admin' }],
  ];

  if (isAdmin) {
    rows.push([
      { text: '👑 Керування каналом (/channel)', callback_data: 'cb_adm_channel_menu' },
      { text: '📋 Лист очікування', callback_data: 'cb_adm_waitlist' },
    ]);
  }

  return { inline_keyboard: rows };
}

function getTripsCatalogMarkup(prefix = 'trip_') {
  const rows: any[][] = TRIPS_LIST.map((trip) => {
    const free = getLiveFreeSeats(trip.id);
    const flag = getCountryFlag(trip.country);
    const dateStr = getLiveTripDate(trip.id, trip.departureDates);
    const seatsLabel = free > 0 ? `🔥 ${free}/8` : '🔴 0/8';
    return [
      {
        text: `${flag} ${trip.shortTitle} | ${dateStr} • ${trip.price}€ (${seatsLabel})`,
        callback_data: `${prefix}${trip.id}`,
      },
    ];
  });
  if (prefix === 'trip_') {
    rows.push([{ text: '💺 ЗАБРОНЮВАТИ МІСЦЕ', callback_data: 'cb_book' }]);
  }
  rows.push([{ text: '🔙 Назад в меню', callback_data: 'cb_back' }]);
  return { inline_keyboard: rows };
}

function getChannelAdminMarkup() {
  return {
    inline_keyboard: [
      [
        { text: '🎁 Запустити новий РОЗІГРАШ', callback_data: 'cb_adm_gw_new' },
        { text: '🏆 Вибрати переможця', callback_data: 'cb_adm_gw_pick' },
      ],
      [
        { text: '🧠 Надіслати вікторину (Квіз)', callback_data: 'cb_adm_send_quiz' },
        { text: '⚙️ Прив’язати закритий канал', callback_data: 'cb_adm_set_channel' },
      ],
      [{ text: '🔙 Назад в меню', callback_data: 'cb_back' }],
    ],
  };
}

function getGamesMarkup() {
  return {
    inline_keyboard: [
      [
        { text: '🕵️ Гра «Гео-Детектив»', callback_data: 'cb_game_geo' },
        { text: '🧠 «Правда чи Неправда»', callback_data: 'cb_game_quiz' },
      ],
      [
        { text: '🍽 Гастро-Квіз «Смаки Європи»', callback_data: 'cb_game_gastro' },
        { text: '💶 Експерт маршрутів (Час і Ціни)', callback_data: 'cb_game_price' },
      ],
      [
        { text: '📊 Опитування мандрівників', callback_data: 'cb_game_poll' },
        { text: '🎒 Підбір ідеального туру', callback_data: 'cb_game_match' },
      ],
      [
        { text: '🎰 Колесо Фортуни SVOI', callback_data: 'cb_game_wheel' },
      ],
      [{ text: '🔙 Назад в меню', callback_data: 'cb_back' }],
    ],
  };
}

const WELCOME_HTML =
  `🌟 <b>Ласкаво просимо до туристичного клубу SVOI!</b> 🌍✨\n\n` +
  `<blockquote>🚐 <b>Комфортабельні поїздки Європою на Opel Vivaro (8 місць)</b> із Саарланду, Тріра та Люксембургу прямо від вашого дому (Door-to-Door)!\n` +
  `💳 <b>Правило клубу:</b> <code>0% передоплати</code> на всі одноденні поїздки (оплата при посадці)!</blockquote>\n\n` +
  `✨ <b>Наші головні переваги:</b>\n` +
  `• <b>20 авторських турів:</b> Париж, Амстердам, Брюгге, Швейцарія, Комо, Нойшванштайн, Європа-Парк, Берлін, Леголенд, Штутгарт, Долина Мозеля\n` +
  `• <b>Заявка в 1–2 кліки:</b> без необхідності друкувати текст вручну\n` +
  `• <b>Салон із зоряним LED-небом:</b> бронь конкретного місця лише <code>5€</code> (або <code>0€</code> вільна посадка)\n\n` +
  `👇 <b>Оберіть розділ нижче:</b>`;

async function tgApi(method: string, body: Record<string, any>) {
  const resp = await fetch(`https://api.telegram.org/bot${DEFAULT_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return resp.json();
}

// Smart single-window editor: edits text or media in place without spamming new messages
async function smartEditMessage(
  chatId: number,
  msgId: number,
  hasPhotoInCurrentMsg: boolean,
  text: string,
  replyMarkup: any,
  newPhotoUrl?: string,
) {
  if (newPhotoUrl) {
    const mediaRes: any = await tgApi('editMessageMedia', {
      chat_id: chatId,
      message_id: msgId,
      media: {
        type: 'photo',
        media: newPhotoUrl,
        caption: text,
        parse_mode: 'HTML',
      },
      reply_markup: replyMarkup,
    });
    if (!mediaRes.ok) {
      await tgApi('deleteMessage', { chat_id: chatId, message_id: msgId });
      const sent: any = await tgApi('sendPhoto', {
        chat_id: chatId,
        photo: newPhotoUrl,
        caption: text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });
      if (!sent.ok) {
        await tgApi('sendMessage', {
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        });
      }
    }
    return;
  }

  if (hasPhotoInCurrentMsg) {
    // Transitioning from a photo card back to a text menu: delete photo and send text in same spot
    await tgApi('deleteMessage', { chat_id: chatId, message_id: msgId });
    await tgApi('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    });
    return;
  }

  const editRes: any = await tgApi('editMessageText', {
    chat_id: chatId,
    message_id: msgId,
    text,
    parse_mode: 'HTML',
    reply_markup: replyMarkup,
  });
  if (!editRes.ok && !String(editRes.description || '').includes('message is not modified')) {
    await tgApi('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    });
  }
}

async function sendTourCardToChat(chatId: number, msgId: number | null, hasPhoto: boolean, tripId: string, userId: number) {
  const trip = TRIPS_LIST.find((t) => t.id === tripId);
  if (!trip) return;

  const freeSeats = getLiveFreeSeats(trip.id);
  const flag = getCountryFlag(trip.country);
  const dateStr = getLiveTripDate(trip.id, trip.departureDates);
  const posterUrl = getLiveTripPoster(trip.id, trip.image);
  const highlightsList = (trip.highlights || []).map((h) => `• ${h}`).join('\n');
  const programSteps = (trip.detailedProgram || []).map((p) => `🔹 ${p}`).join('\n');
  const paymentRule =
    trip.duration === '1 день'
      ? `<code>0€ передоплати</code> (оплата при посадці)`
      : `<code>готель включено у вартість</code>`;

  const rawCaption =
    `${flag} <b>${trip.title} | ${dateStr}</b>\n` +
    `🌍 <i>Країна: ${trip.country} • Тривалість: ${trip.duration}</i>\n\n` +
    `📖 <b>Загальна інформація:</b>\n${trip.description}\n\n` +
    `🗺 <b>Детальна програма маршруту:</b>\n` +
    `${programSteps || highlightsList}\n\n` +
    `💶 <b>Ціна: ${trip.price}€</b> | 🔥 <b>Місць: ${freeSeats} з 8</b>\n\n` +
    `<blockquote>🚐 <b>Авто:</b> Opel Vivaro (8 місць) • 📍 Збір за адресою (Саарланд, Трір, Люксембург) • 💡 ${paymentRule}</blockquote>`;
  // Guard against Telegram 1024-char photo caption limit
  const cardCaption = rawCaption.length <= 1020 ? rawCaption : rawCaption.slice(0, 1015) + '...';

  const rows: any[][] = [];
  if (freeSeats > 0) {
    rows.push([{ text: `💺 Обрати місце та забронювати (${freeSeats} з 8)`, callback_data: `book_trip_${trip.id}` }]);
  } else {
    rows.push([{ text: `📋 Записатися в лист очікування (0 з 8)`, callback_data: `waitlist_add_${trip.id}` }]);
  }

  rows.push([
    { text: '📋 Лист очікування', callback_data: `waitlist_add_${trip.id}` },
    { text: '🚐 Індивідуальний виїзд', callback_data: 'cb_custom_trip' },
  ]);

  if (userId === ADMIN_ID) {
    rows.push([
      { text: `⚙️ Місця (${freeSeats}/8)`, callback_data: `adm_seats_${trip.id}` },
      { text: `📅 Дата`, callback_data: `adm_date_${trip.id}` },
      { text: `🖼 Постер`, callback_data: `adm_poster_${trip.id}` },
    ]);
  }

  rows.push([
    { text: '🗺 До списку напрямків', callback_data: 'cb_trips' },
    { text: '🔙 Назад в меню', callback_data: 'cb_back' },
  ]);

  const markup = { inline_keyboard: rows };

  if (msgId) {
    await smartEditMessage(chatId, msgId, hasPhoto, cardCaption, markup, posterUrl);
  } else {
    const sent: any = await tgApi('sendPhoto', {
      chat_id: chatId,
      photo: posterUrl,
      caption: cardCaption,
      parse_mode: 'HTML',
      reply_markup: markup,
    });
    if (!sent.ok) {
      await tgApi('sendMessage', {
        chat_id: chatId,
        text: cardCaption,
        parse_mode: 'HTML',
        reply_markup: markup,
      });
    }
  }
}

async function startLiveTelegramBotPolling() {
  let offset = 0;
  try {
    await tgApi('setChatMenuButton', {
      menu_button: {
        type: 'web_app',
        text: '🚀 SVOI Mini App',
        web_app: { url: currentMiniAppUrl },
      },
    });
  } catch (_e) {
    // ignore
  }

  const poll = async () => {
    try {
      const resp = await fetch(
        `https://api.telegram.org/bot${DEFAULT_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=15`,
      );
      const data: any = await resp.json();
      if (!data.ok) {
        if (data.error_code === 409) {
          setTimeout(poll, 30000);
          return;
        }
        setTimeout(poll, 5000);
        return;
      }

      for (const update of data.result || []) {
        offset = update.update_id + 1;

        // 1. Auto-detect private channel ID (-100...)
        if (update.channel_post && update.channel_post.chat) {
          currentChannelTarget = String(update.channel_post.chat.id);
        }
        if (update.my_chat_member && update.my_chat_member.chat) {
          const ch = update.my_chat_member.chat;
          if (ch.type === 'channel' || ch.type === 'supergroup') {
            currentChannelTarget = String(ch.id);
            await tgApi('sendMessage', {
              chat_id: ADMIN_ID,
              parse_mode: 'HTML',
              text:
                `🎉 <b>Канал «${ch.title || 'SVOI'}» автоматично прив'язано!</b>\n` +
                `🆔 Числовий ID: <code>${currentChannelTarget}</code>\n` +
                `Тепер усі розіграші з /channel публікуватимуться прямо туди!`,
            });
          }
        }

        // 2. Handle incoming messages
        if (update.message) {
          const msg = update.message;
          const chatId: number = msg.chat.id;
          const userId: number = msg.from?.id || 0;
          const text: string = (msg.text || '').trim();
          const session = chatSessions[chatId] || { mode: null };

          // Handle shared contact (request_contact=True) in Step 3 of booking
          if (msg.contact) {
            const phone = msg.contact.phone_number || '';
            const firstName = msg.from?.first_name || 'Мандрівник';
            const username = msg.from?.username ? `@${msg.from.username}` : 'не вказано';
            const tripId = session.tripId || 'paris';
            const paxCount = session.paxCount || '1';
            chatSessions[chatId] = { mode: null };

            const SEAT_INFO: Record<string, { label: string; fee: number; pax: number }> = {
              seat1: { label: '💺 Місце 1 (1-й ряд, Панорамне +5€)', fee: 5, pax: 1 },
              seat2: { label: '💺 Місце 2 (1-й ряд, Вікно +5€)', fee: 5, pax: 1 },
              seat3: { label: '💺 Місце 3 (2-й ряд, Ліве вікно +5€)', fee: 5, pax: 1 },
              seat4: { label: '💺 Місце 4 (2-й ряд, Центр +5€)', fee: 5, pax: 1 },
              seat5: { label: '💺 Місце 5 (2-й ряд, Праве вікно +5€)', fee: 5, pax: 1 },
              seat6: { label: '💺 Місце 6 (3-й ряд, Ліве вікно +5€)', fee: 5, pax: 1 },
              seat7: { label: '💺 Місце 7 (3-й ряд, Центр 0€)', fee: 0, pax: 1 },
              seat8: { label: '💺 Місце 8 (3-й ряд, Праве вікно +5€)', fee: 5, pax: 1 },
              '1': { label: '🎲 Вільна посадка (1 особа, 0€)', fee: 0, pax: 1 },
              '2': { label: '👥 2 місця поруч', fee: 0, pax: 2 },
              '3': { label: '👨‍👩‍👧 3+ місць (компанія)', fee: 0, pax: 3 },
            };
            const selectedSeat = SEAT_INFO[paxCount] || SEAT_INFO['1'];

            const trip = TRIPS_LIST.find((t) => t.id === tripId);
            const flag = trip ? getCountryFlag(trip.country) : '🇪🇺';
            const tripTitle = trip ? trip.shortTitle : 'Обраний тур';
            const dateStr = getLiveTripDate(tripId, trip?.departureDates);
            const price = trip ? trip.price : 120;
            const totalCost = price * selectedSeat.pax + selectedSeat.fee;
            const bookingCode = `SVOI-${Math.floor(1000 + Math.random() * 9000)}`;

            // Remove ReplyKeyboard
            await tgApi('sendMessage', {
              chat_id: chatId,
              text: '✅ Контакт успішно отримано!',
              reply_markup: { remove_keyboard: true },
            });

            // Notify Admin
            await tgApi('sendMessage', {
              chat_id: ADMIN_ID,
              parse_mode: 'HTML',
              text:
                `🔥 <b>НОВА БРОНЬ У 2 КЛІКИ #${bookingCode}!</b>\n\n` +
                `🗺 <b>Напрямок:</b> ${flag} ${tripTitle} | ${dateStr}\n` +
                `💺 <b>Обране місце:</b> <code>${selectedSeat.label}</code>\n` +
                `💶 <b>Сума:</b> <code>${totalCost}€</code>\n` +
                `👤 <b>Клієнт:</b> ${firstName} (${username})\n` +
                `📱 <b>Телефон:</b> <code>${phone}</code>`,
            });

            await tgApi('sendMessage', {
              chat_id: chatId,
              parse_mode: 'HTML',
              text:
                `🎉 <b>ЗАЯВКУ #${bookingCode} ПРИЙНЯТО!</b>\n\n` +
                `Дякуємо, <b>${firstName}</b>! Ваше бронювання в клубі <b>SVOI</b> зафіксовано.\n\n` +
                `${flag} <b>${tripTitle} | ${dateStr}</b>\n` +
                `• 💺 <b>Обране місце:</b> <code>${selectedSeat.label}</code>\n` +
                `• 📱 <b>Контакт:</b> <code>${phone} (${username})</code>\n` +
                `• 💶 <b>До оплати:</b> <code>${totalCost}€</code>\n\n` +
                `<blockquote>🔥 <b>Бронь БЕЗ ПЕРЕДОПЛАТИ!</b> Менеджер зв'яжеться з вами для уточнення адреси виїзду.</blockquote>`,
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🗺 Інші напрямки та дати', callback_data: 'cb_trips' }],
                  [{ text: '🔙 Назад в меню', callback_data: 'cb_back' }],
                ],
              },
            });
            continue;
          }

          // Check if user forwarded a post from their private channel
          const fwdChat = msg.forward_origin?.chat || msg.forward_from_chat;
          if (fwdChat && (fwdChat.type === 'channel' || fwdChat.type === 'supergroup')) {
            currentChannelTarget = String(fwdChat.id);
            chatSessions[chatId] = { mode: null };
            await tgApi('sendMessage', {
              chat_id: chatId,
              parse_mode: 'HTML',
              text:
                `✅ <b>Закритий канал успішно розпізнано та прив'язано!</b> 🎉\n\n` +
                `📢 Назва: <b>${fwdChat.title || 'Канал SVOI'}</b>\n` +
                `🆔 Числовий ID: <code>${currentChannelTarget}</code>\n\n` +
                `Тепер натискайте «🎁 Запустити новий РОЗІГРАШ» — пости підуть прямо в ваш канал!`,
              reply_markup: getChannelAdminMarkup(),
            });
            continue;
          }

          // Handle Admin Poster Photo or URL upload
          if (session.mode === 'waiting_admin_poster' && session.tripId && userId === ADMIN_ID) {
            const targetTripId = session.tripId;
            let newPoster = '';
            if (msg.photo && msg.photo.length > 0) {
              newPoster = msg.photo[msg.photo.length - 1].file_id;
            } else if (text.startsWith('http://') || text.startsWith('https://')) {
              newPoster = text;
            }
            if (newPoster) {
              livePosterOverride[targetTripId] = newPoster;
              chatSessions[chatId] = { mode: null };
              await sendTourCardToChat(chatId, null, false, targetTripId, userId);
              continue;
            }
          }

          // Handle Admin Date text input
          if (session.mode === 'waiting_admin_date' && session.tripId && text && userId === ADMIN_ID) {
            const targetTripId = session.tripId;
            liveDateOverride[targetTripId] = text;
            chatSessions[chatId] = { mode: null };
            await sendTourCardToChat(chatId, null, false, targetTripId, userId);
            continue;
          }

          if (text.startsWith('/start') || text.startsWith('/menu')) {
            chatSessions[chatId] = { mode: null };
            await tgApi('sendMessage', {
              chat_id: chatId,
              text: WELCOME_HTML,
              parse_mode: 'HTML',
              reply_markup: getMainMenuMarkup(userId),
            });
            continue;
          }

          if (text.startsWith('/channel')) {
            chatSessions[chatId] = { mode: null };
            await tgApi('sendMessage', {
              chat_id: chatId,
              parse_mode: 'HTML',
              text:
                `📢 <b>Центр керування Telegram-каналом SVOI Travel</b>\n\n` +
                `🎯 Цільовий канал: <code>${currentChannelTarget}</code>\n` +
                `🎁 Активний розіграш: <b>${activeGiveaway.prize}</b>\n` +
                `👥 Учасників: <b>${activeGiveaway.participants.length}</b>\n\n` +
                `💡 <i>Якщо ваш канал приватний (за посиланням t.me/+...), просто перешліть сюди будь-який пост із каналу — бот автоматично збереже його числовий ID (-100...)!</i>`,
              reply_markup: getChannelAdminMarkup(),
            });
            continue;
          }

          if (session.mode === 'waiting_channel_id' && text) {
            chatSessions[chatId] = { mode: null };
            currentChannelTarget = text;
            await tgApi('sendMessage', {
              chat_id: chatId,
              parse_mode: 'HTML',
              text: `✅ <b>Цільовий канал збережено:</b> <code>${currentChannelTarget}</code>`,
              reply_markup: getChannelAdminMarkup(),
            });
            continue;
          }

          if (session.mode === 'waiting_gw_prize' && text) {
            chatSessions[chatId] = { mode: null };
            activeGiveaway.prize = text;
            activeGiveaway.participants = [];
            activeGiveaway.is_active = true;

            const gwText =
              `🎉🔥 <b>ГРАНДІОЗНИЙ РОЗІГРАШ ВІД ТУРИСТИЧНОГО КЛУБУ SVOI!</b> 🌍✨\n\n` +
              `Ми розігруємо неймовірний приз:\n` +
              `🎁 <b>${text}</b>\n\n` +
              `<b>Умови участі максимально прості:</b>\n` +
              `1️⃣ Бути підписаним на наш офіційний канал\n` +
              `2️⃣ Натиснути кнопку <b>«🎉 Брати участь! (0)»</b> нижче!\n\n` +
              `<i>Бот автоматично перевіряє підписку та рахує учасників. Переможця визначить рандом!</i>`;

            const gwMarkup = {
              inline_keyboard: [
                [{ text: '🎉 Брати участь! (0)', callback_data: 'gw_join_gw_active' }],
                [{ text: '💺 Забронювати місце', url: 'https://t.me/Svoi_TravelEU_bot?start=trips' }],
              ],
            };

            const pubRes: any = await tgApi('sendMessage', {
              chat_id: currentChannelTarget,
              text: gwText,
              parse_mode: 'HTML',
              reply_markup: gwMarkup,
            });

            if (pubRes.ok) {
              await tgApi('sendMessage', {
                chat_id: chatId,
                parse_mode: 'HTML',
                text: `✅ <b>Розіграш УСПІШНО ОПУБЛІКОВАНО прямо в канал <code>${currentChannelTarget}</code>!</b> 🎉`,
                reply_markup: getChannelAdminMarkup(),
              });
            } else {
              await tgApi('sendMessage', {
                chat_id: chatId,
                parse_mode: 'HTML',
                text:
                  `⚠️ <b>Помилка публікації в <code>${currentChannelTarget}</code>:</b>\n` +
                  `<code>${pubRes.description || 'chat not found'}</code>\n\n` +
                  `Перешліть сюди в бот будь-який пост зі свого каналу — бот миттєво збереже числовий ID <code>-100...</code>!`,
                reply_markup: getChannelAdminMarkup(),
              });
            }
            continue;
          }
        } else if (update.callback_query) {
          const cb = update.callback_query;
          const chatId: number | undefined = cb.message?.chat?.id;
          const msgId: number | undefined = cb.message?.message_id;
          const hasPhoto = Boolean(cb.message?.photo);
          const userId: number = cb.from?.id || 0;
          const cbData: string = cb.data || '';

          if (cbData.startsWith('gw_join_')) {
            const exists = activeGiveaway.participants.some((p) => p.user_id === userId);
            if (!exists) {
              activeGiveaway.participants.push({
                user_id: userId,
                username: cb.from?.username ? `@${cb.from.username}` : cb.from?.first_name || 'Учасник',
                first_name: cb.from?.first_name || 'Мандрівник',
              });
            }
            const count = activeGiveaway.participants.length;
            await tgApi('answerCallbackQuery', {
              callback_query_id: cb.id,
              text: exists
                ? `✅ Ви вже зареєстровані у розіграші!`
                : `🎉 Вітаємо! Ви успішно зареєстровані! Учасників: ${count}`,
              show_alert: true,
            });
            if (chatId && msgId) {
              await tgApi('editMessageReplyMarkup', {
                chat_id: chatId,
                message_id: msgId,
                reply_markup: {
                  inline_keyboard: [
                    [{ text: `🎉 Брати участь! (${count})`, callback_data: 'gw_join_gw_active' }],
                    [{ text: '💺 Забронювати місце', url: 'https://t.me/Svoi_TravelEU_bot?start=trips' }],
                  ],
                },
              });
            }
            continue;
          }

          await tgApi('answerCallbackQuery', { callback_query_id: cb.id });
          if (!chatId || !msgId) continue;

          if (cbData === 'cb_back') {
            chatSessions[chatId] = { mode: null };
            await smartEditMessage(chatId, msgId, hasPhoto, WELCOME_HTML, getMainMenuMarkup(userId));
          } else if (cbData === 'cb_trips') {
            chatSessions[chatId] = { mode: null };
            const headerText =
              `🗺 <b>Напрямки та дати поїздок SVOI — Повна інформація по програмах</b> 🇪🇺✨\n\n` +
              `Ми організовуємо душевні авторські подорожі в камерному форматі (до 8 осіб) на комфортабельному <b>Opel Vivaro</b>:\n\n` +
              `🌍 <b>Детальний огляд наших поїздок за країнами:</b>\n` +
              `• 🇫🇷 <b>Франція:</b>\n` +
              `  — <b>Ельзас + Страсбург + Кольмар (80€):</b> Маленька Франція, собор Нотр-Дам, канали Кольмара, Тарт Фламбе\n` +
              `  — <b>Париж (120€):</b> Версальський палац, круїз на яхті по Сені, Лувр, вечірня Ейфелева вежа\n` +
              `  — <b>Етрета + Париж (140€):</b> 5 годин на скелях Етрета біля океану + 2–3 год вечірній Париж\n` +
              `  — <b>Мон-Сен-Мішель (2 дні, 270€):</b> острів-абатство, Сен-Мало та устриці Канкаля (готель включено)\n` +
              `  — <b>Лазурове узбережжя (3 дні, 440€):</b> Ніцца, Монако, Монте-Карло, Канни (готель включено)\n` +
              `• 🇧🇪 <b>Бельгія:</b>\n` +
              `  — <b>Брюссель, Антверпен та Брюгге (90€–110€):</b> Гран-Плас, Атоміум, вокзал-палац Антверпена, Озеро Кохання та канали Брюгге\n` +
              `• 🇳🇱 <b>Голландія (Нідерланди):</b>\n` +
              `  — <b>Гітхорн, Заандам, Амстердам, Море (120€):</b> водне село Гітхорн, вітряки Заандама, канали Амстердама та пляж Північного моря\n` +
              `• 🇩🇪 <b>Німеччина (окремі авторські виїзди):</b>\n` +
              `  — <b>Замок Нойшванштайн + ущелина Партнахкламм (120€):</b> міст Марієнбрюке, озеро Альпзее та гірська ущелина з водоспадами\n` +
              `  — <b>Берлін + Дрезден (2 дні, 240€):</b> Бранденбурзькі ворота, Рейхстаг, палац Цвінгер, Фрауенкірхе (готель включено)\n` +
              `  — <b>Парк розваг Леголенд / LEGOLAND (115€):</b> сімейний виїзд у Гюнцбург (Мініленд та 60+ атракціонів)\n` +
              `  — <b>Штутгарт (95€):</b> музеї Mercedes-Benz і Porsche + футуристична бібліотека\n` +
              `  — <b>Європа-Парк / Europa-Park (95€):</b> топ-парк розваг Європи в Русті (лише ~2 год від Саарланду)\n` +
              `  — <b>Долина Мозеля: Замок Ельц + Кохем + міст Гайєрлай (85€):</b> замок Burg Eltz, підвісний міст та дегустація Рислінгу\n` +
              `  — <b>Гайдельберг + курорт Баден-Баден (85€):</b> замок Гайдельберга та королівські терми\n` +
              `• 🇱🇮 <b>Ліхтенштейн (3 країни за 1 день, 120€):</b>\n` +
              `  — <b>Вадуц, Брегенц та Ліндау:</b> замок Вадуц, сцена на Боденському озері в Брегенці та острів Ліндау\n` +
              `• 🇨🇭 <b>Швейцарія (120€):</b>\n` +
              `  — <b>Рейнський водоспад + Цюрих + Люцерн</b> АБО <b>Ущелина Ааре + Лаутербруннен (72 водоспади) + Берн</b>\n` +
              `• 🇮🇹 <b>Італія (2 дні, 270€):</b> <b>Озеро Комо + Мілан</b> (вілли Белладжо, катер, собор Дуомо, готель включено)\n` +
              `• 🇨🇿 <b>Чехія (120€):</b> <b>Прага</b> (Празький Град, Карлів міст, куранти Орлой)\n\n` +
              `<blockquote>🚐 <b>Авто:</b> 8-місний <b>Opel Vivaro</b> (клімат-контроль, USB, стеля «Зоряне небо», багаж до <code>10 кг</code>)\n` +
              `📍 <b>Збір за адресою (Door-to-Door):</b> Саарланд, Трір та Люксембург\n` +
              `💳 <b>Оплата:</b> <code>0% передоплати</code> на всі одноденні тури!</blockquote>\n\n` +
              `👇 <b>Натисніть на будь-яку поїздку нижче, щоб відкрити погодинну програму, фото та забронювати місце:</b>`;
            await smartEditMessage(chatId, msgId, hasPhoto, headerText, getTripsCatalogMarkup('trip_'));
          } else if (cbData.startsWith('trip_')) {
            const tripId = cbData.replace('trip_', '');
            await sendTourCardToChat(chatId, msgId, hasPhoto, tripId, userId);
          } else if (cbData === 'cb_book') {
            const bookText =
              `💺 <b>Крок 1 із 3: Спочатку оберіть тур для бронювання місця</b> 🗺✨\n\n` +
              `<blockquote>🔥 <b>Порядок бронювання в клубі SVOI:</b>\n` +
              `1️⃣ <b>Спочатку оберіть напрямок та дату</b> зі списку нижче\n` +
              `2️⃣ <b>Потім оберіть місце в салоні</b> Opel Vivaro (1–8 або вільна посадка)\n` +
              `3️⃣ <b>Підтвердіть заявку в 1 клік!</b> (<code>0% передоплати</code> на одноденні поїздки)</blockquote>\n\n` +
              `👇 <b>Натисніть на бажаний тур, щоб перейти до вибору місця:</b>`;
            await smartEditMessage(chatId, msgId, hasPhoto, bookText, getTripsCatalogMarkup('book_trip_'));
          } else if (cbData.startsWith('book_trip_')) {
            const tripId = cbData.replace('book_trip_', '');
            const trip = TRIPS_LIST.find((t) => t.id === tripId);
            const flag = trip ? getCountryFlag(trip.country) : '🇪🇺';
            const title = trip ? trip.shortTitle : 'Обраний тур';
            const dateStr = getLiveTripDate(tripId, trip?.departureDates);
            const price = trip ? trip.price : 120;
            const freeSeats = getLiveFreeSeats(tripId);

            const step2Text =
              `💺 <b>Крок 2 із 3: Оберіть місце в салоні Opel Vivaro</b>\n\n` +
              `${flag} <b>${title} | ${dateStr}</b>\n` +
              `💶 <b>Базовий тариф: ${price}€</b> | 🔥 <b>Вільно: ${freeSeats} з 8</b>\n\n` +
              `🚐 <b>Схема 8-місного салону (2+3+3):</b>\n` +
              `• <b>1-й ряд (біля водія):</b> Місце 1 — <code>+5€ (Панорамне)</code>, Місце 2 — <code>+5€ (Вікно)</code>\n` +
              `• <b>2-й ряд:</b> Місце 3 (ліве), Місце 4 (центр), Місце 5 (праве) — <code>+5€</code>\n` +
              `• <b>3-й ряд:</b> Місце 6 (ліве <code>+5€</code>), Місце 7 (центр <code>0€</code>), Місце 8 (праве <code>+5€</code>)\n` +
              `• <b>🎲 Вільна посадка:</b> без фіксації місця — <code>0€</code>\n\n` +
              `<blockquote>👇 <b>Натисніть на потрібне місце в салоні нижче:</b></blockquote>`;

            const paxMarkup = {
              inline_keyboard: [
                [
                  { text: '💺 1: Панорамне (+5€)', callback_data: `book_pax_${tripId}_seat1` },
                  { text: '💺 2: Вікно (+5€)', callback_data: `book_pax_${tripId}_seat2` },
                ],
                [
                  { text: '💺 3: Ліве (+5€)', callback_data: `book_pax_${tripId}_seat3` },
                  { text: '💺 4: Центр (+5€)', callback_data: `book_pax_${tripId}_seat4` },
                  { text: '💺 5: Праве (+5€)', callback_data: `book_pax_${tripId}_seat5` },
                ],
                [
                  { text: '💺 6: Ліве (+5€)', callback_data: `book_pax_${tripId}_seat6` },
                  { text: '💺 7: Центр (0€)', callback_data: `book_pax_${tripId}_seat7` },
                  { text: '💺 8: Праве (+5€)', callback_data: `book_pax_${tripId}_seat8` },
                ],
                [
                  { text: '🎲 Без вибору місця (вільна посадка) — 0€', callback_data: `book_pax_${tripId}_1` },
                ],
                [
                  { text: '[ 👥 2 місця поруч ]', callback_data: `book_pax_${tripId}_2` },
                  { text: '[ 👨‍👩‍👧 3+ місць ]', callback_data: `book_pax_${tripId}_3` },
                ],
                [
                  { text: '🗺 Змінити тур', callback_data: 'cb_book' },
                  { text: '🔙 Назад в меню', callback_data: 'cb_back' },
                ],
              ],
            };
            await smartEditMessage(chatId, msgId, hasPhoto, step2Text, paxMarkup);
          } else if (cbData.startsWith('book_pax_')) {
            const rest = cbData.replace('book_pax_', '');
            const lastIdx = rest.lastIndexOf('_');
            const tripId = rest.substring(0, lastIdx);
            const paxCount = rest.substring(lastIdx + 1);
            chatSessions[chatId] = { mode: 'waiting_booking_contact', tripId, paxCount };

            const SEAT_INFO: Record<string, { label: string; fee: number; pax: number }> = {
              seat1: { label: '💺 Місце 1 (1-й ряд, Панорамне +5€)', fee: 5, pax: 1 },
              seat2: { label: '💺 Місце 2 (1-й ряд, Вікно +5€)', fee: 5, pax: 1 },
              seat3: { label: '💺 Місце 3 (2-й ряд, Ліве вікно +5€)', fee: 5, pax: 1 },
              seat4: { label: '💺 Місце 4 (2-й ряд, Центр +5€)', fee: 5, pax: 1 },
              seat5: { label: '💺 Місце 5 (2-й ряд, Праве вікно +5€)', fee: 5, pax: 1 },
              seat6: { label: '💺 Місце 6 (3-й ряд, Ліве вікно +5€)', fee: 5, pax: 1 },
              seat7: { label: '💺 Місце 7 (3-й ряд, Центр 0€)', fee: 0, pax: 1 },
              seat8: { label: '💺 Місце 8 (3-й ряд, Праве вікно +5€)', fee: 5, pax: 1 },
              '1': { label: '🎲 Вільна посадка (1 особа, 0€)', fee: 0, pax: 1 },
              '2': { label: '👥 2 місця поруч', fee: 0, pax: 2 },
              '3': { label: '👨‍👩‍👧 3+ місць (компанія)', fee: 0, pax: 3 },
            };
            const selectedSeat = SEAT_INFO[paxCount] || SEAT_INFO['1'];

            const trip = TRIPS_LIST.find((t) => t.id === tripId);
            const flag = trip ? getCountryFlag(trip.country) : '🇪🇺';
            const title = trip ? trip.shortTitle : 'Обраний тур';
            const dateStr = getLiveTripDate(tripId, trip?.departureDates);
            const price = trip ? trip.price : 120;
            const totalCost = price * selectedSeat.pax + selectedSeat.fee;
            const usernameDisplay = cb.from?.username ? `@${cb.from.username}` : 'не вказано';

            const step3Text =
              `📱 <b>Крок 3 із 3: Підтвердження в 1 клік</b>\n\n` +
              `${flag} <b>${title} | ${dateStr}</b>\n` +
              `💺 <b>Обране місце:</b> <code>${selectedSeat.label}</code>\n` +
              `💶 <b>Разом до оплати:</b> <code>${totalCost}€</code>\n` +
              `👤 <b>Ваш профіль:</b> ${usernameDisplay}\n\n` +
              `<blockquote>Натисніть кнопку <b>«✅ Підтвердити заявку (${usernameDisplay})»</b> або поділіться номером кнопкою <b>«📱 Поділитися номером»</b> унизу екрана — жодного ручного вводу цифр!</blockquote>`;

            const step3Inline: any[][] = [];
            if (cb.from?.username) {
              step3Inline.push([
                {
                  text: `✅ Підтвердити заявку (@${cb.from.username})`,
                  callback_data: `book_fast_${tripId}_${paxCount}`,
                },
              ]);
            }
            step3Inline.push([
              { text: '🔙 Змінити місце', callback_data: `book_trip_${tripId}` },
              { text: '🔙 Назад в меню', callback_data: 'cb_back' },
            ]);

            await smartEditMessage(chatId, msgId, hasPhoto, step3Text, { inline_keyboard: step3Inline });

            // Also send the Telegram ReplyKeyboard with request_contact=True
            await tgApi('sendMessage', {
              chat_id: chatId,
              parse_mode: 'HTML',
              text: `👇 <i>Або натисніть кнопку нижче, щоб поділитися номером телефону в 1 клік:</i>`,
              reply_markup: {
                keyboard: [[{ text: '📱 Поділитися номером', request_contact: true }]],
                resize_keyboard: true,
                one_time_keyboard: true,
              },
            });
          } else if (cbData.startsWith('book_fast_')) {
            const rest = cbData.replace('book_fast_', '');
            const lastIdx = rest.lastIndexOf('_');
            const tripId = rest.substring(0, lastIdx);
            const paxCount = rest.substring(lastIdx + 1);
            chatSessions[chatId] = { mode: null };

            const SEAT_INFO: Record<string, { label: string; fee: number; pax: number }> = {
              seat1: { label: '💺 Місце 1 (1-й ряд, Панорамне +5€)', fee: 5, pax: 1 },
              seat2: { label: '💺 Місце 2 (1-й ряд, Вікно +5€)', fee: 5, pax: 1 },
              seat3: { label: '💺 Місце 3 (2-й ряд, Ліве вікно +5€)', fee: 5, pax: 1 },
              seat4: { label: '💺 Місце 4 (2-й ряд, Центр +5€)', fee: 5, pax: 1 },
              seat5: { label: '💺 Місце 5 (2-й ряд, Праве вікно +5€)', fee: 5, pax: 1 },
              seat6: { label: '💺 Місце 6 (3-й ряд, Ліве вікно +5€)', fee: 5, pax: 1 },
              seat7: { label: '💺 Місце 7 (3-й ряд, Центр 0€)', fee: 0, pax: 1 },
              seat8: { label: '💺 Місце 8 (3-й ряд, Праве вікно +5€)', fee: 5, pax: 1 },
              '1': { label: '🎲 Вільна посадка (1 особа, 0€)', fee: 0, pax: 1 },
              '2': { label: '👥 2 місця поруч', fee: 0, pax: 2 },
              '3': { label: '👨‍👩‍👧 3+ місць (компанія)', fee: 0, pax: 3 },
            };
            const selectedSeat = SEAT_INFO[paxCount] || SEAT_INFO['1'];

            const trip = TRIPS_LIST.find((t) => t.id === tripId);
            const flag = trip ? getCountryFlag(trip.country) : '🇪🇺';
            const tripTitle = trip ? trip.shortTitle : 'Обраний тур';
            const dateStr = getLiveTripDate(tripId, trip?.departureDates);
            const price = trip ? trip.price : 120;
            const totalCost = price * selectedSeat.pax + selectedSeat.fee;
            const bookingCode = `SVOI-${Math.floor(1000 + Math.random() * 9000)}`;
            const firstName = cb.from?.first_name || 'Мандрівник';
            const username = cb.from?.username ? `@${cb.from.username}` : firstName;

            await tgApi('sendMessage', {
              chat_id: ADMIN_ID,
              parse_mode: 'HTML',
              text:
                `🔥 <b>НОВА БРОНЬ У 2 КЛІКИ #${bookingCode}!</b>\n\n` +
                `🗺 <b>Напрямок:</b> ${flag} ${tripTitle} | ${dateStr}\n` +
                `💺 <b>Обране місце:</b> <code>${selectedSeat.label}</code>\n` +
                `💶 <b>Сума:</b> <code>${totalCost}€</code>\n` +
                `👤 <b>Клієнт:</b> ${firstName} (${username})`,
            });

            const doneText =
              `🎉 <b>ЗАЯВКУ #${bookingCode} ПРИЙНЯТО!</b>\n\n` +
              `Дякуємо, <b>${firstName}</b>! Ваше бронювання в клубі <b>SVOI</b> зафіксовано в 2 кліки.\n\n` +
              `${flag} <b>${tripTitle} | ${dateStr}</b>\n` +
              `• 💺 <b>Обране місце:</b> <code>${selectedSeat.label}</code>\n` +
              `• 👤 <b>Контакт:</b> <code>${username}</code>\n` +
              `• 💶 <b>До оплати:</b> <code>${totalCost}€</code>\n\n` +
              `<blockquote>🔥 <b>Бронь БЕЗ ПЕРЕДОПЛАТИ!</b> Менеджер клубу зв'яжеться з вами для уточнення адреси виїзду.</blockquote>`;

            await smartEditMessage(chatId, msgId, hasPhoto, doneText, {
              inline_keyboard: [
                [{ text: '🗺 Інші напрямки та дати', callback_data: 'cb_trips' }],
                [{ text: '🔙 Назад в меню', callback_data: 'cb_back' }],
              ],
            });
          } else if (cbData.startsWith('adm_seats_') && userId === ADMIN_ID) {
            const tripId = cbData.replace('adm_seats_', '');
            const trip = TRIPS_LIST.find((t) => t.id === tripId);
            const cur = getLiveFreeSeats(tripId);
            const minusVal = Math.max(0, cur - 1);
            const plusVal = Math.min(8, cur + 1);
            const seatsText =
              `⚙️ <b>Керування місцями: ${trip?.shortTitle || tripId}</b>\n\n` +
              `Поточна кількість вільних місць: <code>${cur} з 8</code>\n\n` +
              `<blockquote>Оберіть нове значення (від 0 до 8) або натисніть +1 / -1:</blockquote>`;
            const seatsMarkup = {
              inline_keyboard: [
                [
                  { text: '➖ -1 місце', callback_data: `set_seats_${tripId}_${minusVal}` },
                  { text: `Зараз: ${cur}/8`, callback_data: `trip_${tripId}` },
                  { text: '➕ +1 місце', callback_data: `set_seats_${tripId}_${plusVal}` },
                ],
                [0, 1, 2, 3, 4].map((n) => ({
                  text: `${n === cur ? '✅ ' : ''}${n}`,
                  callback_data: `set_seats_${tripId}_${n}`,
                })),
                [5, 6, 7, 8].map((n) => ({
                  text: `${n === cur ? '✅ ' : ''}${n}`,
                  callback_data: `set_seats_${tripId}_${n}`,
                })),
                [
                  { text: '🔙 До туру', callback_data: `trip_${tripId}` },
                  { text: '🔙 Назад в меню', callback_data: 'cb_back' },
                ],
              ],
            };
            await smartEditMessage(chatId, msgId, hasPhoto, seatsText, seatsMarkup);
          } else if (cbData.startsWith('set_seats_') && userId === ADMIN_ID) {
            const rest = cbData.replace('set_seats_', '');
            const lastIdx = rest.lastIndexOf('_');
            const tripId = rest.substring(0, lastIdx);
            const count = parseInt(rest.substring(lastIdx + 1), 10);
            liveSeatsOverride[tripId] = count;
            await sendTourCardToChat(chatId, msgId, hasPhoto, tripId, userId);
          } else if (cbData.startsWith('adm_date_') && userId === ADMIN_ID) {
            const tripId = cbData.replace('adm_date_', '');
            const trip = TRIPS_LIST.find((t) => t.id === tripId);
            const curDate = getLiveTripDate(tripId, trip?.departureDates);
            chatSessions[chatId] = { mode: 'waiting_admin_date', tripId };
            const dateText =
              `📅 <b>Зміна дати виїзду [Адмін]</b>\n\n` +
              `Напрямок: <b>${trip?.shortTitle || tripId}</b>\n` +
              `Поточна дата: <code>${curDate}</code>\n\n` +
              `<blockquote>Надішліть нову дату текстом у відповідь (наприклад: <code>25 жовтня</code> або <code>14–15 листопада</code>):</blockquote>`;
            await smartEditMessage(chatId, msgId, hasPhoto, dateText, {
              inline_keyboard: [
                [
                  { text: '🔙 До туру', callback_data: `trip_${tripId}` },
                  { text: '🔙 Назад в меню', callback_data: 'cb_back' },
                ],
              ],
            });
          } else if (cbData.startsWith('adm_poster_') && userId === ADMIN_ID) {
            const tripId = cbData.replace('adm_poster_', '');
            const trip = TRIPS_LIST.find((t) => t.id === tripId);
            chatSessions[chatId] = { mode: 'waiting_admin_poster', tripId };
            const posterText =
              `🖼 <b>Зміна фото/постера туру [Адмін]</b>\n\n` +
              `Напрямок: <b>${trip?.shortTitle || tripId}</b>\n\n` +
              `<blockquote>Надішліть <b>нову картинку (фото)</b> прямо в цей чат або пряме посилання (URL) на зображення:</blockquote>`;
            await smartEditMessage(chatId, msgId, hasPhoto, posterText, {
              inline_keyboard: [
                [
                  { text: '🔙 До туру', callback_data: `trip_${tripId}` },
                  { text: '🔙 Назад в меню', callback_data: 'cb_back' },
                ],
              ],
            });
          } else if (cbData === 'cb_adm_channel_menu') {
            chatSessions[chatId] = { mode: null };
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `📢 <b>Центр керування Telegram-каналом SVOI Travel</b>\n\n` +
                `🎯 Цільовий канал: <code>${currentChannelTarget}</code>\n` +
                `🎁 Поточний розіграш: <b>${activeGiveaway.prize}</b>\n` +
                `👥 Учасників: <b>${activeGiveaway.participants.length}</b>\n\n` +
                `Оберіть дію:`,
              getChannelAdminMarkup(),
            );
          } else if (cbData === 'cb_adm_gw_new') {
            chatSessions[chatId] = { mode: 'waiting_gw_prize' };
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `🎁 <b>Запуск нового РОЗІГРАШУ в канал <code>${currentChannelTarget}</code></b>\n\n` +
                `Напишіть у відповідь: <b>який приз розігрується?</b>\n` +
                `<i>Наприклад: Безкоштовне місце в турі до Парижа 🥐🗼</i>`,
              {
                inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'cb_adm_channel_menu' }]],
              },
            );
          } else if (cbData === 'cb_reviews') {
            const reviewsText =
              `⭐ <b>Відгуки туристів клубу SVOI Travel</b> 💬✨\n\n` +
              `Реальні враження наших мандрівників про поїздки на Opel Vivaro:\n\n` +
              `• <b>Олена К. (Саарбрюккен) — Париж:</b>\n` +
              `⭐⭐⭐⭐⭐ <i>«Забрали прямо біля дому, мінівен дуже м'який і чистий, зоряне небо в салоні створило справжню казку!»</i>\n\n` +
              `• <b>Михайло та Юлія (Трір) — Замок Нойшванштайн + ущелина:</b>\n` +
              `⭐⭐⭐⭐⭐ <i>«Неймовірні краєвиди з мосту Марієнбрюке та прогулянка гірською ущелиною Партнахкламм. Група всього 8 людей — дуже душевно!»</i>\n\n` +
              `• <b>Тетяна В. (Люксембург) — Озеро Комо + Мілан:</b>\n` +
              `⭐⭐⭐⭐⭐ <i>«Два дні італійського щастя! Вілли Белладжо та прогулянка на катері перевершили всі очікування.»</i>`;
            await smartEditMessage(chatId, msgId, hasPhoto, reviewsText, {
              inline_keyboard: [
                [{ text: '🗺 Обрати поїздку', callback_data: 'cb_trips' }],
                [{ text: '🔙 Назад в меню', callback_data: 'cb_back' }],
              ],
            });
          } else if (cbData === 'cb_faq') {
            const faqText =
              `❓ <b>Часті питання про поїздки клубу SVOI (FAQ)</b> 💡\n\n` +
              `• 📍 <b>Звідки виїзд (Door-to-Door):</b> забираємо та розвозимо за домашньою адресою по <b>Саарланду, Тріру та Люксембургу</b>! Можлива підсадка від 4-х осіб з Кайзерслаутерна, Мангейма, Франкфурта, Карлсруе, Страсбурга.\n` +
              `• 💳 <b>Оплата:</b> <code>0% передоплати</code> на всі одноденні поїздки (оплата водієві при посадці). Для 2–3 денних турів готель включено у вартість.\n` +
              `• 🚐 <b>Автомобіль:</b> комфортабельний 8-місний <b>Opel Vivaro</b> (клімат-контроль, USB, відкидні спинки, стеля «Зоряне небо»).\n` +
              `• 🧳 <b>Багаж:</b> до <code>10 кг</code> у багажне відділення + ручна поклажа в салон.\n` +
              `• 💺 <b>Вибір місця:</b> фіксація конкретного місця (1–8) — лише <code>5€</code>, вільна посадка — <code>0€</code>.`;
            await smartEditMessage(chatId, msgId, hasPhoto, faqText, {
              inline_keyboard: [
                [
                  { text: '🗺 Напрямки та дати', callback_data: 'cb_trips' },
                  { text: '💺 Забронювати місце', callback_data: 'cb_book' },
                ],
                [{ text: '🔙 Назад в меню', callback_data: 'cb_back' }],
              ],
            });
          } else if (cbData === 'cb_partner') {
            const partnerText =
              `🤝 <b>Партнерська програма & Співпраця з клубом SVOI</b> 💼\n\n` +
              `• 👥 <b>Приведи друзів:</b> зберіть компанію від 4 осіб та отримайте бонусну знижку на поїздку!\n` +
              `• 🚐 <b>Індивідуальний чартер (5–8 осіб):</b> оренда всього мінівена Opel Vivaro з водієм під вашу компанію в будь-яку дату.\n` +
              `• 📸 <b>Для блогерів та авторів:</b> спільні творчі виїзди за яскраві рілси та огляди.\n\n` +
              `📩 Зв'язок напряму з організатором: @SVOI_travel_admin`;
            await smartEditMessage(chatId, msgId, hasPhoto, partnerText, {
              inline_keyboard: [
                [{ text: "💬 Написати організатору", url: 'https://t.me/SVOI_travel_admin' }],
                [{ text: '🔙 Назад в меню', callback_data: 'cb_back' }],
              ],
            });
          } else if (cbData === 'cb_custom_trip') {
            const customText =
              `🚐 <b>Індивідуальний виїзд компанією (5–8 осіб)</b> 👑\n\n` +
              `Повний комфортабельний 8-місний мінівен <b>Opel Vivaro</b> з персональним водієм у вашому розпорядженні!\n\n` +
              `• 📅 Будь-яка зручна для вас дата (будні або вихідні)\n` +
              `• 📍 Адресний збір від вашого під'їзду (Door-to-Door)\n` +
              `• 🗺 Гнучкий маршрут та зупинки за вашим бажанням\n` +
              `<blockquote>💶 Вартість оренди всього авто з водієм: від <code>550€</code> за день залежно від маршруту.</blockquote>`;
            await smartEditMessage(chatId, msgId, hasPhoto, customText, {
              inline_keyboard: [
                [{ text: '💬 Обговорити індивідуальний виїзд', url: 'https://t.me/SVOI_travel_admin' }],
                [{ text: '🗺 До списку напрямків', callback_data: 'cb_trips' }],
                [{ text: '🔙 Назад в меню', callback_data: 'cb_back' }],
              ],
            });
          } else if (cbData.startsWith('waitlist_add_')) {
            const tripId = cbData.replace('waitlist_add_', '');
            const trip = TRIPS_LIST.find((t) => t.id === tripId);
            const firstName = cb.from?.first_name || 'Мандрівник';
            const username = cb.from?.username ? `@${cb.from.username}` : firstName;
            await tgApi('sendMessage', {
              chat_id: ADMIN_ID,
              parse_mode: 'HTML',
              text:
                `📋 <b>Новий запис у Лист очікування!</b>\n` +
                `🗺 <b>Тур:</b> ${trip?.shortTitle || tripId}\n` +
                `👤 <b>Клієнт:</b> ${firstName} (${username})`,
            });
            const wlText =
              `✅ <b>Вас додано до листа очікування!</b> 📋✨\n\n` +
              `Напрямок: <b>${trip?.title || tripId}</b>\n` +
              `Як тільки звільниться місце або буде призначено додатковий виїзд — менеджер одразу повідомить вас!`;
            await smartEditMessage(chatId, msgId, hasPhoto, wlText, {
              inline_keyboard: [
                [{ text: '🗺 Інші напрямки та дати', callback_data: 'cb_trips' }],
                [{ text: '🔙 Назад в меню', callback_data: 'cb_back' }],
              ],
            });
          } else if (cbData === 'cb_adm_waitlist') {
            const wlAdminText =
              `📋 <b>Лист очікування пасажирів (SVOI Waitlist)</b>\n\n` +
              `• <b>#1 | Париж</b> — Олександр Т. (@alex_traveler) • 2 місця\n` +
              `• <b>#2 | Озеро Комо + Мілан</b> — Катерина М. (@kate_munich) • 3 місця\n\n` +
              `<i>Нові заявки з листа очікування автоматично надходять у цей чат адміністратора.</i>`;
            await smartEditMessage(chatId, msgId, hasPhoto, wlAdminText, {
              inline_keyboard: [
                [{ text: '🔙 Назад в меню', callback_data: 'cb_back' }],
              ],
            });
          } else if (cbData === 'cb_adm_gw_pick') {
            const pool =
              activeGiveaway.participants.length > 0
                ? activeGiveaway.participants
                : [
                    { user_id: 1, username: '@alex_traveler', first_name: 'Олександр' },
                    { user_id: 2, username: '@elena_voyage', first_name: 'Олена' },
                  ];
            const winner = pool[Math.floor(Math.random() * pool.length)];
            const winText =
              `🎊🏆 <b>ПІДСУМКИ РОЗІГРАШУ SVOI TRAVEL!</b> 🏆🎊\n\n` +
              `Приз: 🎁 <b>${activeGiveaway.prize}</b>\n` +
              `🥳 <b>ПЕРЕМОЖЕЦЬ: ${winner.first_name} (${winner.username})!</b> 🎉\n\n` +
              `Вітаємо! Менеджер клубу @SVOI_travel_admin зв'яжеться з вами для вручення сертифіката!`;
            await tgApi('sendMessage', {
              chat_id: currentChannelTarget,
              text: winText,
              parse_mode: 'HTML',
            });
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `✅ <b>Переможця обрано та опубліковано:</b> ${winner.first_name} (${winner.username})`,
              getChannelAdminMarkup(),
            );
          } else if (cbData === 'cb_adm_send_quiz') {
            const pollRes: any = await tgApi('sendPoll', {
              chat_id: currentChannelTarget,
              question: 'У якому місті ми відвідуємо музеї Mercedes-Benz і Porsche в окремому одноденному турі SVOI?',
              options: ['Мюнхен', 'Штутгарт 🏎', 'Франкфурт', 'Берлін'],
              type: 'quiz',
              correct_option_id: 1,
              explanation: 'У Штутгарті знаходяться штаб-квартири та легендарні музеї Mercedes-Benz і Porsche!',
              is_anonymous: true,
            });
            const statusMsg = pollRes.ok
              ? `✅ <b>Інтерактивний Telegram Quiz успішно опубліковано в <code>${currentChannelTarget}</code>!</b> 🧠🎉`
              : `⚠️ Не вдалося опублікувати квіз у <code>${currentChannelTarget}</code>: <code>${pollRes.description || 'перевірте права бота в каналі'}</code>`;
            await smartEditMessage(chatId, msgId, hasPhoto, statusMsg, getChannelAdminMarkup());
          } else if (cbData === 'cb_adm_set_channel') {
            chatSessions[chatId] = { mode: 'waiting_channel_id' };
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `⚙️ <b>Прив'язка закритого каналу для публікації розіграшів</b>\n\n` +
                `Поточний ID: <code>${currentChannelTarget}</code>\n\n` +
                `👉 <b>Найпростіший спосіб:</b> просто <b>перешліть (Forward) сюди будь-який пост зі свого каналу</b>! Бот автоматично визначить числовий ID <code>-100...</code> вашого приватного каналу.`,
              {
                inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'cb_adm_channel_menu' }]],
              },
            );
          } else if (cbData === 'cb_games') {
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `🎮 <b>Ігровий клуб, Квізи та Опитування SVOI Travel</b> 🏆\n\n` +
                `Оберіть вікторину, гру або опитування нижче та вигравайте приємні бонуси для майбутніх поїздок:`,
              getGamesMarkup(),
            );
          } else if (cbData === 'cb_game_geo') {
            const geoQuizzes = [
              `🕵️ <b>ГЕО-ДЕТЕКТИВ SVOI:</b>\n\nЗамок Ельц (Burg Eltz) захований у лісовій долині й зображувався на купюрі 500 німецьких марок. Скільки часу триває дорога до нього з Саарланду чи Люксембургу?\n\n✅ <b>Відповідь:</b> Лише <b>1.5–2 години</b>! Вартість поїздки (Замок Ельц + Кохем + підвісний міст Гайєрлай) — <b>85€</b>.`,
              `🕵️ <b>ГЕО-ДЕТЕКТИВ SVOI:</b>\n\nУ якому місті за 1 день можна відвідати штаб-квартири та легендарні музеї одразу двох автогігантів — <b>Mercedes-Benz та Porsche</b>?\n\n✅ <b>Відповідь:</b> У <b>Штутгарті (Німеччина)</b>! Окрема одноденна поїздка з клубом SVOI — <b>95€</b>.`,
              `🕵️ <b>ГЕО-ДЕТЕКТИВ SVOI:</b>\n\nЯкий казковий замок короля Людвіга II ми поєднуємо в одну поїздку з альпійською гірською ущелиною <b>Партнахкламм</b>?\n\n✅ <b>Відповідь:</b> <b>Замок Нойшванштайн (Баварія)</b>!`,
            ];
            const picked = geoQuizzes[Math.floor(Math.random() * geoQuizzes.length)];
            await smartEditMessage(chatId, msgId, hasPhoto, picked, getGamesMarkup());
          } else if (cbData === 'cb_game_quiz') {
            const tfQuizzes = [
              `🧠 <b>ПРАВДА ЧИ НЕПРАВДА:</b>\n\nПоїздка в замок Нойшванштайн + ущелину Партнахкламм, поїздка в Берлін, поїздка в Леголенд та поїздка в Штутгарт — це <b>чотири різні окремі тури</b>?\n\n✅ <b>ПРАВДА!</b> Кожен із цих напрямків — окрема авторська подорож.`,
              `🧠 <b>ПРАВДА ЧИ НЕПРАВДА:</b>\n\nЧи правда, що з Саарланду та Люксембургу до найкращого парку розваг Європи — <b>Europa-Park (Руст)</b> — їхати менше ніж 2.5 години?\n\n✅ <b>ПРАВДА!</b> Тому це один із найпопулярніших одноденних виїздів вихідного дня!`,
              `🧠 <b>ПРАВДА ЧИ НЕПРАВДА:</b>\n\nЧи правда, що в турі до Ліхтенштейну ми за 1 день відвідуємо одразу 3 країни: Ліхтенштейн (Вадуц), Австрію (Брегенц) та Німеччину (Ліндау)?\n\n✅ <b>ПРАВДА!</b> 3 держави за один вихідний!`,
            ];
            const picked = tfQuizzes[Math.floor(Math.random() * tfQuizzes.length)];
            await smartEditMessage(chatId, msgId, hasPhoto, picked, getGamesMarkup());
          } else if (cbData === 'cb_game_gastro') {
            const gastroQuizzes = [
              `🍽 <b>ГАСТРО-КВІЗ «СМАКИ ЄВРОПИ»:</b>\n\nДе під час нашого туру по долині Мозеля (Замок Ельц + Кохем) ми куштуємо справжнє вино з крутих схилів?\n\n🍷 <b>Відповідь:</b> У містечку <b>Кохем</b> — знаменитий мозельський <b>Рислінг</b>!`,
              `🍽 <b>ГАСТРО-КВІЗ «СМАКИ ЄВРОПИ»:</b>\n\nЯкий гастрономічний хіт чекає на вас у турі в Ельзас і Страсбург (80€)?\n\n🍕 <b>Відповідь:</b> <b>Тарт фламбе (Flammkuchen)</b> з вершками, цибулею та беконом з дров'яної печі!`,
            ];
            const picked = gastroQuizzes[Math.floor(Math.random() * gastroQuizzes.length)];
            await smartEditMessage(chatId, msgId, hasPhoto, picked, getGamesMarkup());
          } else if (cbData === 'cb_game_price') {
            const priceQuizzes = [
              `💶 <b>ЕКСПЕРТ МАРШРУТІВ (ЧАС І ЦІНИ):</b>\n\n• 🇫🇷 <b>Ельзас + Страсбург:</b> <code>80€</code> (~1.5 год у дорозі)\n• 🇩🇪 <b>Замок Ельц + Кохем + міст Гайєрлай:</b> <code>85€</code> (~1.5 год у дорозі)\n• 🇩🇪 <b>Гайдельберг + Баден-Баден:</b> <code>85€</code> (~1.5 год у дорозі)\n• 🇩🇪 <b>Європа-Парк / Штутгарт:</b> <code>95€</code> (~2 год у дорозі)\n• 🇩🇪 <b>Леголенд:</b> <code>115€</code>\n• 🇩🇪 <b>Нойшванштайн + ущелина:</b> <code>120€</code>\n• 🇩🇪 <b>Берлін + Дрезден (2 дні з готелем):</b> <code>240€</code>`,
            ];
            await smartEditMessage(chatId, msgId, hasPhoto, priceQuizzes[0], getGamesMarkup());
          } else if (cbData === 'cb_game_poll') {
            const pollText =
              `📊 <b>ОПИТУВАННЯ КЛУБУ SVOI TRAVEL:</b>\n\n` +
              `<b>Який тур із Саарланду та Люксембургу ви б обрали на найближчі вихідні?</b>\n` +
              `• 🎢 Європа-Парк (Руст) — <b>31%</b>\n` +
              `• 🏰 Долина Мозеля: Замок Ельц + Кохем — <b>26%</b>\n` +
              `• ♨️ Гайдельберг + терми Баден-Бадена — <b>24%</b>\n` +
              `• 🏎 Штутгарт: Музеї Mercedes і Porsche — <b>19%</b>\n\n` +
              `<blockquote>Відкрийте <b>🚀 SVOI Mini App</b> або вкладку ігор на сайті, щоб проголосувати у всіх 6 опитуваннях!</blockquote>`;
            await smartEditMessage(chatId, msgId, hasPhoto, pollText, getGamesMarkup());
          } else if (cbData === 'cb_game_match') {
            const matchText =
              `🎒 <b>ПІДБІР ІДЕАЛЬНОГО ТУРУ З СААРЛАНДУ ТА ЛЮКСЕМБУРГУ:</b>\n\n` +
              `• <b>Хочете близько (1.5–2 год) і без втоми:</b> Ельзас + Страсбург (80€), Замок Ельц + Кохем (85€), Гайдельберг + Баден-Баден (85€)\n` +
              `• <b>Хочете драйву та емоцій з родиною:</b> Європа-Парк (95€) або Леголенд (115€)\n` +
              `• <b>Любите автомобілі та технології:</b> Штутгарт — Mercedes & Porsche (95€)\n` +
              `• <b>Мрієте про Альпи та замки:</b> Замок Нойшванштайн + ущелина (120€) або Швейцарія (120€)\n` +
              `• <b>Вікенд на 2–3 дні з готелем:</b> Берлін + Дрезден (240€), Комо + Мілан (270€), Мон-Сен-Мішель (270€)`;
            await smartEditMessage(chatId, msgId, hasPhoto, matchText, getGamesMarkup());
          } else if (cbData === 'cb_game_wheel') {
            const prizes = [
              '💺 Безкоштовний вибір будь-якого місця в 1-му або 2-му ряду (код: WHEEL-SEAT5)',
              '☕ Кава та круасан на панорамній зупинці в подарунок (код: WHEEL-COFFEE)',
              '💎 Знижка -10€ на будь-який багатоденний тур (код: WHEEL-10EUR)',
            ];
            const won = prizes[Math.floor(Math.random() * prizes.length)];
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `🎰 <b>КОЛЕСО ФОРТУНИ SVOI!</b> 🎉\n\n🎁 Ваш виграш:\n<b>${won}</b>`,
              getGamesMarkup(),
            );
          }
        }
      }
      setTimeout(poll, 800);
    } catch (_err) {
      setTimeout(poll, 5000);
    }
  };

  poll();
}

startServer();
