import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import ARRAY, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class CardStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class CardType(str, enum.Enum):
    flashcard = "flashcard"
    mcq = "mcq"
    fill_blank = "fill_blank"

class Note(Base):
    __tablename__ = "notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    title = Column(String(255), nullable=True, default="Untitled Note")
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC), nullable=False)

    flashcards = relationship("Flashcard", back_populates="note", cascade="all, delete-orphan")

class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    note_id = Column(UUID(as_uuid=True), ForeignKey("notes.id", ondelete="CASCADE"), nullable=False)
    prompt = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    source_reference = Column(Text, nullable=False)
    status = Column(SQLEnum(CardStatus, name="card_status_enum", create_type=False), default=CardStatus.pending, nullable=False, index=True)
    type = Column(SQLEnum(CardType, name="card_type_enum", create_type=False), default=CardType.flashcard, nullable=False)
    is_active = Column(Integer, default=1, nullable=False)  # 1 = active, 0 = soft-deleted/deactivated
    created_at = Column(DateTime, default=lambda: datetime.now(UTC), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC), nullable=False)
    card_metadata = Column("metadata", JSONB, default=dict, nullable=False)

    note = relationship("Note", back_populates="flashcards")

class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    card_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=False)
    score = Column(Integer, default=0, nullable=False)
    total_questions = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC), nullable=False)
    completed_at = Column(DateTime, nullable=True)
    session_metadata = Column("metadata", JSONB, default=dict, nullable=False)
