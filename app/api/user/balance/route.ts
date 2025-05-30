import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getUserBalance } from '@/lib/whop-api';

export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const balance = await getUserBalance(user.id);

    if (!balance) {
      return NextResponse.json(
        { error: 'Failed to fetch balance' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      balance: balance.balance,
      currency: balance.currency,
    });
  } catch (error) {
    console.error('Balance check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
