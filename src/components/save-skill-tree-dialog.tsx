'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader, Plus, Save } from 'lucide-react';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, addDoc, updateDoc, serverTimestamp, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { generateSkillTreeImageAction, explainTopicAction } from '@/actions/generation';
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';

interface SaveSkillTreeDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  topic: string;
  nodes: any[];
  edges: any[];
  explanations: Record<string, string>;
}

export function SaveSkillTreeDialog({ isOpen, onOpenChange, topic, nodes, edges, explanations }: SaveSkillTreeDialogProps) {
  const [targetType, setTargetType] = useState<'new' | 'existing'>('new');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { user, firestore, storage } = useFirebase();
  const { toast } = useToast();

  const subjectsCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'subjects');
  }, [user, firestore]);
  const { data: subjects, isLoading: isLoadingSubjects } = useCollection(subjectsCollectionRef);

  const notesCollectionRef = useMemoFirebase(() => {
    if (!user || !selectedSubject) return null;
    return collection(firestore, 'users', user.uid, 'subjects', selectedSubject, 'notes');
  }, [user, selectedSubject, firestore]);
  const { data: notes, isLoading: isLoadingNotes } = useCollection(notesCollectionRef);
  
  useEffect(() => {
      setSelectedNote(null);
  }, [selectedSubject]);
  
  useEffect(() => {
    if (topic && targetType === 'new') {
      setNewNoteTitle(`${topic} - Skill Tree`);
    }
  }, [topic, targetType, isOpen]);

  const handleSave = async () => {
    if (!user || !firestore || !storage) return;

    setIsSaving(true);
    try {
        // 1. Generate image from skill tree
        toast({ title: 'Step 1/3: Generating Image...' });
        const cleanNodes = nodes.map(n => {
            const { parent, children, x, y, width, ...rest } = n;
            return rest;
        });

        const imageResult = await generateSkillTreeImageAction({ topic, nodes: cleanNodes, edges });
        if (!imageResult || !imageResult.imageDataUri) {
            throw new Error('Failed to generate skill tree image.');
        }

        // 2. Upload image to Firebase Storage
        toast({ title: 'Step 2/3: Uploading Image...' });
        const filePath = `users/${user.uid}/skill-trees/${uuidv4()}.png`;
        const storageRef = ref(storage, filePath);
        const uploadResult = await uploadString(storageRef, imageResult.imageDataUri, 'data_url');
        const downloadUrl = await getDownloadURL(uploadResult.ref);
        const imageBlock = {
            id: `skill-tree-img-${Date.now()}`,
            type: 'image',
            downloadUrl,
            fileName: `${topic}-skill-tree.png`,
        };
        
        // 3. Gather all explanations
        toast({ title: 'Step 3/3: Compiling Explanations...'});
        const allExplanations: Record<string, string> = { ...explanations };
        const explanationPromises = nodes
            .filter(node => !allExplanations[node.id])
            .map(async (node) => {
                const result = await explainTopicAction({ topic: node.label });
                allExplanations[node.id] = result.explanation;
            });
        await Promise.all(explanationPromises);
        
        // 4. Create text content block
        let textContent = '';
        const keyConcept = nodes.find(n => n.type === 'key-concept');

        if (keyConcept) {
            textContent += `<h2>${keyConcept.label}</h2><p>${allExplanations[keyConcept.id] || '...'}</p>`;
            const mainIdeas = nodes.filter(n => n.parent?.id === keyConcept.id);
            mainIdeas.forEach(idea => {
                textContent += `<h3>${idea.label}</h3><p>${allExplanations[idea.id] || '...'}</p>`;
                const details = nodes.filter(n => n.parent?.id === idea.id);
                if (details.length > 0) {
                    textContent += `<ul>`;
                    details.forEach(detail => {
                        textContent += `<li><strong>${detail.label}:</strong> ${allExplanations[detail.id] || '...'}</li>`;
                    });
                    textContent += `</ul>`;
                }
            });
        }
        
        const textBlock = {
            id: `skill-tree-text-${Date.now()}`,
            type: 'text',
            content: textContent,
        };

        const finalBlocks = [imageBlock, textBlock];

        // 5. Add to new or existing note
        if (targetType === 'new') {
            if (!selectedSubject || !newNoteTitle) {
                throw new Error('Please select a subject and provide a title for the new note.');
            }
            toast({ title: 'Creating New Note...', description: `Adding "${newNoteTitle}".`});
            const newNote = {
                title: newNoteTitle,
                blocks: finalBlocks,
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
                isImportant: false,
            };
            await addDoc(collection(firestore, 'users', user.uid, 'subjects', selectedSubject, 'notes'), newNote);
        } else {
            if (!selectedSubject || !selectedNote) {
                throw new Error('Please select a subject and a note to append to.');
            }
            toast({ title: 'Updating Note...', description: 'Adding skill tree to existing note.'});
            const noteRef = doc(firestore, 'users', user.uid, 'subjects', selectedSubject, 'notes', selectedNote);
            const existingNote = notes?.find(n => n.id === selectedNote);
            if (!existingNote) throw new Error('Selected note not found.');

            const updatedBlocks = [...(existingNote.blocks || []), ...finalBlocks];
            await updateDoc(noteRef, {
                blocks: updatedBlocks,
                lastUpdated: serverTimestamp(),
            });
        }
        
        toast({ title: 'Success!', description: 'Skill tree has been saved to your notes.' });
        onOpenChange(false);

    } catch (error: any) {
        console.error("Failed to save skill tree:", error);
        toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: error.message || 'An unknown error occurred.',
        });
    } finally {
        setIsSaving(false);
    }
  };
  
  const isSaveDisabled = isSaving || (targetType === 'new' && (!selectedSubject || !newNoteTitle)) || (targetType === 'existing' && (!selectedSubject || !selectedNote));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="glass-pane">
        <DialogHeader>
          <DialogTitle className="font-headline">Save Skill Tree to Notes</DialogTitle>
          <DialogDescription>Save the generated skill tree for "{topic}" as an image in a new or existing note.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Button variant={targetType === 'new' ? 'secondary' : 'ghost'} onClick={() => setTargetType('new')} className="w-full">
                <Plus className="mr-2 h-4 w-4"/> New Note
            </Button>
            <Button variant={targetType === 'existing' ? 'secondary' : 'ghost'} onClick={() => setTargetType('existing')} className="w-full">
                <Save className="mr-2 h-4 w-4"/> Existing Note
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject-select">Subject</Label>
            <Select onValueChange={setSelectedSubject} value={selectedSubject || ''} disabled={isLoadingSubjects}>
              <SelectTrigger id="subject-select">
                <SelectValue placeholder={isLoadingSubjects ? 'Loading subjects...' : 'Select a subject'} />
              </SelectTrigger>
              <SelectContent>
                {subjects?.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {targetType === 'new' ? (
            <div className="space-y-2">
              <Label htmlFor="new-note-title">New Note Title</Label>
              <Input id="new-note-title" value={newNoteTitle} onChange={(e) => setNewNoteTitle(e.target.value)} placeholder={`e.g., ${topic} Overview`} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="note-select">Note</Label>
              <Select onValueChange={setSelectedNote} value={selectedNote || ''} disabled={!selectedSubject || isLoadingNotes}>
                <SelectTrigger id="note-select">
                  <SelectValue placeholder={!selectedSubject ? 'First, select a subject' : (isLoadingNotes ? 'Loading notes...' : 'Select a note to append to')} />
                </SelectTrigger>
                <SelectContent>
                  {notes?.map((note) => (
                    <SelectItem key={note.id} value={note.id}>{note.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">Cancel</Button>
          </DialogClose>
          <Button type="button" variant="glow" onClick={handleSave} disabled={isSaveDisabled}>
            {isSaving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            Save to Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
