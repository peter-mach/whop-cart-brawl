import { NextRequest } from 'next/server';
import {
  withAuth,
  optionalAuth,
  authenticateUser,
} from '@/lib/auth-middleware';
import { getCompetitionDetails } from '@/lib/competition';
import { PrismaClient } from '@/lib/generated/prisma';

const prisma = new PrismaClient();

// GET /api/competitions/[id] - Get competition details (public)
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

    // Get competition details with participants
    const result = await getCompetitionDetails(competitionId, true);

    if (!result.success || !result.competition) {
      return Response.json(
        { error: result.error || 'Competition not found' },
        { status: 404 }
      );
    }

    // Check if user is authenticated to show additional details
    const auth = await optionalAuth(request);
    const competition = result.competition;

    // Format response based on authentication status
    const response: any = {
      id: competition.id,
      title: competition.title,
      description: competition.description,
      prize: competition.prize,
      startDate: competition.startDate,
      endDate: competition.endDate,
      status: competition.status,
      participantCount: competition.participants?.length || 0,
      winner: competition.winner,
      createdAt: competition.createdAt,
    };

    // Include participant details if user is authenticated
    if (auth.isAuthenticated && competition.participants) {
      response.participants = competition.participants.map((p: any) => ({
        id: p.id,
        userId: p.userId,
        shopifyDomain: p.shopifyDomain,
        totalRevenue: p.totalRevenue,
        joinedAt: p.joinedAt,
      }));

      // Check if authenticated user is the creator
      const isCreator = auth.user?.id === competition.creatorId;
      response.isCreator = isCreator;

      // Check if authenticated user is a participant
      const userParticipation = competition.participants.find(
        (p: any) => p.userId === auth.user?.id
      );
      response.isParticipant = !!userParticipation;

      if (userParticipation) {
        response.userParticipation = {
          id: userParticipation.id,
          shopifyDomain: userParticipation.shopifyDomain,
          totalRevenue: userParticipation.totalRevenue,
          joinedAt: userParticipation.joinedAt,
        };
      }
    }

    return Response.json(response);
  } catch (error) {
    console.error('Get competition details error:', error);
    return Response.json(
      { error: 'Failed to fetch competition details' },
      { status: 500 }
    );
  }
}

// PUT /api/competitions/[id] - Update competition (authenticated, creator only)
export async function PUT(
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

    // Check if competition exists and user is the creator
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
    });

    if (!competition) {
      return Response.json({ error: 'Competition not found' }, { status: 404 });
    }

    if (competition.creatorId !== user.id) {
      return Response.json(
        { error: 'Only the creator can update this competition' },
        { status: 403 }
      );
    }

    // Check if competition can be updated (only UPCOMING competitions)
    if (competition.status !== 'UPCOMING') {
      return Response.json(
        { error: 'Only upcoming competitions can be updated' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, description, startDate, endDate } = body;

    // Validate dates if provided
    const updateData: any = {};

    if (title !== undefined) {
      if (!title.trim()) {
        return Response.json(
          { error: 'Title cannot be empty' },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (startDate !== undefined) {
      const parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        return Response.json(
          { error: 'Invalid start date format' },
          { status: 400 }
        );
      }

      // Validate start date is in future
      if (parsedStartDate <= new Date()) {
        return Response.json(
          { error: 'Start date must be in the future' },
          { status: 400 }
        );
      }

      updateData.startDate = parsedStartDate;
    }

    if (endDate !== undefined) {
      const parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        return Response.json(
          { error: 'Invalid end date format' },
          { status: 400 }
        );
      }
      updateData.endDate = parsedEndDate;
    }

    // Validate date range if both dates are being updated
    const finalStartDate = updateData.startDate || competition.startDate;
    const finalEndDate = updateData.endDate || competition.endDate;

    if (finalEndDate <= finalStartDate) {
      return Response.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    const duration = finalEndDate.getTime() - finalStartDate.getTime();
    const durationDays = duration / (1000 * 60 * 60 * 24);
    const durationHours = duration / (1000 * 60 * 60);

    if (durationHours < 1) {
      return Response.json(
        { error: 'Competition duration must be at least 1 hour' },
        { status: 400 }
      );
    }

    if (durationDays > 60) {
      return Response.json(
        { error: 'Competition duration cannot exceed 60 days' },
        { status: 400 }
      );
    }

    // Update competition
    const updatedCompetition = await prisma.competition.update({
      where: { id: competitionId },
      data: updateData,
    });

    return Response.json({
      success: true,
      competition: updatedCompetition,
    });
  } catch (error) {
    console.error('Update competition error:', error);
    return Response.json(
      { error: 'Failed to update competition' },
      { status: 500 }
    );
  }
}
