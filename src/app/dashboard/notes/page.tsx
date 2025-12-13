'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Edit, FileText, FileUp, ImageIcon, Plus, Printer, Save, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { FileUploader } from '@/components/file-uploader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';

const mockSubjects = [
  { id: 'physics', name: 'Physics', description: 'Classical and quantum mechanics.' },
  { id: 'chemistry', name: 'Chemistry', description: 'The study of matter and its properties.' },
  { id: 'history', name: 'History', description: 'The study of past events.' },
];

const mockNotes = {
  physics: [
    { id: 1, type: 'text', content: 'Newton\'s laws of motion are three physical laws that, together, laid the foundation for classical mechanics.' },
    { id: 2, type: 'image', url: 'https://picsum.photos/seed/physics1/400/300', name: 'diagram.jpg' },
  ],
  chemistry: [
    { id: 3, type: 'pdf', name: 'Periodic Table.pdf', pages: 1 },
  ],
  history: [],
};

const NoteCard = ({ note, onEdit, onDelete }: { note: any, onEdit: (id: number) => void, onDelete: (id: number) => void }) => {
  const noteIcons = {
    text: <FileText className="w-6 h-6 text-accent" />,
    image: <ImageIcon className="w-6 h-6 text-accent" />,
    pdf: <FileText className="w-6 h-6 text-accent" />,
    document: <FileText className="w-6 h-6 text-accent" />,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative group"
    >
      <Card className="bg-background/50 h-full flex flex-col transition-all border-transparent hover:border-accent hover:scale-[1.02] glass-pane">
        <CardContent className="p-4 flex-1">
          <div className="flex items-start gap-4">
            {noteIcons[note.type as keyof typeof noteIcons]}
            <div className="flex-1">
              {note.type === 'text' && <p className="text-sm text-muted-foreground line-clamp-3">{note.content}</p>}
              {note.type === 'image' && (
                <div className="w-full aspect-video rounded-md overflow-hidden relative">
                  <img src={note.url} alt={note.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-bold">{note.name}</span>
                  </div>
                </div>
              )}
              {(note.type === 'pdf' || note.type === 'document') && (
                <div>
                  <p className="font-semibold">{note.name}</p>
                  {note.pages && <p className="text-xs text-muted-foreground">{note.pages} pages</p>}
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onEdit(note.id)}><Edit className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => onDelete(note.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      </Card>
    </motion.div>
  );
};


const NoteContentBlock = ({ block, onUpdate, onDelete }: { block: any, onUpdate: (id: number, content: any) => void, onDelete: (id: number) => void }) => {
  
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(block.id, { ...block, content: e.target.value });
  };
  
  const handleFileChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      onUpdate(block.id, { ...block, url: e.target?.result, name: file.name, content: file.name });
    };
    reader.readAsDataURL(file);
  };
  
  return (
    <Card className="mb-4 glass-pane overflow-hidden">
      <CardContent className="p-4 relative">
        {block.type === 'text' && (
          <Textarea 
            value={block.content}
            onChange={handleContentChange}
            placeholder="Start writing your note..."
            className="bg-transparent border-0 focus-visible:ring-0 min-h-[100px]"
          />
        )}
        {(block.type === 'image' || block.type === 'pdf' || block.type === 'document') && (
          <div>
            {block.content ? (
                <div className="flex items-center gap-2">
                    {block.type === 'image' ? <ImageIcon/> : <FileText />}
                    <p>{block.content}</p>
                </div>
            ) : (
              <FileUploader onFileUpload={handleFileChange} />
            )}
          </div>
        )}
        <div className="absolute top-2 right-2">
            <Button variant="ghost" size="icon" onClick={() => onDelete(block.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
        </div>
      </CardContent>
    </Card>
  );
};


const SubjectHub = ({ onSelectSubject }: { onSelectSubject: (id: string) => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
  >
    <AnimatePresence>
      {mockSubjects.map(subject => (
        <motion.div
          key={subject.id}
          layoutId={`subject-card-${subject.id}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => onSelectSubject(subject.id)}
          className="cursor-pointer"
        >
          <Card className="group glass-pane light-sweep h-full">
            <CardHeader>
              <CardTitle className="font-headline text-glow">{subject.name}</CardTitle>
              <CardDescription>{subject.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-accent">3 Topics, 12 Notes</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </AnimatePresence>
  </motion.div>
);

const SubjectDetail = ({ subjectId, onBack }: { subjectId: string, onBack: () => void }) => {
  const subject = mockSubjects.find(s => s.id === subjectId)!;
  const [activeTab, setActiveTab] = useState('notes');
  const [notes, setNotes] = useState(mockNotes[subjectId as keyof typeof mockNotes] || []);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const addNoteBlock = (type: string) => {
    const newBlock = { id: Date.now(), type, content: '' };
    setNotes(prev => [newBlock, ...prev]);
    setIsModalOpen(false);
  };
  
  const updateNoteBlock = (id: number, content: any) => {
     setNotes(prev => prev.map(n => n.id === id ? content : n));
  };
  
  const deleteNoteBlock = (id: number) => {
      setNotes(prev => prev.filter(n => n.id !== id));
  };


  return (
    <motion.div layoutId={`subject-card-${subjectId}`}>
      <Card className="glass-pane">
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft /></Button>
          <div>
            <CardTitle className="font-headline text-glow">{subject.name}</CardTitle>
            <CardDescription>{subject.description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex border-b mb-4">
            <button 
                onClick={() => setActiveTab('notes')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'notes' ? 'text-accent border-b-2 border-accent' : 'text-muted-foreground'}`}
            >
                Notes
            </button>
            <button 
                onClick={() => setActiveTab('syllabus')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'syllabus' ? 'text-accent border-b-2 border-accent' : 'text-muted-foreground'}`}
            >
                Syllabus
            </button>
             <button 
                onClick={() => setActiveTab('papers')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'papers' ? 'text-accent border-b-2 border-accent' : 'text-muted-foreground'}`}
            >
                Question Papers
            </button>
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
            >
                {activeTab === 'notes' && (
                    <div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {notes.map(note => (
                                <NoteContentBlock key={note.id} block={note} onUpdate={updateNoteBlock} onDelete={deleteNoteBlock} />
                            ))}
                        </div>
                        <Button variant="glow" onClick={() => setIsModalOpen(true)} className="mt-4"><Plus className="mr-2"/> Add Note</Button>
                    </div>
                )}
                {activeTab === 'syllabus' && <p>Syllabus content goes here.</p>}
                {activeTab === 'papers' && <p>Question papers go here.</p>}
            </motion.div>
          </AnimatePresence>
          
        </CardContent>
      </Card>
      
       <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="glass-pane">
          <DialogHeader>
            <DialogTitle className="font-headline">Create New Note</DialogTitle>
            <DialogDescription>Select the type of content you want to add.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
              <Button variant="outline" className="h-24 flex-col" onClick={() => addNoteBlock('text')}><FileText className="w-8 h-8 mb-2"/>Text Note</Button>
              <Button variant="outline" className="h-24 flex-col" onClick={() => addNoteBlock('image')}><ImageIcon className="w-8 h-8 mb-2"/>Image</Button>
              <Button variant="outline" className="h-24 flex-col" onClick={() => addNoteBlock('pdf')}><FileText className="w-8 h-8 mb-2"/>PDF</Button>
              <Button variant="outline" className="h-24 flex-col" onClick={() => addNoteBlock('document')}><FileUp className="w-8 h-8 mb-2"/>Document</Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};


export default function NotesPage() {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  return (
    <div className="p-0">
      <AnimatePresence mode="wait">
        {selectedSubject ? (
          <SubjectDetail 
            key={selectedSubject}
            subjectId={selectedSubject} 
            onBack={() => setSelectedSubject(null)} 
          />
        ) : (
          <SubjectHub key="hub" onSelectSubject={setSelectedSubject} />
        )}
      </AnimatePresence>
    </div>
  );
}
