import { NextRequest, NextResponse } from 'next/server';

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
      const errorData = await response.json().catch(() => ({}));

      // Handle specific error cases
      if (response.status === 404) {
        return NextResponse.json(
          {
            error:
              'No transcript available for this video. This might be a live stream or a video without captions.',
          },
          { status: 404 },
        );
      }

      if (errorData.message) {
        return NextResponse.json({ error: errorData.message }, { status: response.status });
      }

      throw new Error('Failed to fetch transcript');
    }

    const data = await response.json();

    // Additional validation for empty transcripts
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return NextResponse.json(
        { error: 'No transcript content available for this video' },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcript. Please try again later.' },
      { status: 500 },
    );
  }
}
