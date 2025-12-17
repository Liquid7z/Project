
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader, Send, User, Bot } from 'lucide-react';
import { explainTopicAction } from '@/actions/generation';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatViewProps {
  initialTopic: string;
}

export function ChatView({ initialTopic }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialTopic && messages.length === 0) {
      handleInitialTopic(initialTopic);
    }
  }, [initialTopic, messages.length]);

  const handleInitialTopic = async (topic: string) => {
    setIsLoading(true);
    setMessages([{ id: 1, role: 'assistant', content: `Let's talk about **${topic}**. What would you like to know?` }]);
    setIsLoading(false);
  };
  
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if(viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
        // Here you could use a more advanced flow, but for now we'll stick to explainTopic
        const result = await explainTopicAction({ topic: input });
        const assistantMessage: Message = { id: Date.now() + 1, role: 'assistant', content: result.explanation };
        setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
        console.error("Error fetching explanation:", error);
        const errorMessage: Message = { id: Date.now() + 1, role: 'assistant', content: "I'm sorry, I encountered an error. Please try again." };
        setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Card className="h-[70vh] w-full glass-pane flex flex-col">
      <CardContent className="flex-1 flex flex-col p-4 gap-4">
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      'flex items-start gap-3',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <Avatar className="h-8 w-8 bg-accent text-accent-foreground flex-shrink-0">
                        <AvatarFallback><Bot size={20}/></AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        'max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 prose prose-sm dark:prose-invert prose-p:my-2',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      )}
                      dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br />') }}
                    />
                    {message.role === 'user' && (
                      <Avatar className="h-8 w-8 bg-muted text-muted-foreground flex-shrink-0">
                        <AvatarFallback><User size={20}/></AvatarFallback>
                      </Avatar>
                    )}
                  </motion.div>
                ))}
                {isLoading && (
                   <motion.div
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 justify-start"
                   >
                     <Avatar className="h-8 w-8 bg-accent text-accent-foreground flex-shrink-0">
                        <AvatarFallback><Bot size={20}/></AvatarFallback>
                      </Avatar>
                      <div className="bg-secondary text-secondary-foreground rounded-lg px-4 py-3">
                         <Loader className="animate-spin" />
                      </div>
                   </motion.div>
                )}
            </AnimatePresence>
          </div>
        </ScrollArea>
        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t pt-4">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up question..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
