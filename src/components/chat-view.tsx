'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Message {
  role: 'user' | 'model';
  content: string;
}

interface ChatViewProps {
  messages: Message[];
  isLoading: boolean;
}

export function ChatView({ messages, isLoading }: ChatViewProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {messages.map((message, index) => (
        <div
          key={index}
          className={cn(
            'flex items-start gap-4',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}
        >
          {message.role === 'model' && (
            <Avatar className="w-8 h-8 border">
              <AvatarFallback>
                <Bot />
              </AvatarFallback>
            </Avatar>
          )}
          <div
            className={cn(
              'max-w-xl rounded-lg p-3 prose prose-sm dark:prose-invert max-w-none prose-p:text-muted-foreground prose-headings:text-foreground',
              message.role === 'user'
                ? 'bg-primary/20 text-primary-foreground'
                : 'bg-secondary'
            )}
            dangerouslySetInnerHTML={{ __html: message.content }}
          />
          {message.role === 'user' && (
            <Avatar className="w-8 h-8 border">
              <AvatarFallback>
                <User />
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      ))}
      {isLoading && (
        <div className="flex items-start gap-4 justify-start">
          <Avatar className="w-8 h-8 border">
            <AvatarFallback>
              <Bot />
            </AvatarFallback>
          </Avatar>
          <div className="max-w-xl rounded-lg p-3 bg-secondary animate-pulse">
            <div className="h-4 w-10 rounded-md bg-muted-foreground/30" />
          </div>
        </div>
      )}
    </div>
  );
}
