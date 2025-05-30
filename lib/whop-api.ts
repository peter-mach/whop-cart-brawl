import { WhopServerSdk, makeUserTokenVerifier } from '@whop/api';

export const whopApi = WhopServerSdk({
  // Add your app api key here - this is required.
  // You can get this from the Whop dashboard after creating an app in the "API Keys" section.
  appApiKey: process.env.WHOP_API_KEY ?? 'fallback',

  // This will make api requests on behalf of this user.
  // This is optional, however most api requests need to be made on behalf of a user.
  // You can create an agent user for your app, and use their userId here.
  // You can also apply a different userId later with the `withUser` function.
  onBehalfOfUserId: process.env.WHOP_AGENT_USER_ID,

  // This is the companyId that will be used for the api requests.
  // When making api requests that query or mutate data about a company, you need to specify the companyId.
  // This is optional, however if not specified certain requests will fail.
  // This can also be applied later with the `withCompany` function.
  companyId: undefined,
});

export const verifyUserToken = makeUserTokenVerifier({
  appId: process.env.WHOP_APP_ID ?? 'fallback',
  dontThrow: true,
});

// Enhanced Whop services for CartBrawl

/**
 * Check user's Whop balance
 */
export async function getUserBalance(userId: string): Promise<{
  balance: number;
  currency: string;
} | null> {
  try {
    const result = await whopApi.withUser(userId).viewer();

    if (result.isOk) {
      const user = result.data.user;
      // Note: You may need to adjust this based on actual Whop API response structure
      return {
        balance: user?.balance ?? 0,
        currency: 'USD', // Default currency, adjust based on actual API
      };
    }

    console.error('Failed to get user balance:', result.error);
    return null;
  } catch (error) {
    console.error('Error fetching user balance:', error);
    return null;
  }
}

/**
 * Create a payout to a user
 */
export async function createPayout(
  userId: string,
  amount: number,
  description: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; payoutId?: string; error?: string }> {
  try {
    // Note: This is a placeholder - you'll need to implement based on actual Whop payout API
    // The Whop SDK might have a different method for creating payouts
    const result = await whopApi.withUser(userId).createPayout({
      amount,
      description,
      metadata,
      currency: 'USD', // Adjust based on requirements
    });

    if (result.isOk) {
      return {
        success: true,
        payoutId: result.data.id,
      };
    }

    return {
      success: false,
      error: result.error?.message || 'Failed to create payout',
    };
  } catch (error) {
    console.error('Error creating payout:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verify user has sufficient balance for a transaction
 */
export async function verifyUserBalance(
  userId: string,
  requiredAmount: number
): Promise<{ hasBalance: boolean; currentBalance?: number }> {
  const balance = await getUserBalance(userId);

  if (!balance) {
    return { hasBalance: false };
  }

  return {
    hasBalance: balance.balance >= requiredAmount,
    currentBalance: balance.balance,
  };
}

/**
 * Create a fund escrow for competition prize
 */
export async function escrowCompetitionFunds(
  creatorUserId: string,
  amount: number,
  competitionId: string
): Promise<{ success: boolean; escrowId?: string; error?: string }> {
  try {
    // Check if user has sufficient balance
    const balanceCheck = await verifyUserBalance(creatorUserId, amount);

    if (!balanceCheck.hasBalance) {
      return {
        success: false,
        error: `Insufficient balance. Required: ${amount}, Available: ${
          balanceCheck.currentBalance || 0
        }`,
      };
    }

    // Create escrow transaction
    // Note: This is a placeholder - implement based on actual Whop escrow API
    const result = await whopApi.withUser(creatorUserId).createEscrow({
      amount,
      description: `Competition prize escrow for competition ${competitionId}`,
      metadata: {
        competitionId,
        type: 'competition_prize',
      },
    });

    if (result.isOk) {
      return {
        success: true,
        escrowId: result.data.id,
      };
    }

    return {
      success: false,
      error: result.error?.message || 'Failed to create escrow',
    };
  } catch (error) {
    console.error('Error creating escrow:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Release escrowed funds to winner
 */
export async function releaseEscrowToWinner(
  escrowId: string,
  winnerUserId: string,
  competitionId: string
): Promise<{ success: boolean; payoutId?: string; error?: string }> {
  try {
    // Release escrow and create payout to winner
    // Note: This is a placeholder - implement based on actual Whop escrow API
    const result = await whopApi.releaseEscrow({
      escrowId,
      recipientUserId: winnerUserId,
      description: `Competition prize payout for competition ${competitionId}`,
      metadata: {
        competitionId,
        type: 'competition_winner_payout',
      },
    });

    if (result.isOk) {
      return {
        success: true,
        payoutId: result.data.payoutId,
      };
    }

    return {
      success: false,
      error: result.error?.message || 'Failed to release escrow',
    };
  } catch (error) {
    console.error('Error releasing escrow:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send push notification to user
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await whopApi.withUser(userId).sendPushNotification({
      title,
      body: message,
      data,
    });

    if (result.isOk) {
      return { success: true };
    }

    return {
      success: false,
      error: result.error?.message || 'Failed to send notification',
    };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get user profile information
 */
export async function getUserProfile(userId: string) {
  try {
    const result = await whopApi.withUser(userId).viewer();

    if (result.isOk) {
      return {
        success: true,
        user: result.data.user,
      };
    }

    return {
      success: false,
      error: result.error?.message || 'Failed to get user profile',
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
