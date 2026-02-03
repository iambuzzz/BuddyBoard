'use client';

import { useState } from 'react';
import { doc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FilePlus, Loader2, Notebook, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Note, CardTheme } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

interface NotesSidebarProps {
    notes: Note[];
    selectedNoteId: string | null;
    onSelectNote: (note: Note) => void;
    isLoading: boolean;
    userId: string;
    theme: CardTheme;
}

export function NotesSidebar({ notes, selectedNoteId, onSelectNote, isLoading, userId, theme }: NotesSidebarProps) {
    const firestore = useFirestore();
    const router = useRouter();
    const [isCreating, setIsCreating] = useState(false);

    const handleNewNote = async () => {
        if (!firestore || !userId) return;
        setIsCreating(true);
        try {
            const newNote = {
                title: 'Untitled Note',
                content: '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            const docRef = await addDoc(collection(firestore, `user_notes/${userId}/notes`), newNote);
            // After creating, we pass a client-side representation to the onSelectNote handler.
            // The serverTimestamp will be resolved by Firestore, but for immediate UI feedback,
            // we use Date.now(). The onSnapshot listener will soon pick up the actual server time.
            onSelectNote({ ...newNote, id: docRef.id, createdAt: Date.now(), updatedAt: Date.now() });
        } catch (error) {
            console.error("Error creating new note:", error);
        } finally {
            setIsCreating(false);
        }
    };

    const themeStyles = {
        periwinkle: {
            newButton: 'bg-[--theme-periwinkle-primary] hover:bg-violet-500 text-white',
            selectedBg: 'bg-violet-100/80',
            selectedText: 'text-violet-700',
        },
        cyan: {
            newButton: 'bg-[--theme-cyan-primary] hover:bg-cyan-500 text-white',
            selectedBg: 'bg-cyan-100/80',
            selectedText: 'text-cyan-700',
        },
        emerald: {
            newButton: 'bg-[--theme-emerald-primary] hover:bg-emerald-500 text-white',
            selectedBg: 'bg-emerald-100/80',
            selectedText: 'text-emerald-700',
        }
    };
    const currentTheme = themeStyles[theme] || themeStyles.periwinkle;
    
    const formatTimestamp = (timestamp: any) => {
        if (!timestamp) return null;
        // Check if it's a Firestore Timestamp and convert, otherwise create a new Date
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        // Check if the date is valid before formatting
        if (isNaN(date.getTime())) {
            return null; // or '...' or some placeholder
        }
        return formatDistanceToNow(date, { addSuffix: true });
    }

    return (
        <aside className="w-full md:w-80 md:border-r border-slate-300/70 flex flex-col h-screen bg-transparent">
            <div className="p-4 border-b border-slate-300/70 flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2"><Notebook className="h-6 w-6"/> Notes</h2>
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9 text-slate-600">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            </div>
            <div className="p-2">
                <Button onClick={handleNewNote} disabled={isCreating} className={`w-full ${currentTheme.newButton}`}>
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePlus className="mr-2 h-4 w-4" />}
                    New Note
                </Button>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {isLoading ? (
                        [...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-100/50 rounded-md animate-pulse" />)
                    ) : (
                        notes.map(note => (
                            <button
                                key={note.id}
                                onClick={() => onSelectNote(note)}
                                className={cn(
                                    "w-full text-left p-3 rounded-md transition-colors",
                                    selectedNoteId === note.id ? currentTheme.selectedBg : 'hover:bg-slate-100/50'
                                )}
                            >
                                <h3 className={cn("font-semibold truncate", selectedNoteId === note.id ? currentTheme.selectedText : "text-slate-800")}>{note.title || 'Untitled Note'}</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    {formatTimestamp(note.updatedAt)}
                                </p>
                            </button>
                        ))
                    )}
                </div>
            </ScrollArea>
        </aside>
    );
}
