from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import get_admin_user
from ..database import get_db
from ..models import Role, User, UserStatus
from ..schemas import RoleUpdate, UserAdminOut

router = APIRouter(prefix="/users", tags=["users"])


def _get_user(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.get("", response_model=list[UserAdminOut])
def list_users(
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return db.scalars(select(User).order_by(User.created_at.asc(), User.id.asc())).all()


@router.post("/{user_id}/approve", response_model=UserAdminOut)
def approve_user(
    user_id: int,
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
):
    user = _get_user(db, user_id)
    user.status = UserStatus.active
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/deny", response_model=UserAdminOut)
def deny_user(
    user_id: int,
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
):
    user = _get_user(db, user_id)
    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deny your own account"
        )
    user.status = UserStatus.denied
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/role", response_model=UserAdminOut)
def set_user_role(
    user_id: int,
    payload: RoleUpdate,
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
):
    user = _get_user(db, user_id)
    if user.role == Role.admin and payload.role != Role.admin:
        admin_count = db.scalar(select(func.count(User.id)).where(User.role == Role.admin)) or 0
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last admin",
            )
    user.role = payload.role
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
):
    user = _get_user(db, user_id)
    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account"
        )
    db.delete(user)
    db.commit()
