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

type ContentType = 'notes' | 'resources';

export function SaveSkillTreeDialog({ isOpen, onOpenChange, topic, nodes, edges, explanations }: SaveSkillTreeDialogProps) {
  const [targetType, setTargetType] = useState<'new' | 'existing'>('new');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [contentType, setContentType] = useState<ContentType>('notes');
  const [isSaving, setIsSaving] = useState(false);

  const { user, firestore, storage } = useFirebase();
  const { toast } = useToast();

  const subjectsCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'subjects');
  }, [user, firestore]);
  const { data: subjects, isLoading: isLoadingSubjects } = useCollection(subjectsCollectionRef);

  const itemsCollectionRef = useMemoFirebase(() => {
    if (!user || !selectedSubject) return null;
    return collection(firestore, 'users', user.uid, 'subjects', selectedSubject, contentType);
  }, [user, selectedSubject, firestore, contentType]);
  const { data: items, isLoading: isLoadingItems } = useCollection(itemsCollectionRef);
  
  useEffect(() => {
      setSelectedItem(null);
  }, [selectedSubject, contentType]);
  
  useEffect(() => {
    if (topic && targetType === 'new') {
      setNewItemTitle(`${topic} - Skill Tree`);
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
        
        // Correctly handle the data URI for upload
        const base64String = imageResult.imageDataUri.split(',')[1];
        if (!base64String) {
          throw new Error('Invalid image data URI received from AI.');
        }

        const uploadResult = await uploadString(storageRef, base64String, 'base64', { contentType: 'image/png' });
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
            
            const positionMap = new Map<string, any[]>();
            edges.forEach(edge => {
              if(!positionMap.has(edge.source)) {
                positionMap.set(edge.source, []);
              }
              const targetNode = nodes.find(n => n.id === edge.target);
              if(targetNode) {
                positionMap.get(edge.source)?.push(targetNode);
              }
            });

            const mainIdeas = positionMap.get(keyConcept.id) || [];
            mainIdeas.forEach(idea => {
                textContent += `<h3>${idea.label}</h3><p>${allExplanations[idea.id] || '...'}</p>`;
                const details = positionMap.get(idea.id) || [];
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
        const singularContentType = contentType === 'notes' ? 'note' : 'resource';

        // 5. Add to new or existing item
        if (targetType === 'new') {
            if (!selectedSubject || !newItemTitle) {
                throw new Error(`Please select a subject and provide a title for the new ${singularContentType}.`);
            }
            toast({ title: `Creating New ${singularContentType}...`, description: `Adding "${newItemTitle}".`});
            const newItem = {
                title: newItemTitle,
                blocks: finalBlocks,
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
                isImportant: false,
            };
            await addDoc(collection(firestore, 'users', user.uid, 'subjects', selectedSubject, contentType), newItem);
        } else {
            if (!selectedSubject || !selectedItem) {
                throw new Error(`Please select a subject and a ${singularContentType} to append to.`);
            }
            toast({ title: `Updating ${singularContentType}...`, description: `Adding skill tree to existing ${singularContentType}.`});
            const itemRef = doc(firestore, 'users', user.uid, 'subjects', selectedSubject, contentType, selectedItem);
            const existingItem = items?.find(n => n.id === selectedItem);
            if (!existingItem) throw new Error(`Selected ${singularContentType} not found.`);

            const updatedBlocks = [...(existingItem.blocks || []), ...finalBlocks];
            await updateDoc(itemRef, {
                blocks: updatedBlocks,
                lastUpdated: serverTimestamp(),
            });
        }
        
        toast({ title: 'Success!', description: `Skill tree has been saved to your ${contentType}.` });
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
  
  const isSaveDisabled = isSaving || (targetType === 'new' && (!selectedSubject || !newItemTitle)) || (targetType === 'existing' && (!selectedSubject || !selectedItem));
  const typeName = contentType === 'notes' ? 'Note' : 'Resource';
  const singularContentType = contentType === 'notes' ? 'note' : 'resource';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="glass-pane">
        <DialogHeader>
          <DialogTitle className="font-headline">Save Skill Tree</DialogTitle>
          <DialogDescription>Save the generated skill tree for "{topic}" as a new or in an existing item.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <Button variant={targetType === 'new' ? 'secondary' : 'ghost'} onClick={() => setTargetType('new')} className="w-full">
                <Plus className="mr-2 h-4 w-4"/> New Item
            </Button>
            <Button variant={targetType === 'existing' ? 'secondary' : 'ghost'} onClick={() => setTargetType('existing')} className="w-full">
                <Save className="mr-2 h-4 w-4"/> Existing Item
            </Button>
          </div>
          
           <div className="space-y-2">
            <Label htmlFor="content-type-select">Content Type</Label>
            <Select onValueChange={(value: ContentType) => setContentType(value)} value={contentType}>
              <SelectTrigger id="content-type-select">
                <SelectValue placeholder="Select a content type" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="notes">Note</SelectItem>
                  <SelectItem value="resources">Resource</SelectItem>
              </SelectContent>
            </Select>
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
              <Label htmlFor="new-item-title">New {typeName} Title</Label>
              <Input id="new-item-title" value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} placeholder={`e.g., ${topic} Overview`} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="item-select">{typeName}</Label>
              <Select onValueChange={setSelectedItem} value={selectedItem || ''} disabled={!selectedSubject || isLoadingItems}>
                <SelectTrigger id="item-select">
                  <SelectValue placeholder={!selectedSubject ? 'First, select a subject' : (isLoadingItems ? `Loading ${contentType}...` : `Select a ${singularContentType} to append to`)} />
                </SelectTrigger>
                <SelectContent>
                  {items?.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>
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
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
