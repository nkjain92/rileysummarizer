import { NextResponse } from 'next/server';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing environment variable: OPENAI_API_KEY');
}

export async function POST(request: Request) {
  try {
    const { transcript, isDetailed } = await request.json();

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
    }

    const systemPrompt = isDetailed
      ? 'You are an expert content summarizer specializing in creating concise, informative, and well-structured video summaries. Your summaries should:\n' +
        "1. Begin with a one-sentence overview of the video's main topic\n" +
        '2. Include 4-6 key points or main takeaways. Ensure to add analogies or examples that are there in the video for those points\n' +
        "3. Highlight any important conclusions or calls to action, again with examples from the video only (not your own). Don't repeat from what's already stated earlier\n" +
        '4. Use clear, professional language\n' +
        "5. Maintain the original video's tone while being objective\n\n" +
        'Format the summary with proper paragraphs and bullet points (using "• "). Keep the total length to around 350 words.'
      : 'You are an expert content summarizer specializing in creating concise, informative, and well-structured video summaries. Your summaries should:\n' +
        "1. Begin with a one-sentence overview of the video's main topic\n" +
        '2. Include 3-5 key points or main takeaways\n' +
        '3. Highlight any important conclusions or calls to action\n' +
        '4. Use clear, professional language\n' +
        "5. Maintain the original video's tone while being objective\n\n" +
        'Format the summary with proper paragraphs and bullet points (using "• "). Keep the total length to around 200 words.';

    const userPrompt = isDetailed
      ? `Please provide a detailed summary (around 350 words) of the following transcript, focusing on the main points, key insights, and including examples and analogies from the video:\n\n${transcript}`
      : `Please provide a concise summary (around 200 words) of the following transcript, focusing on the main points and key insights:\n\n${transcript}`;

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
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: isDetailed ? 1000 : 800,
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
