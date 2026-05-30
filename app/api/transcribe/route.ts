import { NextRequest, NextResponse } from 'next/server';
import Groq, { toFile } from 'groq-sdk';

export async function POST(req: NextRequest) {
  const apiKey =
    req.headers.get('x-groq-key') ?? process.env.GROQ_API_KEY ?? '';

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Groq API key not configured — open Settings and enter your key' },
      { status: 401 }
    );
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
  }

  try {
    const groq = new Groq({ apiKey });
    const buffer = Buffer.from(await file.arrayBuffer());
    const audioFile = await toFile(buffer, 'recording.webm', { type: 'audio/webm' });

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
      response_format: 'json',
    });

    return NextResponse.json({ text: transcription.text });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Transcription failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
