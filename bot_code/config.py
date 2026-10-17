import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    BOT_TOKEN: str = Field(default="8969834514:AAHl3mDZU00jncjJ52TyGTHmcs_-l5CBjPM")
    ADMIN_ID: int = Field(default=8450153980, description="Telegram ID администратора для получения заявок и фидбека")
    MANAGER_USERNAME: str = Field(default="SVOI_travel_admin")
    BOT_USERNAME: str = Field(default="Svoi_TravelEU_bot")
    CHANNEL_URL: str = Field(default="https://t.me/+Flt_2r6vi3U4ZDg6")
    GROUP_URL: str = Field(default="https://t.me/+J50liyDUHPgzYTQy")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
