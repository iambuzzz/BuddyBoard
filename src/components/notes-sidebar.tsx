'use client';

import { useState } from 'react';
import { doc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FilePlus, Loader2, Notebook } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Note } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface NotesSidebarProps {
    notes: Note[];
    selectedNoteId: string | null;
    onSelectNote: (note: Note) => void;
    isLoading: boolean;
    userId: string;
}

export function NotesSidebar({ notes, selectedNoteId, onSelectNote, isLoading, userId }: NotesSidebarProps) {
    const firestore = useFirestore();
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
            onSelectNote({ ...newNote, id: docRef.id, createdAt: Date.now(), updatedAt: Date.now() });
        } catch (error) {
            console.error("Error creating new note:", error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <aside className="w-80 border-r flex flex-col h-screen bg-white">
            <div className="p-4 border-b">
                <h2 className="text-xl font-bold flex items-center gap-2"><Notebook className="h-6 w-6"/> Notes</h2>
            </div>
            <div className="p-2">
                <Button onClick={handleNewNote} disabled={isCreating} className="w-full">
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePlus className="mr-2 h-4 w-4" />}
                    New Note
                </Button>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {isLoading ? (
                        [...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-md animate-pulse" />)
                    ) : (
                        notes.map(note => (
                            <button
                                key={note.id}
                                onClick={() => onSelectNote(note)}
                                className={cn(
                                    "w-full text-left p-3 rounded-md transition-colors",
                                    selectedNoteId === note.id ? 'bg-primary/10 text-primary-foreground' : 'hover:bg-slate-100'
                                )}
                            >
                                <h3 className={cn("font-semibold truncate", selectedNoteId === note.id ? "text-primary" : "text-slate-800")}>{note.title || 'Untitled Note'}</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    {formatDistanceToNow((note.updatedAt as any).toDate ? (note.updatedAt as any).toDate() : new Date(note.updatedAt), { addSuffix: true })}
                                </p>
                            </button>
                        ))
                    )}
                </div>
            </ScrollArea>
        </aside>
    );
}
