'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card } from './ui/card';
import { Loader, Network } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

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
    type: 'subject' | 'note';
    x: number;
    y: number;
    subjectId?: string;
    isImportant: boolean;
}

interface Edge {
    id: string;
    source: string;
    target: string;
}

export function SkillTreeView({ subjects }: { subjects: any[] }) {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, firestore } = useUser();
    const router = useRouter();

    const allNotesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/subjects`));
    }, [user, firestore]);

    const { data: allNotes, isLoading: isLoadingNotes, error } = useCollection(allNotesQuery);

    useEffect(() => {
        if (!subjects || isLoadingNotes) return;

        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];
        const maxX = 800; // Width of the viewport
        const maxY = 600; // Height of the viewport

        subjects.forEach((subject, index) => {
            const subjectId = `subject-${subject.id}`;
            newNodes.push({
                id: subjectId,
                label: subject.name,
                type: 'subject',
                x: (simpleHash(subject.id) % (maxX - 100)) + 50,
                y: (index * 150) + 100,
                isImportant: subject.isImportant,
            });

            // This is a placeholder for real note fetching logic.
            // In a real app, you'd fetch notes for each subject.
            const relatedNotes = (allNotes || [])
                .filter((note: any) => note.subjectId === subject.id)
                .slice(0, 5); // Limit notes for clarity

            relatedNotes.forEach((note: any, noteIndex: number) => {
                 const noteId = `note-${note.id}`;
                 newNodes.push({
                   id: noteId,
                   label: note.title,
                   type: 'note',
                   x: (simpleHash(subject.id) % (maxX - 100)) + 150 + (noteIndex * 20),
                   y: (index * 150) + 70 + (noteIndex * 25),
                   subjectId: subject.id,
                   isImportant: note.isImportant || false,
                 });
                 newEdges.push({
                    id: `edge-${subjectId}-${noteId}`,
                    source: subjectId,
                    target: noteId,
                 });
            });
        });
        
        setNodes(newNodes);
        setEdges(newEdges);
        setIsLoading(false);

    }, [subjects, allNotes, isLoadingNotes]);
    
    const handleNodeClick = (node: Node) => {
        if (node.type === 'subject') {
            router.push(`/dashboard/notes/${node.id.replace('subject-','')}`);
        } else if (node.type === 'note' && node.subjectId) {
             router.push(`/dashboard/notes/${node.subjectId}/notes/${node.id.replace('note-','')}`);
        }
    }


    if (isLoading) {
        return (
            <Card className="h-96 flex items-center justify-center glass-pane">
                <Loader className="animate-spin text-primary" />
                <p className="ml-2">Building Skill Tree...</p>
            </Card>
        );
    }
    
    if (nodes.length === 0) {
        return (
            <Card className="h-96 flex flex-col items-center justify-center glass-pane border-dashed">
                <Network className="w-16 h-16 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No Subjects to Display</h3>
                <p className="mt-1 text-sm text-muted-foreground">Create subjects and notes to see your skill tree.</p>
            </Card>
        );
    }


    return (
        <Card className="h-[600px] w-full glass-pane overflow-hidden relative">
            <svg width="100%" height="100%" className="absolute inset-0">
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
                <motion.div
                    key={node.id}
                    drag
                    dragMomentum={false}
                    className={`absolute p-2 rounded-md cursor-pointer text-xs ${
                        node.type === 'subject'
                        ? 'bg-primary text-primary-foreground font-bold'
                        : 'bg-secondary text-secondary-foreground'
                    } ${node.isImportant ? 'important-glow' : 'shadow-md'}`}
                    style={{
                        left: node.x - 40,
                        top: node.y - 15,
                        minWidth: '80px',
                        textAlign: 'center',
                    }}
                    whileHover={{ scale: 1.1, zIndex: 10 }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    onDoubleClick={() => handleNodeClick(node)}
                >
                    {node.label}
                </motion.div>
            ))}
             <div className="absolute bottom-2 right-2 text-xs text-muted-foreground p-1 bg-background/50 rounded">
                Double-click a node to open it.
            </div>
        </Card>
    );
}
