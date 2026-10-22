import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    BOT_TOKEN: str = Field(default="8969834514:AAGg--q9hqQQIQooZUkCbhenT9ykhuCc6D0")
    ADMIN_ID: int = Field(default=8450153980, description="Telegram ID адміністратора для отримання заявок та відгуків")
    MANAGER_USERNAME: str = Field(default="SVOI_travel_admin")
    BOT_USERNAME: str = Field(default="Svoi_TravelEU_bot")
    CHANNEL_URL: str = Field(default="https://t.me/+Flt_2r6vi3U4ZDg6")
    GROUP_URL: str = Field(default="https://t.me/+J50liyDUHPgzYTQy")
    # Публічний HTTPS URL для відкриття Telegram Mini App (GitHub Pages)
    MINI_APP_URL: str = Field(default="https://arsik202406-jpg.github.io/tg-bot-SVOI/?miniapp=1")
    # ID каналу або @юзернейм для прямої публікації повідомлень ботом
    CHANNEL_CHAT_ID: str = Field(default="@svoi_traveleu", description="ID каналу (-100...) або @username каналу для публікацій")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
