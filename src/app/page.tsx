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

interface SummaryWithTags {
  title: string;
  channelName: string;
  date: string;
  summary: string;
  videoUrl: string;
  tags: string[];
}

// Mock data for demonstration
const mockSummaries: SummaryWithTags[] = [
  {
    title: 'Video title xyz abc',
    channelName: 'channel name',
    date: '2/2/25',
    summary:
      'This is where the summary will be for the latest video the user has subscribed to. It will contain key points and main takeaways from the video content.',
    videoUrl: 'https://youtube.com/watch?v=example',
    tags: ['Technology', 'Tutorial'],
  },
];

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [summaries, setSummaries] = useState<SummaryWithTags[]>(mockSummaries);
  const [error, setError] = useState<string | null>(null);

  const generateTags = (title: string, summary: string): string[] => {
    // Extract meaningful words from title and summary
    const text = `${title} ${summary}`.toLowerCase();
    const words = text.split(/\s+/);

    // Common words to exclude
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
    ]);

    // Get unique meaningful words
    const uniqueWords = new Set(
      words
        .filter(word => word.length > 2) // Filter out short words
        .filter(word => !stopWords.has(word)) // Filter out stop words
        .filter(word => /^[a-z]+$/.test(word)), // Only keep words with letters
    );

    // Convert words to title case and limit to 5 most relevant tags
    return Array.from(uniqueWords)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .slice(0, 5);
  };

  const handleSubmit = async (url: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Extract video ID from various YouTube URL formats
      let videoId = '';

      try {
        const urlObj = new URL(url);

        if (url.includes('youtu.be')) {
          // Handle youtu.be format
          videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
        } else if (url.includes('youtube.com/live/')) {
          // Handle live stream format
          videoId = url.split('youtube.com/live/')[1]?.split('?')[0] || '';
        } else if (url.includes('youtube.com/shorts/')) {
          // Handle shorts format
          videoId = url.split('youtube.com/shorts/')[1]?.split('?')[0] || '';
        } else if (urlObj.searchParams.get('v')) {
          // Handle standard youtube.com format with v parameter
          const vParam = urlObj.searchParams.get('v');
          if (vParam) videoId = vParam;
        }
      } catch (e) {
        throw new Error('Invalid URL format. Please enter a valid YouTube URL.');
      }

      if (!videoId) {
        throw new Error(
          "Could not extract video ID. Please make sure you're using a valid YouTube video URL.",
        );
      }

      // Clean the video ID
      videoId = videoId.trim();

      // Validate video ID format (allow both standard 11-char IDs and longer live stream IDs)
      if (!/^[a-zA-Z0-9_-]{11,}$/.test(videoId)) {
        throw new Error('Invalid YouTube video ID format.');
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
        transcript = (transcriptData as TranscriptSegment[])
          .map(segment => segment.text)
          .filter(Boolean)
          .join(' ');
      } else if (transcriptData.transcript && Array.isArray(transcriptData.transcript)) {
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

      // Get tags using OpenAI
      const tagsResponse = await fetch('/api/openai/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript, generateTags: true }),
      });
      if (!tagsResponse.ok) {
        throw new Error('Failed to generate tags');
      }
      const { tags } = await tagsResponse.json();

      // Get video metadata from YouTube oEmbed
      const oembedResponse = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      );
      const videoData = await oembedResponse.json();

      const newSummary: SummaryWithTags = {
        title: videoData.title,
        channelName: videoData.author_name,
        date: new Date().toLocaleDateString(),
        summary,
        videoUrl: url,
        tags,
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
