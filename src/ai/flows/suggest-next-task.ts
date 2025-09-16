'use server';

/**
 * @fileOverview Suggests the next most important task from a list, considering effort, importance, and deadline.
 *
 * - suggestNextTask - A function that suggests the next task to focus on.
 * - SuggestNextTaskInput - The input type for the suggestNextTask function.
 * - SuggestNextTaskOutput - The return type for the suggestNextTask function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestNextTaskInputSchema = z.object({
  tasks: z.array(
    z.object({
      task: z.string().describe('The description of the task.'),
      effort: z.number().describe('The estimated effort required to complete the task (1-10).'),
      importance: z.number().describe('The importance of the task (1-10).'),
      deadline: z.string().describe('The deadline for the task (YYYY-MM-DD).'),
    })
  ).describe('A list of tasks to prioritize.'),
});
export type SuggestNextTaskInput = z.infer<typeof SuggestNextTaskInputSchema>;

const SuggestNextTaskOutputSchema = z.object({
  nextTask: z.string().describe('The task that should be prioritized next.'),
  reasoning: z.string().describe('The reasoning behind the suggestion.'),
});
export type SuggestNextTaskOutput = z.infer<typeof SuggestNextTaskOutputSchema>;

export async function suggestNextTask(input: SuggestNextTaskInput): Promise<SuggestNextTaskOutput> {
  return suggestNextTaskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestNextTaskPrompt',
  input: {schema: SuggestNextTaskInputSchema},
  output: {schema: SuggestNextTaskOutputSchema},
  prompt: `You are a task prioritization expert. Given a list of tasks with their effort, importance, and deadline, you will suggest the next most important task to focus on.

Here are the tasks:
{{#each tasks}}
- Task: {{this.task}}
  - Effort: {{this.effort}}
  - Importance: {{this.importance}}
  - Deadline: {{this.deadline}}
{{/each}}

Consider the effort required, the importance of the task, and the approaching deadline when making your suggestion. Shorter deadlines should increase the priority.

Next Task: {{nextTask}}
Reasoning: {{reasoning}}`,
});

const suggestNextTaskFlow = ai.defineFlow(
  {
    name: 'suggestNextTaskFlow',
    inputSchema: SuggestNextTaskInputSchema,
    outputSchema: SuggestNextTaskOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
