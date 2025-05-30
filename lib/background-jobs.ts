import { PrismaClient } from './generated/prisma';
import { updateCompetitionRevenue, determineWinner } from './competition';
import { competitionNotifications } from './competition-whop';

const prisma = new PrismaClient();

/**
 * Update competition statuses based on current time
 * - UPCOMING → ACTIVE when start time is reached
 * - ACTIVE → COMPLETED when end time is reached
 */
export async function updateCompetitionStatuses() {
  try {
    const now = new Date();

    // Find upcoming competitions that should start
    const competitionsToStart = await prisma.competition.findMany({
      where: {
        status: 'UPCOMING',
        startDate: {
          lte: now,
        },
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
        },
      },
    });

    // Start competitions
    for (const competition of competitionsToStart) {
      await prisma.competition.update({
        where: { id: competition.id },
        data: { status: 'ACTIVE' },
      });

      // Notify participants that competition has started
      if (competition.participants.length > 0) {
        const participantIds = competition.participants.map((p) => p.userId);
        await competitionNotifications.competitionStarted(
          participantIds,
          competition.title
        );
      }

      console.log(
        `Competition ${competition.id} started: ${competition.title}`
      );
    }

    // Find active competitions that should end
    const competitionsToEnd = await prisma.competition.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          lte: now,
        },
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
        },
      },
    });

    // End competitions and determine winners
    for (const competition of competitionsToEnd) {
      await prisma.competition.update({
        where: { id: competition.id },
        data: { status: 'COMPLETED' },
      });

      // Determine winner and process payout
      const winnerResult = await determineWinner(competition.id);

      if (winnerResult.success) {
        console.log(
          `Winner determined for competition ${competition.id}: User ${winnerResult.winner?.userId}`
        );
      } else {
        console.error(
          `Failed to determine winner for competition ${competition.id}:`,
          winnerResult.error
        );
      }

      // Notify participants that competition has ended
      if (competition.participants.length > 0) {
        const participantIds = competition.participants.map((p) => p.userId);
        await competitionNotifications.competitionEnded(
          participantIds,
          competition.title
        );
      }

      console.log(`Competition ${competition.id} ended: ${competition.title}`);
    }

    return {
      success: true,
      started: competitionsToStart.length,
      ended: competitionsToEnd.length,
    };
  } catch (error) {
    console.error('Update competition statuses error:', error);
    return {
      success: false,
      error: 'Failed to update competition statuses',
    };
  }
}

/**
 * Send notifications for competitions starting soon (1 hour before)
 */
export async function sendCompetitionStartingNotifications() {
  try {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000);

    // Find competitions starting in approximately 1 hour (within 10-minute window)
    const competitionsStartingSoon = await prisma.competition.findMany({
      where: {
        status: 'UPCOMING',
        startDate: {
          gte: tenMinutesFromNow,
          lte: oneHourFromNow,
        },
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
        },
      },
    });

    for (const competition of competitionsStartingSoon) {
      if (competition.participants.length > 0) {
        const participantIds = competition.participants.map((p) => p.userId);
        const minutesUntilStart = Math.round(
          (competition.startDate.getTime() - Date.now()) / (1000 * 60)
        );

        await competitionNotifications.competitionStarting(
          participantIds,
          competition.title,
          minutesUntilStart
        );

        console.log(
          `Sent starting notifications for competition ${competition.id}: ${competition.title}`
        );
      }
    }

    return {
      success: true,
      notified: competitionsStartingSoon.length,
    };
  } catch (error) {
    console.error('Send starting notifications error:', error);
    return {
      success: false,
      error: 'Failed to send starting notifications',
    };
  }
}

/**
 * Send notifications for competitions ending soon (1 hour before)
 */
export async function sendCompetitionEndingNotifications() {
  try {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000);

    // Find competitions ending in approximately 1 hour (within 10-minute window)
    const competitionsEndingSoon = await prisma.competition.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: tenMinutesFromNow,
          lte: oneHourFromNow,
        },
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
        },
      },
    });

    for (const competition of competitionsEndingSoon) {
      if (competition.participants.length > 0) {
        const participantIds = competition.participants.map((p) => p.userId);
        const minutesUntilEnd = Math.round(
          (competition.endDate.getTime() - Date.now()) / (1000 * 60)
        );

        await competitionNotifications.competitionEndingSoon(
          participantIds,
          competition.title,
          minutesUntilEnd
        );

        console.log(
          `Sent ending notifications for competition ${competition.id}: ${competition.title}`
        );
      }
    }

    return {
      success: true,
      notified: competitionsEndingSoon.length,
    };
  } catch (error) {
    console.error('Send ending notifications error:', error);
    return {
      success: false,
      error: 'Failed to send ending notifications',
    };
  }
}

/**
 * Update revenue for all active competitions
 * Should run every 5 minutes
 */
export async function updateAllActiveCompetitionsRevenue() {
  try {
    const activeCompetitions = await prisma.competition.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, title: true },
    });

    const results = await Promise.allSettled(
      activeCompetitions.map(async (competition) => {
        try {
          const result = await updateCompetitionRevenue(competition.id);
          console.log(
            `Updated revenue for competition ${competition.id}: ${result.updated} participants updated, ${result.failed} failed`
          );
          return result;
        } catch (error) {
          console.error(
            `Failed to update revenue for competition ${competition.id}:`,
            error
          );
          throw error;
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
      competitions: activeCompetitions.length,
      successful,
      failed,
    };
  } catch (error) {
    console.error('Update all competitions revenue error:', error);
    return {
      success: false,
      error: 'Failed to update competitions revenue',
    };
  }
}

/**
 * Main job runner - combines all background jobs
 * This should be called periodically (e.g., every minute)
 */
export async function runBackgroundJobs() {
  console.log('Running background jobs...', new Date().toISOString());

  try {
    // Update competition statuses (every run)
    const statusResult = await updateCompetitionStatuses();
    console.log('Status update result:', statusResult);

    // Send starting notifications (every run, but only notifies within time window)
    const startingResult = await sendCompetitionStartingNotifications();
    console.log('Starting notifications result:', startingResult);

    // Send ending notifications (every run, but only notifies within time window)
    const endingResult = await sendCompetitionEndingNotifications();
    console.log('Ending notifications result:', endingResult);

    // Update revenue (every 5 minutes)
    const currentMinute = new Date().getMinutes();
    if (currentMinute % 5 === 0) {
      const revenueResult = await updateAllActiveCompetitionsRevenue();
      console.log('Revenue update result:', revenueResult);
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Background jobs error:', error);
    return {
      success: false,
      error: 'Background jobs failed',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Initialize background job scheduler
 * In a production environment, this would be handled by a cron job or task scheduler
 */
export function startBackgroundJobScheduler() {
  console.log('Starting background job scheduler...');

  // Run immediately
  runBackgroundJobs();

  // Run every minute
  const interval = setInterval(runBackgroundJobs, 60 * 1000);

  // Return cleanup function
  return () => {
    console.log('Stopping background job scheduler...');
    clearInterval(interval);
  };
}

/**
 * Manual trigger for revenue updates (for testing/admin use)
 */
export async function triggerManualRevenueUpdate(competitionId?: string) {
  try {
    if (competitionId) {
      const result = await updateCompetitionRevenue(competitionId);
      return {
        success: true,
        message: `Revenue updated for competition ${competitionId}`,
        result,
      };
    } else {
      const result = await updateAllActiveCompetitionsRevenue();
      return {
        success: true,
        message: 'Revenue updated for all active competitions',
        result,
      };
    }
  } catch (error) {
    console.error('Manual revenue update error:', error);
    return {
      success: false,
      error: 'Failed to update revenue',
    };
  }
}

/**
 * Get background job status and statistics
 */
export async function getBackgroundJobStatus() {
  try {
    const now = new Date();

    // Get competition statistics
    const [total, upcoming, active, completed] = await Promise.all([
      prisma.competition.count(),
      prisma.competition.count({ where: { status: 'UPCOMING' } }),
      prisma.competition.count({ where: { status: 'ACTIVE' } }),
      prisma.competition.count({ where: { status: 'COMPLETED' } }),
    ]);

    // Get active competitions with participant counts
    const activeCompetitions = await prisma.competition.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        _count: {
          select: { participants: true },
        },
      },
    });

    // Get upcoming competitions starting soon
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const upcomingCompetitions = await prisma.competition.findMany({
      where: {
        status: 'UPCOMING',
        startDate: { lte: oneHourFromNow },
      },
      select: {
        id: true,
        title: true,
        startDate: true,
      },
    });

    return {
      success: true,
      timestamp: now.toISOString(),
      statistics: {
        total,
        upcoming,
        active,
        completed,
      },
      activeCompetitions,
      upcomingCompetitions,
    };
  } catch (error) {
    console.error('Get background job status error:', error);
    return {
      success: false,
      error: 'Failed to get job status',
    };
  }
}
