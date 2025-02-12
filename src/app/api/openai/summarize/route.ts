import { NextResponse } from 'next/server';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing environment variable: OPENAI_API_KEY');
}

export async function POST(request: Request) {
  try {
    const { transcript } = await request.json();

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
    }

    const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert content summarizer specializing in creating concise, informative, and well-structured video summaries. Your summaries should:\n' +
              "1. Begin with a one-sentence overview of the video's main topic\n" +
              '2. Include 3-5 key points or main takeaways\n' +
              '3. Highlight any important conclusions or calls to action\n' +
              '4. Use clear, professional language\n' +
              "5. Maintain the original video's tone while being objective\n\n" +
              'Format the summary with proper paragraphs and bullet points (using "• "). Keep the total length to around 200 words.',
          },
          {
            role: 'user',
            content: `Please provide a concise summary (around 200 words) of the following transcript, focusing on the main points and key insights:\n\n${transcript}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    const data = await apiResponse.json();
    if (!apiResponse.ok) {
      throw new Error(data.error?.message || 'Failed to generate summary');
    }

    return NextResponse.json({
      summary: data.choices[0]?.message?.content || 'No summary generated',
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
