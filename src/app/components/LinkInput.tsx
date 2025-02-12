'use client';

import { useState, useEffect } from 'react';

interface LinkInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export default function LinkInput({ onSubmit, isLoading }: LinkInputProps) {
  const [url, setUrl] = useState('');
  const [isValid, setIsValid] = useState(false);

  const validateYouTubeUrl = (url: string) => {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(channel\/|watch\?v=)|youtu\.be\/).+/;
    return pattern.test(url);
  };

  useEffect(() => {
    setIsValid(validateYouTubeUrl(url));
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid && !isLoading) {
      onSubmit(url);
    }
  };

  return (
    <div className='w-full max-w-3xl mx-auto'>
      <div className='bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-purple-100/20'>
        <h2 className='text-2xl font-semibold text-gray-800 mb-6'>Add New Video</h2>
        <form onSubmit={handleSubmit}>
          <div className='min-h-[110px]'>
            <div className='relative'>
              <input
                type='text'
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder='Enter YouTube video or channel link'
                className='w-full p-4 text-lg text-gray-700 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 border border-purple-100 placeholder-gray-400 transition-all duration-200'
                disabled={isLoading}
              />
              {url && (
                <div className='absolute right-4 top-4'>
                  {isValid ? (
                    <span className='text-green-500 text-xl'>✓</span>
                  ) : (
                    <span className='text-red-500 text-xl'>✗</span>
                  )}
                </div>
              )}
            </div>
            <div className='h-8 mt-2'>
              {url && !isValid && (
                <p className='text-sm text-red-500'>
                  Please enter a valid YouTube video or channel URL
                </p>
              )}
            </div>
          </div>
          <div className='flex justify-end mt-2'>
            <button
              type='submit'
              disabled={!isValid || isLoading}
              className={`
                px-8 py-3 rounded-xl text-lg font-medium transition-all duration-300 relative
                ${
                  isValid && !isLoading
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:-translate-y-0.5'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
              `}>
              <span
                className={`transition-opacity duration-200 ${
                  isLoading ? 'opacity-0' : 'opacity-100'
                }`}>
                Generate Summary
              </span>
              {isLoading && (
                <div className='absolute inset-0 flex items-center justify-center'>
                  <svg
                    className='animate-spin h-5 w-5 text-white'
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
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
