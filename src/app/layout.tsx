import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Video Summarizer',
  description: 'AI-powered YouTube video summarizer',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body className={`${inter.className} antialiased`}>
        <div className='min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50'>
          {children}
        </div>
      </body>
    </html>
  );
}
