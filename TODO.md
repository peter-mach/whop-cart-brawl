# CartBrawl - Detailed Implementation Plan

## Tech Stack
- **Framework**: Next.js 15 (already setup)
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS (already setup)
- **APIs**: Whop SDK (@whop/api), Shopify Admin API
- **Authentication**: Whop (built-in) + Shopify OAuth

## Phase 1: Database Setup & Core Models

### 1.1 Install and Configure Prisma
- [ ] Add Prisma dependencies to package.json
- [ ] Initialize Prisma with PostgreSQL
- [ ] Create database schema with models:
  ```prisma
  model Competition {
    id            String   @id @default(cuid())
    creatorId     String   // Whop user ID
    title         String
    description   String?
    prizeAmount   Float
    startDate     DateTime
    endDate       DateTime
    status        CompetitionStatus @default(DRAFT)
    winnerId      String?
    createdAt     DateTime @default(now())
    updatedAt     DateTime @updatedAt
    participants  Participant[]
  }

  model Participant {
    id              String      @id @default(cuid())
    competitionId   String
    userId          String      // Whop user ID
    shopifyStoreUrl String
    shopifyAccessToken String   @encrypt
    totalRevenue    Float       @default(0)
    joinedAt        DateTime    @default(now())
    competition     Competition @relation(fields: [competitionId], references: [id])
    salesSnapshots  SalesSnapshot[]
  }

  model SalesSnapshot {
    id            String      @id @default(cuid())
    participantId String
    revenue       Float
    orderCount    Int
    timestamp     DateTime    @default(now())
    participant   Participant @relation(fields: [participantId], references: [id])
  }

  enum CompetitionStatus {
    DRAFT
    FUNDED
    ACTIVE
    COMPLETED
  }
  ```

### 1.2 Database Migrations
- [ ] Create initial migration
- [ ] Setup database connection in .env.local

## Phase 2: Shopify Integration

### 2.1 OAuth Implementation
- [ ] Create `/api/shopify/auth` endpoint for OAuth initiation
- [ ] Create `/api/shopify/callback` for OAuth callback
- [ ] Implement state parameter for security
- [ ] Store encrypted access tokens

### 2.2 Sales Tracking
- [ ] Create `/api/shopify/webhooks/orders` endpoint
- [ ] Register webhooks: orders/create, orders/updated
- [ ] Implement webhook verification
- [ ] Create background job to poll sales data (backup method)
- [ ] Calculate revenue in store's currency and convert to USD

### 2.3 Store Validation
- [ ] Verify store is active
- [ ] Check store has necessary permissions
- [ ] Handle store disconnection

## Phase 3: Whop Integration

### 3.1 User Context
- [ ] Setup Whop SDK client initialization
- [ ] Create user context hook to get current user
- [ ] Implement user permission checks

### 3.2 Balance Operations
- [ ] Implement balance check before competition creation
- [ ] Create fund deposit flow using Whop payments
- [ ] Implement automatic prize payout to winner
- [ ] Handle refunds for cancelled competitions

## Phase 4: Core Features Implementation

### 4.1 Creator Features
- [ ] **Create Competition Page** (`/competitions/create`)
  - Title, description fields
  - Date/time pickers for start/end
  - Prize amount input with balance check
  - Preview before confirmation

- [ ] **Competition Management** (`/competitions/[id]/manage`)
  - View participant list
  - Real-time leaderboard
  - Cancel competition (if not started)
  - Manual end competition option

- [ ] **Fund Deposit Flow**
  - Check creator's Whop balance
  - Reserve funds on competition creation
  - Release funds to winner on completion

### 4.2 User Features
- [ ] **Competition List Page** (`/competitions`)
  - Grid/list view of competitions
  - Filter: Upcoming, Active, Completed
  - Search functionality

- [ ] **Competition Detail Page** (`/competitions/[id]`)
  - Competition info display
  - Join button (connect Shopify store)
  - Real-time countdown
  - Live leaderboard
  - Participant count

- [ ] **My Competitions Page** (`/my-competitions`)
  - List of joined competitions
  - Current ranking and revenue
  - Win/loss history

### 4.3 Real-time Features
- [ ] Implement WebSocket connection for:
  - Live revenue updates
  - Participant count updates
  - Competition status changes
  - Winner announcement

## Phase 5: Notification System

### 5.1 Push Notifications
- [ ] Competition starting soon (1 hour before)
- [ ] Competition is now live
- [ ] Competition ended - winner/loser notification
- [ ] New participant joined (for creators)

### 5.2 In-App Notifications
- [ ] Notification center component
- [ ] Mark as read functionality
- [ ] Notification preferences

## Phase 6: UI Components

### 6.1 Shared Components
- [ ] `CompetitionCard` - for list views
- [ ] `Leaderboard` - real-time ranking display
- [ ] `CountdownTimer` - for active competitions
- [ ] `PrizeDisplay` - formatted prize amount
- [ ] `ParticipantAvatar` - user display

### 6.2 Page Layouts
- [ ] Empty states for all pages
- [ ] Loading states
- [ ] Error boundaries
- [ ] Mobile-responsive design

## Phase 7: Background Jobs & Cron

### 7.1 Scheduled Tasks
- [ ] Competition status updater (every minute)
  - Start competitions at scheduled time
  - End competitions and determine winner
  - Trigger winner payout

- [ ] Sales data sync (every 5 minutes)
  - Poll Shopify API for latest sales
  - Update revenue totals
  - Store snapshots for history

### 7.2 Queue System
- [ ] Implement job queue for:
  - Webhook processing
  - Payout processing
  - Notification sending

## Phase 8: Security & Performance

### 8.1 Security
- [ ] Input validation on all forms
- [ ] Rate limiting on API endpoints
- [ ] Shopify webhook verification
- [ ] SQL injection prevention
- [ ] XSS protection

### 8.2 Performance
- [ ] Database indexing strategy
- [ ] Caching layer for leaderboards
- [ ] Optimize Shopify API calls
- [ ] Image optimization

## Phase 9: Testing & Documentation

### 9.1 Testing
- [ ] Unit tests for core logic
- [ ] Integration tests for API endpoints
- [ ] E2E tests for critical flows
- [ ] Load testing for real-time features

### 9.2 Documentation
- [ ] API documentation
- [ ] User guide
- [ ] Creator guide
- [ ] Deployment guide

## Phase 10: Launch Preparation

### 10.1 Pre-launch
- [ ] Beta testing with selected users
- [ ] Performance monitoring setup
- [ ] Error tracking (Sentry)
- [ ] Analytics implementation

### 10.2 Deployment
- [ ] Environment variables setup
- [ ] Database migrations
- [ ] CI/CD pipeline
- [ ] Monitoring and alerts

## File Structure
```
app/
├── api/
│   ├── competitions/
│   │   ├── [id]/
│   │   │   ├── join/route.ts
│   │   │   ├── manage/route.ts
│   │   │   └── route.ts
│   │   └── route.ts
│   ├── shopify/
│   │   ├── auth/route.ts
│   │   ├── callback/route.ts
│   │   └── webhooks/
│   │       └── orders/route.ts
│   └── webhooks/
│       └── whop/route.ts
├── competitions/
│   ├── [id]/
│   │   ├── page.tsx
│   │   └── manage/page.tsx
│   ├── create/page.tsx
│   └── page.tsx
├── my-competitions/page.tsx
└── page.tsx (dashboard)

components/
├── competitions/
│   ├── CompetitionCard.tsx
│   ├── CompetitionForm.tsx
│   ├── Leaderboard.tsx
│   └── JoinButton.tsx
├── ui/
│   ├── CountdownTimer.tsx
│   ├── EmptyState.tsx
│   └── LoadingSpinner.tsx
└── layout/
    ├── Header.tsx
    └── NotificationCenter.tsx

lib/
├── shopify/
│   ├── client.ts
│   ├── webhooks.ts
│   └── oauth.ts
├── whop/
│   ├── client.ts
│   └── balance.ts
├── prisma.ts
└── utils/
    ├── currency.ts
    └── dates.ts
```

## MVP Priority (Week 1-2)
1. Database setup
2. Basic competition CRUD
3. Shopify OAuth
4. Sales tracking (basic)
5. Join competition flow
6. Simple leaderboard
7. Winner determination
8. Manual payout process

## Post-MVP Enhancements
- Advanced analytics dashboard
- Multiple prize tiers
- Team competitions
- Custom competition rules
- Social sharing features
- Achievement system