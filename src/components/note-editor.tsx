'use client';

import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, Loader2, NotebookPen } from 'lucide-react';
import type { Note } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface NoteEditorProps {
    note: Note | null;
    userId: string;
}

type SaveStatus = 'saved' | 'typing' | 'saving';

export function NoteEditor({ note, userId }: NoteEditorProps) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');

    const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

    const noteIdRef = useRef<string | null>(null);
    useEffect(() => {
        if (note) {
            setTitle(note.title);
            setContent(note.content);
            setSaveStatus('saved');
            noteIdRef.current = note.id;
        } else {
            setTitle('');
            setContent('');
        }
    }, [note]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
        setSaveStatus('typing');
        triggerDebouncedSave(e.target.value, content);
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        setSaveStatus('typing');
        triggerDebouncedSave(title, e.target.value);
    };

    const triggerDebouncedSave = (currentTitle: string, currentContent: string) => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = setTimeout(() => {
            handleSave(currentTitle, currentContent);
        }, 1500); // Auto-save after 1.5 seconds of inactivity
    };

    const handleSave = async (currentTitle: string, currentContent: string) => {
        const currentNoteId = noteIdRef.current;
        if (!currentNoteId || !firestore || !userId) return;

        setSaveStatus('saving');
        const noteRef = doc(firestore, `user_notes/${userId}/notes/${currentNoteId}`);

        try {
            await updateDoc(noteRef, {
                title: currentTitle,
                content: currentContent,
                updatedAt: serverTimestamp(),
            });
            setSaveStatus('saved');
        } catch (error) {
            console.error("Error saving note:", error);
            // This might fail if the doc was deleted while typing, which is fine.
            if ((error as any).code !== 'not-found') {
                toast({ title: "Error", description: "Could not save your changes.", variant: 'destructive' });
            }
            setSaveStatus('typing');
        }
    };

    if (!note) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-transparent text-slate-500 dark:text-white/40 p-8 text-center">
                <NotebookPen className="h-16 w-16 mb-4" strokeWidth={1} />
                <h2 className="text-xl font-semibold">Select a note</h2>
                <p>Choose a note from the sidebar to view or edit it, or create a new one.</p>
            </div>
        );
    }

    const renderSaveStatus = () => {
        switch (saveStatus) {
            case 'saving':
                return (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Saving...</span>
                    </>
                );
            case 'saved':
                return <span>Saved</span>;
            case 'typing':
            default:
                return null; // Show nothing while typing
        }
    };

    return (
        <div className="flex-1 flex flex-col p-4 md:p-6 bg-transparent">
            <div className="flex items-baseline justify-between mb-4">
                <Input
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="Untitled Note"
                    data-transparent
                    className="text-2xl font-bold !border-none shadow-none focus-visible:ring-0 p-0 h-auto !bg-transparent dark:text-white dark:placeholder:text-white/30"
                />
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-white/40">
                    {renderSaveStatus()}
                </div>
            </div>
            <Textarea
                value={content}
                onChange={handleContentChange}
                placeholder="Start writing your note here..."
                data-transparent
                className="flex-1 resize-none !border-none shadow-none focus-visible:ring-0 text-base leading-7 !bg-transparent dark:text-white/90 dark:placeholder:text-white/30 p-0"
            />
        </div>
    );
}
