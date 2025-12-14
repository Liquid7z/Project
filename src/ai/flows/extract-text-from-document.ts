
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
import {getDocument, GlobalWorkerOptions, version} from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';

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
    
    const documentDataBase64 = input.documentDataUri.split(',')[1];
    
    if (input.documentDataUri.startsWith('data:application/pdf;base64,')) {
      console.log('Detected PDF document.');
      const pdfData = Buffer.from(documentDataBase64, 'base64');
      
      try {
        const doc = await getDocument({ data: new Uint8Array(pdfData.buffer) }).promise;
        let fullText = '';
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map(item => (item as any).str).join(' ');
        }
        return { extractedText: fullText };
      } catch (e) {
          console.error(e)
          return { extractedText: '' };
      }

    } else if (input.documentDataUri.startsWith('data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,')) {
      console.log('Detected DOCX document.');
      const documentBuffer = Buffer.from(documentDataBase64, 'base64');
      const { value: extractedText } = await mammoth.extractRawText({ buffer: documentBuffer });
      return { extractedText: extractedText };
    } else {
      console.log('Unsupported document type.');
      const fileType = input.documentDataUri.substring(input.documentDataUri.indexOf('/') + 1, input.documentDataUri.indexOf(';'));
      // Fallback for unsupported types, perhaps just return a message
      return { extractedText: `Content from ${fileType} file.` };
    }
  }
);


const extractTextFromDocumentFlow = ai.defineFlow(
  {
    name: 'extractTextFromDocumentFlow',
    inputSchema: ExtractTextFromDocumentInputSchema,
    outputSchema: ExtractTextFromDocumentOutputSchema,
  },
  async input => {
    const response = await extractTextTool(input);
    return response;
  }
);

    

    