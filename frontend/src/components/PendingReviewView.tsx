import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { Flashcard } from '../types';
import { Check, X, Edit3, RotateCw, BookOpen } from 'lucide-react';

export const PendingReviewView: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editSource, setEditSource] = useState('');
  const [regenStyle] = useState('application-level');

  const { data: pendingCards = [], isLoading } = useQuery({
    queryKey: ['pendingCards'],
    queryFn: () => api.getPendingCards(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.approveCard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingCards'] });
      queryClient.invalidateQueries({ queryKey: ['libraryCards'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.rejectCard(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pendingCards'] }),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, prompt, answer, source }: { id: string; prompt: string; answer: string; source: string }) =>
      api.editCard(id, prompt, answer, source),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingCards'] });
      setEditingCardId(null);
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: ({ id, style }: { id: string; style: string }) => api.regenerateCard(id, style),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pendingCards'] }),
  });

  const startEdit = (card: Flashcard) => {
    setEditingCardId(card.id);
    setEditPrompt(card.prompt);
    setEditAnswer(card.answer);
    setEditSource(card.source_reference);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>Pending Review</span>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
              {pendingCards.length}
            </span>
          </h2>
          <p className="text-sm text-gray-500">
            Review AI-generated cards side-by-side with source text before adding them to your library.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading pending cards...</div>
      ) : pendingCards.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 p-8">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-medium text-gray-900">All caught up!</h3>
          <p className="text-sm text-gray-500 mt-1">No cards waiting for approval. Go to Source Notes to generate more.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingCards.map((card, idx) => (
            <div
              key={card.id}
              className="bg-white border-2 border-amber-200/80 rounded-xl shadow-sm p-6 transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    ⏳ Pending Review #{idx + 1}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    {card.type}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(card)}
                    className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-indigo-600 px-2 py-1 rounded hover:bg-gray-100"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => regenerateMutation.mutate({ id: card.id, style: regenStyle })}
                    className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-amber-600 px-2 py-1 rounded hover:bg-gray-100"
                    title="Regenerate from source"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Regenerate
                  </button>
                </div>
              </div>

              {editingCardId === card.id ? (
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Prompt / Question</label>
                    <textarea
                      rows={2}
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Answer / Definition</label>
                    <textarea
                      rows={2}
                      value={editAnswer}
                      onChange={(e) => setEditAnswer(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Source Reference</label>
                    <input
                      type="text"
                      value={editSource}
                      onChange={(e) => setEditSource(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setEditingCardId(null)}
                      className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() =>
                        editMutation.mutate({
                          id: card.id,
                          prompt: editPrompt,
                          answer: editAnswer,
                          source: editSource,
                        })
                      }
                      className="px-3 py-1 text-xs bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Left Column: Grounded Source Citation */}
                  <div className="bg-amber-50/60 p-4 rounded-lg border border-amber-100 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold tracking-wide uppercase text-amber-900 block mb-1.5 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        Grounded Source Material:
                      </span>
                      <blockquote className="text-sm text-gray-800 italic font-serif leading-relaxed border-l-2 border-amber-400 pl-3">
                        "{card.source_reference}"
                      </blockquote>
                    </div>
                    <div className="mt-3 text-[11px] text-amber-700 font-medium">
                      ✓ Exact verified citation from user note
                    </div>
                  </div>

                  {/* Right Column: AI Generated Card Question & Answer */}
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-bold tracking-wide uppercase text-gray-500 block mb-1">
                        PROMPT:
                      </span>
                      <p className="text-base font-semibold text-gray-900">{card.prompt}</p>
                    </div>

                    <div>
                      <span className="text-xs font-bold tracking-wide uppercase text-gray-500 block mb-1">
                        ANSWER:
                      </span>
                      <p className="text-sm text-gray-800 bg-gray-50 p-2.5 rounded border border-gray-100">
                        {card.answer}
                      </p>
                    </div>

                    {card.type === 'mcq' && card.card_metadata?.options && (
                      <div className="pt-2">
                        <span className="text-xs font-bold tracking-wide uppercase text-gray-500 block mb-1">
                          Options:
                        </span>
                        <div className="grid grid-cols-1 gap-1.5">
                          {card.card_metadata.options.map((opt, i) => (
                            <div key={i} className="text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded text-gray-700">
                              {opt}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => rejectMutation.mutate(card.id)}
                  disabled={rejectMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-semibold transition-colors"
                >
                  <X className="w-4 h-4 text-red-600" />
                  Reject
                </button>
                <button
                  onClick={() => approveMutation.mutate(card.id)}
                  disabled={approveMutation.isPending}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-semibold shadow-sm transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Approve to Library
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
