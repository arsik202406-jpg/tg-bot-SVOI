import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

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

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`SVOI Travel server running on http://0.0.0.0:${port}`);
    startLiveTelegramBotPolling();
  });
}

// Live Telegram Bot Polling so @Svoi_TravelEU_bot immediately responds with updated menu, 6 games & /channel giveaway publishing
const DEFAULT_BOT_TOKEN = process.env.BOT_TOKEN || '8969834514:AAHl3mDZU00jncjJ52TyGTHmcs_-l5CBjPM';
const ADMIN_ID = Number(process.env.ADMIN_ID) || 8450153980;
let currentMiniAppUrl =
  process.env.MINI_APP_URL ||
  'https://ais-pre-5nen67xjgzawt525obtchj-694072480718.europe-west1.run.app/?miniapp=1';
let currentChannelTarget = process.env.CHANNEL_CHAT_ID || '@svoi_traveleu';

// Track simple per-chat state for /channel giveaway creation & channel ID binding
const adminChatStates: Record<number, 'waiting_gw_prize' | 'waiting_channel_id' | null> = {};
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
      [{ text: '🔙 Повернутися в головне меню', callback_data: 'cb_back' }],
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
        { text: '💶 Інтуїція: Цифри та рекорди', callback_data: 'cb_game_price' },
      ],
      [
        { text: '🎒 Тест: Підбір ідеального туру', callback_data: 'cb_game_match' },
        { text: '🎰 Колесо Фортуни SVOI', callback_data: 'cb_game_wheel' },
      ],
      [{ text: '🔙 Головне меню', callback_data: 'cb_back' }],
    ],
  };
}

const WELCOME_HTML =
  `🌟 <b>Ласкаво просимо до туристичного клубу SVOI!</b> 🌍✨\n\n` +
  `<blockquote>🚐 <b>Комфортабельні поїздки Європою на Opel Vivaro (8 місць)</b> із Саарланду, Тріра та Люксембургу прямо від вашого дому (Door-to-Door)!</blockquote>\n\n` +
  `✨ <b>Наші головні переваги:</b>\n` +
  `• <b>14 авторських турів:</b> Париж, Амстердам, Брюгге, Швейцарія, Комо, Лазурове узбережжя\n` +
  `• <b>0% передоплати</b> на всі одноденні поїздки (оплата при посадці)\n` +
  `• <b>Салон із зоряним LED-небом:</b> бронь конкретного місця лише 5€ (або 0€ вільна посадка)\n\n` +
  `👇 <b>Оберіть розділ нижче:</b>`;

async function tgApi(method: string, body: Record<string, any>) {
  const resp = await fetch(`https://api.telegram.org/bot${DEFAULT_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return resp.json();
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

        // 1. Auto-detect private channel ID (-100...) if bot is added as admin or a post is made in the channel
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

          // Check if user forwarded a post from their private channel (supports both forward_origin and forward_from_chat)
          const fwdChat = msg.forward_origin?.chat || msg.forward_from_chat;
          if (fwdChat && (fwdChat.type === 'channel' || fwdChat.type === 'supergroup')) {
            currentChannelTarget = String(fwdChat.id);
            adminChatStates[chatId] = null;
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

          if (text.startsWith('/start') || text.startsWith('/menu')) {
            adminChatStates[chatId] = null;
            await tgApi('sendMessage', {
              chat_id: chatId,
              text: WELCOME_HTML,
              parse_mode: 'HTML',
              reply_markup: getMainMenuMarkup(userId),
            });
            continue;
          }

          if (text.startsWith('/channel')) {
            adminChatStates[chatId] = null;
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

          // Handle FSM states for admin
          if (adminChatStates[chatId] === 'waiting_channel_id' && text) {
            adminChatStates[chatId] = null;
            if (text.includes('t.me/+') || text.includes('joinchat')) {
              await tgApi('sendMessage', {
                chat_id: chatId,
                parse_mode: 'HTML',
                text:
                  `⚠️ <b>Ви надіслали закрите посилання-запрошення!</b>\n\n` +
                  `Telegram API вимагає числовий ID <code>-100...</code> для закритих каналів.\n` +
                  `👉 <b>Просто перешліть (Forward) будь-який пост зі свого каналу сюди в чат з ботом</b> — і бот сам визначить ID!`,
                reply_markup: getChannelAdminMarkup(),
              });
              continue;
            }
            currentChannelTarget = text;
            await tgApi('sendMessage', {
              chat_id: chatId,
              parse_mode: 'HTML',
              text: `✅ <b>Цільовий канал збережено:</b> <code>${currentChannelTarget}</code>`,
              reply_markup: getChannelAdminMarkup(),
            });
            continue;
          }

          if (adminChatStates[chatId] === 'waiting_gw_prize' && text) {
            adminChatStates[chatId] = null;
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
                  `<b>Чому так сталося і як виправити за 10 секунд:</b>\n` +
                  `1️⃣ Ваш канал закритий (за посиланням <code>t.me/+Flt_2r6vi3U4ZDg6</code>), тому у нього немає імені <code>@svoi_traveleu</code>.\n` +
                  `2️⃣ Додайте бота <b>@Svoi_TravelEU_bot</b> в <b>Адміністратори</b> каналу з правом «Публікація повідомлень».\n` +
                  `3️⃣ <b>Перешліть сюди в бот будь-який пост зі свого каналу</b> — бот миттєво збереже числовий ID <code>-100...</code> і почне публікувати розіграші!\n\n` +
                  `Ось готовий пост розіграшу (ви також можете переслати його в канал):`,
                reply_markup: getChannelAdminMarkup(),
              });
              await tgApi('sendMessage', {
                chat_id: chatId,
                text: gwText,
                parse_mode: 'HTML',
                reply_markup: gwMarkup,
              });
            }
            continue;
          }
        } else if (update.callback_query) {
          const cb = update.callback_query;
          const chatId = cb.message?.chat?.id;
          const msgId = cb.message?.message_id;
          const userId = cb.from?.id || 0;
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
            adminChatStates[chatId] = null;
            await tgApi('editMessageText', {
              chat_id: chatId,
              message_id: msgId,
              text: WELCOME_HTML,
              parse_mode: 'HTML',
              reply_markup: getMainMenuMarkup(userId),
            });
          } else if (cbData === 'cb_adm_channel_menu') {
            adminChatStates[chatId] = null;
            await tgApi('editMessageText', {
              chat_id: chatId,
              message_id: msgId,
              parse_mode: 'HTML',
              text:
                `📢 <b>Центр керування Telegram-каналом SVOI Travel</b>\n\n` +
                `🎯 Цільовий канал: <code>${currentChannelTarget}</code>\n` +
                `🎁 Поточний розіграш: <b>${activeGiveaway.prize}</b>\n` +
                `👥 Учасників: <b>${activeGiveaway.participants.length}</b>\n\n` +
                `Оберіть дію:`,
              reply_markup: getChannelAdminMarkup(),
            });
          } else if (cbData === 'cb_adm_gw_new') {
            adminChatStates[chatId] = 'waiting_gw_prize';
            await tgApi('editMessageText', {
              chat_id: chatId,
              message_id: msgId,
              parse_mode: 'HTML',
              text:
                `🎁 <b>Запуск нового РОЗІГРАШУ в канал <code>${currentChannelTarget}</code></b>\n\n` +
                `Напишіть у відповідь: <b>який приз розігрується?</b>\n` +
                `<i>Наприклад: Безкоштовне місце в турі до Парижа 🥐🗼</i>`,
              reply_markup: {
                inline_keyboard: [[{ text: '❌ Скасувати', callback_data: 'cb_adm_channel_menu' }]],
              },
            });
          } else if (cbData === 'cb_adm_set_channel') {
            adminChatStates[chatId] = 'waiting_channel_id';
            await tgApi('editMessageText', {
              chat_id: chatId,
              message_id: msgId,
              parse_mode: 'HTML',
              text:
                `⚙️ <b>Прив'язка закритого каналу для публікації розіграшів</b>\n\n` +
                `Поточний ID: <code>${currentChannelTarget}</code>\n\n` +
                `👉 <b>Найпростіший спосіб:</b> просто <b>перешліть (Forward) сюди будь-який пост зі свого каналу</b>! Бот автоматично визначить числовий ID <code>-100...</code> вашого приватного каналу.`,
              reply_markup: {
                inline_keyboard: [[{ text: '❌ Скасувати', callback_data: 'cb_adm_channel_menu' }]],
              },
            });
          } else if (cbData === 'cb_games') {
            await tgApi('editMessageText', {
              chat_id: chatId,
              message_id: msgId,
              parse_mode: 'HTML',
              text:
                `🎮 <b>Ігровий клуб та вікторини SVOI Travel (6 ігор)</b> 🏆\n\n` +
                `Оберіть гру або вікторину нижче та вигравайте бонуси для майбутніх поїздок:`,
              reply_markup: getGamesMarkup(),
            });
          } else if (cbData === 'cb_game_wheel') {
            const prizes = [
              '💺 Безкоштовний вибір будь-якого місця в 1-му або 2-му ряду (код: WHEEL-SEAT5)',
              '☕ Кава та круасан на панорамній зупинці в подарунок (код: WHEEL-COFFEE)',
              '💎 Знижка -10€ на будь-який багатоденний тур (код: WHEEL-10EUR)',
            ];
            const won = prizes[Math.floor(Math.random() * prizes.length)];
            await tgApi('editMessageText', {
              chat_id: chatId,
              message_id: msgId,
              parse_mode: 'HTML',
              text: `🎰 <b>КОЛЕСО ФОРТУНИ SVOI!</b> 🎉\n\n🎁 Ваш виграш:\n<b>${won}</b>`,
              reply_markup: getGamesMarkup(),
            });
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
