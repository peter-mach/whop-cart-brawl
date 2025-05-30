# CartBrawl Implementation Plan

## Phase 0: Project Setup & Dependencies
- [ ] Install required dependencies
  ```bash
  pnpm add @prisma/client prisma @shopify/shopify-api @shopify/admin-api-client
  pnpm add date-fns zod @tanstack/react-query axios
  pnpm add @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-select
  pnpm add @radix-ui/react-label @radix-ui/react-slot
  pnpm add class-variance-authority clsx tailwind-merge
  pnpm add lucide-react recharts
  pnpm add -D @types/node
  ```
- [ ] Set up shadcn/ui
  ```bash
  pnpm dlx shadcn@latest init
  pnpm dlx shadcn@latest add card button input tabs dialog badge progress
  pnpm dlx shadcn@latest add form label select calendar toast alert
  pnpm dlx shadcn@latest add table skeleton avatar dropdown-menu
  ```
- [ ] Create .env.local file with required variables
- [ ] Set up database connection

## Phase 1: Database Schema Setup
- [ ] Define Prisma schema models
  - [ ] Competition model (id, creatorId, title, description, prize, startDate, endDate, status, totalFunds)
  - [ ] Participant model (id, userId, competitionId, shopifyStoreUrl, accessToken, totalRevenue, joinedAt)
  - [ ] ShopifyOrder model (id, participantId, orderId, amount, orderDate, processed)
  - [ ] Winner model (id, competitionId, participantId, totalRevenue, wonAt)
- [ ] Run prisma migrations
- [ ] Generate Prisma client

## Phase 2: Shopify OAuth Integration
- [ ] Create Shopify app in Partner Dashboard
- [ ] Implement OAuth flow
  - [ ] Create `/api/shopify/auth` endpoint for initiating OAuth
  - [ ] Create `/api/shopify/callback` endpoint for handling OAuth callback
  - [ ] Store encrypted access tokens in database
- [ ] Create Shopify webhook handlers
  - [ ] `/api/shopify/webhooks/order-create` for tracking new orders
  - [ ] `/api/shopify/webhooks/order-update` for tracking order updates
- [ ] Create service for fetching historical orders during competition join

## Phase 3: Whop Integration
- [ ] Set up Whop SDK configuration
- [ ] Implement balance check service
- [ ] Create payout service using Whop API
- [ ] Implement user authentication middleware
- [ ] Create webhook handlers for Whop events

## Phase 4: Core Competition Logic
- [ ] Create competition service
  - [ ] Create competition with fund escrow
  - [ ] Join competition flow
  - [ ] Calculate real-time revenue from Shopify
  - [ ] Determine winner logic
  - [ ] Auto-payout on competition end
- [ ] Create background jobs
  - [ ] Competition status updater (upcoming → active → completed)
  - [ ] Revenue calculator job
  - [ ] Winner determination job

## Phase 5: API Routes
- [ ] Creator endpoints
  - [ ] `POST /api/competitions` - Create competition
  - [ ] `GET /api/competitions/my-competitions` - List creator's competitions
  - [ ] `PUT /api/competitions/:id` - Update competition
  - [ ] `POST /api/competitions/:id/start` - Start competition with fund deposit
- [ ] Participant endpoints
  - [ ] `GET /api/competitions` - List all competitions
  - [ ] `GET /api/competitions/:id` - Get competition details
  - [ ] `POST /api/competitions/:id/join` - Join competition
  - [ ] `GET /api/competitions/:id/leaderboard` - Get real-time leaderboard
- [ ] Common endpoints
  - [ ] `GET /api/user/balance` - Get Whop balance
  - [ ] `GET /api/user/competitions` - Get user's competitions

## Phase 6: UI Implementation
- [ ] Install shadcn/ui components
  - [ ] Card, Button, Input, DatePicker, Tabs, Dialog, Badge, Progress
- [ ] Creator Views
  - [ ] Dashboard with tabs (Active, Upcoming, Completed)
  - [ ] Create competition form
    - [ ] Title, description, prize amount
    - [ ] Start/end date pickers
    - [ ] Fund deposit confirmation
  - [ ] Competition management view
- [ ] Participant Views
  - [ ] Competition listing page
    - [ ] Filter by status (upcoming, active, completed)
    - [ ] Search functionality
  - [ ] Competition detail page
    - [ ] Join button with Shopify OAuth flow
    - [ ] Real-time leaderboard
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
  - [ ] Leaderboard updates
  - [ ] Participant count updates
  - [ ] Competition status changes
- [ ] Create event emitters for
  - [ ] New participant joined
  - [ ] Revenue updated
  - [ ] Competition ended

## Phase 8: Notifications
- [ ] Implement Whop push notifications
  - [ ] Competition starting soon (1 hour before)
  - [ ] Competition went live
  - [ ] Competition ending soon (1 hour before)
  - [ ] Competition ended (won/lost)
- [ ] In-app notifications
  - [ ] Toast notifications for real-time events

## Phase 9: Security & Error Handling
- [ ] Implement rate limiting
- [ ] Add input validation
- [ ] Encrypt Shopify access tokens
- [ ] Add error boundaries
- [ ] Implement proper error messages
- [ ] Add logging for debugging

## Phase 10: Testing & Deployment
- [ ] Write unit tests for core logic
- [ ] Test Shopify webhook handling
- [ ] Test Whop payment flows
- [ ] Create seed data for development
- [ ] Set up environment variables
- [ ] Deploy to Vercel
- [ ] Configure production webhooks

## Technical Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL
- **APIs**: Whop SDK, Shopify Admin API
- **Real-time**: WebSockets (via Whop SDK)
- **Deployment**: Vercel

## Environment Variables Needed
```
DATABASE_URL=
WHOP_API_KEY=
WHOP_WEBHOOK_SECRET=
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=
SHOPIFY_WEBHOOK_SECRET=
ENCRYPTION_KEY=
```

## Notes
- All timestamps should be in UTC
- Revenue calculations should handle currency conversions
- Competition prize must be deposited before start time
- Winners are determined immediately when competition ends
- Shopify stores can only participate in one active competition at a time