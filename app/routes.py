import io
import uuid

import pypdf
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import CardStatus, CardType, Flashcard, Note, QuizSession
from app.schemas import (
    CardEditRequest,
    CardGenerateRequest,
    CardRegenerateRequest,
    FlashcardResponse,
    NoteCreate,
    NoteResponse,
    NoteUpdate,
    QuizCompleteRequest,
    QuizSessionResponse,
    QuizStartRequest,
)
from app.services.llm import generate_cards_with_llm

router = APIRouter(prefix="/api")

def get_current_user_id() -> uuid.UUID:
    return uuid.UUID(settings.DEFAULT_USER_ID)

# --- NOTES ENDPOINTS ---

@router.get("/notes", response_model=list[NoteResponse])
def list_notes(
    q: str | None = None,
    db: Session = Depends(get_db),
    owner_id: uuid.UUID = Depends(get_current_user_id)
):
    query = db.query(Note).filter(Note.owner_id == owner_id)
    if q:
        query = query.filter(or_(Note.title.ilike(f"%{q}%"), Note.content.ilike(f"%{q}%")))
    return query.order_by(desc(Note.created_at)).all()

@router.post("/notes", response_model=NoteResponse)
def create_note(
    note_in: NoteCreate,
    db: Session = Depends(get_db),
    owner_id: uuid.UUID = Depends(get_current_user_id)
):
    note = Note(
        owner_id=owner_id,
        title=note_in.title or "Untitled Note",
        content=note_in.content
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

@router.post("/notes/upload", response_model=NoteResponse)
async def upload_note_file(
    file: UploadFile = File(...),
    title: str | None = Form(None),
    db: Session = Depends(get_db),
    owner_id: uuid.UUID = Depends(get_current_user_id)
):
    filename = file.filename or "uploaded_note.txt"
    note_title = title or filename
    content = ""
    
    if filename.lower().endswith(".pdf"):
        file_bytes = await file.read()
        pdf_reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        extracted_text = []
        for page in pdf_reader.pages:
            t = page.extract_text()
            if t:
                extracted_text.append(t)
        content = "\n\n".join(extracted_text)
    else:
        file_bytes = await file.read()
        content = file_bytes.decode("utf-8", errors="replace")

    if not content.strip():
        raise HTTPException(status_code=400, detail="Uploaded file contained no extractable text.")

    note = Note(
        owner_id=owner_id,
        title=note_title,
        content=content
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

@router.get("/notes/{note_id}", response_model=NoteResponse)
def get_note(
    note_id: uuid.UUID,
    db: Session = Depends(get_db),
    owner_id: uuid.UUID = Depends(get_current_user_id)
):
    note = db.query(Note).filter(Note.id == note_id, Note.owner_id == owner_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note

@router.put("/notes/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: uuid.UUID,
    note_in: NoteUpdate,
    db: Session = Depends(get_db),
    owner_id: uuid.UUID = Depends(get_current_user_id)
):
    note = db.query(Note).filter(Note.id == note_id, Note.owner_id == owner_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note_in.title is not None:
        note.title = note_in.title
    if note_in.content is not None:
        note.content = note_in.content
    db.commit()
    db.refresh(note)
    return note

@router.delete("/notes/{note_id}")
def delete_note(
    note_id: uuid.UUID,
    db: Session = Depends(get_db),
    owner_id: uuid.UUID = Depends(get_current_user_id)
):
    note = db.query(Note).filter(Note.id == note_id, Note.owner_id == owner_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    return {"message": "Note deleted successfully"}

# --- FLASHCARD & AI GENERATION ENDPOINTS ---

@router.post("/cards/generate", response_model=list[FlashcardResponse])
def generate_cards(
    req: CardGenerateRequest,
    db: Session = Depends(get_db),
    owner_id: uuid.UUID = Depends(get_current_user_id)
):
    source_notes = []
    if req.note_ids:
        source_notes = db.query(Note).filter(Note.id.in_(req.note_ids), Note.owner_id == owner_id).all()
    elif req.content:
        # Create a note automatically if raw content is supplied
        temp_note = Note(owner_id=owner_id, title="Generated Session Note", content=req.content)
        db.add(temp_note)
        db.commit()
        db.refresh(temp_note)
        source_notes = [temp_note]
    else:
        # Get most recent note
        latest = db.query(Note).filter(Note.owner_id == owner_id).order_by(desc(Note.created_at)).first()
        if latest:
            source_notes = [latest]

    if not source_notes:
        raise HTTPException(status_code=400, detail="No source note available to generate cards from.")

    all_created_cards = []
    for note in source_notes:
        raw_cards = generate_cards_with_llm(
            note_content=note.content,
            style=req.style or "basic recall",
            card_types=req.card_types,
            count=req.count or 5
        )
        for raw in raw_cards:
            card = Flashcard(
                owner_id=owner_id,
                note_id=note.id,
                prompt=raw["prompt"],
                answer=raw["answer"],
                source_reference=raw["source_reference"],
                status=CardStatus.pending,
                type=CardType(raw["type"]) if raw.get("type") in [t.value for t in CardType] else CardType.flashcard,
                card_metadata=raw.get("metadata", {})
            )
            db.add(card)
            all_created_cards.append(card)

    db.commit()
    for card in all_created_cards:
        db.refresh(card)
    return all_created_cards

@router.get("/cards/pending", response_model=list[FlashcardResponse])
def list_pending_cards(
    db: Session = Depends(get_db),
    owner_id: uuid.UUID = Depends(get_current_user_id)
):
    return db.query(Flashcard).filter(
        Flashcard.owner_id == owner_id,
        Flashcard.status == CardStatus.pending
    ).order_by(desc(Flashcard.created_at)).all()

@router.patch("/cards/{card_id}/approve", response_model=FlashcardResponse)
def approve_card(
    card_id: uuid.UUID,
    db: Session = Depends(get_db),
    owner_id: uuid.UUID = Depends(get_current_user_id)
):
    card = db.query(Flashcard).filter(Flashcard.id == card_id, Flashcard.owner_id == owner_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    card.status = CardStatus.approved
    db.commit()
    db.refresh(card)
    return card

@router.patch("/cards/{card_id}/reject", response_model=FlashcardResponse)
def reject_card(
    card_id: uuid.UUID,
    db: Session = Depends(get_db),
    owner_id: uuid.UUID = Depends(get_current_user_id)
):
    card = db.query(Flashcard).filter(Flashcard.id == card_id, Flashcard.owner_id == owner_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    card.status = CardStatus.rejected
    db.commit()
    db.refresh(card)
    return card

@router.put("/cards/{card_id}/edit", response_model=FlashcardResponse)
def edit_card(
    card_id: uuid.UUID,
    edit_in: CardEditRequest,
    db: Session = Depends(get_db),
    owner_id: uuid.UUID = Depends(get_current_user_id)
):
    card = db.query(Flashcard).filter(Flashcard.id == card_id, Flashcard.owner_id == owner_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    if edit_in.prompt is not None:
        card.prompt = edit_in.prompt
    if edit_in.answer is not None:
        card.answer = edit_in.answer
    if edit_in.source_reference is not None:
        card.source_reference = edit_in.source_reference
    if edit_in.type is not None:
        card.type = edit_in.type
    if edit_in.metadata is not None:
        card.card_metadata = edit_in.metadata
    db.commit()
    db.refresh(card)
    return card

@router.post("/cards/{card_id}/regenerate", response_model=FlashcardResponse)
def regenerate_card(
    card_id: uuid.UUID,
    regen_in: CardRegenerateRequest,
    db: Session = Depends(get_db),
    owner_id: uuid.UUID = Depends(get_current_user_id)
):
    card = db.query(Flashcard).filter(Flashcard.id == card_id, Flashcard.owner_id == owner_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    note = db.query(Note).filter(Note.id == card.note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Associated source note not found")

    new_cards = generate_cards_with_llm(
        note_content=card.source_reference or note.content,
        style=regen_in.style or "application-level",
        card_types=[card.type],
        count=1
    )
    if not new_cards:
        raise HTTPException(status_code=500, detail="Could not regenerate card content from source.")

    raw = new_cards[0]
    card.prompt = raw["prompt"]
    card.answer = raw["answer"]
    card.source_reference = raw["source_reference"]
    card.card_metadata = raw.get("metadata", {})
    card.status = CardStatus.pending
    db.commit()
    db.refresh(card)
    return card

@router.get("/cards/library", response_model=list[FlashcardResponse])
def get_library_cards(
    q: str | None = None,
    card_type: CardType | None = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    owner_id: uuid.UUID = Depends(get_current_user_id)
):
    query = db.query(Flashcard).filter(
        Flashcard.owner_id == owner_id,
        Flashcard.status == CardStatus.approved
    )
    if not include_inactive:
        query = query.filter(Flashcard.is_active == 1)
    if card_type:
        query = query.filter(Flashcard.type == card_type)
    if q:
        query = query.filter(
            or_(
                Flashcard.prompt.ilike(f"%{q}%"),
                Flashcard.answer.ilike(f"%{q}%"),
                Flashcard.source_reference.ilike(f"%{q}%")
            )
        )
    return query.order_by(desc(Flashcard.updated_at)).all()

@router.patch("/cards/{card_id}/toggle-active", response_model=FlashcardResponse)
def toggle_card_active(
    card_id: uuid.UUID,
    db: Session = Depends(get_db),
    owner_id: uuid.UUID = Depends(get_current_user_id)
):
    card = db.query(Flashcard).filter(Flashcard.id == card_id, Flashcard.owner_id == owner_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    card.is_active = 0 if card.is_active == 1 else 1
    db.commit()
    db.refresh(card)
    return card

@router.delete("/cards/{card_id}")
def delete_card_permanently(
    card_id: uuid.UUID,
    db: Session = Depends(get_db),
    owner_id: uuid.UUID = Depends(get_current_user_id)
):
    card = db.query(Flashcard).filter(Flashcard.id == card_id, Flashcard.owner_id == owner_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    db.delete(card)
    db.commit()
    return {"message": "Card permanently deleted"}

# --- QUIZ ENDPOINTS ---

@router.post("/quiz/session", response_model=QuizSessionResponse)
def start_quiz_session(
    req: QuizStartRequest,
    db: Session = Depends(get_db),
    owner_id: uuid.UUID = Depends(get_current_user_id)
):
    query = db.query(Flashcard).filter(
        Flashcard.owner_id == owner_id,
        Flashcard.status == CardStatus.approved,
        Flashcard.is_active == 1
    )
    if req.card_ids:
        query = query.filter(Flashcard.id.in_(req.card_ids))
    if req.card_type:
        query = query.filter(Flashcard.type == req.card_type)
    
    cards = query.limit(req.limit or 20).all()
    if not cards:
        raise HTTPException(status_code=400, detail="No approved active cards available for quiz.")

    selected_ids = [c.id for c in cards]
    quiz_sess = QuizSession(
        owner_id=owner_id,
        card_ids=selected_ids,
        score=0,
        total_questions=len(selected_ids)
    )
    db.add(quiz_sess)
    db.commit()
    db.refresh(quiz_sess)
    return quiz_sess

@router.post("/quiz/session/{session_id}/complete", response_model=QuizSessionResponse)
def complete_quiz_session(
    session_id: uuid.UUID,
    req: QuizCompleteRequest,
    db: Session = Depends(get_db),
    owner_id: uuid.UUID = Depends(get_current_user_id)
):
    sess = db.query(QuizSession).filter(QuizSession.id == session_id, QuizSession.owner_id == owner_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Quiz session not found")
    
    score = sum(1 for a in req.answers if a.is_correct)
    sess.score = score
    sess.total_questions = len(req.answers)
    from datetime import UTC, datetime
    sess.completed_at = datetime.now(UTC)
    sess.session_metadata = {"answers": [a.model_dump(mode="json") for a in req.answers]}
    db.commit()
    db.refresh(sess)
    return sess

@router.get("/quiz/results", response_model=list[QuizSessionResponse])
def get_quiz_results(
    db: Session = Depends(get_db),
    owner_id: uuid.UUID = Depends(get_current_user_id)
):
    return db.query(QuizSession).filter(
        QuizSession.owner_id == owner_id
    ).order_by(desc(QuizSession.created_at)).all()
