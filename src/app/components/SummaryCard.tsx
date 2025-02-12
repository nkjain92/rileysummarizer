import ReactMarkdown from 'react-markdown';

interface SummaryCardProps {
  title: string;
  channelName: string;
  date: string;
  summary: string;
  videoUrl: string;
}

export default function SummaryCard({
  title,
  channelName,
  date,
  summary,
  videoUrl,
}: SummaryCardProps) {
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
          <ReactMarkdown
            components={{
              strong: ({ children }) => (
                <span className='font-bold text-purple-800'>{children}</span>
              ),
              p: ({ children }) => <p className='text-gray-600 leading-relaxed mb-4'>{children}</p>,
              ul: ({ children }) => <ul className='space-y-2 my-4 list-none'>{children}</ul>,
              li: ({ children }) => (
                <li className='flex items-start space-x-2'>
                  <span className='text-purple-600 mt-1.5'>•</span>
                  <span className='text-gray-600'>{children}</span>
                </li>
              ),
            }}>
            {summary}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
