"""Адмін: маршрут збору й час посадки, оплата, статистика, модерація відгуків."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from html import escape

from aiogram import Bot, F, Router
from aiogram.filters.callback_data import CallbackData
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, InlineKeyboardButton as IB, InlineKeyboardMarkup, Message
from sqlalchemy import func, select

from .. import catalog as cat
from .. import keyboards as kb
from ..ai import get_setting, set_setting
from ..config import settings
from ..db import (Booking, BotUser, DateRequest, Departure, Review, Session, utcnow)
from ..route import RouteError, Stop, build_plan
from ..screens import KeepAll, keep
from ..services import active_bookings, departure_label, full_address, load_booking, map_query

log = logging.getLogger(__name__)
router = Router(name="ops")
router.message.middleware(KeepAll())
router.callback_query.middleware(KeepAll())


class OpsCb(CallbackData, prefix="o"):
    action: str
    id: int = 0


class OpsState(StatesGroup):
    home = State()
    arrive = State()
    destination = State()


def _admin(user_id: int) -> bool:
    return user_id in settings.admin_ids


# ---------- Маршрут ----------

def dep_destination(dep: Departure) -> str:
    return dep.destination or cat.TRIPS_BY_ID.get(dep.trip_id, {}).get("destination") or dep.trip_id


def dep_arrive_dt(dep: Departure) -> datetime:
    hh, mm = (dep.arrive_time or settings.ARRIVE_TIME).split(":")
    return datetime(dep.date.year, dep.date.month, dep.date.day, int(hh), int(mm), tzinfo=cat.TZ)


async def home_address() -> str:
    return await get_setting("home_address", settings.HOME_ADDRESS)


REGION_HINT = {"Саарланд": "Saarland, Deutschland", "Трір": "Trier, Deutschland", "Люксембург": "Luxembourg"}


def map_address(address: str, city: str) -> str:
    """Додає до адреси регіон латиницею, якщо клієнт не вказав місто (для точного пошуку на карті)."""
    hint = REGION_HINT.get(city)
    low = address.lower()
    if not hint or any(w in low for w in ("saar", "trier", "luxem", "lëtz", "deutschland", "germany")):
        return address
    return f"{address}, {hint}"


def _hm(dt: datetime) -> str:
    return dt.astimezone(cat.TZ).strftime("%H:%M")


_plans: dict[int, object] = {}  # останній розрахований маршрут для кожного рейсу (до затвердження)


def route_kb(dep_id: int, maps_url: str | None) -> InlineKeyboardMarkup:
    rows = []
    if maps_url:
        rows.append([IB(text="✅ Затвердити й надіслати час пасажирам", callback_data=OpsCb(action="approve", id=dep_id).pack())])
        rows.append([IB(text="🗺 Відкрити маршрут у Google Maps", url=maps_url)])
    rows += [
        [IB(text="🕚 Час прибуття", callback_data=OpsCb(action="arrive", id=dep_id).pack()),
         IB(text="📍 Пункт призначення", callback_data=OpsCb(action="dest", id=dep_id).pack())],
        [IB(text="🏠 Моя адреса виїзду", callback_data=OpsCb(action="home", id=dep_id).pack()),
         IB(text="🔄 Перерахувати", callback_data=OpsCb(action="route", id=dep_id).pack())],
        [IB(text="⬅️ До рейсу", callback_data=kb.AdmCb(action="dep", id=dep_id).pack())],
    ]
    return InlineKeyboardMarkup(inline_keyboard=rows)


async def render_route(dep_id: int) -> tuple[str, InlineKeyboardMarkup]:
    async with Session() as s:
        dep = await s.get(Departure, dep_id)
        bookings = active_bookings(dep)
        label, dest, arrive = departure_label(dep), dep_destination(dep), dep_arrive_dt(dep)
    home = await home_address()
    head = (f"🗺 <b>Маршрут збору</b>\n{escape(label)}\n\n"
            f"🏠 Виїзд: {escape(home) if home else '<i>не вказано</i>'}\n"
            f"🏁 Куди: {escape(dest)}\n🕚 Бути на місці: <b>{arrive.strftime('%H:%M')}</b>\n")
    if not home:
        return head + "\nСпершу вкажіть адресу, звідки ви виїжджаєте 👇", route_kb(dep_id, None)
    stops = [Stop(b.id, b.name, map_address(map_query(b), b.city), b.pax, b.phone) for b in bookings]
    try:
        plan = await build_plan(home, stops, dest, arrive)
    except RouteError as e:
        return head + f"\n❌ {escape(str(e))}", route_kb(dep_id, None)
    except Exception as e:  # noqa: BLE001
        log.exception("Маршрут")
        return head + f"\n❌ Сервіс карт не відповів ({escape(type(e).__name__)}). Спробуйте ще раз.", route_kb(dep_id, None)
    _plans[dep_id] = plan
    lines = [head, f"🚐 <b>{_hm(plan.start_time)}</b> — виїзд із дому"]
    for i, (st, t) in enumerate(zip(plan.stops, plan.pickup_times), 1):
        lines.append(f"{i}. <b>{_hm(t)}</b> — {escape(st.name)} ({st.pax} ос.)\n    {escape(st.address)} · {plan.legs_min[i - 1]} хв їзди")
    drive_h, drive_m = divmod(plan.legs_min[-1], 60)
    lines.append(f"🛣 Далі {drive_h} год {drive_m} хв до місця"
                 + (f", зупинок у дорозі: {plan.breaks} × {settings.BREAK_MINUTES} хв" if plan.breaks else ""))
    lines.append(f"🏁 <b>{_hm(plan.arrive_time)}</b> — на місці (запас {plan.buffer_min} хв)")
    lines.append("\n" + ("Розраховано Google Maps з урахуванням заторів." if plan.provider == "google" else
                         "Розраховано за OpenStreetMap (безкоштовно, без урахування заторів). "
                         "Рано вранці заторів майже немає, тож розрахунок близький до реального."))
    lines += plan.warnings
    return "\n".join(lines), route_kb(dep_id, plan.maps_url)


@router.callback_query(OpsCb.filter(F.action == "route"))
async def cb_route(callback: CallbackQuery, callback_data: OpsCb):
    if not _admin(callback.from_user.id):
        return await callback.answer()
    await callback.answer("Рахую маршрут…")
    msg = await callback.message.answer("⏳ Рахую найкращий маршрут… (до 30 секунд)")
    text, markup = await render_route(callback_data.id)
    await msg.edit_text(text, reply_markup=markup, disable_web_page_preview=True)


@router.callback_query(OpsCb.filter(F.action == "approve"))
async def cb_approve(callback: CallbackQuery, callback_data: OpsCb, bot: Bot):
    if not _admin(callback.from_user.id):
        return await callback.answer()
    plan = _plans.get(callback_data.id)
    if not plan:
        return await callback.answer("Маршрут застарів — натисніть «Перерахувати»", show_alert=True)
    sent = 0
    async with Session() as s:
        dep = await s.get(Departure, callback_data.id)
        by_id = {b.id: b for b in active_bookings(dep)}
        if set(by_id) != {st.booking_id for st in plan.stops}:
            return await callback.answer("Склад пасажирів змінився — натисніть «Перерахувати»", show_alert=True)
        for order, (st, t) in enumerate(zip(plan.stops, plan.pickup_times), 1):
            b = by_id[st.booking_id]
            b.pickup_time, b.pickup_order = _hm(t), order
        dep.start_time = _hm(plan.start_time)
        dep.route_summary = plan.maps_url
        await s.commit()
        trip = cat.TRIPS_BY_ID.get(dep.trip_id, {})
        for b in by_id.values():
            if not b.user_id:
                continue
            try:
                with keep():
                    await bot.send_message(
                        b.user_id,
                        f"🚐 <b>Час посадки на поїздку {trip.get('flag', '')} {escape(trip.get('short_title', ''))}</b>\n"
                        f"📅 {cat.fmt_departure(dep.date, trip.get('days', 1))}\n"
                        f"🕐 Заберемо вас о <b>{b.pickup_time}</b>\n📍 {escape(full_address(b))}\n\n"
                        "Будь ласка, будьте готові за 5 хвилин. Якщо щось зміниться — напишемо тут.")
                sent += 1
            except Exception as e:  # noqa: BLE001
                log.warning("Час посадки клієнту: %s", e)
    no_tg = [b for b in by_id.values() if not b.user_id]
    await callback.answer("Затверджено ✅")
    text = f"✅ Маршрут затверджено. Час надіслано {sent} пасажирам."
    if no_tg:
        text += "\nБез Telegram (зателефонуйте): " + ", ".join(
            f"{escape(b.name)} {b.pickup_time} <code>{escape(b.phone)}</code>" for b in no_tg)
    await callback.message.answer(text)
    from ..jobs import replan
    await replan(bot, callback_data.id)  # пам'ятки в день поїздки — під новий час посадки


@router.callback_query(OpsCb.filter(F.action.in_({"home", "arrive", "dest"})))
async def cb_route_settings(callback: CallbackQuery, callback_data: OpsCb, state: FSMContext):
    if not _admin(callback.from_user.id):
        return await callback.answer()
    await callback.answer()
    await state.update_data(dep_id=callback_data.id)
    if callback_data.action == "home":
        await state.set_state(OpsState.home)
        current = await home_address()
        return await callback.message.answer(
            f"🏠 Напишіть адресу, звідки ви виїжджаєте (вулиця, будинок, місто).\nЗараз: {escape(current) or '—'}\n/cancel — скасувати")
    if callback_data.action == "arrive":
        await state.set_state(OpsState.arrive)
        return await callback.message.answer("🕚 На котру треба бути на місці? Напишіть, наприклад: <code>11:00</code>")
    await state.set_state(OpsState.destination)
    await callback.message.answer("📍 Напишіть адресу або назву місця прибуття (наприклад: <i>Château de Versailles</i>)")


@router.message(OpsState.home, F.text, ~F.text.startswith("/"))
async def msg_home(message: Message, state: FSMContext):
    if not _admin(message.from_user.id):
        return
    data = await state.get_data()
    await state.clear()
    await set_setting("home_address", message.text.strip()[:250])
    msg = await message.answer("✅ Адресу збережено. Рахую маршрут…")
    text, markup = await render_route(data["dep_id"])
    await msg.edit_text(text, reply_markup=markup, disable_web_page_preview=True)


@router.message(OpsState.arrive, F.text, ~F.text.startswith("/"))
async def msg_arrive(message: Message, state: FSMContext):
    if not _admin(message.from_user.id):
        return
    raw = message.text.strip().replace(".", ":").replace(" ", "")
    try:
        hh, mm = raw.split(":") if ":" in raw else (raw, "00")
        value = f"{int(hh):02d}:{int(mm):02d}"
        datetime.strptime(value, "%H:%M")
    except ValueError:
        return await message.answer("Формат: <code>11:00</code>")
    data = await state.get_data()
    await state.clear()
    async with Session() as s:
        dep = await s.get(Departure, data["dep_id"])
        dep.arrive_time = value
        await s.commit()
    msg = await message.answer(f"✅ Прибуття о {value}. Рахую маршрут…")
    text, markup = await render_route(data["dep_id"])
    await msg.edit_text(text, reply_markup=markup, disable_web_page_preview=True)


@router.message(OpsState.destination, F.text, ~F.text.startswith("/"))
async def msg_destination(message: Message, state: FSMContext):
    if not _admin(message.from_user.id):
        return
    data = await state.get_data()
    await state.clear()
    async with Session() as s:
        dep = await s.get(Departure, data["dep_id"])
        dep.destination = message.text.strip()[:250]
        await s.commit()
    msg = await message.answer("✅ Збережено. Рахую маршрут…")
    text, markup = await render_route(data["dep_id"])
    await msg.edit_text(text, reply_markup=markup, disable_web_page_preview=True)


# ---------- Оплата ----------

@router.callback_query(OpsCb.filter(F.action == "paid"))
async def cb_paid(callback: CallbackQuery, callback_data: OpsCb):
    if not _admin(callback.from_user.id):
        return await callback.answer()
    from ..services import booking_admin_text
    async with Session() as s:
        b = await load_booking(s, callback_data.id)
        b.paid = 0 if b.paid else 1
        await s.commit()
        await callback.answer("💶 Оплачено" if b.paid else "Позначку оплати знято")
        await callback.message.edit_text(booking_admin_text(b, "📋 Бронь"), reply_markup=kb.admin_booking_kb(b))


# ---------- Статистика ----------

@router.callback_query(kb.AdmCb.filter(F.action == "stats"))
async def cb_stats(callback: CallbackQuery):
    if not _admin(callback.from_user.id):
        return await callback.answer()
    await callback.answer()
    now = utcnow()
    d7, d30 = now - timedelta(days=7), now - timedelta(days=30)
    async with Session() as s:
        users = await s.scalar(select(func.count(BotUser.user_id))) or 0
        users7 = await s.scalar(select(func.count(BotUser.user_id)).where(BotUser.first_seen >= d7)) or 0
        users30 = await s.scalar(select(func.count(BotUser.user_id)).where(BotUser.first_seen >= d30)) or 0
        referred = await s.scalar(select(func.count(BotUser.user_id)).where(BotUser.referred_by.is_not(None))) or 0
        bookers = await s.scalar(select(func.count(func.distinct(Booking.user_id))).where(Booking.status != "cancelled")) or 0
        rows = (await s.execute(select(Booking.status, func.count(Booking.id), func.coalesce(func.sum(Booking.pax), 0))
                                .group_by(Booking.status))).all()
        by_status = {st: (n, pax) for st, n, pax in rows}
        last30 = await s.scalar(select(func.count(Booking.id)).where(Booking.created_at >= d30)) or 0
        future_money = await s.scalar(select(func.coalesce(func.sum(Booking.price_total), 0)).join(Departure)
                                      .where(Booking.status != "cancelled", Departure.date >= cat.today())) or 0
        past_money = await s.scalar(select(func.coalesce(func.sum(Booking.price_total), 0)).join(Departure)
                                    .where(Booking.status != "cancelled", Departure.date < cat.today(),
                                           Departure.date >= cat.today() - timedelta(days=30))) or 0
        top = (await s.execute(select(Departure.trip_id, func.coalesce(func.sum(Booking.pax), 0)).join(Booking)
                               .where(Booking.status != "cancelled").group_by(Departure.trip_id)
                               .order_by(func.sum(Booking.pax).desc()).limit(5))).all()
        wishes = (await s.execute(select(DateRequest.trip_id, func.count(DateRequest.id))
                                  .where(DateRequest.created_at >= d30).group_by(DateRequest.trip_id)
                                  .order_by(func.count(DateRequest.id).desc()).limit(5))).all()
        rating = (await s.execute(select(func.avg(Review.rating), func.count(Review.id)))).one()
    conv = f"{bookers / users * 100:.0f} %" if users else "—"

    def tname(tid: str) -> str:
        t = cat.TRIPS_BY_ID.get(tid, {})
        return f"{t.get('flag', '')} {t.get('short_title', tid)}"

    text = [
        "📊 <b>Статистика</b> (бачите тільки ви)\n",
        f"👥 Людей у боті: <b>{users}</b> (+{users7} за 7 днів, +{users30} за 30)",
        f"🎁 Прийшли за запрошенням друзів: {referred}",
        f"🎯 Забронювали хоч раз: {bookers} · конверсія {conv}\n",
        f"📝 Заявок за 30 днів: {last30}",
        f"🟢 Підтверджено: {by_status.get('confirmed', (0, 0))[0]} ({by_status.get('confirmed', (0, 0))[1]} ос.)",
        f"🟡 Чекають: {by_status.get('new', (0, 0))[0]} · ⚪️ Скасовано: {by_status.get('cancelled', (0, 0))[0]}\n",
        f"💶 Очікується з майбутніх поїздок (усі активні заявки): <b>{future_money} €</b>",
        f"💶 Поїздки за останні 30 днів: {past_money} €",
    ]
    if rating[1]:
        text.append(f"⭐ Середня оцінка: {float(rating[0]):.1f} (відгуків: {rating[1]})")
    if top:
        text.append("\n<b>Найпопулярніші:</b>\n" + "\n".join(f"• {tname(t)} — {n} ос." for t, n in top))
    if wishes:
        text.append("\n<b>Просять дати (30 днів):</b>\n" + "\n".join(f"• {tname(t)} — {n}" for t, n in wishes))
    markup = InlineKeyboardMarkup(inline_keyboard=[[IB(text="⬅️ Адмін-меню", callback_data=kb.AdmCb(action="menu").pack())]])
    await callback.message.edit_text("\n".join(text), reply_markup=markup)


# ---------- Модерація відгуків ----------

def review_admin_kb(review_id: int, status: str) -> InlineKeyboardMarkup:
    rows = []
    if status != "approved":
        rows.append([IB(text="✅ Показувати клієнтам", callback_data=OpsCb(action="rv_ok", id=review_id).pack())])
    else:
        rows.append([IB(text="📢 Опублікувати в канал", callback_data=OpsCb(action="rv_post", id=review_id).pack())])
    if status != "hidden":
        rows.append([IB(text="🙈 Приховати", callback_data=OpsCb(action="rv_hide", id=review_id).pack())])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def review_text(r: Review) -> str:
    t = cat.TRIPS_BY_ID.get(r.trip_id, {})
    status = {"pending": "🕐 на перевірці", "approved": "✅ показується", "hidden": "🙈 приховано"}[r.status]
    return (f"⭐ <b>Відгук</b> · {status}\n{t.get('flag', '')} {escape(t.get('short_title', r.trip_id))}\n"
            f"{'⭐' * r.rating}{'☆' * (5 - r.rating)} — {escape(r.name)}\n"
            + (f"\n«{escape(r.text)}»" if r.text else "\n(без тексту)"))


@router.callback_query(OpsCb.filter(F.action.in_({"rv_ok", "rv_hide"})))
async def cb_review_mod(callback: CallbackQuery, callback_data: OpsCb):
    if not _admin(callback.from_user.id):
        return await callback.answer()
    async with Session() as s:
        r = await s.get(Review, callback_data.id)
        r.status = "approved" if callback_data.action == "rv_ok" else "hidden"
        await s.commit()
        await callback.answer("Готово")
        await callback.message.edit_text(review_text(r), reply_markup=review_admin_kb(r.id, r.status))


@router.callback_query(OpsCb.filter(F.action == "rv_post"))
async def cb_review_post(callback: CallbackQuery, callback_data: OpsCb, bot: Bot):
    if not _admin(callback.from_user.id):
        return await callback.answer()
    from ..db import KnownChat
    async with Session() as s:
        r = await s.get(Review, callback_data.id)
        channels = list(await s.scalars(select(KnownChat).where(KnownChat.type == "channel")))
    if not channels:
        return await callback.answer("Канал не знайдено: перешліть боту будь-який пост із каналу", show_alert=True)
    t = cat.TRIPS_BY_ID.get(r.trip_id, {})
    me = await bot.me()
    post = (f"💬 <b>Відгук про поїздку {t.get('flag', '')} {escape(t.get('short_title', ''))}</b>\n\n"
            f"{'⭐' * r.rating}\n" + (f"«{escape(r.text)}»\n" if r.text else "") + f"— {escape(r.name.split()[0])}")
    markup = InlineKeyboardMarkup(inline_keyboard=[[IB(text="🗺 Поїздки та дати", url=f"https://t.me/{me.username}?start=trips")]])
    try:
        await bot.send_message(channels[0].chat_id, post, reply_markup=markup)
        await callback.answer("Опубліковано ✅", show_alert=True)
    except Exception as e:  # noqa: BLE001
        await callback.answer(f"Не вдалося: {e}", show_alert=True)


@router.callback_query(kb.AdmCb.filter(F.action == "reviews"))
async def cb_reviews_admin(callback: CallbackQuery):
    if not _admin(callback.from_user.id):
        return await callback.answer()
    await callback.answer()
    async with Session() as s:
        pending = list(await s.scalars(select(Review).where(Review.status == "pending").order_by(Review.id)))
        avg, count = (await s.execute(select(func.avg(Review.rating), func.count(Review.id))
                                      .where(Review.status == "approved"))).one()
    head = (f"⭐ <b>Відгуки</b>\nПоказується клієнтам: {count}" + (f" · середня {float(avg):.1f}" if count else "")
            + f"\nЧекають перевірки: {len(pending)}\n\nБот сам просить оцінку наступного дня після кожної поїздки.")
    await callback.message.answer(head)
    for r in pending[:10]:
        await callback.message.answer(review_text(r), reply_markup=review_admin_kb(r.id, r.status))
