
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
const NODE_WIDTH = 150;
const NODE_HEIGHT = 40;
const HORIZONTAL_SPACING = 20;
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

export function SkillTreeView() {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [topic, setTopic] = useState('');
    const { user, firestore } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();
    
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
            setNodes([]);
            setEdges([]);
        } finally {
            setIsGenerating(false);
        }
    };

    const createPlaceholderNode = async (node: Node) => {
        if (!user || !firestore) return;

        if ((node.type === 'subject' || node.type === 'key-concept' || node.type === 'main-idea') && node.isPlaceholder) {
            const subjectsCollectionRef = collection(firestore, 'users', user.uid, 'subjects');
            try {
                const newDocRef = await addDoc(subjectsCollectionRef, {
                    name: node.label,
                    description: `AI-generated subject for topic: ${topic}`,
                    isImportant: false,
                    createdAt: serverTimestamp(),
                    lastUpdated: serverTimestamp(),
                });
                toast({ title: "Subject Created!", description: `You can now find "${node.label}" in your subjects list.`});
                
                // Optimistically update the node to not be a placeholder and navigate
                const updatedNodes = nodes.map(n => n.id === node.id ? { ...n, isPlaceholder: false, subjectId: newDocRef.id, type: 'subject' as const } : n);
                setNodes(updatedNodes);

                router.push(`/dashboard/notes/${newDocRef.id}`);

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

        if (node.type === 'subject' && node.id.startsWith('subject-')) {
             router.push(`/dashboard/notes/${node.id.replace('subject-','')}`);
        } 
        else if (node.type === 'key-concept' || node.type === 'main-idea' || node.type === 'detail') {
            handleGenerateTree(node.label);
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
                 {isGenerating && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20">
                         <Loader className="animate-spin text-primary" />
                         <p className="ml-2">Generating skill tree...</p>
                    </div>
                )}
                 {!isGenerating && nodes.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <Network className="w-16 h-16 text-muted-foreground/50" />
                        <h3 className="mt-4 text-lg font-semibold">The canvas is ready</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Enter a topic above to generate a new skill tree.</p>
                    </div>
                 )}
                 {nodes.length > 0 && (
                    <div className='relative w-full h-full'>
                         <motion.div
                            className="relative"
                            drag
                            dragConstraints={{ left: -VIEW_WIDTH / 2, right: VIEW_WIDTH / 2, top: -VIEW_HEIGHT / 2, bottom: VIEW_HEIGHT / 2 }}
                         >
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
                                            strokeWidth="1.5"
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
                        </motion.div>
                        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground p-1 bg-background/50 rounded">
                           Double-click to expand/navigate. Drag to pan.
                        </div>
                    </div>
                 )}
            </Card>
        </div>
    );
}

    

    

