# 🌍 Telegram-бот туристического клуба SVOI Travel (aiogram 3.x)

Официальный production-ready бот для европейского туристического клуба **SVOI** (@Svoi_TravelEU_bot).

## 🚀 Возможности
- 🧭 **Интерактивное главное меню** с удобной навигацией без спама сообщениями (`edit_message_text` + `callback.answer()`).
- 🗺 **Каталог 14 туров по Европе** (Париж, Амстердам, Брюгге, Нойшванштайн, Лихтенштейн, Лазурный берег, Швейцария, Прага и др.) с подробными программами и ценами.
- 💺 **Выбор мест в салоне** (VIP-кресла, место рядом с водителем, стандарт) с автоматической генерацией заявки.
- 🚐 **Презентация автопарка:** кастомный Opel Vivaro VIP, звездное небо из алькантары, климат-контроль, USB.
- 📍 **Точки сбора:** старт из Саарбрюккена (Saarbrücken Hbf) и точки подсадки по пути следования (Кайзерслаутерн, Мангейм, Франкфурт и др.).
- ✍️ **FSM-сбор отзывов и пожеланий** (`FeedbackState.waiting_for_text`) с автоматической пересылкой в личные сообщения администратора (`ADMIN_ID`).
- 📜 **Условия поездок и партнерская программа** для блогеров и групп.

---

## 🧪 Пошаговая инструкция: Тестирование в Telegram (за 2 минуты)

### ⚠️ Важно: вебхук Chatplace
На текущем токене `@Svoi_TravelEU_bot` в данный момент подключен Webhook сервиса **Chatplace**. 
Если вы запускаете aiogram скрипт:
1. `bot.py` при старте автоматически вызывает `await bot.delete_webhook(drop_pending_updates=True)`, после чего бот слушает команды напрямую через Python aiogram.
2. **Если вы не хотите прерывать работу Chatplace на основном боте**, зарегистрируйте за 1 минуту бесплатного тестового бота в `@BotFather` (например, `@svoi_test_travel_bot`), вставьте его токен в `.env` и тестируйте без малейшего риска!

---

### Быстрый запуск на локальном ПК (Windows / macOS / Linux):

1. **Распакуйте проект и перейдите в терминале в папку с ботом:**
```bash
cd svoi_bot
```

2. **Создайте и активируйте виртуальное окружение:**
```bash
# macOS / Linux:
python3 -m venv venv
source venv/bin/activate

# Windows (PowerShell):
python -m venv venv
.\venv\Scripts\activate
```

3. **Установите зависимости:**
```bash
pip install -r requirements.txt
```

4. **Запустите бота:**
```bash
python bot.py
```

Когда появится сообщение:
`✅ Успешное подключение к Telegram API: SVOI | Поездки по Европе (@Svoi_TravelEU_bot)` — откройте бота в Telegram и отправьте `/start`.

---

## 🛠 Развертывание на сервере (Ubuntu / Debian VPS)

### Вариант 1. Запуск через Python venv

1. **Клонируйте или скопируйте файлы на сервер:**
```bash
mkdir -p /opt/svoi_bot && cd /opt/svoi_bot
# Скопируйте файлы репозитория в эту папку
```

2. **Создайте виртуальное окружение и установите зависимости:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

3. **Настройте переменные в файле `.env`:**
```ini
BOT_TOKEN=8969834514:AAGjza7gfBInTsGhnR4jVWvHQR0Hcx2Mnd4
ADMIN_ID=ВАШ_ЦИФРОВОЙ_TELEGRAM_ID
MANAGER_USERNAME=SVOI_travel_admin
BOT_USERNAME=Svoi_TravelEU_bot
CHANNEL_URL=https://t.me/+Flt_2r6vi3U4ZDg6
GROUP_URL=https://t.me/+J50liyDUHPgzYTQy
```
*(Узнать свой `ADMIN_ID` можно бесплатно в боте `@userinfobot`)*

4. **Запустите бота:**
```bash
python -m bot_code.bot
```

---

### Вариант 2. Автозапуск через Systemd (Рекомендуется для 24/7)

Создайте сервис `/etc/systemd/system/svoi_bot.service`:
```ini
[Unit]
Description=SVOI Travel Telegram Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/svoi_bot
ExecStart=/opt/svoi_bot/venv/bin/python -m bot_code.bot
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Активируйте и запустите:
```bash
sudo systemctl daemon-reload
sudo systemctl enable svoi_bot
sudo systemctl start svoi_bot
sudo systemctl status svoi_bot
```

Просмотр логов в реальном времени:
```bash
journalctl -u svoi_bot -f
```

---

### Вариант 3. Запуск в Docker

```bash
docker compose up -d --build
docker compose logs -f
```
