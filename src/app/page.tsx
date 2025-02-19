'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from './components/Navigation';
import LinkInput from './components/LinkInput';
import SummaryCard from './components/SummaryCard';
import LoadingCard from './components/LoadingCard';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/lib/contexts/ToastContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { logger } from '@/lib/utils/logger';
import { SummaryWithRelations, ContentWithRelations } from '@/lib/types/database';
import { supabase } from '@/lib/utils/supabaseClient';

interface SummaryWithTags extends SummaryWithRelations {
  tags: string[];
  content: ContentWithRelations & {
    channel: {
      name: string;
    };
  };
}

// Cache key for localStorage
const SUMMARIES_CACHE_KEY = 'video-summaries-cache';

interface CacheData {
  summaries: SummaryWithTags[];
  timestamp: number;
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
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

  const handleSubmit = async (url: string) => {
    setIsLoading(true);
    try {
      // Get the current session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error('Please sign in to process videos');
        router.push('/login');
        return;
      }

      // Process video using VideoProcessingService
      const response = await fetch('/api/videos/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ url }),
      });

      // Get the response text first
      const responseText = await response.text();

      // Try to parse as JSON regardless of status
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (parseError) {
        logger.error('Failed to parse response as JSON', parseError as Error);
        throw new Error('Unexpected server response format');
      }

      // Handle error responses
      if (!response.ok) {
        const errorMessage = parsedResponse.error?.message || 'Failed to process video';
        throw new Error(errorMessage);
      }

      const summary = parsedResponse.data;

      // Transform database record to UI format
      const newSummary: SummaryWithTags = {
        ...summary,
        tags: summary.tags || [],
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
      logger.error('Failed to process video', err);
      toast.error(err.message);
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
                    key={`${summary.id}-${index}`}
                    className='transition-all duration-500 animate-fade-in'>
                    <SummaryCard
                      title={summary.content?.title || 'Unknown Title'}
                      channelName={summary.content?.channel?.name}
                      date={new Date(summary.created_at).toLocaleDateString()}
                      summary={summary.summary}
                      videoUrl={summary.content?.url || '#'}
                      tags={summary.tags}
                      videoId={summary.content_id || ''}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Only show empty state when there are no summaries in localStorage */}
          {!isLoading &&
            summaries.length === 0 &&
            isClient && // Only render on client side
            !localStorage.getItem(SUMMARIES_CACHE_KEY) && (
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
