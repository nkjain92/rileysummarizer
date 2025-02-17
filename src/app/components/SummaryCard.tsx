import ReactMarkdown from 'react-markdown';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { logger } from '@/lib/utils/logger';
import { useToast } from '@/lib/contexts/ToastContext';
import { ToastVariant } from '@/lib/types/toast';

interface SummaryCardProps {
  title: string;
  channelName: string;
  date: string;
  summary: string;
  videoUrl: string;
  tags?: string[];
  videoId: string;
}

export default function SummaryCard({
  title,
  channelName,
  date,
  summary,
  videoUrl,
  tags = [],
  videoId,
}: SummaryCardProps) {
  const [isLoadingDetailed, setIsLoadingDetailed] = useState(false);
  const [detailedSummary, setDetailedSummary] = useState<string | null>(null);
  const [isShowingDetailed, setIsShowingDetailed] = useState(false);
  const toast = useToast();

  const handleGetDetailedSummary = async () => {
    if (detailedSummary) {
      setIsShowingDetailed(!isShowingDetailed);
      return;
    }

    setIsLoadingDetailed(true);
    try {
      // First, try to generate the detailed summary
      const response = await fetch('/api/openai/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: summary,
          options: {
            format: "paragraph",
            maxLength: 2000,
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to generate detailed summary');
      }

      const { data } = await response.json();
      
      // Create a new summary with the detailed summary
      const createResponse = await fetch('/api/videos/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: videoUrl,
          detailed_summary: data.summary,
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(error.error?.message || 'Failed to save detailed summary');
      }

      setDetailedSummary(data.summary);
      setIsShowingDetailed(true);
      toast.success('Detailed summary generated successfully!');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error occurred');
      logger.error('Failed to generate detailed summary', err, {
        title,
        summaryLength: summary.length,
      });
      toast.error('Failed to generate detailed summary. Please try again later.');
    } finally {
      setIsLoadingDetailed(false);
    }
  };

  const currentSummary = isShowingDetailed ? detailedSummary : summary;

  return (
    <div className='bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-purple-100/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1'>
      <div className='flex justify-between items-start mb-6'>
        <div>
          <h3 className='text-2xl font-semibold text-gray-800 mb-3 line-clamp-2'>{title}</h3>
          <div className='flex items-center space-x-3 text-base text-gray-500'>
            <span className='font-medium'>{channelName}</span>
            <span>•</span>
            <span>{date}</span>
          </div>
        </div>
        <a
          href={videoUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='flex items-center space-x-2 px-4 py-2 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors'>
          <span className='font-medium'>Watch Video</span>
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
            />
          </svg>
        </a>
      </div>

      <div className='mt-6'>
        <div className='prose prose-lg max-w-none'>
          <AnimatePresence mode='wait'>
            <motion.div
              key={isShowingDetailed ? 'detailed' : 'brief'}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}>
              <ReactMarkdown
                components={{
                  strong: ({ children }) => (
                    <span className='font-bold text-purple-800'>{children}</span>
                  ),
                  p: ({ children }) => (
                    <p className='text-gray-600 leading-relaxed mb-4'>{children}</p>
                  ),
                  ul: ({ children }) => <ul className='space-y-2 my-4 list-none'>{children}</ul>,
                  li: ({ children }) => (
                    <li className='flex items-start space-x-2'>
                      <span className='text-purple-600 mt-1.5'>•</span>
                      <span className='text-gray-600'>{children}</span>
                    </li>
                  ),
                  h3: ({ children }) => (
                    <h3 className='text-lg font-semibold text-purple-800 mt-4 mb-2'>{children}</h3>
                  ),
                }}>
                {currentSummary}
              </ReactMarkdown>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className='flex flex-col space-y-4 mt-4'>
          {tags.length > 0 && (
            <div className='flex flex-wrap gap-2'>
              {tags.map(tag => (
                <button
                  key={tag}
                  className='px-3 py-1 text-sm rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors cursor-pointer'
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
          <div className='flex justify-end'>
            <button
              onClick={handleGetDetailedSummary}
              disabled={isLoadingDetailed}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                ${
                  isLoadingDetailed
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:-translate-y-0.5'
                }`}>
              {isLoadingDetailed ? (
                <div className='flex items-center space-x-2'>
                  <svg
                    className='animate-spin h-4 w-4 text-white'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'>
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'></circle>
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                  </svg>
                  <span>Generating...</span>
                </div>
              ) : isShowingDetailed ? (
                'Show Brief Summary'
              ) : (
                'Show Detailed Summary'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
