import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const MODEL = process.env.QWEN_MODEL ?? 'qwen/qwen3-30b-a3b';

const SYSTEM_PROMPT = `You are an expert productivity assistant that extracts clear, specific action items from any spoken or written text — meeting notes, voice memos, brainstorm sessions, conversations, or task lists.

Your rules:
- Extract EVERY actionable item mentioned, implied, or follow-up needed
- Make each action item specific and measurable (not vague)
- For complex action items (more than one step), break them into ordered sub-tasks
- Assign priority: "high" (urgent/blocking), "medium" (important soon), "low" (nice to have)
- Keep titles concise (under 8 words)
- Sub-tasks should be concrete single actions a person can physically do

Respond ONLY with a valid JSON array. No prose, no markdown, no explanation.`;

const USER_TEMPLATE = (text: string) => `Analyze this text and extract all action items:

---
${text}
---

Return a JSON array where each element has:
{
  "title": "Short action item title",
  "description": "One sentence of context or goal",
  "priority": "high" | "medium" | "low",
  "tasks": [
    {"task": "Specific sub-task description", "done": false}
  ]
}

If an action item is simple (one step), leave "tasks" as an empty array [].
Return ONLY the JSON array.`;

export async function POST(req: NextRequest) {
  const apiKey =
    req.headers.get('x-openrouter-key') ?? process.env.OPENROUTER_API_KEY ?? '';

  if (!apiKey) {
    return NextResponse.json(
      { error: 'OpenRouter API key not configured — open Settings and enter your key' },
      { status: 401 }
    );
  }

  const { text } = await req.json();

  if (!text?.trim()) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 });
  }

  try {
    const client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002',
        'X-Title': 'Action Item Translator',
      },
    });

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: USER_TEMPLATE(text.trim()) },
      ],
      temperature: 0.2,
      max_tokens: 3000,
    });

    const raw = response.choices[0].message.content ?? '';
    const cleaned = raw.replace(/```(?:json)?/g, '').trim();
    const match = cleaned.match(/\[[\s\S]*\]/);

    if (!match) {
      return NextResponse.json({ error: 'Model returned no parseable JSON' }, { status: 500 });
    }

    const items = JSON.parse(match[0]);
    return NextResponse.json({ items });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
