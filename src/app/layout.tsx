import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/lib/contexts/ToastContext';
import { ToastContainer } from '@/components/ui/Toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RileySummarizer',
  description: 'AI-powered YouTube video summarizer',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html 
      lang='en' 
      suppressHydrationWarning
      {...{
        'data-qb-extension-installed': '',
        'data-qb-installed': ''
      }}
    >
      <body className={`${inter.className} antialiased`}>
        <ToastProvider>
          <div className='min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50'>
            {children}
          </div>
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  );
}
