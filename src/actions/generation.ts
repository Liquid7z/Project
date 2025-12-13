'use server';

import { analyzeHandwritingStyle, AnalyzeHandwritingStyleInput } from '@/ai/flows/analyze-handwriting-style';
import { extractTextFromDocument, ExtractTextFromDocumentInput } from '@/ai/flows/extract-text-from-document';
import { generateAssignment, GenerateAssignmentInput, GenerateAssignmentOutput } from '@/ai/flows/generate-assignment';
import { z } from 'zod';

export async function analyzeStyleAction(input: AnalyzeHandwritingStyleInput): Promise<{ styleModelId: string }> {
  // In a real app, you might want to add more robust error handling and validation.
  return await analyzeHandwritingStyle(input);
}

export async function extractTextAction(input: ExtractTextFromDocumentInput): Promise<{ extractedText: string }> {
  return await extractTextFromDocument(input);
}

export async function generateAssignmentAction(input: GenerateAssignmentInput): Promise<GenerateAssignmentOutput> {
  // The real AI flow will be called here.
  // Note: The actual AI model for handwriting generation might be a placeholder.
  // Depending on the setup, it may return a simulated image like the previous mock.
  return await generateAssignment(input);
}
