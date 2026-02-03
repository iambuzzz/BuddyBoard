
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

export function NoteEditor({ note, userId }: NoteEditorProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanged, setHasChanged] = useState(false);

    const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (note) {
            setTitle(note.title);
            setContent(note.content);
            setHasChanged(false);
        } else {
            setTitle('');
            setContent('');
        }
    }, [note]);
    
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
        setHasChanged(true);
        triggerDebouncedSave(e.target.value, content);
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        setHasChanged(true);
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
        if (!note || !firestore || !userId) return;

        setIsSaving(true);
        const noteRef = doc(firestore, `user_notes/${userId}/notes/${note.id}`);
        
        try {
            await updateDoc(noteRef, {
                title: currentTitle,
                content: currentContent,
                updatedAt: serverTimestamp(),
            });
            setHasChanged(false);
            // toast({ title: "Note Saved", description: "Your changes have been saved." });
        } catch (error) {
            console.error("Error saving note:", error);
            toast({ title: "Error", description: "Could not save your changes.", variant: 'destructive'});
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!note) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-500 p-8 text-center">
                <NotebookPen className="h-16 w-16 mb-4" strokeWidth={1} />
                <h2 className="text-xl font-semibold">Select a note</h2>
                <p>Choose a note from the sidebar to view or edit it, or create a new one.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col p-4 md:p-6 bg-slate-50">
            <div className="flex items-center justify-between mb-4">
                <Input
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="Untitled Note"
                    className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 p-0 h-auto"
                />
                 <div className="flex items-center gap-2 text-sm text-slate-500">
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>{isSaving ? 'Saving...' : hasChanged ? 'Unsaved changes' : 'Saved'}</span>
                </div>
            </div>
            <Textarea
                value={content}
                onChange={handleContentChange}
                placeholder="Start writing your note here..."
                className="flex-1 resize-none border-none shadow-none focus-visible:ring-0 text-base leading-7 bg-transparent"
            />
        </div>
    );
}
