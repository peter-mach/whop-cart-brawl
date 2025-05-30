# CartBrawl Implementation Plan

## Phase 0: Project Setup & Dependencies
- [x] Install required dependencies
  ```bash
  pnpm add @prisma/client prisma @shopify/shopify-api @shopify/admin-api-client
  pnpm add date-fns zod @tanstack/react-query axios
  pnpm add @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-select
  pnpm add @radix-ui/react-label @radix-ui/react-slot
  pnpm add class-variance-authority clsx tailwind-merge
  pnpm add lucide-react recharts
  pnpm add -D @types/node
  ```
- [X] Set up shadcn/ui
  ```bash
  pnpm dlx shadcn@latest init
  pnpm dlx shadcn@latest add card button input tabs dialog badge progress
  pnpm dlx shadcn@latest add form label select calendar toast alert
  pnpm dlx shadcn@latest add table skeleton avatar dropdown-menu
  ```
- [X] Create .env.local file with required variables
- [X] Set up database connection

## Phase 1: Database Schema Setup
- [X] Define Prisma schema models
  - [X] Competition model (id, creatorId, title, description, prize, startDate, endDate, status, fundsTxId)
    - [X] Add validation: endDate - startDate <= 60 days
  - [X] Participant model (id, userId, competitionId, shopifyDomain, accessToken, totalRevenue, lastRevenueSync, joinedAt)
  - [X] Winner model (id, competitionId, userId, totalRevenue, payoutTxId, wonAt)
  - [X] Remove ShopifyOrder model (not needed - we only track total revenue)
- [X] Run prisma migrations
- [X] Generate Prisma client

## Phase 2: Shopify OAuth Integration
- [ ] Create Shopify app in Partner Dashboard
- [X] Implement OAuth flow
  - [X] Create `/api/shopify/auth` endpoint for initiating OAuth
  - [X] Create `/api/shopify/callback` endpoint for handling OAuth callback
  - [X] Store encrypted access tokens in database
  - [X] Request `read_orders` scope only (contests limited to 60 days)
- [X] Create revenue calculation service
  - [X] Implement GraphQL query for fetching orders in date range
  - [X] Calculate total using `currentTotalPriceSet` (handles refunds automatically)
  - [X] Handle pagination with cursor
- [ ] Optional: Create webhook handlers for real-time updates
  - [ ] `/api/shopify/webhooks/orders-paid` for incrementing revenue
  - [ ] `/api/shopify/webhooks/refunds-create` for decrementing revenue

## Phase 3: Whop Integration ✅ COMPLETED
- [X] Set up Whop SDK configuration
  - [X] Enhanced existing `lib/whop-api.ts` with comprehensive services
- [X] Implement balance check service
  - [X] `getUserBalance()` - Check user's Whop balance
  - [X] `verifyUserBalance()` - Verify sufficient funds for transactions
  - [X] Created `/api/user/balance` endpoint
- [X] Create payout service using Whop API
  - [X] `createPayout()` - Create payouts to users
  - [X] `escrowCompetitionFunds()` - Escrow prize money when competition is created
  - [X] `releaseEscrowToWinner()` - Release escrowed funds to winner
  - [X] Created `lib/competition-whop.ts` for competition-specific operations
- [X] Implement user authentication middleware
  - [X] Created `lib/auth-middleware.ts` with comprehensive auth functions
  - [X] `withAuth()` HOC for protecting API routes
  - [X] `authenticateUser()` for token verification
  - [X] `optionalAuth()` for optional authentication
- [X] Create webhook handlers for Whop events
  - [X] Enhanced `/api/webhooks/route.ts` to handle multiple event types
  - [X] Payment success/failure notifications
  - [X] User lifecycle events (created, updated)
  - [X] Subscription management events
  - [X] Push notification integration
- [X] Additional services implemented:
  - [X] `sendPushNotification()` - Send push notifications to users
  - [X] `getUserProfile()` - Fetch user profile information
  - [X] Competition notification system with event-specific messages
  - [X] Created `/api/user/profile` endpoint

## Phase 4: Core Competition Logic ✅ COMPLETED
- [X] Create competition service
  - [X] Create competition with fund escrow
    - [X] Validate duration <= 60 days
    - [X] Validate duration >= 1 hour
    - [X] Validate start date is in future
  - [X] Join competition flow
  - [X] Calculate revenue using Shopify GraphQL API
  - [X] Determine winner logic
  - [X] Auto-payout on competition end
- [X] Create background jobs
  - [X] Competition status updater (upcoming → active → completed)
  - [X] Revenue calculator job (every 5 minutes for active competitions)
    - [X] Query Shopify for orders in competition window
    - [X] Update participant totalRevenue
    - [X] Skip if lastRevenueSync < 5 minutes ago
  - [X] Winner determination job

## Phase 5: API Routes ✅ COMPLETED
- [X] Creator endpoints
  - [X] `POST /api/competitions` - Create competition ✅ COMPLETED
  - [X] `GET /api/competitions/my-competitions` - List creator's competitions ✅ COMPLETED
  - [X] `PUT /api/competitions/:id` - Update competition ✅ COMPLETED
  - [X] `POST /api/competitions/:id/start` - Start competition manually ✅ COMPLETED
- [X] Participant endpoints
  - [X] `GET /api/competitions` - List all competitions ✅ COMPLETED
  - [X] `GET /api/competitions/:id` - Get competition details ✅ COMPLETED
  - [X] `POST /api/competitions/:id/join` - Join competition ✅ COMPLETED
  - [X] `GET /api/competitions/:id/leaderboard` - Get leaderboard ✅ COMPLETED
- [X] Common endpoints
  - [X] `GET /api/user/balance` - Get Whop balance ✅ COMPLETED
  - [X] `GET /api/user/profile` - Get user profile ✅ COMPLETED
  - [X] `GET /api/user/competitions` - Get user's competitions ✅ COMPLETED
- [X] Admin endpoints ✅ COMPLETED
  - [X] `GET /api/admin/background-jobs` - Get background job status
  - [X] `POST /api/admin/background-jobs` - Trigger background jobs manually

## Phase 6: UI Implementation
- [ ] Install shadcn/ui components
  - [ ] Card, Button, Input, DatePicker, Tabs, Dialog, Badge, Progress
- [ ] Creator Views
  - [ ] Dashboard with tabs (Active, Upcoming, Completed)
  - [ ] Create competition form
    - [ ] Title, description, prize amount
    - [ ] Start/end date pickers
    - [ ] Date validation (max 60 days, min 1 hour)
    - [ ] Show duration in days/hours
    - [ ] Fund deposit confirmation
  - [ ] Competition management view
- [ ] Participant Views
  - [ ] Competition listing page
    - [ ] Filter by status (upcoming, active, completed)
    - [ ] Search functionality
  - [ ] Competition detail page
    - [ ] Join button with Shopify OAuth flow
    - [ ] Leaderboard showing cached revenue data
    - [ ] Time remaining countdown
    - [ ] Participant count
  - [ ] Results view (won/lost status)
- [ ] Common Components
  - [ ] Navigation header
  - [ ] Competition card component
  - [ ] Leaderboard table
  - [ ] Countdown timer
  - [ ] Revenue display with animation

## Phase 7: Real-time Updates
- [ ] Implement WebSocket connection for live updates
  - [ ] Leaderboard updates (when revenue job runs)
  - [ ] Participant count updates
  - [ ] Competition status changes
- [ ] Create event emitters for
  - [ ] New participant joined
  - [ ] Revenue updated (throttled to sync frequency)
  - [ ] Competition ended

## Phase 8: Notifications
- [X] Implement Whop push notifications ✅ COMPLETED (Phase 3)
  - [X] Competition starting soon (1 hour before)
  - [X] Competition went live
  - [X] Competition ending soon (1 hour before)
  - [X] Competition ended (won/lost)
  - [X] Payment success/failure notifications
  - [X] Welcome messages for new users
- [ ] In-app notifications
  - [ ] Toast notifications for real-time events

## Phase 9: Security & Error Handling
- [ ] Implement rate limiting
- [ ] Add input validation
  - [X] Competition duration validation (1 hour - 60 days) ✅ COMPLETED
  - [X] Start date must be future ✅ COMPLETED
  - [X] Prize amount validation ✅ COMPLETED
- [X] Encrypt Shopify access tokens ✅ COMPLETED (Phase 2)
- [ ] Add error boundaries
- [ ] Implement proper error messages
- [ ] Handle Shopify API rate limits (40 calls/sec)
- [X] Add logging for debugging ✅ PARTIALLY COMPLETED (webhook logging added)

## Phase 10: Testing & Deployment
- [ ] Write unit tests for revenue calculation
- [ ] Test Shopify OAuth flow
- [ ] Test Whop payment flows
- [ ] Create seed data for development
- [ ] Set up environment variables
- [ ] Deploy to Vercel
- [ ] Configure production webhooks

## Technical Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL
- **APIs**: Whop SDK, Shopify Admin API (GraphQL)
- **Real-time**: WebSockets (via Whop SDK)
- **Deployment**: Vercel

## Environment Variables Needed
```
DATABASE_URL=
WHOP_API_KEY=
WHOP_APP_ID=
WHOP_AGENT_USER_ID=
WHOP_WEBHOOK_SECRET=
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=
SHOPIFY_WEBHOOK_SECRET=
ENCRYPTION_KEY=
```

## Files Created/Modified in Phase 3:
- **Enhanced**: `lib/whop-api.ts` - Added balance, payout, escrow, and notification services
- **Created**: `lib/auth-middleware.ts` - User authentication middleware and utilities
- **Created**: `lib/competition-whop.ts` - Competition-specific Whop operations
- **Enhanced**: `app/api/webhooks/route.ts` - Multiple webhook event handling
- **Created**: `app/api/user/balance/route.ts` - User balance endpoint
- **Created**: `app/api/user/profile/route.ts` - User profile endpoint

## Files Created/Modified in Phase 4:
- **Created**: `lib/competition.ts` - Core competition service with all business logic
  - Competition creation with validation and fund escrow
  - Competition joining with comprehensive checks
  - Revenue calculation and leaderboard management
  - Winner determination and automatic payout
  - User competition tracking and management
- **Created**: `lib/background-jobs.ts` - Background job scheduler and processors
  - Competition status management (UPCOMING → ACTIVE → COMPLETED)
  - Revenue calculation jobs (every 5 minutes)
  - Notification scheduling (starting soon, ending soon)
  - Manual job triggers and monitoring
- **Created**: `app/api/admin/background-jobs/route.ts` - Admin API for job management
  - Job status monitoring and statistics
  - Manual job triggers for testing and maintenance

## Files Created/Modified in Phase 5:
- **Created**: `app/api/competitions/route.ts` - Main competitions API
  - `GET` - List all competitions with filtering, search, and pagination
  - `POST` - Create new competition with validation and fund escrow
- **Created**: `app/api/competitions/my-competitions/route.ts` - Creator's competitions
  - `GET` - List competitions created by authenticated user with detailed stats
- **Created**: `app/api/competitions/[id]/route.ts` - Individual competition management
  - `GET` - Get competition details with context-aware participant information
  - `PUT` - Update competition (creator only, UPCOMING competitions only)
- **Created**: `app/api/competitions/[id]/join/route.ts` - Join competition
  - `POST` - Join competition with Shopify store validation and domain checks
- **Created**: `app/api/competitions/[id]/leaderboard/route.ts` - Competition leaderboard
  - `GET` - Get cached leaderboard with statistics and rankings
- **Created**: `app/api/competitions/[id]/start/route.ts` - Manual competition start
  - `POST` - Manually start competition (creator only, after start time)
- **Created**: `app/api/user/competitions/route.ts` - User's competition history
  - `GET` - Get competitions user created or participated in with summary stats

## Notes
- All timestamps should be in UTC
- Use `currentTotalPriceSet` from Shopify to handle refunds automatically
- Revenue calculations run every 5 minutes via background job
- Competition prize must be deposited before start time
- Winners are determined immediately when competition ends
- Shopify stores can only participate in one active competition at a time
- **Competitions are limited to 60 days maximum to avoid needing `read_all_orders` scope**
- Minimum competition duration is 1 hour to prevent gaming
- **Whop integration includes comprehensive error handling and logging**
- **Push notifications are automatically sent for all major competition events**
- **Background jobs handle all automated processes with proper error handling and monitoring**
- **Phase 5 API routes provide complete REST API with proper authentication, validation, and error handling**
- **All API routes include comprehensive input validation, proper HTTP status codes, and detailed error messages**