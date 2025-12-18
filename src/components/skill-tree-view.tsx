

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader, Send, ZoomIn, ZoomOut, Save, BookOpen, Library, CheckSquare, Square } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { generateSkillTreeAction, explainTopicAction, getShortDefinitionAction } from '@/actions/generation';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatView } from './chat-view';
import type { Message } from './chat-view';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SaveNoteDialog } from '@/components/save-note-dialog';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';


// Type definitions for the skill tree
interface Node {
  id: string;
  label: string;
  type: 'root' | 'pillar' | 'concept' | 'detail' | 'sub-detail';
  children?: Node[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  definition?: string;
}

interface Edge {
  source: string;
  target: string;
  path: string;
}

const nodeDimensions = {
  root: { width: 200, height: 70 },
  pillar: { width: 180, height: 60 },
  concept: { width: 160, height: 52 },
  detail: { width: 150, height: 48 },
  'sub-detail': { width: 140, height: 44 },
};

const nodeColors = {
    root: 'bg-primary/20 border-primary text-primary-foreground',
    pillar: 'bg-accent/20 border-accent text-accent-foreground',
    concept: 'bg-secondary border-border text-foreground',
    detail: 'bg-muted/50 border-border text-muted-foreground',
    'sub-detail': 'bg-muted/30 border-border text-muted-foreground',
};


const calculateLayout = (tree: Node | null): { nodes: Node[]; edges: Edge[] } => {
    if (!tree) return { nodes: [], edges: [] };

    // Deep copy to prevent state mutation
    const safeTree = JSON.parse(JSON.stringify(tree));

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let yOffset = 0;
    const xSpacing = 220; // Increased spacing for new node style
    const ySpacing = 120; // Increased spacing

    function traverse(node: Node, depth = 0, parent?: Node) {
        // *** THE FIX ***: This guard clause prevents the function from crashing if the AI returns a null child.
        if (!node) {
            return;
        }
        
        const { width, height } = nodeDimensions[node.type] || nodeDimensions.detail;
        node.width = width;
        node.height = height;
        node.x = depth * xSpacing;
        node.y = yOffset;

        nodes.push(node);

        if (parent) {
             const startX = parent.x! + parent.width!;
             const startY = parent.y! + parent.height! / 2;
             const endX = node.x!;
             const endY = node.y! + node.height! / 2;
             
             const path = `M ${startX},${startY} L ${startX + xSpacing / 2},${startY} L ${startX + xSpacing / 2},${endY} L ${endX},${endY}`;

             edges.push({
                 source: parent.id,
                 target: node.id,
                 path: path
             });
        }

        const childrenCount = node.children?.length || 0;
        const initialYOffset = yOffset;

        if (childrenCount > 0) {
             node.children!.filter(Boolean).forEach((child, index) => {
                 if (index > 0) {
                    yOffset += ySpacing;
                 }
                traverse(child, depth + 1, node);
            });
             if (childrenCount > 1) {
                const lastChild = nodes[nodes.length - 1];
                const newParentY = (initialYOffset + lastChild.y!) / 2;
                node.y = newParentY;
            }
        }
    }

    traverse(safeTree);
    return { nodes, edges };
};


export function SkillTreeView() {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tree, setTree] = useState<Node | null>(null);
  const [{ nodes, edges }, setLayout] = useState<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const { toast } = useToast();
  const [zoom, setZoom] = useState(1);
  const [viewBox, setViewBox] = useState('0 0 1000 800');
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSaveNoteDialogOpen, setIsSaveNoteDialogOpen] = useState(false);

  useEffect(() => {
    if (tree) {
      const { nodes: newNodes, edges: newEdges } = calculateLayout(tree);
      setLayout({ nodes: newNodes, edges: newEdges });

      if (newNodes.length > 0) {
        const minX = Math.min(...newNodes.map(n => n.x!));
        const minY = Math.min(...newNodes.map(n => n.y!));
        const maxX = Math.max(...newNodes.map(n => n.x! + n.width!));
        const maxY = Math.max(...newNodes.map(n => n.y! + n.height!));
        const width = maxX - minX + 200;
        const height = maxY - minY + 200;
        setViewBox(`${minX - 100} ${minY - 100} ${width} ${height}`);
      }
    }
  }, [tree]);

  const handleGenerate = async () => {
    if (!topic) return;
    setIsLoading(true);
    setTree(null);
    setLayout({ nodes: [], edges: [] });
    setActiveNodeId(null);
    setSelectedIds(new Set());
    try {
      const result = await generateSkillTreeAction({ topic });
      if (result && result.tree) {
        setTree(result.tree);
        setActiveNodeId(result.tree.id);
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to generate skill tree',
          description: 'The AI model did not return a valid tree structure. Please try again.',
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'An error occurred',
        description: 'Could not generate the skill tree.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
    const handleNodeClick = (nodeId: string) => {
        setActiveNodeId(nodeId);
    };
    
    const handleNodeToggle = (nodeId: string, isChecked: boolean) => {
        const newSelectedIds = new Set(selectedIds);
        if (isChecked) {
            newSelectedIds.add(nodeId);
        } else {
            newSelectedIds.delete(nodeId);
        }
        setSelectedIds(newSelectedIds);
    };

    const handleSelectAll = (isChecked: boolean) => {
        if (isChecked) {
            const allIds = new Set(nodes.map(n => n.id));
            setSelectedIds(allIds);
        } else {
            setSelectedIds(new Set());
        }
    };
  
    const treeToMarkdown = useCallback(() => {
        if (!tree) return '';
    
        const isAllSelected = selectedIds.size === nodes.length && nodes.length > 0;
    
        const buildMarkdown = (node: Node, depth = 0): string => {
            if (!node || !selectedIds.has(node.id)) return '';
    
            let markdown = `${'#'.repeat(depth + 1)} ${node.label}\n`;
            const fullNode = nodes.find(n => n.id === node.id);
    
            if (fullNode?.definition) {
                markdown += `> ${fullNode.definition}\n\n`;
            }
    
            if (node.children) {
                const childrenMarkdown = node.children
                    .map(child => buildMarkdown(child, depth + 1))
                    .filter(Boolean)
                    .join('');
                markdown += childrenMarkdown;
            }
    
            return markdown;
        };
    
        if (isAllSelected) {
            return buildMarkdown(tree);
        } else {
            let markdown = '';
            for (const id of selectedIds) {
                const node = nodes.find(n => n.id === id);
                if (node) {
                    markdown += `- **${node.label}**: ${node.definition || 'No definition available.'}\n`;
                }
            }
            return markdown;
        }
    }, [tree, selectedIds, nodes]);
  

  return (
    <div className="flex flex-col h-full gap-4">
      <Card className="glass-pane">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Enter a topic to generate a skill tree (e.g., 'React Hooks')"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            disabled={isLoading}
          />
          <Button onClick={handleGenerate} disabled={isLoading || !topic} className="w-full sm:w-auto">
            {isLoading ? <Loader className="animate-spin" /> : <Send />}
            <span className="ml-2">Generate</span>
          </Button>
        </CardContent>
      </Card>
      
      <div className="flex-grow relative bg-background/50 rounded-lg border overflow-hidden">
        {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
                <Loader className="animate-spin h-10 w-10 text-accent"/>
            </div>
        )}
        {!tree && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground z-10">
                <p>Your skill tree will appear here.</p>
            </div>
        )}
        {tree && (
            <>
                <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
                    <div className="flex items-center space-x-2 bg-card/80 p-2 rounded-md">
                        <Checkbox id="select-all" onCheckedChange={handleSelectAll} />
                        <Label htmlFor="select-all">Select All</Label>
                    </div>
                    <Button variant="glow" size="sm" onClick={() => setIsSaveNoteDialogOpen(true)} disabled={selectedIds.size === 0}>
                        <Save className="mr-2 h-4 w-4" /> Save to Note
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setZoom(z => z * 1.2)}><ZoomIn/></Button>
                    <Button variant="outline" size="icon" onClick={() => setZoom(z => z / 1.2)}><ZoomOut/></Button>
                </div>
                 <svg ref={svgRef} className="w-full h-full" viewBox={viewBox}>
                    <g transform={`scale(${zoom})`}>
                       {edges.map(edge => (
                           <path
                                key={`${edge.source}-${edge.target}`}
                                d={edge.path}
                                fill="none"
                                stroke={activeNodeId === edge.source || activeNodeId === edge.target ? 'hsl(var(--accent))' : 'hsl(var(--border))'}
                                strokeWidth={activeNodeId === edge.source || activeNodeId === edge.target ? 2 : 1}
                                className={cn("transition-all", (activeNodeId === edge.source || activeNodeId === edge.target) && "stroke-accent animate-pulse")}
                            />
                       ))}
                       {nodes.map(node => (
                           <Popover key={node.id}>
                            <PopoverTrigger asChild>
                               <foreignObject x={node.x} y={node.y} width={node.width} height={node.height} className="overflow-visible">
                                 <motion.div
                                     initial={{ opacity: 0, scale: 0.8 }}
                                     animate={{ opacity: 1, scale: 1 }}
                                     onClick={() => handleNodeClick(node.id)}
                                     className={cn(
                                         'flex flex-col justify-center items-center p-2 rounded-md h-full w-full cursor-pointer transition-all',
                                         nodeColors[node.type],
                                         activeNodeId === node.id && 'shadow-lg shadow-accent/50'
                                     )}
                                 >
                                     <p className="font-bold text-center text-sm leading-tight">{node.label}</p>
                                     <p className="text-xs opacity-70 capitalize">{node.type}</p>
                                 </motion.div>
                               </foreignObject>
                            </PopoverTrigger>
                             <PopoverContent className="w-80 glass-pane">
                                 <div className="space-y-4">
                                     <div className="space-y-1">
                                        <h4 className="font-medium leading-none">{node.label}</h4>
                                        <p className="text-sm text-muted-foreground">{node.definition || 'Click the button to get a definition.'}</p>
                                     </div>
                                     <div className="flex items-center justify-between">
                                        <Button 
                                            variant="outline" size="sm" 
                                            onClick={async () => {
                                                if (node.definition) return;
                                                toast({ title: "Getting definition..." });
                                                const res = await getShortDefinitionAction({ topic: node.label, context: tree.label });
                                                setNodes(currentNodes => currentNodes.map(n => n.id === node.id ? { ...n, definition: res.definition } : n));
                                            }}
                                            disabled={!!node.definition}
                                        >
                                           <BookOpen className="mr-2"/> Get Definition
                                        </Button>
                                         <div className="flex items-center space-x-2">
                                             <Checkbox
                                                 id={`check-${node.id}`}
                                                 checked={selectedIds.has(node.id)}
                                                 onCheckedChange={(checked) => handleNodeToggle(node.id, !!checked)}
                                             />
                                             <Label htmlFor={`check-${node.id}`}>Select</Label>
                                         </div>
                                     </div>
                                 </div>
                             </PopoverContent>
                           </Popover>
                       ))}
                    </g>
                </svg>
            </>
        )}
      </div>

       <SaveNoteDialog 
        isOpen={isSaveNoteDialogOpen}
        onOpenChange={setIsSaveNoteDialogOpen}
        initialTitle={topic}
        noteContent={treeToMarkdown()}
      />
    </div>
  );
}

function NormalChat() {
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const { toast } = useToast();
    const [isSaveNoteDialogOpen, setIsSaveNoteDialogOpen] = useState(false);

    const handleSendMessage = async () => {
        if (!input.trim()) return;
        const userMessage: Message = { role: 'user', content: input };
        const newMessages: Message[] = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);
    
        try {
            // Ensure history alternates between user and model
            const history = newMessages.slice(0, -1).reduce((acc, msg, i) => {
                // If it's the first message, or different from the last role, add it
                if (i === 0 || msg.role !== acc[acc.length - 1]?.role) {
                    acc.push(msg);
                }
                return acc;
            }, [] as Message[]);
    
            const result = await explainTopicAction({ topic: input, history: history });
            setMessages([...newMessages, { role: 'model', content: result.response }]);
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'An error occurred',
                description: 'Could not get a response from the AI.',
            });
            // Restore user input on failure
            setInput(input);
            setMessages(messages);
        } finally {
            setIsLoading(false);
        }
    };
    
    const chatToMarkdown = () => {
        return messages.map(msg => `**${msg.role === 'user' ? 'You' : 'AI'}:**\n\n${msg.content.replace(/<[^>]+>/g, '')}\n\n---\n\n`).join('');
    };

    return (
        <div className="h-full flex flex-col">
            <Card className="glass-pane flex-grow flex flex-col">
                 <CardHeader className="flex-row items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold font-headline">Normal Chat</h2>
                        <p className="text-sm text-muted-foreground">Ask the AI anything.</p>
                    </div>
                     <Button variant="outline" size="sm" onClick={() => setIsSaveNoteDialogOpen(true)} disabled={messages.length === 0}>
                        <Save className="mr-2"/> Save Chat
                    </Button>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col-reverse overflow-hidden p-0">
                    <div className="p-4 border-t">
                        <div className="relative">
                            <Input
                                placeholder="Type your message..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                disabled={isLoading}
                                className="pr-12"
                            />
                            <Button
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                onClick={handleSendMessage}
                                disabled={isLoading || !input.trim()}
                            >
                                <Send />
                            </Button>
                        </div>
                    </div>
                   <ChatView messages={messages} isLoading={isLoading} />
                </CardContent>
            </Card>
             <SaveNoteDialog
                isOpen={isSaveNoteDialogOpen}
                onOpenChange={setIsSaveNoteDialogOpen}
                initialTitle={`Chat on ${new Date().toLocaleDateString()}`}
                noteContent={chatToMarkdown()}
            />
        </div>
    );
}

// Main component is just a wrapper for the tabs now
export default function SkillTreePage() {
    return (
        <Tabs defaultValue="skill-tree" className="h-full flex flex-col">
             <TabsList>
                <TabsTrigger value="skill-tree">Skill Tree</TabsTrigger>
                <TabsTrigger value="normal-chat">Normal Chat</TabsTrigger>
            </TabsList>
            <TabsContent value="skill-tree" className="mt-6 flex-grow">
                <SkillTreeView />
            </TabsContent>
            <TabsContent value="normal-chat" className="mt-6 flex-grow">
                <NormalChat />
            </TabsContent>
        </Tabs>
    );
}

