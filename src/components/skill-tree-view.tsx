
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader, Send, ZoomIn, ZoomOut, Save, BookOpen, Library, CheckSquare, Square, MousePointer, Hand } from 'lucide-react';
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
  root: { width: 220, height: 70 },
  pillar: { width: 200, height: 65 },
  concept: { width: 180, height: 60 },
  detail: { width: 160, height: 55 },
  'sub-detail': { width: 150, height: 50 },
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

    const safeTree = JSON.parse(JSON.stringify(tree));

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let xOffset = 0;
    const ySpacing = 120;
    const xSpacing = 250;

    function traverse(node: Node, depth = 0, parent?: Node, parentX?: number) {
        if (!node) {
            return;
        }
        
        const { width, height } = nodeDimensions[node.type] || nodeDimensions.detail;
        node.width = width;
        node.height = height;
        node.y = depth * ySpacing;
        
        const childrenCount = node.children?.filter(Boolean).length || 0;
        const childrenWidth = childrenCount * xSpacing - (xSpacing - width);
        
        if (!parent) { // Root node
            node.x = 0;
        } else if (childrenCount === 0) { // Leaf node
            node.x = parentX!;
            xOffset += xSpacing;
        } else { // Branch node
            const startX = parentX!;
            node.children!.filter(Boolean).forEach((child, i) => {
                traverse(child, depth + 1, node, startX + i * xSpacing);
            });
            const firstChild = nodes.find(n => n.id === node.children![0].id);
            const lastChild = nodes.find(n => n.id === node.children![childrenCount - 1].id);
            node.x = (firstChild!.x! + lastChild!.x!) / 2;
        }
        
        if (parent) {
             const startX = parent.x! + parent.width! / 2;
             const startY = parent.y! + parent.height!;
             const endX = node.x! + node.width! / 2;
             const endY = node.y!;
             const midY = startY + ySpacing / 2;
             
             const path = `M ${startX},${startY} L ${startX},${midY} L ${endX},${midY} L ${endX},${endY}`;

             edges.push({
                 source: parent.id,
                 target: node.id,
                 path: path
             });
        }
        
        nodes.push(node);

        if (childrenCount > 0 && !parent) { // Root node with children
             node.children!.filter(Boolean).forEach((child, i) => {
                traverse(child, depth + 1, node, i * xSpacing);
            });
            const firstChild = nodes.find(n => n.id === node.children![0].id);
            const lastChild = nodes.find(n => n.id === node.children![childrenCount - 1].id);
            if(firstChild && lastChild) {
               node.x = (firstChild.x! + lastChild.x!) / 2;
            }
        }
    }

    traverse(safeTree);
    
    // Center the whole tree
    const minX = Math.min(...nodes.map(n => n.x!));
    nodes.forEach(n => {
        n.x! -= minX;
    });

    return { nodes, edges };
};


export function SkillTreeView() {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tree, setTree] = useState<Node | null>(null);
  const [{ nodes, edges }, setLayout] = useState<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const { toast } = useToast();
  
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1000, height: 800 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSaveNoteDialogOpen, setIsSaveNoteDialogOpen] = useState(false);
  
  const [panMode, setPanMode] = useState(true);

  useEffect(() => {
    if (tree) {
      const { nodes: newNodes, edges: newEdges } = calculateLayout(tree);
      setLayout({ nodes: newNodes, edges: newEdges });

      if (newNodes.length > 0) {
        const minX = Math.min(...newNodes.map(n => n.x!));
        const minY = Math.min(...newNodes.map(n => n.y!));
        const maxX = Math.max(...newNodes.map(n => n.x! + n.width!));
        const maxY = Math.max(...newNodes.map(n => n.y! + n.height!));
        const width = maxX - minX + 400; // Add padding
        const height = maxY - minY + 200; // Add padding
        
        // Center the initial view on the root node
        const rootNode = newNodes.find(n => n.type === 'root');
        const initialX = rootNode ? (rootNode.x! + rootNode.width! / 2) - (1000 / 2) : minX - 200;
        const initialY = minY - 100;
        
        setViewBox({ x: initialX, y: initialY, width: 1000, height: 800});
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
            
            let markdown = `${'#'.repeat(depth + 2)} ${node.label}\n`;
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
            let markdown = `# Skill Tree: ${tree.label}\n\n`;
            markdown += buildMarkdown(tree, 0);
            return markdown;
        } else {
            let markdown = `# Selected Key Points for: ${tree.label}\n\n`;
            for (const id of selectedIds) {
                const node = nodes.find(n => n.id === id);
                if (node) {
                    markdown += `- **${node.label}**: ${node.definition || 'No definition available.'}\n`;
                }
            }
            return markdown;
        }

    }, [tree, selectedIds, nodes]);
    
    const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        const { clientX, clientY } = e;
        const svg = svgRef.current;
        if (!svg) return;

        const point = svg.createSVGPoint();
        point.x = clientX;
        point.y = clientY;
        
        const { x: svgX, y: svgY } = point.matrixTransform(svg.getScreenCTM()!.inverse());

        const newWidth = e.deltaY < 0 ? viewBox.width / zoomFactor : viewBox.width * zoomFactor;
        const newHeight = e.deltaY < 0 ? viewBox.height / zoomFactor : viewBox.height * zoomFactor;
        
        const newX = svgX - (svgX - viewBox.x) * (newWidth / viewBox.width);
        const newY = svgY - (svgY - viewBox.y) * (newHeight / viewBox.height);

        setViewBox({ x: newX, y: newY, width: newWidth, height: newHeight });
    };
    
    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
      if (!panMode) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        e.currentTarget.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!isDragging || !panMode) return;
        
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        
        const scale = viewBox.width / svgRef.current!.clientWidth;

        setViewBox(prev => ({
            ...prev,
            x: prev.x - dx * scale,
            y: prev.y - dy * scale,
        }));
        
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
        setIsDragging(false);
        if (panMode) e.currentTarget.style.cursor = 'grab';
    };
    
    const handleMouseLeave = (e: React.MouseEvent<SVGSVGElement>) => {
        setIsDragging(false);
        if (panMode) e.currentTarget.style.cursor = 'default';
    };
  

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
                    <Button variant="outline" size="icon" onClick={() => setPanMode(!panMode)}>
                        {panMode ? <MousePointer /> : <Hand />}
                    </Button>
                    <div className="flex items-center space-x-2 bg-card/80 p-2 rounded-md">
                        <Checkbox id="select-all" onCheckedChange={handleSelectAll} />
                        <Label htmlFor="select-all">Select All</Label>
                    </div>
                    <Button variant="glow" size="sm" onClick={() => setIsSaveNoteDialogOpen(true)} disabled={selectedIds.size === 0}>
                        <Save className="mr-2 h-4 w-4" /> Save
                    </Button>
                </div>
                 <svg 
                     ref={svgRef} 
                     className={cn("w-full h-full", panMode ? "cursor-grab" : "cursor-default")}
                     viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
                     onWheel={handleWheel}
                     onMouseDown={handleMouseDown}
                     onMouseMove={handleMouseMove}
                     onMouseUp={handleMouseUp}
                     onMouseLeave={handleMouseLeave}
                 >
                    <g>
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
                               <foreignObject x={node.x} y={node.y} width={node.width} height={node.height} className={cn("overflow-visible", !panMode && "cursor-pointer")}>
                                 <motion.div
                                     initial={{ opacity: 0, scale: 0.8 }}
                                     animate={{ opacity: 1, scale: 1 }}
                                     onClick={(e) => {
                                         if (!panMode) handleNodeClick(node.id);
                                         else e.stopPropagation();
                                     }}
                                     className={cn(
                                         'flex flex-col justify-center items-center p-2 rounded-md h-full w-full transition-all',
                                         nodeColors[node.type],
                                         activeNodeId === node.id && 'shadow-lg shadow-accent/50'
                                     )}
                                 >
                                     <p className="font-bold text-center text-sm leading-tight">{node.label}</p>
                                     <p className="text-xs opacity-70 capitalize mt-1">{node.type}</p>
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
