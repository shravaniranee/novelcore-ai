import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

/**
 * Server-side security function:
 * 1. Authenticates user from local session cookie or Supabase session.
 * 2. Retrieves the authenticated User record directly from PostgreSQL database.
 */
export async function getAuthenticatedUser() {
  // 1. Check local novelcore_session HTTP cookie first
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('novelcore_session');

    if (sessionCookie?.value) {
      const sessionData = JSON.parse(sessionCookie.value);
      if (sessionData?.userId) {
        const localUser = await prisma.user.findUnique({
          where: { id: sessionData.userId },
        });

        if (localUser) {
          return localUser;
        }
      }
    }
  } catch (err) {
    // Fall back to Supabase session check
  }

  // 2. Check Supabase Auth session as fallback
  try {
    const supabase = createClient();
    const {
      data: { user: supabaseUser },
      error,
    } = await supabase.auth.getUser();

    if (!error && supabaseUser) {
      const dbUser = await prisma.user.upsert({
        where: { id: supabaseUser.id },
        update: {
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'Innovator',
          avatarUrl: supabaseUser.user_metadata?.avatar_url || null,
        },
        create: {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'Innovator',
          avatarUrl: supabaseUser.user_metadata?.avatar_url || null,
        },
      });

      return dbUser;
    }
  } catch {
    // Unauthenticated
  }

  return null;
}

/**
 * Server-side authorization check:
 * Ensures a user can ONLY access or modify inventions that belong to them.
 */
export async function verifyInventionOwner(inventionId: string, userId: string) {
  const invention = await prisma.invention.findUnique({
    where: { id: inventionId },
    select: { userId: true },
  });

  if (!invention || invention.userId !== userId) {
    throw new Error('Unauthorized: Access denied to this invention.');
  }

  return true;
}
