
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card } from './ui/card';
import { Loader, Network, Wand2, Plus } from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, collectionGroup, query } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { generateSkillTreeFromTopic } from '@/ai/flows/generate-skill-tree';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';


// A simple deterministic hash function for positioning
const simpleHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};


interface Node {
    id: string;
    label: string;
    type: 'subject' | 'note' | 'key-concept' | 'main-idea' | 'detail';
    x: number;
    y: number;
    subjectId?: string;
    isImportant?: boolean;
    isPlaceholder?: boolean;
    children?: Node[];
    width?: number;
    parent?: Node;
}

interface Edge {
    id: string;
    source: string;
    target: string;
}

interface GenerateSkillTreeOutput {
  nodes: Omit<Node, 'x' | 'y' | 'children' | 'width' | 'parent'>[];
  edges: Edge[];
}


const VIEW_WIDTH = 1200;
const VIEW_HEIGHT = 800;
const NODE_WIDTH = 160;
const NODE_HEIGHT = 50;
const HORIZONTAL_SPACING = 40;
const VERTICAL_SPACING = 80;


const layoutHierarchical = (aiNodes: any[], aiEdges: any[]) => {
    const nodesMap: { [id: string]: Node } = {};
    aiNodes.forEach(n => {
        nodesMap[n.id] = { ...n, children: [], x: 0, y: 0 };
    });

    aiEdges.forEach(edge => {
        const source = nodesMap[edge.source];
        const target = nodesMap[edge.target];
        if (source && target) {
            source.children?.push(target);
            target.parent = source;
        }
    });

    const keyConcept = Object.values(nodesMap).find(n => n.type === 'key-concept');
    if (!keyConcept) return { finalNodes: [], finalEdges: aiEdges };
    
    // Calculate widths recursively
    const calculateWidths = (node: Node) => {
        if (node.children?.length === 0) {
            node.width = NODE_WIDTH;
            return;
        }
        let childrenWidth = 0;
        node.children?.forEach(child => {
            calculateWidths(child);
            childrenWidth += child.width || 0;
        });
        node.width = Math.max(NODE_WIDTH, childrenWidth + (node.children!.length - 1) * HORIZONTAL_SPACING);
    };
    calculateWidths(keyConcept);

    // Position nodes recursively
    const positionNodes = (node: Node, x: number, y: number) => {
        node.x = x + (node.width || NODE_WIDTH) / 2;
        node.y = y + NODE_HEIGHT / 2;
        
        let currentX = x;
        node.children?.forEach(child => {
            positionNodes(child, currentX, y + NODE_HEIGHT + VERTICAL_SPACING);
            currentX += (child.width || 0) + HORIZONTAL_SPACING;
        });
    };
    
    const totalWidth = keyConcept.width || NODE_WIDTH;
    positionNodes(keyConcept, (VIEW_WIDTH - totalWidth) / 2, 50);

    return { finalNodes: Object.values(nodesMap), finalEdges: aiEdges };
};


export function SkillTreeView({ subjects }: { subjects: any[] }) {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [topic, setTopic] = useState('');
    const { user, firestore } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();

    // Fetch existing notes to merge with AI generated ones
    const notesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collectionGroup(firestore, 'notes'));
    }, [user, firestore]);
    const { data: allNotes } = useCollection(notesQuery);

     // Function to layout nodes
    const layoutNodes = (subjectsToLayout: any[], notesToLayout: any[]) => {
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];

        const subjectPositions: { [key: string]: { x: number, y: number } } = {};

        subjectsToLayout.forEach((subject, index) => {
            const subjectId = `subject-${subject.id}`;
            const x = (simpleHash(subject.id) % (VIEW_WIDTH - 200)) + 100;
            const y = (index * 150) + 100;
            subjectPositions[subject.id] = { x, y };

            newNodes.push({
                id: subjectId,
                label: subject.name,
                type: 'subject',
                x,
                y,
                isImportant: subject.isImportant,
                isPlaceholder: subject.isPlaceholder,
            });

             const relatedNotes = notesToLayout.filter((note) => {
                // For Firestore collectionGroup queries, the path is available to extract parent IDs
                if (note.ref?.parent.parent) {
                    return note.ref.parent.parent.id === subject.id;
                }
                return note.subjectId === subject.id;
             });

            relatedNotes.forEach((note, noteIndex) => {
                const noteId = `note-${note.id}`;
                const subjectIdForNote = note.ref?.parent.parent.id || note.subjectId;
                newNodes.push({
                    id: noteId,
                    label: note.title,
                    type: 'note',
                    x: x + 100 + (noteIndex % 3) * 30,
                    y: y - 30 + (noteIndex * 25),
                    subjectId: subjectIdForNote,
                    isImportant: note.isImportant || false,
                    isPlaceholder: note.isPlaceholder,
                });
                newEdges.push({
                    id: `edge-${subjectId}-${noteId}`,
                    source: subjectId,
                    target: noteId,
                });
            });
        });
        
        return { newNodes, newEdges };
    }
    
    // Initial layout of existing subjects
    useEffect(() => {
        if (!subjects) return;
        const { newNodes, newEdges } = layoutNodes(subjects, allNotes || []);
        setNodes(newNodes);
        setEdges(newEdges);
        setIsInitialLoading(false);
    }, [subjects, allNotes]);


    const handleGenerateTree = async () => {
        if (!topic) return;
        setIsGenerating(true);
        setNodes([]);
        setEdges([]);

        try {
            const result: GenerateSkillTreeOutput = await generateSkillTreeFromTopic({ topic });
            
            const { finalNodes, finalEdges } = layoutHierarchical(result.nodes, result.edges);
            
            setNodes(finalNodes);
            setEdges(finalEdges);

        } catch (error) {
            console.error("Failed to generate skill tree:", error);
            toast({
                title: "Generation Failed",
                description: "The AI could not generate a skill tree for this topic.",
                variant: "destructive"
            });
            // Restore original nodes on failure
            const { newNodes, newEdges } = layoutNodes(subjects, allNotes || []);
            setNodes(newNodes);
            setEdges(newEdges);
        } finally {
            setIsGenerating(false);
        }
    };

    const createPlaceholderNode = async (node: Node) => {
        if (!user || !firestore) return;

        if ((node.type === 'subject' || node.type === 'key-concept' || node.type === 'main-idea') && node.isPlaceholder) {
            const subjectsCollectionRef = collection(firestore, 'users', user.uid, 'subjects');
            try {
                await addDoc(subjectsCollectionRef, {
                    name: node.label,
                    description: `AI-generated subject for topic: ${topic}`,
                    isImportant: false,
                    createdAt: serverTimestamp(),
                    lastUpdated: serverTimestamp(),
                });
                toast({ title: "Subject Created!", description: `You can now find "${node.label}" in your subjects list.`});
                // Optimistically update UI - this would be more complex in a real app
                setNodes(nodes.map(n => n.id === node.id ? { ...n, isPlaceholder: false } : n));
            } catch (error) {
                 toast({ title: "Error", description: "Could not create subject.", variant: "destructive"});
            }
        }
        // Similar logic would be needed for notes, which is more complex as it needs a subject.
        // For now, we only allow creating subjects.
        else if(node.type === 'note' || node.type === 'detail') {
             toast({ title: "Info", description: "Create the parent subject first before adding notes.", variant: 'default' });
        }
    }


    const handleNodeClick = (node: Node) => {
        if (node.isPlaceholder) {
            // This is handled by the AlertDialog now
        } else if (node.type === 'subject' || node.type === 'key-concept' || node.type === 'main-idea') {
            const subjectId = node.id.startsWith('subject-') ? node.id.replace('subject-','') : node.id;
            router.push(`/dashboard/notes/${subjectId}`);
        } else if (node.type === 'note' && node.subjectId) {
             const noteId = node.id.startsWith('note-') ? node.id.replace('note-','') : node.id;
             router.push(`/dashboard/notes/${node.subjectId}/notes/${noteId}`);
        }
    }
    
    const getNodeStyles = (nodeType: Node['type']) => {
        switch (nodeType) {
            case 'key-concept':
                return 'bg-primary text-primary-foreground border-2 border-primary-foreground/50';
            case 'main-idea':
                return 'bg-accent text-accent-foreground border-2 border-accent-foreground/50';
            case 'detail':
                return 'bg-secondary text-secondary-foreground border-2 border-border';
            case 'subject':
                return 'bg-primary text-primary-foreground';
            case 'note':
            default:
                return 'bg-secondary text-secondary-foreground';
        }
    };

    if (isInitialLoading) {
        return (
            <Card className="h-96 flex items-center justify-center glass-pane">
                <Loader className="animate-spin text-primary" />
                <p className="ml-2">Loading Skill Tree...</p>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
             <div className="flex flex-col sm:flex-row gap-2">
                <Input
                    type="text"
                    placeholder="Enter a topic to generate a new skill tree..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="flex-grow"
                />
                <Button onClick={handleGenerateTree} disabled={isGenerating || !topic} className="w-full sm:w-auto">
                    {isGenerating ? <Loader className="animate-spin mr-2" /> : <Wand2 className="mr-2" />}
                    Generate with AI
                </Button>
            </div>
            <Card className="h-[800px] w-full glass-pane overflow-auto relative">
                 {isGenerating && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20">
                         <Loader className="animate-spin text-primary" />
                         <p className="ml-2">Generating skill tree...</p>
                    </div>
                )}
                 {!isGenerating && nodes.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center glass-pane border-dashed">
                        <Network className="w-16 h-16 text-muted-foreground/50" />
                        <h3 className="mt-4 text-lg font-semibold">The canvas is ready</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Generate a new skill tree or view your existing subjects.</p>
                    </div>
                 )}
                 {nodes.length > 0 && (
                    <div className='relative w-full h-full'>
                        <svg width={VIEW_WIDTH} height={VIEW_HEIGHT} className="absolute inset-0 h-full w-full">
                            <defs>
                                <marker
                                    id="arrow"
                                    viewBox="0 0 10 10"
                                    refX="8"
                                    refY="5"
                                    markerWidth="6"
                                    markerHeight="6"
                                    orient="auto-start-reverse"
                                >
                                    <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--border))" />
                                </marker>
                            </defs>
                            {edges.map(edge => {
                                const sourceNode = nodes.find(n => n.id === edge.source);
                                const targetNode = nodes.find(n => n.id === edge.target);
                                if (!sourceNode || !targetNode) return null;
                                
                                return (
                                    <motion.line
                                        key={edge.id}
                                        x1={sourceNode.x}
                                        y1={sourceNode.y}
                                        x2={targetNode.x}
                                        y2={targetNode.y}
                                        stroke="hsl(var(--border))"
                                        strokeWidth="1"
                                        markerEnd="url(#arrow)"
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 1 }}
                                        transition={{ duration: 0.5, delay: 0.2 }}
                                    />
                                );
                            })}
                        </svg>
                        
                        {nodes.map(node => (
                             <AlertDialog key={node.id}>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                             <motion.div
                                                drag
                                                dragMomentum={false}
                                                className={cn(`absolute p-2 flex items-center justify-center rounded-md cursor-pointer text-xs font-semibold`,
                                                    getNodeStyles(node.type),
                                                    node.isImportant && 'important-glow',
                                                    node.isPlaceholder && 'border-2 border-dashed border-accent'
                                                )}
                                                style={{
                                                    left: node.x - NODE_WIDTH / 2,
                                                    top: node.y - NODE_HEIGHT / 2,
                                                    width: NODE_WIDTH,
                                                    height: NODE_HEIGHT,
                                                    textAlign: 'center',
                                                }}
                                                whileHover={{ scale: 1.1, zIndex: 10 }}
                                                initial={{ opacity: 0, scale: 0.5 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ duration: 0.3 }}
                                                onDoubleClick={() => handleNodeClick(node)}
                                            >
                                                <span className="truncate">{node.label}</span>
                                                {node.isPlaceholder && (
                                                     <AlertDialogTrigger asChild>
                                                          <button className="absolute -top-2 -right-2 bg-accent text-accent-foreground rounded-full p-0.5 h-4 w-4 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                                                             <Plus className="h-3 w-3" />
                                                         </button>
                                                     </AlertDialogTrigger>
                                                )}
                                            </motion.div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{node.isPlaceholder ? "Click the '+' to create this item" : "Double-click to open"}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Create New {node.type === 'subject' ? 'Subject' : 'Note'}?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will add "{node.label}" to your collection. You can add content to it later.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => createPlaceholderNode(node)}>Create</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        ))}
                        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground p-1 bg-background/50 rounded">
                            Double-click a node to open it.
                        </div>
                    </div>
                 )}
            </Card>
        </div>
    );
}
