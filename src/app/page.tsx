'use client';

import { useState } from 'react';
import Navigation from './components/Navigation';
import LinkInput from './components/LinkInput';
import SummaryCard from './components/SummaryCard';
import LoadingCard from './components/LoadingCard';
import Toast from './components/Toast';

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

// Mock data for demonstration
const mockSummaries = [
  {
    title: 'Video title xyz abc',
    channelName: 'channel name',
    date: '2/2/25',
    summary:
      'This is where the summary will be for the latest video the user has subscribed to. It will contain key points and main takeaways from the video content.',
    videoUrl: 'https://youtube.com/watch?v=example',
  },
];

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [summaries, setSummaries] = useState(mockSummaries);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (url: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Extract video ID from YouTube URL (handles both youtube.com and youtu.be formats)
      let videoId;
      if (url.includes('youtu.be')) {
        // Handle youtu.be format
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
      } else {
        // Handle youtube.com format
        videoId = url.split('v=')[1]?.split('&')[0];
      }

      if (!videoId) {
        throw new Error('Invalid YouTube URL. Please check the URL and try again.');
      }

      // Get transcript
      const transcriptResponse = await fetch(`/api/youtube/transcript?videoId=${videoId}`);
      if (!transcriptResponse.ok) {
        throw new Error('Failed to fetch transcript');
      }
      const transcriptData = await transcriptResponse.json();

      // Process the transcript data into a readable format
      let transcript;
      if (Array.isArray(transcriptData)) {
        // If it's an array of transcript segments, join them
        transcript = (transcriptData as TranscriptSegment[])
          .map(segment => segment.text)
          .filter(Boolean)
          .join(' ');
      } else if (transcriptData.transcript && Array.isArray(transcriptData.transcript)) {
        // If transcript is nested in a transcript property
        transcript = (transcriptData.transcript as TranscriptSegment[])
          .map(segment => segment.text)
          .filter(Boolean)
          .join(' ');
      } else {
        throw new Error('Unexpected transcript format');
      }

      if (!transcript) {
        throw new Error('No transcript content found');
      }

      // Get summary using OpenAI
      const summaryResponse = await fetch('/api/openai/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript }),
      });
      if (!summaryResponse.ok) {
        throw new Error('Failed to generate summary');
      }
      const { summary } = await summaryResponse.json();

      // Get video metadata from YouTube oEmbed
      const oembedResponse = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      );
      const videoData = await oembedResponse.json();

      const newSummary = {
        title: videoData.title,
        channelName: videoData.author_name,
        date: new Date().toLocaleDateString(),
        summary,
        videoUrl: url,
      };

      setSummaries(prev => [newSummary, ...prev]);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main>
      <Navigation />
      <div className='max-w-6xl mx-auto px-4 py-12'>
        <div className='text-center mb-16'>
          <h1 className='text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text mb-6'>
            Video Summarizer
          </h1>
          <p className='text-xl text-gray-600 max-w-2xl mx-auto'>
            Get instant AI-powered summaries of YouTube videos. Save time and decide what to watch.
          </p>
        </div>

        <LinkInput onSubmit={handleSubmit} isLoading={isLoading} />

        <div className='space-y-6 mt-12'>
          {isLoading && <LoadingCard />}

          {summaries.map((summary, index) => (
            <div key={index} className='transition-all duration-500 animate-fade-in'>
              <SummaryCard {...summary} />
            </div>
          ))}
        </div>

        {summaries.length === 0 && !isLoading && (
          <div className='text-center py-16'>
            <div className='bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-purple-100/20'>
              <h3 className='text-2xl font-semibold text-gray-800 mb-3'>No summaries yet</h3>
              <p className='text-gray-600 text-lg'>
                Add a YouTube link above to get started with your first video summary!
              </p>
            </div>
          </div>
        )}
      </div>
      {error && <Toast message={error} onClose={() => setError(null)} />}
    </main>
  );
}
