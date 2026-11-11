import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { Note } from '../types';
import { Plus, Trash2, Edit2, Sparkles, Upload, FileText, Search } from 'lucide-react';

interface NotesViewProps {
  onGenerate: (note: Note) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({ onGenerate }) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', search],
    queryFn: () => api.getNotes(search),
  });

  const createMutation = useMutation({
    mutationFn: () => api.createNote(title, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setIsNewOpen(false);
      setTitle('');
      setContent('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => api.updateNote(isEditing!, title, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setIsEditing(null);
      setTitle('');
      setContent('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteNote(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    try {
      await api.uploadNoteFile(file);
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    } catch (err: any) {
      alert(err.message || 'File upload failed');
    } finally {
      setUploadLoading(false);
    }
  };

  const startEdit = (note: Note) => {
    setIsEditing(note.id);
    setTitle(note.title);
    setContent(note.content);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Source Notes</h2>
          <p className="text-sm text-gray-500">Add, import, or manage notes that AI flashcards will be grounded in.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer shadow-sm">
            <Upload className="w-4 h-4 text-gray-500" />
            <span>{uploadLoading ? 'Uploading...' : 'Import (.txt, .md, .pdf)'}</span>
            <input type="file" accept=".txt,.md,.pdf" className="hidden" onChange={handleFileUpload} disabled={uploadLoading} />
          </label>
          <button
            onClick={() => {
              setIsNewOpen(true);
              setIsEditing(null);
              setTitle('');
              setContent('');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Note
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search your notes by keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
      </div>

      {/* Note Edit / Create Modal/Card */}
      {(isNewOpen || isEditing) && (
        <div className="p-5 bg-white border border-indigo-200 rounded-xl shadow-md space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">
            {isEditing ? 'Edit Source Note' : 'Create New Source Note'}
          </h3>
          <input
            type="text"
            placeholder="Note Title (e.g. Chapter 1: Relational Architecture)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <textarea
            rows={6}
            placeholder="Paste your source text, definitions, or study notes here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs leading-relaxed"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setIsNewOpen(false);
                setIsEditing(null);
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={() => (isEditing ? updateMutation.mutate() : createMutation.mutate())}
              disabled={!content.trim()}
              className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 font-medium"
            >
              Save Note
            </button>
          </div>
        </div>
      )}

      {/* Note List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading notes...</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 p-8">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-medium text-gray-900">No notes found</h3>
          <p className="text-sm text-gray-500 mt-1">Get started by creating or importing your first study note.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.map((note) => (
            <div key={note.id} className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h4 className="font-semibold text-gray-900 text-base">{note.title}</h4>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(note.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-4 font-mono text-xs bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4 whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button
                  onClick={() => onGenerate(note)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Generate Cards
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(note)}
                    className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded"
                    title="Edit Note"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this source note and its dependent cards?')) {
                        deleteMutation.mutate(note.id);
                      }
                    }}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    title="Delete Note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
