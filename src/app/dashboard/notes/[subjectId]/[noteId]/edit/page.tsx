'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader, AlertTriangle, GripVertical, Image as ImageIcon, Plus, File as FileIcon, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { NoteEditor } from '@/components/note-editor';
import { FileUploader } from '@/components/file-uploader';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { extractTextAction } from '@/actions/generation';
import { DocumentPreviewer } from '@/components/document-previewer';


interface Block {
    id: string;
    type: 'text' | 'document' | 'image';
    content?: string; // HTML for text
    file?: File;
    fileName?: string;
    fileType?: string;
    downloadUrl?: string;
    previewUrls?: string[];
}

const ItemTypes = {
    BLOCK: 'block',
};


const DraggableBlock = ({ block, index, moveBlock, removeBlock, updateContent }: { block: Block; index: number; moveBlock: (dragIndex: number, hoverIndex: number) => void; removeBlock: (id: string) => void; updateContent: (id: string, content: string) => void }) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const [, drop] = useDrop({
        accept: ItemTypes.BLOCK,
        hover(item: { index: number }) {
            if (!ref.current) return;
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;
            moveBlock(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag, preview] = useDrag({
        type: ItemTypes.BLOCK,
        item: { id: block.id, index },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    preview(drop(ref));

    return (
        <div ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }} className="relative group p-4 rounded-lg bg-background/30 border border-transparent hover:border-border transition-colors">
            <div className="absolute top-1/2 -left-8 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" ref={drag}>
                <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
            </div>
            {block.type === 'text' ? (
                <NoteEditor value={block.content || ''} onChange={(newContent) => updateContent(block.id, newContent)} />
            ) : block.type === 'image' && block.downloadUrl ? (
                <Image src={block.downloadUrl} alt={block.fileName || 'Uploaded image'} width={800} height={600} className="rounded-md" />
            ) : block.type === 'document' ? (
                <DocumentPreviewer
                    name={block.fileName || 'Document'}
                    type={block.fileType || 'File'}
                    url={block.downloadUrl || '#'}
                    previewUrls={block.previewUrls || []}
                 />
            ) : null}
             <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100" onClick={() => removeBlock(block.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
        </div>
    );
};

export default function NoteEditPage() {
    const params = useParams();
    const subjectId = params.subjectId as string;
    const noteId = params.noteId as string;
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();

    const noteRef = useMemoFirebase(() => {
        if (!user || !subjectId || !noteId) return null;
        return doc(firestore, 'users', user.uid, 'subjects', subjectId, 'notes', noteId);
    }, [user, subjectId, noteId, firestore]);

    const { data: note, isLoading: isNoteLoading, error: noteError } = useDoc(noteRef);

    const [blocks, setBlocks] = useState<Block[]>([]);
    const [title, setTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const subjectRef = useMemoFirebase(() => {
      if (!user || !subjectId ) return null;
      return doc(firestore, 'users', user.uid, 'subjects', subjectId);
    }, [user, subjectId, firestore]);
    const { data: subject, isLoading: isSubjectLoading } = useDoc(subjectRef);


    React.useEffect(() => {
        if (note) {
            setTitle(note.title || '');
            setBlocks(note.blocks || []);
        }
    }, [note]);

    const handleSave = async () => {
        if (!noteRef) return;
        setIsSaving(true);
        try {
            // This is a simplified approach. A real app might handle uploads separately.
            const updatedBlocks = await Promise.all(blocks.map(async (block) => {
                if ((block.type === 'document' || block.type === 'image') && block.file && !block.downloadUrl) {
                     const storage = getStorage();
                     const filePath = `users/${user?.uid}/notes/${noteId}/${uuidv4()}-${block.file.name}`;
                     const fileRef = ref(storage, filePath);
                     await uploadBytes(fileRef, block.file);
                     const downloadUrl = await getDownloadURL(fileRef);

                     // For PDFs, generate previews
                     let previewUrls: string[] = [];
                     if(block.file.type === 'application/pdf') {
                         const reader = new FileReader();
                         const fileDataPromise = new Promise<string>((resolve, reject) => {
                             reader.onload = e => resolve(e.target?.result as string);
                             reader.onerror = e => reject(e);
                             reader.readAsDataURL(block.file as Blob);
                         });
                         const documentDataUri = await fileDataPromise;
                         const result = await extractTextAction({ documentDataUri });
                         if(result.previewDataUris) {
                             previewUrls = result.previewDataUris;
                         }
                     }

                     return { ...block, downloadUrl, previewUrls, file: undefined }; // remove file object
                }
                return block;
            }));

            await updateDoc(noteRef, {
                title,
                blocks: updatedBlocks,
                lastUpdated: serverTimestamp(),
            });
            toast({ title: "Note Saved!", description: "Your changes have been saved successfully." });
            router.push(`/dashboard/notes/${subjectId}/${noteId}`);
        } catch (error) {
            console.error("Error saving note:", error);
            toast({ title: "Error", description: "Failed to save note.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    const heroImage = PlaceHolderImages.find(p => p.id === 'landing-hero');

    const addTextBlock = () => setBlocks(prev => [...prev, { id: `text-${Date.now()}`, type: 'text', content: '<p></p>' }]);
    
    const handleDocumentUpload = (file: File) => {
        setBlocks(prev => [...prev, {
            id: `doc-${Date.now()}`,
            type: 'document',
            file: file,
            fileName: file.name,
            fileType: file.type || 'Unknown'
        }]);
    };
    
    const handleImageUpload = (file: File) => {
        setBlocks(prev => [...prev, {
            id: `img-${Date.now()}`,
            type: 'image',
            file: file,
            fileName: file.name,
            fileType: file.type || 'Unknown'
        }]);
    };

    const moveBlock = (dragIndex: number, hoverIndex: number) => {
        setBlocks(prev => {
            const newBlocks = [...prev];
            const [movedBlock] = newBlocks.splice(dragIndex, 1);
            newBlocks.splice(hoverIndex, 0, movedBlock);
            return newBlocks;
        });
    };

    const removeBlock = (id: string) => setBlocks(prev => prev.filter(b => b.id !== id));
    
    const updateContent = (id: string, content: string) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
    };

    if (isNoteLoading || isSubjectLoading) return <div className="flex items-center justify-center h-full"><Loader className="h-12 w-12 animate-spin text-primary" /></div>;
    if (noteError) return <div className="flex items-center justify-center h-full text-destructive"><AlertTriangle className="h-8 w-8 mr-2"/> Error loading note.</div>;

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="max-w-5xl mx-auto space-y-8 pb-12">
                 {heroImage && (
                    <div className="h-64 w-full relative rounded-lg overflow-hidden">
                        <Image src={heroImage.imageUrl} alt={heroImage.description} layout="fill" objectFit="cover" className="opacity-20" />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
                    </div>
                )}
                
                <div className="flex items-center justify-between -mt-24 relative z-10 px-8">
                     <Link href={`/dashboard/notes/${subjectId}/${noteId}`}>
                        <Button variant="outline" size="icon" type="button">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <Button onClick={handleSave} variant="glow" disabled={isSaving}>
                        {isSaving ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </div>

                <div className="space-y-6 px-4 md:px-8 relative">
                    <Card className="glass-pane overflow-hidden p-6">
                        <CardHeader className="!p-0 !pb-4 border-b">
                            <CardTitle className="font-headline text-lg">
                                From subject: <Link href={`/dashboard/notes/${subjectId}`} className="text-accent hover:underline">{subject?.name || '...'}</Link>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="!p-0 !pt-6">
                             <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Note Title"
                                className="text-4xl font-bold font-headline h-auto p-2 border-none focus-visible:ring-0 bg-transparent -mx-2"
                            />
                        </CardContent>
                    </Card>

                    <Card className="glass-pane p-2 sm:p-6">
                        <div className="space-y-4">
                            {blocks.map((block, index) => (
                                <DraggableBlock 
                                    key={block.id} 
                                    block={block} 
                                    index={index} 
                                    moveBlock={moveBlock}
                                    removeBlock={removeBlock}
                                    updateContent={updateContent}
                                />
                            ))}
                        </div>
                    </Card>
                </div>

                 <div className="fixed right-8 top-1/2 -translate-y-1/2 z-20">
                    <Card className="glass-pane p-2 flex flex-col gap-2">
                        <Button variant="outline" size="icon" onClick={addTextBlock}>
                            <Plus className="h-4 w-4"/>
                        </Button>
                         <FileUploader onFileUpload={handleImageUpload} acceptedFiles={['image/png', 'image/jpeg', 'image/gif']}>
                           <Button variant="outline" size="icon" className="w-10 h-10">
                               <ImageIcon className="h-4 w-4"/>
                           </Button>
                        </FileUploader>
                         <FileUploader onFileUpload={handleDocumentUpload} acceptedFiles={['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}>
                           <Button variant="outline" size="icon" className="w-10 h-10">
                               <FileIcon className="h-4 w-4"/>
                           </Button>
                        </FileUploader>
                    </Card>
                </div>

            </div>
        </DndProvider>
    );
}
