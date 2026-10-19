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

// Live Telegram Bot Polling so @Svoi_TravelEU_bot immediately responds with updated menu (without 2nd manager)
const DEFAULT_BOT_TOKEN = process.env.BOT_TOKEN || '8969834514:AAHl3mDZU00jncjJ52TyGTHmcs_-l5CBjPM';
let currentMiniAppUrl =
  process.env.MINI_APP_URL ||
  'https://ais-pre-5nen67xjgzawt525obtchj-694072480718.europe-west1.run.app/?miniapp=1';

function getMainMenuMarkup() {
  return {
    inline_keyboard: [
      [
        {
          text: '🌌 SVOI Mini App (3D Салон & 14 турів) ✨',
          web_app: { url: currentMiniAppUrl },
        },
      ],
      [
        { text: '🔵 🗺 Напрямки та дати', callback_data: 'cb_trips' },
        { text: '🟢 ⚡️ РЕЗЕРВ МІСЦЯ', callback_data: 'cb_book' },
      ],
      [
        { text: '🟠 ⭐ Відгуки туристів', callback_data: 'cb_reviews' },
        { text: '🔷 ❓ Часті питання (FAQ)', callback_data: 'cb_faq' },
      ],
      [{ text: '🟡 🤝 Стати партнером клубу', callback_data: 'cb_partner' }],
      [
        { text: "🟣 💬 ЗВ'ЯЗОК З МЕНЕДЖЕРОМ", url: 'https://t.me/SVOI_travel_admin' },
        { text: '💎 📢 НАШ КАНАЛ', url: 'https://t.me/+Flt_2r6vi3U4ZDg6' },
      ],
    ],
  };
}

const WELCOME_HTML =
  `🌟 <b>Ласкаво просимо до туристичного клубу SVOI!</b> 🌍✨\n\n` +
  `<blockquote>🚐 <b>Комфортабельні поїздки Європою на Opel Vivaro (8 місць)</b> із Саарланду, Тріра та Люксембургу прямо від вашого дому (Door-to-Door)!</blockquote>\n\n` +
  `✨ <b>Наші головні переваги:</b>\n` +
  `🔵 <b>14 авторських турів:</b> Париж, Амстердам, Брюгге, Швейцарія, Комо, Лазурове узбережжя\n` +
  `🟢 <b>0% передоплати</b> на всі одноденні поїздки (оплата при посадці)\n` +
  `🟣 <b>Салон із зоряним LED-небом:</b> бронь конкретного місця лише 5€ (або 0€ вільна посадка)\n\n` +
  `👇 <b>Оберіть розділ нижче або відкрийте 3D-салон у Mini App:</b>`;

async function startLiveTelegramBotPolling() {
  let offset = 0;
  try {
    await fetch(`https://api.telegram.org/bot${DEFAULT_BOT_TOKEN}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: '🚀 SVOI Mini App',
          web_app: { url: currentMiniAppUrl },
        },
      }),
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
          // Another bot instance (e.g. Render) is active; pause polling for 30s
          setTimeout(poll, 30000);
          return;
        }
        setTimeout(poll, 5000);
        return;
      }

      for (const update of data.result || []) {
        offset = update.update_id + 1;
        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const text: string = update.message.text;
          if (text.startsWith('/start') || text.startsWith('/menu')) {
            await fetch(`https://api.telegram.org/bot${DEFAULT_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: WELCOME_HTML,
                parse_mode: 'HTML',
                reply_markup: getMainMenuMarkup(),
              }),
            });
          }
        } else if (update.callback_query) {
          const cb = update.callback_query;
          const chatId = cb.message?.chat?.id;
          const msgId = cb.message?.message_id;
          const cbData = cb.data || '';
          await fetch(`https://api.telegram.org/bot${DEFAULT_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cb.id }),
          });

          if (chatId && msgId && cbData === 'cb_back') {
            await fetch(`https://api.telegram.org/bot${DEFAULT_BOT_TOKEN}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: msgId,
                text: WELCOME_HTML,
                parse_mode: 'HTML',
                reply_markup: getMainMenuMarkup(),
              }),
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
