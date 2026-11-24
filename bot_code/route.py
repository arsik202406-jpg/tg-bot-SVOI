"""Маршрут збору пасажирів.

Бот бере вашу адресу (точку виїзду), адреси всіх пасажирів і пункт призначення,
знаходить найшвидший порядок об'їзду і рахує час у зворотному напрямку від часу прибуття:

  прибуття 11:00
  − зупинки в дорозі (1–2 по 15 хв)
  − дорога від останнього пасажира до місця
  − для кожної адреси: посадка (1 хв на людину) + дорога від попередньої адреси
  − невеликий запас на непередбачене
  = час виїзду з дому і час, коли забираємо кожного

Google Routes API (якщо задано GOOGLE_MAPS_API_KEY) враховує затори на дату поїздки.
Без ключа — безкоштовні OpenStreetMap (Nominatim + OSRM): без урахування заторів.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from urllib.parse import quote, urlencode

import aiohttp

from .config import settings

log = logging.getLogger(__name__)
USER_AGENT = "SVOI-Travel-bot/2.0 (Telegram bot for small group trips)"


class RouteError(Exception):
    """Помилка, текст якої можна показати адміну."""


@dataclass
class Stop:
    booking_id: int
    name: str
    address: str
    pax: int
    phone: str = ""


@dataclass
class Plan:
    stops: list[Stop]                 # у порядку об'їзду
    pickup_times: list[datetime]      # час посадки для кожної зупинки
    start_time: datetime              # виїзд із дому
    arrive_time: datetime             # прибуття на місце
    legs_min: list[int]               # хвилини дороги: дім→1, 1→2, …, останній→місце
    breaks: int                       # кількість зупинок у дорозі
    buffer_min: int                   # запас
    provider: str                     # google / osm
    home: str = ""
    destination: str = ""
    warnings: list[str] = field(default_factory=list)

    @property
    def maps_url(self) -> str:
        params = {"api": "1", "origin": self.home, "destination": self.destination, "travelmode": "driving",
                  "waypoints": "|".join(s.address for s in self.stops)}
        return "https://www.google.com/maps/dir/?" + urlencode(params, quote_via=quote)

    @property
    def total_drive_min(self) -> int:
        return sum(self.legs_min)


def plan_breaks(main_leg_min: int) -> int:
    """Скільки зупинок по 15 хв на основній ділянці дороги."""
    if main_leg_min < 150:
        return 0
    return 1 if main_leg_min <= 270 else 2


def round_down_5(dt: datetime) -> datetime:
    return dt.replace(minute=dt.minute - dt.minute % 5, second=0, microsecond=0)


def schedule(stops: list[Stop], legs_min: list[int], arrive: datetime, provider: str) -> Plan:
    """Зворотний розрахунок часу від прибуття."""
    if len(legs_min) != len(stops) + 1:
        raise RouteError("Сервіс карт повернув неповний маршрут.")
    main_leg = legs_min[-1]
    breaks = plan_breaks(main_leg)
    total = sum(legs_min)
    # Запас на непередбачене — фіксований (ROUTE_BUFFER_MIN, за замовчуванням 10 хв).
    # Зупинки в дорозі (1–2 по 15 хв) — окремо, вони теж дають резерв.
    buffer_min = settings.ROUTE_BUFFER_MIN
    t = arrive - timedelta(minutes=breaks * settings.BREAK_MINUTES + main_leg + buffer_min)
    times: list[datetime] = []
    for i in range(len(stops) - 1, -1, -1):
        pickup = t - timedelta(minutes=settings.PICKUP_MINUTES * max(1, stops[i].pax))
        times.append(pickup)
        t = pickup - timedelta(minutes=legs_min[i])
    times.reverse()
    times = [round_down_5(x) for x in times]
    return Plan(stops=stops, pickup_times=times, start_time=round_down_5(t), arrive_time=arrive,
                legs_min=legs_min, breaks=breaks, buffer_min=buffer_min, provider=provider)


# ---------- Google Routes API ----------

async def _google(home: str, stops: list[Stop], destination: str, depart: datetime) -> tuple[list[int], list[int]]:
    """Повертає (порядок зупинок, хвилини кожної ділянки)."""
    body = {
        "origin": {"address": home},
        "destination": {"address": destination},
        "intermediates": [{"address": s.address} for s in stops],
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE",
        "optimizeWaypointOrder": True,
        "departureTime": depart.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "languageCode": "uk",
        "units": "METRIC",
    }
    headers = {
        "X-Goog-Api-Key": settings.GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "routes.optimizedIntermediateWaypointIndex,routes.legs.duration",
        "Content-Type": "application/json",
    }
    async with aiohttp.ClientSession() as http:
        async with http.post("https://routes.googleapis.com/directions/v2:computeRoutes", json=body,
                             headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as r:
            data = await r.json(content_type=None)
    if "routes" not in data or not data["routes"]:
        msg = (data.get("error") or {}).get("message") or "Google не знайшов маршрут. Перевірте адреси."
        raise RouteError(f"Google Maps: {msg}")
    route = data["routes"][0]
    order = route.get("optimizedIntermediateWaypointIndex") or list(range(len(stops)))
    if order == [-1]:
        order = list(range(len(stops)))
    legs = [max(1, round(int(str(leg.get("duration", "0s")).rstrip("s") or 0) / 60)) for leg in route.get("legs", [])]
    return order, legs


# ---------- OpenStreetMap (безкоштовно) ----------

_geo_cache: dict[str, tuple[float, float]] = {}


async def _geocode(http: aiohttp.ClientSession, address: str) -> tuple[float, float]:
    if address in _geo_cache:
        return _geo_cache[address]
    params = {"q": address, "format": "json", "limit": "1"}
    async with http.get("https://nominatim.openstreetmap.org/search", params=params,
                        headers={"User-Agent": USER_AGENT, "Accept-Language": "de,en"},
                        timeout=aiohttp.ClientTimeout(total=20)) as r:
        data = await r.json(content_type=None)
    await asyncio.sleep(1.1)  # правила Nominatim: не частіше 1 запиту на секунду
    if not data:
        raise RouteError(f"Не знайшов адресу на карті: «{address}». Уточніть її (вулиця, будинок, місто).")
    lat, lon = float(data[0]["lat"]), float(data[0]["lon"])
    _geo_cache[address] = (lat, lon)
    return lat, lon


async def _osm(home: str, stops: list[Stop], destination: str) -> tuple[list[int], list[int]]:
    async with aiohttp.ClientSession() as http:
        points = [await _geocode(http, a) for a in [home, *[s.address for s in stops], destination]]
        coords = ";".join(f"{lon:.6f},{lat:.6f}" for lat, lon in points)
        url = (f"https://router.project-osrm.org/trip/v1/driving/{coords}"
               "?source=first&destination=last&roundtrip=false&overview=false")
        async with http.get(url, headers={"User-Agent": USER_AGENT}, timeout=aiohttp.ClientTimeout(total=30)) as r:
            data = await r.json(content_type=None)
    if data.get("code") != "Ok":
        raise RouteError(f"Сервіс маршрутів недоступний ({data.get('code')}). Спробуйте за хвилину.")
    # waypoint_index — позиція кожної точки (у вхідному порядку) в оптимальному маршруті
    positions = [w["waypoint_index"] for w in data["waypoints"]]
    middle = sorted(range(len(stops)), key=lambda i: positions[i + 1])
    legs = [max(1, round(leg["duration"] / 60)) for leg in data["trips"][0]["legs"]]
    return middle, legs


# ---------- Публічна функція ----------

async def build_plan(home: str, stops: list[Stop], destination: str, arrive: datetime) -> Plan:
    if not home:
        raise RouteError("Не вказано адресу виїзду (ваш дім).")
    if not stops:
        raise RouteError("На рейсі ще немає пасажирів.")
    if len(stops) > 23:
        raise RouteError("Забагато адрес для одного маршруту.")
    plan = None
    if settings.GOOGLE_MAPS_API_KEY:
        try:
            plan = await _google_plan(home, stops, destination, arrive)
        except Exception as e:  # noqa: BLE001 — Google недоступний (ключ, оплата) → рахуємо безкоштовно
            log.warning("Google Routes недоступний, рахую через OpenStreetMap: %s", e)
    if plan is None:
        order, legs = await _osm(home, stops, destination)
        plan = schedule([stops[i] for i in order], legs, arrive, "osm")
    plan.home, plan.destination = home, destination
    if plan.start_time.hour < 3 or plan.start_time.date() < arrive.date():
        plan.warnings.append("⚠️ Виїзд виходить дуже рано — можливо, варто перенести час прибуття.")
    return plan


async def _google_plan(home: str, stops: list[Stop], destination: str, arrive: datetime) -> Plan:
    """Google Routes: 1-й прохід — орієнтовний виїзд за 6 год, 2-й — уточнений із заторами на реальний час."""
    depart = max(arrive - timedelta(hours=6), datetime.now(timezone.utc) + timedelta(minutes=5))
    order, legs = await _google(home, stops, destination, depart)
    ordered = [stops[i] for i in order]
    plan = schedule(ordered, legs, arrive, "google")
    depart2 = max(plan.start_time, datetime.now(timezone.utc) + timedelta(minutes=5))
    try:
        order2, legs2 = await _google(home, ordered, destination, depart2)
        if order2 == list(range(len(ordered))):  # порядок не змінився — беремо точніший час
            plan = schedule(ordered, legs2, arrive, "google")
    except RouteError:
        pass
    return plan
