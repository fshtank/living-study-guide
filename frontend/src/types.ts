export interface Note {
  id: string;
  owner_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export type CardStatus = 'pending' | 'approved' | 'rejected';
export type CardType = 'flashcard' | 'mcq' | 'fill_blank';

export interface Flashcard {
  id: string;
  owner_id: string;
  note_id: string;
  prompt: string;
  answer: string;
  source_reference: string;
  status: CardStatus;
  type: CardType;
  is_active: number;
  created_at: string;
  updated_at: string;
  card_metadata: {
    options?: string[];
    explanation?: string;
    difficulty?: string;
    style?: string;
    [key: string]: any;
  };
}

export interface QuizSession {
  id: string;
  owner_id: string;
  card_ids: string[];
  score: number;
  total_questions: number;
  created_at: string;
  completed_at?: string;
  session_metadata: {
    answers?: Array<{
      card_id: string;
      user_answer: string;
      is_correct: boolean;
    }>;
  };
}
