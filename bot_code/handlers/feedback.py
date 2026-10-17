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
    """Активирует состояние FSM (FeedbackState.waiting_for_text)"""
    await callback.answer()
    await state.set_state(FeedbackState.waiting_for_text)
    
    text = (
        "✍️ <b>Оставить отзыв или пожелание</b> 💌\n\n"
        "Мы постоянно улучшаем наши маршруты и сервис. Напишите, пожалуйста, в ответном сообщении:\n"
        "• Ваши впечатления от прошедшей поездки\n"
        "• Куда бы вы хотели поехать в следующий раз (новые города/страны)\n"
        "• Любые предложения по улучшению клуба SVOI\n\n"
        "<i>Отправьте ваш текст прямо в этот чат или нажмите кнопку «Отмена»:</i>"
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
    """Отмена отправки отзыва"""
    await callback.answer("Ввод отменен")
    await state.clear()
    
    from bot_code.handlers.menu import MAIN_MENU_TEXT
    from bot_code.keyboards.inline import get_main_menu_keyboard
    
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
    Бот ловит текст, сохраняет его, благодарит пользователя и 
    автоматически пересылает сообщение администратору (ADMIN_ID), 
    указывая @username и user_id отправителя.
    Сбрасывает состояние.
    """
    feedback_text = message.text or message.caption or "(Вложение/медиа)"
    user = message.from_user
    
    user_mention = f"@{user.username}" if user and user.username else "Без юзернейма"
    user_id = user.id if user else 0
    full_name = user.full_name if user else "Пользователь"
    
    # Сброс состояния
    await state.clear()
    
    # Благодарим пользователя
    thanks_text = (
        "❤️ <b>Спасибо за ваше обращение!</b>\n\n"
        "Ваш отзыв/пожелание успешно передано руководству клуба SVOI. "
        "Мы внимательно изучаем каждое сообщение и делаем наши поездки еще душевнее и ярче!\n\n"
        "До встречи на борту нашего Opel Vivaro VIP! 🚐✨"
    )
    await message.answer(
        text=thanks_text,
        reply_markup=get_back_keyboard(),
        parse_mode="HTML"
    )
    
    # Формируем отчет для администратора
    admin_notification = (
        "🔔 <b>НОВОЕ ПОЖЕЛАНИЕ / ОТЗЫВ SVOI TRAVEL</b>\n\n"
        f"👤 <b>Отправитель:</b> {full_name} ({user_mention})\n"
        f"🆔 <b>User ID:</b> <code>{user_id}</code>\n"
        f"💬 <b>Текст сообщения:</b>\n\n{feedback_text}"
    )
    
    # Пересылка администратору (ADMIN_ID)
    if settings.ADMIN_ID and settings.ADMIN_ID != 0:
        try:
            await bot.send_message(
                chat_id=settings.ADMIN_ID,
                text=admin_notification,
                parse_mode="HTML"
            )
        except Exception as e:
            logger.error("Не удалось отправить сообщение админу %s: %s", settings.ADMIN_ID, e)
    else:
        logger.info(
            "ADMIN_ID не настроен в .env. Сообщение от %s (%s): %s",
            user_id, user_mention, feedback_text
        )
