"""День поїздки: пам'ятка пасажирам, режим водія та Telegram-група поїздки.

Група поїздки. Telegram не дозволяє ботам створювати групи, тому адмін один раз створює 1–3 групи,
додає туди бота адміністратором і пише в групі /trip_group. Далі все автоматично:
• напередодні о 18:00 бот бере вільну групу, перейменовує її під поїздку, публікує програму,
  локації з картами, погоду й поради, і надсилає пасажирам посилання (вступ лише з підтвердженням);
• наступного дня після поїздки о 21:00 бот видаляє всі повідомлення, прибирає учасників,
  повертає назву — і група знову вільна для наступної поїздки.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from html import escape
from urllib.parse import quote

from aiogram import Bot, F, Router
from aiogram.filters import Command, Filter
from aiogram.types import (CallbackQuery, ChatJoinRequest, InlineKeyboardButton as IB, InlineKeyboardMarkup,
                           Message)
from sqlalchemy import select

from .. import catalog as cat
from .. import keyboards as kb
from ..config import settings
from ..db import Booking, Departure, Session, TripGroup
from ..screens import KeepAll, keep
from ..services import (active_bookings, children_text, departure_label, full_address, map_query, maps_link,
                        notify_admins)
from ..weather import weather_text

log = logging.getLogger(__name__)

router = Router(name="tripday")
router.callback_query.middleware(KeepAll())


def is_admin(user_id: int) -> bool:
    return user_id in settings.admin_ids


# ====================================================================================
#  Пам'ятка в день виїзду
# ====================================================================================

def checklist(trip: dict, b: Booking | None = None) -> str:
    items = [
        "🛂 <b>Закордонний паспорт або ID-картка</b> + посвідка на проживання (Aufenthaltstitel). "
        "На кордоні можуть перевірити документи — без них поїхати не вийде!",
    ]
    if b is not None and (b.children or 0) > 0:
        items.append("👶 Документи дітей (паспорт або ID-картка дитини)")
    cur = cat.CURRENCY.get(trip.get("country", ""))
    items.append(f"💶 Готівка: {cur}" if cur else "💶 Трохи готівки в євро (не всюди приймають картки)")
    if b is not None and b.price_total and not b.paid:
        items.append(f"💵 Оплата за поїздку: <b>{b.price_total} €</b> — водію при посадці")
    items += ["📱 Заряджений телефон і павербанк", "👟 Зручне взуття — гулятимемо багато", "🥪 Вода й перекус у дорогу"]
    if trip.get("days", 1) > 1:
        items.append(f"🧳 Речі на {trip['days']} дні, зарядки, ліки, засоби гігієни")
    return "\n".join(items)


async def memo_text(b: Booking, dep: Departure) -> str:
    trip = cat.TRIPS_BY_ID.get(dep.trip_id, {})
    first = escape((b.name or "").split()[0]) if b.name else ""
    lines = [f"☀️ <b>Доброго ранку{', ' + first if first else ''}!</b>",
             f"Сьогодні їдемо: {trip.get('flag', '')} <b>{escape(trip.get('short_title', ''))}</b>", ""]
    if b.pickup_time:
        lines.append(f"🕐 Посадка о <b>{b.pickup_time}</b>")
    lines.append(f"📍 {escape(full_address(b))}")
    lines.append("Водій напише вам, коли виїде, і ще раз — коли буде біля дому.")
    w = await weather_text(trip, dep.date)
    if w:
        lines += ["", w]
    lines += ["", "<b>Не забудьте:</b>", checklist(trip, b), "",
              "Будьте, будь ласка, біля дому за 5 хвилин до посадки 🙏 Гарної поїздки! 🚐"]
    return "\n".join(lines)


async def send_memo(bot: Bot, booking_id: int) -> None:
    from ..db import job_done
    async with Session() as s:
        b = await s.get(Booking, booking_id)
        if not b or not b.user_id or b.status == "cancelled" or b.attend == "no":
            return
        dep = await s.get(Departure, b.departure_id)
        if dep.status == "cancelled" or not await job_done(s, f"memo:{b.id}"):
            return
    text = await memo_text(b, dep)
    try:
        with keep():
            await bot.send_message(b.user_id, text, disable_web_page_preview=True)
    except Exception as e:  # noqa: BLE001
        log.warning("Пам'ятка %s: %s", b.code, e)


# ====================================================================================
#  Режим водія
# ====================================================================================

def _order(dep: Departure) -> list[Booking]:
    items = [b for b in active_bookings(dep) if b.attend != "no"]
    return sorted(items, key=lambda b: (b.pickup_order or 99, b.pickup_time or "99", b.id))


def nav_url(b: Booking) -> str:
    return "https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + quote(map_query(b))


async def driver_view(dep_id: int, focus: int | None = None) -> tuple[str, InlineKeyboardMarkup]:
    async with Session() as s:
        dep = await s.get(Departure, dep_id)
        await s.refresh(dep, ["bookings"])
    order = _order(dep)
    done = [b for b in order if b.boarded]
    pending = [b for b in order if not b.boarded]
    head = [f"🚐 <b>Режим водія</b> · {escape(departure_label(dep))}",
            f"Зупинок: {len(order)} · ✅ сіли: {sum(1 for b in order if b.boarded == 'yes')}"
            f" · ❌ не вийшли: {sum(1 for b in order if b.boarded == 'noshow')}"]
    back = [IB(text="📋 Усі зупинки", callback_data=f"drv:list:{dep_id}"),
            IB(text="⬅️ Рейс", callback_data=kb.AdmCb(action="dep", id=dep_id).pack())]
    if not order:
        return "\n".join(head + ["", "Пасажирів немає."]), InlineKeyboardMarkup(inline_keyboard=[back])

    cur = next((b for b in order if b.id == focus), None) or (pending[0] if pending else None)
    if cur is None:
        seated = sum(b.pax for b in order if b.boarded == "yes")
        lines = head + ["", f"🎉 <b>Усі зібрані!</b> У салоні {seated} ос."]
        noshow = [b for b in order if b.boarded == "noshow"]
        if noshow:
            lines.append("Не вийшли: " + ", ".join(escape(b.name) for b in noshow))
        rows = [[IB(text="📣 Написати в групу: виїжджаємо", callback_data=f"drv:go_all:{dep_id}")], back]
        return "\n".join(lines), InlineKeyboardMarkup(inline_keyboard=rows)

    idx = order.index(cur) + 1
    who = f"<b>{cur.pickup_time + ' · ' if cur.pickup_time else ''}{escape(cur.name)}</b>"
    if cur.username:
        who += f" @{escape(cur.username)}"
    lines = head + ["", f"<b>Зупинка {idx} з {len(order)}</b>", who,
                    f"👥 {cur.pax} ос. · місця {cur.seats}",
                    f'📍 <a href="{maps_link(map_query(cur))}">{escape(full_address(cur))}</a>',
                    f"📞 {escape(cur.phone)}"]
    if cur.children:
        lines.append(children_text(cur))
    if cur.comment:
        lines.append(f"💬 {escape(cur.comment)}")
    lines.append(f"💶 {cur.price_total} € — {'✅ оплачено' if cur.paid else 'ще не оплачено'}")
    if cur.boarded:
        lines.append("Статус: " + ("✅ сів" if cur.boarded == "yes" else "❌ не вийшов"))
    if not cur.user_id:
        lines.append("ℹ️ Пасажир без Telegram — повідомлення не надійдуть, краще зателефонувати.")
    rows = [
        [IB(text="🧭 Навігація", url=nav_url(cur))],
        [IB(text="🚐 Виїхав до вас", callback_data=f"drv:omw:{cur.id}"),
         IB(text="📍 Я на місці", callback_data=f"drv:here:{cur.id}")],
        [IB(text="✅ Сів", callback_data=f"drv:in:{cur.id}"),
         IB(text="❌ Не вийшов", callback_data=f"drv:no:{cur.id}")],
        [IB(text="💶 Зняти «оплачено»" if cur.paid else "💶 Оплатив", callback_data=f"drv:paid:{cur.id}")],
        back,
    ]
    return "\n".join(lines), InlineKeyboardMarkup(inline_keyboard=rows)


async def driver_list(dep_id: int) -> tuple[str, InlineKeyboardMarkup]:
    async with Session() as s:
        dep = await s.get(Departure, dep_id)
        await s.refresh(dep, ["bookings"])
    icon = {"yes": "✅", "noshow": "❌", None: "⏳"}
    rows = [[IB(text=f"{icon[b.boarded]} {b.pickup_time or ''} {b.name}"[:60], callback_data=f"drv:at:{b.id}")]
            for b in _order(dep)]
    rows.append([IB(text="⬅️ Режим водія", callback_data=f"drv:open:{dep_id}")])
    return (f"📋 <b>Зупинки</b> · {escape(departure_label(dep))}\nНатисніть, щоб відкрити зупинку.",
            InlineKeyboardMarkup(inline_keyboard=rows))


async def _tell(bot: Bot, b: Booking, text: str) -> bool:
    if not b.user_id:
        return False
    try:
        with keep():
            await bot.send_message(b.user_id, text)
        return True
    except Exception as e:  # noqa: BLE001
        log.warning("Водій → %s: %s", b.code, e)
        return False


@router.callback_query(F.data.startswith("drv:"))
async def cb_driver(callback: CallbackQuery, bot: Bot):
    if not is_admin(callback.from_user.id):
        return await callback.answer()
    _, action, raw = callback.data.split(":")
    obj_id = int(raw)
    answered = False
    if action in ("open", "list", "go_all"):
        dep_id, focus = obj_id, None
    else:
        async with Session() as s:
            b = await s.get(Booking, obj_id)
            if not b:
                return await callback.answer("Бронювання не знайдено", show_alert=True)
            dep_id, focus = b.departure_id, b.id
            trip = cat.TRIPS_BY_ID.get((await s.get(Departure, b.departure_id)).trip_id, {})
            note = None
            if action == "omw":
                eta = f" Орієнтовно буде о <b>{b.pickup_time}</b>." if b.pickup_time else " Буде за кілька хвилин."
                ok = await _tell(bot, b, f"🚐 <b>Водій виїхав до вас!</b>{eta}\nБудьте, будь ласка, готові біля дому 🙏")
                note = "Пасажиру надіслано ✅" if ok else "Пасажир без Telegram — зателефонуйте"
            elif action == "here":
                ok = await _tell(bot, b, "📍 <b>Водій уже біля вашого дому</b> і чекає на вас 🚐")
                note = "Пасажиру надіслано ✅" if ok else "Пасажир без Telegram — зателефонуйте"
            elif action in ("in", "no"):
                b.boarded = "yes" if action == "in" else "noshow"
                await s.commit()
                focus = None  # одразу до наступної зупинки
                if action == "in":
                    await _tell(bot, b, f"Ласкаво просимо на борт! 🚐 Гарної поїздки до {trip.get('flag', '')} "
                                        f"{escape(trip.get('short_title', ''))}")
            elif action == "paid":
                b.paid = 0 if b.paid else 1
                await s.commit()
            elif action == "at":
                pass
        if note:
            await callback.answer(note)
            answered = True
    if action == "list":
        text, markup = await driver_list(dep_id)
    elif action == "go_all":
        posted = await post_to_group(bot, dep_id, "🚐 <b>Усі в зборі — виїжджаємо!</b>\n"
                                                  "Зручно вмощуйтеся, найближча зупинка — за планом 🙂")
        await callback.answer("Опубліковано в групі поїздки ✅" if posted else "Групи поїздки немає", show_alert=not posted)
        answered = True
        text, markup = await driver_view(dep_id)
    else:
        text, markup = await driver_view(dep_id, focus)
    try:
        await callback.message.edit_text(text, reply_markup=markup, disable_web_page_preview=True)
    except Exception:  # noqa: BLE001 — текст не змінився
        pass
    if not answered:
        await callback.answer()


async def morning_driver(bot: Bot, dep_id: int) -> None:
    """Зранку в день поїздки адмін отримує кнопку «Режим водія»."""
    from ..db import job_done
    async with Session() as s:
        dep = await s.get(Departure, dep_id)
        if not dep or dep.status == "cancelled" or not await job_done(s, f"driver:{dep_id}"):
            return
        await s.refresh(dep, ["bookings"])
    order = _order(dep)
    if not order:
        return
    pax = sum(b.pax for b in order)
    first = order[0]
    await notify_admins(bot, (
        f"🌅 <b>Доброго ранку! Сьогодні поїздка</b>\n{escape(departure_label(dep))}\n"
        f"Пасажирів: {pax} · зупинок: {len(order)}\n"
        f"Перша: {first.pickup_time or ''} {escape(first.name)} — {escape(full_address(first))}"),
        InlineKeyboardMarkup(inline_keyboard=[[IB(text="▶️ Режим водія", callback_data=f"drv:open:{dep_id}")]]))


# ====================================================================================
#  Групи поїздок
# ====================================================================================

_pool: set[int] | None = None


async def pool() -> set[int]:
    global _pool
    if _pool is None:
        async with Session() as s:
            _pool = set(await s.scalars(select(TripGroup.chat_id)))
    return _pool


class InPool(Filter):
    async def __call__(self, event) -> bool:
        chat = getattr(event, "chat", None)
        return chat is not None and chat.id in await pool()


NEED_RIGHTS = {"can_delete_messages": "видаляти повідомлення", "can_restrict_members": "блокувати учасників",
               "can_invite_users": "запрошувати через посилання", "can_pin_messages": "закріплювати повідомлення",
               "can_change_info": "змінювати інформацію групи"}

HOW_TO = (
    "<b>Як підготувати групу поїздки (один раз):</b>\n"
    "1. У Telegram: ✏️ → «Нова група», назва будь-яка (наприклад «SVOI поїздка 1»), додайте цього бота.\n"
    "2. Налаштування групи → «Історія чату для нових учасників» → <b>Видима</b> "
    "(так група стане супергрупою — бот зможе прибирати старі повідомлення).\n"
    "3. Налаштування → Адміністратори → додайте бота й увімкніть усі права.\n"
    "4. Напишіть у групі команду <code>/trip_group</code>.\n\n"
    "Зробіть 2–3 такі групи, якщо поїздки бувають у сусідні дні."
)


@router.message(Command("trip_group"), F.chat.type.in_({"group", "supergroup"}))
async def cmd_trip_group(message: Message, bot: Bot):
    if not message.from_user or not is_admin(message.from_user.id):
        return
    chat = message.chat
    if chat.type != "supergroup":
        return await message.reply("⚠️ Це ще звичайна група. Відкрийте налаштування групи → «Історія чату для нових "
                                   "учасників» → «Видима», а потім знову напишіть /trip_group")
    me = await bot.get_chat_member(chat.id, bot.id)
    missing = [txt for key, txt in NEED_RIGHTS.items() if not getattr(me, key, False)]
    if me.status != "administrator" or missing:
        return await message.reply("⚠️ Зробіть бота адміністратором і дайте права: " + ", ".join(missing or NEED_RIGHTS.values()))
    async with Session() as s:
        row = await s.get(TripGroup, chat.id)
        if not row:
            s.add(TripGroup(chat_id=chat.id, title=chat.title or ""))
            await s.commit()
        free = len([g for g in await s.scalars(select(TripGroup)) if not g.departure_id])
    (await pool()).add(chat.id)
    await message.reply(f"✅ Групу додано. Напередодні поїздки я сам підготую її для пасажирів, а після поїздки — очищу.\n"
                        f"Вільних груп зараз: {free}")


@router.message(Command("trip_group_off"), F.chat.type.in_({"group", "supergroup"}))
async def cmd_trip_group_off(message: Message):
    if not message.from_user or not is_admin(message.from_user.id):
        return
    async with Session() as s:
        row = await s.get(TripGroup, message.chat.id)
        if row and row.departure_id:
            return await message.reply("Група зараз зайнята поїздкою — відключу після її завершення.")
        if row:
            await s.delete(row)
            await s.commit()
    (await pool()).discard(message.chat.id)
    await message.reply("Групу прибрано зі списку груп поїздок.")


def _add_member(row: TripGroup, user_id: int) -> None:
    ids = {x for x in (row.members or "").split(",") if x}
    ids.add(str(user_id))
    row.members = ",".join(sorted(ids))


@router.message(InPool(), F.new_chat_members)
async def on_pool_join(message: Message):
    async with Session() as s:
        row = await s.get(TripGroup, message.chat.id)
        if row:
            for u in message.new_chat_members:
                if not u.is_bot:
                    _add_member(row, u.id)
            await s.commit()
    try:
        await message.delete()
    except Exception:  # noqa: BLE001
        pass


@router.message(InPool(), F.left_chat_member | F.new_chat_title | F.pinned_message | F.new_chat_photo)
async def on_pool_service(message: Message):
    try:
        await message.delete()
    except Exception:  # noqa: BLE001
        pass


@router.message(InPool())
async def on_pool_message(message: Message):
    """Звичайні повідомлення в групі поїздки — бот мовчить (не вітається, як у загальній групі)."""


async def _passenger_ids(dep_id: int) -> set[int]:
    async with Session() as s:
        rows = await s.scalars(select(Booking.user_id).where(
            Booking.departure_id == dep_id, Booking.status != "cancelled", Booking.user_id.is_not(None)))
        return set(rows)


@router.chat_join_request(InPool())
async def on_join_request(req: ChatJoinRequest, bot: Bot):
    async with Session() as s:
        row = await s.get(TripGroup, req.chat.id)
    if not row or not row.departure_id:
        return await req.decline()
    if req.from_user.id in await _passenger_ids(row.departure_id) or is_admin(req.from_user.id):
        await req.approve()
        async with Session() as s:
            row = await s.get(TripGroup, req.chat.id)
            _add_member(row, req.from_user.id)
            await s.commit()
        return
    u = req.from_user
    await notify_admins(bot, f"👥 Хоче вступити в групу поїздки «{escape(req.chat.title or '')}»: "
                             f"{escape(u.full_name)}{' @' + u.username if u.username else ''}\n"
                             "Його немає серед пасажирів з Telegram. Пустити?",
                        InlineKeyboardMarkup(inline_keyboard=[[
                            IB(text="✅ Пустити", callback_data=f"tgj:ok:{req.chat.id}:{u.id}"),
                            IB(text="❌ Відхилити", callback_data=f"tgj:no:{req.chat.id}:{u.id}")]]))


@router.callback_query(F.data.startswith("tgj:"))
async def cb_join_decision(callback: CallbackQuery, bot: Bot):
    if not is_admin(callback.from_user.id):
        return await callback.answer()
    _, action, chat_id, user_id = callback.data.split(":")
    chat_id, user_id = int(chat_id), int(user_id)
    try:
        if action == "ok":
            await bot.approve_chat_join_request(chat_id, user_id)
            async with Session() as s:
                row = await s.get(TripGroup, chat_id)
                if row:
                    _add_member(row, user_id)
                    await s.commit()
        else:
            await bot.decline_chat_join_request(chat_id, user_id)
        await callback.answer("Готово ✅")
    except Exception:  # noqa: BLE001
        await callback.answer("Запит уже неактивний", show_alert=True)
    await callback.message.edit_reply_markup(reply_markup=None)


# ---------- Тексти для групи ----------

def guide_messages(trip: dict, dep: Departure, weather: str) -> list[str]:
    g = cat.GUIDES.get(trip["id"], {})
    msgs = []
    head = [f"🚐 <b>Вітаємо в групі поїздки!</b>",
            f"{trip['flag']} <b>{escape(trip['title'])}</b>",
            f"📅 {cat.fmt_departure(dep.date, trip.get('days', 1))}", "",
            "Тут — програма, усі локації з картами, поради й погода. "
            "Водій напише сюди, коли ми на місці, а також час і місце збору.", ""]
    if trip.get("program"):
        head.append("<b>🗓 Програма</b>")
        head += [f"• {escape(p)}" for p in trip["program"]]
    if dep.note:
        head += ["", f"📝 {escape(dep.note)}"]
    if weather:
        head += ["", weather]
    head += ["", "<b>🎒 Не забудьте</b>", checklist(trip)]
    msgs.append("\n".join(head))
    for part in g.get("parts", []):
        lines = [f"📍 <b>{escape(part['title'])}</b>"]
        for i, (name, query, tip) in enumerate(part["sights"], 1):
            lines.append(f'{i}. <a href="{maps_link(query)}">{escape(name)}</a> — {escape(tip)}')
        msgs.append("\n".join(lines))
    tail = []
    if g.get("food"):
        tail += ["🍽 <b>Що скуштувати</b>", escape(g["food"]), ""]
    if g.get("tips"):
        tail += ["💡 <b>Корисно знати</b>", escape(g["tips"]), ""]
    tail += ["⏰ <b>Час і місце збору</b> водій напише тут, щойно приїдемо. Не запізнюйтесь, будь ласка — "
             "ми чекаємо всіх 🙏",
             f"Загубилися або є питання — пишіть сюди або менеджеру @{escape(settings.MANAGER_USERNAME.lstrip('@'))}"]
    msgs.append("\n".join(tail))
    # Telegram: не більше 4096 символів у повідомленні
    out = []
    for m in msgs:
        while len(m) > 4000:
            cut = m.rfind("\n", 0, 4000)
            out.append(m[:cut])
            m = m[cut + 1:]
        out.append(m)
    return out


def group_title(trip: dict, dep: Departure) -> str:
    return f"🚐 SVOI · {trip['short_title']} · {dep.date.strftime('%d.%m')}"[:128]


async def open_trip_group(bot: Bot, dep_id: int) -> str | None:
    """Взяти вільну групу під рейс. Повертає посилання-запрошення або None."""
    async with Session() as s:
        dep = await s.get(Departure, dep_id)
        if not dep or dep.status == "cancelled":
            return None
        row = await s.scalar(select(TripGroup).where(TripGroup.departure_id == dep_id))
        if row and row.invite_link:
            return row.invite_link
        row = await s.scalar(select(TripGroup).where(TripGroup.departure_id.is_(None)).order_by(TripGroup.updated_at))
        if not row:
            return None
        row.departure_id = dep_id
        await s.commit()
        chat_id = row.chat_id
        await s.refresh(dep, ["bookings"])
    trip = cat.TRIPS_BY_ID[dep.trip_id]
    end = dep.date + timedelta(days=trip.get("days", 1) - 1)
    weather = await weather_text(trip, dep.date)
    try:
        await bot.set_chat_title(chat_id, group_title(trip, dep))
        try:
            await bot.set_chat_description(chat_id, f"{trip['title']} · {cat.fmt_departure(dep.date, trip.get('days', 1))}. "
                                                     "Група діє до наступного дня після поїздки."[:255])
        except Exception:  # noqa: BLE001 — опис той самий
            pass
        first_id = None
        with keep():
            for i, text in enumerate(guide_messages(trip, dep, weather)):
                m = await bot.send_message(chat_id, text, disable_web_page_preview=True)
                if i == 0:
                    first_id = m.message_id
                    await bot.pin_chat_message(chat_id, m.message_id, disable_notification=True)
        expire = datetime(end.year, end.month, end.day, 23, 59, tzinfo=cat.TZ) + timedelta(days=1)
        link = await bot.create_chat_invite_link(chat_id, name=group_title(trip, dep)[:32], expire_date=expire,
                                                 creates_join_request=True)
    except Exception as e:  # noqa: BLE001
        log.exception("Група поїздки %s", dep_id)
        await notify_admins(bot, f"⚠️ Не вдалося підготувати групу поїздки: {escape(str(e))}\n\n{HOW_TO}")
        async with Session() as s:
            row = await s.get(TripGroup, chat_id)
            row.departure_id = None
            await s.commit()
        return None
    async with Session() as s:
        row = await s.get(TripGroup, chat_id)
        row.invite_link, row.first_message_id, row.members = link.invite_link, first_id, ""
        await s.commit()

    markup = InlineKeyboardMarkup(inline_keyboard=[[IB(text="👥 Приєднатися до групи", url=link.invite_link)]])
    sent = 0
    for b in active_bookings(dep):
        if not b.user_id or b.attend == "no":
            continue
        try:
            with keep():
                await bot.send_message(
                    b.user_id,
                    f"👥 <b>Група поїздки</b> {trip['flag']} {escape(trip['short_title'])}\n\n"
                    "Там уже є програма, усі локації з картами, погода й поради, куди піти. "
                    "Водій напише в групу, коли ми на місці, і час збору.\n\n"
                    "Натисніть кнопку й надішліть запит — я одразу вас пущу 🙂",
                    reply_markup=markup)
            sent += 1
        except Exception as e:  # noqa: BLE001
            log.warning("Посилання на групу %s: %s", b.code, e)
    no_tg = [b for b in active_bookings(dep) if not b.user_id and b.attend != "no"]
    extra = ""
    if no_tg:
        extra = ("\n\nБез Telegram (надішліть їм посилання самі, запит підтвердите кнопкою): "
                 + ", ".join(escape(b.name) for b in no_tg))
    await notify_admins(bot, f"👥 Група поїздки готова: {escape(departure_label(dep))}\n"
                             f"Посилання надіслано {sent} пасажирам.\n{link.invite_link}{extra}")
    return link.invite_link


async def close_trip_group(bot: Bot, chat_id: int) -> None:
    """Після поїздки: видалити повідомлення, прибрати учасників, повернути назву — група знову вільна."""
    async with Session() as s:
        row = await s.get(TripGroup, chat_id)
        if not row or not row.departure_id:
            return
        link, first, members, title = row.invite_link, row.first_message_id, row.members, row.title
    if link:
        try:
            await bot.revoke_chat_invite_link(chat_id, link)
        except Exception:  # noqa: BLE001
            pass
    for uid in {int(x) for x in (members or "").split(",") if x}:
        if is_admin(uid):
            continue
        try:
            await bot.ban_chat_member(chat_id, uid)
            await bot.unban_chat_member(chat_id, uid, only_if_banned=True)
        except Exception as e:  # noqa: BLE001
            log.info("Прибрати %s з групи: %s", uid, e)
    try:
        with keep():
            last = await bot.send_message(chat_id, "🧹 Поїздку завершено. Дякуємо всім! Групу очищено.")
        start = max((first or last.message_id) - 5, 1)
        ids = list(range(start, last.message_id + 1))
        for i in range(0, len(ids), 100):
            try:
                await bot.delete_messages(chat_id, ids[i:i + 100])
            except Exception as e:  # noqa: BLE001
                log.info("Видалення повідомлень: %s", e)
        try:
            await bot.unpin_all_chat_messages(chat_id)
        except Exception:  # noqa: BLE001
            pass
        await bot.set_chat_title(chat_id, title or "SVOI · група поїздки")
        try:
            await bot.set_chat_description(chat_id, "")
        except Exception:  # noqa: BLE001
            pass
    except Exception as e:  # noqa: BLE001
        log.warning("Очищення групи %s: %s", chat_id, e)
    async with Session() as s:
        row = await s.get(TripGroup, chat_id)
        row.departure_id, row.invite_link, row.first_message_id, row.members = None, None, None, None
        await s.commit()


async def post_to_group(bot: Bot, dep_id: int, text: str) -> bool:
    async with Session() as s:
        row = await s.scalar(select(TripGroup).where(TripGroup.departure_id == dep_id))
    if not row:
        return False
    try:
        with keep():
            await bot.send_message(row.chat_id, text)
        return True
    except Exception as e:  # noqa: BLE001
        log.warning("Повідомлення в групу: %s", e)
        return False


# ---------- Кнопки адміна ----------

async def groups_view() -> tuple[str, InlineKeyboardMarkup]:
    async with Session() as s:
        rows = list(await s.scalars(select(TripGroup)))
        deps = {d.id: d for d in await s.scalars(select(Departure).where(
            Departure.id.in_([r.departure_id for r in rows if r.departure_id] or [0])))}
    lines = ["👥 <b>Групи поїздок</b>", ""]
    if rows:
        for r in rows:
            dep = deps.get(r.departure_id)
            state = f"зайнята: {escape(departure_label(dep))}" if dep else "вільна ✅"
            lines.append(f"• {escape(r.title or str(r.chat_id))} — {state}")
        lines.append("")
    else:
        lines += ["Поки що немає жодної групи.", ""]
    lines.append(HOW_TO)
    return "\n".join(lines), InlineKeyboardMarkup(inline_keyboard=[[
        IB(text="⬅️ Адмін-меню", callback_data=kb.AdmCb(action="menu").pack())]])


@router.callback_query(kb.AdmCb.filter(F.action == "tgroups"))
async def cb_groups(callback: CallbackQuery):
    if not is_admin(callback.from_user.id):
        return await callback.answer()
    await callback.answer()
    text, markup = await groups_view()
    await callback.message.edit_text(text, reply_markup=markup)


@router.callback_query(F.data.startswith("tg:"))
async def cb_group_actions(callback: CallbackQuery, bot: Bot):
    if not is_admin(callback.from_user.id):
        return await callback.answer()
    _, action, raw = callback.data.split(":")
    dep_id = int(raw)
    if action == "info":
        await callback.answer()
        async with Session() as s:
            dep = await s.get(Departure, dep_id)
            row = await s.scalar(select(TripGroup).where(TripGroup.departure_id == dep_id))
        text = (f"👥 <b>Група поїздки</b> · {escape(departure_label(dep))}\n\n"
                + ("Група готова, пасажири отримали посилання." if row else
                   "Група створюється автоматично напередодні о 18:00. Можна створити й зараз.")
                + "\nПісля поїздки, наступного дня о 21:00, група очищується сама.")
        rows = await group_buttons(dep_id) + [[IB(text="⬅️ Рейс", callback_data=kb.AdmCb(action="dep", id=dep_id).pack())]]
        await callback.message.edit_text(text, reply_markup=InlineKeyboardMarkup(inline_keyboard=rows))
        return
    if action == "open":
        await callback.answer("Готую групу…")
        link = await open_trip_group(bot, dep_id)
        if not link:
            await notify_admins(bot, "⚠️ Немає вільної групи поїздки.\n\n" + HOW_TO)
    elif action == "close":
        async with Session() as s:
            row = await s.scalar(select(TripGroup).where(TripGroup.departure_id == dep_id))
        if row:
            await callback.answer("Очищую групу…")
            await close_trip_group(bot, row.chat_id)
            await notify_admins(bot, "🧹 Групу поїздки очищено, вона знову вільна.")
        else:
            await callback.answer("Для цього рейсу групи немає", show_alert=True)


async def group_buttons(dep_id: int) -> list[list[IB]]:
    async with Session() as s:
        row = await s.scalar(select(TripGroup).where(TripGroup.departure_id == dep_id))
    if row and row.invite_link:
        return [[IB(text="👥 Група поїздки", url=row.invite_link),
                 IB(text="🧹 Очистити групу", callback_data=f"tg:close:{dep_id}")]]
    return [[IB(text="👥 Створити групу поїздки зараз", callback_data=f"tg:open:{dep_id}")]]


def trip_end(dep: Departure) -> date:
    return dep.date + timedelta(days=cat.TRIPS_BY_ID.get(dep.trip_id, {}).get("days", 1) - 1)
