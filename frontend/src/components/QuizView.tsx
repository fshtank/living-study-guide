import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { Flashcard, QuizSession } from '../types';
import { Trophy, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export const QuizView: React.FC = () => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Array<{ card_id: string; user_answer: string; is_correct: boolean }>>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedMcq, setSelectedMcq] = useState<string | null>(null);
  const [fillInput, setFillInput] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [completedSession, setCompletedSession] = useState<QuizSession | null>(null);

  const { data: history = [] } = useQuery({
    queryKey: ['quizHistory'],
    queryFn: () => api.getQuizResults(),
  });

  const startQuizMutation = useMutation({
    mutationFn: () => api.startQuiz(undefined, 10),
    onSuccess: async (sess) => {
      // Fetch library cards matching session card_ids
      const allLib = await api.getLibraryCards();
      const quizCards = allLib.filter((c) => sess.card_ids.includes(c.id));
      setCards(quizCards);
      setSession(sess);
      setCurrentIndex(0);
      setUserAnswers([]);
      setIsFlipped(false);
      setSelectedMcq(null);
      setFillInput('');
      setIsSubmitted(false);
      setIsFinished(false);
      setCompletedSession(null);
    },
  });

  const completeQuizMutation = useMutation({
    mutationFn: ({ sessId, answers }: { sessId: string; answers: any[] }) =>
      api.completeQuiz(sessId, answers),
    onSuccess: (completed) => {
      setCompletedSession(completed);
      setIsFinished(true);
      queryClient.invalidateQueries({ queryKey: ['quizHistory'] });
    },
  });

  const handleAnswerSubmit = (isCorrect: boolean, chosenText: string) => {
    const currentCard = cards[currentIndex];
    const newAnswers = [
      ...userAnswers,
      { card_id: currentCard.id, user_answer: chosenText, is_correct: isCorrect },
    ];
    setUserAnswers(newAnswers);
    setIsSubmitted(true);
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < cards.length) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setSelectedMcq(null);
      setFillInput('');
      setIsSubmitted(false);
    } else {
      // Complete quiz
      completeQuizMutation.mutate({
        sessId: session!.id,
        answers: userAnswers,
      });
    }
  };

  const currentCard = cards[currentIndex];

  if (!session || (!currentCard && !isFinished)) {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-8 text-white text-center shadow-lg">
          <Trophy className="w-14 h-14 mx-auto mb-3 text-amber-300" />
          <h2 className="text-3xl font-extrabold mb-2">Self-Quizzing Studio</h2>
          <p className="text-indigo-100 max-w-xl mx-auto text-sm mb-6">
            Test your knowledge against flashcards and quiz questions derived directly from your personal notes.
          </p>
          <button
            onClick={() => startQuizMutation.mutate()}
            disabled={startQuizMutation.isPending}
            className="px-6 py-3 bg-white text-indigo-700 hover:bg-indigo-50 font-bold rounded-xl shadow-md transition-all text-base"
          >
            {startQuizMutation.isPending ? 'Starting Quiz...' : 'Start New Quiz Session'}
          </button>
        </div>

        {/* History Section */}
        {history.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Past Quiz Performance
            </h3>
            <div className="divide-y divide-gray-100">
              {history.map((h) => {
                const pct = Math.round((h.score / (h.total_questions || 1)) * 100);
                return (
                  <div key={h.id} className="py-3 flex justify-between items-center text-sm">
                    <div>
                      <span className="font-semibold text-gray-800">
                        Score: {h.score} / {h.total_questions} ({pct}%)
                      </span>
                      <p className="text-xs text-gray-400">
                        {new Date(h.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        pct >= 80 ? 'bg-emerald-100 text-emerald-800' : pct >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {pct >= 80 ? 'Mastered' : pct >= 50 ? 'Reviewing' : 'Needs Work'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isFinished && completedSession) {
    const pct = Math.round((completedSession.score / (completedSession.total_questions || 1)) * 100);
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-lg space-y-6">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
          <Trophy className="w-8 h-8 text-amber-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quiz Completed!</h2>
          <p className="text-sm text-gray-500 mt-1">Here is how you performed on this study set:</p>
        </div>

        <div className="p-6 bg-gray-50 rounded-xl border border-gray-100">
          <div className="text-4xl font-extrabold text-indigo-600 mb-1">{pct}%</div>
          <div className="text-sm font-medium text-gray-700">
            {completedSession.score} of {completedSession.total_questions} questions correct
          </div>
        </div>

        <button
          onClick={() => {
            setSession(null);
            setIsFinished(false);
          }}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow"
        >
          Return to Quiz Menu
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="flex justify-between items-center text-sm font-semibold text-gray-500">
        <span>Question {currentIndex + 1} of {cards.length}</span>
        <span className="capitalize px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs">
          {currentCard.type}
        </span>
      </div>

      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
        <div
          className="bg-indigo-600 h-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
        />
      </div>

      {/* Main Question Card */}
      <div className="bg-white border-2 border-indigo-100 rounded-2xl shadow-md p-6 space-y-6">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
            Prompt / Question:
          </span>
          <h3 className="text-xl font-bold text-gray-900 leading-snug">{currentCard.prompt}</h3>
        </div>

        {/* Card Type Specific Interactions */}
        {currentCard.type === 'flashcard' && (
          <div className="space-y-4">
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-xl cursor-pointer text-center hover:bg-indigo-50 transition-colors"
            >
              {!isFlipped ? (
                <div className="text-indigo-600 font-semibold text-sm">
                  Click here to reveal the answer
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Answer:
                  </span>
                  <p className="text-base font-bold text-gray-900">{currentCard.answer}</p>
                </div>
              )}
            </div>

            {isFlipped && !isSubmitted && (
              <div className="flex justify-center gap-4 pt-2">
                <button
                  onClick={() => handleAnswerSubmit(false, 'Incorrect/Forgot')}
                  className="flex items-center gap-2 px-5 py-2.5 border border-red-200 bg-red-50 text-red-700 font-bold rounded-lg text-sm hover:bg-red-100"
                >
                  <XCircle className="w-4 h-4 text-red-600" />
                  Didn't Know
                </button>
                <button
                  onClick={() => handleAnswerSubmit(true, 'Correct/Knew')}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-lg text-sm hover:bg-emerald-700 shadow"
                >
                  <CheckCircle className="w-4 h-4" />
                  Knew It!
                </button>
              </div>
            )}
          </div>
        )}

        {currentCard.type === 'mcq' && (
          <div className="space-y-3">
            {currentCard.card_metadata?.options?.map((opt, i) => {
              const isSelected = selectedMcq === opt;
              const isCorrectOpt = opt.toLowerCase().trim() === currentCard.answer.toLowerCase().trim();

              let btnStyle = 'bg-white border-gray-200 text-gray-800 hover:border-indigo-300';
              if (isSubmitted) {
                if (isCorrectOpt) {
                  btnStyle = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold';
                } else if (isSelected) {
                  btnStyle = 'bg-red-50 border-red-400 text-red-900 line-through';
                }
              } else if (isSelected) {
                btnStyle = 'bg-indigo-50 border-indigo-600 text-indigo-900 font-semibold';
              }

              return (
                <button
                  key={i}
                  disabled={isSubmitted}
                  onClick={() => setSelectedMcq(opt)}
                  className={`w-full p-4 text-left text-sm rounded-xl border-2 transition-all flex items-center justify-between ${btnStyle}`}
                >
                  <span>{opt}</span>
                  {isSubmitted && isCorrectOpt && <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                  {isSubmitted && isSelected && !isCorrectOpt && <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                </button>
              );
            })}

            {!isSubmitted && (
              <button
                disabled={!selectedMcq}
                onClick={() => {
                  const isCorrect = selectedMcq?.toLowerCase().trim() === currentCard.answer.toLowerCase().trim();
                  handleAnswerSubmit(isCorrect, selectedMcq || '');
                }}
                className="w-full mt-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 text-sm shadow"
              >
                Submit Choice
              </button>
            )}
          </div>
        )}

        {currentCard.type === 'fill_blank' && (
          <div className="space-y-4">
            <input
              type="text"
              disabled={isSubmitted}
              placeholder="Type the missing word or phrase..."
              value={fillInput}
              onChange={(e) => setFillInput(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />

            {!isSubmitted ? (
              <button
                disabled={!fillInput.trim()}
                onClick={() => {
                  const isCorrect = fillInput.toLowerCase().trim() === currentCard.answer.toLowerCase().trim();
                  handleAnswerSubmit(isCorrect, fillInput);
                }}
                className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 text-sm shadow"
              >
                Check Answer
              </button>
            ) : (
              <div
                className={`p-4 rounded-xl border ${
                  fillInput.toLowerCase().trim() === currentCard.answer.toLowerCase().trim()
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <div className="font-bold text-sm mb-1">
                  Correct Answer: <span className="underline">{currentCard.answer}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Source Citation for ground truth */}
        {isSubmitted && (
          <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50/80 p-3 rounded-lg text-xs text-gray-600">
            <span className="font-bold text-gray-700 block mb-1">Source Grounding:</span>
            <p className="italic">"{currentCard.source_reference}"</p>
          </div>
        )}

        {isSubmitted && (
          <button
            onClick={handleNextQuestion}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow text-sm"
          >
            <span>{currentIndex + 1 < cards.length ? 'Next Question' : 'View Results'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
