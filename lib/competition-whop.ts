import {
  escrowCompetitionFunds,
  releaseEscrowToWinner,
  sendPushNotification,
  verifyUserBalance,
} from './whop-api';

/**
 * Handle competition creation with fund escrow
 */
export async function createCompetitionEscrow(
  creatorUserId: string,
  prizeAmount: number,
  competitionId: string
) {
  try {
    // Verify creator has sufficient balance
    const balanceCheck = await verifyUserBalance(creatorUserId, prizeAmount);

    if (!balanceCheck.hasBalance) {
      return {
        success: false,
        error: `Insufficient balance. Required: ${prizeAmount}, Available: ${
          balanceCheck.currentBalance || 0
        }`,
      };
    }

    // Create escrow for competition prize
    const escrowResult = await escrowCompetitionFunds(
      creatorUserId,
      prizeAmount,
      competitionId
    );

    if (!escrowResult.success) {
      return {
        success: false,
        error: escrowResult.error,
      };
    }

    // Send confirmation notification
    await sendPushNotification(
      creatorUserId,
      'Competition Created',
      `Your competition has been created with a prize of $${prizeAmount}. Funds have been escrowed.`,
      {
        competitionId,
        prizeAmount,
        escrowId: escrowResult.escrowId,
      }
    );

    return {
      success: true,
      escrowId: escrowResult.escrowId,
    };
  } catch (error) {
    console.error('Competition escrow error:', error);
    return {
      success: false,
      error: 'Failed to create competition escrow',
    };
  }
}

/**
 * Handle competition completion and winner payout
 */
export async function completeCompetitionPayout(
  escrowId: string,
  winnerUserId: string,
  competitionId: string,
  prizeAmount: number,
  competitionTitle: string
) {
  try {
    // Release escrow to winner
    const payoutResult = await releaseEscrowToWinner(
      escrowId,
      winnerUserId,
      competitionId
    );

    if (!payoutResult.success) {
      return {
        success: false,
        error: payoutResult.error,
      };
    }

    // Notify winner
    await sendPushNotification(
      winnerUserId,
      '🎉 Congratulations! You won!',
      `You've won $${prizeAmount} in the competition "${competitionTitle}". Your payout is being processed.`,
      {
        competitionId,
        prizeAmount,
        payoutId: payoutResult.payoutId,
        type: 'competition_win',
      }
    );

    return {
      success: true,
      payoutId: payoutResult.payoutId,
    };
  } catch (error) {
    console.error('Competition payout error:', error);
    return {
      success: false,
      error: 'Failed to process winner payout',
    };
  }
}

/**
 * Send competition-related notifications
 */
export async function sendCompetitionNotifications(
  userIds: string[],
  title: string,
  message: string,
  data?: Record<string, any>
) {
  try {
    const promises = userIds.map((userId) =>
      sendPushNotification(userId, title, message, data)
    );

    await Promise.allSettled(promises);

    return { success: true };
  } catch (error) {
    console.error('Notification broadcast error:', error);
    return {
      success: false,
      error: 'Failed to send notifications',
    };
  }
}

/**
 * Notify participants about competition events
 */
export const competitionNotifications = {
  async competitionStarting(
    userIds: string[],
    competitionTitle: string,
    minutesUntilStart: number
  ) {
    return sendCompetitionNotifications(
      userIds,
      'Competition Starting Soon!',
      `"${competitionTitle}" starts in ${minutesUntilStart} minutes. Get ready!`,
      { type: 'competition_starting', minutesUntilStart }
    );
  },

  async competitionStarted(userIds: string[], competitionTitle: string) {
    return sendCompetitionNotifications(
      userIds,
      'Competition Started! 🚀',
      `"${competitionTitle}" has begun! Start selling to climb the leaderboard.`,
      { type: 'competition_started' }
    );
  },

  async competitionEndingSoon(
    userIds: string[],
    competitionTitle: string,
    minutesUntilEnd: number
  ) {
    return sendCompetitionNotifications(
      userIds,
      'Final Sprint! ⏰',
      `"${competitionTitle}" ends in ${minutesUntilEnd} minutes. Last chance to boost your sales!`,
      { type: 'competition_ending', minutesUntilEnd }
    );
  },

  async competitionEnded(userIds: string[], competitionTitle: string) {
    return sendCompetitionNotifications(
      userIds,
      'Competition Ended',
      `"${competitionTitle}" has finished. Check the final results!`,
      { type: 'competition_ended' }
    );
  },

  async newParticipantJoined(
    existingParticipantIds: string[],
    competitionTitle: string,
    newParticipantCount: number
  ) {
    return sendCompetitionNotifications(
      existingParticipantIds,
      'New Competitor!',
      `Someone new joined "${competitionTitle}". ${newParticipantCount} stores competing now!`,
      { type: 'new_participant', participantCount: newParticipantCount }
    );
  },
};
