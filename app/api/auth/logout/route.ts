import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    // 1. Delete local novelcore_session HTTP cookie
    const cookieStore = cookies();
    cookieStore.set('novelcore_session', '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });

    // 2. Clear Supabase auth session if active
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabaseUrl && !supabaseUrl.includes('demo-project')) {
        const supabase = createClient();
        await supabase.auth.signOut();
      }
    } catch {
      // Ignore Supabase signout error
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to logout.' },
      { status: 500 }
    );
  }
}
