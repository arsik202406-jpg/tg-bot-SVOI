"""Прогноз погоди для пам'ятки (Open-Meteo: безкоштовно, без ключа)."""
from __future__ import annotations

import logging
import time
from datetime import date, timedelta

import aiohttp

from . import catalog as cat

log = logging.getLogger(__name__)

API = "https://api.open-meteo.com/v1/forecast"
_cache: dict[tuple, tuple[float, list[dict]]] = {}

# Коди погоди WMO → (емодзі, опис)
CODES = {
    0: ("☀️", "ясно"), 1: ("🌤", "переважно ясно"), 2: ("⛅️", "мінлива хмарність"), 3: ("☁️", "хмарно"),
    45: ("🌫", "туман"), 48: ("🌫", "туман з інеєм"),
    51: ("🌦", "мряка"), 53: ("🌦", "мряка"), 55: ("🌧", "сильна мряка"), 56: ("🌧", "крижана мряка"), 57: ("🌧", "крижана мряка"),
    61: ("🌦", "невеликий дощ"), 63: ("🌧", "дощ"), 65: ("🌧", "сильний дощ"), 66: ("🌧", "крижаний дощ"), 67: ("🌧", "крижаний дощ"),
    71: ("🌨", "невеликий сніг"), 73: ("🌨", "сніг"), 75: ("❄️", "сильний сніг"), 77: ("🌨", "сніжна крупа"),
    80: ("🌦", "короткочасні дощі"), 81: ("🌧", "зливи"), 82: ("⛈", "сильні зливи"),
    85: ("🌨", "снігопад"), 86: ("❄️", "сильний снігопад"),
    95: ("⛈", "гроза"), 96: ("⛈", "гроза з градом"), 99: ("⛈", "гроза з градом"),
}


async def forecast(lat: float, lon: float, start: date, days: int) -> list[dict]:
    """Список днів: {date, tmin, tmax, rain, code, wind}. Порожній, якщо прогноз недоступний."""
    end = start + timedelta(days=max(days, 1) - 1)
    key = (round(lat, 2), round(lon, 2), start, end)
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < 3 * 3600:
        return hit[1]
    params = {
        "latitude": lat, "longitude": lon, "timezone": "Europe/Berlin",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
        "start_date": start.isoformat(), "end_date": end.isoformat(),
    }
    try:
        async with aiohttp.ClientSession() as http:
            async with http.get(API, params=params, timeout=aiohttp.ClientTimeout(total=15)) as r:
                data = await r.json(content_type=None)
        d = data["daily"]
        out = [{"date": date.fromisoformat(d["time"][i]), "code": d["weather_code"][i],
                "tmax": d["temperature_2m_max"][i], "tmin": d["temperature_2m_min"][i],
                "rain": d["precipitation_probability_max"][i], "wind": d["wind_speed_10m_max"][i]}
               for i in range(len(d["time"]))]
    except Exception as e:  # noqa: BLE001
        log.warning("Погода недоступна: %s", e)
        return []
    _cache[key] = (time.time(), out)
    return out


def advice(days: list[dict]) -> list[str]:
    """Короткі поради за погодою."""
    tips = []
    if any((x["rain"] or 0) >= 40 or x["code"] in range(51, 83) for x in days):
        tips.append("☂️ Візьміть парасольку або дощовик")
    tmin = min((x["tmin"] for x in days if x["tmin"] is not None), default=None)
    tmax = max((x["tmax"] for x in days if x["tmax"] is not None), default=None)
    if tmin is not None and tmin <= 3:
        tips.append("🧣 Буде холодно: теплу куртку, шапку й рукавички")
    elif tmin is not None and tmin <= 10:
        tips.append("🧥 Вранці й увечері прохолодно — візьміть кофту або куртку")
    if tmax is not None and tmax >= 25:
        tips.append("🧢 Спекотно: головний убір, сонцезахисний крем і більше води")
    if any((x["wind"] or 0) >= 40 for x in days):
        tips.append("💨 Сильний вітер — знадобиться вітровка")
    return tips


async def weather_text(trip: dict, start: date) -> str:
    """«🌤 Погода в Брюгге: …» для повідомлення. Порожньо, якщо немає координат чи прогнозу."""
    w = trip.get("weather")
    if not w:
        return ""
    days = await forecast(w["lat"], w["lon"], start, trip.get("days", 1))
    if not days:
        return ""
    lines = [f"<b>Погода — {w['city']}</b>"]
    for x in days:
        emoji, desc = CODES.get(x["code"], ("🌡", ""))
        day = cat.fmt_date(x["date"]) if len(days) > 1 else "у день поїздки"
        rain = f", дощ {x['rain']}%" if x["rain"] else ""
        lines.append(f"{emoji} {day}: {round(x['tmin'])}…{round(x['tmax'])}°, {desc}{rain}")
    lines += advice(days)
    return "\n".join(lines)
