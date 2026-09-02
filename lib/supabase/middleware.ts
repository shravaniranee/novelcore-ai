import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const path = request.nextUrl.pathname;
  const sessionCookie = request.cookies.get('novelcore_session');

  // Check local session cookie validity
  let hasLocalSession = false;
  if (sessionCookie?.value) {
    try {
      const parsed = JSON.parse(sessionCookie.value);
      if (parsed?.userId) {
        hasLocalSession = true;
      }
    } catch {
      // Invalid cookie JSON
    }
  }

  // Check Supabase session
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let hasSupabaseSession = false;

  if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('demo-project')) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        hasSupabaseSession = true;
      }
    } catch {
      // Supabase unavailable
    }
  }

  const isAuthenticated = hasLocalSession || hasSupabaseSession;

  // 1. Protect all /app routes: redirect unauthenticated users to /login
  if (!isAuthenticated && path.startsWith('/app')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', path);
    return NextResponse.redirect(url);
  }

  // 2. Redirect authenticated users away from auth pages to /app
  if (isAuthenticated && (path === '/login' || path === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/app';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
