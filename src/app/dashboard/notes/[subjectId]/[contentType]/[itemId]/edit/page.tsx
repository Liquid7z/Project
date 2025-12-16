

'use client';

import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader, AlertTriangle, Image as ImageIcon, Plus, File as FileIcon, Trash2, Sparkles, PencilRuler } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { NoteEditor } from '@/components/note-editor';
import { FileUploader } from '@/components/file-uploader';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { DocumentPreviewer } from '@/components/document-previewer';
import { Separator } from '@/components/ui/separator';
import { extractTextAction } from '@/actions/generation';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';


interface Block {
    id: string;
    type: 'text' | 'image' | 'document';
    content?: string; // HTML for text
    downloadUrl?: string; // URL from storage
    fileName?: string;
    fileType?: string;
    // Client-side only properties
    file?: File; // The actual file object, for upload
    previewUrl?: string; // data URI for client-side image/pdf preview
}

const ContentBlock = ({ block, removeBlock, updateContent }: { block: Block; removeBlock: (id: string) => void; updateContent: (id: string, content: string) => void }) => {
    return (
        <div data-testid="note-block-container" className="relative group p-4 rounded-lg bg-background/30 border border-transparent hover:border-border transition-colors">
            {block.type === 'text' ? (
                <NoteEditor value={block.content || ''} onChange={(newContent) => updateContent(block.id, newContent)} />
            ) : block.type === 'image' ? (
                 (block.previewUrl) ? (
                    <Image src={block.previewUrl} alt={block.fileName || 'Uploaded image'} width={800} height={600} className="rounded-md" />
                 ) : block.downloadUrl ? (
                    <Image src={block.downloadUrl} alt={block.fileName || 'Uploaded image'} width={800} height={600} className="rounded-md" />
                 ) : null
            ) : block.type === 'document' ? (
                <DocumentPreviewer name={block.fileName!} type={block.fileType!} url={block.downloadUrl || block.previewUrl!} />
            ) : null}
             <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100" onClick={() => removeBlock(block.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
        </div>
    );
};


export default function ItemEditPage({ params, searchParams }: { params: { subjectId: string, contentType: string, itemId: string }, searchParams: { [key: string]: string | string[] | undefined } }) {
    const { subjectId, contentType, itemId } = React.use(params);
    const router = useRouter();

    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();

    const itemRef = useMemoFirebase(() => {
        if (!user || !subjectId || !itemId || !contentType) return null;
        return doc(firestore, 'users', user.uid, 'subjects', subjectId, contentType, itemId);
    }, [user, subjectId, itemId, firestore, contentType]);

    const { data: item, isLoading: isItemLoading, error: itemError } = useDoc(itemRef);

    const [blocks, setBlocks] = useState<Block[]>([]);
    const [title, setTitle] = useState('');
    const [isImportant, setIsImportant] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const subjectRef = useMemoFirebase(() => {
      if (!user || !subjectId ) return null;
      return doc(firestore, 'users', user.uid, 'subjects', subjectId);
    }, [user, subjectId, firestore]);
    const { data: subject, isLoading: isSubjectLoading } = useDoc(subjectRef);
    
    useEffect(() => {
        if (item) {
            setTitle(item.title || '');
            setBlocks(item.blocks || []);
            setIsImportant(item.isImportant || false);
        }
    }, [item]);

    const handleSave = async () => {
        if (!itemRef || !user) return;
        setIsSaving(true);
        try {
            const updatedBlocks = await Promise.all(blocks.map(async (block) => {
                const { file, previewUrl, ...storableBlock } = block;

                if (file && previewUrl) { // Check for both file and previewUrl to indicate it's a new upload
                     const storage = getStorage();
                     const filePath = `users/${user.uid}/${contentType}/${itemId}/${uuidv4()}-${file.name}`;
                     const fileRef = ref(storage, filePath);
                     await uploadBytes(fileRef, file);
                     storableBlock.downloadUrl = await getDownloadURL(fileRef);
                     URL.revokeObjectURL(previewUrl); // Clean up the temporary URL
                }
                
                return storableBlock;
            }));
            
            await updateDoc(itemRef, {
                title,
                blocks: updatedBlocks,
                isImportant,
                lastUpdated: serverTimestamp(),
            });
            toast({ title: "Item Saved!", description: "Your changes have been saved successfully." });
            router.push(`/dashboard/notes/${subjectId}/${contentType}/${itemId}`);
        } catch (error) {
            console.error("Error saving item:", error);
            toast({ title: "Error", description: "Failed to save item.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    const heroImage = PlaceHolderImages.find(p => p.id === 'landing-hero');

    const addTextBlock = (content: string = '<p></p>') => {
        setBlocks(prev => [...prev, { id: `text-${Date.now()}`, type: 'text', content }]);
    }

    const handleDocumentUpload = async (file: File) => {
        if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            toast({title: "Extracting Content", description: "Reading your document, please wait..."});
            
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                try {
                    const documentDataUri = reader.result as string;
                    const result = await extractTextAction({ documentDataUri });

                    if (result.extractedText) {
                        addTextBlock(result.extractedText);
                        toast({title: "Content Extracted", description: "The content from your document has been added."});
                    } else {
                         toast({title: "Extraction Failed", description: "Could not extract content from the document.", variant: "destructive"});
                    }
                    
                } catch (error) {
                    console.error("Failed to extract text from document:", error);
                    toast({title: "Error", description: "An error occurred while processing the document.", variant: "destructive"});
                }
            };
             reader.onerror = (error) => {
                console.error("Error reading file:", error);
                toast({title: "File Read Error", description: "Could not read the uploaded file.", variant: "destructive"});
            };
        } else if (file.type === 'application/pdf') {
             const newBlock: Block = {
                id: `doc-${Date.now()}`,
                type: 'document' as const,
                file: file,
                fileName: file.name,
                fileType: file.type || 'Unknown',
                previewUrl: URL.createObjectURL(file) 
            };
            setBlocks(prev => [...prev, newBlock]);
            toast({title: "PDF Added", description: "Your PDF has been added. Save to complete the upload."});
        }
    };
    
    const handleImageUpload = (file: File) => {
        const newBlock: Block = {
            id: `img-${Date.now()}`,
            type: 'image' as const,
            file: file,
            fileName: file.name,
            fileType: file.type || 'Unknown',
            previewUrl: URL.createObjectURL(file)
        };
        setBlocks(prev => [...prev, newBlock]);
    };

    const removeBlock = (id: string) => {
        setBlocks(prev => prev.filter(b => {
            if (b.id === id && b.previewUrl) {
                URL.revokeObjectURL(b.previewUrl);
            }
            return b.id !== id;
        }));
    };
    
    const updateContent = (id: string, content: string) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
    };

    if (isItemLoading || isSubjectLoading) return <div className="flex items-center justify-center h-full"><Loader className="h-12 w-12 animate-spin text-primary" /></div>;
    if (itemError) return <div className="flex items-center justify-center h-full text-destructive"><AlertTriangle className="h-8 w-8 mr-2"/> Error loading item.</div>;

    const getBackLink = () => {
         return `/dashboard/notes/${subjectId}/${contentType}/${itemId}`;
    }

    return (
        <div className="space-y-4 pb-12">
            
            <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                    <Link href={getBackLink()}>
                        <Button variant="outline" size="icon" type="button">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>
                 <Button variant="glow" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader className="animate-spin" /> : <Save />}
                    <span className="hidden sm:inline ml-2">Save</span>
                </Button>
            </div>

            <div className="relative space-y-6">
                <Card className={cn("glass-pane overflow-hidden p-4 sm:p-6", isImportant && "important-glow")}>
                    
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                        <div className="font-medium text-sm">
                            From: <Link href={`/dashboard/notes/${subjectId}`} className="text-accent hover:underline">{subject?.name || '...'}</Link>
                        </div>
                        <div className="flex items-center space-x-2">
                           <Label htmlFor="important-note" className="flex items-center gap-2 text-sm font-medium text-accent cursor-pointer">
                               <Sparkles className="h-4 w-4"/>
                                <span className="hidden sm:inline">Important</span>
                           </Label>
                           <Switch id="important-note" checked={isImportant} onCheckedChange={setIsImportant} />
                        </div>
                    </div>

                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Item Title"
                        className="text-2xl sm:text-4xl font-bold font-headline h-auto p-2 border-none focus-visible:ring-0 bg-transparent -mx-2 mb-4"
                    />
                    <div className="space-y-4">
                        {blocks.map((block) => (
                            <ContentBlock 
                                key={block.id} 
                                block={block} 
                                removeBlock={removeBlock}
                                updateContent={updateContent}
                            />
                        ))}
                         {blocks.length === 0 && (
                           <div className="text-center p-8 text-muted-foreground">
                                <PencilRuler className="mx-auto h-12 w-12 text-muted-foreground/50"/>
                                <p className="mt-4">This item is empty.</p>
                                <p className="text-sm">Use the controls below to add content.</p>
                           </div>
                        )}
                    </div>
                    
                    <Separator className="my-6" />

                    <div className="flex flex-wrap gap-2 justify-center">
                        <Button variant="outline" size="sm" onClick={() => addTextBlock()}>
                            <Plus className="h-4 w-4 mr-2"/> Add Text
                        </Button>
                         <FileUploader onFileUpload={handleImageUpload} acceptedFiles={['image/png', 'image/jpeg', 'image/gif']}>
                           <Button variant="outline" size="sm" className="w-full sm:w-auto">
                               <ImageIcon className="h-4 w-4 mr-2"/> Add Image
                           </Button>
                        </FileUploader>
                         <FileUploader onFileUpload={handleDocumentUpload} acceptedFiles={['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/pdf']}>
                           <Button variant="outline" size="sm" className="w-full sm:w-auto">
                               <FileIcon className="h-4 w-4 mr-2"/> Add Document
                           </Button>
                        </FileUploader>
                    </div>

                </Card>
            </div>
        </div>
    );
}
