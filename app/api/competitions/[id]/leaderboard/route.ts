import { NextRequest } from 'next/server';
import { getCompetitionLeaderboard } from '@/lib/competition';

// GET /api/competitions/[id]/leaderboard - Get competition leaderboard (public)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const competitionId = params.id;

    if (!competitionId) {
      return Response.json(
        { error: 'Competition ID is required' },
        { status: 400 }
      );
    }

    // Get leaderboard from service
    const result = await getCompetitionLeaderboard(competitionId);

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 404 });
    }

    // Format leaderboard data
    const leaderboard =
      result.leaderboard?.map((participant, index) => ({
        rank: index + 1,
        id: participant.id,
        userId: participant.userId,
        shopifyDomain: participant.shopifyDomain,
        totalRevenue: parseFloat(participant.totalRevenue.toString()),
        lastRevenueSync: participant.lastRevenueSync,
        joinedAt: participant.joinedAt,
      })) || [];

    // Calculate statistics
    const stats = {
      totalParticipants: leaderboard.length,
      totalRevenue: leaderboard.reduce((sum, p) => sum + p.totalRevenue, 0),
      averageRevenue:
        leaderboard.length > 0
          ? leaderboard.reduce((sum, p) => sum + p.totalRevenue, 0) /
            leaderboard.length
          : 0,
      highestRevenue:
        leaderboard.length > 0 ? leaderboard[0]?.totalRevenue || 0 : 0,
    };

    return Response.json({
      leaderboard,
      stats,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return Response.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
