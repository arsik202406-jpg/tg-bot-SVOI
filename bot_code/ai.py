"""ШІ-помічник SVOI: відповідає клієнтам живою мовою, збирає дані і створює ЗАЯВКУ.
Підтверджує бронь тільки менеджер (кнопкою «✅ Підтвердити» в адмін-чаті).

Вмикається змінною ANTHROPIC_API_KEY. Без неї всі питання, як і раніше, йдуть менеджеру.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from html import escape
from pathlib import Path

from aiogram import Bot
from aiogram.types import Message
from sqlalchemy import BigInteger, DateTime, Integer, String, Text, delete, func, select
from sqlalchemy.orm import Mapped, mapped_column

from . import catalog as cat
from .config import settings
from .db import Base, Session, SupportThread, get_customer, utcnow
from .screens import keep
from .services import (BookingError, create_booking, free_count, notify_admins, notify_new_booking,
                       upcoming_departures, user_bookings)

log = logging.getLogger(__name__)

FAQ_FILE = Path(__file__).resolve().parent / "data" / "faq.md"
HISTORY_TURNS = 24          # скільки останніх реплік пам'ятає помічник
HISTORY_DAYS = 14           # розмови старші за це забуваються
DAILY_LIMIT = 60            # відповідей на одну людину за добу (захист від зловживань)
PAUSE_AFTER_MANAGER = timedelta(hours=6)  # після відповіді менеджера помічник мовчить


# ---------- Таблиці ----------

class AiTurn(Base):
    __tablename__ = "ai_turns"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, index=True)
    role: Mapped[str] = mapped_column(String(16))  # user / assistant
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AiPause(Base):
    __tablename__ = "ai_pauses"
    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=False)
    until: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class BotSetting(Base):
    __tablename__ = "bot_settings"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(String(256))


# ---------- Увімкнення / пауза ----------

async def get_setting(key: str, default: str = "") -> str:
    async with Session() as s:
        row = await s.get(BotSetting, key)
        return row.value if row else default


async def set_setting(key: str, value: str) -> None:
    async with Session() as s:
        row = await s.get(BotSetting, key)
        if row:
            row.value = value
        else:
            s.add(BotSetting(key=key, value=value))
        await s.commit()


async def is_enabled() -> bool:
    return bool(settings.ANTHROPIC_API_KEY) and (await get_setting("ai_enabled", "1")) == "1"


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


async def pause_for(user_id: int, delta: timedelta = PAUSE_AFTER_MANAGER) -> None:
    async with Session() as s:
        row = await s.get(AiPause, user_id)
        until = utcnow() + delta
        if row:
            row.until = until
        else:
            s.add(AiPause(user_id=user_id, until=until))
        await s.commit()


async def is_paused(user_id: int) -> bool:
    async with Session() as s:
        row = await s.get(AiPause, user_id)
        return bool(row and _aware(row.until) > utcnow())


async def reset_history(user_id: int) -> None:
    async with Session() as s:
        await s.execute(delete(AiTurn).where(AiTurn.user_id == user_id))
        await s.commit()


# ---------- Промпт ----------

STYLE = """Ти — помічник SVOI Travel у Telegram. Відповідаєш клієнтам замість менеджера, поки він зайнятий.

ЯК ПИСАТИ
- Як жива людина в месенджері: тепло, просто, коротко (1–4 речення). Без канцеляриту, без довгих списків, без «Шановний клієнте».
- Мовою клієнта (українська, російська, німецька — як пише він). За замовчуванням — українська.
- Звичайний текст, без markdown і без HTML. Емодзі — зрідка, 0–1 на повідомлення.
- Одне питання за раз. Не вивалюй усе одразу.
- Якщо тебе прямо питають, чи ти бот / ШІ / жива людина — чесно скажи, що ти віртуальний помічник SVOI, і запропонуй покликати менеджера. Ніколи не стверджуй, що ти людина.

ЩО МОЖНА І ЧОГО НЕ МОЖНА
- Факти бери ТІЛЬКИ з бази знань, каталогу і списку дат нижче. Не вигадуй ціни, дати, знижки, правила, час виїзду.
- Якщо відповіді немає в даних, клієнт незадоволений, просить знижку/повернення грошей/щось нестандартне, або просить людину — виклич handoff_to_manager і скажи, що менеджер скоро відповість.
- Ти НЕ підтверджуєш бронь. Ти створюєш ЗАЯВКУ, а підтверджує менеджер. Так і кажи: «заявку передав, менеджер підтвердить».
- Не обіцяй конкретний час подачі авто — його пишемо напередодні ввечері.

ЯК ОФОРМИТИ ЗАЯВКУ
Збери по черзі (те, що вже відомо, не перепитуй):
1) поїздка і дата — лише з наявних дат (departure_id); якщо дат немає — запропонуй лист очікування (add_to_waitlist);
2) скільки людей (не більше, ніж вільних місць);
3) ім'я;
4) телефон;
5) місто збору (Саарланд / Трір / Люксембург / інше), точна адреса (вулиця, будинок, місто) і поштовий індекс (обов'язково); район — якщо клієнт сам назве;
6) побажання (діти, крісло, валіза) — необов'язково.
Місця в салоні не обираєш: у заявці «будь-які вільні, без доплати». Якщо клієнт хоче конкретне місце — скажи, що його можна обрати в застосунку (кнопка «Забронювати») або менеджер допоможе.
Перед створенням коротко повтори все одним повідомленням із сумою і спитай «Все вірно?». Лише після чіткого «так» виклич create_booking_request.
"""


def _catalog_text() -> str:
    lines = []
    for t in cat.TRIPS:
        lines.append(f"### {t['id']}: {t['flag']} {t['title']} — {t['price']} € з людини, {t['duration']}")
        if t.get("pickup_time"):
            lines.append(f"Виїзд із Саарбрюккена орієнтовно: {t['pickup_time']}")
        lines.append("Головне: " + "; ".join(t.get("highlights", [])))
        if t.get("program"):
            lines.append("Програма: " + " | ".join(t["program"]))
    return "\n".join(lines)


def _static_prompt() -> str:
    faq = FAQ_FILE.read_text(encoding="utf-8") if FAQ_FILE.exists() else ""
    return f"{STYLE}\n\n# БАЗА ЗНАНЬ\n{faq}\n\n# КАТАЛОГ ПОЇЗДОК\n{_catalog_text()}"


async def _dynamic_prompt(user_id: int, first_name: str, username: str | None) -> str:
    async with Session() as s:
        deps = await upcoming_departures(s)
        cust = await get_customer(s, user_id)
        mine = await user_bookings(s, user_id)
        lines = [f"# СЬОГОДНІ: {cat.fmt_date(cat.today())} {cat.today().year}", "", "# ДАТИ З ВІДКРИТИМ НАБОРОМ"]
        if not deps:
            lines.append("Зараз немає жодної призначеної дати.")
        for d in deps:
            t = cat.TRIPS_BY_ID.get(d.trip_id, {})
            lines.append(f"departure_id={d.id} | {t.get('short_title', d.trip_id)} | "
                         f"{cat.fmt_departure(d.date, t.get('days', 1))} | вільно {free_count(d)} з {cat.CAPACITY}")
        lines += ["", "# КЛІЄНТ", f"Ім'я в Telegram: {first_name}" + (f" (@{username})" if username else "")]
        if cust and (cust.phone or cust.address):
            lines.append(f"Збережено з минулого разу: телефон {cust.phone or '—'}, {cust.city or ''} {cust.address or ''}"
                         " (запропонуй використати, але уточни)")
        for b in mine:
            t = cat.TRIPS_BY_ID.get(b.departure.trip_id, {})
            status = "підтверджена" if b.status == "confirmed" else "чекає підтвердження менеджера"
            lines.append(f"Уже має бронь {b.code}: {t.get('short_title')} {cat.fmt_departure(b.departure.date, t.get('days', 1))}, "
                         f"{b.pax} ос., {status}")
    return "\n".join(lines)


TOOLS = [
    {
        "name": "create_booking_request",
        "description": "Створити заявку на поїздку ПІСЛЯ того, як клієнт підтвердив усі дані словом «так». "
                       "Заявка потрапляє менеджеру, він її підтверджує.",
        "input_schema": {
            "type": "object",
            "properties": {
                "departure_id": {"type": "integer", "description": "departure_id з розділу ДАТИ"},
                "pax": {"type": "integer", "minimum": 1, "maximum": 8},
                "name": {"type": "string"},
                "phone": {"type": "string"},
                "city": {"type": "string", "enum": ["saarland", "trier", "luxembourg", "other"]},
                "address": {"type": "string", "description": "вулиця, будинок, місто"},
                "postcode": {"type": "string", "description": "поштовий індекс, напр. 66111 або L-1234"},
                "district": {"type": "string", "description": "район, якщо клієнт назвав"},
                "comment": {"type": "string", "description": "побажання клієнта, якщо є"},
            },
            "required": ["departure_id", "pax", "name", "phone", "city", "address", "postcode"],
        },
    },
    {
        "name": "handoff_to_manager",
        "description": "Передати розмову живому менеджеру: немає відповіді в даних, скарга, гроші/повернення, "
                       "нестандартне прохання, або клієнт просить людину.",
        "input_schema": {
            "type": "object",
            "properties": {"summary": {"type": "string", "description": "2–3 речення: хто клієнт, що хоче, що вже відомо"}},
            "required": ["summary"],
        },
    },
    {
        "name": "add_to_waitlist",
        "description": "Записати клієнта в лист очікування туру, на який ще немає дат або місць.",
        "input_schema": {
            "type": "object",
            "properties": {"trip_id": {"type": "string", "enum": [t["id"] for t in cat.TRIPS]}},
            "required": ["trip_id"],
        },
    },
]


# ---------- Інструменти ----------

async def _tool_create_booking(bot: Bot, user, args: dict) -> dict:
    from .services import clean_postcode
    city = cat.PICKUP_BY_ID.get(args.get("city", ""), cat.PICKUP_CITIES[-1])["name"]
    if not clean_postcode(args.get("postcode")):
        return {"ok": False, "error": "Потрібен правильний поштовий індекс (4–5 цифр). Уточни в клієнта."}
    try:
        async with Session() as s:
            b = await create_booking(
                s, departure_id=int(args["departure_id"]), pax=int(args["pax"]), seats=None,
                name=str(args["name"]), phone=str(args["phone"]), city=city, address=str(args["address"]),
                user_id=user.id, username=user.username, comment=args.get("comment"), source="ai",
                postcode=args.get("postcode"), district=args.get("district"))
    except BookingError as e:
        return {"ok": False, "error": str(e)}
    except (KeyError, ValueError) as e:
        return {"ok": False, "error": f"Не вистачає даних: {e}"}
    await notify_new_booking(bot, b)
    return {"ok": True, "code": b.code, "total_eur": b.price_total, "seats": b.seat_list,
            "note": "Клієнту вже надіслано картку заявки. Коротко подякуй і скажи, що менеджер підтвердить."}


async def _tool_handoff(bot: Bot, user, args: dict, last_text: str) -> dict:
    who = escape(user.full_name) + (f" @{user.username}" if user.username else "")
    async with Session() as s:
        for admin_id in settings.admin_ids:
            try:
                m = await bot.send_message(
                    admin_id,
                    f"🙋 <b>Помічник передає розмову</b>: {who}\n\n{escape(args.get('summary', ''))}\n\n"
                    f"Останнє повідомлення:\n<i>{escape(last_text[:800])}</i>\n\n"
                    "Натисніть «Відповісти» на це повідомлення — відповідь піде клієнту.")
                s.add(SupportThread(admin_chat_id=admin_id, admin_message_id=m.message_id, user_id=user.id))
            except Exception as e:  # noqa: BLE001
                log.error("handoff: %s", e)
        await s.commit()
    await pause_for(user.id)
    return {"ok": True, "note": "Менеджер отримав розмову і відповість тут. Скажи це клієнту одним реченням."}


async def _tool_waitlist(bot: Bot, user, args: dict) -> dict:
    from .db import WaitlistEntry
    trip = cat.TRIPS_BY_ID.get(args.get("trip_id", ""))
    if not trip:
        return {"ok": False, "error": "Невідомий тур"}
    async with Session() as s:
        exists = await s.scalar(select(WaitlistEntry.id).where(
            WaitlistEntry.trip_id == trip["id"], WaitlistEntry.user_id == user.id))
        if not exists:
            s.add(WaitlistEntry(trip_id=trip["id"], user_id=user.id, name=user.full_name, username=user.username))
            await s.commit()
    await notify_admins(bot, f"🔔 Лист очікування (помічник): {escape(user.full_name)} → {trip['flag']} {escape(trip['short_title'])}")
    return {"ok": True}


# ---------- Головна функція ----------

_client = None


def _get_client():
    global _client
    if _client is None:
        from anthropic import AsyncAnthropic
        _client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


async def _history(user_id: int) -> list[dict]:
    since = utcnow() - timedelta(days=HISTORY_DAYS)
    async with Session() as s:
        rows = list(await s.scalars(
            select(AiTurn).where(AiTurn.user_id == user_id, AiTurn.created_at >= since)
            .order_by(AiTurn.id.desc()).limit(HISTORY_TURNS)))
    rows.reverse()
    msgs: list[dict] = []
    for r in rows:
        if msgs and msgs[-1]["role"] == r.role:
            msgs[-1]["content"] += "\n" + r.text
        else:
            msgs.append({"role": r.role, "content": r.text})
    while msgs and msgs[0]["role"] != "user":
        msgs.pop(0)
    return msgs


async def _save(user_id: int, role: str, text: str) -> None:
    async with Session() as s:
        s.add(AiTurn(user_id=user_id, role=role, text=text[:4000]))
        await s.commit()


async def _over_limit(user_id: int) -> bool:
    since = utcnow() - timedelta(days=1)
    async with Session() as s:
        n = await s.scalar(select(func.count(AiTurn.id)).where(
            AiTurn.user_id == user_id, AiTurn.role == "assistant", AiTurn.created_at >= since))
    return (n or 0) >= DAILY_LIMIT


async def handle(bot: Bot, message: Message) -> bool:
    """Відповісти клієнту. Повертає False, якщо помічник недоступний — тоді питання йде менеджеру."""
    user = message.from_user
    text = (message.text or message.caption or "").strip()
    if not text or not await is_enabled() or await is_paused(user.id) or await _over_limit(user.id):
        return False

    try:
        await bot.send_chat_action(message.chat.id, "typing")
    except Exception:  # noqa: BLE001
        pass

    messages = await _history(user.id)
    messages.append({"role": "user", "content": text})
    system = [
        {"type": "text", "text": _static_prompt(), "cache_control": {"type": "ephemeral"}},
        {"type": "text", "text": await _dynamic_prompt(user.id, user.first_name, user.username)},
    ]

    reply = ""
    try:
        client = _get_client()
        for _ in range(5):  # до 5 кроків із викликом інструментів
            resp = await client.messages.create(model=settings.AI_MODEL, max_tokens=800, system=system,
                                                tools=TOOLS, messages=messages)
            texts = [b.text for b in resp.content if b.type == "text"]
            if resp.stop_reason != "tool_use":
                reply = "\n".join(texts).strip()
                break
            messages.append({"role": "assistant", "content": [b.model_dump(exclude_none=True) for b in resp.content]})
            results = []
            for b in resp.content:
                if b.type != "tool_use":
                    continue
                if b.name == "create_booking_request":
                    out = await _tool_create_booking(bot, user, b.input)
                elif b.name == "handoff_to_manager":
                    out = await _tool_handoff(bot, user, b.input, text)
                elif b.name == "add_to_waitlist":
                    out = await _tool_waitlist(bot, user, b.input)
                else:
                    out = {"ok": False, "error": "unknown tool"}
                log.info("AI tool %s(%s) → %s", b.name, json.dumps(b.input, ensure_ascii=False)[:300], out)
                results.append({"type": "tool_result", "tool_use_id": b.id, "content": json.dumps(out, ensure_ascii=False)})
            messages.append({"role": "user", "content": results})
    except Exception as e:  # noqa: BLE001
        log.error("Помилка ШІ-помічника: %s", e)
        return False

    if not reply:
        return False
    await _save(user.id, "user", text)
    await _save(user.id, "assistant", reply)
    with keep():
        for i in range(0, len(reply), 4000):
            await bot.send_message(message.chat.id, reply[i:i + 4000], parse_mode=None)
    return True
