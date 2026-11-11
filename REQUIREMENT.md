git s# Living Study Guide — Requirements Specification

## 1. Overview

The **Living Study Guide** is a private, AI-powered study application built on Replit. It transforms a user's personal notes into interactive flashcards and quiz questions. Every generated card is grounded in the user's own source material and held for human approval before entering their personal study library. The approved library is persistent across sessions and searchable, supporting self-quizzing.

### Vision

> *"Keeping the source beside what an AI wrote, and having a person approve it, works anywhere accuracy matters."*

This project teaches three fundamental skills:
1. Building an AI-powered app that turns source material into flashcards and quizzes.
2. Designing a **human-in-the-loop** workflow where every AI output is reviewed before being committed.
3. Adding persistent storage so user data survives across sessions.

---

## 2. Stakeholders & Actors

| Actor             | Role                                                              |
|--------------------|-------------------------------------------------------------------|
| **Student / User** | Owns the notes, approves or rejects generated cards, studies from the library. |
| **AI Assistant**   | Generates flashcards and quiz questions grounded in source material. |
| *(Implicit)*       | The system itself acts as a curator gatekeeper between AI generation and library storage. |

---

## 3. Prerequisites

- A **Replit account** on Core tier or higher.
- A **set of personal notes** to study from (text, markdown, PDF excerpts, etc.).

---

## 4. Functional Requirements

### 4.1 Source Material Management

| ID       | Requirement                                                                                           | Priority |
|----------|-------------------------------------------------------------------------------------------------------|----------|
| FR-01    | The user can import or paste their own notes into the application.                                    | Must     |
| FR-02    | Notes are stored as raw text segments (paragraphs, sections, or lines) for AI grounding.             | Must     |
| FR-03    | Each note segment is indexed and searchable within its own context.                                   | Should   |
| FR-04    | The user can delete or edit source notes at any time.                                                | Should   |

### 4.2 AI-Powered Card & Quiz Generation

| ID       | Requirement                                                                                           | Priority |
|----------|-------------------------------------------------------------------------------------------------------|----------|
| FR-05    | The system uses an LLM to generate flashcards from the user's notes.                                 | Must     |
| FR-06    | The system uses an LLM to generate quiz questions (e.g., multiple-choice, fill-in-the-blank) from notes. | Must |
| FR-07    | Every generated card **must cite** the exact source sentence/paragraph it was derived from.            | Must     |
| FR-08    | Cards include at minimum: a prompt/question, an answer/definition, and the source reference.          | Must     |
| FR-09    | The user can specify the **depth** or **style** of generated content (e.g., basic recall vs. application-level). | Should |
| FR-10    | Generated cards appear in a **pending review** queue before being committed to the library.           | Must     |

### 4.3 Human-in-the-Loop Approval Workflow

| ID       | Requirement                                                                                           | Priority |
|----------|-------------------------------------------------------------------------------------------------------|----------|
| FR-11    | Every new card waits in a pending state beside its source sentence until the user approves it.        | Must     |
| FR-12    | The user can **approve** a card, moving it to the approved library.                                   | Must     |
| FR-13    | The user can **reject** a card, discarding it permanently or sending it back for regeneration.        | Must     |
| FR-14    | The user can **edit** a card's content before approving it (prompt, answer, or source reference).    | Should   |
| FR-15    | Rejected cards can be regenerated from the same source segment with adjusted parameters.              | Should   |
| FR-16    | The UI clearly visually differentiates *pending*, *approved*, and *rejected* states for each card.   | Must     |

### 4.4 Persistent Study Library

| ID       | Requirement                                                                                           | Priority |
|----------|-------------------------------------------------------------------------------------------------------|----------|
| FR-17    | Approved flashcards persist across sessions in a private library.                                     | Must     |
| FR-18    | The library is searchable by keyword, tag, or source content.                                         | Must     |
| FR-19    | The user can **deactivate** (soft-delete) approved cards without permanently deleting them.           | Should   |
| FR-20    | The user can **permanently delete** a card from the library.                                          | Should   |
| FR-21    | Each stored card retains its source reference and generation metadata (creation date, edits).         | Must     |

### 4.5 Self-Quizzing Mode

| ID       | Requirement                                                                                           | Priority |
|----------|-------------------------------------------------------------------------------------------------------|----------|
| FR-22    | The user can enter a **quiz mode** using cards from their approved library.                           | Must     |
| FR-23    | Quiz mode supports flashcard review (front → flip to back).                                           | Must     |
| FR-24    | Quiz mode supports multiple-choice or fill-in-the-blank practice questions.                           | Should   |
| FR-25    | The user can track their quiz performance (e.g., score, streak, accuracy rate).                       | Could    |

### 4.6 Data Persistence & Sessions

| ID       | Requirement                                                                                           | Priority |
|----------|-------------------------------------------------------------------------------------------------------|----------|
| FR-26    | All user data (notes, cards, preferences) persists across app sessions.                               | Must     |
| FR-27    | The application uses a backend database or persistent storage layer (e.g., SQLite, PostgreSQL, Redis). | Must |
| FR-28    | Data is private to the owning user (no cross-user sharing).                                           | Must     |

---

## 5. Non-Functional Requirements

| ID       | Requirement                                                                                           | Priority |
|----------|-------------------------------------------------------------------------------------------------------|----------|
| NFR-01   | The system must respond to card-generation requests within a reasonable time (< 10 seconds typical). | Must     |
| NFR-02   | The UI must be clean, readable, and distraction-free — optimized for studying.                      | Should   |
| NFR-03   | The app must handle at least 5,000 flashcards per user without degradation.                          | Should   |
| NFR-04   | All AI-generated content must be clearly marked as AI-derived.                                       | Must     |
| NFR-05   | Source material and user notes are stored encrypted or behind authentication.                        | Must     |

---

## 6. Data Model

### 6.1 Note (Source Material)

```
Note {
  id            : UUID
  owner_id      : UUID
  content       : TEXT          -- raw text of the note
  created_at    : DateTime
  updated_at    : DateTime
}
```

### 6.2 Flashcard (Pending or Approved)

```
Flashcard {
  id              : UUID
  owner_id        : UUID
  note_id         : UUID FK → Note
  prompt          : TEXT        -- question / front of card
  answer          : TEXT        -- definition / back of card
  source_reference: TEXT        -- the exact sentence the card came from
  status          : ENUM {pending, approved, rejected}
  type            : ENUM {flashcard, mcq, fill_blank}
  created_at      : DateTime
  updated_at      : DateTime
  metadata        : JSON        -- e.g., difficulty, tags, edit history
}
```

### 6.3 Quiz Session (Optional)

```
QuizSession {
  id              : UUID
  owner_id        : UUID
  card_ids        : UUID[]      -- cards included in the quiz
  score           : INTEGER     -- correct answers / total
  completed_at    : DateTime
}
```

---

## 7. User Workflow

```
┌─────────────────────┐
│ 1. Import / Paste    │  User loads their notes into the system.
│    Your Notes        │
└──────────┬───────────┘
           ▼
┌─────────────────────┐
│ 2. AI Generates      │  LLM reads note segments and produces flashcards/quiz
│    Cards             │  questions, each anchored to the source sentence.
└──────────┬───────────┘
           ▼
┌─────────────────────┐
│ 3. Pending Review     │  New cards appear in a queue with their source text
│    (Human-in-the-Loop)│  displayed alongside them for review.
└──────────┬───────────┘
           ▼
      ┌────┴────┐
      │ Approve?│
      └────┬────┘
     YES ↙    ↘ NO
   ┌────▼──┐  ┌───────┐
   │4a.    │  │4b.    │
   │Approved│  │Rejected│
   │Library│  │ or      │
   │        │  │Regenerate│
   └────────┘  └────────┘
           ▼
┌─────────────────────┐
│ 5. Self-Quiz         │  User studies from the approved library via
│    Mode              │  flashcard review, quizzes, or practice tests.
└─────────────────────┘
```

---

## 8. UI / UX Guidelines

### 8.1 Main Screens

| Screen             | Purpose                                                                    |
|---------------------|----------------------------------------------------------------------------|
| **Notes**           | View, add, edit, or delete source notes.                                   |
| **Flashcards (Pending)** | Review AI-generated cards side-by-side with their source text; approve or reject. |
| **Flashcards (Library)** | Browse the approved card library with search and filtering.              |
| **Quiz Mode**       | Interactive self-quizzing with progress tracking.                          |

### 8.2 Pending Card View (Core UX Pattern)

```
┌───────────────────────────────────────────────┐
│  ⏳ PENDING — Card #42                        │
├───────────────────────────────────────────────┤
│                                               │
│  SOURCE:                                       │
│  "The inventory management API uses            │
│   RESTful endpoints to track stock levels."    │
│                                               │
│  PROMPT:                                       │
│  What does the inventory management API use?   │
│                                               │
│  ANSWER:                                       │
│  RESTful endpoints to track stock levels.      │
│                                               │
│  [ ✅ Approve ]   [ ✏️ Edit ]   [ ❌ Reject ]  │
└───────────────────────────────────────────────┘
```

### 8.3 Design Principles

- **Source always visible** next to AI-generated content.
- **Clear state indicators** (pending = ⏳, approved = ✅, rejected = ❌).
- Minimal distractions — clean typography, generous whitespace.
- Keyboard shortcuts for approve/reject during bulk review.

---

## 9. Technical Architecture (Replit Context)

```
┌───────────────────────────────────────────────┐
│                 Replit App                     │
│                                               │
│  ┌──────────┐    ┌──────────┐    ┌─────────┐ │
│  │ Frontend │◄──►│  Backend  │◄──►│  DB     │ │
│  │ (React/  │    │  (Flask/ │    │(SQLite/ │ │
│  │  Svelte) │    │   FastAPI)│    │ Postgr.)│ │
│  └──────────┘    └──────────┘    └─────────┘ │
│         ▲              ▲                       │
│         │              │                       │
│    ┌─────┴─────┐   ┌───┴──────┐               │
│    │  AI Model  │   │ LLM API  │               │
│    │ (via Replit│   │(OpenAI,  │               │
│    │  AI pkg)  │   │ Ollama…) │               │
│    └───────────┘   └──────────┘               │
└───────────────────────────────────────────────┘
```

### Tech Stack Recommendations

| Layer          | Recommendation                          |
|----------------|------------------------------------------|
| **Frontend**   | React, SvelteKit, or HTML/HTMX           |
| **Backend**    | Python (FastAPI / Flask) or Node.js       |
| **Database**   | SQLite (simple) or PostgreSQL             |
| **AI / LLM**   | OpenAI GPT, Anthropic, or local model     |
| **Auth**       | Replit Auth or basic session auth         |

---

## 10. API Summary

### Endpoints (RESTful)

| Method | Endpoint               | Description                              |
|--------|------------------------|------------------------------------------|
| `GET`  | `/api/notes`           | List all source notes                    |
| `POST` | `/api/notes`           | Add a new note                           |
| `GET`  | `/api/notes/:id`       | Get note details                         |
| `PUT`  | `/api/notes/:id`       | Update a note                            |
| `DEL`  | `/api/notes/:id`       | Delete a note                            |
| `POST` | `/api/cards/generate`  | Generate flashcards from note(s)         |
| `GET`  | `/api/cards/pending`   | List pending cards for review            |
| `PATCH`| `/api/cards/:id/approve` | Approve a card (move to library)       |
| `PATCH`| `/api/cards/:id/reject`  | Reject a card                           |
| `PUT`  | `/api/cards/:id/edit`    | Edit a pending card                    |
| `GET`  | `/api/cards/library`   | Browse approved cards (searchable)       |
| `POST` | `/api/quiz/session`     | Start a new quiz session                 |
| `GET`  | `/api/quiz/results`     | View quiz performance history            |

---

## 11. Acceptance Criteria

| # | Scenario                                                          | Expected Outcome                              |
|---|-------------------------------------------------------------------|-----------------------------------------------|
| 1 | User imports a note and clicks "Generate Cards"                    | AI produces flashcards with source citations  |
| 2 | A new card appears in the pending queue                             | Source text is visible alongside the card     |
| 3 | User clicks "Approve" on a card                                    | Card moves to the library; removed from pending |
| 4 | User closes the browser and returns                                | All cards (pending, approved, rejected) persist |
| 5 | User searches the library for a keyword                            | Matching cards are returned                    |
| 6 | User enters Quiz Mode                                              | Flashcards display interactively with scoring |

---

## 12. Out of Scope (v1)

- Multi-user collaboration or shared study groups.
- AI-generated note summarization (notes are user-provided only).
- Mobile-native app (web-first, responsive).
- Export to external formats (Anki import, PDF export).
- Gamification features beyond basic score tracking.

---

## 13. Glossary

| Term               | Definition                                                                  |
|---------------------|-----------------------------------------------------------------------------|
| **Flashcard**       | A study card with a prompt/question on one side and an answer/definition on the other. |
| **Pending**         | AI-generated card awaiting human approval.                                  |
| **Approved Library**| The persistent collection of reviewed, user-kept flashcards.                |
| **Source Citation** | The exact sentence or paragraph from the user's notes that a card was derived from. |
| **Human-in-the-Loop**| A workflow pattern where a human must review and approve AI output before it is committed. |
| **Quiz Mode**       | An interactive study mode for self-testing against the approved library.    |

---

*Document version: 1.0*  
*Created: 2026-11-11*  
*Based on the Living Study Guide Replit tutorial narrative.*
