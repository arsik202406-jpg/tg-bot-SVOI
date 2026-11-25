"""База даних: рейси, бронювання, зайняті місця, клієнти, лист очікування."""
from __future__ import annotations

import logging
import ssl
from uuid import uuid4
from datetime import date, datetime, timezone
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import (BigInteger, Date, DateTime, ForeignKey, Integer, String, Text,
                        UniqueConstraint, select)
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from .config import settings

log = logging.getLogger(__name__)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Departure(Base):
    """Рейс: конкретний тур на конкретну дату."""
    __tablename__ = "departures"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    trip_id: Mapped[str] = mapped_column(String(64), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    # open — набір відкритий, closed — набір закрито, cancelled — рейс скасовано
    status: Mapped[str] = mapped_column(String(16), default="open")
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    # Маршрут збору: куди і на котру треба приїхати (за замовчуванням — з каталогу та 11:00)
    arrive_time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    destination: Mapped[str | None] = mapped_column(Text, nullable=True)
    route_summary: Mapped[str | None] = mapped_column(Text, nullable=True)  # останній затверджений маршрут
    start_time: Mapped[str | None] = mapped_column(String(5), nullable=True)  # виїзд із дому

    bookings: Mapped[list[Booking]] = relationship(back_populates="departure", lazy="selectin")
    __table_args__ = (UniqueConstraint("trip_id", "date", name="uq_trip_date"),)


class Booking(Base):
    __tablename__ = "bookings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(24), unique=True, default=lambda: "tmp-" + uuid4().hex[:16])
    departure_id: Mapped[int] = mapped_column(ForeignKey("departures.id"), index=True)
    user_id: Mapped[int | None] = mapped_column(BigInteger, index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(128))
    username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    phone: Mapped[str] = mapped_column(String(32))
    city: Mapped[str] = mapped_column(String(64))
    address: Mapped[str] = mapped_column(Text)
    postcode: Mapped[str | None] = mapped_column(String(12), nullable=True)   # поштовий індекс (PLZ)
    district: Mapped[str | None] = mapped_column(String(80), nullable=True)   # район (необов'язково)
    pax: Mapped[int] = mapped_column(Integer)
    seats: Mapped[str] = mapped_column(String(32))  # "3,4"
    auto_seats: Mapped[int] = mapped_column(Integer, default=0)
    price_total: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    # new — нова заявка, confirmed — підтверджено, cancelled — скасовано
    status: Mapped[str] = mapped_column(String(16), default="new")
    source: Mapped[str] = mapped_column(String(16), default="bot")  # bot / miniapp / admin
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    pickup_time: Mapped[str | None] = mapped_column(String(5), nullable=True)   # "05:40"
    pickup_order: Mapped[int | None] = mapped_column(Integer, nullable=True)    # порядок у маршруті
    paid: Mapped[int | None] = mapped_column(Integer, nullable=True, default=0)  # 1 — оплачено
    attend: Mapped[str | None] = mapped_column(String(8), nullable=True)        # asked / yes / no

    departure: Mapped[Departure] = relationship(back_populates="bookings", lazy="selectin")

    @property
    def seat_list(self) -> list[int]:
        return [int(x) for x in self.seats.split(",") if x]


class SeatHold(Base):
    """Зайняте місце. Унікальність (рейс, місце) не дає продати одне крісло двічі."""
    __tablename__ = "seat_holds"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    departure_id: Mapped[int] = mapped_column(ForeignKey("departures.id"), index=True)
    seat_no: Mapped[int] = mapped_column(Integer)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"), index=True)
    __table_args__ = (UniqueConstraint("departure_id", "seat_no", name="uq_departure_seat"),)


class Customer(Base):
    """Запам'ятовуємо телефон і адресу, щоб наступного разу не вводити знову."""
    __tablename__ = "customers"
    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=False)
    name: Mapped[str] = mapped_column(String(128), default="")
    username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    city: Mapped[str | None] = mapped_column(String(64), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    postcode: Mapped[str | None] = mapped_column(String(12), nullable=True)
    district: Mapped[str | None] = mapped_column(String(80), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class WaitlistEntry(Base):
    __tablename__ = "waitlist"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    trip_id: Mapped[str] = mapped_column(String(64), index=True)
    user_id: Mapped[int] = mapped_column(BigInteger)
    name: Mapped[str] = mapped_column(String(128))
    username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    __table_args__ = (UniqueConstraint("trip_id", "user_id", name="uq_wait_trip_user"),)


class TripPhoto(Base):
    """Фото туру, завантажене адміном у бота (зберігаємо file_id Telegram)."""
    __tablename__ = "trip_photos"
    trip_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    file_id: Mapped[str] = mapped_column(String(256))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Media(Base):
    """Фото/відео, завантажені адміном: key = welcome (привітання) або van (альбом мінівена)."""
    __tablename__ = "media"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(32), index=True)
    kind: Mapped[str] = mapped_column(String(16))  # photo / video / animation
    file_id: Mapped[str] = mapped_column(String(256))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class KnownChat(Base):
    """Групи й канали, де є бот (щоб публікувати розіграші та вікторини)."""
    __tablename__ = "known_chats"
    chat_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=False)
    title: Mapped[str] = mapped_column(String(128), default="")
    type: Mapped[str] = mapped_column(String(16))  # group / supergroup / channel
    is_admin: Mapped[int] = mapped_column(Integer, default=0)
    last_welcome_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Giveaway(Base):
    __tablename__ = "giveaways"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    prize: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="active")  # active / finished
    winner_user_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    winner_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class GiveawayPost(Base):
    """Де опубліковано розіграш (може бути і в групі, і в каналі)."""
    __tablename__ = "giveaway_posts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    giveaway_id: Mapped[int] = mapped_column(ForeignKey("giveaways.id"), index=True)
    chat_id: Mapped[int] = mapped_column(BigInteger)
    message_id: Mapped[int] = mapped_column(BigInteger)


class GiveawayEntry(Base):
    __tablename__ = "giveaway_entries"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    giveaway_id: Mapped[int] = mapped_column(ForeignKey("giveaways.id"), index=True)
    user_id: Mapped[int] = mapped_column(BigInteger)
    name: Mapped[str] = mapped_column(String(128))
    username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    __table_args__ = (UniqueConstraint("giveaway_id", "user_id", name="uq_gw_user"),)


class DateRequest(Base):
    """Клієнт запропонував свою дату поїздки."""
    __tablename__ = "date_requests"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    trip_id: Mapped[str] = mapped_column(String(64), index=True)
    user_id: Mapped[int] = mapped_column(BigInteger)
    name: Mapped[str] = mapped_column(String(128))
    username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class GamePrize(Base):
    """Приз Колеса Фортуни: один на людину."""
    __tablename__ = "game_prizes"
    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=False)
    name: Mapped[str] = mapped_column(String(128))
    username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    prize: Mapped[str] = mapped_column(String(128))
    code: Mapped[str] = mapped_column(String(32))
    used: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class BotUser(Base):
    """Кожен, хто натиснув /start: для статистики й запрошень друзів."""
    __tablename__ = "bot_users"
    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=False)
    name: Mapped[str] = mapped_column(String(128), default="")
    username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    referred_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)
    source: Mapped[str | None] = mapped_column(String(32), nullable=True)
    first_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Review(Base):
    __tablename__ = "reviews"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    booking_id: Mapped[int] = mapped_column(Integer, index=True, unique=True)
    trip_id: Mapped[str] = mapped_column(String(64), index=True)
    user_id: Mapped[int] = mapped_column(BigInteger)
    name: Mapped[str] = mapped_column(String(128))
    rating: Mapped[int] = mapped_column(Integer)
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="pending")  # pending / approved / hidden
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class JobLog(Base):
    """Що вже зроблено автоматично (щоб після перезапуску не надіслати двічі)."""
    __tablename__ = "job_log"
    key: Mapped[str] = mapped_column(String(96), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SupportThread(Base):
    """Зв'язок «повідомлення в адмін-чаті → клієнт», щоб відповідь адміна дійшла клієнту."""
    __tablename__ = "support_threads"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admin_chat_id: Mapped[int] = mapped_column(BigInteger)
    admin_message_id: Mapped[int] = mapped_column(BigInteger, index=True)
    user_id: Mapped[int] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


def _normalize_url(url: str) -> tuple[str, dict]:
    """postgres://…?sslmode=require (як дає Neon/Supabase) → формат для asyncpg."""
    connect_args: dict = {}
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://"):]
    if url.startswith("postgresql+asyncpg://"):
        parts = urlsplit(url)
        query = dict(parse_qsl(parts.query))
        sslmode = query.pop("sslmode", None)
        query.pop("channel_binding", None)
        if sslmode and sslmode != "disable":
            connect_args["ssl"] = ssl.create_default_context()
        if "-pooler" in (parts.hostname or ""):
            connect_args["statement_cache_size"] = 0  # пулер Neon (PgBouncer) не підтримує кеш запитів
        url = urlunsplit(parts._replace(query=urlencode(query)))
    return url, connect_args


_url, _connect_args = _normalize_url(settings.DATABASE_URL)
if _url.startswith("postgresql"):
    # Без постійних з'єднань: база Neon «засинає», коли бот нею не користується,
    # і не витрачає безкоштовні години.
    engine = create_async_engine(_url, connect_args=_connect_args, poolclass=NullPool)
else:
    engine = create_async_engine(_url, connect_args=_connect_args)
Session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


def _add_missing_columns(conn) -> None:
    """Проста автоміграція: додає нові колонки в уже створені таблиці (дані не чіпає)."""
    from sqlalchemy import inspect
    insp = inspect(conn)
    existing_tables = set(insp.get_table_names())
    for table in Base.metadata.sorted_tables:
        if table.name not in existing_tables:
            continue
        have = {c["name"] for c in insp.get_columns(table.name)}
        for col in table.columns:
            if col.name in have:
                continue
            ddl = col.type.compile(dialect=conn.dialect)
            conn.exec_driver_sql(f'ALTER TABLE {table.name} ADD COLUMN "{col.name}" {ddl}')
            log.info("Додано колонку %s.%s", table.name, col.name)


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_add_missing_columns)
    kind = "SQLite (тимчасова!)" if _url.startswith("sqlite") else "PostgreSQL"
    log.info("База даних готова: %s", kind)


async def get_customer(session: AsyncSession, user_id: int) -> Customer | None:
    return await session.get(Customer, user_id)


async def taken_seats(session: AsyncSession, departure_id: int) -> set[int]:
    rows = await session.scalars(select(SeatHold.seat_no).where(SeatHold.departure_id == departure_id))
    return set(rows)


async def trip_photos(session: AsyncSession) -> dict[str, str]:
    rows = await session.scalars(select(TripPhoto))
    return {r.trip_id: r.file_id for r in rows}


async def trip_photo(session: AsyncSession, trip_id: str) -> str | None:
    """file_id власного фото або URL зі стандартного каталогу (або None)."""
    row = await session.get(TripPhoto, trip_id)
    if row:
        return row.file_id
    from .catalog import TRIPS_BY_ID
    return TRIPS_BY_ID.get(trip_id, {}).get("image") or None


async def media_list(session: AsyncSession, key: str) -> list[Media]:
    return list(await session.scalars(select(Media).where(Media.key == key).order_by(Media.id)))


async def job_done(session: AsyncSession, key: str) -> bool:
    """Позначити завдання виконаним. False — якщо вже було виконано раніше."""
    if await session.get(JobLog, key):
        return False
    session.add(JobLog(key=key))
    await session.commit()
    return True


async def touch_user(user, source: str | None = None, referred_by: int | None = None) -> bool:
    """Запам'ятати користувача. True — якщо це новий користувач."""
    async with Session() as s:
        row = await s.get(BotUser, user.id)
        new = row is None
        if new:
            row = BotUser(user_id=user.id, source=source,
                          referred_by=referred_by if referred_by and referred_by != user.id else None)
            s.add(row)
        row.name = user.full_name
        row.username = user.username
        row.last_seen = utcnow()
        await s.commit()
        return new
