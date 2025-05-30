import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getUserCompetitions } from '@/lib/competition';

// GET /api/user/competitions - Get user's competitions (authenticated)
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'created', 'participated', or 'all'

    // Get user's competitions
    const result = await getUserCompetitions(user.id);

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 500 });
    }

    const { created, participated } = result;

    // Format competitions with additional user-specific data
    const formatCompetition = (
      comp: any,
      userRole: 'creator' | 'participant'
    ) => ({
      id: comp.id,
      title: comp.title,
      description: comp.description,
      prize: comp.prize,
      startDate: comp.startDate,
      endDate: comp.endDate,
      status: comp.status,
      participantCount: comp.participants?.length || 0,
      winner: comp.winner,
      userRole,
      isWinner: comp.winner?.userId === user.id,
      createdAt: comp.createdAt,
      updatedAt: comp.updatedAt,
    });

    let response: any = {};

    // Filter based on type parameter
    if (type === 'created' || !type) {
      response.created =
        created?.map((comp: any) => formatCompetition(comp, 'creator')) || [];
    }

    if (type === 'participated' || !type) {
      response.participated =
        participated?.map((comp: any) =>
          formatCompetition(comp, 'participant')
        ) || [];
    }

    // If type is 'all', combine and sort by most recent
    if (type === 'all') {
      const allCompetitions = [
        ...(created?.map((comp: any) => formatCompetition(comp, 'creator')) ||
          []),
        ...(participated?.map((comp: any) =>
          formatCompetition(comp, 'participant')
        ) || []),
      ].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      response = { competitions: allCompetitions };
    } else {
      // Add summary statistics
      response.summary = {
        totalCreated: created?.length || 0,
        totalParticipated: participated?.length || 0,
        totalWon: [...(created || []), ...(participated || [])].filter(
          (comp: any) => comp.winner?.userId === user.id
        ).length,
        activeCompetitions: [
          ...(created || []),
          ...(participated || []),
        ].filter((comp: any) => comp.status === 'ACTIVE').length,
      };
    }

    return Response.json(response);
  } catch (error) {
    console.error('Get user competitions error:', error);
    return Response.json(
      { error: 'Failed to fetch user competitions' },
      { status: 500 }
    );
  }
});
