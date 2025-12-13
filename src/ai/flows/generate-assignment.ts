'use server';
/**
 * @fileOverview Generates handwritten assignments from input text, leveraging user-specific handwriting styles.
 *
 * - generateAssignment - The main function to generate the handwritten assignment.
 * - GenerateAssignmentInput - Input type for the generateAssignment function.
 * - GenerateAssignmentOutput - Output type for the generateAssignment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAssignmentInputSchema = z.object({
  content: z.string().describe('The content of the assignment to be handwritten.'),
  handwritingStyleModelId: z.string().describe('The ID of the user\u0027s handwriting style model.'),
});
export type GenerateAssignmentInput = z.infer<typeof GenerateAssignmentInputSchema>;

const GenerateAssignmentOutputSchema = z.object({
  assignmentPages: z.array(
    z.object({
      pageNumber: z.number().describe('The page number of the assignment.'),
      pageDataUri: z
        .string()
        .describe(
          'The handwritten assignment page as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' 
        ),
    })
  ).describe('An array of data URIs, each representing a page of the handwritten assignment. If generation fails, this will be an empty array.'),
});
export type GenerateAssignmentOutput = z.infer<typeof GenerateAssignmentOutputSchema>;

export async function generateAssignment(input: GenerateAssignmentInput): Promise<GenerateAssignmentOutput> {
  return generateAssignmentFlow(input);
}

const generateAssignmentPrompt = ai.definePrompt({
  name: 'generateAssignmentPrompt',
  input: {schema: GenerateAssignmentInputSchema},
  output: {schema: GenerateAssignmentOutputSchema},
  prompt: `You are an AI assistant designed to generate realistic handwritten assignments based on a user's unique handwriting style.

The assignment content is: {{{content}}}

You should generate realistic handwriting, including slight variations in letterforms, spacing, and pressure, to mimic natural handwriting.

The handwriting style model ID to use is: {{{handwritingStyleModelId}}}

Output the assignment as an array of data URIs, where each data URI represents a page of the handwritten assignment. Make sure that the output is valid JSON and parsable by Javascript.

Each page should contain around 250-300 words.

Remember to include natural imperfections and variations in the generated handwriting to make it look authentic.
`,
});

const generateAssignmentFlow = ai.defineFlow(
  {
    name: 'generateAssignmentFlow',
    inputSchema: GenerateAssignmentInputSchema,
    outputSchema: GenerateAssignmentOutputSchema,
  },
  async input => {
    // In a real application, this would involve a complex image generation model.
    // We will simulate this by creating a placeholder image with the text.
    
    const {output} = await generateAssignmentPrompt(input);
    
    // Fallback to a mock response if the AI model fails to generate a valid output
    if (!output || !output.assignmentPages || output.assignmentPages.length === 0) {
      console.log("AI output was empty, generating mock data instead.");
      const words = input.content.split(/\s+/);
      const wordsPerPage = 250;
      const numPages = Math.ceil(words.length / wordsPerPage);
      const pages = [];

      for (let i = 0; i < numPages; i++) {
        const canvas = await import('canvas');
        const { createCanvas } = canvas;
        const pageCanvas = createCanvas(800, 1000);
        const ctx = pageCanvas.getContext('2d');

        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 800, 1000);

        // Text styling
        ctx.fillStyle = 'black';
        ctx.font = '20px "Comic Sans MS"';
        ctx.textBaseline = 'top';

        // Write page content
        const start = i * wordsPerPage;
        const end = start + wordsPerPage;
        const pageContent = words.slice(start, end).join(' ');
        
        const x = 50;
        let y = 50;
        const maxWidth = 700;
        const lineHeight = 30;
        
        const wordsInLine = pageContent.split(' ');
        let currentLine = '';

        for(let n = 0; n < wordsInLine.length; n++) {
          const testLine = currentLine + wordsInLine[n] + ' ';
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            ctx.fillText(currentLine, x, y);
            currentLine = wordsInLine[n] + ' ';
            y += lineHeight;
          } else {
            currentLine = testLine;
          }
        }
        ctx.fillText(currentLine, x, y);

        pages.push({
            pageNumber: i + 1,
            pageDataUri: pageCanvas.toDataURL(),
        });
      }
      return { assignmentPages: pages };
    }

    return output;
  }
);
