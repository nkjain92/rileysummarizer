'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/app/components/Navigation';
import SummaryCard from '@/app/components/SummaryCard';
import LoadingCard from '@/app/components/LoadingCard';
import { useToast } from '@/lib/contexts/ToastContext';
import { logger } from '@/lib/utils/logger';

interface SummaryWithTags {
  title: string;
  channelName: string;
  date: string;
  summary: string;
  videoUrl: string;
  tags: string[];
  videoId: string;
}

// Cache key for localStorage
const SUMMARIES_CACHE_KEY = 'video-summaries-cache';

interface CacheData {
  summaries: SummaryWithTags[];
  timestamp: number;
}

export default function SummariesPage() {
  const [summaries, setSummaries] = useState<SummaryWithTags[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const toast = useToast();

  // Load cached data on initial render
  useEffect(() => {
    const loadCachedData = () => {
      try {
        const cachedData = localStorage.getItem(SUMMARIES_CACHE_KEY);
        if (cachedData) {
          const { summaries: cachedSummaries, timestamp }: CacheData = JSON.parse(cachedData);
          setSummaries(cachedSummaries);
          setLastUpdated(new Date(timestamp));
          setIsLoading(false);
          return true;
        }
      } catch (error) {
        logger.error('Failed to load cached summaries', error as Error);
      }
      return false;
    };

    const hasCachedData = loadCachedData();
    if (!hasCachedData) {
      fetchSummaries(true);
    }
  }, []);

  const fetchSummaries = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const response = await fetch('/api/videos/summaries');
      if (!response.ok) {
        throw new Error('Failed to fetch summaries');
      }

      const data = await response.json();
      const transformedSummaries = data.data.map((summary: any) => ({
        title: summary.videos.title || 'Unknown Title',
        channelName: summary.videos.channel?.name || 'Anonymous Channel',
        date: new Date(summary.created_at).toLocaleDateString(),
        summary: summary.summary || 'No summary available',
        videoUrl: summary.videos.url || '',
        tags: summary.tags || [],
        videoId: summary.video_id,
      }));

      // Update state and cache
      setSummaries(transformedSummaries);
      setLastUpdated(new Date());
      
      // Cache the data
      const cacheData: CacheData = {
        summaries: transformedSummaries,
        timestamp: Date.now(),
      };
      localStorage.setItem(SUMMARIES_CACHE_KEY, JSON.stringify(cacheData));
      
      if (!isInitialLoad) {
        toast.success('Summaries updated successfully');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error occurred');
      logger.error('Failed to fetch summaries', err);
      toast.error('Failed to load summaries');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchSummaries(false);
  };

  const handleClearCache = () => {
    try {
      localStorage.removeItem(SUMMARIES_CACHE_KEY);
      setSummaries([]);
      setLastUpdated(null);
      toast.success('Cache cleared successfully');
      fetchSummaries(true);
    } catch (error) {
      logger.error('Failed to clear cache', error as Error);
      toast.error('Failed to clear cache');
    }
  };

  return (
    <main>
      <Navigation />
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text mb-6">
            Past Summaries
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            View and manage your previously generated video summaries.
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-2">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
          <div className="flex justify-center space-x-4 mt-4">
            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                isLoading || isRefreshing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
              }`}
            >
              {isRefreshing ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Refreshing...</span>
                </span>
              ) : (
                'Refresh Summaries'
              )}
            </button>
            <button
              onClick={handleClearCache}
              disabled={isLoading || isRefreshing}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-all duration-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Clear Summaries
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {isLoading ? (
            <LoadingCard />
          ) : summaries.length > 0 ? (
            summaries.map((summary, index) => (
              <div key={`${summary.videoId}-${index}`} className="transition-all duration-500 animate-fade-in">
                <SummaryCard {...summary} />
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-purple-100/20">
                <h3 className="text-2xl font-semibold text-gray-800 mb-3">No summaries yet</h3>
                <p className="text-gray-600 text-lg">
                  Add a YouTube link on the home page to get started with your first video summary!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 