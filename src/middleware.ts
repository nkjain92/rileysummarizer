import { createServerSupabaseClient } from '@/lib/utils/supabaseServer';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger } from '@/lib/utils/logger';

export async function middleware(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    // If we have a session, check if the user has a profile
    if (session?.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError && !profile) {
        // Create profile if it doesn't exist
        const { error: createError } = await supabase.from('profiles').insert({
          id: session.user.id,
          name: session.user.email?.split('@')[0] || 'Anonymous',
        });

        if (createError) {
          logger.error('Failed to create user profile:', createError);
        }
      }
    }

    return NextResponse.next();
  } catch (error) {
    logger.error('Middleware error:', error as Error);
    return NextResponse.next();
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