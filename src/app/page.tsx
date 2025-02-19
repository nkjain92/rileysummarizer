'use client';

import { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import LinkInput from './components/LinkInput';
import SummaryCard from './components/SummaryCard';
import LoadingCard from './components/LoadingCard';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/lib/contexts/ToastContext';
import { logger } from '@/lib/utils/logger';

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
  videoId: string;
}

// Add type for response error context
interface ResponseErrorContext extends Record<string, unknown> {
  status?: number;
  statusText?: string;
  responseText?: string;
  parseError?: unknown;
}

interface ParseErrorContext extends Record<string, unknown> {
  responseText: string;
  parseError: unknown;
}

// Cache key for localStorage
const SUMMARIES_CACHE_KEY = 'video-summaries-cache';

interface CacheData {
  summaries: SummaryWithTags[];
  timestamp: number;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [summaries, setSummaries] = useState<SummaryWithTags[]>([]);
  const [recentSummaries, setRecentSummaries] = useState<SummaryWithTags[]>([]);
  const toast = useToast();
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true when component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load recent summaries from cache
  useEffect(() => {
    if (!isClient) return; // Only run on client side

    try {
      const cachedData = localStorage.getItem(SUMMARIES_CACHE_KEY);
      if (cachedData) {
        const { summaries: cached }: CacheData = JSON.parse(cachedData);
        setSummaries(cached);
        setRecentSummaries(cached.slice(0, 3));
      }
    } catch (error) {
      logger.error('Failed to load cached summaries', error as Error);
    }
  }, [isClient]); // Run when isClient becomes true

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
    logger.info('Starting video processing', { url });
    try {
      // Process video using VideoProcessingService
      logger.info('Sending request to process video', { url });
      const response = await fetch('/api/videos/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      // Log the raw response for debugging
      logger.info('Received response from server', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      // Get the response text first
      const responseText = await response.text();
      logger.info('Received response text', { responseText });

      // Try to parse as JSON regardless of status
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (parseError) {
        logger.error('Failed to parse response as JSON', parseError as Error, { responseText });
        throw new Error('Unexpected server response format');
      }

      // Handle error responses
      if (!response.ok) {
        const errorMessage = parsedResponse.error?.message || 'Failed to process video';
        throw new Error(errorMessage);
      }

      const summary = parsedResponse.data;
      logger.info('Successfully processed video', { summary });

      // Transform database record to UI format
      const newSummary: SummaryWithTags = {
        title: summary.videos.title,
        channelName: summary.videos.channels.name,
        date: new Date(summary.created_at).toLocaleDateString(),
        summary: summary.summary,
        videoUrl: summary.videos.url,
        tags: summary.tags || [],
        videoId: summary.video_id,
      };

      // Get existing summaries from cache
      let existingSummaries: SummaryWithTags[] = [];
      try {
        const cachedData = localStorage.getItem(SUMMARIES_CACHE_KEY);
        if (cachedData) {
          const { summaries: cached }: CacheData = JSON.parse(cachedData);
          existingSummaries = cached;
        }
      } catch (error) {
        logger.error('Failed to load existing summaries from cache', error as Error);
      }

      // Append new summary to existing ones
      const updatedSummaries = [newSummary, ...existingSummaries];

      // Update state
      setSummaries(updatedSummaries);
      setRecentSummaries(updatedSummaries.slice(0, 3));

      // Update cache with combined summaries
      const cacheData: CacheData = {
        summaries: updatedSummaries,
        timestamp: Date.now(),
      };
      localStorage.setItem(SUMMARIES_CACHE_KEY, JSON.stringify(cacheData));

      toast.success('Summary generated successfully!');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error occurred');
      logger.error('Failed to process video', err, { url });
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (error: string) => {
    toast.error(error);
  };

  return (
    <main>
      <Navigation />
      <div className='max-w-6xl mx-auto px-4 py-12'>
        <div className='text-center mb-16'>
          <h1 className='text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text mb-6'>
            Summarizer
          </h1>
          <p className='text-xl text-gray-600 max-w-2xl mx-auto'>
            Get instant AI-powered summaries of YouTube videos. Save time and decide what to watch.
          </p>
        </div>

        <LinkInput onSubmit={handleSubmit} isLoading={isLoading} />

        <div className='space-y-6 mt-12'>
          {isLoading && <LoadingCard />}

          {/* Show recent summaries section */}
          {recentSummaries.length > 0 && (
            <div className='mt-12 pt-12 border-t border-purple-100'>
              <div className='flex justify-between items-center mb-6'>
                <h2 className='text-2xl font-semibold text-gray-800'>Recent Summaries</h2>
                <a
                  href='/summaries'
                  className='text-purple-600 hover:text-purple-700 font-medium flex items-center space-x-1'>
                  <span>View All</span>
                  <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 5l7 7-7 7'
                    />
                  </svg>
                </a>
              </div>
              <div className='space-y-6'>
                {recentSummaries.map((summary, index) => (
                  <div
                    key={`${summary.videoId}-${index}`}
                    className='transition-all duration-500 animate-fade-in'>
                    <SummaryCard {...summary} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Only show empty state when there are no summaries in localStorage */}
          {!isLoading &&
            summaries.length === 0 &&
            (typeof window !== 'undefined' ? !localStorage.getItem(SUMMARIES_CACHE_KEY) : true) && (
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
      </div>
      <ToastContainer />
    </main>
  );
}
