import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { TRIPS_LIST } from './src/data/tripsData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TARGETS_FILE = path.join(__dirname, '.bot_targets.json');

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
    const botToken = !token || token.includes('*') ? DEFAULT_BOT_TOKEN : token.trim();
    if (!botToken) {
      return res.status(400).json({ ok: false, error: 'Token is required' });
    }
    try {
      const resp = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const data = await resp.json();
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // API endpoint to send a real test message or notification to admin
  app.post('/api/telegram/send-message', async (req, res) => {
    const { token, chatId, text, parseMode } = req.body;
    const botToken = !token || token.includes('*') ? DEFAULT_BOT_TOKEN : token.trim();
    if (!botToken || !chatId || !text) {
      return res.status(400).json({ ok: false, error: 'token, chatId and text are required' });
    }
    try {
      const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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
    const botToken = !token || token.includes('*') ? DEFAULT_BOT_TOKEN : token.trim();
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

  // API endpoint to get current giveaway & bound group/channel state
  app.get('/api/telegram/giveaway/state', (_req, res) => {
    res.json({
      ok: true,
      giveaway: activeGiveaway,
      currentGroupTarget,
      currentGroupTitle,
      currentChannelTarget,
    });
  });

  // API endpoint to publish giveaway directly to Telegram Group or Channel
  app.post('/api/telegram/giveaway/publish', async (req, res) => {
    try {
      const { target, targetType, customChatId, targetChatId, prize } = req.body || {};
      const targetMode = target || targetType || 'group';
      const customId = customChatId || targetChatId;
      if (prize && typeof prize === 'string' && prize.trim()) {
        activeGiveaway.prize = prize.trim();
      }
      activeGiveaway.is_active = true;
      if (customId && typeof customId === 'string' && customId.trim()) {
        if (targetMode === 'channel') {
          currentChannelTarget = customId.trim();
        } else {
          currentGroupTarget = customId.trim();
        }
      }
      saveTargetsToDisk();
      const chatIdToUse = targetMode === 'channel' ? currentChannelTarget : currentGroupTarget || currentChannelTarget;
      if (!chatIdToUse) {
        return res.status(400).json({
          ok: false,
          error: "Група ще не прив'язана числовим ID (-100...). Вкажіть @username / -100... або оберіть групу в боті кнопкою в 1 клік.",
        });
      }
      const count = activeGiveaway.participants.length;
      const pubRes: any = await tgApi('sendMessage', {
        chat_id: chatIdToUse,
        text: getPublicGiveawayText(activeGiveaway.prize, count),
        parse_mode: 'HTML',
        reply_markup: getPublicGiveawayMarkup(count),
      });
      if (pubRes && pubRes.ok && pubRes.result && targetMode !== 'channel') {
        activeGiveaway.group_chat_id = pubRes.result.chat.id;
        activeGiveaway.group_msg_id = pubRes.result.message_id;
        saveTargetsToDisk();
      }
      res.json({
        ...pubRes,
        targetId: chatIdToUse,
        targetChatId: chatIdToUse,
        giveaway: activeGiveaway,
      });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // API endpoint to pick winner and publish giveaway result directly to Telegram Group or Channel
  app.post('/api/telegram/giveaway/publish-winner', async (req, res) => {
    try {
      const { target, targetType, customChatId, targetChatId, prize } = req.body || {};
      const targetMode = target || targetType || 'group';
      const customId = customChatId || targetChatId;
      if (prize && typeof prize === 'string' && prize.trim()) {
        activeGiveaway.prize = prize.trim();
      }
      if (customId && typeof customId === 'string' && customId.trim()) {
        if (targetMode === 'channel') {
          currentChannelTarget = customId.trim();
        } else {
          currentGroupTarget = customId.trim();
        }
      }
      const pool =
        activeGiveaway.participants.length > 0 ? activeGiveaway.participants : DEFAULT_DEMO_PARTICIPANTS;
      const winner = activeGiveaway.winner || pool[Math.floor(Math.random() * pool.length)];
      activeGiveaway.winner = winner;
      activeGiveaway.is_active = false;
      saveTargetsToDisk();

      const winText =
        `🎊🏆 <b>УВАГА! ОФІЦІЙНІ ПІДСУМКИ РОЗІГРАШУ SVOI TRAVEL!</b> 🏆🎊\n\n` +
        `🎁 <b>Приз:</b> ${activeGiveaway.prize}\n` +
        `👥 <b>Усього брало участь:</b> ${pool.length} учасників\n\n` +
        `✨ <b>Генератор випадкових чисел обрав переможця:</b>\n` +
        `🥳 <b>ПЕРЕМОЖЕЦЬ: ${winner.first_name} (${winner.username})!</b> 🎉🎉🎉\n\n` +
        `Щиро вітаємо з перемогою! Напишіть організатору @SVOI_travel_admin для отримання сертифіката! 🚐✨`;

      const winMarkup = {
        inline_keyboard: [
          [{ text: '💬 Написати організатору (@SVOI_travel_admin)', url: 'https://t.me/SVOI_travel_admin' }],
          [{ text: '🗺 Напрямки та дати поїздок', url: 'https://t.me/Svoi_TravelEU_bot?start=trips' }],
        ],
      };

      const chatIdToUse = targetMode === 'channel' ? currentChannelTarget : currentGroupTarget || currentChannelTarget;
      if (!chatIdToUse) {
        return res.status(400).json({
          ok: false,
          winner,
          error: "Група ще не прив'язана числовим ID (-100...). Вкажіть @username / -100... або оберіть групу в боті.",
        });
      }

      const pubRes: any = await tgApi('sendMessage', {
        chat_id: chatIdToUse,
        text: winText,
        parse_mode: 'HTML',
        reply_markup: winMarkup,
      });
      if (targetMode === 'both' && currentChannelTarget && currentChannelTarget !== chatIdToUse) {
        await tgApi('sendMessage', {
          chat_id: currentChannelTarget,
          text: winText,
          parse_mode: 'HTML',
          reply_markup: winMarkup,
        }).catch(() => {});
      }
      res.json({
        ...pubRes,
        winner,
        targetId: chatIdToUse,
        targetChatId: chatIdToUse,
        giveaway: activeGiveaway,
      });
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

const DEFAULT_BOT_TOKEN = process.env.BOT_TOKEN || '8969834514:AAGg--q9hqQQIQooZUkCbhenT9ykhuCc6D0';
const ADMIN_ID = Number(process.env.ADMIN_ID) || 8450153980;
let currentMiniAppUrl =
  process.env.MINI_APP_URL ||
  'https://arsik202406-jpg.github.io/tg-bot-SVOI/?miniapp=1';
let currentChannelTarget = process.env.CHANNEL_CHAT_ID || '@svoi_traveleu';
let currentGroupTarget = process.env.GROUP_CHAT_ID || '';
let currentGroupTitle = 'Група SVOI Travel';
let activeBotMessages: Record<string, number[]> = {};
let knownAdminChatIds: number[] = [ADMIN_ID];

const DEFAULT_DEMO_PARTICIPANTS: Array<{ user_id: number; username: string; first_name: string }> = [
  { user_id: 101, username: '@alex_traveler', first_name: 'Олександр М.' },
  { user_id: 102, username: '@elena_voyage', first_name: 'Олена К.' },
  { user_id: 103, username: '@mike_trip', first_name: 'Михайло В.' },
  { user_id: 104, username: '@katya_de', first_name: 'Катерина С.' },
  { user_id: 105, username: '@denis_travel', first_name: 'Денис П.' },
];

const activeGiveaway = {
  id: 'gw_active',
  prize: 'Безкоштовна поїздка до Парижа на 1 день (Версаль + яхта) 🥐🗼',
  participants: [] as Array<{ user_id: number; username: string; first_name: string }>,
  winner: null as { user_id: number; username: string; first_name: string } | null,
  is_active: true,
  admin_chat_id: null as number | null,
  admin_msg_id: null as number | null,
  group_chat_id: null as number | null,
  group_msg_id: null as number | null,
};

// Load persisted group/channel targets & active bot message IDs
try {
  if (fs.existsSync(TARGETS_FILE)) {
    const saved = JSON.parse(fs.readFileSync(TARGETS_FILE, 'utf-8'));
    if (saved.currentChannelTarget) currentChannelTarget = saved.currentChannelTarget;
    if (saved.currentGroupTarget) currentGroupTarget = saved.currentGroupTarget;
    if (saved.currentGroupTitle) currentGroupTitle = saved.currentGroupTitle;
    if (saved.activeBotMessages && typeof saved.activeBotMessages === 'object') {
      activeBotMessages = saved.activeBotMessages;
    }
    if (Array.isArray(saved.knownAdminChatIds)) {
      knownAdminChatIds = Array.from(new Set([...knownAdminChatIds, ...saved.knownAdminChatIds]));
    }
    if (saved.activeGiveaway && typeof saved.activeGiveaway === 'object') {
      Object.assign(activeGiveaway, saved.activeGiveaway);
    }
  }
} catch (_e) {
  // ignore
}

function saveTargetsToDisk() {
  try {
    fs.writeFileSync(
      TARGETS_FILE,
      JSON.stringify(
        {
          currentChannelTarget,
          currentGroupTarget,
          currentGroupTitle,
          activeBotMessages,
          knownAdminChatIds,
          activeGiveaway,
        },
        null,
        2,
      ),
      'utf-8',
    );
  } catch (_e) {
    // ignore
  }
}

function registerAdminChat(chatId: number) {
  if (chatId > 0 && !knownAdminChatIds.includes(chatId)) {
    knownAdminChatIds.push(chatId);
    saveTargetsToDisk();
  }
}

async function notifyAllAdmins(
  payloadOrText: string | { text: string; parse_mode?: string; reply_markup?: any },
  replyMarkup?: any,
  excludeChatId?: number,
) {
  const text = typeof payloadOrText === 'string' ? payloadOrText : payloadOrText.text;
  const parseMode = typeof payloadOrText === 'string' ? 'HTML' : payloadOrText.parse_mode || 'HTML';
  const markup = typeof payloadOrText === 'string' ? replyMarkup : payloadOrText.reply_markup || replyMarkup;

  for (const admId of knownAdminChatIds) {
    if (excludeChatId && admId === excludeChatId) continue;
    try {
      const sent: any = await tgApi('sendMessage', {
        chat_id: admId,
        parse_mode: parseMode,
        text,
        ...(markup ? { reply_markup: markup } : {}),
      });
      if (sent && sent.ok && sent.result?.message_id && admId > 0) {
        const list = activeBotMessages[String(admId)] || [];
        activeBotMessages[String(admId)] = [...list, sent.result.message_id];
        saveTargetsToDisk();
      }
    } catch (_e) {
      // ignore
    }
  }
}

// Dynamic tour overrides for Admin (seats, dates, posters)
const liveSeatsOverride: Record<string, number> = {
  paris: 4,
  etretat_paris: 6,
  amsterdam: 5,
  zaandam_sea_amsterdam: 4,
  bruges: 4,
  bruges_ghent_brussels: 5,
  liechtenstein: 4,
  neuschwanstein: 2,
  berlin_dresden: 4,
  legoland: 5,
  legoland_germany: 5,
  stuttgart: 4,
  stuttgart_tour: 4,
  europa_park: 2,
  eltz_cochem: 5,
  eltz_cochem_mosel: 5,
  heidelberg_baden: 6,
  cote_dazur: 5,
  mont_saint_michel: 6,
  swiss_rhine_zurich: 4,
  swiss_aare_bern: 3,
  brussels: 5,
  prague: 5,
  salzburg_hallstatt: 5,
  alsace_strasbourg: 6,
  como_milan: 2,
};
const liveDateOverride: Record<string, string> = {};
const livePosterOverride: Record<string, string> = {};

function getCountryFlag(country?: string): string {
  const c = country || '';
  if (c.includes('Ліхтенштейн')) return '🇱🇮';
  if (c.includes('Австрія')) return '🇦🇹';
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
    | 'waiting_group_id'
    | 'waiting_admin_date'
    | 'waiting_admin_poster'
    | 'waiting_booking_contact'
    | 'waiting_feedback'
    | null;
  tripId?: string;
  paxCount?: string;
  pendingGroupAction?: 'publish_giveaway' | 'publish_winner' | null;
}
const chatSessions: Record<number, ChatSessionState> = {};

const TRIP_ID_ALIASES: Record<string, string> = {
  strasbourg: 'alsace_strasbourg',
  mosel_cochem: 'eltz_cochem_mosel',
  eltz_cochem: 'eltz_cochem_mosel',
  switzerland: 'swiss_rhine_zurich',
  europapark: 'europa_park',
  legoland: 'legoland_germany',
  stuttgart: 'stuttgart_tour',
  milan_como: 'como_milan',
  cote_d_azur: 'cote_dazur',
};

function findTripById(tripId: string) {
  const normalized = TRIP_ID_ALIASES[tripId] || tripId;
  return TRIPS_LIST.find((t) => t.id === normalized || t.id === tripId);
}

function getMainMenuMarkup(_userId?: number) {
  const rows: any[][] = [
    [
      { text: '🗺 Напрямки та дати', callback_data: 'cb_trips' },
      { text: '⭐ Відгуки туристів', callback_data: 'cb_reviews' },
    ],
    [{ text: '💺 ЗАБРОНЮВАТИ МІСЦЕ', callback_data: 'cb_book' }],
    [
      { text: '🚐 Фото авто (Opel Vivaro)', callback_data: 'cb_car' },
      { text: '📍 Точки збору (Door-to-Door)', callback_data: 'cb_meeting' },
    ],
    [
      { text: '❓ Часті питання (FAQ)', callback_data: 'cb_faq' },
      { text: '🎮 Ігри та вікторини', callback_data: 'cb_games' },
    ],
    [
      { text: '🎁 Розіграш туру (В Групу)', callback_data: 'cb_adm_gw_card' },
      { text: '🏆 Результат розіграшу', callback_data: 'cb_adm_gw_pick' },
    ],
    [
      { text: '🤝 Стати партнером клубу', callback_data: 'cb_partner' },
      { text: '📢 Наш канал', url: 'https://t.me/+Flt_2r6vi3U4ZDg6' },
    ],
    [{ text: "💬 ЗВ'ЯЗОК З МЕНЕДЖЕРОМ", url: 'https://t.me/SVOI_travel_admin' }],
    [
      { text: '👑 Адмін: Група та Розіграш (/channel)', callback_data: 'cb_adm_channel_menu' },
      { text: '📋 Лист очікування', callback_data: 'cb_adm_waitlist' },
    ],
  ];

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

// Public giveaway post markup (published inside the Group or Channel — ONLY participant buttons!)
function getPublicGiveawayMarkup(count: number) {
  return {
    inline_keyboard: [
      [{ text: `🎉 Брати участь! (${count})`, callback_data: 'gw_join_gw_active' }],
      [{ text: '💺 Забронювати місце в турі', url: 'https://t.me/Svoi_TravelEU_bot?start=trips' }],
    ],
  };
}

function getPublicGiveawayText(prize: string, count: number) {
  return (
    `🎉🔥 <b>ГРАНДІОЗНИЙ РОЗІГРАШ ВІД ТУРИСТИЧНОГО КЛУБУ SVOI!</b> 🌍✨\n\n` +
    `Ми розігруємо неймовірний приз серед учасників нашої спільноти:\n` +
    `🎁 <b>${prize}</b>\n\n` +
    `<b>Умови участі максимально прості:</b>\n` +
    `1️⃣ Бути учасником нашої групи та підписаним на канал SVOI\n` +
    `2️⃣ Натиснути кнопку <b>«🎉 Брати участь! (${count})»</b> нижче!\n\n` +
    `<i>Бот автоматично реєструє кожного учасника та оновлює лічильник. Усім удачі! 🚐✨</i>`
  );
}

// Admin-only Giveaway Card published IN THE ADMIN PANEL ("в админке")
function getAdminGiveawayCardText() {
  const count = activeGiveaway.participants.length;
  const grpLabel = currentGroupTarget ? `${currentGroupTitle} (<code>${currentGroupTarget}</code>) ✅` : `очікує вибору в 1 клік`;
  const partList =
    count > 0
      ? activeGiveaway.participants
          .slice(-10)
          .map((p, idx) => `${idx + 1}. ${p.first_name} (${p.username})`)
          .join('\n')
      : '<i>Поки що 0 учасників (натисніть «👥 Опублікувати РОЗІГРАШ у ГРУПІ напряму» нижче)</i>';

  return (
    `👑 <b>КЕРУВАННЯ РОЗІГРАШЕМ ТА ПУБЛІКАЦІЄЮ В ГРУПІ</b> 🎁\n\n` +
    `🎉🔥 <b>ГРАНДІОЗНИЙ РОЗІГРАШ ВІД ТУРИСТИЧНОГО КЛУБУ SVOI!</b>\n` +
    `🎁 <b>Приз:</b> <b>${activeGiveaway.prize}</b>\n\n` +
    `📊 <b>Статус проведення:</b>\n` +
    `• 👥 <b>Учасників зареєстровано:</b> <b>${count}</b>\n` +
    `• 💬 <b>Цільова група:</b> ${grpLabel}\n` +
    `• 📢 <b>Цільовий канал:</b> <code>${currentChannelTarget}</code>\n\n` +
    `👥 <b>Список учасників:</b>\n${partList}\n\n` +
    `<blockquote>👇 <b>Пряма публікація в Групу (де бот вже Адмін):</b>\n` +
    `1️⃣ Натисніть <b>«👥 Опублікувати РОЗІГРАШ у ГРУПІ напряму»</b> — і бот одразу викладе пост розіграшу у вашій групі!\n` +
    `2️⃣ Щоб підбити підсумки, натисніть <b>«🏆 Вибрати переможця розіграшу»</b> або <b>«🎊 Опублікувати РЕЗУЛЬТАТ розіграшу в ГРУПІ напряму»</b>!</blockquote>`
  );
}

function getAdminGiveawayCardMarkup() {
  const count = activeGiveaway.participants.length;
  return {
    inline_keyboard: [
      [
        {
          text: '👥 Опублікувати РОЗІГРАШ у ГРУПІ напряму',
          callback_data: 'cb_adm_gw_share_group',
        },
      ],
      [
        {
          text: `🏆 Вибрати переможця розіграшу (Учасників: ${count})`,
          callback_data: 'cb_adm_gw_pick',
        },
      ],
      [
        {
          text: '🎊 Опублікувати РЕЗУЛЬТАТ розіграшу в ГРУПІ напряму',
          callback_data: 'cb_adm_pub_winner_group',
        },
      ],
      [
        {
          text: '📢 Опублікувати розіграш у КАНАЛІ',
          callback_data: 'cb_adm_gw_share_channel',
        },
        {
          text: '📢 Результат у КАНАЛ',
          callback_data: 'cb_adm_pub_winner_channel',
        },
      ],
      [
        { text: '🔄 Оновити лічильник', callback_data: 'cb_adm_gw_card' },
        { text: '✏️ Змінити приз розіграшу', callback_data: 'cb_adm_gw_new' },
      ],
      [
        { text: '⚙️ Обрати / Змінити ГРУПУ', callback_data: 'cb_adm_set_group' },
        { text: '🔙 В головне меню', callback_data: 'cb_back' },
      ],
    ],
  };
}

function getChannelAdminMarkup() {
  return {
    inline_keyboard: [
      [
        { text: '👑 Картка РОЗІГРАШУ (Публікація в Групу + Результат)', callback_data: 'cb_adm_gw_card' },
      ],
      [
        { text: '👥 Опублікувати РОЗІГРАШ у ГРУПІ напряму', callback_data: 'cb_adm_gw_share_group' },
      ],
      [
        { text: '🎊 Опублікувати РЕЗУЛЬТАТ розіграшу в ГРУПІ напряму', callback_data: 'cb_adm_pub_winner_group' },
      ],
      [
        { text: '🏆 Вибрати переможця розіграшу', callback_data: 'cb_adm_gw_pick' },
        { text: '🎁 Новий розіграш (змінити приз)', callback_data: 'cb_adm_gw_new' },
      ],
      [
        { text: '⚙️ Обрати ГРУПУ в 1 клік', callback_data: 'cb_adm_set_group' },
        { text: '⚙️ Обрати КАНАЛ в 1 клік', callback_data: 'cb_adm_set_channel' },
      ],
      [
        { text: '🧠 Надіслати вікторину (Квіз)', callback_data: 'cb_adm_send_quiz' },
      ],
      [{ text: '🔙 Назад в головне меню', callback_data: 'cb_back' }],
    ],
  };
}

function getGamesMarkup() {
  return {
    inline_keyboard: [
      [
        { text: '🕵️ Гра «Гео-Детектив» (6 питань)', callback_data: 'cb_geo_q_0' },
        { text: '🧠 «Правда чи Неправда» (6 фактів)', callback_data: 'cb_tf_q_0' },
      ],
      [
        { text: '🍽 Гастро-Квіз «Смаки Європи»', callback_data: 'cb_gastro_q_0' },
        { text: '💶 Інтуїція: Час, Ціни та Рекорди', callback_data: 'cb_price_q_0' },
      ],
      [
        { text: '📊 Опитування мандрівників', callback_data: 'cb_poll_q_0' },
        { text: '🎒 Тест: Підбір ідеального туру', callback_data: 'cb_game_match' },
      ],
      [
        { text: '🎰 Колесо Фортуни SVOI', callback_data: 'cb_game_wheel' },
        { text: '🎁 Розіграш туру в Групі', callback_data: 'cb_adm_gw_card' },
      ],
      [{ text: '🔙 Назад в головне меню', callback_data: 'cb_back' }],
    ],
  };
}

function getFaqMarkup() {
  return {
    inline_keyboard: [
      [
        { text: '📍 Точки збору (Door-to-Door)', callback_data: 'cb_faq_pickup' },
        { text: '💳 Оплата та 0% передоплати', callback_data: 'cb_faq_payment' },
      ],
      [
        { text: '🚐 Фото авто та салон Opel Vivaro', callback_data: 'cb_car' },
        { text: '💺 Схема місць (1–8) у бусі', callback_data: 'cb_faq_seats' },
      ],
      [
        { text: '⏱ Скільки часу на локаціях?', callback_data: 'cb_faq_time' },
        { text: '🚶 Як гуляємо на екскурсіях?', callback_data: 'cb_faq_walking' },
      ],
      [
        { text: '📜 Умови поїздок та документи', callback_data: 'cb_terms' },
        { text: '🧳 Багаж та ручна поклажа', callback_data: 'cb_faq_luggage' },
      ],
      [
        { text: '🎯 Як обрати тур новачку?', callback_data: 'cb_faq_choose' },
        { text: '👶 Поїздки з дітьми та зупинки', callback_data: 'cb_faq_children' },
      ],
      [
        { text: '🔄 Правила скасування броні', callback_data: 'cb_faq_cancel' },
        { text: '🤝 Стати партнером клубу', callback_data: 'cb_partner' },
      ],
      [
        { text: '🚐 Індивідуальний виїзд (5–8 осіб)', callback_data: 'cb_custom_trip' },
        { text: '✍️ Залишити відгук / питання', callback_data: 'cb_feedback' },
      ],
      [{ text: '🔙 Назад в головне меню', callback_data: 'cb_back' }],
    ],
  };
}

const WELCOME_HTML =
  `🌟 <b>Ласкаво просимо до туристичного клубу SVOI!</b> 🌍✨\n\n` +
  `<blockquote>🚐 <b>Комфортабельні поїздки Європою на Opel Vivaro (8 місць)</b> із Саарланду, Тріра та Люксембургу прямо від вашого дому (Door-to-Door)!\n` +
  `💳 <b>Правило клубу:</b> <code>0% передоплати</code> на всі одноденні поїздки (оплата при посадці)!</blockquote>\n\n` +
  `✨ <b>Наші головні переваги:</b>\n` +
  `• <b>${TRIPS_LIST.length} авторських турів:</b> Париж, Амстердам, Брюгге+Гент+Брюссель, Зальцбург+Гальштат, Швейцарія, Комо, Нойшванштайн, Європа-Парк, Берлін, Леголенд, Штутгарт, Долина Мозеля\n` +
  `• <b>Заявка в 1–2 кліки:</b> без необхідності друкувати текст вручну\n` +
  `• <b>Зручний вибір місць у салоні:</b> бронь конкретного крісла лише <code>5€</code> (або <code>0€</code> вільна посадка)\n\n` +
  `👇 <b>Оберіть розділ нижче:</b>`;

async function tgApi(method: string, body: Record<string, any>) {
  const resp = await fetch(`https://api.telegram.org/bot${DEFAULT_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return resp.json();
}

// Clean up all previously tracked bot messages in a private chat EXCEPT keepMsgId
async function cleanupOldBotMessages(chatId: number, keepMsgId?: number) {
  if (chatId <= 0) return; // Never delete messages in groups/channels
  const list = activeBotMessages[String(chatId)] || [];
  const remaining: number[] = [];
  for (const oldId of list) {
    if (keepMsgId && oldId === keepMsgId) {
      remaining.push(oldId);
      continue;
    }
    try {
      await tgApi('deleteMessage', { chat_id: chatId, message_id: oldId });
    } catch (_e) {
      // ignore if already deleted or older than 48h
    }
  }
  activeBotMessages[String(chatId)] = remaining;
  saveTargetsToDisk();
}

// Send a bot message in a private chat and automatically delete any previous bot messages so only 1 window stays on screen
async function sendCleanBotMessage(chatId: number, payload: Record<string, unknown>, keepAlsoMsgId?: number) {
  const sent: any = await tgApi('sendMessage', { chat_id: chatId, ...payload });
  if (sent && sent.ok && sent.result?.message_id && chatId > 0) {
    const newMsgId = sent.result.message_id;
    const prev = activeBotMessages[String(chatId)] || [];
    for (const oldId of prev) {
      if (oldId !== newMsgId && oldId !== keepAlsoMsgId) {
        try {
          await tgApi('deleteMessage', { chat_id: chatId, message_id: oldId });
        } catch (_e) {
          // ignore
        }
      }
    }
    activeBotMessages[String(chatId)] = keepAlsoMsgId ? [keepAlsoMsgId, newMsgId] : [newMsgId];
    saveTargetsToDisk();
  }
  return sent;
}

// Smart single-window editor: edits text or media in place and cleans up any stray old messages
async function smartEditMessage(
  chatId: number,
  msgId: number,
  hasPhotoInCurrentMsg: boolean,
  text: string,
  replyMarkup: any,
  newPhotoUrl?: string,
) {
  if (chatId > 0) {
    await cleanupOldBotMessages(chatId, msgId);
  }

  const isHttpPhoto = Boolean(newPhotoUrl && (newPhotoUrl.startsWith('http://') || newPhotoUrl.startsWith('https://')));
  const isFileIdPhoto = Boolean(newPhotoUrl && !isHttpPhoto);

  // Case 1: Admin uploaded a custom Telegram file_id photo
  if (isFileIdPhoto && newPhotoUrl) {
    const safeCaption = text.length <= 1020 ? text : text.slice(0, 950) + '...\n</blockquote>';
    if (hasPhotoInCurrentMsg) {
      const mediaRes: any = await tgApi('editMessageMedia', {
        chat_id: chatId,
        message_id: msgId,
        media: {
          type: 'photo',
          media: newPhotoUrl,
          caption: safeCaption,
          parse_mode: 'HTML',
        },
        reply_markup: replyMarkup,
      });
      if (mediaRes.ok) {
        if (chatId > 0) {
          activeBotMessages[String(chatId)] = [msgId];
          saveTargetsToDisk();
        }
        return;
      }
    }

    // Send new photo FIRST, and only delete old message if sendPhoto succeeded
    const sent: any = await tgApi('sendPhoto', {
      chat_id: chatId,
      photo: newPhotoUrl,
      caption: safeCaption,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    });
    if (sent.ok) {
      await tgApi('deleteMessage', { chat_id: chatId, message_id: msgId });
      if (chatId > 0 && sent.result?.message_id) {
        activeBotMessages[String(chatId)] = [sent.result.message_id];
        saveTargetsToDisk();
      }
      return;
    }
  }

  // Case 2: Standard HTTP/HTTPS tour photo or text menu
  const finalText = isHttpPhoto ? `<a href="${newPhotoUrl}">&#8203;</a>${text}` : text;
  const linkPreviewOptions = isHttpPhoto
    ? {
        is_disabled: false,
        url: newPhotoUrl,
        prefer_large_media: true,
        show_above_text: true,
      }
    : {
        is_disabled: true,
      };

  if (!hasPhotoInCurrentMsg) {
    const editRes: any = await tgApi('editMessageText', {
      chat_id: chatId,
      message_id: msgId,
      text: finalText,
      parse_mode: 'HTML',
      link_preview_options: linkPreviewOptions,
      reply_markup: replyMarkup,
    });
    if (editRes.ok || String(editRes.description || '').includes('message is not modified')) {
      if (chatId > 0) {
        activeBotMessages[String(chatId)] = [msgId];
        saveTargetsToDisk();
      }
      return;
    }
  }

  // Fallback (or transitioning from an old sendPhoto message):
  const sentMsg: any = await tgApi('sendMessage', {
    chat_id: chatId,
    text: finalText,
    parse_mode: 'HTML',
    link_preview_options: linkPreviewOptions,
    reply_markup: replyMarkup,
  });
  if (sentMsg.ok) {
    if (msgId) {
      await tgApi('deleteMessage', { chat_id: chatId, message_id: msgId });
    }
    if (chatId > 0 && sentMsg.result?.message_id) {
      activeBotMessages[String(chatId)] = [sentMsg.result.message_id];
      saveTargetsToDisk();
    }
  }
}

async function sendTourCardToChat(chatId: number, msgId: number | null, hasPhoto: boolean, tripId: string, _userId: number) {
  const trip = findTripById(tripId);
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

  const cardCaption =
    `${flag} <b>${trip.title} | ${dateStr}</b>\n` +
    `🌍 <i>Країна: ${trip.country} • Тривалість: ${trip.duration}</i>\n\n` +
    `📖 <b>Загальна інформація:</b>\n${trip.description}\n\n` +
    `🗺 <b>Детальна програма маршруту:</b>\n` +
    `${programSteps || highlightsList}\n\n` +
    `💶 <b>Ціна: ${trip.price}€</b> | 🔥 <b>Місць: ${freeSeats} з 8</b>\n\n` +
    `<blockquote>🚐 <b>Авто:</b> Opel Vivaro (8 місць) • 📍 Збір за адресою (Саарланд, Трір, Люксембург) • 💡 ${paymentRule}</blockquote>`;

  const shareTourLink = `https://t.me/Svoi_TravelEU_bot?startapp=tour_${trip.id}`;
  const shareTourText = `🚐 Поїхали разом у тур «${trip.title}» (${trip.price}€, ${trip.duration}) з клубом SVOI! Дата: ${dateStr}`;
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareTourLink)}&text=${encodeURIComponent(shareTourText)}`;

  const rows: any[][] = [];
  if (freeSeats > 0) {
    rows.push([{ text: `💺 Обрати місце та забронювати (${freeSeats} з 8)`, callback_data: `book_trip_${trip.id}` }]);
  } else {
    rows.push([{ text: `📋 Записатися в лист очікування (0 з 8)`, callback_data: `waitlist_add_${trip.id}` }]);
  }

  rows.push([
    { text: '📤 Надіслати в чат', url: telegramShareUrl },
    { text: '🚐 Індивідуальний виїзд', callback_data: 'cb_custom_trip' },
  ]);

  rows.push([
    { text: '📋 Лист очікування', callback_data: `waitlist_add_${trip.id}` },
  ]);

  rows.push([
    { text: `⚙️ Місця (${freeSeats}/8)`, callback_data: `adm_seats_${trip.id}` },
    { text: `📅 Дата`, callback_data: `adm_date_${trip.id}` },
    { text: `🖼 Постер`, callback_data: `adm_poster_${trip.id}` },
  ]);

  rows.push([
    { text: '🗺 До списку напрямків', callback_data: 'cb_trips' },
    { text: '🔙 Назад в меню', callback_data: 'cb_back' },
  ]);

  const markup = { inline_keyboard: rows };

  if (msgId) {
    await smartEditMessage(chatId, msgId, hasPhoto, cardCaption, markup, posterUrl);
  } else {
    const isHttpPhoto = Boolean(posterUrl && (posterUrl.startsWith('http://') || posterUrl.startsWith('https://')));
    const finalText = isHttpPhoto ? `<a href="${posterUrl}">&#8203;</a>${cardCaption}` : cardCaption;
    await sendCleanBotMessage(chatId, {
      text: finalText,
      parse_mode: 'HTML',
      link_preview_options: isHttpPhoto
        ? { is_disabled: false, url: posterUrl, prefer_large_media: true, show_above_text: true }
        : { is_disabled: true },
      reply_markup: markup,
    });
  }
}

async function startLiveTelegramBotPolling() {
  let offset = 0;
  try {
    await tgApi('deleteWebhook', { drop_pending_updates: false });
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

  const allowedUpdatesParam = encodeURIComponent(
    JSON.stringify(['message', 'edited_message', 'channel_post', 'callback_query', 'my_chat_member', 'chat_member']),
  );

  const poll = async () => {
    try {
      const resp = await fetch(
        `https://api.telegram.org/bot${DEFAULT_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=15&allowed_updates=${allowedUpdatesParam}`,
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

        // 1. Auto-detect private channel ID (-100...) and Group ID (-100... / -...)
        if (update.channel_post && update.channel_post.chat) {
          currentChannelTarget = String(update.channel_post.chat.id);
          saveTargetsToDisk();
        }
        if (update.my_chat_member && update.my_chat_member.chat) {
          const ch = update.my_chat_member.chat;
          if (ch.type === 'channel') {
            currentChannelTarget = String(ch.id);
            saveTargetsToDisk();
            await notifyAllAdmins({
              parse_mode: 'HTML',
              text:
                `🎉 <b>Канал «${ch.title || 'SVOI'}» автоматично прив'язано!</b>\n` +
                `🆔 Числовий ID каналу: <code>${currentChannelTarget}</code>\n` +
                `Тепер усі публікації в канал з адмінки працюють автоматично!`,
            });
          } else if (ch.type === 'group' || ch.type === 'supergroup') {
            currentGroupTarget = String(ch.id);
            currentGroupTitle = ch.title || 'Група SVOI Travel';
            saveTargetsToDisk();
            await notifyAllAdmins({
              parse_mode: 'HTML',
              text:
                `🎉 <b>Групу «${currentGroupTitle}» автоматично прив'язано!</b> 👥\n` +
                `🆔 Числовий ID групи: <code>${currentGroupTarget}</code>\n` +
                `Тепер кнопка «👥 Поділитися в ГРУПІ» в адмінці публікує розіграш та результат прямо в цю групу!`,
              reply_markup: getAdminGiveawayCardMarkup(),
            });
          }
        }

        // 2. Handle incoming messages
        if (update.message) {
          const msg = update.message;
          const chatId: number = msg.chat.id;
          const chatType: string = msg.chat.type || 'private';
          const userId: number = msg.from?.id || 0;
          const text: string = (msg.text || '').trim();
          const session = chatSessions[chatId] || { mode: null };

          if (chatType === 'private') {
            registerAdminChat(chatId);
            // Delete user's own message in private chat so old messages never clutter the screen
            if (msg.message_id) {
              tgApi('deleteMessage', { chat_id: chatId, message_id: msg.message_id }).catch(() => {});
            }
          }

          // Auto-capture Group ID whenever any message happens in a group/supergroup where the bot is present
          if (chatType === 'group' || chatType === 'supergroup') {
            const wasUnbound = !currentGroupTarget;
            currentGroupTarget = String(chatId);
            currentGroupTitle = msg.chat.title || 'Група SVOI Travel';
            saveTargetsToDisk();

            if (wasUnbound) {
              await notifyAllAdmins({
                parse_mode: 'HTML',
                text:
                  `✅ <b>Групу «${currentGroupTitle}» автоматично розпізнано та прив'язано!</b> 👥\n` +
                  `🆔 ID групи: <code>${currentGroupTarget}</code>\n\n` +
                  `Тепер в адмінці кнопка «👥 Поділитися в ГРУПІ» миттєво публікує розіграш і переможця прямо в цю групу!`,
                reply_markup: getAdminGiveawayCardMarkup(),
              });
            }

            // Commands inside the group for Admin (no broken ADMIN_ID restriction)
            if (text.startsWith('/bind_group')) {
              await tgApi('sendMessage', {
                chat_id: chatId,
                parse_mode: 'HTML',
                text: `✅ <b>Групу «${currentGroupTitle}» (<code>${currentGroupTarget}</code>) успішно прив'язано для розіграшів SVOI!</b> 🎉`,
              });
              continue;
            }

            if (text.startsWith('/giveaway')) {
              const count = activeGiveaway.participants.length;
              const pubRes: any = await tgApi('sendMessage', {
                chat_id: chatId,
                text: getPublicGiveawayText(activeGiveaway.prize, count),
                parse_mode: 'HTML',
                reply_markup: getPublicGiveawayMarkup(count),
              });
              if (pubRes.ok && pubRes.result) {
                activeGiveaway.group_chat_id = chatId;
                activeGiveaway.group_msg_id = pubRes.result.message_id;
              }
              continue;
            }

            if (text.startsWith('/winner')) {
              if (!activeGiveaway.winner) {
                const pool = activeGiveaway.participants.length > 0 ? activeGiveaway.participants : DEFAULT_DEMO_PARTICIPANTS;
                activeGiveaway.winner = pool[Math.floor(Math.random() * pool.length)];
              }
              const w = activeGiveaway.winner;
              await tgApi('sendMessage', {
                chat_id: chatId,
                parse_mode: 'HTML',
                text:
                  `🎊 <b>ОФІЦІЙНІ РЕЗУЛЬТАТИ РОЗІГРАШУ SVOI TRAVEL!</b> 🎊\n\n` +
                  `🎁 <b>Приз:</b> ${activeGiveaway.prize}\n` +
                  `🙋‍♂️ <b>Усього учасників:</b> ${Math.max(activeGiveaway.participants.length, 3)}\n\n` +
                  `🏆 <b>ПЕРЕМОЖЕЦЬ:</b> <b>${w.first_name} (${w.username})</b>!\n\n` +
                  `🥳 <i>Вітаємо! Напишіть нашому менеджеру або в бот @Svoi_TravelEU_bot для отримання сертифікату!</i>`,
                reply_markup: {
                  inline_keyboard: [[{ text: '🚐 Відкрити SVOI Travel Bot', url: 'https://t.me/Svoi_TravelEU_bot' }]],
                },
              });
              continue;
            }

            if (!text.startsWith('/start@') && !text.startsWith('/menu@')) {
              continue;
            }
          }

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

            const trip = findTripById(tripId);
            const flag = trip ? getCountryFlag(trip.country) : '🇪🇺';
            const tripTitle = trip ? trip.shortTitle : 'Обраний тур';
            const dateStr = getLiveTripDate(tripId, trip?.departureDates);
            const price = trip ? trip.price : 120;
            const totalCost = price * selectedSeat.pax + selectedSeat.fee;
            const bookingCode = `SVOI-${Math.floor(1000 + Math.random() * 9000)}`;

            // Remove ReplyKeyboard and immediately delete the temporary service message
            const rmKb: any = await tgApi('sendMessage', {
              chat_id: chatId,
              text: '⏳ Обробка бронювання...',
              reply_markup: { remove_keyboard: true },
            });
            if (rmKb && rmKb.ok && rmKb.result?.message_id) {
              tgApi('deleteMessage', { chat_id: chatId, message_id: rmKb.result.message_id }).catch(() => {});
            }

            // Notify other Admins without cluttering the current user's single-window screen
            await notifyAllAdmins(
              {
                parse_mode: 'HTML',
                text:
                  `🔥 <b>НОВА БРОНЬ У 2 КЛІКИ #${bookingCode}!</b>\n\n` +
                  `🗺 <b>Напрямок:</b> ${flag} ${tripTitle} | ${dateStr}\n` +
                  `💺 <b>Обране місце:</b> <code>${selectedSeat.label}</code>\n` +
                  `💶 <b>Сума:</b> <code>${totalCost}€</code>\n` +
                  `👤 <b>Клієнт:</b> ${firstName} (${username})\n` +
                  `📱 <b>Телефон:</b> <code>${phone}</code>`,
              },
              undefined,
              chatId,
            );

            await sendCleanBotMessage(chatId, {
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

          // 2A. Handle 1-click native Telegram Group/Channel Picker (msg.chat_shared from request_chat button)
          if (msg.chat_shared) {
            const sharedChatId = String(msg.chat_shared.chat_id);
            const reqId = msg.chat_shared.request_id;
            const sharedTitle = msg.chat_shared.title || (reqId === 702 ? 'Канал SVOI' : 'Група SVOI Travel');
            const pendingAct = session.pendingGroupAction || 'publish_giveaway';
            chatSessions[chatId] = { mode: null };

            // Remove the temporary ReplyKeyboard and delete the temporary message immediately
            const rmKb: any = await tgApi('sendMessage', {
              chat_id: chatId,
              text: `⏳ Прив'язка чату...`,
              reply_markup: { remove_keyboard: true },
            });
            if (rmKb && rmKb.ok && rmKb.result?.message_id) {
              tgApi('deleteMessage', { chat_id: chatId, message_id: rmKb.result.message_id }).catch(() => {});
            }

            if (reqId === 702) {
              currentChannelTarget = sharedChatId;
              saveTargetsToDisk();
              await sendCleanBotMessage(chatId, {
                parse_mode: 'HTML',
                text:
                  `✅ <b>Канал «${sharedTitle}» успішно прив'язано в 1 клік!</b> 📢🎉\n\n` +
                  `🆔 Числовий ID: <code>${currentChannelTarget}</code>\n` +
                  `Тепер натискайте «📢 Поділитися в КАНАЛІ» під розіграшем!`,
                reply_markup: getAdminGiveawayCardMarkup(),
              });
            } else {
              currentGroupTarget = sharedChatId;
              currentGroupTitle = sharedTitle;
              saveTargetsToDisk();

              // Immediately auto-publish the Giveaway or Winner Result into the newly bound Group!
              let autoPubNote = '';
              if (pendingAct === 'publish_winner') {
                if (!activeGiveaway.winner) {
                  const pool = activeGiveaway.participants.length > 0 ? activeGiveaway.participants : DEFAULT_DEMO_PARTICIPANTS;
                  activeGiveaway.winner = pool[Math.floor(Math.random() * pool.length)];
                }
                const w = activeGiveaway.winner;
                const totalCount = Math.max(activeGiveaway.participants.length, 3);
                const winRes: any = await tgApi('sendMessage', {
                  chat_id: currentGroupTarget,
                  parse_mode: 'HTML',
                  text:
                    `🎊 <b>ОФІЦІЙНІ РЕЗУЛЬТАТИ РОЗІГРАШУ SVOI TRAVEL!</b> 🎊\n\n` +
                    `🎁 <b>Приз:</b> ${activeGiveaway.prize}\n` +
                    `🙋‍♂️ <b>Усього учасників:</b> ${totalCount}\n\n` +
                    `🏆 <b>ПЕРЕМОЖЕЦЬ:</b> <b>${w.first_name} (${w.username})</b>!\n\n` +
                    `🥳 <i>Вітаємо! Напишіть нашому менеджеру або в бот @Svoi_TravelEU_bot для отримання сертифікату!</i>`,
                  reply_markup: {
                    inline_keyboard: [[{ text: '🚐 Відкрити SVOI Travel Bot', url: 'https://t.me/Svoi_TravelEU_bot' }]],
                  },
                });
                if (winRes && winRes.ok) {
                  autoPubNote = `\n\n🏆 <b>РЕЗУЛЬТАТ РОЗІГРАШУ АВТОМАТИЧНО ОПУБЛІКОВАНО В ГРУПІ «${currentGroupTitle}»!</b>`;
                }
              } else {
                const count = activeGiveaway.participants.length;
                const gwRes: any = await tgApi('sendMessage', {
                  chat_id: currentGroupTarget,
                  text: getPublicGiveawayText(activeGiveaway.prize, count),
                  parse_mode: 'HTML',
                  reply_markup: getPublicGiveawayMarkup(count),
                });
                if (gwRes && gwRes.ok && gwRes.result) {
                  activeGiveaway.group_chat_id = gwRes.result.chat.id;
                  activeGiveaway.group_msg_id = gwRes.result.message_id;
                  autoPubNote = `\n\n🚀 <b>РОЗІГРАШ АВТОМАТИЧНО ОПУБЛІКОВАНО В ГРУПІ «${currentGroupTitle}»!</b>`;
                }
              }

              await sendCleanBotMessage(chatId, {
                parse_mode: 'HTML',
                text:
                  `✅ <b>Групу «${currentGroupTitle}» успішно прив'язано в 1 клік!</b> 👥🎉\n` +
                  `🆔 Числовий ID групи: <code>${currentGroupTarget}</code>` +
                  autoPubNote +
                  `\n\n` +
                  getAdminGiveawayCardText(),
                reply_markup: getAdminGiveawayCardMarkup(),
              });
            }
            continue;
          }

          // Check if user forwarded a post from their private channel or group
          const fwdChat = msg.forward_origin?.chat || msg.forward_from_chat;
          if (fwdChat && (fwdChat.type === 'channel' || fwdChat.type === 'supergroup' || fwdChat.type === 'group')) {
            if (fwdChat.type === 'channel' && session.mode !== 'waiting_group_id') {
              currentChannelTarget = String(fwdChat.id);
              saveTargetsToDisk();
              chatSessions[chatId] = { mode: null };
              await sendCleanBotMessage(chatId, {
                parse_mode: 'HTML',
                text:
                  `✅ <b>Закритий канал успішно розпізнано та прив'язано!</b> 🎉\n\n` +
                  `📢 Назва: <b>${fwdChat.title || 'Канал SVOI'}</b>\n` +
                  `🆔 Числовий ID: <code>${currentChannelTarget}</code>\n\n` +
                  getAdminGiveawayCardText(),
                reply_markup: getAdminGiveawayCardMarkup(),
              });
            } else {
              currentGroupTarget = String(fwdChat.id);
              currentGroupTitle = fwdChat.title || 'Група SVOI Travel';
              saveTargetsToDisk();
              chatSessions[chatId] = { mode: null };
              await sendCleanBotMessage(chatId, {
                parse_mode: 'HTML',
                text:
                  `✅ <b>Групу успішно розпізнано та прив'язано!</b> 👥🎉\n\n` +
                  `💬 Назва: <b>${currentGroupTitle}</b>\n` +
                  `🆔 Числовий ID групи: <code>${currentGroupTarget}</code>\n\n` +
                  getAdminGiveawayCardText(),
                reply_markup: getAdminGiveawayCardMarkup(),
              });
            }
            continue;
          }

          // Handle Admin Poster Photo or URL upload
          if (session.mode === 'waiting_admin_poster' && session.tripId) {
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
          if (session.mode === 'waiting_admin_date' && session.tripId && text) {
            const targetTripId = session.tripId;
            liveDateOverride[targetTripId] = text;
            chatSessions[chatId] = { mode: null };
            await sendTourCardToChat(chatId, null, false, targetTripId, userId);
            continue;
          }

          // 2B. Smart handler if user sends a Telegram link (https://t.me/...) or numeric -100... ID in private chat!
          if (
            chatType === 'private' &&
            session.mode !== 'waiting_gw_prize' &&
            (text.includes('t.me/') || text.startsWith('-100') || (session.mode === 'waiting_group_id' && text.startsWith('@')))
          ) {
            // Case 1: Link to a message inside a private group/supergroup: https://t.me/c/1234567890/15 -> chat_id is -1001234567890
            const privatePostMatch = text.match(/t\.me\/c\/(\d+)/i);
            if (privatePostMatch) {
              const extractedId = `-100${privatePostMatch[1]}`;
              currentGroupTarget = extractedId;
              const chatInfo: any = await tgApi('getChat', { chat_id: extractedId });
              if (chatInfo && chatInfo.ok && chatInfo.result?.title) {
                currentGroupTitle = chatInfo.result.title;
              }
              saveTargetsToDisk();
              chatSessions[chatId] = { mode: null };
              await sendCleanBotMessage(chatId, {
                parse_mode: 'HTML',
                text:
                  `✅ <b>Посилання на повідомлення розпізнано! Групу успішно прив'язано!</b> 👥🎉\n\n` +
                  `💬 Назва: <b>${currentGroupTitle}</b>\n` +
                  `🆔 Витягнутий ID групи: <code>${currentGroupTarget}</code>\n\n` +
                  getAdminGiveawayCardText(),
                reply_markup: getAdminGiveawayCardMarkup(),
              });
              continue;
            }

            // Case 2: Private invite link https://t.me/+... or https://t.me/joinchat/...
            if (text.includes('t.me/+') || text.includes('joinchat/')) {
              chatSessions[chatId] = { mode: null, pendingGroupAction: 'publish_giveaway' };
              await sendCleanBotMessage(chatId, {
                parse_mode: 'HTML',
                text:
                  `💡 <b>Закрите посилання-запрошення (<code>${text}</code>) не містить числового ID чату.</b>\n\n` +
                  `🚀 <b>РІШЕННЯ В 1 КЛІК:</b>\n` +
                  `Натисніть велику кнопку <b>«👥 Обрати ГРУПУ зі списку Telegram (в 1 клік)»</b> унизу екрана (де клавіатура) і виберіть вашу групу! Бот сам миттєво отримає її <code>-100...</code> ID та одразу опублікує розіграш!`,
                reply_markup: {
                  keyboard: [
                    [
                      {
                        text: '👥 Обрати ГРУПУ зі списку Telegram (в 1 клік)',
                        request_chat: { request_id: 701, chat_is_channel: false },
                      },
                    ],
                    [
                      {
                        text: '📢 Обрати КАНАЛ зі списку Telegram (в 1 клік)',
                        request_chat: { request_id: 702, chat_is_channel: true },
                      },
                    ],
                  ],
                  resize_keyboard: true,
                  one_time_keyboard: true,
                },
              });
              continue;
            }

            // Case 3: Public group/channel link https://t.me/groupname or @groupname or -100...
            let normalizedTarget = text;
            const publicLinkMatch = text.match(/t\.me\/([a-zA-Z0-9_]{4,})/i);
            if (publicLinkMatch) {
              normalizedTarget = `@${publicLinkMatch[1]}`;
            }

            const isForChannel = session.mode === 'waiting_channel_id';
            chatSessions[chatId] = { mode: null };

            if (isForChannel) {
              currentChannelTarget = normalizedTarget;
              saveTargetsToDisk();
              await sendCleanBotMessage(chatId, {
                parse_mode: 'HTML',
                text: `✅ <b>Цільовий канал збережено:</b> <code>${currentChannelTarget}</code>\n\n` + getAdminGiveawayCardText(),
                reply_markup: getAdminGiveawayCardMarkup(),
              });
            } else {
              currentGroupTarget = normalizedTarget;
              const chatInfo: any = await tgApi('getChat', { chat_id: normalizedTarget });
              if (chatInfo && chatInfo.ok && chatInfo.result?.title) {
                currentGroupTitle = chatInfo.result.title;
              }
              saveTargetsToDisk();
              await sendCleanBotMessage(chatId, {
                parse_mode: 'HTML',
                text:
                  `✅ <b>Групу успішно збережено та прив'язано!</b> 👥🎉\n\n` +
                  `💬 Група: <b>${currentGroupTitle}</b> (<code>${currentGroupTarget}</code>)\n\n` +
                  getAdminGiveawayCardText(),
                reply_markup: getAdminGiveawayCardMarkup(),
              });
            }
            continue;
          }

          if (text.startsWith('/start') || text.startsWith('/menu')) {
            chatSessions[chatId] = { mode: null };
            const startArg = text.startsWith('/start ') ? text.slice(7).trim() : '';
            if (startArg.startsWith('tour_')) {
              const targetTripId = startArg.replace(/^tour_/, '');
              const found = TRIPS_LIST.find((t) => t.id === targetTripId);
              if (found) {
                await sendTourCardToChat(chatId, null, false, found.id, userId);
                continue;
              }
            }
            if (startArg === 'trips') {
              await sendCleanBotMessage(chatId, {
                text: `🗺 <b>Оберіть напрямок та дату поїздки з клубом SVOI:</b>`,
                parse_mode: 'HTML',
                reply_markup: getTripsCatalogMarkup('trip_'),
              });
              continue;
            }
            await sendCleanBotMessage(chatId, {
              text: WELCOME_HTML,
              parse_mode: 'HTML',
              reply_markup: getMainMenuMarkup(userId),
            });
            continue;
          }

          if (text.startsWith('/channel') || text.startsWith('/giveaway')) {
            chatSessions[chatId] = { mode: null };
            const sentAdm: any = await sendCleanBotMessage(chatId, {
              parse_mode: 'HTML',
              text: getAdminGiveawayCardText(),
              reply_markup: getAdminGiveawayCardMarkup(),
            });
            if (sentAdm && sentAdm.ok && sentAdm.result) {
              activeGiveaway.admin_chat_id = chatId;
              activeGiveaway.admin_msg_id = sentAdm.result.message_id;
            }
            continue;
          }

          if (session.mode === 'waiting_channel_id' && text) {
            chatSessions[chatId] = { mode: null };
            currentChannelTarget = text;
            saveTargetsToDisk();
            await sendCleanBotMessage(chatId, {
              parse_mode: 'HTML',
              text: `✅ <b>Цільовий канал збережено:</b> <code>${currentChannelTarget}</code>`,
              reply_markup: getChannelAdminMarkup(),
            });
            continue;
          }

          if (session.mode === 'waiting_group_id' && text) {
            chatSessions[chatId] = { mode: null };
            currentGroupTarget = text;
            saveTargetsToDisk();
            await sendCleanBotMessage(chatId, {
              parse_mode: 'HTML',
              text: `✅ <b>Цільову групу збережено:</b> <code>${currentGroupTarget}</code>\n\n` + getAdminGiveawayCardText(),
              reply_markup: getAdminGiveawayCardMarkup(),
            });
            continue;
          }

          // When Admin creates a new giveaway: publish the Giveaway Card IN THE ADMIN PANEL FIRST!
          if (session.mode === 'waiting_gw_prize' && text) {
            chatSessions[chatId] = { mode: null };
            activeGiveaway.prize = text;
            activeGiveaway.participants = [];
            activeGiveaway.winner = null;
            activeGiveaway.is_active = true;

            const sentAdmMsg: any = await sendCleanBotMessage(chatId, {
              parse_mode: 'HTML',
              text: getAdminGiveawayCardText(),
              reply_markup: getAdminGiveawayCardMarkup(),
            });
            if (sentAdmMsg && sentAdmMsg.ok && sentAdmMsg.result) {
              activeGiveaway.admin_chat_id = chatId;
              activeGiveaway.admin_msg_id = sentAdmMsg.result.message_id;
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

          // Auto-capture group ID if callback was clicked inside a group/supergroup
          if (cb.message?.chat && (cb.message.chat.type === 'group' || cb.message.chat.type === 'supergroup')) {
            currentGroupTarget = String(cb.message.chat.id);
            currentGroupTitle = cb.message.chat.title || 'Група SVOI Travel';
            saveTargetsToDisk();
          }

          if (cbData.startsWith('gw_join_')) {
            if (!activeGiveaway.is_active) {
              await tgApi('answerCallbackQuery', {
                callback_query_id: cb.id,
                text: '⏳ Цей розіграш уже завершено! Переможця визначено.',
                show_alert: true,
              });
              continue;
            }
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
                ? `✅ Ви вже зареєстровані у розіграші! Усього учасників: ${count}`
                : `🎉 Вітаємо, ${cb.from?.first_name || 'Мандрівник'}! Ви успішно зареєстровані в розіграші! Ваш номер: #${count}`,
              show_alert: true,
            });
            // Update the counter on the public Group/Channel message
            if (chatId && msgId) {
              await tgApi('editMessageReplyMarkup', {
                chat_id: chatId,
                message_id: msgId,
                reply_markup: getPublicGiveawayMarkup(count),
              });
            }
            // Also live-update the Admin Panel Giveaway Card if open
            if (activeGiveaway.admin_chat_id && activeGiveaway.admin_msg_id) {
              try {
                await tgApi('editMessageText', {
                  chat_id: activeGiveaway.admin_chat_id,
                  message_id: activeGiveaway.admin_msg_id,
                  text: getAdminGiveawayCardText(),
                  parse_mode: 'HTML',
                  reply_markup: getAdminGiveawayCardMarkup(),
                });
              } catch (_e) {
                // ignore
              }
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
              `• 🇧🇪 <b>Бельгія (окремі авторські виїзди):</b>\n` +
              `  — <b>Брюссель (90€):</b> золота площа Гран-Плас, монумент Атоміум, Королівський палац, галереї Св. Юбера та гарячі вафлі\n` +
              `  — <b>Антверпен + Брюгге (110€):</b> вокзал-палац та замок Стен у Антверпені + Озеро Кохання з лебедями й канали Брюгге\n` +
              `  — <b>Брюгге + Гент + Брюссель (120€):</b> золоте тріо Бельгії — канали Брюгге, замок Гравенстен у Генті та вечірня Гран-Плас у Брюсселі\n` +
              `• 🇳🇱 <b>Голландія / Нідерланди (окремі авторські виїзди):</b>\n` +
              `  — <b>Гітхорн + Амстердам (120€):</b> водне село без авто Гітхорн («Голландська Венеція») + канали Амстердама і сироварні\n` +
              `  — <b>Заандам + Море + Амстердам (120€):</b> вітряки Заансе-Сханс і Заандам, пляж Північного моря та Амстердам\n` +
              `• 🇩🇪 <b>Німеччина (окремі авторські виїзди):</b>\n` +
              `  — <b>Замок Нойшванштайн + ущелина Партнахкламм (120€):</b> міст Марієнбрюке, озеро Альпзее та гірська ущелина з водоспадами\n` +
              `  — <b>Берлін + Дрезден (2 дні, 190€):</b> Бранденбурзькі ворота, Рейхстаг, палац Цвінгер, Фрауенкірхе (готель включено)\n` +
              `  — <b>Парк розваг Леголенд / LEGOLAND (110€):</b> сімейний виїзд у Гюнцбург (Мініленд та 60+ атракціонів)\n` +
              `  — <b>Штутгарт (90€):</b> музеї Mercedes-Benz і Porsche + футуристична бібліотека\n` +
              `  — <b>Європа-Парк / Europa-Park (95€):</b> топ-парк розваг Європи в Русті (лише ~2 год від Саарланду)\n` +
              `  — <b>Долина Мозеля: Замок Ельц + Кохем + міст Гайєрлай (85€):</b> замок Burg Eltz, підвісний міст та дегустація Рислінгу\n` +
              `  — <b>Гайдельберг + курорт Баден-Баден (85€):</b> замок Гайдельберга та королівські терми\n` +
              `• 🇦🇹 <b>Австрія (135€):</b>\n` +
              `  — <b>Зальцбург + Гальштат (Хальштатт):</b> альпійське озеро Гальштат, панорама Skywalk, палац Мірабель та будинок Моцарта в Зальцбурзі\n` +
              `• 🇱🇮 <b>Ліхтенштейн (3 країни за 1 день, 120€):</b>\n` +
              `  — <b>Вадуц, Брегенц та Ліндау:</b> замок Вадуц, сцена на Боденському озері в Брегенці та острів Ліндау\n` +
              `• 🇨🇭 <b>Швейцарія (120€):</b>\n` +
              `  — <b>Рейнський водоспад + Цюрих + Люцерн</b> АБО <b>Ущелина Ааре + Лаутербруннен (72 водоспади) + Берн</b>\n` +
              `• 🇮🇹 <b>Італія (2 дні, 270€):</b> <b>Озеро Комо + Мілан</b> (вілли Белладжо, катер, собор Дуомо, готель включено)\n` +
              `• 🇨🇿 <b>Чехія (120€):</b> <b>Прага</b> (Празький Град, Карлів міст, куранти Орлой)\n\n` +
              `<blockquote>🚐 <b>Авто:</b> 8-місний <b>Opel Vivaro</b> (клімат-контроль, USB, відкидні сидіння, багаж до <code>10 кг</code>)\n` +
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

            // Also send the Telegram ReplyKeyboard with request_contact=True and track it so it gets deleted automatically
            const kbPrompt: any = await tgApi('sendMessage', {
              chat_id: chatId,
              parse_mode: 'HTML',
              text: `👇 <i>Або натисніть кнопку нижче, щоб поділитися номером телефону в 1 клік:</i>`,
              reply_markup: {
                keyboard: [[{ text: '📱 Поділитися номером', request_contact: true }]],
                resize_keyboard: true,
                one_time_keyboard: true,
              },
            });
            if (kbPrompt && kbPrompt.ok && kbPrompt.result?.message_id && chatId > 0) {
              activeBotMessages[String(chatId)] = [msgId, kbPrompt.result.message_id];
              saveTargetsToDisk();
            }
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

            const trip = findTripById(tripId);
            const flag = trip ? getCountryFlag(trip.country) : '🇪🇺';
            const tripTitle = trip ? trip.shortTitle : 'Обраний тур';
            const dateStr = getLiveTripDate(tripId, trip?.departureDates);
            const price = trip ? trip.price : 120;
            const totalCost = price * selectedSeat.pax + selectedSeat.fee;
            const bookingCode = `SVOI-${Math.floor(1000 + Math.random() * 9000)}`;
            const firstName = cb.from?.first_name || 'Мандрівник';
            const username = cb.from?.username ? `@${cb.from.username}` : firstName;

            await notifyAllAdmins(
              {
                parse_mode: 'HTML',
                text:
                  `🔥 <b>НОВА БРОНЬ У 2 КЛІКИ #${bookingCode}!</b>\n\n` +
                  `🗺 <b>Напрямок:</b> ${flag} ${tripTitle} | ${dateStr}\n` +
                  `💺 <b>Обране місце:</b> <code>${selectedSeat.label}</code>\n` +
                  `💶 <b>Сума:</b> <code>${totalCost}€</code>\n` +
                  `👤 <b>Клієнт:</b> ${firstName} (${username})`,
              },
              undefined,
              chatId,
            );

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
          } else if (cbData.startsWith('adm_seats_')) {
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
          } else if (cbData.startsWith('set_seats_')) {
            const rest = cbData.replace('set_seats_', '');
            const lastIdx = rest.lastIndexOf('_');
            const tripId = rest.substring(0, lastIdx);
            const count = parseInt(rest.substring(lastIdx + 1), 10);
            liveSeatsOverride[tripId] = count;
            await sendTourCardToChat(chatId, msgId, hasPhoto, tripId, userId);
          } else if (cbData.startsWith('adm_date_')) {
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
          } else if (cbData.startsWith('adm_poster_')) {
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
            const grpStatus = currentGroupTarget
              ? `<code>${currentGroupTarget}</code> (${currentGroupTitle}) ✅`
              : `<i>ще не прив'язана (натисніть «⚙️ Прив’язати ГРУПУ» нижче)</i>`;
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `👑 <b>Адмін-панель: Розіграші, Група та Канал SVOI Travel</b>\n\n` +
                `👥 <b>Цільова ГРУПА:</b> ${grpStatus}\n` +
                `📢 <b>Цільовий КАНАЛ:</b> <code>${currentChannelTarget}</code>\n` +
                `🎁 <b>Поточний розіграш:</b> <b>${activeGiveaway.prize}</b>\n` +
                `🙋‍♂️ <b>Учасників:</b> <b>${activeGiveaway.participants.length}</b>\n` +
                (activeGiveaway.winner
                  ? `🏆 <b>Обраний переможець:</b> <b>${activeGiveaway.winner.first_name} (${activeGiveaway.winner.username})</b>\n\n`
                  : `\n`) +
                `<blockquote>💡 <b>Як це працює:</b>\n` +
                `1️⃣ Спочатку бот створює та показує картку розіграшу <b>тут у вашій адмінці</b>.\n` +
                `2️⃣ Натисніть <b>«👥 Поділитися в ГРУПІ»</b> — і бот опублікує розіграш напряму у вашій групі.\n` +
                `3️⃣ Коли всі учасники візьмуть участь, натисніть <b>«🏆 Вибрати переможця розіграшу»</b> і кнопкою <b>«👥 Поділитися переможцем у ГРУПІ»</b> опублікуйте результат розіграшу в групі напряму!</blockquote>`,
              getChannelAdminMarkup(),
            );
          } else if (cbData === 'cb_adm_gw_card') {
            chatSessions[chatId] = { mode: null };
            activeGiveaway.admin_chat_id = chatId;
            activeGiveaway.admin_msg_id = msgId;
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              getAdminGiveawayCardText(),
              getAdminGiveawayCardMarkup(),
            );
          } else if (cbData === 'cb_adm_gw_new') {
            chatSessions[chatId] = { mode: 'waiting_gw_prize' };
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `🎁 <b>Створення нового РОЗІГРАШУ в адмінці</b>\n\n` +
                `Напишіть у відповідь: <b>який приз розігрується?</b>\n` +
                `<i>Наприклад: Безкоштовне місце в турі до Парижа 🥐🗼</i>\n\n` +
                `Спочатку бот опублікує картку розіграшу <b>тут у вашій адмінці</b>, а під нею з'явиться кнопка <b>«👥 Поділитися в ГРУПІ»</b>!`,
              {
                inline_keyboard: [
                  [{ text: '👑 Відкрити вже готовий розіграш в адмінці', callback_data: 'cb_adm_gw_card' }],
                  [{ text: '🔙 Назад в адмін-меню', callback_data: 'cb_adm_channel_menu' }],
                ],
              },
            );
          } else if (cbData === 'cb_adm_gw_share_group' || cbData === 'cb_adm_gw_share_channel') {
            const isGroup = cbData === 'cb_adm_gw_share_group';
            activeGiveaway.is_active = true;
            const count = activeGiveaway.participants.length;
            const publicText = getPublicGiveawayText(activeGiveaway.prize, count);
            const publicMarkup = getPublicGiveawayMarkup(count);

            if (isGroup && !currentGroupTarget) {
              chatSessions[chatId] = { mode: null, pendingGroupAction: 'publish_giveaway' };
              await smartEditMessage(
                chatId,
                msgId,
                hasPhoto,
                `⚠️ <b>Щоб бот опублікував розіграш у вашій закритій групі напряму, оберіть її в 1 клік!</b>\n\n` +
                  `🚀 <b>Натисніть кнопку «👥 Обрати ГРУПУ зі списку Telegram (в 1 клік)» унизу екрана (на клавіатурі)</b> — і бот миттєво прив'яже вашу групу та <b>АВТОМАТИЧНО ОПУБЛІКУЄ РОЗІГРАШ</b>!\n\n` +
                  getAdminGiveawayCardText(),
                getAdminGiveawayCardMarkup(),
              );
              const kbMsg: any = await tgApi('sendMessage', {
                chat_id: chatId,
                parse_mode: 'HTML',
                text: `👇 <b>Натисніть кнопку нижче на клавіатурі, щоб обрати вашу групу зі списку Telegram в 1 клік:</b>`,
                reply_markup: {
                  keyboard: [
                    [
                      {
                        text: '👥 Обрати ГРУПУ зі списку Telegram (в 1 клік)',
                        request_chat: { request_id: 701, chat_is_channel: false },
                      },
                    ],
                  ],
                  resize_keyboard: true,
                  one_time_keyboard: true,
                },
              });
              if (kbMsg && kbMsg.ok && kbMsg.result?.message_id && chatId > 0) {
                activeBotMessages[String(chatId)] = [msgId, kbMsg.result.message_id];
                saveTargetsToDisk();
              }
              continue;
            }

            const targetId = isGroup ? currentGroupTarget : currentChannelTarget;
            const targetName = isGroup ? `ГРУПІ «${currentGroupTitle}» (${currentGroupTarget})` : `КАНАЛІ (${currentChannelTarget})`;

            const pubRes: any = await tgApi('sendMessage', {
              chat_id: targetId,
              text: publicText,
              parse_mode: 'HTML',
              reply_markup: publicMarkup,
            });

            if (pubRes.ok) {
              activeGiveaway.admin_chat_id = chatId;
              activeGiveaway.admin_msg_id = msgId;
              if (isGroup && pubRes.result) {
                activeGiveaway.group_chat_id = pubRes.result.chat.id;
                activeGiveaway.group_msg_id = pubRes.result.message_id;
              }
              await smartEditMessage(
                chatId,
                msgId,
                hasPhoto,
                `✅ <b>РОЗІГРАШ УСПІШНО ОПУБЛІКОВАНО В ${targetName}!</b> 🎉\n\n` +
                  `Учасники в групі бачать чистий пост із кнопкою <b>«🎉 Брати участь!»</b>.\n` +
                  `Коли всі бажаючі візьмуть участь, натисніть кнопку <b>«🏆 Вибрати переможця розіграшу»</b> нижче!\n\n` +
                  `────────────────────\n\n` +
                  getAdminGiveawayCardText(),
                getAdminGiveawayCardMarkup(),
              );
            } else {
              await smartEditMessage(
                chatId,
                msgId,
                hasPhoto,
                `⚠️ <b>Помилка публікації в ${targetName}:</b>\n` +
                  `<code>${pubRes.description || 'перевірте, що бот доданий у групу/канал з правом писати повідомлення'}</code>\n\n` +
                  `👉 Натисніть <b>«⚙️ Прив’язати ГРУПУ»</b>, щоб обрати групу кнопкою зі списку Telegram в 1 клік!\n\n` +
                  getAdminGiveawayCardText(),
                getAdminGiveawayCardMarkup(),
              );
            }
          } else if (cbData === 'cb_car' || cbData === 'cb_car_photo_1' || cbData === 'cb_car_photo_2' || cbData === 'cb_car_photo_3') {
            const photoMap: Record<string, { url: string; subtitle: string }> = {
              cb_car: {
                url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1000&q=85',
                subtitle: '📸 Фото 1/3: Комфортабельний 8-місний мінівен Opel Vivaro на маршрутах Європи',
              },
              cb_car_photo_1: {
                url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1000&q=85',
                subtitle: '📸 Фото 1/3: Екстер’єр мінівена Opel Vivaro для камерних груп до 8 осіб',
              },
              cb_car_photo_2: {
                url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=85',
                subtitle: '📸 Фото 2/3: Просторий салон (схема 2+3+3), відкидні сидіння та клімат-контроль',
              },
              cb_car_photo_3: {
                url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1000&q=85',
                subtitle: '📸 Фото 3/3: Панорамні вікна та містке багажне відділення (до 10 кг + ручна поклажа)',
              },
            };
            const selectedPhoto = photoMap[cbData] || photoMap.cb_car;
            const carText =
              `🚐 <b>Наш автомобіль: 8-місний Opel Vivaro</b> ✨\n` +
              `<i>${selectedPhoto.subtitle}</i>\n\n` +
              `Ми подорожуємо камерною групою до <b>8 пасажирів</b> у максимальному комфорті без натовпу великих автобусів:\n\n` +
              `• 💺 <b>Схема салону (2+3+3):</b>\n` +
              `  — <b>1-й ряд (біля водія):</b> Місце 1 (Панорамне <code>+5€</code>), Місце 2 (Вікно <code>+5€</code>)\n` +
              `  — <b>2-й ряд:</b> Місця 3, 4, 5 — зручні крісла з підлокітниками та регулюванням нахилу (<code>+5€</code>)\n` +
              `  — <b>3-й ряд:</b> Місця 6 (<code>+5€</code>), 7 (Центр — <code>0€ без доплати</code>), 8 (<code>+5€</code>)\n` +
              `  — <b>🎲 Вільна посадка:</b> без фіксації конкретного місця — <code>0€</code>\n` +
              `• ❄️ <b>Двозонний клімат-контроль та автономний обігрівач:</b> ідеальна температура влітку та взимку\n` +
              `• 🔌 <b>USB / Type-C зарядки:</b> біля кожного ряду сидінь для ваших смартфонів та камер\n` +
              `• 🧳 <b>Багажне відділення:</b> валіза або дорожня сумка до <code>10 кг</code> у багажник + невеликий рюкзак у салон\n` +
              `• 🛑 <b>Санітарні та кавові зупинки:</b> кожні 2.5–3 години + у будь-який момент за вашим проханням!`;
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              carText,
              {
                inline_keyboard: [
                  [
                    { text: '📸 Фото 1: Авто', callback_data: 'cb_car_photo_1' },
                    { text: '💺 Фото 2: Салон', callback_data: 'cb_car_photo_2' },
                    { text: '🏔 Фото 3: У дорозі', callback_data: 'cb_car_photo_3' },
                  ],
                  [
                    { text: '💺 Обрати місце та забронювати', callback_data: 'cb_book' },
                    { text: '🗺 Напрямки та дати', callback_data: 'cb_trips' },
                  ],
                  [
                    { text: '❓ Усі питання (FAQ)', callback_data: 'cb_faq' },
                    { text: '🔙 Назад в меню', callback_data: 'cb_back' },
                  ],
                ],
              },
              selectedPhoto.url,
            );
          } else if (cbData === 'cb_meeting') {
            const meetingText =
              `📍 <b>Точки збору та адресний виїзд (Door-to-Door)</b> 🚐🏠\n\n` +
              `Головна перевага клубу <b>SVOI</b> — вам не потрібно добиратися вночі на вокзал! Ми працюємо у форматі <b>«від під'їзду до під'їзду»</b>:\n\n` +
              `🟢 <b>Основний регіон адресного збору (Door-to-Door):</b>\n` +
              `• 🇩🇪 <b>Саарланд (Saarland):</b> Саарбрюккен, Фьольклінген, Саарлуї, Мерциг, Санкт-Вендель, Нойнкірхен, Гомбург\n` +
              `• 🇩🇪 <b>Трір (Trier) та околиці Мозеля</b>\n` +
              `• 🇱🇺 <b>Люксембург (Luxembourg):</b> столиця та міста вздовж маршруту\n\n` +
              `🟡 <b>Додаткова підсадка (для компаній від 4-х осіб за маршрутом):</b>\n` +
              `• Кайзерслаутерн, Мангейм, Карлсруе, Страсбург, Франкфурт (узгоджується індивідуально)\n\n` +
              `<blockquote>⏰ За день до виїзду водій створює спільний чат групи в Telegram, надсилає геолокацію авто та точний час подачі до вашого дому!</blockquote>`;
            await smartEditMessage(chatId, msgId, hasPhoto, meetingText, {
              inline_keyboard: [
                [
                  { text: '🗺 Напрямки та дати', callback_data: 'cb_trips' },
                  { text: '💺 Забронювати місце', callback_data: 'cb_book' },
                ],
                [
                  { text: '🚐 Фото авто (Opel Vivaro)', callback_data: 'cb_car' },
                  { text: '❓ Часті питання (FAQ)', callback_data: 'cb_faq' },
                ],
                [{ text: '🔙 Назад в меню', callback_data: 'cb_back' }],
              ],
            });
          } else if (cbData === 'cb_reviews') {
            const reviewsText =
              `⭐ <b>Відгуки туристів клубу SVOI Travel</b> 💬✨\n\n` +
              `Реальні враження наших мандрівників про поїздки на Opel Vivaro:\n\n` +
              `• <b>Олена К. (Саарбрюккен) — Париж:</b>\n` +
              `⭐⭐⭐⭐⭐ <i>«Забрали прямо біля дому, мінівен дуже м'який і чистий, просторий салон і панорамні вікна зробили дорогу легкою та приємною!»</i>\n\n` +
              `• <b>Михайло та Юлія (Трір) — Замок Нойшванштайн + ущелина:</b>\n` +
              `⭐⭐⭐⭐⭐ <i>«Неймовірні краєвиди з мосту Марієнбрюке та прогулянка гірською ущелиною Партнахкламм. Група всього 8 людей — дуже душевно!»</i>\n\n` +
              `• <b>Тетяна В. (Люксембург) — Озеро Комо + Мілан:</b>\n` +
              `⭐⭐⭐⭐⭐ <i>«Два дні італійського щастя! Вілли Белладжо та прогулянка на катері перевершили всі очікування.»</i>`;
            await smartEditMessage(chatId, msgId, hasPhoto, reviewsText, {
              inline_keyboard: [
                [
                  { text: '✍️ Залишити свій відгук', callback_data: 'cb_feedback' },
                  { text: '🗺 Обрати поїздку', callback_data: 'cb_trips' },
                ],
                [{ text: '🔙 Назад в меню', callback_data: 'cb_back' }],
              ],
            });
          } else if (cbData === 'cb_faq') {
            const faqText =
              `❓ <b>Часті питання про поїздки клубу SVOI (FAQ) — Оберіть розділ</b> 💡\n\n` +
              `Ми зібрали детальні відповіді на всі питання про наші поїздки. Натисніть на будь-яку плашку нижче, щоб відкрити подробиці:\n\n` +
              `• 📍 <b>Звідки виїзд (Door-to-Door):</b> забираємо за адресою по Саарланду, Тріру та Люксембургу\n` +
              `• 💳 <b>Оплата:</b> <code>0% передоплати</code> на всі одноденні тури (готель включено у 2–3 денні)\n` +
              `• 🚐 <b>Автомобіль:</b> 8-місний <b>Opel Vivaro</b> з клімат-контролем та USB (з реальними фото авто!)\n` +
              `• 💺 <b>Схема місць 1–8</b>, таймінг виїзду, багаж, поїздки з дітьми та скасування броні\n\n` +
              `👇 <b>Натисніть на потрібну тему нижче:</b>`;
            await smartEditMessage(chatId, msgId, hasPhoto, faqText, getFaqMarkup());
          } else if (cbData === 'cb_faq_pickup') {
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `📍 <b>Звідки виїзд? Адресний збір (Door-to-Door)</b> 🚐🏠\n\n` +
                `• Ми забираємо та розвозимо пасажирів <b>прямо за домашньою адресою</b> у містах <b>Саарланду (Saarbrücken, Saarlouis, Völklingen, Merzig, St. Wendel, Homburg), Тріра (Trier) та Люксембургу</b>!\n` +
                `• Для компаній <b>від 4-х осіб</b> можливий виїзд із Кайзерслаутерна, Мангейма, Карлсруе, Страсбурга або Франкфурта.\n` +
                `• За день до поїздки водій надсилає точний час прибуття до вашого під'їзду.`,
              getFaqMarkup(),
            );
          } else if (cbData === 'cb_faq_payment') {
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `💳 <b>Як проходить оплата та бронювання? (0% передоплати)</b> ✨\n\n` +
                `• <b>Одноденні поїздки (1 день):</b> бронювання <b>БЕЗ ПЕРЕДОПЛАТИ (0€)</b>! Ви оплачуєте вартість поїздки готівкою або переказом водієві безпосередньо при посадці в авто.\n` +
                `• <b>Багатоденні тури (2–3 дні):</b> у вартість туру <b>вже включено проживання в перевіреному готелі</b> (1 або 2 ночі). Передоплата вноситься лише для гарантованої броні готелю.`,
              getFaqMarkup(),
            );
          } else if (cbData === 'cb_faq_seats') {
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `💺 <b>Схема місць у салоні Opel Vivaro (1–8)</b> 🚐\n\n` +
                `Салон розрахований рівно на <b>8 пасажирів</b> (схема 2+3+3):\n` +
                `• <b>Місце 1 (1-й ряд, біля водія):</b> панорамний огляд — <code>+5€</code>\n` +
                `• <b>Місце 2 (1-й ряд, праве вікно):</b> максимум простору — <code>+5€</code>\n` +
                `• <b>Місця 3, 4, 5 (2-й ряд):</b> ліве вікно, центр, праве вікно — <code>+5€</code>\n` +
                `• <b>Місця 6, 8 (3-й ряд біля вікон):</b> — <code>+5€</code>\n` +
                `• <b>Місце 7 (3-й ряд, центр):</b> — <code>0€ (безкоштовна фіксація!)</code>\n` +
                `• <b>🎲 Вільна посадка:</b> якщо не принципово, яке саме місце зайняти — <code>0€</code>.`,
              getFaqMarkup(),
            );
          } else if (cbData === 'cb_faq_time') {
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `⏰ <b>О котрій виїзд і повернення додому?</b> 🕒\n\n` +
                `• <b>Ранковий виїзд:</b> зазвичай о <b>05:30 – 07:00 ранку</b> (залежно від дальності маршруту), щоб приїхати на локацію першими без черг.\n` +
                `• <b>Час на локації:</b> від 6 до 9 годин чистого часу на прогулянки, фото та відпочинок.\n` +
                `• <b>Повернення додому:</b> орієнтовно о <b>21:00 – 23:30</b> прямо до вашого під'їзду.`,
              getFaqMarkup(),
            );
          } else if (cbData === 'cb_faq_walking') {
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `🚶‍♂️ <b>Скільки ходити пішки? Чи підходить літнім людям?</b> 🌿\n\n` +
                `• Ми під'їжджаємо на 8-місному мінівені максимально близько до центральних локацій та оглядових майданчиків (куди великим автобусам в'їзд заборонено!).\n` +
                `• Ви самі обираєте комфортний темп: можна гуляти разом з організатором або відпочивати у затишних кафе.`,
              getFaqMarkup(),
            );
          } else if (cbData === 'cb_terms') {
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `🎟 <b>Що входить у вартість туру?</b> 📋\n\n` +
                `✅ <b>У вартість включено:</b>\n` +
                `• Проїзд у комфортабельному 8-місному мінівені <b>Opel Vivaro</b> в обидві сторони\n` +
                `• Адресний збір та розвезення по дому (Саарланд, Трір, Люксембург)\n` +
                `• Супровід організатора за маршрутом, фото-локації та рекомендації\n` +
                `• Платні дороги, тунелі та парковки\n` +
                `• У 2–3 денних турах — <b>проживання в готелі</b>!\n\n` +
                `➕ <b>Оплачується окремо (за бажанням):</b> особисте харчування та вхідні квитки в музеї/парки/кораблики.`,
              getFaqMarkup(),
            );
          } else if (cbData === 'cb_faq_luggage') {
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `🧳 <b>Багаж, документи та що взяти в дорогу?</b> 🛂\n\n` +
                `• <b>Документи:</b> закордонний паспорт або ID-картка / Aufenthaltstitel + медичне страхування.\n` +
                `• <b>Норма багажу:</b> 1 місце багажу до <code>10 кг</code> у багажне відділення + невеликий рюкзак у салон.\n` +
                `• <b>У дорогу:</b> зручне взуття, павербанк (у салоні також є USB-зарядки).`,
              getFaqMarkup(),
            );
          } else if (cbData === 'cb_faq_choose') {
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `🤔 <b>Як обрати свій ідеальний тур?</b> 🧭\n\n` +
                `• <b>Найближчі та легкі виїзди (1.5–2 год у дорозі):</b> Ельзас + Страсбург (80€), Долина Мозеля: Замок Ельц + Кохем (85€), Гайдельберг + Баден-Баден (85€).\n` +
                `• <b>Для всієї родини та емоцій:</b> Європа-Парк (95€), Леголенд (110€), Заандам + Море + Амстердам (120€).\n` +
                `• <b>Гірські панорами та замки:</b> Замок Нойшванштайн + ущелина (120€), Зальцбург + Гальштат (135€), Швейцарія (120€), Ліхтенштейн — 3 країни (120€).\n` +
                `• <b>Вікенд на 2–3 дні з готелем:</b> Берлін + Дрезден (190€), Мон-Сен-Мішель (270€), Озеро Комо + Мілан (270€), Лазурове узбережжя (440€).`,
              getFaqMarkup(),
            );
          } else if (cbData === 'cb_faq_children') {
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `👶 <b>Поїздки з дітьми та зупинки в дорозі</b> 🧸\n\n` +
                `• Ми радо подорожуємо з родинами! За попереднім запитом надаємо <b>дитяче автокрісло або бустер безкоштовно</b>.\n` +
                `• Оскільки в нашому Opel Vivaro лише 8 пасажирів, водій робить санітарну зупинку на перше ж прохання.`,
              getFaqMarkup(),
            );
          } else if (cbData === 'cb_faq_cancel') {
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `🔄 <b>Перенесення або скасування броні</b> 🤝\n\n` +
                `• Якщо ваші плани змінилися, будь ласка, попередьте нас не пізніше ніж за <b>48 годин до виїзду</b>, щоб ми могли запропонувати місце пасажирам із листа очікування.\n` +
                `• Ви завжди можете безкоштовно перенести бронь на іншу дату або інший напрямок!`,
              getFaqMarkup(),
            );
          } else if (cbData === 'cb_feedback') {
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `✍️ <b>Залишити відгук про поїздку з клубом SVOI</b> ⭐\n\n` +
                `Ми цінуємо кожне ваше враження та фото з подорожей! Натисніть кнопку нижче, щоб надіслати свій відгук організатору або поділитися враженнями в нашій групі:`,
              {
                inline_keyboard: [
                  [{ text: '💬 Надіслати відгук організатору (@SVOI_travel_admin)', url: 'https://t.me/SVOI_travel_admin' }],
                  [
                    { text: '⭐ Читати відгуки туристів', callback_data: 'cb_reviews' },
                    { text: '❓ Назад до FAQ', callback_data: 'cb_faq' },
                  ],
                  [{ text: '🔙 Назад в меню', callback_data: 'cb_back' }],
                ],
              },
            );
          } else if (cbData === 'cb_partner') {
            const partnerText =
              `🤝 <b>Партнерська програма & Співпраця з клубом SVOI</b> 💼\n\n` +
              `• 👥 <b>Приведи друзів:</b> зберіть компанію від 4 осіб та отримайте бонусну знижку на поїздку!\n` +
              `• 🚐 <b>Індивідуальний чартер (5–8 осіб):</b> оренда всього мінівена Opel Vivaro з водієм під вашу компанію в будь-яку дату.\n` +
              `• 📸 <b>Для блогерів та авторів:</b> спільні творчі виїзди за яскраві рілси та огляди.\n\n` +
              `📩 Зв'язок напряму з організатором: @SVOI_travel_admin`;
            await smartEditMessage(chatId, msgId, hasPhoto, partnerText, {
              inline_keyboard: [
                [{ text: '💬 Написати організатору', url: 'https://t.me/SVOI_travel_admin' }],
                [{ text: '❓ Назад до FAQ', callback_data: 'cb_faq' }],
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
            const trip = findTripById(tripId);
            const firstName = cb.from?.first_name || 'Мандрівник';
            const username = cb.from?.username ? `@${cb.from.username}` : firstName;
            await notifyAllAdmins(
              {
                parse_mode: 'HTML',
                text:
                  `📋 <b>Новий запис у Лист очікування!</b>\n` +
                  `🗺 <b>Тур:</b> ${trip?.shortTitle || tripId}\n` +
                  `👤 <b>Клієнт:</b> ${firstName} (${username})`,
              },
              undefined,
              chatId,
            );
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
              inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'cb_back' }]],
            });
          } else if (cbData === 'cb_adm_gw_pick') {
            const pool =
              activeGiveaway.participants.length > 0 ? activeGiveaway.participants : DEFAULT_DEMO_PARTICIPANTS;
            const winner = pool[Math.floor(Math.random() * pool.length)];
            activeGiveaway.winner = winner;
            activeGiveaway.is_active = false;

            const previewCard =
              `👑 <b>ПЕРЕМОЖЦЯ РОЗІГРАШУ ОБРАНО!</b> 🏆🎉\n\n` +
              `🎁 <b>Приз:</b> ${activeGiveaway.prize}\n` +
              `👥 <b>Усього брало участь:</b> ${pool.length} учасників\n\n` +
              `✨ <b>Переможцем стає:</b>\n` +
              `🥳 <b>${winner.first_name} (${winner.username})</b>! 🎉🎉🎉\n\n` +
              `<blockquote>👇 Натисніть кнопку <b>«👥 Опублікувати результат розіграшу в ГРУПІ напряму»</b> нижче, щоб бот миттєво опублікував офіційний пост із переможцем прямо у вашій групі!</blockquote>`;

            await smartEditMessage(chatId, msgId, hasPhoto, previewCard, {
              inline_keyboard: [
                [
                  {
                    text: '👥 Опублікувати результат розіграшу в ГРУПІ напряму',
                    callback_data: 'cb_adm_pub_winner_group',
                  },
                ],
                [
                  {
                    text: '📢 Опублікувати результат розіграшу в КАНАЛІ',
                    callback_data: 'cb_adm_pub_winner_channel',
                  },
                ],
                [
                  {
                    text: '🔥 Опублікувати І В ГРУПІ, І В КАНАЛІ',
                    callback_data: 'cb_adm_pub_winner_both',
                  },
                ],
                [{ text: '🔄 Переобрати іншого переможця', callback_data: 'cb_adm_gw_pick' }],
                [{ text: '🔙 До картки розіграшу', callback_data: 'cb_adm_gw_card' }],
                [{ text: '🔙 Назад в головне меню', callback_data: 'cb_back' }],
              ],
            });
          } else if (
            cbData === 'cb_adm_pub_winner_group' ||
            cbData === 'cb_adm_pub_winner_channel' ||
            cbData === 'cb_adm_pub_winner_both'
          ) {
            const pool =
              activeGiveaway.participants.length > 0 ? activeGiveaway.participants : DEFAULT_DEMO_PARTICIPANTS;
            const winner = activeGiveaway.winner || pool[Math.floor(Math.random() * pool.length)];
            activeGiveaway.winner = winner;

            if (cbData === 'cb_adm_pub_winner_group' && !currentGroupTarget) {
              chatSessions[chatId] = { mode: null, pendingGroupAction: 'publish_winner' };
              await smartEditMessage(
                chatId,
                msgId,
                hasPhoto,
                `⚠️ <b>Щоб бот опублікував РЕЗУЛЬТАТ РОЗІГРАШУ у вашій закритій групі напряму, оберіть її в 1 клік!</b>\n\n` +
                  `🚀 <b>Натисніть кнопку «👥 Обрати ГРУПУ зі списку Telegram (в 1 клік)» унизу екрана (на клавіатурі)</b> — і бот миттєво прив'яже вашу групу та <b>АВТОМАТИЧНО ОПУБЛІКУЄ ПЕРЕМОЖЦЯ ${winner.first_name} (${winner.username})</b>!\n\n` +
                  getAdminGiveawayCardText(),
                getAdminGiveawayCardMarkup(),
              );
              const kbMsg: any = await tgApi('sendMessage', {
                chat_id: chatId,
                parse_mode: 'HTML',
                text: `👇 <b>Натисніть кнопку нижче на клавіатурі, щоб обрати групу та опублікувати результат розіграшу в 1 клік:</b>`,
                reply_markup: {
                  keyboard: [
                    [
                      {
                        text: '👥 Обрати ГРУПУ зі списку Telegram (в 1 клік)',
                        request_chat: { request_id: 701, chat_is_channel: false },
                      },
                    ],
                  ],
                  resize_keyboard: true,
                  one_time_keyboard: true,
                },
              });
              if (kbMsg && kbMsg.ok && kbMsg.result?.message_id && chatId > 0) {
                activeBotMessages[String(chatId)] = [msgId, kbMsg.result.message_id];
                saveTargetsToDisk();
              }
              continue;
            }

            const winText =
              `🎊🏆 <b>УВАГА! ОФІЦІЙНІ ПІДСУМКИ РОЗІГРАШУ SVOI TRAVEL!</b> 🏆🎊\n\n` +
              `🎁 <b>Приз:</b> ${activeGiveaway.prize}\n` +
              `👥 <b>Усього брало участь:</b> ${pool.length} учасників\n\n` +
              `✨ <b>Генератор випадкових чисел обрав переможця:</b>\n` +
              `🥳 <b>ПЕРЕМОЖЕЦЬ: ${winner.first_name} (${winner.username})!</b> 🎉🎉🎉\n\n` +
              `Щиро вітаємо з перемогою! Напишіть організатору @SVOI_travel_admin для отримання сертифіката! 🚐✨`;

            const winMarkup = {
              inline_keyboard: [
                [{ text: '💬 Написати організатору (@SVOI_travel_admin)', url: 'https://t.me/SVOI_travel_admin' }],
                [{ text: '🗺 Напрямки та дати поїздок', url: 'https://t.me/Svoi_TravelEU_bot?start=trips' }],
              ],
            };

            const resultsLog: string[] = [];

            if (cbData === 'cb_adm_pub_winner_group' || cbData === 'cb_adm_pub_winner_both') {
              if (currentGroupTarget) {
                const gRes: any = await tgApi('sendMessage', {
                  chat_id: currentGroupTarget,
                  text: winText,
                  parse_mode: 'HTML',
                  reply_markup: winMarkup,
                });
                resultsLog.push(
                  gRes.ok
                    ? `✅ Результат опубліковано в <b>ГРУПІ «${currentGroupTitle}»</b> (<code>${currentGroupTarget}</code>)`
                    : `⚠️ Помилка публікації в групу <code>${currentGroupTarget}</code>: ${gRes.description || 'перевірте права бота'}`,
                );
              } else {
                resultsLog.push(`⚠️ Група ще не прив'язана числовим ID`);
              }
            }

            if (cbData === 'cb_adm_pub_winner_channel' || cbData === 'cb_adm_pub_winner_both') {
              const cRes: any = await tgApi('sendMessage', {
                chat_id: currentChannelTarget,
                text: winText,
                parse_mode: 'HTML',
                reply_markup: winMarkup,
              });
              resultsLog.push(
                cRes.ok
                  ? `✅ Результат опубліковано в <b>КАНАЛІ</b> (<code>${currentChannelTarget}</code>)`
                  : `⚠️ Помилка публікації в канал <code>${currentChannelTarget}</code>: ${cRes.description || 'перевірте права бота'}`,
              );
            }

            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `🏆 <b>Звіт про публікацію результату розіграшу — ${winner.first_name} (${winner.username}):</b>\n\n` +
                resultsLog.join('\n\n') +
                `\n\n👇 <i>Копія опублікованого поста переможця:</i>\n\n` +
                winText,
              getAdminGiveawayCardMarkup(),
            );
          } else if (cbData === 'cb_adm_send_quiz') {
            const targetQuizChat = currentGroupTarget || currentChannelTarget;
            const pollRes: any = await tgApi('sendPoll', {
              chat_id: targetQuizChat,
              question: 'У якому місті ми відвідуємо музеї Mercedes-Benz і Porsche в окремому одноденному турі SVOI?',
              options: ['Мюнхен', 'Штутгарт 🏎', 'Франкфурт', 'Берлін'],
              type: 'quiz',
              correct_option_id: 1,
              explanation: 'У Штутгарті знаходяться штаб-квартири та легендарні музеї Mercedes-Benz і Porsche!',
              is_anonymous: true,
            });
            const statusMsg = pollRes.ok
              ? `✅ <b>Інтерактивний Telegram Quiz успішно опубліковано в <code>${targetQuizChat}</code>!</b> 🧠🎉`
              : `⚠️ Не вдалося опублікувати квіз у <code>${targetQuizChat}</code>: <code>${pollRes.description || 'перевірте права бота'}</code>`;
            await smartEditMessage(chatId, msgId, hasPhoto, statusMsg, getChannelAdminMarkup());
          } else if (cbData === 'cb_adm_set_group') {
            chatSessions[chatId] = { mode: 'waiting_group_id', pendingGroupAction: 'publish_giveaway' };
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `⚙️ <b>Прив'язка закритої ГРУПИ для публікації розіграшів та результатів</b>\n\n` +
                `Поточна група: <code>${currentGroupTarget || 'ще не прив’язана'}</code>\n\n` +
                `👉 <b>Найпростіший спосіб (в 1 клік):</b>\n` +
                `Натисніть велику кнопку <b>«👥 Обрати ГРУПУ зі списку Telegram (в 1 клік)»</b> унизу екрана (на клавіатурі) і виберіть вашу групу! Бот сам автоматично отримає її числовий ID <code>-100...</code> та опублікує розіграш!`,
              {
                inline_keyboard: [[{ text: '🔙 Назад до розіграшу', callback_data: 'cb_adm_gw_card' }]],
              },
            );
            const kbMsg: any = await tgApi('sendMessage', {
              chat_id: chatId,
              parse_mode: 'HTML',
              text: `👇 <b>Натисніть кнопку нижче на клавіатурі, щоб обрати групу в 1 клік:</b>`,
              reply_markup: {
                keyboard: [
                  [
                    {
                      text: '👥 Обрати ГРУПУ зі списку Telegram (в 1 клік)',
                      request_chat: { request_id: 701, chat_is_channel: false },
                    },
                  ],
                ],
                resize_keyboard: true,
                one_time_keyboard: true,
              },
            });
            if (kbMsg && kbMsg.ok && kbMsg.result?.message_id && chatId > 0) {
              activeBotMessages[String(chatId)] = [msgId, kbMsg.result.message_id];
              saveTargetsToDisk();
            }
          } else if (cbData === 'cb_adm_set_channel') {
            chatSessions[chatId] = { mode: 'waiting_channel_id' };
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `⚙️ <b>Прив'язка закритого каналу для публікації розіграшів</b>\n\n` +
                `Поточний ID: <code>${currentChannelTarget}</code>\n\n` +
                `👉 <b>Найпростіший спосіб (в 1 клік):</b> натисніть кнопку <b>«📢 Обрати КАНАЛ зі списку Telegram (в 1 клік)»</b> унизу екрана або <b>перешліть (Forward) сюди будь-який пост зі свого каналу</b>!`,
              {
                inline_keyboard: [[{ text: '🔙 Назад до розіграшу', callback_data: 'cb_adm_gw_card' }]],
              },
            );
            const kbMsg: any = await tgApi('sendMessage', {
              chat_id: chatId,
              parse_mode: 'HTML',
              text: `👇 <b>Натисніть кнопку нижче на клавіатурі, щоб обрати канал в 1 клік:</b>`,
              reply_markup: {
                keyboard: [
                  [
                    {
                      text: '📢 Обрати КАНАЛ зі списку Telegram (в 1 клік)',
                      request_chat: { request_id: 702, chat_is_channel: true },
                    },
                  ],
                ],
                resize_keyboard: true,
                one_time_keyboard: true,
              },
            });
            if (kbMsg && kbMsg.ok && kbMsg.result?.message_id && chatId > 0) {
              activeBotMessages[String(chatId)] = [msgId, kbMsg.result.message_id];
              saveTargetsToDisk();
            }
          } else if (cbData === 'cb_games') {
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `🎮 <b>Ігровий клуб, Вікторини та Опитування SVOI Travel</b> 🏆\n\n` +
                `Оберіть вікторину або інтерактивну гру нижче! У кожній вікторині є <b>декілька питань із варіантами відповідей (плашками)</b> та промокодами на бонуси:`,
              getGamesMarkup(),
            );
          } else if (cbData === 'cb_game_geo' || cbData.startsWith('cb_geo_q_') || cbData.startsWith('cb_geo_ans_')) {
            const GEO_QUESTIONS = [
              {
                photo: 'https://images.unsplash.com/photo-1584003564911-a7a321c84e1c?auto=format&fit=crop&w=1000&q=80',
                q: 'У якому голландському селі старій частини взагалі немає автомобільних доріг, а пошту доставляють човнами по каналах?',
                options: ['Гітхорн (Giethoorn)', 'Заандам (Zaandam)', 'Роттердам', 'Утрехт'],
                correct: 0,
                explain: 'Це казковий <b>Гітхорн («Голландська Венеція»)</b>! Ми їдемо туди в окремому авторському турі «Гітхорн + Амстердам» (120€).',
                tripId: 'amsterdam',
              },
              {
                photo: 'https://images.unsplash.com/photo-1599946347371-68eb71b16afc?auto=format&fit=crop&w=1000&q=80',
                q: 'Який середньовічний замок у долині Мозеля ніколи не був зруйнований і зображувався на банкноті 500 німецьких марок?',
                options: ['Замок Гогенцоллерн', 'Замок Ельц (Burg Eltz)', 'Замок Гайдельберг', 'Замок Ліхтенштейн'],
                correct: 1,
                explain: 'Це легендарний <b>Замок Ельц (Burg Eltz)</b>! Лише ~1.5 год від Саарланду та Люксембургу в турі «Замок Ельц + Кохем + міст Гайєрлай» (85€).',
                tripId: 'eltz_cochem_mosel',
              },
              {
                photo: 'https://images.unsplash.com/photo-1509869175650-a1d97972541a?auto=format&fit=crop&w=1000&q=80',
                q: 'Біля якого альпійського замку короля Людвіга II ми проходимо крізь мальовничу гірську ущелину Партнахкламм з водоспадами?',
                options: ['Замок Шверін', 'Замок Нойшванштайн', 'Замок Вадуц', 'Замок Гравенстен'],
                correct: 1,
                explain: 'Це <b>Замок Нойшванштайн + ущелина Партнахкламм</b> (120€) у Баварських Альпах!',
                tripId: 'neuschwanstein',
              },
              {
                photo: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1000&q=80',
                q: 'У якому місті Німеччини знаходяться одночасно штаб-квартири та легендарні музеї автогігантів Mercedes-Benz і Porsche?',
                options: ['Мюнхен', 'Штутгарт', 'Франкфурт', 'Кельн'],
                correct: 1,
                explain: 'У <b>Штутгарті</b>! Окрема одноденна поїздка «Штутгарт: Музеї Mercedes-Benz і Porsche» коштує лише 90€.',
                tripId: 'stuttgart_tour',
              },
              {
                photo: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=1000&q=80',
                q: 'Яке високогірне альпійське озеро та оглядовий майданчик Skywalk ми відвідуємо в нашому турі до Австрії разом із Зальцбургом?',
                options: ['Гальштат (Хальштатт)', 'Озеро Гарда', 'Женевське озеро', 'Озеро Блед'],
                correct: 0,
                explain: 'Це всесвітньо відомий <b>Гальштат (Hallstatt)</b>! Наш тур «Зальцбург + Гальштат» — 135€.',
                tripId: 'salzburg_hallstatt',
              },
              {
                photo: 'https://images.unsplash.com/photo-1559113202-c916b8e44373?auto=format&fit=crop&w=1000&q=80',
                q: 'У якому бельгійському місті височіє суворий середньовічний замок графів Фландрії Гравенстен просто посеред каналів?',
                options: ['Гент', 'Льєж', 'Намюр', 'Остенде'],
                correct: 0,
                explain: 'Це <b>Гент</b>! Відвідуємо його в нашому золотому турі «Брюгге + Гент + Брюссель» (120€).',
                tripId: 'bruges_ghent_brussels',
              },
            ];

            if (cbData.startsWith('cb_geo_ans_')) {
              const parts = cbData.replace('cb_geo_ans_', '').split('_');
              const qIdx = parseInt(parts[0], 10) || 0;
              const optIdx = parseInt(parts[1], 10) || 0;
              const item = GEO_QUESTIONS[qIdx % GEO_QUESTIONS.length];
              const isCorrect = optIdx === item.correct;
              const nextIdx = (qIdx + 1) % GEO_QUESTIONS.length;

              const ansText =
                `🕵️ <b>ГЕО-ДЕТЕКТИВ SVOI (Питання ${qIdx + 1} з ${GEO_QUESTIONS.length})</b>\n\n` +
                (isCorrect
                  ? `✅ <b>ПРАВИЛЬНО! Чудова інтуїція!</b> 🎉\n` +
                    `Ваша відповідь: <b>${item.options[optIdx]}</b>\n\n`
                  : `❌ <b>Майже! Ви обрали:</b> ${item.options[optIdx]}\n` +
                    `👉 Правильна відповідь: <b>${item.options[item.correct]}</b>\n\n`) +
                `💡 ${item.explain}\n` +
                `🎁 <b>Бонус мандрівника:</b> промокод <code>GEO-SVOI5</code> дає безкоштовний вибір місця (+5€ → 0€)!`;

              await smartEditMessage(
                chatId,
                msgId,
                hasPhoto,
                ansText,
                {
                  inline_keyboard: [
                    [{ text: `➡️ Наступне питання (${nextIdx + 1}/${GEO_QUESTIONS.length})`, callback_data: `cb_geo_q_${nextIdx}` }],
                    [{ text: '🗺 Відкрити програму цього туру', callback_data: `trip_${item.tripId}` }],
                    [{ text: '🎮 До списку всіх ігор', callback_data: 'cb_games' }],
                    [{ text: '🔙 Назад в головне меню', callback_data: 'cb_back' }],
                  ],
                },
                item.photo,
              );
            } else {
              const qIdx = cbData.startsWith('cb_geo_q_') ? parseInt(cbData.replace('cb_geo_q_', ''), 10) || 0 : 0;
              const item = GEO_QUESTIONS[qIdx % GEO_QUESTIONS.length];
              const nextIdx = (qIdx + 1) % GEO_QUESTIONS.length;
              const qText =
                `🕵️ <b>ГЕО-ДЕТЕКТИВ SVOI (Питання ${qIdx + 1} з ${GEO_QUESTIONS.length})</b> 🌍\n\n` +
                `❓ <b>${item.q}</b>\n\n` +
                `👇 <i>Натисніть на правильний варіант відповіді нижче:</i>`;

              const optionRows = item.options.map((opt, idx) => [
                { text: `🔹 ${opt}`, callback_data: `cb_geo_ans_${qIdx}_${idx}` },
              ]);
              optionRows.push([
                { text: `🔄 Інше питання (${nextIdx + 1}/${GEO_QUESTIONS.length})`, callback_data: `cb_geo_q_${nextIdx}` },
                { text: '🎮 До всіх ігор', callback_data: 'cb_games' },
              ]);

              await smartEditMessage(chatId, msgId, hasPhoto, qText, { inline_keyboard: optionRows }, item.photo);
            }
          } else if (cbData === 'cb_game_quiz' || cbData.startsWith('cb_tf_q_') || cbData.startsWith('cb_tf_ans_')) {
            const TF_QUESTIONS = [
              {
                q: 'Чи правда, що Гітхорн + Амстердам та Заандам + Море + Амстердам у клубі SVOI — це дві різні окремі авторські поїздки до Голландії?',
                isTrue: true,
                explain: 'ПРАВДА! Ми спеціально розділили Голландію на 2 окремі поїздки (по 120€), щоб ви насолодилися кожною локацією без поспіху!',
              },
              {
                q: 'Чи правда, що в одноденних поїздках SVOI потрібно платити 100% передоплати за місяць до виїзду?',
                isTrue: false,
                explain: 'НЕПРАВДА! Усі одноденні поїздки SVOI бронюються з <b>0% передоплати (0€)</b> — оплата відбувається при посадці в авто!',
              },
              {
                q: 'Чи правда, що Бельгія в нашому клубі представлена трьома окремими турами: «Брюссель» (90€), «Антверпен + Брюгге» (110€) та «Брюгге + Гент + Брюссель» (120€)?',
                isTrue: true,
                explain: 'ПРАВДА! Ви можете обрати саме той маршрут Бельгією, який вам найбільше до душі.',
              },
              {
                q: 'Чи правда, що в турі до Ліхтенштейну ми за 1 вихідний день відвідуємо одразу 3 держави: Ліхтенштейн (Вадуц), Австрію (Брегенц) та Німеччину (Ліндау)?',
                isTrue: true,
                explain: 'ПРАВДА! Три країни навколо альпійського Боденського озера за один день (120€)!',
              },
              {
                q: 'Чи правда, що ми їздимо великими 50-місними двоповерховими автобусами з чергами на кордонах?',
                isTrue: false,
                explain: 'НЕПРАВДА! Ми подорожуємо виключно камерними групами до <b>8 пасажирів</b> у комфортабельному мінівені <b>Opel Vivaro</b> з адресним збором Door-to-Door!',
              },
              {
                q: 'Чи правда, що з Саарланду та Люксембургу до найкращого парку розваг Європи — Europa-Park (Руст) — їхати лише близько 2 годин?',
                isTrue: true,
                explain: 'ПРАВДА! Саме тому поїздка в Європа-Парк (95€) проходить легко і дарує цілий день на атракціонах!',
              },
            ];

            if (cbData.startsWith('cb_tf_ans_')) {
              const parts = cbData.replace('cb_tf_ans_', '').split('_');
              const qIdx = parseInt(parts[0], 10) || 0;
              const userSaidTrue = parts[1] === '1';
              const item = TF_QUESTIONS[qIdx % TF_QUESTIONS.length];
              const isCorrect = userSaidTrue === item.isTrue;
              const nextIdx = (qIdx + 1) % TF_QUESTIONS.length;

              const ansText =
                `🧠 <b>ПРАВДА ЧИ НЕПРАВДА (Питання ${qIdx + 1} з ${TF_QUESTIONS.length})</b>\n\n` +
                (isCorrect ? `✅ <b>БРАВО! Ви відповіли абсолютно вірно!</b> 🎉\n\n` : `❌ <b>Ой, цього разу не вгадали!</b> 😉\n\n`) +
                `📌 <b>Твердження:</b> <i>${item.q}</i>\n\n` +
                `💡 <b>Пояснення:</b> ${item.explain}`;

              await smartEditMessage(chatId, msgId, hasPhoto, ansText, {
                inline_keyboard: [
                  [{ text: `➡️ Наступне питання (${nextIdx + 1}/${TF_QUESTIONS.length})`, callback_data: `cb_tf_q_${nextIdx}` }],
                  [{ text: '🗺 Переглянути всі напрямки', callback_data: 'cb_trips' }],
                  [{ text: '🎮 До списку всіх ігор', callback_data: 'cb_games' }],
                  [{ text: '🔙 Назад в головне меню', callback_data: 'cb_back' }],
                ],
              });
            } else {
              const qIdx = cbData.startsWith('cb_tf_q_') ? parseInt(cbData.replace('cb_tf_q_', ''), 10) || 0 : 0;
              const item = TF_QUESTIONS[qIdx % TF_QUESTIONS.length];
              const nextIdx = (qIdx + 1) % TF_QUESTIONS.length;
              const qText =
                `🧠 <b>ВІКТОРИНА «ПРАВДА ЧИ НЕПРАВДА» (Питання ${qIdx + 1} з ${TF_QUESTIONS.length})</b> ✨\n\n` +
                `❓ <b>${item.q}</b>\n\n` +
                `👇 <i>Оберіть вашу відповідь на плашках нижче:</i>`;

              await smartEditMessage(chatId, msgId, hasPhoto, qText, {
                inline_keyboard: [
                  [
                    { text: '👍 ПРАВДА', callback_data: `cb_tf_ans_${qIdx}_1` },
                    { text: '👎 НЕПРАВДА', callback_data: `cb_tf_ans_${qIdx}_0` },
                  ],
                  [
                    { text: `🔄 Інше питання (${nextIdx + 1}/${TF_QUESTIONS.length})`, callback_data: `cb_tf_q_${nextIdx}` },
                    { text: '🎮 До всіх ігор', callback_data: 'cb_games' },
                  ],
                ],
              });
            }
          } else if (cbData === 'cb_game_gastro' || cbData.startsWith('cb_gastro_q_') || cbData.startsWith('cb_gastro_ans_')) {
            const GASTRO_QUESTIONS = [
              {
                q: 'Яку традиційну страву на тонкому тісті з вершками, цибулею та беконом з дров’яної печі ми куштуємо в турі в Ельзас і Страсбург (80€)?',
                options: ['🍕 Тарт Фламбе (Flammkuchen)', '🥘 Паелья з морепродуктами', '🥟 Вареники з вишнею'],
                correct: 0,
                explain: '<b>Тарт Фламбе (Flammkuchen)</b> — головний гастрономічний символ Ельзасу та Страсбурга!',
              },
              {
                q: 'Яке знамените біле вино з крутих схилів річки Мозель ми дегустуємо в містечку Кохем після замку Ельц (85€)?',
                options: ['🍷 Мозельський Рислінг (Riesling)', '🍺 Баварське темне пиво', '🥂 Шампанське з Реймса'],
                correct: 0,
                explain: 'Долина Мозеля та містечко Кохем славляться на весь світ своїм <b>Рислінгом</b>!',
              },
              {
                q: 'Який десерт обов’язково треба скуштувати гарячим просто на золотій площі Гран-Плас у нашому турі до Брюсселя (90€)?',
                options: ['🧇 Бельгійські вафлі з шоколадом і полуницею', '🥨 Мюнхенський брецель', '🍰 Віденський захер'],
                correct: 0,
                explain: 'Справжні <b>бельгійські вафлі</b> та праліне ручної роботи — візитівка Брюсселя, Брюгге та Гента!',
              },
              {
                q: 'Де під час нашого 2-денного туру до Мон-Сен-Мішель та Сен-Мало (270€) ми куштуємо найсвіжіші океанські устриці просто біля ферм?',
                options: ['🦪 У містечку Канкаль (Cancale)', '🧀 У сироварнях Заансе-Сханс', '🍕 У Мілані біля Дуомо'],
                correct: 0,
                explain: '<b>Канкаль (Cancale)</b> називають устричною столицею Бретані та всієї Франції!',
              },
              {
                q: 'Які знамениті цукерки з марципаном, фісташкою та нугою є головним солодким сувеніром нашого туру в Зальцбург + Гальштат (135€)?',
                options: ['🍬 Моцарткугель (Mozartkugel)', '🍫 Швейцарський Toblerone', '🥐 Паризький круасан'],
                correct: 0,
                explain: '<b>Оригінальні цукерки Mozartkugel</b> винайшли саме в Зальцбурзі — місті народження Моцарта!',
              },
            ];

            if (cbData.startsWith('cb_gastro_ans_')) {
              const parts = cbData.replace('cb_gastro_ans_', '').split('_');
              const qIdx = parseInt(parts[0], 10) || 0;
              const optIdx = parseInt(parts[1], 10) || 0;
              const item = GASTRO_QUESTIONS[qIdx % GASTRO_QUESTIONS.length];
              const isCorrect = optIdx === item.correct;
              const nextIdx = (qIdx + 1) % GASTRO_QUESTIONS.length;

              const ansText =
                `🍽 <b>ГАСТРО-КВІЗ «СМАКИ ЄВРОПИ» (Питання ${qIdx + 1} з ${GASTRO_QUESTIONS.length})</b>\n\n` +
                (isCorrect
                  ? `✅ <b>СМАЧНО І ТОЧНО! Ви справжній гурман!</b> 👨‍🍳🎉\n\n`
                  : `❌ <b>Майже! Правильна відповідь:</b> ${item.options[item.correct]}\n\n`) +
                `💡 ${item.explain}`;

              await smartEditMessage(chatId, msgId, hasPhoto, ansText, {
                inline_keyboard: [
                  [{ text: `➡️ Наступне гастро-питання (${nextIdx + 1}/${GASTRO_QUESTIONS.length})`, callback_data: `cb_gastro_q_${nextIdx}` }],
                  [{ text: '🗺 Напрямки та дати поїздок', callback_data: 'cb_trips' }],
                  [{ text: '🎮 До списку всіх ігор', callback_data: 'cb_games' }],
                  [{ text: '🔙 Назад в головне меню', callback_data: 'cb_back' }],
                ],
              });
            } else {
              const qIdx = cbData.startsWith('cb_gastro_q_') ? parseInt(cbData.replace('cb_gastro_q_', ''), 10) || 0 : 0;
              const item = GASTRO_QUESTIONS[qIdx % GASTRO_QUESTIONS.length];
              const nextIdx = (qIdx + 1) % GASTRO_QUESTIONS.length;
              const qText =
                `🍽 <b>ГАСТРО-КВІЗ «СМАКИ ЄВРОПИ» (Питання ${qIdx + 1} з ${GASTRO_QUESTIONS.length})</b> 🥐🍷\n\n` +
                `❓ <b>${item.q}</b>\n\n` +
                `👇 <i>Оберіть правильну страву або напій нижче:</i>`;

              const optionRows = item.options.map((opt, idx) => [
                { text: opt, callback_data: `cb_gastro_ans_${qIdx}_${idx}` },
              ]);
              optionRows.push([
                { text: `🔄 Інше питання (${nextIdx + 1}/${GASTRO_QUESTIONS.length})`, callback_data: `cb_gastro_q_${nextIdx}` },
                { text: '🎮 До всіх ігор', callback_data: 'cb_games' },
              ]);

              await smartEditMessage(chatId, msgId, hasPhoto, qText, { inline_keyboard: optionRows });
            }
          } else if (cbData === 'cb_game_price' || cbData.startsWith('cb_price_q_') || cbData.startsWith('cb_price_ans_')) {
            const PRICE_QUESTIONS = [
              {
                q: 'Яка вартість нашої найближчої одноденної поїздки «Ельзас + Страсбург + Кольмар» з адресним збором Door-to-Door?',
                options: ['💶 80€ (0% передоплати)', '💶 130€', '💶 175€'],
                correct: 0,
                explain: 'Вартість поїздки <b>Ельзас + Страсбург + Кольмар</b> становить лише <b>80€</b> без передоплати!',
              },
              {
                q: 'Скільки коштує окремий тур «Замок Ельц + Кохем + підвісний міст Гайєрлай» або «Гайдельберг + Баден-Баден»?',
                options: ['💶 85€', '💶 140€', '💶 190€'],
                correct: 0,
                explain: 'Обидва ці мальовничі маршрути вихідного дня коштують лише <b>85€</b> (лише ~1.5 год у дорозі)!',
              },
              {
                q: 'Яка ціна 2-денного туру «Берлін + Дрезден» (де готель на 1 ніч вже ВКЛЮЧЕНО у вартість)?',
                options: ['💶 190€ (готель включено)', '💶 290€', '💶 350€'],
                correct: 0,
                explain: 'Дводенний тур <b>Берлін + Дрезден</b> з проживанням у готелі коштує лише <b>190€</b>!',
              },
              {
                q: 'Скільки коштує нова альпійська поїздка до Австрії «Зальцбург + Гальштат (Хальштатт)»?',
                options: ['💶 135€', '💶 95€', '💶 220€'],
                correct: 0,
                explain: 'Авторський виїзд <b>Зальцбург + Гальштат</b> (озеро, Skywalk та палац Мірабель) коштує <b>135€</b>!',
              },
              {
                q: 'Скільки коштує фіксація конкретного улюбленого місця (1–6 або 8) у салоні нашого 8-місного Opel Vivaro?',
                options: ['💺 Лише +5€ (а місце 7 та вільна посадка — 0€)', '💺 +25€', '💺 +50€'],
                correct: 0,
                explain: 'Вибір конкретного місця коштує символічні <b>+5€</b>, а місце №7 та вільна посадка — <b>0€</b>!',
              },
            ];

            if (cbData.startsWith('cb_price_ans_')) {
              const parts = cbData.replace('cb_price_ans_', '').split('_');
              const qIdx = parseInt(parts[0], 10) || 0;
              const optIdx = parseInt(parts[1], 10) || 0;
              const item = PRICE_QUESTIONS[qIdx % PRICE_QUESTIONS.length];
              const isCorrect = optIdx === item.correct;
              const nextIdx = (qIdx + 1) % PRICE_QUESTIONS.length;

              const ansText =
                `💶 <b>ІНТУЇЦІЯ: ЧАС І ЦІНИ SVOI (Питання ${qIdx + 1} з ${PRICE_QUESTIONS.length})</b>\n\n` +
                (isCorrect ? `✅ <b>ТОЧНО В ЦІЛЬ!</b> 🎯\n\n` : `❌ <b>Правильна відповідь:</b> ${item.options[item.correct]}\n\n`) +
                `💡 ${item.explain}`;

              await smartEditMessage(chatId, msgId, hasPhoto, ansText, {
                inline_keyboard: [
                  [{ text: `➡️ Наступне питання (${nextIdx + 1}/${PRICE_QUESTIONS.length})`, callback_data: `cb_price_q_${nextIdx}` }],
                  [{ text: '💺 Обрати місце та забронювати', callback_data: 'cb_book' }],
                  [{ text: '🎮 До списку всіх ігор', callback_data: 'cb_games' }],
                  [{ text: '🔙 Назад в головне меню', callback_data: 'cb_back' }],
                ],
              });
            } else {
              const qIdx = cbData.startsWith('cb_price_q_') ? parseInt(cbData.replace('cb_price_q_', ''), 10) || 0 : 0;
              const item = PRICE_QUESTIONS[qIdx % PRICE_QUESTIONS.length];
              const nextIdx = (qIdx + 1) % PRICE_QUESTIONS.length;
              const qText =
                `💶 <b>ІНТУЇЦІЯ: ЧАС, ЦІНИ ТА РЕКОРДИ (Питання ${qIdx + 1} з ${PRICE_QUESTIONS.length})</b> ⏱\n\n` +
                `❓ <b>${item.q}</b>\n\n` +
                `👇 <i>Натисніть на правильний варіант нижче:</i>`;

              const optionRows = item.options.map((opt, idx) => [
                { text: opt, callback_data: `cb_price_ans_${qIdx}_${idx}` },
              ]);
              optionRows.push([
                { text: `🔄 Інше питання (${nextIdx + 1}/${PRICE_QUESTIONS.length})`, callback_data: `cb_price_q_${nextIdx}` },
                { text: '🎮 До всіх ігор', callback_data: 'cb_games' },
              ]);

              await smartEditMessage(chatId, msgId, hasPhoto, qText, { inline_keyboard: optionRows });
            }
          } else if (cbData === 'cb_game_poll' || cbData.startsWith('cb_poll_q_') || cbData.startsWith('cb_poll_vote_')) {
            const POLL_ITEMS = [
              {
                q: 'Який напрямок із нових турів SVOI ви найбільше хочете відвідати найближчими вихідними?',
                options: [
                  { label: '🇦🇹 Зальцбург + Гальштат (135€)', pct: 34 },
                  { label: '🇧🇪 Брюгге + Гент + Брюссель (120€)', pct: 28 },
                  { label: '🇳🇱 Гітхорн + Амстердам (120€)', pct: 22 },
                  { label: '🇩🇪 Замок Нойшванштайн + ущелина (120€)', pct: 16 },
                ],
              },
              {
                q: 'Що для вас найважливіше у камерних поїздках на 8-місному Opel Vivaro?',
                options: [
                  { label: '🏠 Збір прямо від дому (Door-to-Door)', pct: 42 },
                  { label: '👥 Маленька компанія до 8 осіб без черг', pct: 31 },
                  { label: '💳 Бронь 0€ без передоплати на 1 день', pct: 19 },
                  { label: '📸 Зупинки у найкрасивіших фото-локаціях', pct: 8 },
                ],
              },
              {
                q: 'Який формат подорожей вам підходить найкраще?',
                options: [
                  { label: '☀️ Одноденні виїзди у суботу або неділю', pct: 54 },
                  { label: '🏨 Вікенд-тури на 2 дні з готелем (Комо, Мон-Сен-Мішель)', pct: 33 },
                  { label: '🌴 Великі 3-денні виїзди (Лазурове узбережжя)', pct: 13 },
                ],
              },
            ];

            if (cbData.startsWith('cb_poll_vote_')) {
              const parts = cbData.replace('cb_poll_vote_', '').split('_');
              const qIdx = parseInt(parts[0], 10) || 0;
              const optIdx = parseInt(parts[1], 10) || 0;
              const poll = POLL_ITEMS[qIdx % POLL_ITEMS.length];
              const nextIdx = (qIdx + 1) % POLL_ITEMS.length;

              const bars = poll.options
                .map((o, i) => {
                  const mark = i === optIdx ? '✅ ' : '• ';
                  const adjPct = i === optIdx ? o.pct + 2 : Math.max(5, o.pct - 1);
                  const filled = Math.round(adjPct / 10);
                  const bar = '🟩'.repeat(filled) + '⬜'.repeat(Math.max(0, 10 - filled));
                  return `${mark}<b>${o.label}</b> — <code>${adjPct}%</code>\n${bar}`;
                })
                .join('\n\n');

              const resText =
                `📊 <b>ДЯКУЄМО ЗА ВАШ ГОЛОС! (Опитування ${qIdx + 1} з ${POLL_ITEMS.length})</b> 🎉\n\n` +
                `❓ <b>${poll.q}</b>\n\n` +
                `${bars}`;

              await smartEditMessage(chatId, msgId, hasPhoto, resText, {
                inline_keyboard: [
                  [{ text: `➡️ Наступне опитування (${nextIdx + 1}/${POLL_ITEMS.length})`, callback_data: `cb_poll_q_${nextIdx}` }],
                  [{ text: '🗺 Переглянути всі тури', callback_data: 'cb_trips' }],
                  [{ text: '🎮 До списку всіх ігор', callback_data: 'cb_games' }],
                  [{ text: '🔙 Назад в головне меню', callback_data: 'cb_back' }],
                ],
              });
            } else {
              const qIdx = cbData.startsWith('cb_poll_q_') ? parseInt(cbData.replace('cb_poll_q_', ''), 10) || 0 : 0;
              const poll = POLL_ITEMS[qIdx % POLL_ITEMS.length];
              const nextIdx = (qIdx + 1) % POLL_ITEMS.length;

              const pollText =
                `📊 <b>ОПИТУВАННЯ МАНДРІВНИКІВ SVOI (${qIdx + 1} з ${POLL_ITEMS.length})</b> 🗳\n\n` +
                `❓ <b>${poll.q}</b>\n\n` +
                `👇 <i>Натисніть на ваш варіант, щоб проголосувати та побачити статистику клубу:</i>`;

              const rows = poll.options.map((o, idx) => [
                { text: o.label, callback_data: `cb_poll_vote_${qIdx}_${idx}` },
              ]);
              rows.push([
                { text: `🔄 Інше опитування (${nextIdx + 1}/${POLL_ITEMS.length})`, callback_data: `cb_poll_q_${nextIdx}` },
                { text: '🎮 До всіх ігор', callback_data: 'cb_games' },
              ]);

              await smartEditMessage(chatId, msgId, hasPhoto, pollText, { inline_keyboard: rows });
            }
          } else if (cbData === 'cb_game_match' || cbData.startsWith('cb_match_')) {
            if (cbData.startsWith('cb_match_')) {
              const style = cbData.replace('cb_match_', '');
              const recommendations: Record<string, { title: string; desc: string; trips: { label: string; id: string }[] }> = {
                close: {
                  title: '🌿 Близько (1.5–2 год у дорозі) та без втоми',
                  desc: 'Ідеальні одноденні маршрути поруч із Саарландом та Люксембургом:',
                  trips: [
                    { label: '🇫🇷 Ельзас + Страсбург + Кольмар (80€)', id: 'alsace_strasbourg' },
                    { label: '🇩🇪 Замок Ельц + Кохем + міст Гайєрлай (85€)', id: 'eltz_cochem_mosel' },
                    { label: '🇩🇪 Гайдельберг + Баден-Баден (85€)', id: 'heidelberg_baden' },
                    { label: '🇧🇪 Брюссель (90€)', id: 'brussels' },
                  ],
                },
                alps: {
                  title: '🏔 Альпійські гори, озера, водоспади та замки',
                  desc: 'Найживописніші панорамні маршрути Європи:',
                  trips: [
                    { label: '🇦🇹 Зальцбург + Гальштат (135€)', id: 'salzburg_hallstatt' },
                    { label: '🇩🇪 Замок Нойшванштайн + ущелина (120€)', id: 'neuschwanstein' },
                    { label: '🇨🇭 Швейцарія: Рейнський водоспад + Люцерн (120€)', id: 'swiss_rhine_zurich' },
                    { label: '🇨🇭 Швейцарія: Ааре + Лаутербруннен + Берн (120€)', id: 'swiss_aare_bern' },
                    { label: '🇱🇮 Ліхтенштейн — 3 країни за 1 день (120€)', id: 'liechtenstein' },
                  ],
                },
                water: {
                  title: '🛶 Канали, човни, узбережжя та романтика',
                  desc: 'Водні перлини Голландії, Бельгії та Франції:',
                  trips: [
                    { label: '🇳🇱 Гітхорн + Амстердам (120€)', id: 'amsterdam' },
                    { label: '🇳🇱 Заандам + Море + Амстердам (120€)', id: 'zaandam_sea_amsterdam' },
                    { label: '🇧🇪 Брюгге + Гент + Брюссель (120€)', id: 'bruges_ghent_brussels' },
                    { label: '🇫🇷 Скелі Етрета + Париж (140€)', id: 'etretat_paris' },
                  ],
                },
                family: {
                  title: '🎢 Парки розваг, авто-музеї та сімейний драйв',
                  desc: 'Максимум емоцій для дорослих і дітей:',
                  trips: [
                    { label: '🇩🇪 Європа-Парк / Europa-Park (95€)', id: 'europa_park' },
                    { label: '🇩🇪 Парк розваг Леголенд (110€)', id: 'legoland_germany' },
                    { label: '🇩🇪 Штутгарт: Mercedes-Benz & Porsche (90€)', id: 'stuttgart_tour' },
                  ],
                },
                weekend: {
                  title: '🏨 Багатоденні вікенд-тури (2–3 дні, готель включено)',
                  desc: 'Повне занурення з ночівлею у перевірених готелях:',
                  trips: [
                    { label: '🇮🇹 Озеро Комо + Мілан (2 дні, 270€)', id: 'como_milan' },
                    { label: '🇫🇷 Мон-Сен-Мішель + Сен-Мало (2 дні, 270€)', id: 'mont_saint_michel' },
                    { label: '🇩🇪 Берлін + Дрезден (2 дні, 190€)', id: 'berlin_dresden' },
                    { label: '🇫🇷 Лазурове узбережжя: Ніцца + Монако (3 дні, 440€)', id: 'cote_dazur' },
                  ],
                },
              };
              const rec = recommendations[style] || recommendations.close;
              const rows = rec.trips.map((t) => [{ text: `👉 Відкрити тур: ${t.label}`, callback_data: `trip_${t.id}` }]);
              rows.push([{ text: '🔄 Обрати інший стиль відпочинку', callback_data: 'cb_game_match' }]);
              rows.push([
                { text: '🎮 До всіх ігор', callback_data: 'cb_games' },
                { text: '🔙 Назад в меню', callback_data: 'cb_back' },
              ]);

              await smartEditMessage(
                chatId,
                msgId,
                hasPhoto,
                `🎯 <b>ВАША ПЕРСОНАЛЬНА ДОБІРКА ТУРІВ SVOI:</b>\n\n` +
                  `<b>${rec.title}</b>\n${rec.desc}\n\n` +
                  `👇 <i>Натисніть на будь-який тур нижче, щоб переглянути повну програму та забронювати місце:</i>`,
                { inline_keyboard: rows },
              );
            } else {
              const matchText =
                `🎒 <b>ТЕСТ: ПІДБІР ІДЕАЛЬНОГО ТУРУ З СААРЛАНДУ ТА ЛЮКСЕМБУРГУ</b> 🧭\n\n` +
                `Оберіть на плашках нижче, який настрій та формат відпочинку вам зараз найближчий — і бот миттєво підбере найкращі маршрути:`;
              await smartEditMessage(chatId, msgId, hasPhoto, matchText, {
                inline_keyboard: [
                  [{ text: '🌿 Близько (1.5–2 год) і без втоми (80–90€)', callback_data: 'cb_match_close' }],
                  [{ text: '🏔 Альпи, замки, озера та водоспади', callback_data: 'cb_match_alps' }],
                  [{ text: '🛶 Канали, море, човни та романтика (Голландія / Бельгія)', callback_data: 'cb_match_water' }],
                  [{ text: '🎢 Парки розваг (Europa-Park, Леголенд) та авто-музеї', callback_data: 'cb_match_family' }],
                  [{ text: '🏨 Вікенд на 2–3 дні з готелем (Комо, Нормандія, Ніцца)', callback_data: 'cb_match_weekend' }],
                  [
                    { text: '🎮 До всіх ігор', callback_data: 'cb_games' },
                    { text: '🔙 Назад в меню', callback_data: 'cb_back' },
                  ],
                ],
              });
            }
          } else if (cbData === 'cb_game_wheel') {
            const prizes = [
              '💺 Безкоштовний вибір будь-якого місця в 1-му або 2-му ряду (+5€ → 0€) | Промокод: WHEEL-SEAT5',
              '☕ Ароматна кава та круасан на панорамній зупинці в подарунок | Промокод: WHEEL-COFFEE',
              '💎 Знижка -10€ на будь-який 2–3 денний тур (Комо, Мон-Сен-Мішель, Лазурний берег) | Промокод: WHEEL-10EUR',
              '📸 Персональна міні-фотосесія на найкращій панорамній локації туру | Промокод: WHEEL-PHOTO',
            ];
            const won = prizes[Math.floor(Math.random() * prizes.length)];
            await smartEditMessage(
              chatId,
              msgId,
              hasPhoto,
              `🎰 <b>КОЛЕСО ФОРТУНИ SVOI TRAVEL!</b> 🎉\n\n` +
                `🎁 <b>Ваш гарантований бонус до наступної поїздки:</b>\n` +
                `<blockquote><b>${won}</b></blockquote>\n\n` +
                `Назвіть цей промокод організатору або оберіть тур просто зараз!`,
              {
                inline_keyboard: [
                  [{ text: '🔄 Крутити колесо ще раз', callback_data: 'cb_game_wheel' }],
                  [{ text: '💺 Обрати місце та використати бонус', callback_data: 'cb_book' }],
                  [
                    { text: '🎮 До всіх ігор', callback_data: 'cb_games' },
                    { text: '🔙 Назад в меню', callback_data: 'cb_back' },
                  ],
                ],
              },
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
