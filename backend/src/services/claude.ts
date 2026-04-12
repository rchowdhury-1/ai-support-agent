import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

type Message = { role: 'user' | 'assistant'; content: string };

export async function callClaude(systemPrompt: string, messages: Message[]): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: systemPrompt,
  });

  // Gemini uses 'model' for assistant role
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMessage.content);
  const text = result.response.text();

  if (!text) throw new Error('No text response from Gemini');
  return text;
}
