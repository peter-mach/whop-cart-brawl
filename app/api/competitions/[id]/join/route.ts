import { NextRequest } from 'next/server';
import { authenticateUser } from '@/lib/auth-middleware';
import { joinCompetition, JoinCompetitionData } from '@/lib/competition';

// POST /api/competitions/[id]/join - Join competition (authenticated)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user) {
      return Response.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const user = authResult.user;
    const competitionId = params.id;

    if (!competitionId) {
      return Response.json(
        { error: 'Competition ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { shopifyDomain, accessToken } = body;

    // Validate required fields
    if (!shopifyDomain || !accessToken) {
      return Response.json(
        { error: 'Missing required fields: shopifyDomain, accessToken' },
        { status: 400 }
      );
    }

    // Validate Shopify domain format
    const domainRegex = /^[a-z0-9-]+\.myshopify\.com$/;
    if (!domainRegex.test(shopifyDomain)) {
      return Response.json(
        {
          error:
            'Invalid Shopify domain format. Must be in format: store-name.myshopify.com',
        },
        { status: 400 }
      );
    }

    // Create join data
    const joinData: JoinCompetitionData = {
      competitionId,
      userId: user.id,
      shopifyDomain,
      accessToken,
    };

    // Join competition using service
    const result = await joinCompetition(joinData);

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    // Return success without exposing sensitive data
    return Response.json(
      {
        success: true,
        participant: {
          id: result.participant?.id,
          competitionId,
          shopifyDomain,
          totalRevenue: 0,
          joinedAt: result.participant?.joinedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Join competition error:', error);
    return Response.json(
      { error: 'Failed to join competition' },
      { status: 500 }
    );
  }
}
