import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';
import { restResources } from '@shopify/shopify-api/rest/admin/2023-10';
import { createAdminApiClient } from '@shopify/admin-api-client';
import { decrypt } from './encryption';
import { PrismaClient } from './generated/prisma';

const prisma = new PrismaClient();

// Initialize Shopify API
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_CLIENT_ID!,
  apiSecretKey: process.env.SHOPIFY_CLIENT_SECRET!,
  scopes: ['read_orders'],
  hostName: process.env.HOST || 'localhost:3000',
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: false,
  restResources,
});

export { shopify };

export function getShopifyAuthUrl(
  competitionId: string,
  userId: string
): string {
  const authRoute = shopify.auth.begin({
    shop: 'placeholder', // Will be provided by user
    callbackPath: '/api/shopify/callback',
    isOnline: false, // We want offline access tokens
    rawRequest: {
      url: new URL('http://localhost:3000'),
      headers: new Headers(),
    } as any,
  });

  // We'll include competition and user info in state
  const state = Buffer.from(JSON.stringify({ competitionId, userId })).toString(
    'base64'
  );

  return `${authRoute}&state=${state}`;
}

export async function calculateRevenue(
  participant: { accessToken: string; shopifyDomain: string },
  competition: { startDate: Date; endDate: Date }
): Promise<number> {
  try {
    const accessToken = decrypt(participant.accessToken);

    const client = createAdminApiClient({
      storeDomain: participant.shopifyDomain,
      apiVersion: LATEST_API_VERSION,
      accessToken,
    });

    const query = `
      query GetRevenue($cursor: String) {
        orders(
          first: 250
          after: $cursor
          query: """
            created_at:>=${competition.startDate.toISOString()}
            created_at:<=${competition.endDate.toISOString()}
            financial_status:paid
            status:any
          """
        ) {
          edges {
            node {
              currentTotalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
            }
            cursor
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `;

    let totalRevenue = 0;
    let cursor: string | null = null;

    do {
      const response = await client.request(query, {
        variables: { cursor },
      });

      const { edges, pageInfo } = response.data.orders;

      // Sum up revenue from this page
      const pageRevenue = edges.reduce((sum: number, { node }: any) => {
        const amount = parseFloat(node.currentTotalPriceSet.shopMoney.amount);
        return sum + amount;
      }, 0);

      totalRevenue += pageRevenue;

      // Get cursor for next page
      cursor =
        pageInfo.hasNextPage && edges.length > 0
          ? edges[edges.length - 1].cursor
          : null;
    } while (cursor);

    return totalRevenue;
  } catch (error) {
    console.error('Error calculating revenue:', error);
    throw new Error('Failed to calculate revenue');
  }
}

export async function updateParticipantRevenue(
  participantId: string
): Promise<void> {
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    include: { competition: true },
  });

  if (!participant) {
    throw new Error('Participant not found');
  }

  // Only calculate for active competitions
  if (participant.competition.status !== 'ACTIVE') {
    return;
  }

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
      where: { id: participantId },
      data: {
        totalRevenue: revenue,
        lastRevenueSync: new Date(),
      },
    });
  } catch (error) {
    console.error(
      `Failed to update revenue for participant ${participantId}:`,
      error
    );
  }
}
