'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Atom, FlaskConical, History, PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const initialSubjects = [
  { name: 'Physics', icon: <Atom className="w-12 h-12" />, href: '/dashboard/notes/physics', description: 'Quantum mechanics, relativity, and classical physics.' },
  { name: 'Chemistry', icon: <FlaskConical className="w-12 h-12" />, href: '/dashboard/notes/chemistry', description: 'Organic, inorganic, and physical chemistry.' },
  { name: 'History', icon: <History className="w-12 h-12" />, href: '/dashboard/notes/history', description: 'Ancient civilizations, world wars, and modern history.' },
];

export default function NotesHubPage() {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectDesc, setNewSubjectDesc] = useState('');
  
  const handleCreateSubject = () => {
    if (!newSubjectName) return;

    const newSubject = {
      name: newSubjectName,
      icon: <Atom className="w-12 h-12" />,
      href: `/dashboard/notes/${newSubjectName.toLowerCase()}`,
      description: newSubjectDesc,
    };

    setSubjects(prev => [...prev, newSubject]);
    setIsModalOpen(false);
    setNewSubjectName('');
    setNewSubjectDesc('');
  };

  return (
    <div className="p-4 md:p-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-headline text-glow">Select Subject</h1>
          <p className="text-muted-foreground">Choose a subject to access your study materials.</p>
        </div>
        <Button variant="glow" onClick={() => setIsModalOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Subject
        </Button>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {subjects.map((subject, index) => (
            <Link href={subject.href} key={subject.name} passHref>
              <motion.div
                className="group relative p-6 rounded-lg glass-pane cursor-pointer overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-accent rounded-lg transition-all duration-300 group-hover:shadow-[0_0_20px_theme(colors.accent/0.7)]" />
                <div className="light-sweep" />
                <div className="flex items-center gap-4">
                   <div className="text-accent transition-transform duration-300 group-hover:scale-110">
                    {subject.icon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-headline font-bold">{subject.name}</h2>
                    <p className="text-sm text-muted-foreground line-clamp-2">{subject.description}</p>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </AnimatePresence>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="glass-pane">
          <DialogHeader>
            <DialogTitle className="font-headline">Create New Subject</DialogTitle>
            <DialogDescription>
              This will create a new hub for your notes, syllabus, and papers.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="subject-name">Subject Name</Label>
              <Input
                id="subject-name"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="e.g., Astrophysics"
                className="bg-background/50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subject-description">Description (Optional)</Label>
              <Textarea
                id="subject-description"
                value={newSubjectDesc}
                onChange={(e) => setNewSubjectDesc(e.target.value)}
                placeholder="A brief summary of the subject."
                className="bg-background/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="glow" onClick={handleCreateSubject}>Create Subject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
