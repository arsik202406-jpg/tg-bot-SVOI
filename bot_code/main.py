"""
SVOI Travel - Точка входу main.py
Запускає асинхронний цикл бота aiogram 3.x
"""
import asyncio
import sys
from pathlib import Path

# Забезпечуємо коректні шляхи імпорту
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

try:
    from bot_code.bot import main
except ModuleNotFoundError:
    from bot import main

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        print("Бот SVOI Travel успішно зупинено.")
