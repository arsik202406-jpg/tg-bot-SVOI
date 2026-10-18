import logging
from aiogram import Router, F, Bot
from aiogram.types import CallbackQuery, Message
from aiogram.fsm.context import FSMContext
from aiogram.exceptions import TelegramBadRequest

try:
    from bot_code.states.states import FeedbackState
    from bot_code.keyboards.inline import get_cancel_feedback_keyboard, get_back_keyboard
    from bot_code.config import settings
except ModuleNotFoundError:
    from states.states import FeedbackState
    from keyboards.inline import get_cancel_feedback_keyboard, get_back_keyboard
    from config import settings

logger = logging.getLogger(__name__)
router = Router(name="feedback_router")

@router.callback_query(F.data == "cb_feedback")
async def process_feedback_start(callback: CallbackQuery, state: FSMContext):
    """Активує стан FSM (FeedbackState.waiting_for_text)"""
    await callback.answer()
    await state.set_state(FeedbackState.waiting_for_text)
    
    text = (
        "✍️ <b>Залишити відгук або побажання</b> 💌\n\n"
        "Ми постійно вдосконалюємо наші маршрути та сервіс. Напишіть, будь ласка, у відповідному повідомленні:\n"
        "• Ваші враження від минулої поїздки\n"
        "• Куди б ви хотіли поїхати наступного разу (нові міста/країни)\n"
        "• Будь-які пропозиції щодо покращення клубу SVOI\n\n"
        "<i>Надішліть ваш текст просто в цей чат або натисніть кнопку «Скасувати введення»:</i>"
    )
    
    try:
        if callback.message:
            await callback.message.edit_text(
                text=text,
                reply_markup=get_cancel_feedback_keyboard(),
                parse_mode="HTML"
            )
    except TelegramBadRequest:
        pass

@router.callback_query(F.data == "cb_cancel_feedback")
async def process_cancel_feedback(callback: CallbackQuery, state: FSMContext):
    """Скасування надсилання відгуку"""
    await callback.answer("Введення скасовано")
    await state.clear()
    
    try:
        from bot_code.handlers.menu import MAIN_MENU_TEXT
        from bot_code.keyboards.inline import get_main_menu_keyboard
    except ModuleNotFoundError:
        from handlers.menu import MAIN_MENU_TEXT
        from keyboards.inline import get_main_menu_keyboard
    
    try:
        if callback.message:
            await callback.message.edit_text(
                text=MAIN_MENU_TEXT,
                reply_markup=get_main_menu_keyboard(),
                parse_mode="HTML"
            )
    except TelegramBadRequest:
        pass

@router.message(FeedbackState.waiting_for_text)
async def process_feedback_received(message: Message, state: FSMContext, bot: Bot):
    """
    Бот ловить текст, зберігає його, дякує користувачеві та 
    автоматично пересилає повідомлення адміністратору (ADMIN_ID).
    Скидає стан.
    """
    feedback_text = message.text or message.caption or "(Вкладення/медіа)"
    user = message.from_user
    
    user_mention = f"@{user.username}" if user and user.username else "Без юзернейму"
    user_id = user.id if user else 0
    full_name = user.full_name if user else "Користувач"
    
    # Скидання стану
    await state.clear()
    
    # Дякуємо користувачеві
    thanks_text = (
        "❤️ <b>Дякуємо за ваше звернення!</b>\n\n"
        "Ваш відгук/побажання успішно передано керівництву клубу SVOI. "
        "Ми уважно вивчаємо кожне повідомлення та робимо наші поїздки ще душевнішими та яскравішими!\n\n"
        "До зустрічі на борту нашого Opel Vivaro VIP! 🚐✨"
    )
    await message.answer(
        text=thanks_text,
        reply_markup=get_back_keyboard(),
        parse_mode="HTML"
    )
    
    # Формуємо звіт для адміністратора
    admin_notification = (
        "🔔 <b>НОВЕ ПОБАЖАННЯ / ВІДГУК SVOI TRAVEL</b>\n\n"
        f"👤 <b>Відправник:</b> {full_name} ({user_mention})\n"
        f"🆔 <b>User ID:</b> <code>{user_id}</code>\n"
        f"💬 <b>Текст повідомлення:</b>\n\n{feedback_text}"
    )
    
    # Пересилання адміністратору (ADMIN_ID)
    if settings.ADMIN_ID and settings.ADMIN_ID != 0:
        try:
            await bot.send_message(
                chat_id=settings.ADMIN_ID,
                text=admin_notification,
                parse_mode="HTML"
            )
        except Exception as e:
            logger.error("Не вдалося відправити повідомлення адміну %s: %s", settings.ADMIN_ID, e)
