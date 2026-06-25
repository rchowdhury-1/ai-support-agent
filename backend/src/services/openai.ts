import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Message = { role: 'user' | 'assistant'; content: string };

export async function generateResponse(systemPrompt: string, messages: Message[]): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    max_tokens: 1024,
    temperature: 0.7,
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error('No response from OpenAI');
  return text;
}
