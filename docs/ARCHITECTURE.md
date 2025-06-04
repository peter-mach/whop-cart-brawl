# CartBrawl Architecture Overview

## System Architecture

### Frontend (Next.js App Router)
```
app/
├── (auth)/
│   └── login/           # Whop OAuth handled automatically
├── (creator)/
│   ├── dashboard/       # Creator dashboard with tabs
│   └── competitions/
│       ├── new/         # Create competition form
│       └── [id]/        # Manage specific competition
├── (participant)/
│   ├── competitions/    # Browse all competitions
│   │   └── [id]/       # Competition details & join
│   └── my-competitions/ # User's joined competitions
└── api/
    ├── competitions/    # CRUD operations
    ├── shopify/        # OAuth & webhooks
    ├── webhooks/       # Whop webhooks
    └── user/           # User data & balance
```

### Data Flow

1. **Competition Creation**
   - Creator fills form → Validates balance → Creates competition record
   - Sets to "draft" status until funds deposited
   - Enforces maximum 60-day duration to stay within `read_orders` scope

2. **Competition Start**
   - Creator deposits funds → Whop API escrows funds
   - Competition status changes to "upcoming" → "active" at start time

3. **User Participation**
   - User joins → Redirected to Shopify OAuth
   - Grants read_orders permission → Store access token
   - Calculate initial revenue from competition start date (if already active)

4. **Revenue Tracking**
   - Background job queries Shopify GraphQL API every 5 minutes
   - Calculates total revenue using currentTotalPriceSet (handles refunds automatically)
   - Updates participant's totalRevenue in database
   - Optional: Subscribe to orders/paid webhook for real-time adjustments

5. **Competition End**
   - Background job checks end time
   - Final revenue calculation for all participants
   - Determines winner by highest revenue
   - Triggers Whop payout to winner
   - Sends notifications to all participants

### Database Schema

```prisma
model Competition {
  id          String   @id @default(cuid())
  creatorId   String   // Whop user ID
  title       String
  description String?
  prize       Decimal  @db.Decimal(10, 2)
  startDate   DateTime
  endDate     DateTime
  status      CompetitionStatus @default(DRAFT)
  fundsTxId   String?  // Whop transaction ID
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  participants Participant[]
  winner      Winner?

  // Constraint: endDate - startDate <= 60 days
}

model Participant {
  id              String   @id @default(cuid())
  userId          String   // Whop user ID
  competitionId   String
  shopifyDomain   String
  accessToken     String   // Encrypted
  totalRevenue    Decimal  @db.Decimal(10, 2) @default(0)
  lastRevenueSync DateTime @default(now())
  joinedAt        DateTime @default(now())

  competition Competition @relation(fields: [competitionId], references: [id])

  @@unique([userId, competitionId])
  @@unique([shopifyDomain, competitionId])
}

model Winner {
  id            String   @id @default(cuid())
  competitionId String   @unique
  userId        String
  totalRevenue  Decimal  @db.Decimal(10, 2)
  payoutTxId    String?  // Whop transaction ID
  wonAt         DateTime @default(now())

  competition Competition @relation(fields: [competitionId], references: [id])
}

enum CompetitionStatus {
  DRAFT
  UPCOMING
  ACTIVE
  COMPLETED
}
```

### Revenue Calculation Strategy

Using Shopify GraphQL API (recommended approach):

```typescript
// Fetch revenue for a participant during competition window
async function calculateRevenue(participant: Participant, competition: Competition) {
  const client = new shopify.clients.Graphql({ session });

  // Competition duration is guaranteed to be <= 60 days
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
              shopMoney { amount currencyCode }
            }
          }
          cursor
        }
        pageInfo { hasNextPage }
      }
    }
  `;

  let revenue = 0;
  let cursor = null;

  do {
    const response = await client.query({ data: { query, variables: { cursor } }});
    const { edges, pageInfo } = response.body.data.orders;

    revenue += edges.reduce((sum, { node }) =>
      sum + parseFloat(node.currentTotalPriceSet.shopMoney.amount), 0
    );

    cursor = pageInfo.hasNextPage ? edges[edges.length - 1].cursor : null;
  } while (cursor);

  return revenue;
}
```

### Security Considerations

1. **Shopify Access Tokens**
   - Encrypted at rest using AES-256
   - Never exposed to frontend
   - Scoped to `read_orders` only (no need for `read_all_orders`)

2. **Webhook Validation**
   - Verify HMAC for Shopify webhooks
   - Verify signatures for Whop webhooks
   - Rate limit webhook endpoints

3. **API Protection**
   - All endpoints require Whop authentication
   - Creator-only endpoints check ownership
   - Input validation with Zod schemas

### Real-time Updates

Using Whop SDK WebSocket support:
- Competition status changes
- New participants joining
- Revenue updates (throttled to every 5 minutes)
- Winner announcement

### Background Jobs

1. **Competition Status Updater** (runs every minute)
   - Check for competitions ready to start/end
   - Update status accordingly
   - Trigger winner calculation for ended competitions

2. **Revenue Calculator Job** (runs every 5 minutes)
   - For each active competition:
     - Fetch all participants
     - Query Shopify GraphQL for revenue in competition window
     - Update totalRevenue and lastRevenueSync
   - Skip if recently synced (< 5 minutes ago)

3. **Optional: Webhook Processor**
   - Listen to `orders/paid` webhook for real-time increments
   - Listen to `refunds/create` webhook for decrements
   - Update running total without full recalculation

### Error Handling

- Graceful fallbacks for failed Shopify API calls
- Retry logic with exponential backoff
- Handle rate limits (40 calls/sec for GraphQL)
- User-friendly error messages
- Comprehensive logging for debugging

### Performance Optimizations

1. **For High-Volume Stores** (>10k orders in window):
   - Use Bulk Operations API instead of paginated queries
   - Cache results with short TTL
   - Consider read-replica for leaderboard queries

2. **Contest Duration Limit**:
   - Maximum 60 days ensures we stay within `read_orders` scope
   - Simplifies permission requirements
   - Avoids need for special Shopify app approval

### Business Rules

1. **Competition Constraints**:
   - Maximum duration: 60 days
   - Minimum duration: 1 hour (to prevent gaming)
   - Start date must be in the future when creating
   - Cannot modify dates after competition starts