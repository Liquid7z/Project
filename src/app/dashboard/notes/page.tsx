'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Atom, FlaskConical, History } from 'lucide-react';

const subjects = [
  { name: 'Physics', icon: <Atom className="w-12 h-12" />, href: '/dashboard/notes/physics' },
  { name: 'Chemistry', icon: <FlaskConical className="w-12 h-12" />, href: '/dashboard/notes/chemistry' },
  { name: 'History', icon: <History className="w-12 h-12" />, href: '/dashboard/notes/history' },
];

export default function NotesHubPage() {
  return (
    <div className="p-4 md:p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline text-glow">Select Subject</h1>
        <p className="text-muted-foreground">Choose a subject to access your study materials.</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject, index) => (
          <Link href={subject.href} key={subject.name} passHref>
            <motion.div
              className="group relative p-6 rounded-lg glass-pane cursor-pointer overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-accent rounded-lg transition-all duration-300 group-hover:shadow-[0_0_20px_theme(colors.accent/0.7)]" />
              <div className="light-sweep" />
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="mb-4 text-accent transition-transform duration-300 group-hover:scale-110">
                  {subject.icon}
                </div>
                <h2 className="text-2xl font-headline font-bold">{subject.name}</h2>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
