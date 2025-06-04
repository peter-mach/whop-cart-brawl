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

## Phase 6: UI Implementation ✅ COMPLETED
- [X] Install shadcn/ui components ✅ COMPLETED
  - [X] Added select and toast components to complete the set
- [X] Creator Views ✅ COMPLETED
  - [X] Enhanced dashboard with tabs (Create, My Competitions)
  - [X] Comprehensive create competition form
    - [X] Title, description, prize amount with validation
    - [X] Start/end date pickers with proper validation
    - [X] Date validation (max 60 days, min 1 hour, future dates)
    - [X] Duration display in days/hours
    - [X] Real-time balance checking and fund validation
    - [X] Form validation with clear error messages
  - [X] Competition management view with status-based organization
- [X] Participant Views ✅ COMPLETED
  - [X] Enhanced competition listing page
    - [X] Filter by status (upcoming, active, completed)
    - [X] Search functionality with real-time API integration
    - [X] Auto-refresh for active competitions
  - [X] Competition detail functionality integrated into cards
    - [X] Join button with Shopify domain input
    - [X] Real-time leaderboard showing cached revenue data
    - [X] Live countdown timers
    - [X] Participant count and competition stats
  - [X] Results view (won/lost status) integrated into cards
- [X] Common Components ✅ COMPLETED
  - [X] Enhanced navigation header with branding
  - [X] Comprehensive competition card component
    - [X] Status-based styling and badges
    - [X] Prize display and participant counts
    - [X] Conditional action buttons based on status
    - [X] User participation status indicators
  - [X] Advanced leaderboard table with rankings
  - [X] Animated countdown timer component
  - [X] Animated revenue display with trend indicators
- [X] Real-time API Integration ✅ COMPLETED
  - [X] Custom React hooks for all API endpoints
  - [X] Loading states and error handling
  - [X] Toast notifications for user feedback
  - [X] Auto-refresh mechanisms for live data
  - [X] Optimistic UI updates

## Phase 7: Real-time Updates
- [ ] Implement WebSocket connection for live updates
  - [ ] Leaderboard updates (when revenue job runs)
  - [ ] Participant count updates
  - [ ] Competition status changes
- [X] Create event emitters for ✅ PARTIALLY COMPLETED (via API polling)
  - [X] New participant joined (via refetch)
  - [X] Revenue updated (auto-refresh every 30 seconds for active competitions)
  - [X] Competition ended (status updates)

## Phase 8: Notifications
- [X] Implement Whop push notifications ✅ COMPLETED (Phase 3)
  - [X] Competition starting soon (1 hour before)
  - [X] Competition went live
  - [X] Competition ending soon (1 hour before)
  - [X] Competition ended (won/lost)
  - [X] Payment success/failure notifications
  - [X] Welcome messages for new users
- [X] In-app notifications ✅ COMPLETED
  - [X] Toast notifications for real-time events
  - [X] User feedback for all actions (join, create, errors)

## Phase 9: Security & Error Handling
- [ ] Implement rate limiting
- [ ] Add input validation
  - [X] Competition duration validation (1 hour - 60 days) ✅ COMPLETED
  - [X] Start date must be future ✅ COMPLETED
  - [X] Prize amount validation ✅ COMPLETED
- [X] Encrypt Shopify access tokens ✅ COMPLETED (Phase 2)
- [X] Add error boundaries ✅ COMPLETED (comprehensive error handling in UI)
- [X] Implement proper error messages ✅ COMPLETED
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
- **Real-time**: API polling with auto-refresh (WebSockets planned for Phase 7)
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

## Files Created/Modified in Phase 6:
- **Created**: `hooks/use-competitions.ts` - Comprehensive React hooks for API integration
  - Competition listing, creation, joining, and management hooks
  - User balance and profile management hooks
  - Real-time leaderboard data fetching
  - Error handling and loading states
- **Enhanced**: `components/contest-dashboard.tsx` - Complete participant dashboard
  - Real API integration replacing mock data
  - Search and filtering functionality
  - Auto-refresh for active competitions
  - Toast notifications and error handling
- **Enhanced**: `components/creator-dashboard.tsx` - Complete creator dashboard
  - Real API integration with comprehensive form validation
  - Tabbed interface for creation and management
  - Live balance checking and fund validation
  - Competition status organization and management
- **Created**: `components/competition-card.tsx` - Comprehensive competition display
  - Status-based styling and conditional content
  - Integrated leaderboard display
  - Action buttons with proper state management
  - User participation indicators and status displays
- **Created**: `components/countdown-timer.tsx` - Real-time countdown component
  - Live updates with automatic cleanup
  - Multiple display formats based on duration
  - Expired state handling
- **Created**: `components/revenue-display.tsx` - Animated revenue component
  - Smooth number animations with easing
  - Trend indicators and formatting
  - Configurable display options
- **Created**: `components/leaderboard-table.tsx` - Advanced leaderboard component
  - Trophy icons and position badges
  - User highlighting and rankings
  - Responsive design with proper styling
- **Enhanced**: `app/page.tsx` - Improved main page
  - Better header with branding
  - Enhanced tab navigation with icons
  - Mobile-first responsive design
- **Enhanced**: `app/layout.tsx` - Added toast notifications
  - Global Toaster component for user feedback
  - Improved metadata and font loading

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
- **Phase 6 UI implementation provides a complete, production-ready interface with real-time data integration**
- **All UI components include proper loading states, error handling, and user feedback**
- **Mobile-first responsive design optimized for Whop's mobile experience**
- **Real-time updates implemented via API polling with automatic refresh for active competitions**