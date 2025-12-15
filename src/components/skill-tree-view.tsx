
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Card } from './ui/card';
import { Loader, Network, Wand2, Plus, Save } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { generateSkillTreeAction, explainTopicAction } from '@/actions/generation';
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { SaveSkillTreeDialog } from './save-skill-tree-dialog';
import { isToday } from 'date-fns';


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
    
    const [explanations, setExplanations] = useState<Record<string, string>>({});
    const [explainingNode, setExplainingNode] = useState<string | null>(null);
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc(userProfileRef);

    const freePlanConfigRef = useMemoFirebase(() => doc(firestore, 'plan_configs', 'free'), [firestore]);
    const { data: freePlanConfig } = useDoc(freePlanConfigRef);

    const premiumPlanConfigRef = useMemoFirebase(() => doc(firestore, 'plan_configs', 'premium'), [firestore]);
    const { data: premiumPlanConfig } = useDoc(premiumPlanConfigRef);

    const handleGenerateTree = async (newTopic: string) => {
        if (!newTopic || !user) return;

        const planConfig = userProfile?.plan === 'Premium' ? premiumPlanConfig : freePlanConfig;
        const limit = planConfig?.dailySkillTreeLimit ?? 0;
        
        const lastGenDate = userProfile?.lastGenerationDate ? new Date(userProfile.lastGenerationDate) : null;
        const generationsToday = lastGenDate && isToday(lastGenDate) ? userProfile?.skillTreeGenerations || 0 : 0;
        
        if (limit !== -1 && generationsToday >= limit) {
             toast({
                variant: "destructive",
                title: "Daily Limit Reached",
                description: `You have reached your daily limit of ${limit} skill tree generations. Upgrade to premium for unlimited access.`,
            });
            return;
        }

        setIsGenerating(true);
        setNodes([]);
        setEdges([]);
        setExplanations({});

        try {
            const result: GenerateSkillTreeOutput = await generateSkillTreeAction({ topic: newTopic });
            
            const { finalNodes, finalEdges } = layoutHierarchical(result.nodes, result.edges);
            
            setNodes(finalNodes);
            setEdges(finalEdges);
            setTopic(newTopic);

            // Update user's generation count
             if (userProfileRef) {
                const updates: any = {
                    lastGenerationDate: new Date().toISOString(),
                };
                if (lastGenDate && isToday(lastGenDate)) {
                    updates.skillTreeGenerations = increment(1);
                } else {
                    updates.skillTreeGenerations = 1;
                }
                await updateDoc(userProfileRef, updates);
            }


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

    const handleNodeClick = useCallback(async (node: Node) => {
        if (explanations[node.id]) {
            // Explanation already exists, do nothing
            return;
        }

        setExplainingNode(node.id);
        try {
            const result = await explainTopicAction({ topic: node.label });
            setExplanations(prev => ({ ...prev, [node.id]: result.explanation }));
        } catch (error) {
            console.error("Failed to get explanation:", error);
            setExplanations(prev => ({ ...prev, [node.id]: 'Could not load explanation.' }));
        } finally {
            setExplainingNode(null);
        }
    }, [explanations]);


    const handleNodeDoubleClick = (node: Node) => {
        if (node.isPlaceholder) {
            return;
        }
        handleGenerateTree(node.label);
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
    
    const renderGenerationCredits = () => {
        if (!userProfile) return null;

        const planConfig = userProfile.plan === 'Premium' ? premiumPlanConfig : freePlanConfig;
        const limit = planConfig?.dailySkillTreeLimit;

        if (limit === undefined) return null;
        if (limit === -1) return <div className="text-xs text-muted-foreground">Unlimited Generations</div>;

        const lastGenDate = userProfile.lastGenerationDate ? new Date(userProfile.lastGenerationDate) : null;
        const generationsToday = lastGenDate && isToday(lastGenDate) ? userProfile.skillTreeGenerations || 0 : 0;
        const remaining = Math.max(0, limit - generationsToday);

        return (
            <div className="text-xs text-muted-foreground">
                Daily Credits: {remaining} / {limit}
            </div>
        )
    }

    return (
        <div className="space-y-4">
             <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-grow">
                    <Input
                        type="text"
                        placeholder="Search a topic or ask a question..."
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerateTree(topic)}
                    />
                     {renderGenerationCredits()}
                </div>
                <Button onClick={() => handleGenerateTree(topic)} disabled={isGenerating || !topic} className="w-full sm:w-auto">
                    {isGenerating ? <Loader className="animate-spin mr-2" /> : <Wand2 className="mr-2" />}
                    Generate
                </Button>
                {nodes.length > 0 && (
                    <Button variant="outline" onClick={() => setIsSaveDialogOpen(true)}>
                        <Save className="mr-2 h-4 w-4" />
                        Save to Note
                    </Button>
                )}
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
                                     <Popover>
                                        <PopoverTrigger asChild>
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
                                                onClick={() => handleNodeClick(node)}
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
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80 glass-pane" side="bottom" align="center">
                                            {explainingNode === node.id && <Loader className="animate-spin" />}
                                            {explanations[node.id] && (
                                                <div className="space-y-2">
                                                     <h4 className="font-medium leading-none">{node.label}</h4>
                                                     <p className="text-sm text-muted-foreground">
                                                         {explanations[node.id]}
                                                     </p>
                                                </div>
                                            )}
                                            {!explanations[node.id] && explainingNode !== node.id && (
                                                 <p className="text-sm text-muted-foreground">Click to get an explanation.</p>
                                            )}
                                        </PopoverContent>
                                    </Popover>
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
                           Double-click to expand topic. Drag to pan. Click for definition.
                        </div>
                    </div>
                 )}
            </Card>
            {nodes.length > 0 && (
                <SaveSkillTreeDialog 
                    isOpen={isSaveDialogOpen}
                    onOpenChange={setIsSaveDialogOpen}
                    topic={topic}
                    nodes={nodes}
                    edges={edges}
                    explanations={explanations}
                />
            )}
        </div>
    );
}

    