'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Zap, GitBranch, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

// Mock data for the skill tree
const mockSubjects = [
  { id: 'physics', name: 'Physics', position: { x: 0, y: 0 } },
  { id: 'chemistry', name: 'Chemistry', position: { x: 300, y: 100 } },
  { id: 'history', name: 'History', position: { x: -200, y: 150 } },
];

const mockTopics = {
  physics: [
    { id: 'newtonian', name: 'Newtonian Mechanics', position: { x: 150, y: -100 } },
    { id: 'quantum', name: 'Quantum Physics', position: { x: 100, y: 100 } },
  ],
  chemistry: [
    { id: 'organic', name: 'Organic', position: { x: 450, y: 0 } },
  ],
  history: [],
};

const mockConnections = [
  { from: 'physics', to: 'newtonian' },
  { from: 'physics', to: 'quantum' },
  { from: 'chemistry', to: 'organic' },
];

const Node = ({ node, type, onSelect, isSelected }: { node: any, type: 'subject' | 'topic', onSelect: (id: string) => void, isSelected: boolean }) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.5 }}
    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    style={{
      x: node.position.x,
      y: node.position.y,
    }}
    onClick={() => onSelect(node.id)}
    className="absolute cursor-pointer group"
  >
    <motion.div
      className="w-24 h-24 rounded-full flex items-center justify-center text-center p-2"
      style={{
        background: 'radial-gradient(ellipse at center, hsl(var(--primary)/0.2), transparent 70%)',
      }}
      animate={{
        scale: isSelected ? 1.2 : 1,
        boxShadow: isSelected 
          ? '0 0 20px hsl(var(--accent)), 0 0 40px hsl(var(--primary))'
          : '0 0 10px hsl(var(--accent)/0.5)',
      }}
      whileHover={{ scale: 1.1 }}
    >
      <div className="absolute inset-0 rounded-full border-2 border-accent/50 group-hover:border-accent transition-colors" />
      <motion.div 
        className="absolute inset-0 rounded-full border-2 border-primary"
        animate={{
          rotate: 360,
          scale: isSelected ? [1, 1.1, 1] : 1,
        }}
        transition={{
          rotate: { duration: 15, repeat: Infinity, ease: 'linear' },
          scale: { duration: 0.5, repeat: isSelected ? Infinity : 0, repeatDelay: 1 }
        }}
      />
      <span className="text-sm font-bold font-headline text-glow z-10">{node.name}</span>
    </motion.div>
  </motion.div>
);

const Connection = ({ fromNode, toNode }: { fromNode: any, toNode: any }) => {
  if (!fromNode || !toNode) return null;
  
  const fromX = fromNode.position.x + 48;
  const fromY = fromNode.position.y + 48;
  const toX = toNode.position.x + 48;
  const toY = toNode.position.y + 48;

  return (
    <svg className="absolute inset-0 w-full h-full overflow-visible" style={{ pointerEvents: 'none' }}>
      <motion.line
        x1={fromX}
        y1={fromY}
        x2={toX}
        y2={toY}
        stroke="hsl(var(--primary)/0.5)"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeInOut" }}
      >
        <animate
          attributeName="stroke-dasharray"
          values="0, 200; 20, 180; 0, 200"
          dur="2s"
          repeatCount="indefinite"
        />
      </motion.line>
    </svg>
  );
};

const RadialMenu = ({ onAction }: { onAction: (action: string) => void }) => (
    <motion.div 
        className="fixed bottom-8 right-8 z-50 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.5 }}
    >
        <div className="relative group">
            <Button variant="glow" size="icon" className="w-16 h-16 rounded-full">
                <Plus className="w-8 h-8"/>
            </Button>
            <div className="absolute bottom-full mb-4 right-1/2 translate-x-1/2 flex flex-col items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                 <Button variant="outline" size="icon" className="rounded-full !w-12 !h-12 border-accent text-accent" onClick={() => onAction('add_topic')}>
                    <Zap/>
                </Button>
                 <Button variant="outline" size="icon" className="rounded-full !w-12 !h-12 border-accent text-accent" onClick={() => onAction('link_nodes')}>
                    <GitBranch/>
                </Button>
                 <Button variant="outline" size="icon" className="rounded-full !w-12 !h-12 border-accent text-accent" onClick={() => onAction('reset_view')}>
                    <Crosshair/>
                </Button>
            </div>
        </div>
    </motion.div>
);

export default function NotesHolographicPage() {
  const [subjects, setSubjects] = useState(mockSubjects);
  const [topics, setTopics] = useState(mockTopics);
  const [connections, setConnections] = useState(mockConnections);
  const [selectedSubject, setSelectedSubject] = useState<string | null>('physics');
  const isMobile = useIsMobile();
  
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  
  useEffect(() => {
    // Center the view on mobile
    if (isMobile) {
      setPan({ x: window.innerWidth / 2 - 50, y: window.innerHeight / 4 });
      setZoom(0.6);
    } else {
      setPan({ x: 0, y: 0 });
      setZoom(1);
    }
  }, [isMobile]);

  const displayedTopics = useMemo(() => {
    if (!selectedSubject) return [];
    return topics[selectedSubject as keyof typeof mockTopics] || [];
  }, [selectedSubject, topics]);

  const allNodes = useMemo(() => {
    return [...subjects, ...displayedTopics];
  }, [subjects, displayedTopics]);

  return (
    <div className="w-full h-[calc(100vh-8.5rem)] md:h-[calc(100vh-4rem)] rounded-lg overflow-hidden relative glass-pane">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"/>

        <motion.div 
            className="w-full h-full"
            drag
            dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
            onPan={(e, pointInfo) => setPan({x: pan.x + pointInfo.delta.x, y: pan.y + pointInfo.delta.y})}
            onWheel={e => setZoom(prev => Math.max(0.2, Math.min(2, prev - e.deltaY * 0.001)))}
        >
            <motion.div
                className="relative w-full h-full origin-center"
                animate={{ scale: zoom, x: pan.x, y: pan.y }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            >
                {/* Connections */}
                {connections.map((conn, index) => {
                    const fromNode = allNodes.find(n => n.id === conn.from);
                    const toNode = allNodes.find(n => n.id === conn.to);
                    return <Connection key={index} fromNode={fromNode} toNode={toNode} />;
                })}

                {/* Nodes */}
                <AnimatePresence>
                    {subjects.map(subject => (
                        <Node key={subject.id} node={subject} type="subject" onSelect={setSelectedSubject} isSelected={selectedSubject === subject.id} />
                    ))}
                    {displayedTopics.map(topic => (
                        <Node key={topic.id} node={topic} type="topic" onSelect={() => {}} isSelected={false} />
                    ))}
                </AnimatePresence>
            </motion.div>
        </motion.div>

        <RadialMenu onAction={(action) => console.log(action)} />
    </div>
  );
}

// Add this to your globals.css or a relevant CSS file
const css = `
.bg-grid-pattern {
  background-image: 
    linear-gradient(hsl(var(--primary)/0.1) 1px, transparent 1px),
    linear-gradient(to right, hsl(var(--primary)/0.1) 1px, transparent 1px);
  background-size: 40px 40px;
}
`;
// You can inject this CSS via a style tag or add it to globals.css
if (typeof window !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.innerHTML = css;
  document.head.appendChild(styleTag);
}
