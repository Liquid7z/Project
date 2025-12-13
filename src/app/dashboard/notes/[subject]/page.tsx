'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  BookOpen, 
  FileQuestion, 
  PlusCircle, 
  Printer, 
  Download,
  Edit,
  Save,
  FileX
} from 'lucide-react';

const mockData = {
  physics: {
    notes: [
      { id: 1, title: 'Newtonian Mechanics', content: 'Newton\'s laws of motion are three physical laws that, together, laid the foundation for classical mechanics.' },
      { id: 2, title: 'Quantum Physics Intro', content: 'Quantum mechanics is a fundamental theory in physics that provides a description of the physical properties of nature at the scale of atoms and subatomic particles.' },
    ],
    syllabus: [
      { id: 1, unit: 'Unit 1: Kinematics', topics: ['Position, displacement, velocity', 'Uniformly accelerated motion'] },
      { id: 2, unit: 'Unit 2: Thermodynamics', topics: ['First Law', 'Second Law', 'Entropy'] },
    ],
    papers: [
      { id: 1, year: 2023, type: 'Mid-Term' },
      { id: 2, year: 2022, type: 'Final Exam' },
    ]
  },
  chemistry: { notes: [], syllabus: [], papers: [] },
  history: { notes: [], syllabus: [], papers: [] },
};

export default function SubjectPage() {
  const params = useParams();
  const subject = params.subject as keyof typeof mockData;
  const [activeTab, setActiveTab] = useState('notes');
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [selectedPaper, setSelectedPaper] = useState<any>(null);

  const subjectData = mockData[subject] || mockData.physics;

  const getSubjectIcon = (subjectName: string) => {
    // This would ideally use a more scalable approach
    if (subjectName === 'physics') return <FileText className="w-8 h-8 text-primary" />;
    if (subjectName === 'chemistry') return <FileText className="w-8 h-8 text-primary" />;
    if (subjectName === 'history') return <FileText className="w-8 h-8 text-primary" />;
    return <FileText className="w-8 h-8 text-primary" />;
  }

  const tabContentVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: "easeIn" } }
  };

  return (
    <div className="flex">
      {/* Left Sidebar HUD */}
      <aside className="fixed top-14 bottom-0 left-0 hidden md:flex flex-col w-64 glass-pane !rounded-l-none !border-t-0 !border-b-0 !border-l-0 pr-4">
          <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-accent/50 via-accent to-accent/50"></div>
          <div className="p-6">
              <h2 className="text-2xl font-headline font-bold capitalize text-glow">{subject}</h2>
              <p className="text-sm text-muted-foreground">Study Hub</p>
          </div>
          <nav className="flex-1 px-4">
              {/* Animated indicators could go here */}
          </nav>
          <div className="p-4 border-t border-border">
            <Button variant="glow" className="w-full">
              <PlusCircle className="mr-2 h-4 w-4"/> New Entry
            </Button>
          </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="border-b border-border sticky top-14 bg-background/80 backdrop-blur-lg z-30">
            <TabsTrigger value="notes"><FileText className="mr-2"/>Notes</TabsTrigger>
            <TabsTrigger value="syllabus"><BookOpen className="mr-2"/>Syllabus</TabsTrigger>
            <TabsTrigger value="papers"><FileQuestion className="mr-2"/>Question Papers</TabsTrigger>
          </TabsList>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={tabContentVariant}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="tab-change-trail p-4 md:p-6"
              >
                  {/* Notes Tab */}
                  {activeTab === 'notes' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {subjectData.notes.map(note => (
                            <motion.div 
                              key={note.id} 
                              className="group relative p-4 rounded-md glass-pane cursor-pointer"
                              whileHover={{ y: -5, boxShadow: "0 0 15px hsl(var(--primary))" }}
                              onClick={() => setSelectedNote(note)}
                            >
                                <h3 className="font-bold font-headline">{note.title}</h3>
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{note.content}</p>
                            </motion.div>
                          ))}
                      </div>
                  )}
                  
                  {/* Syllabus Tab */}
                  {activeTab === 'syllabus' && (
                     <Card className="glass-pane">
                        <CardHeader>
                          <CardTitle className="font-headline flex justify-between items-center">
                            Syllabus
                            <Button variant="outline"><Printer className="mr-2"/> Print</Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                           <Accordion type="single" collapsible className="w-full">
                              {subjectData.syllabus.map(item => (
                                <AccordionItem value={`item-${item.id}`} key={item.id}>
                                  <AccordionTrigger className="hover:no-underline font-bold text-base hover:text-accent">
                                    <div className="flex items-center gap-3">
                                      <div className="w-1.5 h-6 rounded-full bg-accent"></div>
                                      {item.unit}
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="pl-8">
                                    <ul className="list-disc list-outside space-y-2 text-muted-foreground">
                                      {item.topics.map(topic => <li key={topic}>{topic}</li>)}
                                    </ul>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                        </CardContent>
                     </Card>
                  )}

                  {/* Question Papers Tab */}
                  {activeTab === 'papers' && (
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {subjectData.papers.map(paper => (
                           <motion.div 
                            key={paper.id} 
                            className="group relative aspect-w-3 aspect-h-4 rounded-md glass-pane cursor-pointer overflow-hidden p-4 flex flex-col justify-between items-start"
                            whileHover={{ y: -5, boxShadow: "0 0 15px hsl(var(--accent))", transform: 'perspective(800px) rotateY(5deg)' }}
                            onClick={() => setSelectedPaper(paper)}
                          >
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                             <div className="relative z-10">
                               <Badge variant="secondary">{paper.type}</Badge>
                             </div>
                             <div className="relative z-10">
                               <h3 className="font-bold text-lg text-glow">{paper.year}</h3>
                             </div>
                           </motion.div>
                        ))}
                     </div>
                  )}
              </motion.div>
            </AnimatePresence>
        </Tabs>
      </main>

      {/* Note Editor Modal */}
      <AnimatePresence>
      {selectedNote && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedNote(null)}></div>
          <motion.div 
            className="relative w-full max-w-2xl glass-pane rounded-lg"
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50, opacity: 0}}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="p-6">
              <h2 className="font-headline text-2xl font-bold">{selectedNote.title}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground my-2">
                <Save className="w-3 h-3 text-accent animate-pulse" />
                <span className="text-glow">SYNCED</span>
              </div>
            </div>
            <div className="p-6 pt-0">
               <Textarea defaultValue={selectedNote.content} className="h-64 bg-background/70"/>
            </div>
            <div className="p-6 pt-0 flex justify-end">
              <Button onClick={() => setSelectedNote(null)} variant="glow">Done</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Paper Preview Modal */}
      <Dialog open={!!selectedPaper} onOpenChange={(isOpen) => !isOpen && setSelectedPaper(null)}>
        <DialogContent className="max-w-3xl glass-pane">
          <DialogHeader>
            <DialogTitle className="font-headline">{`Question Paper - ${selectedPaper?.year}`}</DialogTitle>
            <DialogDescription>{selectedPaper?.type}</DialogDescription>
          </DialogHeader>
          <div className="h-[70vh] bg-background/50 rounded-md flex items-center justify-center text-muted-foreground">
             <div className="text-center">
              <FileX className="w-16 h-16 mx-auto mb-4"/>
              <p>Paper Preview Unavailable</p>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Dummy components to avoid errors, as these don't exist yet
const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => <div className={className}>{children}</div>;
const CardHeader = ({ className, children }: { className?: string, children: React.ReactNode }) => <div className={className}>{children}</div>;
const CardTitle = ({ className, children }: { className?: string, children: React.ReactNode }) => <h3 className={className}>{children}</h3>;
const CardContent = ({ className, children }: { className?: string, children: React.ReactNode }) => <div className={className}>{children}</div>;
