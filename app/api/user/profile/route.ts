import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getUserProfile } from '@/lib/whop-api';

export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const profileResult = await getUserProfile(user.id);

    if (!profileResult.success) {
      return NextResponse.json({ error: profileResult.error }, { status: 500 });
    }

    return NextResponse.json({
      user: profileResult.user,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
