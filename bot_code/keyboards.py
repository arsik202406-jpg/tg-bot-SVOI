"""Усі клавіатури бота. Великі, зрозумілі кнопки — мінімум тексту."""
from __future__ import annotations

from aiogram.filters.callback_data import CallbackData
from aiogram.types import (InlineKeyboardButton as IB, InlineKeyboardMarkup, KeyboardButton,
                           ReplyKeyboardMarkup, WebAppInfo)

from . import catalog as cat
from .config import settings

# ---------- Тексти кнопок головного меню ----------
BTN_TRIPS = "🗺 Поїздки та дати"
BTN_MY = "📝 Мої бронювання"
BTN_ASK = "💬 Задати питання"
BTN_HOW = "ℹ️ Як усе працює"
BTN_GAMES = "🎲 Розваги"
BTN_CANCEL = "✖️ Скасувати"
BTN_SHARE_PHONE = "📱 Надіслати мій номер"


class TripCb(CallbackData, prefix="t"):
    trip: str


class DepCb(CallbackData, prefix="d"):
    dep: int


class PaxCb(CallbackData, prefix="p"):
    n: int


class SeatCb(CallbackData, prefix="s"):
    no: int  # 0 — «будь-які вільні», -1 — «далі»


class CityCb(CallbackData, prefix="c"):
    city: str


class StepCb(CallbackData, prefix="st"):
    action: str  # confirm / restart / use_saved / new_address / skip_comment / to_trips


class WaitCb(CallbackData, prefix="w"):
    trip: str


class MyCb(CallbackData, prefix="m"):
    action: str  # cancel / cancel_yes
    booking: int


class AdmCb(CallbackData, prefix="a"):
    action: str
    id: int = 0
    extra: str = ""


def main_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=BTN_TRIPS)],
            [KeyboardButton(text=BTN_MY), KeyboardButton(text=BTN_ASK)],
            [KeyboardButton(text=BTN_HOW), KeyboardButton(text=BTN_GAMES)],
        ],
        resize_keyboard=True,
        is_persistent=True,
        input_field_placeholder="Оберіть кнопку або напишіть питання",
    )


def cancel_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(keyboard=[[KeyboardButton(text=BTN_CANCEL)]], resize_keyboard=True)


def phone_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=BTN_SHARE_PHONE, request_contact=True)], [KeyboardButton(text=BTN_CANCEL)]],
        resize_keyboard=True,
        input_field_placeholder="Або напишіть номер, наприклад +49 170 1234567",
    )


def manager_url() -> str:
    return f"https://t.me/{settings.MANAGER_USERNAME.lstrip('@')}"


def webapp_button(text: str = "📱 Відкрити застосунок") -> IB | None:
    if settings.webapp_url.startswith("https://"):
        return IB(text=text, web_app=WebAppInfo(url=settings.webapp_url))
    return None


# ---------- Клієнт ----------

def trips_kb(rows: list[tuple[dict, str | None]]) -> InlineKeyboardMarkup:
    """rows: (тур, найближча дата або None)."""
    kb = []
    for trip, nearest in rows:
        suffix = f" · {nearest}" if nearest else ""
        kb.append([IB(text=f"{trip['flag']} {trip['short_title']}{suffix}", callback_data=TripCb(trip=trip["id"]).pack())])
    btn = webapp_button("📱 Те саме з фото — у застосунку")
    if btn:
        kb.append([btn])
    return InlineKeyboardMarkup(inline_keyboard=kb)


def trip_kb(trip_id: str, deps: list[tuple[int, str, int]]) -> InlineKeyboardMarkup:
    """deps: (id, підпис дати, вільних місць)."""
    kb = []
    for dep_id, label, free in deps:
        if free > 0:
            kb.append([IB(text=f"📅 {label} · вільно {free}", callback_data=DepCb(dep=dep_id).pack())])
        else:
            kb.append([IB(text=f"📅 {label} · місць немає", callback_data=WaitCb(trip=trip_id).pack())])
    if not deps or all(f <= 0 for _, _, f in deps):
        kb.append([IB(text="🔔 Повідомити, коли з'являться дати/місця", callback_data=WaitCb(trip=trip_id).pack())])
    kb.append([IB(text="⬅️ До всіх поїздок", callback_data=StepCb(action="to_trips").pack())])
    return InlineKeyboardMarkup(inline_keyboard=kb)


def pax_kb(max_pax: int) -> InlineKeyboardMarkup:
    nums = list(range(1, min(max_pax, cat.CAPACITY) + 1))
    rows = [nums[i:i + 4] for i in range(0, len(nums), 4)]
    kb = [[IB(text=f"{n}", callback_data=PaxCb(n=n).pack()) for n in row] for row in rows]
    kb.append([IB(text="⬅️ Назад", callback_data=StepCb(action="restart").pack())])
    return InlineKeyboardMarkup(inline_keyboard=kb)


def seats_kb(taken: set[int], selected: list[int], pax: int) -> InlineKeyboardMarkup:
    def cell(no: int) -> IB:
        seat = cat.SEATS_BY_NO[no]
        if no in taken:
            return IB(text="✖️", callback_data=SeatCb(no=no).pack())
        if no in selected:
            return IB(text=f"✅ {no}", callback_data=SeatCb(no=no).pack())
        fee = f" +{seat['fee']}€" if seat["fee"] else " 0€"
        return IB(text=f"{no}{fee}", callback_data=SeatCb(no=no).pack())

    kb = [
        [IB(text="🧑‍✈️ водій", callback_data="noop"), cell(1), cell(2)],
        [cell(3), cell(4), cell(5)],
        [cell(6), cell(7), cell(8)],
        [IB(text="🎲 Будь-які вільні місця (без доплати)", callback_data=SeatCb(no=0).pack())],
    ]
    if len(selected) == pax:
        kb.append([IB(text="➡️ Далі", callback_data=SeatCb(no=-1).pack())])
    kb.append([IB(text="⬅️ Назад", callback_data=StepCb(action="restart").pack())])
    return InlineKeyboardMarkup(inline_keyboard=kb)


def city_kb() -> InlineKeyboardMarkup:
    kb = [[IB(text=f"{c['name']} — {c['hint']}", callback_data=CityCb(city=c["id"]).pack())] for c in cat.PICKUP_CITIES]
    return InlineKeyboardMarkup(inline_keyboard=kb)


def saved_address_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [IB(text="✅ Так, ця адреса", callback_data=StepCb(action="use_saved").pack())],
        [IB(text="✏️ Інша адреса", callback_data=StepCb(action="new_address").pack())],
    ])


def comment_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[IB(text="Ні, все добре ➡️", callback_data=StepCb(action="skip_comment").pack())]])


def confirm_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [IB(text="✅ Підтвердити бронювання", callback_data=StepCb(action="confirm").pack())],
        [IB(text="✏️ Почати спочатку", callback_data=StepCb(action="restart").pack())],
    ])


def client_after_booking_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [IB(text="💬 Написати менеджеру", url=manager_url())],
    ])


def my_booking_kb(booking_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [IB(text="❌ Скасувати цю бронь", callback_data=MyCb(action="cancel", booking=booking_id).pack())],
    ])


def my_booking_confirm_kb(booking_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [IB(text="Так, скасувати", callback_data=MyCb(action="cancel_yes", booking=booking_id).pack()),
         IB(text="Ні, залишити", callback_data=MyCb(action="keep", booking=booking_id).pack())],
    ])


# ---------- Адмін ----------

def admin_menu_kb(ai_state: str | None = None) -> InlineKeyboardMarkup:
    rows = [
        [IB(text="🚐 Рейси та пасажири", callback_data=AdmCb(action="deps").pack())],
        [IB(text="➕ Додати дати поїздок", callback_data=AdmCb(action="add_dates").pack())],
        [IB(text="🖼 Фото турів", callback_data=AdmCb(action="photos").pack()),
         IB(text="🔔 Лист очікування", callback_data=AdmCb(action="waitlist").pack())],
    ]
    if ai_state:
        rows.append([IB(text=ai_state, callback_data=AdmCb(action="ai_toggle").pack())])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def admin_deps_kb(items: list[tuple[int, str]]) -> InlineKeyboardMarkup:
    kb = [[IB(text=label, callback_data=AdmCb(action="dep", id=dep_id).pack())] for dep_id, label in items]
    kb.append([IB(text="⬅️ Адмін-меню", callback_data=AdmCb(action="menu").pack())])
    return InlineKeyboardMarkup(inline_keyboard=kb)


def admin_dep_kb(dep_id: int, status: str, bookings: list[tuple[int, str]]) -> InlineKeyboardMarkup:
    kb = [[IB(text=label, callback_data=AdmCb(action="bk", id=bid).pack())] for bid, label in bookings]
    kb += [
        [IB(text="➕ Додати пасажира (дзвінок)", callback_data=AdmCb(action="manual", id=dep_id).pack())],
        [IB(text="📨 Написати всім пасажирам", callback_data=AdmCb(action="broadcast", id=dep_id).pack())],
        [IB(text="📄 Таблиця (Excel)", callback_data=AdmCb(action="csv", id=dep_id).pack()),
         IB(text="📝 Нотатка", callback_data=AdmCb(action="note", id=dep_id).pack())],
        [IB(text="📢 Анонс у канал", callback_data=AdmCb(action="announce", id=dep_id).pack())],
        [IB(text="🔓 Відкрити набір" if status == "closed" else "🔒 Закрити набір",
            callback_data=AdmCb(action="toggle", id=dep_id).pack()),
         IB(text="🗑 Скасувати рейс", callback_data=AdmCb(action="cancel_dep", id=dep_id).pack())],
        [IB(text="⬅️ Усі рейси", callback_data=AdmCb(action="deps").pack())],
    ]
    return InlineKeyboardMarkup(inline_keyboard=kb)


def admin_booking_kb(b) -> InlineKeyboardMarkup:
    kb = []
    if b.status == "new":
        kb.append([IB(text="✅ Підтвердити", callback_data=AdmCb(action="bk_ok", id=b.id).pack()),
                   IB(text="❌ Скасувати", callback_data=AdmCb(action="bk_cancel", id=b.id).pack())])
    elif b.status == "confirmed":
        kb.append([IB(text="❌ Скасувати бронь", callback_data=AdmCb(action="bk_cancel", id=b.id).pack())])
    if b.username:  # кнопки tg://user?id=… Telegram відхиляє через налаштування приватності
        kb.append([IB(text="💬 Написати клієнту", url=f"https://t.me/{b.username}")])
    kb.append([IB(text="🚐 Відкрити рейс", callback_data=AdmCb(action="dep", id=b.departure_id).pack())])
    return InlineKeyboardMarkup(inline_keyboard=kb)


def admin_yes_no_kb(yes_action: str, obj_id: int, back_action: str, back_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        IB(text="Так", callback_data=AdmCb(action=yes_action, id=obj_id).pack()),
        IB(text="Ні", callback_data=AdmCb(action=back_action, id=back_id).pack()),
    ]])


def admin_trips_kb(action: str = "pick_trip") -> InlineKeyboardMarkup:
    kb, row = [], []
    for t in cat.TRIPS:
        row.append(IB(text=f"{t['flag']} {t['short_title']}", callback_data=AdmCb(action=action, extra=t["id"]).pack()))
        if len(row) == 2:
            kb.append(row)
            row = []
    if row:
        kb.append(row)
    kb.append([IB(text="⬅️ Адмін-меню", callback_data=AdmCb(action="menu").pack())])
    return InlineKeyboardMarkup(inline_keyboard=kb)


def admin_city_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [IB(text=c["name"], callback_data=AdmCb(action="m_city", extra=c["id"]).pack())] for c in cat.PICKUP_CITIES
    ])
