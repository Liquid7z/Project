'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Bot, ChevronDown, ChevronUp, Search, Lightbulb, GraduationCap, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { summarizeAndEvaluateTopic, getNextRevisionTopic, explainTopic } from '@/ai/flows/study-coach';


type SearchResult = {
    id: string;
    title: string;
    subjectName: string;
    subjectId: string;
    contentType: string;
    summary: string;
    coverage: 'Well Covered' | 'Partially Covered' | 'Weak';
};

type Suggestion = {
    id: string;
    title: string;
    subjectName: string;
    subjectId: string;
    contentType: string;
    reason: string;
};

const mockSuggestions: Suggestion[] = [
    {
        id: 'note-1',
        title: 'Introduction to Photosynthesis',
        subjectName: 'Biology',
        subjectId: 'bio-123',
        contentType: 'notes',
        reason: 'You haven\'t revised this in a while.'
    },
    {
        id: 'note-2',
        title: 'The Krebs Cycle',
        subjectName: 'Biology',
        subjectId: 'bio-123',
        contentType: 'notes',
        reason: 'Your notes on this topic are very brief.'
    }
];


export function AIStudyCoach() {
    const [isOpen, setIsOpen] = useState(true);
    const [isExpanded, setIsExpanded] = useState(true);
    const [activeTab, setActiveTab] = useState<'search' | 'suggestions' | 'explain'>('suggestions');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
    const [debouncedSearchQuery] = useDebounce(searchQuery, 500);

    const [explanation, setExplanation] = useState('');
    const [isExplaining, setIsExplaining] = useState(false);
    const [explanationQuery, setExplanationQuery] = useState('');

    const router = useRouter();
    const { user, firestore } = useUser();

    React.useEffect(() => {
        const performSearch = async () => {
            if (!debouncedSearchQuery || !user || !firestore) {
                setSearchResults(null);
                return;
            }
            setIsSearching(true);
            try {
                const results = await summarizeAndEvaluateTopic({ userId: user.uid, topic: debouncedSearchQuery });
                
                // This is a simplified mapping. In a real app, you would fetch subject names.
                const mappedResults: SearchResult[] = results.map(r => ({
                    ...r,
                    subjectName: 'Unknown Subject' 
                }));
                setSearchResults(mappedResults);

            } catch (e) {
                console.error("Search failed:", e);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        performSearch();
    }, [debouncedSearchQuery, user, firestore]);

    const handleExplain = async () => {
        if (!explanationQuery || !user) return;
        setIsExplaining(true);
        setExplanation('');
        try {
            const result = await explainTopic({ userId: user.uid, topic: explanationQuery });
            setExplanation(result);
        } catch (e) {
            console.error("Explanation failed:", e);
            setExplanation("Sorry, I couldn't generate an explanation for that topic.");
        } finally {
            setIsExplaining(false);
        }
    };
    
    const navigateToItem = (item: SearchResult | Suggestion) => {
        router.push(`/dashboard/notes/${item.subjectId}/${item.contentType}/${item.id}`);
    };

    if (!isOpen) {
        return (
            <motion.div
                className="fixed bottom-4 right-4 z-50"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Button variant="glow" size="icon" className="rounded-full h-14 w-14 shadow-lg" onClick={() => setIsOpen(true)}>
                    <Bot className="h-6 w-6" />
                </Button>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="fixed bottom-4 right-4 z-50"
            drag
            dragMomentum={false}
            dragConstraints={{ top: 16, left: 16, right: window.innerWidth - 16, bottom: window.innerHeight - 16 }}
        >
            <Card className={cn(
                "glass-pane w-[380px] overflow-hidden transition-all duration-300",
                isExpanded ? "h-[500px]" : "h-[68px]"
            )}>
                <div 
                    className="flex items-center justify-between p-3 cursor-grab active:cursor-grabbing"
                    onDoubleClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center gap-2">
                        <Bot className="h-6 w-6 text-accent" />
                        <h3 className="font-headline text-lg text-glow">AI Study Coach</h3>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsExpanded(!isExpanded)}>
                            {isExpanded ? <ChevronDown /> : <ChevronUp />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                            <X />
                        </Button>
                    </div>
                </div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex flex-col h-full"
                        >
                            <div className="px-3 pb-3">
                                <div className="grid grid-cols-3 gap-1 p-1 rounded-md bg-background/50">
                                    <Button size="sm" variant={activeTab === 'suggestions' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('suggestions')}><Lightbulb className="mr-2" />Suggestions</Button>
                                    <Button size="sm" variant={activeTab === 'search' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('search')}><Search className="mr-2" />Search</Button>
                                    <Button size="sm" variant={activeTab === 'explain' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('explain')}><GraduationCap className="mr-2" />Explain</Button>
                                </div>
                            </div>
                            
                            <ScrollArea className="flex-1 px-3">
                                {activeTab === 'search' && (
                                    <div>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                            <Input 
                                                placeholder="Search your notes..." 
                                                className="pl-10" 
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                            {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
                                        </div>
                                        <div className="mt-4 space-y-3 pb-4">
                                            {searchResults === null && !isSearching && <p className="text-center text-sm text-muted-foreground pt-8">Search for a topic to see coverage.</p>}
                                            {searchResults && searchResults.length === 0 && !isSearching && <p className="text-center text-sm text-muted-foreground pt-8">No results found for "{debouncedSearchQuery}".</p>}
                                            {searchResults && searchResults.map(item => (
                                                <Card key={item.id} className="p-3 bg-background/30 hover:bg-background/50 cursor-pointer" onClick={() => navigateToItem(item)}>
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-semibold text-sm line-clamp-1">{item.title}</h4>
                                                        <Badge variant={item.coverage === 'Well Covered' ? 'default' : item.coverage === 'Partially Covered' ? 'secondary' : 'destructive'} className="text-xs">{item.coverage}</Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">{item.subjectName}</p>
                                                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{item.summary}</p>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {activeTab === 'suggestions' && (
                                     <div className="mt-2 space-y-3 pb-4">
                                         {mockSuggestions.map(item => (
                                             <Card key={item.id} className="p-3 bg-background/30 hover:bg-background/50 cursor-pointer" onClick={() => navigateToItem(item)}>
                                                 <h4 className="font-semibold text-sm">{item.title}</h4>
                                                 <p className="text-xs text-muted-foreground mt-1">{item.subjectName}</p>
                                                 <p className="text-xs mt-2 text-accent/80">{item.reason}</p>
                                             </Card>
                                         ))}
                                     </div>
                                )}
                                {activeTab === 'explain' && (
                                     <div className="space-y-4 pb-4">
                                         <div className="relative">
                                            <Input 
                                                placeholder="What topic do you want explained?" 
                                                value={explanationQuery}
                                                onChange={e => setExplanationQuery(e.target.value)}
                                            />
                                         </div>
                                         <Button onClick={handleExplain} disabled={!explanationQuery || isExplaining} className="w-full">
                                             {isExplaining ? <Loader2 className="animate-spin mr-2"/> : <GraduationCap className="mr-2"/>}
                                             Explain Topic
                                         </Button>
                                         {isExplaining && <p className="text-center text-sm text-muted-foreground">Generating explanation...</p>}
                                         {explanation && (
                                             <Card className="p-3 bg-background/30">
                                                 <div className="prose prose-sm dark:prose-invert max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: explanation }} />
                                             </Card>
                                         )}
                                     </div>
                                )}
                            </ScrollArea>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    );
}
