from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .models import EntryType, Role, UserStatus


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    invite_code: str | None = Field(default=None, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: Role
    status: UserStatus


class UserAdminOut(UserOut):
    created_at: datetime


class RegisterOut(BaseModel):
    user: UserOut
    access_token: str | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class RoleUpdate(BaseModel):
    role: Role


class EntryCreate(BaseModel):
    type: EntryType
    started_at: datetime
    ended_at: datetime | None = None
    details: dict = Field(default_factory=dict)
    note: str | None = Field(default=None, max_length=1000)


class EntryUpdate(BaseModel):
    type: EntryType | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    details: dict | None = None
    note: str | None = None


class EntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None
    type: EntryType
    started_at: datetime
    ended_at: datetime | None
    details: dict
    note: str | None
    created_at: datetime
    updated_at: datetime


class DaySummary(BaseModel):
    feeds: int = 0
    feed_ml: float = 0
    feed_minutes: float = 0
    sleeps: int = 0
    sleep_minutes: float = 0
    diapers: int = 0
    wet: int = 0
    dirty: int = 0


class MonthSummary(BaseModel):
    month: str
    days: dict[str, DaySummary]


class StatsOut(BaseModel):
    start: str
    end: str
    days: dict[str, DaySummary]
