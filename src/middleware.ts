import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger } from '@/lib/utils/logger';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Log request details
  logger.info('Middleware processing request:', {
    path: req.nextUrl.pathname,
    hasAuthHeader: !!req.headers.get('authorization'),
  });

  try {
    // Refresh session if expired
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    // Log session details
    logger.info('Middleware session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasError: !!sessionError,
      errorMessage: sessionError?.message,
    });

    // If we have a session, check if the user has a profile
    if (session?.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      // Log profile check
      logger.info('Middleware profile check:', {
        hasProfile: !!profile,
        hasError: !!profileError,
        errorMessage: profileError?.message,
      });

      // If no profile exists, create one
      if (!profile && !profileError) {
        const { error: createError } = await supabase.from('profiles').insert([
          {
            id: session.user.id,
            name: session.user.email?.split('@')[0] || 'Anonymous',
            created_at: new Date().toISOString(),
          },
        ]);

        if (createError) {
          logger.error('Error creating profile:', createError);
        }
      }
    }

    return res;
  } catch (error) {
    logger.error('Middleware error:', error as Error);
    return res;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};