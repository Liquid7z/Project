

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader, Send, ZoomIn, ZoomOut, ArrowRight, Save, BookOpen, Library } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { generateSkillTreeAction, explainTopicAction, getShortDefinitionAction } from '@/actions/generation';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatView } from './chat-view';
import type { Message } from './chat-view';
import { marked } from 'marked';
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
}

const nodeDimensions = {
  root: { width: 160, height: 40 },
  pillar: { width: 150, height: 36 },
  concept: { width: 140, height: 32 },
  detail: { width: 130, height: 28 },
  'sub-detail': { width: 120, height: 28 },
};

const nodeStyles = {
    root: 'bg-primary text-primary-foreground font-bold text-sm',
    pillar: 'bg-accent text-accent-foreground font-semibold text-sm',
    concept: 'bg-secondary text-secondary-foreground text-xs',
    detail: 'bg-muted text-muted-foreground text-xs border-dashed',
    'sub-detail': 'bg-muted/50 text-muted-foreground text-xs border-dashed',
};

const calculateLayout = (node: Node, x = 0, y = 0, depth = 0): { nodes: Node[]; edges: Edge[] } => {
    let nodes: Node[] = [];
    let edges: Edge[] = [];
    const yGap = 80;
    const xGap = 180;

    if (!node) {
        return { nodes, edges };
    }
    
    const validChildren = node.children?.filter(Boolean) ?? [];

    const { width, height } = nodeDimensions[node.type] || nodeDimensions.detail;
    node.width = width;
    node.height = height;
    
    nodes.push(node);

    if (validChildren.length > 0) {
        const totalChildWidth = validChildren.reduce((acc, child) => {
            const childDims = nodeDimensions[child.type] || nodeDimensions.detail;
            return acc + childDims.width + xGap;
        }, -xGap);

        let currentX = x + width / 2 - totalChildWidth / 2;

        validChildren.forEach((child) => {
            edges.push({ source: node.id, target: child.id });
            const { nodes: childNodes, edges: childEdges } = calculateLayout(
                child,
                currentX,
                y + yGap,
                depth + 1
            );
            nodes = nodes.concat(childNodes);
            edges = edges.concat(childEdges);
            currentX += (nodeDimensions[child.type] || nodeDimensions.detail).width + xGap;
        });

        const firstChild = nodes.find(n => n.id === validChildren[0].id);
        const lastChild = nodes.find(n => n.id === validChildren[validChildren.length - 1].id);
        
        if(firstChild && lastChild && firstChild.x !== undefined && lastChild.x !== undefined && lastChild.width !== undefined) {
             const childrenMidpoint = (firstChild.x + (lastChild.x + lastChild.width) ) / 2;
             node.x = childrenMidpoint - width / 2;
        } else {
           node.x = x;
        }

    } else {
        node.x = x;
    }
    node.y = y;

    return { nodes, edges };
};


const getAllNodeIds = (node: Node | null): string[] => {
    if (!node) return [];
    let ids = [node.id];
    if (node.children) {
        node.children.forEach(child => {
            if (child) { // Check if child is not null
                ids = ids.concat(getAllNodeIds(child));
            }
        });
    }
    return ids;
}


function deepCopy<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    // A more robust deep copy to avoid the state mutation issues.
    return JSON.parse(JSON.stringify(obj));
}

function chatToMarkdown(messages: Message[]): string {
    return messages.map(msg => `**${msg.role === 'user' ? 'You' : 'AI'}:**\n${msg.content.replace(/<[^>]+>/g, '\n')}`).join('\n\n---\n\n');
}


export function SkillTreeView() {
  const [topic, setTopic] = useState('');
  const [currentTopic, setCurrentTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tree, setTree] = useState<Node | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [viewWidth, setViewWidth] = useState(0);
  const [viewHeight, setViewHeight] = useState(0);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const [activeTab, setActiveTab] = useState('tree');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isSaveNoteDialogOpen, setIsSaveNoteDialogOpen] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());


  const pinchStartDistance = useRef<number | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setViewWidth(width);
        if (height > 0) setViewHeight(height);
      }
    });

    if (viewRef.current) {
      observer.observe(viewRef.current);
    }

    return () => {
      if (viewRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        observer.unobserve(viewRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isChatLoading]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ variant: 'destructive', title: 'Topic is empty', description: 'Please enter a topic to generate a skill tree.' });
      return;
    }
    setIsLoading(true);
    setTree(null);
    setNodes([]);
    setEdges([]);
    setMessages([]);
    setCurrentTopic(topic);
    setSelectedNodes(new Set());
    try {
      const result = await generateSkillTreeAction({ topic });
      if (result && result.tree) {
        const treeCopy = deepCopy(result.tree);
        setTree(result.tree); // Keep original state pure
        const { nodes: layoutNodes, edges: layoutEdges } = calculateLayout(treeCopy);
        
        const xs = layoutNodes.map(n => n.x ?? 0);
        const ys = layoutNodes.map(n => n.y ?? 0);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs) + (nodeDimensions.detail.width);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys) + (nodeDimensions.detail.height);

        const treeWidth = maxX - minX;
        const treeHeight = maxY - minY;
        
        let initialScale = 1;
        if (viewHeight > 0 && treeHeight > 0 && viewWidth > 0 && treeWidth > 0) {
            initialScale = Math.min(viewWidth / (treeWidth + 100), viewHeight / (treeHeight + 100));
        }

        if (!isFinite(initialScale) || initialScale <= 0) {
            initialScale = 1;
        }

        setScale(initialScale);
        
        setOffset({
            x: (viewWidth - treeWidth * initialScale) / 2 - minX * initialScale,
            y: 50
        });

        setNodes(layoutNodes);
        setEdges(layoutEdges);

      } else {
        toast({ variant: 'destructive', title: 'Generation Failed', description: 'The AI failed to generate a skill tree for this topic.' });
      }
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'An error occurred', description: 'Could not generate the skill tree.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchDefinition = async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || node.definition) return;

    try {
        const result = await getShortDefinitionAction({ topic: node.label, context: currentTopic });
        setNodes(prevNodes => prevNodes.map(n => 
            n.id === nodeId ? { ...n, definition: result.definition } : n
        ));
    } catch (error) {
        console.error('Failed to fetch definition:', error);
    }
  };

  const handleNodeToggle = (nodeId: string, checked: boolean) => {
    setSelectedNodes(prevSelected => {
        const newSelected = new Set(prevSelected);
        if (checked) {
            newSelected.add(nodeId);
        } else {
            newSelected.delete(nodeId);
        }
        return newSelected;
    });
  };
  
  const findNode = (node: Node, id: string): Node | null => {
    if (node.id === id) return node;
    if (node.children) {
        for (const child of node.children) {
            if (child) {
                const found = findNode(child, id);
                if (found) return found;
            }
        }
    }
    return null;
  }

  const handleSelectAllToggle = (checked: boolean) => {
    if (checked) {
        setSelectedNodes(new Set(nodes.map(n => n.id)));
    } else {
        setSelectedNodes(new Set());
    }
  }

  const treeToMarkdown = useCallback((selectedIds: Set<string>): string => {
    if (!tree) return '';

    const isFullTreeSelected = selectedIds.size === nodes.length;

    // If only specific nodes are selected, create a flat list.
    if (!isFullTreeSelected) {
        let markdown = '# Selected Key Points\n\n';
        nodes.forEach(node => {
            if (selectedIds.has(node.id)) {
                markdown += `### ${node.label}\n`;
                if (node.definition) {
                    markdown += `> ${node.definition}\n\n`;
                } else {
                    markdown += `\n`;
                }
            }
        });
        return markdown;
    }

    // If all nodes are selected, create a hierarchical structure.
    const buildMarkdown = (node: Node, depth = 0): string => {
        if (!node || !selectedIds.has(node.id)) return '';

        let markdown = `${'#'.repeat(depth + 2)} ${node.label}\n`; // Start with H2 for root
        const fullNode = nodes.find(n => n.id === node.id);
        if(fullNode?.definition) {
            markdown += `> ${fullNode.definition}\n\n`;
        } else {
            markdown += `\n`;
        }

        if (node.children) {
            node.children.forEach(child => {
                if (child) {
                    markdown += buildMarkdown(child, depth + 1);
                }
            });
        }
        return markdown;
    };
    return `# Skill Tree for: ${currentTopic}\n\n` + buildMarkdown(tree, -1);
  }, [tree, nodes, currentTopic]);
  
  const handleExplainInChat = async (node: Node) => {
    const question = `Explain "${node.label}" in the context of ${currentTopic}. Keep it concise.`;
    
    setActiveTab('chat');
    
    const newMessages: Message[] = [...messages, { role: 'user', content: question }];
    setMessages(newMessages);
    setIsChatLoading(true);

    try {
        const history = newMessages.slice(0, -1).map(m => ({role: m.role, content: m.content}));
        const result = await explainTopicAction({ topic: question, history });
        const formattedResponse = await marked.parse(result.response);
        setMessages(prev => [...prev, { role: 'model', content: formattedResponse }]);
    } catch(error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to get an explanation.'});
        setMessages(newMessages);
    } finally {
        setIsChatLoading(false);
    }
  };
  
  const handleChatSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const input = chatInput.trim();
    if (!input || isChatLoading) return;
    
    const newMessages: Message[] = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setChatInput('');
    setIsChatLoading(true);
    
    try {
        const history = newMessages.slice(0, -1).map(m => ({role: m.role, content: m.content}));
        const result = await explainTopicAction({ topic: input, history });
        const formattedResponse = await marked.parse(result.response);
        setMessages(prev => [...prev, { role: 'model', content: formattedResponse }]);
    } catch(error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to get a response from the AI.'});
        setMessages(newMessages);
    } finally {
        setIsChatLoading(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
        setIsDragging(true);
        setDragStart({ x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y });
    } else if (e.touches.length === 2) {
        pinchStartDistance.current = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
        setOffset({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    } else if (e.touches.length === 2 && pinchStartDistance.current) {
        const newPinchDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        const scaleChange = newPinchDistance / pinchStartDistance.current;
        setScale(prevScale => prevScale * scaleChange);
        pinchStartDistance.current = newPinchDistance;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    pinchStartDistance.current = null;
  };

  const noteContentToSave = activeTab === 'tree' ? treeToMarkdown(selectedNodes) : chatToMarkdown(messages);
  const noteTitleToSave = activeTab === 'tree' ? `Skill Tree: ${currentTopic}` : `Chat: ${currentTopic}`;


  return (
    <Card className="w-full h-full flex flex-col glass-pane">
        <CardHeader>
             <div className="flex flex-col sm:flex-row items-center gap-4">
                <Input
                    placeholder="Enter any topic to learn or build..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    className="flex-grow"
                />
                <div className="flex w-full sm:w-auto gap-2">
                    <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
                        {isLoading ? <Loader className="animate-spin" /> : <ArrowRight />}
                        <span className="ml-2 hidden sm:inline">Generate</span>
                    </Button>
                    {(nodes.length > 0 || messages.length > 0) && (
                        <Button variant="outline" onClick={() => setIsSaveNoteDialogOpen(true)} disabled={isLoading || (activeTab === 'tree' && selectedNodes.size === 0)} className="w-full">
                            <Save className="mr-2"/>
                            <span className="hidden sm:inline">Save</span>
                        </Button>
                    )}
                </div>
            </div>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col min-h-0">
             <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="tree" disabled={!tree}><Library className="mr-2"/>Skill Tree</TabsTrigger>
                    <TabsTrigger value="chat"><BookOpen className="mr-2"/>Normal Chat</TabsTrigger>
                </TabsList>
                <TabsContent value="tree" className="flex-grow mt-4 -mx-6 -mb-6 rounded-b-lg overflow-hidden">
                   <div 
                        ref={viewRef} 
                        className="relative w-full h-full bg-background/30 touch-none" 
                        onMouseDown={handleMouseDown} 
                        onMouseUp={handleMouseUp} 
                        onMouseLeave={handleMouseLeave} 
                        onMouseMove={handleMouseMove} 
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                    >
                        {(isLoading && nodes.length === 0) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-20">
                                <div className="text-center">
                                    <Loader className="h-12 w-12 text-accent animate-spin mx-auto" />
                                    <p className="mt-4 font-semibold">Generating knowledge map...</p>
                                </div>
                            </div>
                        )}
                        {(!isLoading && nodes.length === 0) && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center text-muted-foreground p-4">
                                    <p>The skill tree will appear here once generated.</p>
                                </div>
                            </div>
                        )}
                        <AnimatePresence>
                            {nodes.length > 0 && (
                                <div
                                    className="absolute"
                                    style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '0 0' }}
                                >
                                      <svg className="absolute inset-0 w-full h-full" style={{ width: '100vw', height: '100vh', overflow: 'visible' }}>
                                        <defs>
                                          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--border))" />
                                          </marker>
                                        </defs>
                                        {edges.map(edge => {
                                          const sourceNode = nodes.find(n => n.id === edge.source);
                                          const targetNode = nodes.find(n => n.id === edge.target);
                                          if (!sourceNode || !targetNode || sourceNode.x === undefined || sourceNode.y === undefined || targetNode.x === undefined || targetNode.y === undefined) return null;
                                          
                                          const x1 = sourceNode.x + (sourceNode.width ?? 0) / 2;
                                          const y1 = sourceNode.y + (sourceNode.height ?? 0);
                                          const x2 = targetNode.x + (targetNode.width ?? 0) / 2;
                                          const y2 = targetNode.y;
                                          
                                          const c1y = y1 + (y2 - y1) / 2;
                                          const c2y = y2 - (y2 - y1) / 2;

                                          return (
                                            <motion.path
                                              key={`${edge.source}-${edge.target}`}
                                              initial={{ pathLength: 0, opacity: 0 }}
                                              animate={{ pathLength: 1, opacity: 1 }}
                                              transition={{ duration: 0.5, delay: 0.5 }}
                                              d={`M ${x1} ${y1} C ${x1} ${c1y}, ${x2} ${c2y}, ${x2} ${y2}`}
                                              stroke="hsl(var(--border))"
                                              strokeWidth="1"
                                              fill="none"
                                              markerEnd="url(#arrow)"
                                            />
                                          );
                                        })}
                                      </svg>
                                    {nodes.map(node => {
                                        if(!node || node.x === undefined || node.y === undefined) return null;
                                        return (
                                        <Popover key={node.id} onOpenChange={(isOpen) => isOpen && handleFetchDefinition(node.id)}>
                                            <PopoverTrigger asChild>
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.5 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: 0.1 * (parseInt(node.id.replace(/\./g, '')) % 10) }}
                                                    className={cn('absolute flex items-center justify-center p-2 rounded-md border text-center cursor-pointer', nodeStyles[node.type] || nodeStyles.detail)}
                                                    style={{
                                                        left: node.x,
                                                        top: node.y,
                                                        width: node.width,
                                                        height: node.height,
                                                    }}
                                                >
                                                    <span className="truncate">{node.label}</span>
                                                </motion.div>
                                            </PopoverTrigger>
                                            <PopoverContent side="bottom" align="center" className="w-64 glass-pane z-30">
                                                 <div className="space-y-2">
                                                    <div className="flex items-start gap-2">
                                                         <Checkbox
                                                            id={`select-${node.id}`}
                                                            checked={selectedNodes.has(node.id)}
                                                            onCheckedChange={(checked) => handleNodeToggle(node.id, !!checked)}
                                                            className="mt-1"
                                                        />
                                                        <div className="grid gap-1.5 leading-none">
                                                            <label htmlFor={`select-${node.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                                {node.label}
                                                            </label>
                                                            {node.definition ? (
                                                                <p className="text-sm text-muted-foreground">{node.definition}</p>
                                                            ) : (
                                                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                                    <Loader className="h-4 w-4 animate-spin"/>
                                                                    <span>Fetching definition...</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => handleExplainInChat(node)}>
                                                       <BookOpen className="mr-2"/> Explain in Chat
                                                    </Button>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    )})}
                                </div>
                            )}
                        </AnimatePresence>
                         <div className="absolute top-4 left-4 z-10 bg-background/50 backdrop-blur-sm p-2 rounded-md">
                             <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="select-all" 
                                    checked={selectedNodes.size > 0 && selectedNodes.size === nodes.length}
                                    onCheckedChange={(checked) => handleSelectAllToggle(!!checked)}
                                />
                                <Label htmlFor="select-all">Select All</Label>
                            </div>
                        </div>
                        <div className="absolute bottom-4 right-4 flex gap-2 z-10">
                            <Button variant="outline" size="icon" onClick={() => setScale(s => s * 1.2)}><ZoomIn /></Button>
                            <Button variant="outline" size="icon" onClick={() => setScale(s => s / 1.2)}><ZoomOut /></Button>
                        </div>
                   </div>
                </TabsContent>
                <TabsContent value="chat" className="flex-grow mt-4 flex flex-col -mx-6 -mb-6">
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto">
                        <ChatView messages={messages} isLoading={isChatLoading}/>
                    </div>
                    <div className="p-4 border-t bg-background">
                         <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
                             <Input 
                                placeholder="Ask a follow-up question or explain a concept..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                            />
                            <Button type="submit" disabled={isChatLoading}>
                                <Send/>
                            </Button>
                         </form>
                    </div>
                </TabsContent>
             </Tabs>
        </CardContent>
        {isSaveNoteDialogOpen && (
             <SaveNoteDialog
                isOpen={isSaveNoteDialogOpen}
                onOpenChange={setIsSaveNoteDialogOpen}
                initialTitle={noteTitleToSave}
                noteContent={noteContentToSave}
            />
        )}
    </Card>
  );
}
