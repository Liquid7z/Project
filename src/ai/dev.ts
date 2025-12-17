
'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-handwriting-style.ts';
import '@/ai/flows/extract-text-from-document.ts';
import '@/ai/flows/generate-assignment.ts';
import '@/ai/flows/generate-skill-tree.ts';
import '@/ai/flows/explain-topic.ts';
import '@/ai/flows/get-short-definition.ts';
