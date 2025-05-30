import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify';
import { verifyUserToken } from '@/lib/whop-api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const competitionId = searchParams.get('competitionId');
    const shop = searchParams.get('shop');

    if (!competitionId || !shop) {
      return NextResponse.json(
        { error: 'Missing competitionId or shop parameter' },
        { status: 400 }
      );
    }

    // Verify user token from Whop
    const userToken = request.headers
      .get('authorization')
      ?.replace('Bearer ', '');
    if (!userToken) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      );
    }

    const user = await verifyUserToken(userToken);
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Invalid user token' },
        { status: 401 }
      );
    }

    // Create state with competition and user info
    const state = Buffer.from(
      JSON.stringify({
        competitionId,
        userId: user.id,
      })
    ).toString('base64');

    // Generate Shopify OAuth URL
    const authUrl = shopify.auth.begin({
      shop: shop.replace('.myshopify.com', ''),
      callbackPath: '/api/shopify/callback',
      isOnline: false, // Offline access for background jobs
      rawRequest: request as any,
    });

    return NextResponse.redirect(`${authUrl}&state=${state}`);
  } catch (error) {
    console.error('Shopify auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
