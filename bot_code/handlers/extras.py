"""Клієнт: підтвердження участі, відгуки, запрошення друзів, політика конфіденційності, видалення даних."""
from __future__ import annotations

import logging
from html import escape
from pathlib import Path
from urllib.parse import quote

from aiogram import Bot, F, Router
from aiogram.filters import Command
from aiogram.filters.callback_data import CallbackData
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, InlineKeyboardButton as IB, InlineKeyboardMarkup, Message
from sqlalchemy import delete, func, select

from .. import catalog as cat
from .. import keyboards as kb
from ..config import settings
from ..db import (Booking, BotUser, Customer, DateRequest, Departure, GiveawayEntry, Review, Session,
                  WaitlistEntry)
from ..screens import keep, keep_incoming
from ..services import booking_admin_text, cancel_booking, load_booking, notify_admins, user_bookings

log = logging.getLogger(__name__)
router = Router(name="extras")

PRIVACY_FILE = Path(__file__).resolve().parent.parent / "data" / "privacy.md"


def privacy_text() -> str:
    return PRIVACY_FILE.read_text(encoding="utf-8") if PRIVACY_FILE.exists() else "Політика конфіденційності"


class AttendCb(CallbackData, prefix="at"):
    booking: int
    answer: str  # yes / no / no_sure


class RateCb(CallbackData, prefix="rt"):
    booking: int
    stars: int


class ReviewState(StatesGroup):
    text = State()


# ---------- Підтвердження участі (надсилає планувальник напередодні) ----------

def attend_kb(booking_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [IB(text="✅ Так, їду", callback_data=AttendCb(booking=booking_id, answer="yes").pack())],
        [IB(text="❌ Не зможу поїхати", callback_data=AttendCb(booking=booking_id, answer="no").pack())],
    ])


@router.callback_query(AttendCb.filter())
async def cb_attend(callback: CallbackQuery, callback_data: AttendCb, bot: Bot):
    keep_incoming()
    async with Session() as s:
        b = await load_booking(s, callback_data.booking)
        if not b or b.user_id != callback.from_user.id or b.status == "cancelled":
            return await callback.answer("Бронь не знайдено або вже скасовано", show_alert=True)
        if callback_data.answer == "no":
            await callback.answer()
            return await callback.message.edit_reply_markup(reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [IB(text="Так, скасувати мою бронь", callback_data=AttendCb(booking=b.id, answer="no_sure").pack())],
                [IB(text="⬅️ Ні, я їду", callback_data=AttendCb(booking=b.id, answer="yes").pack())],
            ]))
        if callback_data.answer == "yes":
            b.attend = "yes"
            await s.commit()
            await callback.answer("Чудово! До зустрічі 🚐")
            await callback.message.edit_reply_markup(reply_markup=None)
            with keep():
                await callback.message.answer("✅ Дякуємо, участь підтверджено! До зустрічі завтра 🚐")
            await notify_admins(bot, f"✅ {escape(b.name)} підтвердив участь ({b.code})")
            return
        # no_sure — скасовуємо і звільняємо місця
        b.attend = "no"
        await s.commit()
        await cancel_booking(s, b)
        await s.refresh(b.departure, ["bookings"])
        await callback.answer("Бронь скасовано")
        await callback.message.edit_reply_markup(reply_markup=None)
        with keep():
            await callback.message.answer("Шкода 😔 Бронь скасовано. Будемо раді бачити вас в інших поїздках!")
        await notify_admins(bot, booking_admin_text(b, "❌ Клієнт відмовився від поїздки"))
        await notify_waitlist_free_seat(bot, b.departure)


async def notify_waitlist_free_seat(bot: Bot, dep: Departure) -> None:
    """Звільнилось місце — повідомляємо лист очікування цього туру."""
    trip = cat.TRIPS_BY_ID.get(dep.trip_id, {})
    async with Session() as s:
        waiting = list(await s.scalars(select(WaitlistEntry).where(WaitlistEntry.trip_id == dep.trip_id)))
    me = await bot.me()
    for w in waiting:
        try:
            await bot.send_message(
                w.user_id,
                f"🔔 Звільнилось місце: {trip.get('flag', '')} <b>{escape(trip.get('short_title', ''))}</b>, "
                f"{cat.fmt_departure(dep.date, trip.get('days', 1))}. Встигніть забронювати 👇",
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[[IB(
                    text="💺 Забронювати", url=f"https://t.me/{me.username}?start=dep_{dep.id}")]]))
        except Exception:  # noqa: BLE001
            pass


# ---------- Відгуки ----------

def rate_kb(booking_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [IB(text="⭐" * n, callback_data=RateCb(booking=booking_id, stars=n).pack()) for n in (5, 4)],
        [IB(text="⭐" * n, callback_data=RateCb(booking=booking_id, stars=n).pack()) for n in (3, 2, 1)],
    ])


@router.callback_query(RateCb.filter())
async def cb_rate(callback: CallbackQuery, callback_data: RateCb, state: FSMContext):
    keep_incoming()
    async with Session() as s:
        b = await s.get(Booking, callback_data.booking)
        if not b or b.user_id != callback.from_user.id:
            return await callback.answer()
        dep = await s.get(Departure, b.departure_id)
        r = await s.scalar(select(Review).where(Review.booking_id == b.id))
        if not r:
            r = Review(booking_id=b.id, trip_id=dep.trip_id, user_id=b.user_id, name=b.name, rating=callback_data.stars)
            s.add(r)
        r.rating = callback_data.stars
        await s.commit()
        review_id = r.id
    await callback.answer("Дякуємо!")
    await callback.message.edit_reply_markup(reply_markup=None)
    await state.set_state(ReviewState.text)
    await state.update_data(review_id=review_id)
    with keep():
        await callback.message.answer(
            f"{'⭐' * callback_data.stars} — дякуємо!\n\nНапишіть кілька слів про поїздку: що сподобалось, "
            "що покращити? Це дуже допоможе іншим людям обрати поїздку 🙏",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[[IB(text="Пропустити", callback_data="rv_skip")]]))


@router.message(ReviewState.text, F.text, ~F.text.startswith("/"))
async def msg_review_text(message: Message, state: FSMContext, bot: Bot):
    keep_incoming()
    data = await state.get_data()
    await state.clear()
    async with Session() as s:
        r = await s.get(Review, data["review_id"])
        r.text = message.text.strip()[:1000]
        await s.commit()
    with keep():
        await message.answer("🙏 Дякуємо за відгук! Чекаємо вас у наступних поїздках 🚐", reply_markup=kb.main_kb())
    await send_review_to_admin(bot, data["review_id"])


@router.callback_query(F.data == "rv_skip")
async def cb_review_skip(callback: CallbackQuery, state: FSMContext, bot: Bot):
    keep_incoming()
    data = await state.get_data()
    await state.clear()
    await callback.answer("Дякуємо!")
    await callback.message.edit_reply_markup(reply_markup=None)
    if data.get("review_id"):
        await send_review_to_admin(bot, data["review_id"])


async def send_review_to_admin(bot: Bot, review_id: int) -> None:
    from .ops import review_admin_kb, review_text
    async with Session() as s:
        r = await s.get(Review, review_id)
    for admin_id in settings.admin_ids:
        try:
            await bot.send_message(admin_id, "🆕 " + review_text(r), reply_markup=review_admin_kb(r.id, r.status))
        except Exception:  # noqa: BLE001
            pass


async def approved_reviews(trip_id: str | None = None, limit: int = 5) -> tuple[list[Review], float, int]:
    async with Session() as s:
        q = select(Review).where(Review.status == "approved")
        if trip_id:
            q = q.where(Review.trip_id == trip_id)
        items = list(await s.scalars(q.order_by(Review.id.desc()).limit(limit)))
        agg = select(func.avg(Review.rating), func.count(Review.id)).where(Review.status == "approved")
        if trip_id:
            agg = agg.where(Review.trip_id == trip_id)
        avg, count = (await s.execute(agg)).one()
    return items, float(avg or 0), int(count or 0)


@router.callback_query(F.data.startswith("reviews"))
async def cb_reviews(callback: CallbackQuery):
    await callback.answer()
    trip_id = callback.data.split(":", 1)[1] if ":" in callback.data else None
    items, avg, count = await approved_reviews(trip_id, limit=6)
    if not items:
        text = ("⭐ Відгуків поки немає — ми тільки починаємо! Після кожної поїздки просимо пасажирів "
                "чесно оцінити її, і відгуки з'являться тут.")
    else:
        lines = [f"⭐ <b>Відгуки пасажирів</b> · {avg:.1f} з 5 ({count})\n"]
        for r in items:
            t = cat.TRIPS_BY_ID.get(r.trip_id, {})
            lines.append(f"{'⭐' * r.rating} <b>{escape(r.name.split()[0])}</b> · {t.get('flag', '')} {escape(t.get('short_title', ''))}"
                         + (f"\n«{escape(r.text)}»" if r.text else ""))
        text = "\n\n".join(lines)
    await callback.message.answer(text, reply_markup=InlineKeyboardMarkup(inline_keyboard=[
        [IB(text="🗺 Поїздки та дати", callback_data=kb.StepCb(action="to_trips").pack())], [kb.home_button()]]))


# ---------- Запросити друга ----------

@router.callback_query(F.data == "invite")
async def cb_invite(callback: CallbackQuery, bot: Bot):
    await callback.answer()
    me = await bot.me()
    link = f"https://t.me/{me.username}?start=ref_{callback.from_user.id}"
    share = ("https://t.me/share/url?url=" + quote(link) + "&text=" +
             quote("Поїхали разом у мандрівку Європою з SVOI 🚐 Маленькі групи, забирають від дому!"))
    async with Session() as s:
        invited = await s.scalar(select(func.count(BotUser.user_id)).where(BotUser.referred_by == callback.from_user.id)) or 0
    await callback.message.answer(
        "🎁 <b>Запросіть друга</b>\n\n"
        "Надішліть другові своє посилання. Коли він уперше поїде з нами — "
        "ви обоє отримаєте <b>безкоштовний вибір місця</b> в наступній поїздці.\n\n"
        f"Ваше посилання:\n<code>{link}</code>\n\nЗа вашим посиланням прийшло: {invited}",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[[IB(text="📤 Надіслати другові", url=share)], [kb.home_button()]]))


# ---------- Політика і видалення даних ----------

@router.message(Command("privacy"))
async def cmd_privacy(message: Message):
    await message.answer(escape(privacy_text()), reply_markup=InlineKeyboardMarkup(inline_keyboard=[[kb.home_button()]]))


@router.callback_query(F.data == "privacy")
async def cb_privacy(callback: CallbackQuery):
    keep_incoming()
    await callback.answer()
    with keep():
        await callback.message.answer(escape(privacy_text()))


@router.message(Command("delete_my_data"))
async def cmd_delete(message: Message):
    async with Session() as s:
        future = await user_bookings(s, message.from_user.id)
    if future:
        return await message.answer("У вас є майбутня поїздка. Спершу скасуйте її в «📝 Мої бронювання», "
                                    "а потім повторіть /delete_my_data.")
    await message.answer(
        "Видалити всі ваші дані (телефон, адреси, історію, відгуки, участь у розіграшах)? Це не можна скасувати.",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[[IB(text="🗑 Так, видалити", callback_data="del_yes"),
                                                            IB(text="Ні", callback_data="home")]]))


@router.callback_query(F.data == "del_yes")
async def cb_delete_yes(callback: CallbackQuery, bot: Bot):
    from ..ai import AiPause, AiTurn
    uid = callback.from_user.id
    async with Session() as s:
        for b in await s.scalars(select(Booking).where(Booking.user_id == uid)):
            b.name, b.phone, b.address, b.username, b.comment, b.user_id = "Видалено", "", "видалено", None, None, None
            b.postcode, b.district = None, None
        for model in (Customer, BotUser, AiPause):
            row = await s.get(model, uid)
            if row:
                await s.delete(row)
        for model, col in ((WaitlistEntry, WaitlistEntry.user_id), (DateRequest, DateRequest.user_id),
                           (GiveawayEntry, GiveawayEntry.user_id), (AiTurn, AiTurn.user_id), (Review, Review.user_id)):
            await s.execute(delete(model).where(col == uid))
        await s.commit()
    await callback.answer("Видалено")
    await callback.message.edit_text("✅ Ваші дані видалено. Якщо захочете поїхати з нами знову — просто натисніть /start.")
    await notify_admins(bot, f"🗑 Клієнт (ID {uid}) видалив свої дані з бота.")
