

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader, Send, ZoomIn, ZoomOut, ArrowRight, Save, BookOpen, Library } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { generateSkillTreeAction, explainTopicAction, getShortDefinitionAction } from '@/actions/generation';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatView } from './chat-view';
import type { Message } from './chat-view';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SaveNoteDialog } from '@/components/save-note-dialog';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';


// Type definitions for the skill tree
interface Node {
  id: string;
  label: string;
  type: 'root' | 'pillar' | 'concept' | 'detail' | 'sub-detail';
  children?: Node[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  definition?: string;
}

interface Edge {
  source: string;
  target: string;
}

const nodeDimensions = {
  root: { width: 180, height: 60 },
  pillar: { width: 170, height: 56 },
  concept: { width: 160, height: 52 },
  detail: { width: 150, height: 48 },
  'sub-detail': { width: 140, height