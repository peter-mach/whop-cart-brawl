import { NextRequest } from 'next/server';
import { withAuth, optionalAuth } from '@/lib/auth-middleware';
import { createCompetition, CreateCompetitionData } from '@/lib/competition';
import { PrismaClient } from '@/lib/generated/prisma';

const prisma = new PrismaClient();

// GET /api/competitions - List all competitions (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build filter conditions
    const where: any = {};

    if (status && ['UPCOMING', 'ACTIVE', 'COMPLETED'].includes(status)) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get competitions with participant count
    const [competitions, total] = await Promise.all([
      prisma.competition.findMany({
        where,
        include: {
          participants: {
            select: { id: true },
          },
          winner: {
            select: {
              userId: true,
              totalRevenue: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' }, // UPCOMING first, then ACTIVE, then COMPLETED
          { startDate: 'asc' },
        ],
        skip,
        take: limit,
      }),
      prisma.competition.count({ where }),
    ]);

    // Format response
    const formattedCompetitions = competitions.map((comp) => ({
      id: comp.id,
      title: comp.title,
      description: comp.description,
      prize: comp.prize,
      startDate: comp.startDate,
      endDate: comp.endDate,
      status: comp.status,
      participantCount: comp.participants.length,
      winner: comp.winner,
      createdAt: comp.createdAt,
    }));

    return Response.json({
      competitions: formattedCompetitions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get competitions error:', error);
    return Response.json(
      { error: 'Failed to fetch competitions' },
      { status: 500 }
    );
  }
}

// POST /api/competitions - Create new competition (authenticated)
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();

    // Validate required fields
    const { title, description, prize, startDate, endDate } = body;

    if (!title || !prize || !startDate || !endDate) {
      return Response.json(
        { error: 'Missing required fields: title, prize, startDate, endDate' },
        { status: 400 }
      );
    }

    // Parse dates
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      return Response.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Create competition data
    const competitionData: CreateCompetitionData = {
      title,
      description,
      prize: parseFloat(prize),
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      creatorId: user.id,
    };

    // Create competition using service
    const result = await createCompetition(competitionData);

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json(
      {
        success: true,
        competition: result.competition,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create competition error:', error);
    return Response.json(
      { error: 'Failed to create competition' },
      { status: 500 }
    );
  }
});
