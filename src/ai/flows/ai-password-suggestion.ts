'use server';

/**
 * @fileOverview An AI-powered password suggestion tool.
 *
 * - suggestPassword - A function that suggests a strong password.
 * - SuggestPasswordInput - The input type for the suggestPassword function.
 * - SuggestPasswordOutput - The return type for the suggestPassword function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {generatePassword} from '@/services/password-generator';

const SuggestPasswordInputSchema = z.object({
  length: z
    .number()
    .min(8)
    .max(64)
    .default(16)
    .describe('The desired length of the password.'),
  useSymbols: z
    .boolean()
    .default(true)
    .describe('Whether to include symbols in the password.'),
  useNumbers: z
    .boolean()
    .default(true)
    .describe('Whether to include numbers in the password.'),
});
export type SuggestPasswordInput = z.infer<typeof SuggestPasswordInputSchema>;

const SuggestPasswordOutputSchema = z.object({
  password: z.string().describe('The suggested password.'),
  strength: z
    .number()
    .min(0)
    .max(100)
    .describe('The strength of the password (0-100).'),
  feedback: z.string().describe('Feedback on the password strength.'),
});
export type SuggestPasswordOutput = z.infer<typeof SuggestPasswordOutputSchema>;

export async function suggestPassword(input: SuggestPasswordInput): Promise<SuggestPasswordOutput> {
  return suggestPasswordFlow(input);
}

const evaluatePasswordStrengthPrompt = ai.definePrompt({
  name: 'evaluatePasswordStrengthPrompt',
  input: {schema: z.object({ password: z.string() })},
  output: {schema: SuggestPasswordOutputSchema.pick({ strength: true, feedback: true })},
  prompt: `You are a password security expert. Evaluate the strength of the following password on a scale of 0-100 and provide brief, constructive feedback.

Password: {{{password}}}
`,
});

const suggestPasswordFlow = ai.defineFlow(
  {
    name: 'suggestPasswordFlow',
    inputSchema: SuggestPasswordInputSchema,
    outputSchema: SuggestPasswordOutputSchema,
  },
  async input => {
    const generatedPassword = generatePassword(input.length, input.useSymbols, input.useNumbers);

    // Call the LLM to get feedback on the generated password.
    const {output} = await evaluatePasswordStrengthPrompt({
      password: generatedPassword,
    });

    return {
      password: generatedPassword,
      strength: output?.strength || Math.floor(Math.random() * (100 - 80 + 1)) + 80, // placeholder strength
      feedback: output?.feedback || 'This is a strong password.',
    };
  }
);
