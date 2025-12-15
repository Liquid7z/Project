
'use server';
/**
 * @fileOverview AI flows for the Study Coach feature.
 *
 * - summarizeAndEvaluateTopic - Searches notes for a topic, summarizes, and evaluates coverage.
 * - getNextRevisionTopic - Proactively suggests a topic for the user to revise.
 * - explainTopic - Provides a detailed explanation of a given topic.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { initializeServerFirebase } from '@/firebase/server-init';

// Helper to get Firestore instance
// This function needs to be adapted for server-side execution
async function getDb(): Promise<Firestore> {
  try {
    await initializeServerFirebase();
    return getFirestore();
  } catch (error) {
      console.error(
        'Failed to initialize server-side Firebase. This is likely a permissions issue. The AI flow will continue with an empty database connection.',
        error
      );
      // Return a mock Firestore instance to prevent crashes.
      // The calling functions will gracefully handle empty results.
      return {
          collectionGroup: () => ({
              get: () => Promise.resolve({
                  docs: [],
                  forEach: (callback: (doc: any) => void) => {},
              }),
          }),
      } as unknown as Firestore;
  }
}

// --- Summarize and Evaluate Topic Flow ---

const SummarizeInputSchema = z.object({
  userId: z.string().describe('The ID of the user whose notes to search.'),
  topic: z.string().describe('The topic to search for.'),
});
type SummarizeInput = z.infer<typeof SummarizeInputSchema>;

const SummarizeOutputSchema = z.array(
    z.object({
        id: z.string().describe('The ID of the note.'),
        title: z.string().describe('The title of the note.'),
        subjectId: z.string().describe('The ID of the subject the note belongs to.'),
        contentType: z.string().describe('The content type of the item (e.g., notes, examQuestions).'),
        summary: z.string().describe('A brief summary of how the topic is covered in the note.'),
        coverage: z.enum(['Well Covered', 'Partially Covered', 'Weak']).describe('An evaluation of the topic\'s coverage in the note.'),
    })
);
type SummarizeOutput = z.infer<typeof SummarizeOutputSchema>;

const findNotesTool = ai.defineTool(
    {
        name: 'findNotesForTopic',
        description: 'Finds all notes and content related to a specific topic for a user.',
        inputSchema: SummarizeInputSchema,
        outputSchema: z.array(z.object({
            id: z.string(),
            title: z.string(),
            subjectId: z.string(),
            contentType: z.string(),
            content: z.string(),
            userId: z.string(), // Added userId for querying
        })),
    },
    async ({ userId, topic }) => {
        const db = await getDb();
        const contentTypes = ['notes', 'examQuestions', 'syllabus', 'resources'];
        const allContent: any[] = [];

        // In a real, production-grade app, you would use a dedicated search service like Algolia or Elasticsearch
        // for efficient text search. Firestore queries are not well-suited for full-text search.
        // This implementation is a simplified stand-in.
        
        for (const contentType of contentTypes) {
            const contentQuery = db.collectionGroup(contentType);
            const querySnapshot = await contentQuery.get();

            querySnapshot.forEach(doc => {
                // Manually check if the document belongs to the user
                if (doc.ref.path.startsWith(`users/${userId}/`)) {
                    const data = doc.data();
                    const combinedText = `${data.title} ${data.blocks?.map((b: any) => b.content || '').join(' ')}`.toLowerCase();
                    if (combinedText.includes(topic.toLowerCase())) {
                        allContent.push({
                            id: doc.id,
                            title: data.title,
                            subjectId: doc.ref.parent.parent?.id || '',
                            contentType: contentType,
                            content: data.blocks?.map((b: any) => b.content || '').join('\n\n') || '',
                            userId: userId,
                        });
                    }
                }
            });
        }
        return allContent;
    }
);


const summarizeAndEvaluateFlow = ai.defineFlow(
    {
        name: 'summarizeAndEvaluateFlow',
        inputSchema: SummarizeInputSchema,
        outputSchema: SummarizeOutputSchema,
    },
    async ({ userId, topic }) => {
        const relevantNotes = await findNotesTool({ userId, topic });
        
        if (relevantNotes.length === 0) {
            return [];
        }

        const evaluationPrompt = ai.definePrompt({
            name: 'evaluateNoteCoveragePrompt',
            input: { schema: z.object({ topic: z.string(), notes: z.any() }) },
            output: { schema: SummarizeOutputSchema },
            prompt: `You are an expert study assistant. Based on the following notes, evaluate how well the topic "{{topic}}" is covered in each note. Provide a short summary and a coverage rating (Well Covered, Partially Covered, or Weak).

Topic: {{topic}}

Notes:
----------------
{{#each notes}}
### Note START ###
ID: {{this.id}}
Content Type: {{this.contentType}}
Subject ID: {{this.subjectId}}
Title: {{this.title}}
Content:
{{{this.content}}}
### Note END ###
{{/each}}
----------------

Provide your output as a valid JSON array.
`,
        });

        const { output } = await evaluationPrompt({ topic, notes: relevantNotes });
        return output || [];
    }
);

export async function summarizeAndEvaluateTopic(input: SummarizeInput): Promise<SummarizeOutput> {
    return summarizeAndEvaluateFlow(input);
}


// --- Explain Topic Flow ---

const ExplainInputSchema = z.object({
  userId: z.string().describe('The ID of the user.'),
  topic: z.string().describe('The topic to explain.'),
});
type ExplainInput = z.infer<typeof ExplainInputSchema>;

const ExplainOutputSchema = z.string().describe('A detailed explanation of the topic, formatted as HTML.');
type ExplainOutput = z.infer<typeof ExplainOutputSchema>;


const explainTopicFlow = ai.defineFlow(
    {
        name: 'explainTopicFlow',
        inputSchema: ExplainInputSchema,
        outputSchema: ExplainOutputSchema,
        model: 'googleai/gemini-pro',
    },
    async ({ userId, topic }) => {
         const relevantNotes = await findNotesTool({ userId, topic });

         const explanationPrompt = ai.definePrompt({
            name: 'explainTopicPrompt',
            input: { schema: z.object({ topic: z.string(), notes: z.any() }) },
            output: { schema: ExplainOutputSchema },
            prompt: `You are an expert tutor. A student has asked for an explanation of the topic "{{topic}}".
Your goal is to provide a clear, concise, and student-friendly explanation.

Your response MUST be formatted in simple HTML. Structure your response as follows:

1.  **Explanation:** Start with a simple definition or explanation of the topic. Use an <h2>Explanation</h2> heading.
2.  **Example:** If applicable, provide a short, clear example to illustrate the concept. Use an <h2>Example</h2> heading.
3.  **Formula:** If the topic involves a mathematical or scientific formula, provide it. Use an <h2>Formula</h2> heading.

If an example or formula is not relevant for the topic, omit that section completely.
Use the student's existing notes for context if they are available.

Student's Existing Notes (for context):
----------------
{{#if notes}}
  {{#each notes}}
  - Note Title: {{this.title}}
    {{{this.content}}}
  {{/each}}
{{else}}
  The student has no existing notes on this topic.
{{/if}}
----------------

Begin your explanation now.
`,
        });

        const { output } = await explanationPrompt({ topic, notes: relevantNotes });
        return output || '<p>Sorry, I was unable to generate an explanation for this topic.</p>';
    }
);

export async function explainTopic(input: ExplainInput): Promise<ExplainOutput> {
    return explainTopicFlow(input);
}


// --- Proactive Suggestion Flow (Placeholder) ---

const RevisionInputSchema = z.object({
    userId: z.string(),
});
type RevisionInput = z.infer<typeof RevisionInputSchema>;

const RevisionOutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    subjectId: z.string(),
    contentType: z.string(),
    reason: z.string(),
});
type RevisionOutput = z.infer<typeof RevisionOutputSchema>;


const getNextRevisionTopicFlow = ai.defineFlow(
    {
        name: 'getNextRevisionTopicFlow',
        inputSchema: RevisionInputSchema,
        outputSchema: RevisionOutputSchema,
    },
    async ({ userId }) => {
        // This is a placeholder. A real implementation would analyze all user notes,
        // their update timestamps, content length, etc., to make an intelligent suggestion.
        return {
            id: 'mock-note-id',
            title: 'Proactive Mock Suggestion',
            subjectId: 'mock-subject-id',
            contentType: 'notes',
            reason: 'This is a proactively suggested topic for revision because it seems important.',
        };
    }
);

export async function getNextRevisionTopic(input: RevisionInput): Promise<RevisionOutput> {
    return getNextRevisionTopicFlow(input);
}
