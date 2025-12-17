
'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const ExplainTopicInputSchema = z.object({
  topic: z.string().describe('The topic or question the user wants to discuss.'),
  history: z.array(MessageSchema).optional().describe('The conversation history.'),
});
export type ExplainTopicInput = z.infer<typeof ExplainTopicInputSchema>;

const ExplainTopicOutputSchema = z.object({
  response: z.string().describe('The AI\'s conversational response.'),
});
export type ExplainTopicOutput = z.infer<typeof ExplainTopicOutputSchema>;


export async function explainTopic(input: ExplainTopicInput): Promise<ExplainTopicOutput> {
    return explainTopicFlow(input);
}

const explainTopicFlow = ai.defineFlow(
    {
        name: 'explainTopicFlow',
        inputSchema: ExplainTopicInputSchema,
        outputSchema: ExplainTopicOutputSchema,
    },
    async (input) => {
        const { topic, history } = input;
        
        const prompt: Array<{ role: 'system' | 'user' | 'model', text: string }> = [
            {
                role: 'system',
                text: `You are an expert educator and versatile AI assistant. Your goal is to provide clear, conversational, and accurate explanations on any topic the user asks about. You can handle a wide range of requests, including writing code, explaining complex concepts in science, history, or engineering, and providing guidance on building projects.

When responding:
- Keep your tone conversational and helpful.
- Use markdown for formatting, especially for code blocks, lists, and emphasis.
- If asked for code, specify the language (e.g., \`\`\`python).
- Break down complex topics into smaller, easy-to-understand parts.
- If the user's query is ambiguous, ask for clarification.
- You can respond with "I'm not sure about that. Could you provide more details?" if the request is out of scope.`
            },
        ];

        if(history) {
            prompt.push(...history.map(h => ({ role: h.role, text: h.content })));
        }

        prompt.push({ role: 'user', text: topic });

        const llmResponse = await ai.generate({
            prompt: prompt.map(m => ({ role: m.role, text: m.text })),
            model: 'googleai/gemini-2.5-flash',
            config: {
                temperature: 0.5,
            },
        });
        
        return {
            response: llmResponse.text,
        };
    }
);
