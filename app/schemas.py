import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models import CardStatus, CardType


# --- Note Schemas ---
class NoteCreate(BaseModel):
    title: str | None = "Untitled Note"
    content: str = Field(..., min_length=1)

class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None

class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    title: str | None
    content: str
    created_at: datetime
    updated_at: datetime

# --- Flashcard Schemas ---
class CardGenerateRequest(BaseModel):
    note_ids: list[uuid.UUID] | None = None
    content: str | None = None
    style: str | None = "basic recall" # basic recall, application-level, conceptual
    card_types: list[CardType] | None = [CardType.flashcard, CardType.mcq, CardType.fill_blank]
    count: int | None = 5

class CardEditRequest(BaseModel):
    prompt: str | None = None
    answer: str | None = None
    source_reference: str | None = None
    type: CardType | None = None
    metadata: dict[str, Any] | None = None

class CardRegenerateRequest(BaseModel):
    style: str | None = "application-level"
    instructions: str | None = None

class FlashcardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    note_id: uuid.UUID
    prompt: str
    answer: str
    source_reference: str
    status: CardStatus
    type: CardType
    is_active: int
    created_at: datetime
    updated_at: datetime
    card_metadata: dict[str, Any] = Field(default_factory=dict)

# --- Quiz Schemas ---
class QuizStartRequest(BaseModel):
    card_ids: list[uuid.UUID] | None = None
    limit: int | None = 10
    card_type: CardType | None = None

class QuizSubmitAnswer(BaseModel):
    card_id: uuid.UUID
    user_answer: str
    is_correct: bool

class QuizCompleteRequest(BaseModel):
    answers: list[QuizSubmitAnswer]

class QuizSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    card_ids: list[uuid.UUID]
    score: int
    total_questions: int
    created_at: datetime
    completed_at: datetime | None
    session_metadata: dict[str, Any] = Field(default_factory=dict)
