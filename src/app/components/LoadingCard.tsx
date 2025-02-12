'use client';

export default function LoadingCard() {
  return (
    <div className='bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-purple-100/20 animate-fade-in'>
      <div className='flex justify-between items-start mb-6'>
        <div className='w-full'>
          <div className='h-8 bg-gray-200 rounded-lg w-3/4 mb-3 animate-pulse'></div>
          <div className='flex items-center space-x-3'>
            <div className='h-5 bg-gray-200 rounded w-24 animate-pulse'></div>
            <span>•</span>
            <div className='h-5 bg-gray-200 rounded w-16 animate-pulse'></div>
          </div>
        </div>
        <div className='flex items-center space-x-2 px-4 py-2 rounded-xl bg-gray-100'>
          <div className='h-5 bg-gray-200 rounded w-24 animate-pulse'></div>
        </div>
      </div>

      <div className='mt-6 space-y-3'>
        <div className='h-4 bg-gray-200 rounded w-full animate-pulse'></div>
        <div className='h-4 bg-gray-200 rounded w-5/6 animate-pulse'></div>
        <div className='h-4 bg-gray-200 rounded w-4/6 animate-pulse'></div>
      </div>

      <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'>
        <div className='flex flex-col items-center'>
          <svg
            className='animate-spin h-8 w-8 text-purple-600 mb-3'
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
          <span className='text-purple-600 font-medium'>Generating Summary...</span>
        </div>
      </div>
    </div>
  );
}
