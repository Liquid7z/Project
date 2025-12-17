
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader, Send, ZoomIn, ZoomOut, ArrowRight, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { generateSkillTreeAction, explainTopicAction } from '@/actions/generation';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatView } from './chat-view';
import type { Message } from './chat-view';
import { marked } from 'marked';
import { cn } from '@/lib/utils';


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
  'sub-detail': { width: 130, height: 28 },
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

  const { width, height } = nodeDimensions[node.type] || nodeDimensions.detail;
  node.width = width;
  node.height = height;
  node.x = x;
  node.y = y;

  nodes.push(node);

  if (node.children && node.children.length > 0) {
    const totalChildWidth = node.children.length * xGap - (xGap - nodeDimensions.pillar.width);
    let currentX = x - totalChildWidth / 2 + nodeDimensions.pillar.width / 2;

    node.children.forEach((child) => {
      edges.push({ source: node.id, target: child.id });
      const { nodes: childNodes, edges: childEdges } = calculateLayout(child, currentX, y + yGap, depth + 1);
      nodes = nodes.concat(childNodes);
      edges = edges.concat(childEdges);
      currentX += xGap;
    });
  }

  return { nodes, edges };
};


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

  const pinchStartDistance = useRef<number | null>(null);

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
    try {
      const result = await generateSkillTreeAction({ topic });
      if (result && result.tree) {
        setTree(result.tree);
        const { nodes: layoutNodes, edges: layoutEdges } = calculateLayout(result.tree);
        
        const xs = layoutNodes.map(n => n.x ?? 0);
        const ys = layoutNodes.map(n => n.y ?? 0);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs) + (nodeDimensions.detail.width);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys) + (nodeDimensions.detail.height);

        const treeWidth = maxX - minX;
        const treeHeight = maxY - minY;

        const initialScale = Math.min(viewWidth / (treeWidth + 100), viewHeight / (treeHeight + 100), 1);
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

  const handleNodeClick = async (node: Node) => {
    const question = `Explain "${node.label}" in the context of ${currentTopic}. Keep it concise.`;
    setChatInput(question);
    setActiveTab('chat');
    
    // Auto-submit this question to the chat
    const newMessages: Message[] = [...messages, { role: 'user', content: question }];
    setMessages(newMessages);
    setChatInput('');
    setIsChatLoading(true);

    try {
        const history = newMessages.slice(0, -1).map(m => ({role: m.role, content: m.content.replace(/<[^>]+>/g, '')}));
        const result = await explainTopicAction({ topic: question, history });
        const formattedResponse = await marked.parse(result.response);
        setMessages(prev => [...prev, { role: 'model', content: formattedResponse }]);
    } catch(error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to get an explanation.'});
        setMessages(newMessages); // Revert to messages before AI response
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
        const history = newMessages.slice(0, -1).map(m => ({role: m.role, content: m.content.replace(/<[^>]+>/g, '')}));
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
                    {nodes.length > 0 && (
                        <Button variant="outline" disabled={isLoading} className="w-full">
                            <Save className="mr-2"/>
                            <span className="hidden sm:inline">Save to Note</span>
                        </Button>
                    )}
                </div>
            </div>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col min-h-0">
             <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="tree">Skill Tree</TabsTrigger>
                    <TabsTrigger value="chat">Normal Chat</TabsTrigger>
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
                                <motion.div
                                    className="absolute inset-0"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
                                >
                                     <svg className="absolute inset-0 w-full h-full" style={{ width: viewWidth / scale, height: viewHeight / scale, transform: `translate(${-offset.x/scale}px, ${-offset.y/scale}px)` }}>
                                        <defs>
                                          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--border))" />
                                          </marker>
                                        </defs>
                                        {edges.map(edge => {
                                          const sourceNode = nodes.find(n => n.id === edge.source);
                                          const targetNode = nodes.find(n => n.id === edge.target);
                                          if (!sourceNode || !targetNode) return null;
                                          return (
                                            <line
                                              key={`${edge.source}-${edge.target}`}
                                              x1={(sourceNode.x ?? 0) + (sourceNode.width ?? 0) / 2}
                                              y1={(sourceNode.y ?? 0) + (sourceNode.height ?? 0)}
                                              x2={(targetNode.x ?? 0) + (targetNode.width ?? 0) / 2}
                                              y2={(targetNode.y ?? 0)}
                                              stroke="hsl(var(--border))"
                                              strokeWidth="1"
                                              markerEnd="url(#arrow)"
                                            />
                                          );
                                        })}
                                      </svg>
                                    {nodes.map(node => (
                                        <motion.div
                                            key={node.id}
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
                                            onClick={() => handleNodeClick(node)}
                                        >
                                            <span className="truncate">{node.label}</span>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className="absolute bottom-4 right-4 flex gap-2 z-10">
                            <Button variant="outline" size="icon" onClick={() => setScale(s => s * 1.2)}><ZoomIn /></Button>
                            <Button variant="outline" size="icon" onClick={() => setScale(s => s / 1.2)}><ZoomOut /></Button>
                        </div>
                   </div>
                </TabsContent>
                <TabsContent value="chat" className="flex-grow mt-4 flex flex-col -mx-6 -mb-6">
                    <ChatView messages={messages} isLoading={isChatLoading}/>
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
    </Card>
  );
}

    