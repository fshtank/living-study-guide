import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Note } from './types';
import { NotesView } from './components/NotesView';
import { PendingReviewView } from './components/PendingReviewView';
import { LibraryView } from './components/LibraryView';
import { QuizView } from './components/QuizView';
import { GenerationModal } from './components/GenerationModal';
import { FileText, Clock, Library, Trophy, Sparkles } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'notes' | 'pending' | 'library' | 'quiz'>('notes');
  const [generatingNote, setGeneratingNote] = useState<Note | null>(null);

  const { data: pendingCards = [] } = useQuery({
    queryKey: ['pendingCards'],
    queryFn: () => api.getPendingCards(),
  });

  const { data: libraryCards = [] } = useQuery({
    queryKey: ['libraryCards'],
    queryFn: () => api.getLibraryCards(),
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">Living Study Guide</h1>
                <p className="text-[11px] text-gray-500 font-medium">Grounded AI Flashcards & Human-in-the-Loop Review</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex space-x-1 sm:space-x-2">
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'notes'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Source Notes</span>
              </button>

              <button
                onClick={() => setActiveTab('pending')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors relative ${
                  activeTab === 'pending'
                    ? 'bg-amber-50 text-amber-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Pending Review</span>
                {pendingCards.length > 0 && (
                  <span className="px-1.5 py-0.2 text-[11px] font-bold rounded-full bg-amber-500 text-white">
                    {pendingCards.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('library')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'library'
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Library className="w-4 h-4" />
                <span>Study Library</span>
                <span className="text-xs text-gray-400 font-normal">({libraryCards.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('quiz')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'quiz'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>Quiz Mode</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'notes' && (
          <NotesView onGenerate={(note) => setGeneratingNote(note)} />
        )}
        {activeTab === 'pending' && <PendingReviewView />}
        {activeTab === 'library' && (
          <LibraryView onStartQuiz={() => setActiveTab('quiz')} />
        )}
        {activeTab === 'quiz' && <QuizView />}
      </main>

      {/* AI Card Generation Modal */}
      {generatingNote && (
        <GenerationModal
          note={generatingNote}
          onClose={() => setGeneratingNote(null)}
          onSuccess={() => {
            setGeneratingNote(null);
            setActiveTab('pending');
          }}
        />
      )}
    </div>
  );
}
export default App;
