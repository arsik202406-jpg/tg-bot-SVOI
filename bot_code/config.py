import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    BOT_TOKEN: str = Field(default="8969834514:AAHl3mDZU00jncjJ52TyGTHmcs_-l5CBjPM")
    ADMIN_ID: int = Field(default=8450153980, description="Telegram ID адміністратора для отримання заявок та відгуків")
    MANAGER_USERNAME: str = Field(default="SVOI_travel_admin")
    BOT_USERNAME: str = Field(default="Svoi_TravelEU_bot")
    CHANNEL_URL: str = Field(default="https://t.me/+Flt_2r6vi3U4ZDg6")
    GROUP_URL: str = Field(default="https://t.me/+J50liyDUHPgzYTQy")
    # URL для відкриття Telegram Mini App (SvoiMiniApp з 3D салоном)
    MINI_APP_URL: str = Field(default="https://ais-pre-5nen67xjgzawt525obtchj-694072480718.europe-west1.run.app")
    # ID каналу або @юзернейм для прямої публікації повідомлень ботом
    CHANNEL_CHAT_ID: str = Field(default="@svoi_traveleu", description="ID каналу (-100...) або @username каналу для публікацій")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
