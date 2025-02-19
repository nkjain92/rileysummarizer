'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/utils/supabaseClient';

export default function LoginPage() {
  return (
    <div className='max-w-6xl mx-auto px-4 py-12'>
      <div className='text-center mb-16'>
        <h1 className='text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text mb-6'>
          Welcome Back
        </h1>
        <p className='text-xl text-gray-600 max-w-2xl mx-auto'>
          Sign in to your account or create a new one to start summarizing videos.
        </p>
      </div>

      <div className='max-w-md mx-auto'>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'rgb(147, 51, 234)',
                  brandAccent: 'rgb(126, 34, 206)',
                },
              },
            },
            className: {
              container: 'w-full',
              button:
                'w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition-colors',
              input:
                'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent',
              label: 'block text-sm font-medium text-gray-700 mb-1',
            },
          }}
          providers={[]}
          redirectTo={`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/`}
          onlyThirdPartyProviders={false}
          magicLink={false}
          showLinks={true}
          view='sign_in'
          localization={{
            variables: {
              sign_in: {
                email_label: 'Email',
                password_label: 'Password',
                button_label: 'Sign In',
                loading_button_label: 'Signing in...',
              },
            },
          }}
        />
      </div>
    </div>
  );
}
