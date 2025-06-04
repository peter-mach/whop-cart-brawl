import { prisma } from './prisma';
import { calculateRevenue } from './shopify';
import {
  createCompetitionEscrow,
  completeCompetitionPayout,
  competitionNotifications,
} from './competition-whop';
import { encrypt } from './encryption';

export interface CreateCompetitionData {
  title: string;
  description?: string;
  prize: number;
  startDate: Date;
  endDate: Date;
  creatorId: string;
}

export interface JoinCompetitionData {
  competitionId: string;
  userId: string;
  shopifyDomain: string;
  accessToken: string; // This will be encrypted before storing
}

/**
 * Validate competition data before creation
 */
function validateCompetition(data: CreateCompetitionData): {
  valid: boolean;
  error?: string;
} {
  const now = new Date();
  const duration = data.endDate.getTime() - data.startDate.getTime();
  const durationDays = duration / (1000 * 60 * 60 * 24);
  const durationHours = duration / (1000 * 60 * 60);

  // Validate start date is in future
  if (data.startDate <= now) {
    return { valid: false, error: 'Start date must be in the future' };
  }

  // Validate duration >= 1 hour
  if (durationHours < 1) {
    return {
      valid: false,
      error: 'Competition duration must be at least 1 hour',
    };
  }

  // Validate duration <= 60 days
  if (durationDays > 60) {
    return {
      valid: false,
      error: 'Competition duration cannot exceed 60 days',
    };
  }

  // Validate prize amount
  if (data.prize <= 0) {
    return { valid: false, error: 'Prize amount must be greater than 0' };
  }

  // Validate end date is after start date
  if (data.endDate <= data.startDate) {
    return { valid: false, error: 'End date must be after start date' };
  }

  return { valid: true };
}

/**
 * Create a new competition with fund escrow
 */
export async function createCompetition(data: CreateCompetitionData) {
  try {
    // Validate competition data
    const validation = validateCompetition(data);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Create competition in database
    const competition = await prisma.competition.create({
      data: {
        title: data.title,
        description: data.description,
        prize: data.prize,
        startDate: data.startDate,
        endDate: data.endDate,
        creatorId: data.creatorId,
        status: 'UPCOMING',
      },
    });

    // Escrow funds using Whop
    const escrowResult = await createCompetitionEscrow(
      data.creatorId,
      data.prize,
      competition.id
    );

    if (!escrowResult.success) {
      // Delete competition if escrow fails
      await prisma.competition.delete({
        where: { id: competition.id },
      });

      return {
        success: false,
        error: escrowResult.error,
      };
    }

    // Update competition with escrow ID
    await prisma.competition.update({
      where: { id: competition.id },
      data: { fundsTxId: escrowResult.escrowId },
    });

    return {
      success: true,
      competition: {
        ...competition,
        fundsTxId: escrowResult.escrowId,
      },
    };
  } catch (error) {
    console.error('Create competition error:', error);
    return {
      success: false,
      error: 'Failed to create competition',
    };
  }
}

/**
 * Join a competition with Shopify store connection
 */
export async function joinCompetition(data: JoinCompetitionData) {
  try {
    // Check if competition exists and is upcoming or active
    const competition = await prisma.competition.findUnique({
      where: { id: data.competitionId },
      include: { participants: true },
    });

    if (!competition) {
      return {
        success: false,
        error: 'Competition not found',
      };
    }

    if (competition.status === 'COMPLETED') {
      return {
        success: false,
        error: 'Competition has already ended',
      };
    }

    if (competition.status === 'DRAFT') {
      return {
        success: false,
        error: 'Competition is not yet open for registration',
      };
    }

    // Check if user is already participating
    const existingParticipant = await prisma.participant.findUnique({
      where: {
        userId_competitionId: {
          userId: data.userId,
          competitionId: data.competitionId,
        },
      },
    });

    if (existingParticipant) {
      return {
        success: false,
        error: 'You are already participating in this competition',
      };
    }

    // Check if this Shopify domain is already participating
    const existingDomain = await prisma.participant.findUnique({
      where: {
        shopifyDomain_competitionId: {
          shopifyDomain: data.shopifyDomain,
          competitionId: data.competitionId,
        },
      },
    });

    if (existingDomain) {
      return {
        success: false,
        error:
          'This Shopify store is already participating in this competition',
      };
    }

    // Check if user has an active competition with another store
    const activeParticipation = await prisma.participant.findFirst({
      where: {
        userId: data.userId,
        competition: {
          status: 'ACTIVE',
        },
      },
    });

    if (activeParticipation) {
      return {
        success: false,
        error: 'You can only participate in one active competition at a time',
      };
    }

    // Encrypt access token before storing
    const encryptedToken = encrypt(data.accessToken);

    // Create participant
    const participant = await prisma.participant.create({
      data: {
        userId: data.userId,
        competitionId: data.competitionId,
        shopifyDomain: data.shopifyDomain,
        accessToken: encryptedToken,
      },
    });

    // Notify existing participants about new competitor
    const existingParticipantIds = competition.participants
      .filter((p) => p.userId !== data.userId)
      .map((p) => p.userId);

    if (existingParticipantIds.length > 0) {
      await competitionNotifications.newParticipantJoined(
        existingParticipantIds,
        competition.title,
        competition.participants.length + 1
      );
    }

    return {
      success: true,
      participant,
    };
  } catch (error) {
    console.error('Join competition error:', error);
    return {
      success: false,
      error: 'Failed to join competition',
    };
  }
}

/**
 * Get competition leaderboard
 */
export async function getCompetitionLeaderboard(competitionId: string) {
  try {
    const participants = await prisma.participant.findMany({
      where: { competitionId },
      orderBy: { totalRevenue: 'desc' },
      select: {
        id: true,
        userId: true,
        shopifyDomain: true,
        totalRevenue: true,
        lastRevenueSync: true,
        joinedAt: true,
      },
    });

    return {
      success: true,
      leaderboard: participants,
    };
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return {
      success: false,
      error: 'Failed to get leaderboard',
    };
  }
}

/**
 * Determine winner of a competition
 */
export async function determineWinner(competitionId: string) {
  try {
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        participants: {
          orderBy: { totalRevenue: 'desc' },
        },
        winner: true,
      },
    });

    if (!competition) {
      return {
        success: false,
        error: 'Competition not found',
      };
    }

    if (competition.winner) {
      return {
        success: true,
        winner: competition.winner,
      };
    }

    if (competition.participants.length === 0) {
      return {
        success: false,
        error: 'No participants in competition',
      };
    }

    // Get participant with highest revenue
    const winner = competition.participants[0];

    // Create winner record
    const winnerRecord = await prisma.winner.create({
      data: {
        competitionId,
        userId: winner.userId,
        totalRevenue: winner.totalRevenue,
      },
    });

    // Process payout
    if (competition.fundsTxId) {
      const payoutResult = await completeCompetitionPayout(
        competition.fundsTxId,
        winner.userId,
        competitionId,
        parseFloat(competition.prize.toString()),
        competition.title
      );

      if (payoutResult.success) {
        await prisma.winner.update({
          where: { id: winnerRecord.id },
          data: { payoutTxId: payoutResult.payoutId },
        });
      }
    }

    return {
      success: true,
      winner: winnerRecord,
    };
  } catch (error) {
    console.error('Determine winner error:', error);
    return {
      success: false,
      error: 'Failed to determine winner',
    };
  }
}

/**
 * Get competition details
 */
export async function getCompetitionDetails(
  competitionId: string,
  includeParticipants = false
) {
  try {
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        participants: includeParticipants
          ? {
              select: {
                id: true,
                userId: true,
                shopifyDomain: true,
                totalRevenue: true,
                joinedAt: true,
              },
            }
          : false,
        winner: true,
      },
    });

    if (!competition) {
      return {
        success: false,
        error: 'Competition not found',
      };
    }

    return {
      success: true,
      competition,
    };
  } catch (error) {
    console.error('Get competition details error:', error);
    return {
      success: false,
      error: 'Failed to get competition details',
    };
  }
}

/**
 * Get competitions for a user (as creator or participant)
 */
export async function getUserCompetitions(userId: string) {
  try {
    // Get competitions where user is creator
    const createdCompetitions = await prisma.competition.findMany({
      where: { creatorId: userId },
      include: {
        participants: {
          select: {
            id: true,
            userId: true,
            shopifyDomain: true,
            totalRevenue: true,
          },
        },
        winner: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get competitions where user is participant
    const participatedCompetitions = await prisma.participant.findMany({
      where: { userId },
      include: {
        competition: {
          include: {
            participants: {
              select: {
                id: true,
                userId: true,
                shopifyDomain: true,
                totalRevenue: true,
              },
            },
            winner: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return {
      success: true,
      created: createdCompetitions,
      participated: participatedCompetitions.map((p) => p.competition),
    };
  } catch (error) {
    console.error('Get user competitions error:', error);
    return {
      success: false,
      error: 'Failed to get user competitions',
    };
  }
}

/**
 * Update competition revenue for all participants
 */
export async function updateCompetitionRevenue(competitionId: string) {
  try {
    const participants = await prisma.participant.findMany({
      where: {
        competitionId,
        competition: { status: 'ACTIVE' },
      },
      include: { competition: true },
    });

    const results = await Promise.allSettled(
      participants.map(async (participant) => {
        // Skip if recently synced (less than 5 minutes ago)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (participant.lastRevenueSync > fiveMinutesAgo) {
          return;
        }

        try {
          const revenue = await calculateRevenue(
            participant,
            participant.competition
          );

          await prisma.participant.update({
            where: { id: participant.id },
            data: {
              totalRevenue: revenue,
              lastRevenueSync: new Date(),
            },
          });
        } catch (error) {
          console.error(
            `Failed to update revenue for participant ${participant.id}:`,
            error
          );
        }
      })
    );

    const successful = results.filter(
      (result) => result.status === 'fulfilled'
    ).length;
    const failed = results.filter(
      (result) => result.status === 'rejected'
    ).length;

    return {
      success: true,
      updated: successful,
      failed,
    };
  } catch (error) {
    console.error('Update competition revenue error:', error);
    return {
      success: false,
      error: 'Failed to update competition revenue',
    };
  }
}
