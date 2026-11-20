"""HTTP API для Mini App. Працює в тому ж процесі, що й бот (на Render)."""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time
from urllib.parse import parse_qsl

from aiogram import Bot
from aiohttp import web
from sqlalchemy import select

from . import catalog as cat
from .config import settings
from .db import Departure, Session, TripPhoto, WaitlistEntry, get_customer, trip_photos
from .services import (BookingError, booking_client_text, create_booking, departure_public, notify_admins,
                       notify_new_booking, upcoming_departures, user_bookings)

log = logging.getLogger(__name__)
INIT_DATA_MAX_AGE = 24 * 3600


def validate_init_data(init_data: str, bot_token: str) -> dict | None:
    """Перевірка підпису Telegram WebApp initData. Повертає user або None."""
    if not init_data or not bot_token:
        return None
    try:
        pairs = dict(parse_qsl(init_data, keep_blank_values=True, strict_parsing=True))
    except ValueError:
        return None
    received_hash = pairs.pop("hash", "")  # поле signature залишається в рядку перевірки
    check_string = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received_hash):
        return None
    if time.time() - int(pairs.get("auth_date", "0")) > INIT_DATA_MAX_AGE:
        return None
    try:
        return json.loads(pairs.get("user", "{}")) or None
    except json.JSONDecodeError:
        return None


@web.middleware
async def cors_middleware(request: web.Request, handler):
    if request.method == "OPTIONS":
        resp = web.Response(status=204)
    else:
        try:
            resp = await handler(request)
        except web.HTTPException as e:
            resp = e
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Init-Data"
    return resp


def err(message: str, status: int = 400) -> web.Response:
    return web.json_response({"ok": False, "error": message}, status=status)


def get_user(request: web.Request, body: dict | None = None) -> dict | None:
    init_data = request.headers.get("X-Init-Data") or (body or {}).get("initData", "")
    return validate_init_data(init_data, request.app["bot_token"])


async def health(_request: web.Request) -> web.Response:
    return web.Response(text="SVOI Travel bot is running 🚐")


async def get_catalog(request: web.Request) -> web.Response:
    async with Session() as s:
        deps = await upcoming_departures(s)
        dep_data = [departure_public(d) for d in deps]
        photos = await trip_photos(s)
    data = cat.public_catalog()
    base = settings.public_url or str(request.url.origin())
    data["trips"] = [
        {**t, "image": f"{base}/api/photo/{t['id']}?v={photos[t['id']][-10:]}"} if t["id"] in photos else t
        for t in data["trips"]
    ]
    data["departures"] = dep_data
    data["manager"] = settings.MANAGER_USERNAME.lstrip("@")
    return web.json_response({"ok": True, **data})


_photo_cache: dict[str, bytes] = {}


async def get_photo(request: web.Request) -> web.Response:
    """Фото туру, завантажене адміном у бота: беремо з Telegram і кешуємо в пам'яті."""
    trip_id = request.match_info["trip"]
    async with Session() as s:
        row = await s.get(TripPhoto, trip_id)
    if not row:
        return err("not found", 404)
    data = _photo_cache.get(row.file_id)
    if data is None:
        bot: Bot = request.app["bot"]
        buf = await bot.download(row.file_id)
        data = buf.read()
        _photo_cache[row.file_id] = data
    return web.Response(body=data, content_type="image/jpeg", headers={"Cache-Control": "public, max-age=86400"})


async def get_departure(request: web.Request) -> web.Response:
    try:
        dep_id = int(request.match_info["id"])
    except ValueError:
        return err("bad id")
    async with Session() as s:
        dep = await s.get(Departure, dep_id)
        if not dep:
            return err("not found", 404)
        return web.json_response({"ok": True, "departure": departure_public(dep)})


async def post_me(request: web.Request) -> web.Response:
    body = await request.json() if request.can_read_body else {}
    user = get_user(request, body)
    if not user:
        return err("unauthorized", 401)
    async with Session() as s:
        cust = await get_customer(s, user["id"])
        items = await user_bookings(s, user["id"])
        bookings = [{
            "code": b.code, "status": b.status, "trip_id": b.departure.trip_id,
            "date": b.departure.date.isoformat(),
            "label": cat.fmt_departure(b.departure.date, cat.TRIPS_BY_ID.get(b.departure.trip_id, {}).get("days", 1)),
            "pax": b.pax, "seats": b.seat_list, "auto": bool(b.auto_seats), "total": b.price_total,
            "city": b.city, "address": b.address,
        } for b in items]
    saved = {"phone": cust.phone, "city": cust.city, "address": cust.address} if cust else None
    return web.json_response({"ok": True, "saved": saved, "bookings": bookings})


async def post_booking(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except json.JSONDecodeError:
        return err("bad json")
    user = get_user(request, body)
    if not user:
        return err("Відкрийте застосунок через Telegram-бота, щоб забронювати.", 401)
    try:
        dep_id = int(body.get("departure_id"))
        pax = int(body.get("pax"))
        seats = [int(x) for x in body.get("seats") or []] or None
    except (TypeError, ValueError):
        return err("Невірні дані бронювання.")
    city_id = body.get("city") or "saarland"
    city = cat.PICKUP_BY_ID.get(city_id, {}).get("name", str(city_id))
    name = (body.get("name") or " ".join(filter(None, [user.get("first_name"), user.get("last_name")]))).strip()
    try:
        async with Session() as s:
            booking = await create_booking(
                s, departure_id=dep_id, pax=pax, seats=seats, name=name or "Клієнт",
                phone=str(body.get("phone") or ""), city=city, address=str(body.get("address") or ""),
                user_id=user["id"], username=user.get("username"), comment=body.get("comment"), source="miniapp")
    except BookingError as e:
        return err(str(e), 409)
    await notify_new_booking(request.app["bot"], booking)
    return web.json_response({
        "ok": True,
        "booking": {"code": booking.code, "total": booking.price_total, "seats": booking.seat_list,
                    "auto": bool(booking.auto_seats), "text": booking_client_text(booking)},
    })


async def post_waitlist(request: web.Request) -> web.Response:
    body = await request.json()
    user = get_user(request, body)
    if not user:
        return err("unauthorized", 401)
    trip_id = body.get("trip_id")
    if trip_id not in cat.TRIPS_BY_ID:
        return err("bad trip")
    name = " ".join(filter(None, [user.get("first_name"), user.get("last_name")]))
    async with Session() as s:
        exists = await s.scalar(select(WaitlistEntry.id).where(
            WaitlistEntry.trip_id == trip_id, WaitlistEntry.user_id == user["id"]))
        if not exists:
            s.add(WaitlistEntry(trip_id=trip_id, user_id=user["id"], name=name, username=user.get("username")))
            await s.commit()
            trip = cat.TRIPS_BY_ID[trip_id]
            await notify_admins(request.app["bot"], f"🔔 Лист очікування (Mini App): {name} хоче на "
                                                    f"{trip['flag']} {trip['short_title']}")
    return web.json_response({"ok": True})


def build_app(bot: Bot, bot_token: str) -> web.Application:
    app = web.Application(middlewares=[cors_middleware])
    app["bot"] = bot
    app["bot_token"] = bot_token
    app.router.add_get("/", health)
    app.router.add_get("/health", health)
    app.router.add_get("/api/catalog", get_catalog)
    app.router.add_get("/api/departures/{id}", get_departure)
    app.router.add_get("/api/photo/{trip}", get_photo)
    app.router.add_post("/api/me", post_me)
    app.router.add_post("/api/bookings", post_booking)
    app.router.add_post("/api/waitlist", post_waitlist)
    app.router.add_route("OPTIONS", "/{tail:.*}", lambda r: web.Response(status=204))
    return app
