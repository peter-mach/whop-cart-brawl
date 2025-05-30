import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { PrismaClient } from '@/lib/generated/prisma';

const prisma = new PrismaClient();

// GET /api/competitions/my-competitions - List creator's competitions (authenticated)
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build filter conditions
    const where: any = {
      creatorId: user.id,
    };

    if (status && ['UPCOMING', 'ACTIVE', 'COMPLETED'].includes(status)) {
      where.status = status;
    }

    // Get creator's competitions with detailed information
    const [competitions, total] = await Promise.all([
      prisma.competition.findMany({
        where,
        include: {
          participants: {
            select: {
              id: true,
              userId: true,
              shopifyDomain: true,
              totalRevenue: true,
              joinedAt: true,
            },
            orderBy: { totalRevenue: 'desc' },
          },
          winner: {
            select: {
              userId: true,
              totalRevenue: true,
              payoutTxId: true,
              wonAt: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' }, // UPCOMING first, then ACTIVE, then COMPLETED
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.competition.count({ where }),
    ]);

    // Format response with detailed creator information
    const formattedCompetitions = competitions.map((comp) => ({
      id: comp.id,
      title: comp.title,
      description: comp.description,
      prize: comp.prize,
      startDate: comp.startDate,
      endDate: comp.endDate,
      status: comp.status,
      fundsTxId: comp.fundsTxId,
      participantCount: comp.participants.length,
      participants: comp.participants,
      winner: comp.winner,
      totalRevenue: comp.participants.reduce(
        (sum, p) => sum + parseFloat(p.totalRevenue.toString()),
        0
      ),
      createdAt: comp.createdAt,
      updatedAt: comp.updatedAt,
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
    console.error('Get my competitions error:', error);
    return Response.json(
      { error: 'Failed to fetch your competitions' },
      { status: 500 }
    );
  }
});
