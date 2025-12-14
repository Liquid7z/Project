'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, File as FileIcon, Loader, AlertTriangle, Plus, Trash2, GripVertical, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';

// Mock data for initial state
const mockNote = {
    id: 'n1',
    title: 'The Last Sunset',
    content: `<p>The sky bled orange and purple as the last sun of the year dipped below the horizon of Neo-Kyoto. From my high-rise hab-unit, the city looked like a circuit board of pulsing light. It was beautiful, in a sterile, manufactured kind of way.</p><p>Down below, the crowds would be swarming, a river of humanity flowing towards the countdown plaza. But up here, it was just me and the quiet hum of the climate-control unit. Another year gone. Another year alone.</p>`,
    documents: [
        { name: 'Research_Notes.pdf', url: '#', type: 'PDF' },
        { name: 'Character_Sheet.docx', url: '#', type: 'DOCX' },
    ],
    lastUpdated: new Date(Date.now() - 3600000),
};

const ItemTypes = {
    BLOCK: 'block',
};

interface Block {
    id: string;
    type: 'text' | 'document';
    content?: string; // HTML for text, or file data for documents
    file?: File;
    fileName?: string;
    fileType?: string;
}

const DraggableBlock = ({ block, index, moveBlock, removeBlock, updateContent }: { block: Block; index: number; moveBlock: any; removeBlock: any; updateContent: any }) => {
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
        <div ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }} className="relative group">
            <div className="absolute top-1/2 -left-8 -translate-y-1/2" ref={drag}>
                <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab group-hover:opacity-100 opacity-0 transition-opacity" />
            </div>
            {block.type === 'text' ? (
                <NoteEditor value={block.content || ''} onChange={(newContent) => updateContent(block.id, newContent)} />
            ) : (
                <div className="p-4 rounded-md border-dashed border-2 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <FileIcon className="h-8 w-8 text-primary" />
                        <div>
                            <p className="font-semibold text-sm truncate">{block.fileName}</p>
                             <Badge variant="secondary">{block.fileType}</Badge>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeBlock(block.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            )}
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

    // In a real app, use useDoc for the note
    const { data: note, isLoading, error } = { data: mockNote, isLoading: false, error: null };
    
    const { register, handleSubmit, watch } = useForm({ defaultValues: { title: note?.title || '' } });
    const noteTitle = watch('title');

    const initialBlocks = [
        { id: '1', type: 'text', content: note?.content || '' } as Block,
        ...(note?.documents?.map((doc, i) => ({
            id: `doc-${i+1}`,
            type: 'document',
            fileName: doc.name,
            fileType: doc.type,
        } as Block)) || [])
    ];

    const [blocks, setBlocks] = useState<Block[]>(initialBlocks);

    const handleSave = (data: { title: string }) => {
        console.log('Saving note:', { title: data.title, blocks });
        toast({ title: "Note Saved!", description: "Your changes have been saved successfully." });
        router.push(`/dashboard/notes/${subjectId}/${noteId}`);
    };
    
    const heroImage = PlaceHolderImages.find(p => p.id === 'landing-hero');

    const addTextBlock = () => setBlocks(prev => [...prev, { id: `text-${Date.now()}`, type: 'text', content: '' }]);
    
    const handleDocumentUpload = (file: File) => {
        setBlocks(prev => [...prev, {
            id: `doc-${Date.now()}`,
            type: 'document',
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

    if (isLoading) return <div className="flex items-center justify-center h-full"><Loader className="h-12 w-12 animate-spin text-primary" /></div>;
    if (error) return <div className="flex items-center justify-center h-full text-destructive"><AlertTriangle className="h-8 w-8 mr-2"/> Error loading note.</div>;

    return (
        <DndProvider backend={HTML5Backend}>
            <form onSubmit={handleSubmit(handleSave)}>
                <div className="max-w-4xl mx-auto space-y-8">
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
                        <Button type="submit" variant="glow">
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                        </Button>
                    </div>

                    <div className="space-y-6 px-4 md:px-8 relative">
                        <Input
                            {...register('title')}
                            placeholder="Note Title"
                            className="text-4xl font-bold font-headline h-auto p-2 border-none focus-visible:ring-0 bg-transparent"
                        />
                        
                        <Card className="glass-pane p-6">
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

                        <Card className="glass-pane p-4">
                             <CardHeader>
                                <CardTitle className="font-headline text-lg">Add Content</CardTitle>
                            </CardHeader>
                            <CardContent className="grid sm:grid-cols-2 gap-4">
                                 <Button variant="outline" type="button" onClick={addTextBlock}>
                                    <Plus className="mr-2 h-4 w-4"/> Add Text Block
                                </Button>
                                 <FileUploader onFileUpload={handleDocumentUpload} />
                            </CardContent>
                        </Card>
                        
                    </div>
                </div>
            </form>
        </DndProvider>
    );
}
