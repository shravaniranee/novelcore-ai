import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check if user already exists in PostgreSQL
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser && existingUser.password) {
      return NextResponse.json(
        { error: 'An account with this email address already exists. Please sign in instead.' },
        { status: 400 }
      );
    }

    // 2. Hash password securely using bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);
    const userName = (name || cleanEmail.split('@')[0] || 'Innovator').trim();

    // 3. Create or update User record in PostgreSQL database
    const dbUser = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: userName,
            password: hashedPassword,
          },
        })
      : await prisma.user.create({
          data: {
            email: cleanEmail,
            name: userName,
            password: hashedPassword,
          },
        });

    // 4. Attempt Supabase Auth synchronization if configured
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabaseUrl && !supabaseUrl.includes('demo-project')) {
        const supabase = createClient();
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { name: userName },
          },
        });
      }
    } catch (supabaseErr: any) {
      console.warn('[Auth Warning] Supabase sync skipped:', supabaseErr?.message || supabaseErr);
    }

    // 5. Set secure HTTP session cookie
    const sessionToken = JSON.stringify({
      userId: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
    });

    const cookieStore = cookies();
    cookieStore.set('novelcore_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
      },
    });
  } catch (err: any) {
    console.error('[Signup Error]:', err);
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred during signup.' },
      { status: 500 }
    );
  }
}
