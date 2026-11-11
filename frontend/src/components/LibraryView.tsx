import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { CardType } from '../types';
import { Search, Eye, EyeOff, Trash2, BookOpen, Layers } from 'lucide-react';

interface LibraryViewProps {
  onStartQuiz: (cardIds?: string[]) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ onStartQuiz }) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<CardType | 'all'>('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['libraryCards', search, typeFilter, includeInactive],
    queryFn: () =>
      api.getLibraryCards(
        search || undefined,
        typeFilter === 'all' ? undefined : typeFilter,
        includeInactive
      ),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => api.toggleActive(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['libraryCards'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCard(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['libraryCards'] }),
  });

  const toggleFlip = (id: string) => {
    setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>Approved Library</span>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
              {cards.length} cards
            </span>
          </h2>
          <p className="text-sm text-gray-500">
            Your persistent, searchable knowledge base of approved study cards and questions.
          </p>
        </div>

        <button
          onClick={() => onStartQuiz()}
          disabled={cards.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow transition-colors disabled:opacity-50"
        >
          <Layers className="w-4 h-4" />
          Quiz From Library
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search approved cards by question, answer, or source citation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Card Types</option>
            <option value="flashcard">Flashcards</option>
            <option value="mcq">Multiple Choice</option>
            <option value="fill_blank">Fill in Blank</option>
          </select>

          <label className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="rounded text-indigo-600"
            />
            Show Inactive
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading library...</div>
      ) : cards.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 p-8">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-medium text-gray-900">Your library is empty</h3>
          <p className="text-sm text-gray-500 mt-1">Approve cards from the Pending Review queue to build your study collection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => {
            const isFlipped = !!flippedCards[card.id];
            const isInactive = card.is_active === 0;

            return (
              <div
                key={card.id}
                className={`bg-white rounded-xl border ${
                  isInactive ? 'border-gray-200 opacity-60 bg-gray-50' : 'border-gray-200 shadow-sm hover:shadow'
                } p-5 flex flex-col justify-between transition-all`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ {card.type}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(card.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Card Content Area with Interactive Flip */}
                  <div
                    onClick={() => toggleFlip(card.id)}
                    className="min-h-[140px] p-4 bg-gray-50/70 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-100/70 transition-colors flex flex-col justify-center items-center text-center select-none"
                    title="Click to flip card"
                  >
                    {!isFlipped ? (
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                          FRONT / PROMPT
                        </span>
                        <p className="text-sm font-semibold text-gray-900 leading-snug">{card.prompt}</p>
                        <span className="text-[11px] text-indigo-500 font-medium block mt-3">
                          (Click to reveal answer)
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">
                          BACK / ANSWER
                        </span>
                        <p className="text-sm font-medium text-emerald-950 leading-snug">{card.answer}</p>
                        <span className="text-[11px] text-gray-400 font-medium block mt-3">
                          (Click to flip back)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Grounded Citation Accordion */}
                  <div className="mt-3 pt-2 text-xs text-gray-500 border-t border-gray-100">
                    <span className="font-semibold text-gray-700 block mb-0.5">Source:</span>
                    <p className="italic text-[11px] text-gray-600 line-clamp-2">"{card.source_reference}"</p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
                  <button
                    onClick={() => toggleActiveMutation.mutate(card.id)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
                    title={isInactive ? 'Re-activate card' : 'Deactivate (soft-delete)'}
                  >
                    {isInactive ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Activate</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Deactivate</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('Permanently delete this card from the library?')) {
                        deleteMutation.mutate(card.id);
                      }
                    }}
                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
