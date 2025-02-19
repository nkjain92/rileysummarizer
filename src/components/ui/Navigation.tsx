'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';

export function Navigation() {
  const { user, signOut, loading } = useAuth();

  return (
    <nav className='fixed top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-sm'>
      <div className='mx-auto flex max-w-7xl items-center justify-between p-4'>
        <Link href='/' className='text-xl font-bold text-gray-900'>
          Summarizer
        </Link>

        <div className='flex items-center gap-4'>
          {loading ? (
            <div className='h-8 w-24 animate-pulse rounded bg-gray-200' />
          ) : user ? (
            <>
              <span className='text-sm text-gray-600'>{user.email?.split('@')[0]}</span>
              <button
                onClick={signOut}
                className='rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700'>
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href='/auth'
              className='rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700'>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
