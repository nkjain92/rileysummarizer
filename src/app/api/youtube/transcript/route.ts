import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const response = await fetch(
      `https://youtube-transcript3.p.rapidapi.com/api/transcript?videoId=${videoId}`,
      {
        headers: {
          'x-rapidapi-host': 'youtube-transcript3.p.rapidapi.com',
          'x-rapidapi-key': 'fb3f0acafdmsh409d48594da062ap1b22e3jsn034f696e4c63',
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch transcript');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return NextResponse.json({ error: 'Failed to fetch transcript' }, { status: 500 });
  }
}
