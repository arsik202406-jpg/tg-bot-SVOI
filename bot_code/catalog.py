"""Каталог турів, схема салону та точки збору. Один файл trips.json — для бота і для Mini App."""
import json
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from .config import settings

_TRIPS_FILE = Path(__file__).resolve().parent / "data" / "trips.json"
TRIPS: list[dict] = json.loads(_TRIPS_FILE.read_text(encoding="utf-8"))
TRIPS_BY_ID: dict[str, dict] = {t["id"]: t for t in TRIPS}

# Фото локацій (Pixabay) лежать у public/trips — їх бачить і Mini App (GitHub Pages), і бот
PUBLIC_DIR = Path(__file__).resolve().parent.parent / "public"
_file_ids: dict[str, str] = {}  # шлях → file_id у Telegram, щоб не завантажувати фото щоразу


def gallery(trip_id: str) -> list[str]:
    return [p for p in TRIPS_BY_ID.get(trip_id, {}).get("gallery", []) if (PUBLIC_DIR / p).is_file()]


def photo_input(rel: str):
    from aiogram.types import FSInputFile
    return _file_ids.get(rel) or FSInputFile(PUBLIC_DIR / rel)


def remember_photo(rel: str | None, message) -> None:
    if rel and message is not None and getattr(message, "photo", None):
        _file_ids[rel] = message.photo[-1].file_id

CAPACITY = 8

# Схема салону Opel Vivaro: 2 + 3 + 3. fee — доплата за вибір саме цього місця.
SEATS: list[dict] = [
    {"no": 1, "row": 1, "label": "Спереду, біля вікна", "fee": 5},
    {"no": 2, "row": 1, "label": "Спереду, біля водія", "fee": 5},
    {"no": 3, "row": 2, "label": "2-й ряд, вікно", "fee": 5},
    {"no": 4, "row": 2, "label": "2-й ряд, центр", "fee": 5},
    {"no": 5, "row": 2, "label": "2-й ряд, вікно", "fee": 5},
    {"no": 6, "row": 3, "label": "3-й ряд, вікно", "fee": 5},
    {"no": 7, "row": 3, "label": "3-й ряд, центр", "fee": 0},
    {"no": 8, "row": 3, "label": "3-й ряд, вікно", "fee": 5},
]
SEATS_BY_NO = {s["no"]: s for s in SEATS}
# Порядок автоматичної посадки, якщо клієнт не обирає місце (без доплати)
AUTO_SEAT_ORDER = [7, 4, 6, 8, 3, 5, 2, 1]

# Точки збору
PICKUP_CITIES: list[dict] = [
    {"id": "saarland", "name": "Саарланд", "hint": "забираємо від дому"},
    {"id": "trier", "name": "Трір", "hint": "забираємо від дому"},
    {"id": "luxembourg", "name": "Люксембург", "hint": "забираємо від дому"},
    {"id": "other", "name": "Інше місто", "hint": "Хомбург, Кайзерслаутерн, Мангейм… уточнимо"},
]
PICKUP_BY_ID = {c["id"]: c for c in PICKUP_CITIES}

TZ = ZoneInfo(settings.TIMEZONE)

MONTHS_GEN = ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня",
              "серпня", "вересня", "жовтня", "листопада", "грудня"]
WEEKDAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "нд"]


def today() -> date:
    return datetime.now(TZ).date()


def fmt_date(d: date, with_weekday: bool = True) -> str:
    s = f"{d.day} {MONTHS_GEN[d.month - 1]}"
    return f"{WEEKDAYS[d.weekday()]}, {s}" if with_weekday else s


def fmt_departure(d: date, days: int) -> str:
    if days <= 1:
        return fmt_date(d)
    end = date.fromordinal(d.toordinal() + days - 1)
    if end.month == d.month:
        return f"{d.day}–{end.day} {MONTHS_GEN[d.month - 1]}"
    return f"{fmt_date(d, False)} – {fmt_date(end, False)}"


def parse_dates(text: str) -> list[date]:
    """Розбирає «28.11, 5.12.2026» → список дат. Рік без вказівки — найближчий майбутній."""
    result: list[date] = []
    t = today()
    for chunk in text.replace(";", ",").replace(" ", ",").split(","):
        chunk = chunk.strip().strip(".")
        if not chunk:
            continue
        parts = chunk.split(".")
        if len(parts) not in (2, 3):
            raise ValueError(chunk)
        day, month = int(parts[0]), int(parts[1])
        if len(parts) == 3:
            year = int(parts[2])
            if year < 100:
                year += 2000
            d = date(year, month, day)
        else:
            d = date(t.year, month, day)
            if d < t:
                d = date(t.year + 1, month, day)
        result.append(d)
    return sorted(set(result))


def seat_fee(seats: list[int], auto: bool) -> int:
    if auto:
        return 0
    return sum(SEATS_BY_NO[s]["fee"] for s in seats)


# ---------- Діти ----------
CHILD_MAX_AGE = 11  # дитячий тариф — до 12 років (тобто 0–11)


def child_discount(trip: dict) -> int:
    """Знижка за одну дитину: багатоденна поїздка −10 %, одноденна дорожча за 100 € — −20 €, інакше −15 €.
    Для окремої поїздки можна задати свою ціну полем child_price у trips.json."""
    price = trip["price"]
    if trip.get("child_price") is not None:
        return max(price - int(trip["child_price"]), 0)
    if trip.get("days", 1) > 1:
        return round(price * 0.10)
    return 20 if price > 100 else 15


def child_price(trip: dict) -> int:
    return trip["price"] - child_discount(trip)


def seat_word(age: int) -> str:
    """Яке автокрісло потрібне дитині (орієнтовно за віком)."""
    if age < 1:
        return "люлька/автокрісло 0+"
    if age < 4:
        return "автокрісло"
    return "бустер"


# Валюта на місці (для пам'ятки)
CURRENCY = {"Швейцарія": "швейцарські франки (CHF) — євро приймають, але решту дають франками",
            "Ліхтенштейн": "швейцарські франки (CHF), євро теж приймають",
            "Чехія": "чеські крони (CZK) — найвигідніше платити карткою"}

_GUIDES_FILE = Path(__file__).resolve().parent / "data" / "guides.json"
GUIDES: dict[str, dict] = json.loads(_GUIDES_FILE.read_text(encoding="utf-8")) if _GUIDES_FILE.exists() else {}

for _t in TRIPS:
    _t["child_price"] = child_price(_t)
    _t["child_max_age"] = CHILD_MAX_AGE


def public_catalog() -> dict:
    return {"trips": TRIPS, "seats": SEATS, "capacity": CAPACITY, "pickup_cities": PICKUP_CITIES}
