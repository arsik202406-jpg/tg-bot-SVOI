"""Зміна адреси в броні: клієнт («Мої бронювання») або адмін (картка броні).
Кроки: адреса → поштовий індекс → район (необов'язково). Час посадки скидається, адміну — нагадування перерахувати маршрут.
"""
from __future__ import annotations

from html import escape

from aiogram import Bot, F, Router
from aiogram.filters.callback_data import CallbackData
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, InlineKeyboardButton as IB, InlineKeyboardMarkup, Message

from .. import keyboards as kb
from ..config import settings
from ..db import Session
from ..screens import keep, keep_incoming
from ..services import (BookingError, booking_admin_text, booking_client_text, clean_postcode, full_address,
                        load_booking, notify_admins, update_address)

router = Router(name="address_edit")


class EditAddrCb(CallbackData, prefix="ea"):
    booking: int


class EditAddr(StatesGroup):
    address = State()
    postcode = State()
    district = State()


def _is_admin(user_id: int) -> bool:
    return user_id in settings.admin_ids


@router.callback_query(EditAddrCb.filter())
async def cb_edit(callback: CallbackQuery, callback_data: EditAddrCb, state: FSMContext):
    async with Session() as s:
        b = await load_booking(s, callback_data.booking)
    uid = callback.from_user.id
    if not b or b.status == "cancelled" or (b.user_id != uid and not _is_admin(uid)):
        return await callback.answer("Бронь не знайдено", show_alert=True)
    await callback.answer()
    if _is_admin(uid):
        keep_incoming()
    await state.set_state(EditAddr.address)
    await state.update_data(booking_id=b.id)
    who = "клієнта " + escape(b.name) if _is_admin(uid) and b.user_id != uid else "вашої броні"
    send = callback.message.answer
    if _is_admin(uid):
        with keep():
            await send(f"✏️ Зміна адреси {who} {b.code}\nЗараз: {escape(full_address(b))}\n\n"
                       "1/3 Напишіть нову адресу: вулиця, будинок, місто.\n/cancel — скасувати")
    else:
        await send(f"✏️ Зараз: {escape(full_address(b))}\n\n"
                   "<b>Напишіть нову адресу</b>: вулиця, номер будинку, місто.", reply_markup=kb.cancel_kb())


@router.message(EditAddr.address, F.text, ~F.text.startswith("/"), F.text != kb.BTN_CANCEL)
async def msg_address(message: Message, state: FSMContext):
    if _is_admin(message.from_user.id):
        keep_incoming()
    if len(message.text.strip()) < 5:
        return await message.answer("Напишіть повну адресу: вулицю, номер будинку і місто.")
    await state.update_data(address=message.text.strip())
    await state.set_state(EditAddr.postcode)
    await message.answer("<b>Поштовий індекс</b> (наприклад: <i>66111</i> або <i>L-1234</i>)")


@router.message(EditAddr.postcode, F.text, ~F.text.startswith("/"), F.text != kb.BTN_CANCEL)
async def msg_postcode(message: Message, state: FSMContext):
    if _is_admin(message.from_user.id):
        keep_incoming()
    pc = clean_postcode(message.text)
    if not pc:
        return await message.answer("Не схоже на індекс 🤔 Напишіть 4–5 цифр, наприклад <i>66111</i>.")
    await state.update_data(postcode=pc)
    await state.set_state(EditAddr.district)
    await message.answer("<b>Район</b> (необов'язково) — напишіть або натисніть «Пропустити».",
                         reply_markup=InlineKeyboardMarkup(inline_keyboard=[[IB(text="Пропустити ➡️",
                                                                                callback_data="ea_skip")]]))


@router.message(EditAddr.district, F.text, ~F.text.startswith("/"), F.text != kb.BTN_CANCEL)
async def msg_district(message: Message, state: FSMContext, bot: Bot):
    await _save(message, state, bot, message.text.strip(), message.from_user.id)


@router.callback_query(F.data == "ea_skip", EditAddr.district)
async def cb_skip(callback: CallbackQuery, state: FSMContext, bot: Bot):
    await callback.answer()
    await callback.message.edit_reply_markup(reply_markup=None)
    await _save(callback.message, state, bot, None, callback.from_user.id)


async def _save(message: Message, state: FSMContext, bot: Bot, district: str | None, uid: int):
    is_admin = _is_admin(uid)
    if is_admin:
        keep_incoming()
    data = await state.get_data()
    await state.clear()
    try:
        async with Session() as s:
            b = await load_booking(s, data["booking_id"])
            had_route = await update_address(s, b, data["address"], data["postcode"], district)
    except BookingError as e:
        return await message.answer(f"😔 {e}", reply_markup=None if is_admin else kb.main_kb())
    note = "\n\n⚠️ Час посадки скинуто — перерахуйте маршрут для цього рейсу." if had_route else ""
    route_kb = InlineKeyboardMarkup(inline_keyboard=[[IB(text="🗺 Перерахувати маршрут",
                                                         callback_data=f"o:route:{b.departure_id}")]]) if had_route else None
    if is_admin:
        with keep():
            await message.answer(f"✅ Адресу змінено: {escape(full_address(b))}{note}", reply_markup=route_kb)
        if b.user_id and b.user_id != uid:  # повідомляємо клієнта
            try:
                with keep():
                    await bot.send_message(b.user_id, "✏️ <b>Адресу у вашій броні уточнено</b>\n\n" + booking_client_text(b))
            except Exception:  # noqa: BLE001
                pass
        return
    with keep():
        await message.answer("✅ Адресу змінено!\n\n" + booking_client_text(b), reply_markup=kb.main_kb())
    await notify_admins(bot, booking_admin_text(b, "✏️ Клієнт змінив адресу") + note, route_kb)
