import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class EntryType(str, enum.Enum):
    feed = "feed"
    sleep = "sleep"
    diaper = "diaper"


class Role(str, enum.Enum):
    admin = "admin"
    user = "user"
    read_only = "read_only"


class UserStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    denied = "denied"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(
        Enum(Role, name="userrole"), nullable=False
    )
    status: Mapped[UserStatus] = mapped_column(
        Enum(UserStatus, name="userstatus"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    entries: Mapped[list["Entry"]] = relationship(
        back_populates="user", passive_deletes=True
    )


class Entry(Base):
    __tablename__ = "entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    type: Mapped[EntryType] = mapped_column(Enum(EntryType, name="entrytype"), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    details: Mapped[dict] = mapped_column(JSONB, default=dict)
    note: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User | None] = relationship(back_populates="entries")
