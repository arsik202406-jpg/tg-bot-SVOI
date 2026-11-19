"""Налаштування бота. Усі значення беруться зі змінних середовища (Render → Environment)."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Токен від @BotFather
    BOT_TOKEN: str = ""
    TELEGRAM_BOT_TOKEN: str = ""  # запасна назва змінної
    # Telegram ID адміністраторів через кому. Їм приходять заявки та питання клієнтів.
    ADMIN_IDS: str = "8450153980"
    ADMIN_ID: str = ""  # стара назва змінної, теж працює
    # Юзернейм менеджера для кнопки «Написати менеджеру»
    MANAGER_USERNAME: str = "SVOI_travel_admin"
    CHANNEL_URL: str = "https://t.me/+Flt_2r6vi3U4ZDg6"
    # Канал для публікації анонсів (бот має бути адміністратором каналу)
    CHANNEL_CHAT_ID: str = "@svoi_traveleu"

    # База даних. Для Neon/Supabase: postgresql://user:pass@host/db?sslmode=require
    # Якщо не задано — локальний файл SQLite (на Render free він стирається при кожному деплої!)
    DATABASE_URL: str = "sqlite+aiosqlite:///svoi.db"

    # Адреса Mini App (GitHub Pages)
    WEBAPP_URL: str = "https://arsik202406-jpg.github.io/tg-bot-SVOI/"
    # Публічна адреса цього сервера. Render підставляє RENDER_EXTERNAL_URL автоматично.
    PUBLIC_URL: str = ""
    RENDER_EXTERNAL_URL: str = ""
    PORT: int = 10000

    # Часовий пояс для дат рейсів
    TIMEZONE: str = "Europe/Berlin"

    @property
    def token(self) -> str:
        return (self.BOT_TOKEN or self.TELEGRAM_BOT_TOKEN).strip()

    @property
    def admin_ids(self) -> set[int]:
        raw = f"{self.ADMIN_IDS},{self.ADMIN_ID}".replace(" ", "")
        return {int(x) for x in raw.split(",") if x.lstrip("-").isdigit()}

    @property
    def public_url(self) -> str:
        return (self.PUBLIC_URL or self.RENDER_EXTERNAL_URL).rstrip("/")

    @property
    def webapp_url(self) -> str:
        """URL Mini App з адресою API, щоб Mini App знав, куди надсилати бронювання."""
        base = self.WEBAPP_URL
        if self.public_url:
            sep = "&" if "?" in base else "?"
            return f"{base}{sep}api={self.public_url}"
        return base


settings = Settings()
