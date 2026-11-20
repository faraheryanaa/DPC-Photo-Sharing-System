
from datetime import datetime

from sqlalchemy import (
    String,
    Integer,
    DateTime,
    Text,
    ForeignKey,
    UniqueConstraint,
    func
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


# ==========================================
# 1. USERS TABLE
# ==========================================

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    username: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )

    password_hash: Mapped[str] = mapped_column(
        String(255), nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )


# ==========================================
# 2. FRIENDSHIPS TABLE
# ==========================================

class Friendship(Base):
    __tablename__ = "friendships"

    __table_args__ = (
        UniqueConstraint(
            "requester_id",
            "receiver_id",
            name="unique_friendship"
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    requester_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    receiver_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )


# ==========================================
# 3. GROUPS TABLE
# ==========================================

class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    name: Mapped[str] = mapped_column(
        String(100), nullable=False
    )

    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )


# ==========================================
# 4. GROUP MEMBERS TABLE
# ==========================================

class GroupMember(Base):
    __tablename__ = "group_members"

    __table_args__ = (
        UniqueConstraint(
            "group_id",
            "user_id",
            name="unique_group_member"
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    group_id: Mapped[int] = mapped_column(
        ForeignKey("groups.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )


# ==========================================
# 5. PHOTOS TABLE
# ==========================================

class Photo(Base):
    __tablename__ = "photos"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    group_id: Mapped[int] = mapped_column(
        ForeignKey("groups.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    image_url: Mapped[str] = mapped_column(
        String(500), nullable=False
    )

    caption: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )


# ==========================================
# 6. COMMENTS TABLE
# ==========================================

class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    photo_id: Mapped[int] = mapped_column(
        ForeignKey("photos.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    content: Mapped[str] = mapped_column(
        Text, nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )


# ==========================================
# 7. PHOTO SHARES TABLE
# ==========================================

class PhotoShare(Base):
    __tablename__ = "photo_shares"

    __table_args__ = (
        UniqueConstraint(
            "photo_id",
            "shared_with_user_id",
            name="unique_photo_share"
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    photo_id: Mapped[int] = mapped_column(
        ForeignKey("photos.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    shared_with_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    shared_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
