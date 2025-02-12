'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  return (
    <div className='w-full bg-white/80 backdrop-blur-sm border-b border-purple-100/20 mb-8'>
      <nav className='max-w-6xl mx-auto'>
        <ul className='flex justify-center divide-x divide-purple-100'>
          <li>
            <Link
              href='/'
              className={`px-8 py-5 inline-block transition-colors ${
                pathname === '/'
                  ? 'text-purple-600 font-semibold'
                  : 'text-gray-600 hover:text-purple-600'
              }`}>
              Home
            </Link>
          </li>
          <li>
            <Link
              href='/subscribed'
              className={`px-8 py-5 inline-block transition-colors ${
                pathname === '/subscribed'
                  ? 'text-purple-600 font-semibold'
                  : 'text-gray-600 hover:text-purple-600'
              }`}>
              Subscribed list
            </Link>
          </li>
          <li>
            <Link
              href='/summaries'
              className={`px-8 py-5 inline-block transition-colors ${
                pathname === '/summaries'
                  ? 'text-purple-600 font-semibold'
                  : 'text-gray-600 hover:text-purple-600'
              }`}>
              Past Summaries
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
