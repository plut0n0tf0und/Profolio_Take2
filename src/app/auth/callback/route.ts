import { createSupabaseServerClient } from '@/lib/supabase-server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const isLogin = searchParams.get('is_login') === 'true';

  if (!code) {
    const errorMessage = encodeURIComponent(
      'Invalid authentication request. Could not process login.'
    );
    return NextResponse.redirect(`${origin}/?error=${errorMessage}`);
  }

  const supabase = createSupabaseServerClient();

  // Exchange OAuth code for session (temporary)
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

// inside GET()
if (error) {
  const errorMessage = encodeURIComponent('Authentication failed. Please try again.');
  return NextResponse.redirect(`${origin}/auth/callback?error=${errorMessage}`);
}

if (isLogin && data.user) {
  const createdAt = new Date(data.user.created_at);
  const lastSignInAt = data.user.last_sign_in_at ? new Date(data.user.last_sign_in_at) : createdAt;
  const isNewUser = Math.abs(createdAt.getTime() - lastSignInAt.getTime()) < 5000;

  if (isNewUser) {
    await supabase.auth.signOut();
    const errorMessage = encodeURIComponent('This account is not registered. Please sign up.');
    return NextResponse.redirect(`${origin}/?error=${errorMessage}`);
  }
}

// Success → go dashboard
return NextResponse.redirect(`${origin}/dashboard`);
}
