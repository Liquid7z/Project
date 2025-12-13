'use server';
/**
 * @fileOverview Extracts text from a document (PDF/DOCX) using a tool.
 *
 * - extractTextFromDocument - A function that handles the text extraction process.
 * - ExtractTextFromDocumentInput - The input type for the extractTextFromDocument function.
 * - ExtractTextFromDocumentOutput - The return type for the extractTextFromDocument function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import * as fs from 'fs';

const ExtractTextFromDocumentInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      "A document (PDF or DOCX), as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractTextFromDocumentInput = z.infer<typeof ExtractTextFromDocumentInputSchema>;

const ExtractTextFromDocumentOutputSchema = z.object({
  extractedText: z.string().describe('The extracted text from the document.'),
});
export type ExtractTextFromDocumentOutput = z.infer<typeof ExtractTextFromDocumentOutputSchema>;

export async function extractTextFromDocument(input: ExtractTextFromDocumentInput): Promise<ExtractTextFromDocumentOutput> {
  return extractTextFromDocumentFlow(input);
}

const extractTextTool = ai.defineTool({
    name: 'extractText',
    description: 'Extracts text from a document provided as a data URI.',
    inputSchema: ExtractTextFromDocumentInputSchema,
    outputSchema: ExtractTextFromDocumentOutputSchema,
  },
  async (input) => {
    // Simulate text extraction.  In a real application, this would use a library
    // like PDF.js or mammoth.js to extract text from the document.
    // For this example, we'll just return a placeholder.
    const documentDataBase64 = input.documentDataUri.split(',')[1];
    const documentBuffer = Buffer.from(documentDataBase64, 'base64');

    // Basic check for file type based on data URI.
    if (input.documentDataUri.startsWith('data:application/pdf;base64,')) {
      console.log('Detected PDF document.');
      // In a real implementation, use PDF.js to extract text from documentBuffer.
      return { extractedText: 'Extracted text from PDF document.' };
    } else if (input.documentDataUri.startsWith('data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,')) {
      console.log('Detected DOCX document.');
      // In a real implementation, use mammoth.js to extract text from documentBuffer.
      return { extractedText: 'Extracted text from DOCX document.' };
    } else {
      console.log('Unsupported document type.');
      return { extractedText: 'Unsupported document type.' };
    }
  }
);

const extractTextFromDocumentPrompt = ai.definePrompt({
  name: 'extractTextFromDocumentPrompt',
  tools: [extractTextTool],
  prompt: `You are a helpful assistant designed to extract text from a document.

  The user will provide a document. Extract the text from the document, and return it to the user.
  Use the extractText tool to extract the text from the document.
  `,
});

const extractTextFromDocumentFlow = ai.defineFlow(
  {
    name: 'extractTextFromDocumentFlow',
    inputSchema: ExtractTextFromDocumentInputSchema,
    outputSchema: ExtractTextFromDocumentOutputSchema,
  },
  async input => {
    const {output} = await extractTextFromDocumentPrompt(input);
    return output!;
  }
);
