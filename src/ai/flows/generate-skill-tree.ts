'use server';
/**
 * @fileOverview AI flow for generating a skill tree from a topic.
 *
 * - generateSkillTreeFromTopic - Generates a hierarchical structure of subjects and notes.
 * - GenerateSkillTreeInput - Input schema for the flow.
 * - GenerateSkillTreeOutput - Output schema for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define Zod schema for a single node in the skill tree
const SkillTreeNodeSchema = z.object({
  id: z.string().describe('A unique identifier for the node (e.g., "quantum-mechanics").'),
  label: z.string().describe('The display name of the topic (e.g., "Quantum Mechanics").'),
  type: z.enum(['subject', 'note']).describe('The type of node, either a main subject or a detailed note/sub-topic.'),
  isPlaceholder: z.boolean().optional().describe('True if this node is a placeholder and not a real entity yet.'),
});

// Define Zod schema for an edge connecting two nodes
const SkillTreeEdgeSchema = z.object({
  id: z.string().describe('A unique identifier for the edge (e.g., "subject-1->note-2").'),
  source: z.string().describe('The ID of the source node.'),
  target: z.string().describe('The ID of the target node.'),
});

// Define Zod schemas for the flow's input and output
export const GenerateSkillTreeInputSchema = z.object({
  topic: z.string().describe('The central topic for which to generate a skill tree.'),
});
export type GenerateSkillTreeInput = z.infer<typeof GenerateSkillTreeInputSchema>;

export const GenerateSkillTreeOutputSchema = z.object({
  nodes: z.array(SkillTreeNodeSchema).describe('A list of all the subjects and sub-topics (notes) in the skill tree.'),
  edges: z.array(SkillTreeEdgeSchema).describe('A list of all the connections between the nodes.'),
});
export type GenerateSkillTreeOutput = z.infer<typeof GenerateSkillTreeOutputSchema>;


const generateSkillTreePrompt = ai.definePrompt({
  name: 'generateSkillTreePrompt',
  input: { schema: GenerateSkillTreeInputSchema },
  output: { schema: GenerateSkillTreeOutputSchema },
  prompt: `You are an expert curriculum designer and knowledge organizer. Your task is to generate a structured skill tree for a given topic.

Topic: "{{topic}}"

1.  Start by identifying 2-4 main pillars or parent subjects for the given topic. These will be your 'subject' nodes.
2.  For each parent subject, generate 3-5 sub-topics or key concepts. These will be your 'note' nodes.
3.  Structure the output as a valid JSON object containing 'nodes' and 'edges'.
4.  Each node must have a unique 'id', a 'label', and a 'type' ('subject' or 'note'). Use slug-case for IDs.
5.  Each edge must have a unique 'id', a 'source' (the parent subject's ID), and a 'target' (the child note's ID).
6.  Ensure all generated nodes are connected. There should be no orphaned nodes.

Example for the topic "Machine Learning":
{
  "nodes": [
    { "id": "supervised-learning", "label": "Supervised Learning", "type": "subject" },
    { "id": "unsupervised-learning", "label": "Unsupervised Learning", "type": "subject" },
    { "id": "regression", "label": "Regression", "type": "note" },
    { "id": "classification", "label": "Classification", "type": "note" },
    { "id": "clustering", "label": "Clustering", "type": "note" }
  ],
  "edges": [
    { "id": "edge-supervised-regression", "source": "supervised-learning", "target": "regression" },
    { "id": "edge-supervised-classification", "source": "supervised-learning", "target": "classification" },
    { "id": "edge-unsupervised-clustering", "source": "unsupervised-learning", "target": "clustering" }
  ]
}

Now, generate the skill tree for the topic: "{{topic}}".
`,
});


const generateSkillTreeFlow = ai.defineFlow(
  {
    name: 'generateSkillTreeFlow',
    inputSchema: GenerateSkillTreeInputSchema,
    outputSchema: GenerateSkillTreeOutputSchema,
  },
  async (input) => {
    const { output } = await generateSkillTreePrompt(input);
    
    if (!output) {
        throw new Error('AI failed to generate a skill tree.');
    }
    
    // Mark all generated nodes as placeholders
    const placeholderNodes = output.nodes.map(node => ({ ...node, isPlaceholder: true }));

    return {
        nodes: placeholderNodes,
        edges: output.edges,
    };
  }
);


// Wrapper function to be called from server actions
export async function generateSkillTreeFromTopic(input: GenerateSkillTreeInput): Promise<GenerateSkillTreeOutput> {
  return generateSkillTreeFlow(input);
}
