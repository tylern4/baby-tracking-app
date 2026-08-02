from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_write
from ..database import get_db
from ..models import Entry, EntryType, User
from ..schemas import EntryCreate, EntryOut, EntryUpdate

router = APIRouter(prefix="/entries", tags=["entries"])


@router.get("", response_model=list[EntryOut])
def list_entries(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    type: EntryType | None = None,
    from_: datetime | None = Query(default=None, alias="from"),
    to: datetime | None = None,
):
    query = select(Entry)
    if type is not None:
        query = query.where(Entry.type == type)
    if from_ is not None:
        query = query.where(Entry.started_at >= from_)
    if to is not None:
        query = query.where(Entry.started_at <= to)
    query = query.order_by(Entry.started_at.desc())
    return db.scalars(query).all()


@router.post("", response_model=EntryOut, status_code=status.HTTP_201_CREATED)
def create_entry(
    payload: EntryCreate,
    current_user: Annotated[User, Depends(require_write)],
    db: Annotated[Session, Depends(get_db)],
):
    if payload.ended_at is not None and payload.ended_at < payload.started_at:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="End time must be after start time",
        )
    entry = Entry(
        user_id=current_user.id,
        type=payload.type,
        started_at=payload.started_at,
        ended_at=payload.ended_at,
        details=payload.details or {},
        note=payload.note,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def _get_entry(db: Session, entry_id: int) -> Entry:
    entry = db.get(Entry, entry_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    return entry


@router.patch("/{entry_id}", response_model=EntryOut)
def update_entry(
    entry_id: int,
    payload: EntryUpdate,
    current_user: Annotated[User, Depends(require_write)],
    db: Annotated[Session, Depends(get_db)],
):
    entry = _get_entry(db, entry_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(entry, field, value)
    if (
        entry.ended_at is not None
        and entry.started_at is not None
        and entry.ended_at < entry.started_at
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="End time must be after start time",
        )
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    entry_id: int,
    current_user: Annotated[User, Depends(require_write)],
    db: Annotated[Session, Depends(get_db)],
):
    entry = _get_entry(db, entry_id)
    db.delete(entry)
    db.commit()
