import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: 'Missing OPENAI_API_KEY on server' }, { status: 500 });
    }

    const { text, imageUrl } = (await req.json()) as { text: string; imageUrl: string };

    if (!text || !imageUrl) {
      return Response.json(
        { error: 'Both "text" (prompt string) and "imageUrl" are required.' },
        { status: 400 }
      );
    }

    // Use a supported multimodal model and correct content schema
    const response = await client.responses.create({
      model: 'gpt-4o-mini',
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: 'You are a strict image scorer. Score the drawing from 1 to 100 based on closeness to the prompt. Output ONLY the integer, no words.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            { type: 'input_text', text },
            // Provide required detail for input_image; data URLs from canvas are acceptable
            { type: 'input_image', image_url: imageUrl, detail: 'high' },
          ],
        },
      ],
      max_output_tokens: 32,
    });

    const raw = (response.output_text || '').trim();
    const match = raw.match(/\b\d{1,3}\b/);
    const value = match ? Math.max(1, Math.min(100, parseInt(match[0], 10))) : 0;

    return Response.json({ output: value, raw });
  } catch (e) {
    const err = e as { status?: number; message?: string; error?: { message?: string } };
    const status = err?.status && Number.isFinite(err.status) ? (err.status as number) : 500;
    const message = err?.message || 'Internal Server Error';
    const detail = err?.error?.message || message;
    console.error('API /api/ai error:', status, message, err);
    return Response.json({ error: message, detail }, { status });
  }
}
