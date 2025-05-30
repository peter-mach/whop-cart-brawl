import { NextRequest } from 'next/server';
import { authenticateUser } from '@/lib/auth-middleware';
import { PrismaClient } from '@/lib/generated/prisma';
import { competitionNotifications } from '@/lib/competition-whop';

const prisma = new PrismaClient();

// POST /api/competitions/[id]/start - Start competition manually (authenticated, creator only)
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

    // Get competition details
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        participants: {
          select: { userId: true },
        },
      },
    });

    if (!competition) {
      return Response.json({ error: 'Competition not found' }, { status: 404 });
    }

    // Check if user is the creator
    if (competition.creatorId !== user.id) {
      return Response.json(
        { error: 'Only the creator can start this competition' },
        { status: 403 }
      );
    }

    // Check if competition is in UPCOMING status
    if (competition.status !== 'UPCOMING') {
      return Response.json(
        { error: `Competition is already ${competition.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Check if current time is at or after the start date
    const now = new Date();
    if (now < competition.startDate) {
      const timeUntilStart = competition.startDate.getTime() - now.getTime();
      const hoursUntilStart = Math.ceil(timeUntilStart / (1000 * 60 * 60));

      return Response.json(
        {
          error: `Competition cannot be started until ${competition.startDate.toISOString()}. ${hoursUntilStart} hours remaining.`,
        },
        { status: 400 }
      );
    }

    // Check if funds are escrowed
    if (!competition.fundsTxId) {
      return Response.json(
        { error: 'Competition funds must be escrowed before starting' },
        { status: 400 }
      );
    }

    // Update competition status to ACTIVE
    const updatedCompetition = await prisma.competition.update({
      where: { id: competitionId },
      data: { status: 'ACTIVE' },
    });

    // Notify all participants that competition has started
    if (competition.participants.length > 0) {
      const participantIds = competition.participants.map((p) => p.userId);
      await competitionNotifications.competitionStarted(
        participantIds,
        competition.title
      );
    }

    return Response.json({
      success: true,
      competition: {
        id: updatedCompetition.id,
        title: updatedCompetition.title,
        status: updatedCompetition.status,
        startDate: updatedCompetition.startDate,
        endDate: updatedCompetition.endDate,
        participantCount: competition.participants.length,
      },
      message: 'Competition started successfully',
    });
  } catch (error) {
    console.error('Start competition error:', error);
    return Response.json(
      { error: 'Failed to start competition' },
      { status: 500 }
    );
  }
}
