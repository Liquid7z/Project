
'use server';
/**
 * @fileOverview AI flow for explaining a topic.
 *
 * - explainTopic - A function that returns a concise explanation of a topic.
 * - ExplainTopicInput - The input type for the explainTopic function.
 * - ExplainTopicOutput - The return type for the explainTopic function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExplainTopicInputSchema = z.object({
  topic: z.string().describe('The topic to be explained.'),
});
export type ExplainTopicInput = z.infer<typeof ExplainTopicInputSchema>;

const ExplainTopicOutputSchema = z.object({
  explanation: z.string().describe('A concise explanation of the topic, in 1-2 sentences.'),
});
export type ExplainTopicOutput = z.infer<typeof ExplainTopicOutputSchema>;

export async function explainTopic(input: ExplainTopicInput): Promise<ExplainTopicOutput> {
  return explainTopicFlow(input);
}

const explainTopicPrompt = ai.definePrompt({
  name: 'explainTopicPrompt',
  input: { schema: ExplainTopicInputSchema },
  output: { schema: ExplainTopicOutputSchema },
  prompt: `You are a helpful AI assistant. Provide a concise, one to two-sentence explanation for the following topic: "{{topic}}".`,
});


const explainTopicFlow = ai.defineFlow(
  {
    name: 'explainTopicFlow',
    inputSchema: ExplainTopicInputSchema,
    outputSchema: ExplainTopicOutputSchema,
  },
  async (input) => {
    const { output } = await explainTopicPrompt(input);
    if (!output) {
      return { explanation: 'Could not generate an explanation for this topic.' };
    }
    return output;
  }
);
