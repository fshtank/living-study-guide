import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { Note, CardType } from '../types';
import { Sparkles, X, CheckSquare, Square } from 'lucide-react';

interface GenerationModalProps {
  note: Note;
  onClose: () => void;
  onSuccess: () => void;
}

export const GenerationModal: React.FC<GenerationModalProps> = ({ note, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [style, setStyle] = useState('basic recall');
  const [count, setCount] = useState(5);
  const [selectedTypes, setSelectedTypes] = useState<CardType[]>([
    'flashcard',
    'mcq',
    'fill_blank',
  ]);

  const toggleType = (t: CardType) => {
    if (selectedTypes.includes(t)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter((x) => x !== t));
      }
    } else {
      setSelectedTypes([...selectedTypes, t]);
    }
  };

  const generateMutation = useMutation({
    mutationFn: () =>
      api.generateCards([note.id], undefined, style, selectedTypes, count),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingCards'] });
      onSuccess();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
        <div className="flex justify-between items-start border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Generate Study Cards
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Source Note: <span className="font-semibold text-gray-700">{note.title}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
              Cognitive Depth & Style:
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="basic recall">Basic Recall (Definitions, Facts, Core Terms)</option>
              <option value="application-level">Application-Level (Scenario based, Problem Solving)</option>
              <option value="conceptual synthesis">Conceptual Synthesis (Relationships & Comparisons)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
              Card Types to Generate:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'flashcard', label: 'Flashcard' },
                { id: 'mcq', label: 'Multiple Choice' },
                { id: 'fill_blank', label: 'Fill in Blank' },
              ].map((item) => {
                const isChecked = selectedTypes.includes(item.id as CardType);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => toggleType(item.id as CardType)}
                    className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs font-semibold transition-all ${
                      isChecked
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
              Number of Cards ({count}):
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{generateMutation.isPending ? 'Generating Cards...' : 'Generate with AI'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
