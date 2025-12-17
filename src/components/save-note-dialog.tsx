
'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SaveNoteDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialTitle: string;
  noteContent: string;
}

export function SaveNoteDialog({ isOpen, onOpenChange, initialTitle, noteContent }: SaveNoteDialogProps) {
  const [title, setTitle] = useState(initialTitle);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const subjectsCollectionRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'subjects');
  }, [user, firestore]);

  const { data: subjects, isLoading: areSubjectsLoading } = useCollection(subjectsCollectionRef);

  const handleSave = async () => {
    if (!user || !firestore) return;
    if (!selectedSubjectId && !newSubjectName) {
      toast({ variant: 'destructive', title: 'No Subject Selected', description: 'Please select or create a subject to save the note.' });
      return;
    }
    if (!title) {
        toast({ variant: 'destructive', title: 'Title is required', description: 'Please provide a title for your note.' });
        return;
    }

    setIsCreating(true);

    try {
      let subjectId = selectedSubjectId;

      // Create a new subject if specified
      if (newSubjectName) {
        if (!subjectsCollectionRef) throw new Error("Subjects collection not available.");
        const newSubjectDoc = await addDoc(subjectsCollectionRef, {
          name: newSubjectName,
          description: `Subject for notes generated on ${new Date().toLocaleDateString()}`,
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
          isImportant: false,
          noteCount: 0,
        });
        subjectId = newSubjectDoc.id;
      }
      
      const notesCollectionRef = collection(firestore, 'users', user.uid, 'subjects', subjectId, 'notes');
      
      // Convert markdown to simple HTML for storage
      const contentHtml = noteContent.split('\n').map(p => `<p>${p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/#(.*)/g, '<h2>$1</h2>')}</p>`).join('');

      const newNoteDoc = await addDoc(notesCollectionRef, {
        title,
        blocks: [{ id: `text-${Date.now()}`, type: 'text', content: contentHtml }],
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        isImportant: false,
      });

      toast({ title: 'Note Saved!', description: `"${title}" has been saved successfully.` });
      onOpenChange(false);
      router.push(`/dashboard/notes/${subjectId}/notes/${newNoteDoc.id}`);
    } catch (error) {
      console.error('Error saving note:', error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the note.' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="glass-pane">
        <DialogHeader>
          <DialogTitle className="font-headline">Save as New Note</DialogTitle>
          <DialogDescription>Save the generated content to your personal notes collection.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="note-title">Note Title</Label>
            <Input id="note-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter a title for your note" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject-select">Select a Subject</Label>
            <Select onValueChange={setSelectedSubjectId} value={selectedSubjectId}>
              <SelectTrigger id="subject-select" className="w-full">
                <SelectValue placeholder={areSubjectsLoading ? 'Loading subjects...' : 'Choose a subject...'} />
              </SelectTrigger>
              <SelectContent>
                {subjects?.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-subject">Create a New Subject</Label>
            <div className="flex gap-2">
              <Input
                id="new-subject"
                value={newSubjectName}
                onChange={(e) => {
                  setNewSubjectName(e.target.value);
                  if (e.target.value) setSelectedSubjectId('');
                }}
                placeholder="e.g., Physics 101"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" variant="glow" onClick={handleSave} disabled={isCreating}>
            {isCreating && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            Save Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

