
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotesSidebar } from '@/components/notes-sidebar';
import { NoteEditor } from '@/components/note-editor';
import type { Note } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function NotesPage() {
    const { user, profile, isLoading: isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [isLoadingNotes, setIsLoadingNotes] = useState(true);

    const cardTheme = profile?.cardTheme || 'periwinkle';

    useEffect(() => {
        if (!user || !firestore) {
            if (!isUserLoading) setIsLoadingNotes(false);
            return;
        };

        setIsLoadingNotes(true);
        const notesQuery = query(
            collection(firestore, `user_notes/${user.uid}/notes`),
            orderBy('updatedAt', 'desc')
        );

        const unsubscribe = onSnapshot(notesQuery, (snapshot) => {
            const fetchedNotes: Note[] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Note));
            setNotes(fetchedNotes);
            
            // If there's a selected note, find its updated version in the new list
            if (selectedNote) {
                const updatedSelectedNote = fetchedNotes.find(n => n.id === selectedNote.id);
                setSelectedNote(updatedSelectedNote || null);
            }
            
            setIsLoadingNotes(false);
        }, (error) => {
            console.error("Error fetching notes:", error);
            setIsLoadingNotes(false);
        });

        return () => unsubscribe();
    }, [user, firestore, isUserLoading, selectedNote]);

    if (isUserLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
        );
    }
    
    if (!user) {
         return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-4">
                <p className="text-slate-600 mb-4">Please log in to see your notes.</p>
                <Button onClick={() => router.push('/login')}>Login</Button>
            </div>
        );
    }

    return (
        <div className="h-screen w-full flex bg-white">
            <NotesSidebar
                notes={notes}
                selectedNoteId={selectedNote?.id || null}
                onSelectNote={setSelectedNote}
                isLoading={isLoadingNotes}
                userId={user.uid}
                theme={cardTheme}
            />
            <main className="flex-1 flex flex-col h-screen">
                <div className="flex-shrink-0 border-b p-2 flex items-center">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9 text-slate-600">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </div>
                <NoteEditor key={selectedNote?.id} note={selectedNote} userId={user.uid} />
            </main>
        </div>
    );
}
