import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify';
import { encrypt } from '@/lib/encryption';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const shop = searchParams.get('shop');
    const state = searchParams.get('state');

    if (!code || !shop || !state) {
      return NextResponse.json(
        { error: 'Missing required OAuth parameters' },
        { status: 400 }
      );
    }

    // Decode state to get competition and user info
    const { competitionId, userId } = JSON.parse(
      Buffer.from(state, 'base64').toString('utf-8')
    );

    // Exchange code for access token
    const session = await shopify.auth.callback({
      rawRequest: request as any,
    });

    if (!session.accessToken) {
      return NextResponse.json(
        { error: 'Failed to obtain access token' },
        { status: 400 }
      );
    }

    // Check if competition exists and is joinable
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: { participants: true },
    });

    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      );
    }

    if (competition.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Competition has ended' },
        { status: 400 }
      );
    }

    // Check if user already joined this competition
    const existingParticipant = competition.participants.find(
      (p) => p.userId === userId
    );

    if (existingParticipant) {
      return NextResponse.json(
        { error: 'Already joined this competition' },
        { status: 400 }
      );
    }

    // Check if shop already joined this competition
    const shopParticipant = competition.participants.find(
      (p) => p.shopifyDomain === shop
    );

    if (shopParticipant) {
      return NextResponse.json(
        { error: 'This shop is already participating in this competition' },
        { status: 400 }
      );
    }

    // Encrypt and store access token
    const encryptedToken = encrypt(session.accessToken);

    // Create participant record
    await prisma.participant.create({
      data: {
        userId,
        competitionId,
        shopifyDomain: shop,
        accessToken: encryptedToken,
        totalRevenue: 0,
      },
    });

    // Redirect back to competition page with success
    return NextResponse.redirect(
      `${
        process.env.HOST || 'http://localhost:3000'
      }/experiences/${competitionId}?joined=true`
    );
  } catch (error) {
    console.error('Shopify callback error:', error);
    return NextResponse.json(
      { error: 'OAuth callback failed' },
      { status: 500 }
    );
  }
}
