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

2. **Competition Start**
   - Creator deposits funds → Whop API escrows funds
   - Competition status changes to "upcoming" → "active" at start time

3. **User Participation**
   - User joins → Redirected to Shopify OAuth
   - Grants read_orders permission → Store access token
   - Initial revenue calculation from historical orders

4. **Revenue Tracking**
   - Shopify webhooks on order creation/update
   - Update participant's total revenue in real-time
   - Emit WebSocket events for leaderboard updates

5. **Competition End**
   - Background job checks end time
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
}

model Participant {
  id              String   @id @default(cuid())
  userId          String   // Whop user ID
  competitionId   String
  shopifyDomain   String
  accessToken     String   // Encrypted
  totalRevenue    Decimal  @db.Decimal(10, 2) @default(0)
  joinedAt        DateTime @default(now())

  competition Competition @relation(fields: [competitionId], references: [id])
  orders      ShopifyOrder[]

  @@unique([userId, competitionId])
  @@unique([shopifyDomain, competitionId])
}

model ShopifyOrder {
  id            String   @id @default(cuid())
  participantId String
  shopifyId     String   @unique
  amount        Decimal  @db.Decimal(10, 2)
  currency      String
  createdAt     DateTime
  processedAt   DateTime @default(now())

  participant Participant @relation(fields: [participantId], references: [id])
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

### Security Considerations

1. **Shopify Access Tokens**
   - Encrypted at rest using AES-256
   - Never exposed to frontend
   - Scoped to minimum permissions (read_orders)

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
- Revenue updates (throttled to prevent spam)
- Winner announcement

### Background Jobs

1. **Competition Status Updater** (runs every minute)
   - Check for competitions ready to start/end
   - Update status accordingly
   - Trigger winner calculation for ended competitions

2. **Revenue Sync Job** (runs every 5 minutes)
   - Fetch latest orders from Shopify for active competitions
   - Update participant revenues
   - Handle missed webhooks

### Error Handling

- Graceful fallbacks for failed Shopify API calls
- Retry logic for Whop payouts
- User-friendly error messages
- Comprehensive logging for debugging