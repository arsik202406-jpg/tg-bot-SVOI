# 🌍 Telegram-бот туристичного клубу SVOI Travel (aiogram 3.x)

Офіційний production-ready бот для європейського туристичного клубу **SVOI** (@Svoi_TravelEU_bot).

## 🚀 Можливості
- 🧭 **Інтерактивне головне меню** зі зручною навігацією без спаму повідомленнями (`edit_message_text` + `callback.answer()`).
- 🗺 **Каталог 14 турів Європою** (Париж, Нормандія/Етрета, Амстердам, Брюгге, Нойшванштайн, Ліхтенштейн, Лазурове узбережжя, Швейцарія, Прага тощо) з докладними програмами та цінами.
- 💺 **Вибір місць у салоні:** 1-й ряд (2 місця поруч з водієм), 2-й ряд (3 місця), 3-й ряд (3 місця). Фіксація обраного місця (+5€), вільна посадка (0€).
- 🚐 **Презентація автопарку:** мінівен Opel Vivaro (8 місць), регульовані крісла, клімат-контроль, USB-порти.
- 📍 **Точки збору & Логістика:** збір і розвезення прямо за адресою (Саарланд, Трір, Люксембург), підсадка по дорозі від 4 осіб, точний час напередодні ввечері та одноденна група для зв'язку з водієм.
- 💳 **Умови подорожей:** 0% передоплати на всі одноденні тури (оплата при посадці), передоплата тільки на багатоденні тури під готелі, медстраховка, багаж 10 кг + ручна поклажа.
- 🎮 **Ігри та квізи в дорозі:** «Гео-Детектив», вікторина «Правда чи Неправда» з бонусною Карткою Пріоритету (+5€ до вибору місця).
- ✍️ **FSM-збір відгуків та побажань** (`FeedbackState.waiting_for_text`) з автоматичним надсиланням у приватні повідомлення адміністратора (`ADMIN_ID`).

---

## 🧪 Швидкий запуск на локальному комп'ютері (Windows / macOS / Linux)

1. **Перейдіть у папку з ботом:**
```bash
cd bot_code
```

2. **Створіть та активуйте віртуальне середовище:**
```bash
# macOS / Linux:
python3 -m venv venv
source venv/bin/activate

# Windows (PowerShell):
python -m venv venv
.\venv\Scripts\activate
```

3. **Встановіть залежності:**
```bash
pip install -r requirements.txt
```

4. **Перевірте налаштування в `.env`:**
```ini
BOT_TOKEN=8969834514:AAHl3mDZU00jncjJ52TyGTHmcs_-l5CBjPM
ADMIN_ID=8450153980
MANAGER_USERNAME=SVOI_travel_admin
BOT_USERNAME=Svoi_TravelEU_bot
CHANNEL_URL=https://t.me/+Flt_2r6vi3U4ZDg6
GROUP_URL=https://t.me/+J50liyDUHPgzYTQy
```

5. **Запустіть бота:**
```bash
python bot.py
```

Після повідомлення:
`✅ Успішне підключення: SVOI | Поїздки по Європі (@Svoi_TravelEU_bot)` — відкрийте бота в Telegram і надішліть `/start`.

---

## 🛠 Розгортання на сервері (Render.com / VPS)

### Варіант 1: Render.com
1. Створіть новий **Web Service** або **Background Worker**.
2. Вкажіть Root Directory: `bot_code`.
3. Runtime: **Python 3**.
4. Build Command: `pip install -r requirements.txt`.
5. Start Command: `python bot.py`.
6. В Environment Variables додайте:
   - `BOT_TOKEN` = `8969834514:AAHl3mDZU00jncjJ52TyGTHmcs_-l5CBjPM`
   - `ADMIN_ID` = `8450153980`
   - `PORT` = `10000` (для Web Service health check)

### Варіант 2: Docker
```bash
docker compose up -d --build
```
