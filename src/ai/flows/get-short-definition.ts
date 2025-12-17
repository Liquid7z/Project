'use server';
/**
 * @fileOverview A flow to get a short, concise definition of a topic.
 *
 * - getShortDefinition - A function that returns a brief definition.
 * - GetShortDefinitionInput - The input type for the function.
 * - GetShortDefinitionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetShortDefinitionInputSchema = z.object({
  topic: z.string().describe('The specific topic to define.'),
  context: z.string().describe('The broader subject for context.'),
});
export type GetShortDefinitionInput = z.infer<typeof GetShortDefinitionInputSchema>;

const GetShortDefinitionOutputSchema = z.object({
  definition: z
    .string()
    .describe('A single, concise sentence defining the topic.'),
});
export type GetShortDefinitionOutput = z.infer<typeof GetShortDefinitionOutputSchema>;

export async function getShortDefinition(
  input: GetShortDefinitionInput
): Promise<GetShortDefinitionOutput> {
  return getShortDefinitionFlow(input);
}

const getShortDefinitionFlow = ai.defineFlow(
  {
    name: 'getShortDefinitionFlow',
    inputSchema: GetShortDefinitionInputSchema,
    outputSchema: GetShortDefinitionOutputSchema,
  },
  async ({topic, context}) => {
    const prompt = `In a single, concise sentence, define "${topic}" within the context of "${context}".`;
    
    const llmResponse = await ai.generate({
        prompt: prompt,
        model: 'googleai/gemini-2.5-flash',
        output: {
            schema: GetShortDefinitionOutputSchema,
        }
    });
    
    const output = llmResponse.output;
    if (!output) {
      throw new Error('Failed to get a definition.');
    }
    return output;
  }
);
