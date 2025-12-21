

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader, Send, Save, BookOpen, CheckCircle, MessageSquare, Plus } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { generateSkillTreeAction, getShortDefinitionAction } from '@/actions/generation';
import { useToast } from '@/hooks/use-toast';
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
  children?: Node[] | null;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  definition?: string;
  isDefinitionLoading?: boolean;
}

interface Edge {
  source: string;
  target: string;
  path: string;
}

const nodeDimensions = {
  root: { width: 180, height: 60 },
  pillar: { width: 160, height: 52 },
  concept: { width: 150, height: 48 },
  detail: { width: 140, height: 44 },
  'sub-detail': { width: 130, height: 40 },
};

const nodeColors = {
    root: 'bg-primary/20 border-primary text-primary-foreground',
    pillar: 'bg-accent/20 border-accent text-accent-foreground',
    concept: 'bg-secondary border-border text-foreground',
    detail: 'bg-muted/50 border-border text-muted-foreground',
    'sub-detail': 'bg-muted/30 border-border/50 text-muted-foreground',
};

const activeNodeColors = {
    root: 'bg-primary/40 border-primary shadow-[0_0_15px_hsl(var(--primary))]',
    pillar: 'bg-accent/40 border-accent shadow-[0_0_15px_hsl(var(--accent))]',
    concept: 'bg-secondary/80 border-ring shadow-[0_0_15px_hsl(var(--ring))]',
    detail: 'bg-muted/80 border-muted-foreground shadow-[0_0_10px_hsl(var(--muted-foreground))]',
    'sub-detail': 'bg-muted/60 border-muted-foreground/80 shadow-[0_0_8px_hsl(var(--muted-foreground)/80)]',
};

const isValidNode = (node: any): node is Node => {
    return node && typeof node === 'object' && typeof node.id === 'string' && typeof node.label === 'string';
}

const calculateLayout = (rootNode: Node | null): { nodes: Node[]; edges: Edge[] } => {
    if (!rootNode) return { nodes: [], edges: [] };

    const allNodes: Node[] = [];
    const edges: Edge[] = [];
    const xSpacing = 220;
    const ySpacing = 20;

    const nodeMap = new Map<string, Node>();
    
    // First pass: Traverse tree to set dimensions and gather all nodes
    const queue: Node[] = [rootNode];
    while(queue.length > 0) {
        const node = queue.shift()!;
        if (!isValidNode(node) || nodeMap.has(node.id)) continue;
        
        const dims = nodeDimensions[node.type] || nodeDimensions.detail;
        node.width = dims.width;
        node.height = dims.height;
        
        nodeMap.set(node.id, node);
        allNodes.push(node);
        
        if (Array.isArray(node.children)) {
            for (const child of node.children) {
                if (isValidNode(child)) {
                    queue.push(child);
                }
            }
        }
    }

    // Second pass: Calculate positions
    const levels: Node[][] = [];
    const visited = new Set<string>();
    
    const root = nodeMap.get(rootNode.id);
    if (root) {
        levels.push([root]);
        visited.add(root.id);
    }
    
    let currentLevel = 0;
    while(levels[currentLevel]) {
        const nextLevel: Node[] = [];
        for(const node of levels[currentLevel]) {
            if (Array.isArray(node.children)) {
                for (const childNode of node.children) {
                    if (isValidNode(childNode) && !visited.has(childNode.id)) {
                        const child = nodeMap.get(childNode.id);
                        if (child) {
                           nextLevel.push(child);
                           visited.add(child.id);
                        }
                    }
                }
            }
        }
        if (nextLevel.length > 0) {
            levels.push(nextLevel);
        }
        currentLevel++;
    }

    let totalHeight = 0;
    const levelHeights = levels.map(level => {
        const height = level.reduce((acc, node) => acc + node.height!, 0) + (level.length - 1) * ySpacing;
        totalHeight = Math.max(totalHeight, height);
        return height;
    });

    levels.forEach((level, i) => {
        const levelHeight = level.reduce((acc, node) => acc + node.height!, 0) + (level.length - 1) * ySpacing;
        let yOffset = -levelHeight / 2;
        
        level.forEach(node => {
            node.x = i * xSpacing;
            node.y = yOffset + node.height! / 2;
            yOffset += node.height! + ySpacing;
        });
    });

    // Third pass: Create edges
    allNodes.forEach(node => {
        if (Array.isArray(node.children)) {
            node.children.forEach(childNode => {
                if (!isValidNode(childNode)) return;
                
                const child = nodeMap.get(childNode.id);
                if (child && node.x !== undefined && node.y !== undefined && child.x !== undefined && child.y !== undefined) {
                    const startX = node.x + node.width! / 2;
                    const startY = node.y;
                    const endX = child.x - child.width! / 2;
                    const endY = child.y;
                    const midX = startX + (endX - startX) / 2;

                    edges.push({
                        source: node.id,
                        target: child.id,
                        path: `M ${startX},${startY} L ${midX},${startY} L ${midX},${endY} L ${endX},${endY}`
                    });
                }
            });
        }
    });

    return { nodes: allNodes, edges };
};


export function SkillTreeView({ onExplainInChat }: { onExplainInChat: (topic: string) => void }) {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tree, setTree] = useState<Node | null>(null);
  const [{ nodes, edges }, setLayout] = useState<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const { toast } = useToast();
  
  const [viewBox, setViewBox] = useState({ x: -200, y: -400, width: 1200, height: 800 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [activeChildIds, setActiveChildIds] = useState<Set<string>>(new Set());
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSaveNoteDialogOpen, setIsSaveNoteDialogOpen] = useState(false);
  const pinchStartDistance = useRef<number | null>(null);


  useEffect(() => {
    if (tree) {
      const { nodes: newNodes, edges: newEdges } = calculateLayout(tree);
      setLayout({ nodes: newNodes, edges: newEdges });

      if (newNodes.length > 0) {
        const rootNode = newNodes.find(n => n.type === 'root');
        const initialX = rootNode ? rootNode.x! - 200 : -200;
        const initialY = rootNode ? rootNode.y! - 400 : -400;
        setViewBox(prev => ({ ...prev, x: initialX, y: initialY }));
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
          description: 'The AI model did not return a valid tree structure. Please try again or rephrase your topic.',
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
  
    const findNodeById = (node: Node | null, id: string): Node | null => {
        if (!isValidNode(node)) return null;
        if (node.id === id) return node;
        if (Array.isArray(node.children)) {
            for (const child of node.children) {
                if (!isValidNode(child)) continue;
                const found = findNodeById(child, id);
                if (found) return found;
            }
        }
        return null;
    };
    
    const handleExpandTopic = async (nodeId: string) => {
        const nodeToExpand = findNodeById(tree, nodeId);
        if (!nodeToExpand) return;

        toast({ title: "Expanding Topic...", description: `Generating more details for "${nodeToExpand.label}".`});
        setIsLoading(true);

        try {
            const result = await generateSkillTreeAction({ topic: nodeToExpand.label });
            if (result && result.tree && result.tree.children) {
                
                const assignNewIds = (nodes: Node[], parentId: string): Node[] => {
                     return nodes.map((node, index) => {
                        const newId = `${parentId}.${index + 1}`;
                        const newNode: Node = { ...node, id: newId };
                        if (Array.isArray(newNode.children)) {
                            newNode.children = assignNewIds(newNode.children, newId);
                        }
                        return newNode;
                    });
                };
                
                const newChildren = assignNewIds(result.tree.children, nodeId);

                const updateChildren = (node: Node | null): Node | null => {
                    if (!node) return null;
                    if (node.id === nodeId) {
                        return { ...node, children: newChildren };
                    }
                    if (Array.isArray(node.children)) {
                        return { ...node, children: node.children.map(updateChildren).filter((n): n is Node => n !== null) };
                    }
                    return node;
                };

                const newTree = updateChildren(tree);
                if(newTree) {
                    setTree(newTree);
                }
            } else {
                 toast({ variant: 'destructive', title: 'Expansion Failed', description: 'Could not generate sub-topics.' });
            }
        } catch (error) {
             console.error("Error expanding topic:", error);
             toast({ variant: 'destructive', title: 'Error', description: 'An error occurred while expanding the topic.' });
        } finally {
            setIsLoading(false);
        }
    }


    const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        setActiveNodeId(nodeId);
        
        const activeNode = findNodeById(tree, nodeId);
        if (activeNode) {
            const validChildren = Array.isArray(activeNode.children) ? activeNode.children.filter(isValidNode) : [];
            const childIds = new Set(validChildren.map(child => child.id));
            setActiveChildIds(childIds);
        } else {
            setActiveChildIds(new Set());
        }
    };
    
    const handlePopoverOpenChange = async (isOpen: boolean, nodeId: string) => {
        if (isOpen) {
            setActiveNodeId(nodeId);
            const activeNode = nodes.find(n => n.id === nodeId);

             if (activeNode) {
                const validChildren = Array.isArray(activeNode.children) ? activeNode.children.filter(isValidNode) : [];
                const childIds = new Set(validChildren.map(child => child.id));
                setActiveChildIds(childIds);

                // Fetch definition if it doesn't exist and isn't already loading
                if (!activeNode.definition && !activeNode.isDefinitionLoading) {
                    setLayout(prev => ({
                        ...prev,
                        nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, isDefinitionLoading: true } : n)
                    }));

                    try {
                        const res = await getShortDefinitionAction({ topic: activeNode.label, context: tree?.label || topic });
                        setLayout(prev => ({
                            ...prev,
                            nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, definition: res.definition, isDefinitionLoading: false } : n)
                        }));
                    } catch (error) {
                        console.error("Failed to get definition", error);
                        toast({variant: 'destructive', title: "Could not get definition."});
                        setLayout(prev => ({
                            ...prev,
                            nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, isDefinitionLoading: false } : n)
                        }));
                    }
                }
            } else {
                setActiveChildIds(new Set());
            }
        }
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
            if (!isValidNode(node) || (!isAllSelected && !selectedIds.has(node.id))) return '';
            
            let markdown = `${'#'.repeat(depth + 2)} ${node.label}\n`;
            const fullNode = nodes.find(n => n.id === node.id);

            if (fullNode?.definition) {
                markdown += `> ${fullNode.definition}\n\n`;
            }

            if (Array.isArray(node.children)) {
                const childrenMarkdown = node.children
                    .filter(isValidNode)
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
    
    const getPointInSvg = (clientX: number, clientY: number) => {
        const svg = svgRef.current;
        if (!svg) return null;
        const point = svg.createSVGPoint();
        point.x = clientX;
        point.y = clientY;
        return point.matrixTransform(svg.getScreenCTM()!.inverse());
    };
    
    const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        const { clientX, clientY } = e;
        
        const svgPoint = getPointInSvg(clientX, clientY);
        if (!svgPoint) return;

        const newWidth = e.deltaY < 0 ? viewBox.width / zoomFactor : viewBox.width * zoomFactor;
        const newHeight = e.deltaY < 0 ? viewBox.height / zoomFactor : viewBox.height * zoomFactor;
        
        const newX = svgPoint.x - (svgPoint.x - viewBox.x) * (newWidth / viewBox.width);
        const newY = svgPoint.y - (svgPoint.y - viewBox.y) * (newHeight / viewBox.height);

        setViewBox({ x: newX, y: newY, width: newWidth, height: newHeight });
    };
    
    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
        if ((e.target as SVGElement).closest('foreignObject')) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        e.currentTarget.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!isDragging) return;
        e.preventDefault();
        
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        
        const svg = svgRef.current;
        if (!svg) return;
        
        const scale = viewBox.width / svg.clientWidth;

        setViewBox(prev => ({
            ...prev,
            x: prev.x - dx * scale,
            y: prev.y - dy * scale,
        }));
        
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
        setIsDragging(false);
        e.currentTarget.style.cursor = 'grab';
    };
    
    const handleMouseLeave = (e: React.MouseEvent<SVGSVGElement>) => {
        if(isDragging) {
           setIsDragging(false);
           e.currentTarget.style.cursor = 'grab';
        }
    };
    
    const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
        if ((e.target as SVGElement).closest('foreignObject')) return;
        
        if (e.touches.length === 1) {
            setIsDragging(true);
            setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        } else if (e.touches.length === 2) {
            e.preventDefault(); // Prevent page zoom
            setIsDragging(false); // Stop panning if two fingers are down
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            pinchStartDistance.current = Math.sqrt(dx * dx + dy * dy);
        }
    };
    
    const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
        if (isDragging && e.touches.length === 1) {
            const dx = e.touches[0].clientX - dragStart.x;
            const dy = e.touches[0].clientY - dragStart.y;
            const svg = svgRef.current;
            if (!svg) return;
            const scale = viewBox.width / svg.clientWidth;
            setViewBox(prev => ({
                ...prev,
                x: prev.x - dx * scale,
                y: prev.y - dy * scale,
            }));
            setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        } else if (e.touches.length === 2 && pinchStartDistance.current !== null) {
            e.preventDefault(); // Prevent page zoom
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const newDist = Math.sqrt(dx * dx + dy * dy);
            const zoomFactor = pinchStartDistance.current / newDist;
            pinchStartDistance.current = newDist;
            
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            
            const svgPoint = getPointInSvg(midX, midY);
            if (!svgPoint) return;

            const newWidth = viewBox.width * zoomFactor;
            const newHeight = viewBox.height * zoomFactor;

            const newX = svgPoint.x - (svgPoint.x - viewBox.x) * (newWidth / viewBox.width);
            const newY = svgPoint.y - (svgPoint.y - viewBox.y) * (newHeight / viewBox.height);

            setViewBox({ x: newX, y: newY, width: newWidth, height: newHeight });
        }
    };
    
    const handleTouchEnd = (e: React.TouchEvent<SVGSVGElement>) => {
        setIsDragging(false);
        pinchStartDistance.current = null;
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
                     className={cn("w-full h-full touch-none", isDragging ? 'cursor-grabbing' : 'cursor-grab')}
                     viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
                     onWheel={handleWheel}
                     onMouseDown={handleMouseDown}
                     onMouseMove={handleMouseMove}
                     onMouseUp={handleMouseUp}
                     onMouseLeave={handleMouseLeave}
                     onTouchStart={handleTouchStart}
                     onTouchMove={handleTouchMove}
                     onTouchEnd={handleTouchEnd}
                 >
                    <defs>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <g>
                       {edges.map(edge => {
                           const isSourceActive = activeNodeId === edge.source;
                           return (
                               <path
                                    key={`${edge.source}-${edge.target}`}
                                    d={edge.path}
                                    fill="none"
                                    stroke={isSourceActive ? 'hsl(var(--accent))' : 'hsl(var(--border))'}
                                    strokeWidth={2}
                                    className={cn("transition-all", isSourceActive && "glow-edge")}
                                />
                           );
                       })}
                    </g>
                    <g>
                       {nodes.map(node => {
                            const isNodeActive = activeNodeId === node.id || activeChildIds.has(node.id);
                            return (
                               <Popover key={node.id} onOpenChange={(open) => handlePopoverOpenChange(open, node.id)}>
                                <PopoverTrigger asChild>
                                   <foreignObject x={node.x! - node.width! / 2} y={node.y! - node.height! / 2} width={node.width} height={node.height} className="overflow-visible cursor-pointer" onClick={(e) => handleNodeClick(e, node.id)}>
                                     <motion.div
                                         initial={{ opacity: 0, scale: 0.8 }}
                                         animate={{ opacity: 1, scale: 1 }}
                                         className={cn(
                                             'flex flex-col justify-center items-center p-2 rounded-md h-full w-full transition-all text-center',
                                             isNodeActive ? activeNodeColors[node.type] : nodeColors[node.type]
                                         )}
                                     >
                                        <p className="font-bold text-sm leading-tight">{node.label}</p>
                                        <p className="text-xs capitalize opacity-70">{node.type}</p>
                                     </motion.div>
                                   </foreignObject>
                                </PopoverTrigger>
                                 <PopoverContent className="w-80 glass-pane">
                                     <div className="space-y-4">
                                         <div className="space-y-1">
                                            <h4 className="font-medium leading-none">{node.label}</h4>
                                            {node.isDefinitionLoading ? (
                                                <div className="flex items-center text-sm text-muted-foreground"><Loader className="w-4 h-4 mr-2 animate-spin" /> Fetching definition...</div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">{node.definition || 'Click a node to see its definition.'}</p>
                                            )}
                                         </div>
                                         <div className="flex items-center justify-between gap-2">
                                             <Button variant="secondary" size="sm" onClick={() => onExplainInChat(node.label)}>
                                                 <MessageSquare className="mr-2" />
                                                 Explain in Chat
                                             </Button>
                                             <Button variant="outline" size="sm" onClick={() => handleExpandTopic(node.id)}>
                                                 <Plus className="mr-2" />
                                                 Expand Topic
                                             </Button>
                                         </div>
                                          <div className="flex items-center space-x-2 pt-4 border-t">
                                             <Checkbox
                                                 id={`check-${node.id}`}
                                                 checked={selectedIds.has(node.id)}
                                                 onCheckedChange={(checked) => handleNodeToggle(node.id, !!checked)}
                                             />
                                             <Label htmlFor={`check-${node.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                Select for export
                                             </Label>
                                         </div>
                                     </div>
                                 </PopoverContent>
                               </Popover>
                           )
                       })}
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

