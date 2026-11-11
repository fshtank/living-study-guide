import type { Note, Flashcard, QuizSession, CardType } from './types';

const API_BASE = '/api';

export const api = {
  // Notes
  async getNotes(q?: string): Promise<Note[]> {
    const url = q ? `${API_BASE}/notes?q=${encodeURIComponent(q)}` : `${API_BASE}/notes`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch notes');
    return res.json();
  },

  async createNote(title: string, content: string): Promise<Note> {
    const res = await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });
    if (!res.ok) throw new Error('Failed to create note');
    return res.json();
  },

  async uploadNoteFile(file: File, title?: string): Promise<Note> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    const res = await fetch(`${API_BASE}/notes/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload file');
    return res.json();
  },

  async updateNote(id: string, title?: string, content?: string): Promise<Note> {
    const res = await fetch(`${API_BASE}/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });
    if (!res.ok) throw new Error('Failed to update note');
    return res.json();
  },

  async deleteNote(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/notes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete note');
  },

  // Cards
  async generateCards(noteIds?: string[], content?: string, style?: string, cardTypes?: CardType[], count?: number): Promise<Flashcard[]> {
    const res = await fetch(`${API_BASE}/cards/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note_ids: noteIds, content, style, card_types: cardTypes, count }),
    });
    if (!res.ok) throw new Error('Failed to generate cards');
    return res.json();
  },

  async getPendingCards(): Promise<Flashcard[]> {
    const res = await fetch(`${API_BASE}/cards/pending`);
    if (!res.ok) throw new Error('Failed to fetch pending cards');
    return res.json();
  },

  async approveCard(id: string): Promise<Flashcard> {
    const res = await fetch(`${API_BASE}/cards/${id}/approve`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Failed to approve card');
    return res.json();
  },

  async rejectCard(id: string): Promise<Flashcard> {
    const res = await fetch(`${API_BASE}/cards/${id}/reject`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Failed to reject card');
    return res.json();
  },

  async editCard(id: string, prompt?: string, answer?: string, source_reference?: string, type?: CardType): Promise<Flashcard> {
    const res = await fetch(`${API_BASE}/cards/${id}/edit`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, answer, source_reference, type }),
    });
    if (!res.ok) throw new Error('Failed to edit card');
    return res.json();
  },

  async regenerateCard(id: string, style?: string): Promise<Flashcard> {
    const res = await fetch(`${API_BASE}/cards/${id}/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ style }),
    });
    if (!res.ok) throw new Error('Failed to regenerate card');
    return res.json();
  },

  async getLibraryCards(q?: string, card_type?: CardType, include_inactive = false): Promise<Flashcard[]> {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (card_type) params.append('card_type', card_type);
    if (include_inactive) params.append('include_inactive', 'true');
    const res = await fetch(`${API_BASE}/cards/library?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch library cards');
    return res.json();
  },

  async toggleActive(id: string): Promise<Flashcard> {
    const res = await fetch(`${API_BASE}/cards/${id}/toggle-active`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Failed to toggle card active state');
    return res.json();
  },

  async deleteCard(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/cards/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete card');
  },

  // Quiz
  async startQuiz(cardIds?: string[], limit = 10, card_type?: CardType): Promise<QuizSession> {
    const res = await fetch(`${API_BASE}/quiz/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_ids: cardIds, limit, card_type }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to start quiz');
    }
    return res.json();
  },

  async completeQuiz(sessionId: string, answers: Array<{ card_id: string; user_answer: string; is_correct: boolean }>): Promise<QuizSession> {
    const res = await fetch(`${API_BASE}/quiz/session/${sessionId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    if (!res.ok) throw new Error('Failed to complete quiz');
    return res.json();
  },

  async getQuizResults(): Promise<QuizSession[]> {
    const res = await fetch(`${API_BASE}/quiz/results`);
    if (!res.ok) throw new Error('Failed to fetch quiz results');
    return res.json();
  },
};
