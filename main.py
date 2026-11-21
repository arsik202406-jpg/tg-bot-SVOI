"""Запуск бота SVOI Travel: python main.py"""
import asyncio

from bot_code.app import main

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        pass
