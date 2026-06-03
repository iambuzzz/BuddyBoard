'use client';

import { useState } from 'react';
import { doc, addDoc, collection, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FilePlus, Loader2, Notebook, ArrowLeft, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Note, CardTheme } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';


interface NotesSidebarProps {
    notes: Note[];
    selectedNoteId: string | null;
    onSelectNote: (note: Note | null) => void;
    isLoading: boolean;
    userId: string;
    theme: CardTheme;
}

export function NotesSidebar({ notes, selectedNoteId, onSelectNote, isLoading, userId, theme }: NotesSidebarProps) {
    const firestore = useFirestore();
    const router = useRouter();
    const [isCreating, setIsCreating] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

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

    const handleDeleteConfirm = (note: Note) => {
        setNoteToDelete(note);
    };

    const handleDeleteNote = async () => {
        if (!firestore || !userId || !noteToDelete) return;

        const noteIdToDelete = noteToDelete.id;
        if (selectedNoteId === noteIdToDelete) {
            onSelectNote(null);
        }

        const noteRef = doc(firestore, `user_notes/${userId}/notes`, noteIdToDelete);

        try {
            await deleteDoc(noteRef);
        } catch (error) {
            console.error("Error deleting note:", error);
        } finally {
            setNoteToDelete(null);
        }
    };

    const themeStyles = {
        periwinkle: {
            newButton: 'bg-[--theme-periwinkle-primary] hover:bg-violet-500 text-white',
            selectedBg: 'bg-violet-100/80 dark:bg-violet-500/15',
            selectedText: 'text-violet-700 dark:text-violet-300',
        },
        cyan: {
            newButton: 'bg-[--theme-cyan-primary] hover:bg-cyan-500 text-white',
            selectedBg: 'bg-cyan-100/80 dark:bg-cyan-500/15',
            selectedText: 'text-cyan-700 dark:text-cyan-300',
        },
        emerald: {
            newButton: 'bg-[--theme-emerald-primary] hover:bg-emerald-500 text-white',
            selectedBg: 'bg-emerald-100/80 dark:bg-emerald-500/15',
            selectedText: 'text-emerald-700 dark:text-emerald-300',
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
        <>
            <AlertDialog open={!!noteToDelete} onOpenChange={() => setNoteToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the note "{noteToDelete?.title}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteNote} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <aside className="w-full md:w-80 md:border-r border-slate-300/70 dark:border-white/[0.06] flex flex-col h-screen bg-transparent">
                <div className="p-4 border-b border-slate-300/70 dark:border-white/[0.06] flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white"><Notebook className="h-6 w-6" /> Notes</h2>
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9 text-slate-600 dark:text-slate-400">
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
                            [...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-100/50 dark:bg-white/[0.04] rounded-md animate-pulse" />)
                        ) : (
                            notes.map(note => (
                                <div key={note.id} className="group relative rounded-md">
                                    <button
                                        onClick={() => onSelectNote(note)}
                                        className={cn(
                                            "w-full text-left p-3 pr-10 border-b border-slate-200/80 dark:border-white/[0.04] transition-colors rounded-md",
                                            selectedNoteId === note.id ? currentTheme.selectedBg : 'hover:bg-slate-100/50 dark:hover:bg-white/[0.04]'
                                        )}
                                    >
                                        <h3 className={cn("font-semibold truncate", selectedNoteId === note.id ? currentTheme.selectedText : "text-slate-800 dark:text-white/90")}>{note.title || 'Untitled Note'}</h3>
                                        <p className="text-xs text-slate-500 dark:text-white/40 mt-1">
                                            {formatTimestamp(note.updatedAt)}
                                        </p>
                                    </button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteConfirm(note);
                                        }}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        aria-label="Delete note"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </aside>
        </>
    );
}
