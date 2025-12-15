
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card } from './ui/card';
import { Loader, Network, Wand2, Plus } from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
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
    itemType?: string;
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
const NODE_HEIGHT = 40;
const HORIZONTAL_SPACING = 20;
const VERTICAL_SPACING = 60;


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
    
    // Position nodes recursively
    const positionNodes = (node: Node, y: number) => {
        node.y = y;
        node.children?.forEach(child => {
            positionNodes(child, y + NODE_HEIGHT + VERTICAL_SPACING);
        });
    };
    positionNodes(keyConcept, 50);

    // Calculate widths from bottom up
    const calculateWidths = (node: Node) => {
        if (!node.children || node.children.length === 0) {
            node.width = NODE_WIDTH;
            return;
        }
        let childrenWidth = 0;
        node.children.forEach(child => {
            calculateWidths(child);
            childrenWidth += child.width || 0;
        });
        node.width = Math.max(NODE_WIDTH, childrenWidth + (node.children.length - 1) * HORIZONTAL_SPACING);
    };
    calculateWidths(keyConcept);

    // Position X from top down
    const positionX = (node: Node, x: number) => {
        node.x = x + ((node.width || NODE_WIDTH) - NODE_WIDTH) / 2;
        
        if (node.children && node.children.length > 0) {
            let currentX = x;
            node.children.forEach(child => {
                positionX(child, currentX);
                currentX += (child.width || 0) + HORIZONTAL_SPACING;
            });
        }
    };
    positionX(keyConcept, (VIEW_WIDTH - (keyConcept.width || 0)) / 2);

    return { finalNodes: Object.values(nodesMap), finalEdges: aiEdges };
};

const SubjectNotes = ({ subject, onNotesLoaded }: { subject: any; onNotesLoaded: (subjectId: string, notes: any[]) => void }) => {
    const { user, firestore } = useFirebase();
    
    // Fetch notes for the given subject
    const notesCollectionRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return collection(firestore, 'users', user.uid, 'subjects', subject.id, 'notes');
    }, [user, firestore, subject.id]);

    const { data: notes, isLoading: areNotesLoading } = useCollection(notesCollectionRef);
    
    // Fetch exam questions
    const examQuestionsCollectionRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return collection(firestore, 'users', user.uid, 'subjects', subject.id, 'examQuestions');
    }, [user, firestore, subject.id]);

    const { data: examQuestions, isLoading: areExamQuestionsLoading } = useCollection(examQuestionsCollectionRef);

    // Fetch syllabus items
    const syllabusCollectionRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return collection(firestore, 'users', user.uid, 'subjects', subject.id, 'syllabus');
    }, [user, firestore, subject.id]);

    const { data: syllabus, isLoading: isSyllabusLoading } = useCollection(syllabusCollectionRef);

    // Fetch resources
    const resourcesCollectionRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return collection(firestore, 'users', user.uid, 'subjects', subject.id, 'resources');
    }, [user, firestore, subject.id]);

    const { data: resources, isLoading: areResourcesLoading } = useCollection(resourcesCollectionRef);

    useEffect(() => {
        if (!areNotesLoading && !areExamQuestionsLoading && !isSyllabusLoading && !areResourcesLoading) {
            const allItems = [
                ...(notes || []).map(item => ({ ...item, itemType: 'notes' })),
                ...(examQuestions || []).map(item => ({ ...item, itemType: 'examQuestions' })),
                ...(syllabus || []).map(item => ({ ...item, itemType: 'syllabus' })),
                ...(resources || []).map(item => ({ ...item, itemType: 'resources' })),
            ];
            onNotesLoaded(subject.id, allItems);
        }
    }, [
        notes, areNotesLoading,
        examQuestions, areExamQuestionsLoading,
        syllabus, isSyllabusLoading,
        resources, areResourcesLoading,
        subject.id, onNotesLoaded
    ]);

    return null; // This component does not render anything itself
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
    const [allNotes, setAllNotes] = useState<{[key: string]: any[]}>({});
    const [subjectsWithNotes, setSubjectsWithNotes] = useState<Set<string>>(new Set());

    const handleNotesLoaded = React.useCallback((subjectId: string, notes: any[]) => {
        setAllNotes(prevNotes => ({
            ...prevNotes,
            [subjectId]: notes,
        }));
        setSubjectsWithNotes(prev => new Set(prev).add(subjectId));
    }, []);

    const layoutNodes = (subjectsToLayout: any[], notesData: {[key: string]: any[]}) => {
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
                x: x,
                y: y,
                isImportant: subject.isImportant,
                isPlaceholder: subject.isPlaceholder,
            });

             const relatedNotes = notesData[subject.id] || [];

            relatedNotes.forEach((note, noteIndex) => {
                const noteId = `note-${note.id}`;
                newNodes.push({
                    id: noteId,
                    label: note.title,
                    type: 'note',
                    x: x + 100 + (noteIndex % 3) * 30,
                    y: y - 30 + (noteIndex * 25),
                    subjectId: subject.id,
                    isImportant: note.isImportant || false,
                    isPlaceholder: note.isPlaceholder,
                    itemType: note.itemType,
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
    
    useEffect(() => {
        if (!subjects) return;

        if (subjects.length === 0) {
            setIsInitialLoading(false);
            setNodes([]);
            setEdges([]);
            return;
        }

        const allSubjectsAreLoaded = subjects.every(s => subjectsWithNotes.has(s.id));

        if(allSubjectsAreLoaded) {
            const { newNodes, newEdges } = layoutNodes(subjects, allNotes);
            setNodes(newNodes);
            setEdges(newEdges);
            setIsInitialLoading(false);
        }
    }, [subjects, allNotes, subjectsWithNotes]);


    const handleGenerateTree = async (newTopic: string) => {
        if (!newTopic) return;
        setIsGenerating(true);
        setNodes([]);
        setEdges([]);

        try {
            const result: GenerateSkillTreeOutput = await generateSkillTreeFromTopic({ topic: newTopic });
            
            const { finalNodes, finalEdges } = layoutHierarchical(result.nodes, result.edges);
            
            setNodes(finalNodes);
            setEdges(finalEdges);
            setTopic(newTopic);

        } catch (error) {
            console.error("Failed to generate skill tree:", error);
            toast({
                title: "Generation Failed",
                description: "The AI could not generate a skill tree for this topic.",
                variant: "destructive"
            });
            const { newNodes, newEdges } = layoutNodes(subjects, allNotes);
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
                setNodes(nodes.map(n => n.id === node.id ? { ...n, isPlaceholder: false } : n));
            } catch (error) {
                 toast({ title: "Error", description: "Could not create subject.", variant: "destructive"});
            }
        }
        else if(node.type === 'note' || node.type === 'detail') {
             toast({ title: "Info", description: "Create the parent subject first before adding notes.", variant: 'default' });
        }
    }


    const handleNodeDoubleClick = (node: Node) => {
        if (node.isPlaceholder) {
            return;
        }
        if (node.type === 'subject' || node.type === 'key-concept' || node.type === 'main-idea' || node.type === 'detail') {
            const subject = subjects.find(s => s.name === node.label);
            if(subject) {
                 router.push(`/dashboard/notes/${subject.id}`);
            } else {
                handleGenerateTree(node.label);
            }
        } 
        else if (node.type === 'note' && node.subjectId && node.itemType) {
             const noteId = node.id.startsWith('note-') ? node.id.replace('note-','') : node.id;
             router.push(`/dashboard/notes/${node.subjectId}/${node.itemType}/${noteId}`);
        }
    }
    
    const getNodeStyles = (nodeType: Node['type']) => {
        switch (nodeType) {
            case 'key-concept':
                return 'bg-primary text-primary-foreground border-primary-foreground/50';
            case 'main-idea':
                return 'bg-accent text-accent-foreground border-accent-foreground/50';
            case 'detail':
                return 'bg-secondary text-secondary-foreground border-border';
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
                    placeholder="Search a topic or ask a question..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateTree(topic)}
                    className="flex-grow"
                />
                <Button onClick={() => handleGenerateTree(topic)} disabled={isGenerating || !topic} className="w-full sm:w-auto">
                    {isGenerating ? <Loader className="animate-spin mr-2" /> : <Wand2 className="mr-2" />}
                    Generate
                </Button>
            </div>
            <Card className="h-[800px] w-full glass-pane overflow-auto relative">
                {subjects.map(subject => (
                    <SubjectNotes key={subject.id} subject={subject} onNotesLoaded={handleNotesLoaded} />
                ))}
                 {isGenerating && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20">
                         <Loader className="animate-spin text-primary" />
                         <p className="ml-2">Generating skill tree...</p>
                    </div>
                )}
                 {!isGenerating && nodes.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 glass-pane border-dashed">
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
                                        x1={sourceNode.x + NODE_WIDTH / 2}
                                        y1={sourceNode.y + NODE_HEIGHT}
                                        x2={targetNode.x + NODE_WIDTH / 2}
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
                                                    left: node.x,
                                                    top: node.y,
                                                    width: NODE_WIDTH,
                                                    height: NODE_HEIGHT,
                                                    textAlign: 'center',
                                                }}
                                                whileHover={{ scale: 1.1, zIndex: 10 }}
                                                initial={{ opacity: 0, scale: 0.5 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ duration: 0.3 }}
                                                onDoubleClick={() => handleNodeDoubleClick(node)}
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
                                            <p className="text-xs">Double-click to expand/navigate.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Create New Item?</AlertDialogTitle>
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
                           Double-click to expand/navigate.
                        </div>
                    </div>
                 )}
            </Card>
        </div>
    );
}

    

    