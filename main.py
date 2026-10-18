"""
SVOI Travel Bot - Головна точка входу main.py у корені проєкту
Запускає бота aiogram 3.x з автоматичним налаштуванням шляхів sys.path
Працює і з кореня репозиторію, і всередині Render/VPS
"""
import sys
import os
import asyncio
from pathlib import Path

# Додаємо корінь проєкту та папку bot_code до шляхів імпорту
ROOT_DIR = Path(__file__).resolve().parent
BOT_CODE_DIR = ROOT_DIR / "bot_code"

for path in [str(ROOT_DIR), str(BOT_CODE_DIR)]:
    if path not in sys.path:
        sys.path.insert(0, path)

try:
    from bot_code.bot import main
except ModuleNotFoundError:
    try:
        from bot import main
    except ModuleNotFoundError:
        # Прямий імпорт якщо папка bot_code знаходиться в поточній директорії
        import bot_code.bot as b
        main = b.main

if __name__ == "__main__":
    try:
        print("🌍 Запуск SVOI Travel Telegram Bot...")
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        print("🛑 Бот SVOI Travel успішно зупинено.")
