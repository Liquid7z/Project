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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { 
  FileText, 
  BookOpen, 
  FileQuestion, 
  PlusCircle, 
  Printer, 
  Download,
  Edit,
  Save,
  FileX,
  ImageIcon,
  File as FileIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type NoteType = 'text' | 'image' | 'pdf' | 'doc';

const mockData = {
  physics: {
    notes: [
      { id: 1, title: 'Newtonian Mechanics', content: 'Newton\'s laws of motion are three physical laws that, together, laid the foundation for classical mechanics.', type: 'text' },
      { id: 2, title: 'Quantum Physics Intro', content: 'Quantum mechanics is a fundamental theory in physics that provides a description of the physical properties of nature at the scale of atoms and subatomic particles.', type: 'text' },
      { id: 3, title: 'Lab Setup', content: '/placeholder.jpg', type: 'image' },
      { id: 4, title: 'Thermodynamics Paper', content: 'thermo.pdf', type: 'pdf' },

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

const noteTypeIcons = {
  text: <FileText className="w-6 h-6 text-primary"/>,
  image: <ImageIcon className="w-6 h-6 text-green-400"/>,
  pdf: <FileIcon className="w-6 h-6 text-red-400"/>,
  doc: <FileIcon className="w-6 h-6 text-blue-400"/>,
}

const FullScreenNoteEditor = ({ noteType, onClose }: { noteType: NoteType, onClose: () => void }) => {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-11/12 max-w-4xl h-[90vh] glass-pane rounded-lg flex flex-col"
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="p-6 border-b border-border flex justify-between items-center">
            <h2 className="font-headline text-2xl font-bold capitalize">{noteType} Note</h2>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
                <Button variant="glow" size="sm">Save Note</Button>
            </div>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">
            <p>Editor for {noteType} note goes here...</p>
            {/* Here you would conditionally render the editor for text, image upload, etc. */}
        </div>
      </motion.div>
    </motion.div>
  );
};


export default function SubjectPage() {
  const params = useParams();
  const subject = params.subject as keyof typeof mockData;
  const [activeTab, setActiveTab] = useState('notes');
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [selectedPaper, setSelectedPaper] = useState<any>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [activeNoteType, setActiveNoteType] = useState<NoteType | null>(null);

  const subjectData = mockData[subject] || mockData.physics;

  const tabContentVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: "easeIn" } }
  };
  
  const handleCreateNote = (type: NoteType) => {
    setActiveNoteType(type);
    setIsNoteModalOpen(false);
    setIsNoteEditorOpen(true);
  };
  
  const getNoteCard = (note: any) => {
    switch(note.type) {
      case 'image':
        return (
          <>
            <h3 className="font-bold font-headline">{note.title}</h3>
            <div className="mt-2 aspect-video w-full rounded-md bg-black overflow-hidden">
               <img src="https://picsum.photos/seed/physics-lab/400/225" alt="note image" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            </div>
          </>
        )
      case 'pdf':
         return (
          <>
            <h3 className="font-bold font-headline">{note.title}</h3>
            <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
              <FileIcon className="w-4 h-4"/>
              <span>{note.content}</span>
            </div>
          </>
        )
      default:
        return (
          <>
            <h3 className="font-bold font-headline">{note.title}</h3>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{note.content}</p>
          </>
        )
    }
  }


  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-3.5rem)]">
      {/* Left Sidebar HUD */}
      <aside className="w-full md:w-64 glass-pane !rounded-none md:!rounded-l-none md:!rounded-t-0 md:!rounded-b-0 md:pr-4 shrink-0">
          <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-accent/50 via-accent to-accent/50 hidden md:block"></div>
          <div className="p-6">
              <h2 className="text-2xl font-headline font-bold capitalize text-glow">{subject}</h2>
              <p className="text-sm text-muted-foreground">Study Hub</p>
          </div>
          <div className="p-4 border-t border-border">
            <Button variant="glow" className="w-full" onClick={() => setIsNoteModalOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4"/> New Note
            </Button>
          </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="border-b border-border sticky top-14 bg-background/80 backdrop-blur-lg z-30 px-4 md:px-6">
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
                          {subjectData.notes.length > 0 ? subjectData.notes.map(note => (
                            <motion.div 
                              key={note.id} 
                              className="group relative p-4 rounded-md glass-pane cursor-pointer"
                              whileHover={{ y: -5, boxShadow: "0 0 15px hsl(var(--primary))" }}
                              onClick={() => setSelectedNote(note)}
                            >
                                <div className="absolute top-3 right-3">{noteTypeIcons[note.type as keyof typeof noteTypeIcons]}</div>
                                {getNoteCard(note)}
                            </motion.div>
                          )) : (
                             <div className="col-span-full text-center py-20 text-muted-foreground">
                                <FileText className="w-16 h-16 mx-auto mb-4"/>
                                <p className="font-bold">No notes yet.</p>
                                <p>Create your first note to get started.</p>
                             </div>
                          )}
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
      
      {/* Create New Note Modal */}
      <Dialog open={isNoteModalOpen} onOpenChange={setIsNoteModalOpen}>
        <DialogContent className="max-w-2xl glass-pane">
          <DialogHeader>
            <DialogTitle className="font-headline">Create New Note</DialogTitle>
            <DialogDescription>
              Choose the type of content you want to add. You can combine multiple types in one note later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
              <motion.div onClick={() => handleCreateNote('text')} whileHover={{y: -5, boxShadow: "0 0 15px hsl(var(--primary))"}} className="p-6 rounded-md glass-pane cursor-pointer text-center">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-primary"/>
                  <h3 className="font-bold">Text Note</h3>
                  <p className="text-sm text-muted-foreground">Write and format rich text.</p>
              </motion.div>
              <motion.div onClick={() => handleCreateNote('image')} whileHover={{y: -5, boxShadow: "0 0 15px hsl(var(--accent))"}} className="p-6 rounded-md glass-pane cursor-pointer text-center">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 text-accent"/>
                  <h3 className="font-bold">Image Note</h3>
                  <p className="text-sm text-muted-foreground">Upload one or more images.</p>
              </motion.div>
              <motion.div onClick={() => handleCreateNote('pdf')} whileHover={{y: -5, boxShadow: "0 0 15px #f59e0b"}} className="p-6 rounded-md glass-pane cursor-pointer text-center">
                  <FileIcon className="w-12 h-12 mx-auto mb-2 text-amber-500"/>
                  <h3 className="font-bold">PDF Note</h3>
                  <p className="text-sm text-muted-foreground">Upload a PDF document.</p>
              </motion.div>
              <motion.div onClick={() => handleCreateNote('doc')} whileHover={{y: -5, boxShadow: "0 0 15px #3b82f6"}} className="p-6 rounded-md glass-pane cursor-pointer text-center">
                  <FileIcon className="w-12 h-12 mx-auto mb-2 text-blue-500"/>
                  <h3 className="font-bold">Document Note</h3>
                  <p className="text-sm text-muted-foreground">Upload Word, PPT, or other files.</p>
              </motion.div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Full Screen Note Editor */}
      <AnimatePresence>
        {isNoteEditorOpen && activeNoteType && (
          <FullScreenNoteEditor 
            noteType={activeNoteType} 
            onClose={() => setIsNoteEditorOpen(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
