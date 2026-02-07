# ViveBien Console (Dashboard) - Project Handoff

## Project Overview
**ViveBien Console** is the admin dashboard for the ViveBien wellness platform. It provides real-time monitoring of patients, conversations, AI usage, system health, follow-ups, and analytics. It connects directly to the same PostgreSQL database used by the core WhatsApp bot (`vivebien-core`).

- **Live URL**: https://patients.vivebien.io
- **GitHub**: https://github.com/jmariano19/vivebien-console
- **Easypanel Service**: `vivebien-console` under project `projecto-1`

---

## Tech Stack
- **Framework**: Next.js 14 (App Router, React Server Components)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.3 with custom ViveBien design tokens
- **Database**: PostgreSQL 16 via `pg` module (direct queries, no ORM)
- **Deployment**: Docker (standalone output) on Easypanel
- **Node**: 18 (Alpine, via Dockerfile)

---

## Architecture

```
Browser → Next.js (Server Components) → PostgreSQL
                                            ↑
                                    Same DB as vivebien-core
```

All pages use `force-dynamic` and `revalidate = 0` for real-time data. There is no client-side data fetching — everything is server-rendered.

### Relationship to vivebien-core
The dashboard is **read-only** against the same database that `vivebien-core` (the WhatsApp bot backend) writes to. The core bot handles: WhatsApp messages via Chatwoot, AI responses via Claude, voice transcription via OpenAI Whisper, and image analysis via Claude Vision.

---

## Database Connection

### Production (Easypanel)
```
DATABASE_URL=postgres://postgres:bd894cefacb1c52998f3@projecto-1_postgress:5432/projecto-1
DB_SCHEMA=public
```
**IMPORTANT**: On Easypanel, the DB host is `projecto-1_postgress` (internal Docker network). The `DB_SCHEMA` MUST be set to `public` — this is where all active data lives.

### Local Development
```
DATABASE_URL=postgres://postgres:bd894cefacb1c52998f3@85.209.95.19:5432/projecto-1
DB_SCHEMA=public
USE_MOCK_DATA=false
```
For local dev, use the external IP `85.209.95.19`. Set `USE_MOCK_DATA=true` to run without a database connection.

### Schema System
The `DB_SCHEMA` env var controls which PostgreSQL schema to query. The `lib/db.ts` file uses a prefix:
```typescript
const SCHEMA = process.env.DB_SCHEMA || 'public';
const s = SCHEMA === 'public' ? '' : `${SCHEMA}.`;
// Queries use: FROM ${s}users, FROM ${s}messages, etc.
```
- `public` schema: Active production data (users, messages, ai_usage, circuit_breakers, etc.)
- `production` schema: Legacy n8n-era tables + media tables (media, media_limits)
- `test` schema: Staging/test data

### Special Cross-Schema Query
`fetchAiUsageStats()` queries BOTH `${s}ai_usage` (public schema) AND `production.media` (hardcoded) to combine Claude chat costs with OpenAI Whisper/Vision media processing costs. The `production.media` table tracks: `ai_model`, `ai_tokens_used`, `ai_cost_usd`, `media_type`, `processing_status`.

---

## Database Tables (public schema)

### Core Tables Used by Dashboard
| Table | Purpose | Dashboard Usage |
|-------|---------|-----------------|
| `users` | Patient records (id, phone, name, language, status) | Patient list, stats |
| `messages` | Conversation history (user_id, role, content) | Patient detail, message volume charts |
| `conversation_state` | Current emotional state, phase, message count | Emotional state distribution |
| `followups` | Scheduled follow-ups (user_id, type, status, due_date) | Follow-ups page |
| `memories` | Health summaries and extracted info | Patient detail |
| `ai_usage` | Claude API call tracking (model, tokens, cost, latency) | System health AI usage |
| `circuit_breakers` | Service health (chatwoot_api, claude_api, twilio_api) | System health status |
| `circuit_breaker_state` | Circuit breaker state tracking | System health |
| `execution_logs` | Job execution history (status, execution_time_ms) | System health recent executions |
| `operator_notes` | Admin notes on patients (user_id, note, tags) | Patient detail |
| `vault_profiles` | Medical vault data | Patient detail |
| `vault_medications` | Patient medications | Patient detail |
| `vault_conditions` | Patient conditions | Patient detail |
| `vault_allergies` | Patient allergies | Patient detail |
| `vault_symptoms` | Patient symptoms | Patient detail |
| `vault_family_history` | Patient family history | Patient detail |
| `billing_accounts` | Billing info (user_id) | Referenced in delete cascades |
| `health_routines` | Health routines (currently 0 rows) | Referenced but unused |

### Cross-Schema Table
| Table | Schema | Purpose |
|-------|--------|---------|
| `production.media` | production | Tracks Whisper/Vision AI costs (ai_model, ai_cost_usd, ai_tokens_used, media_type) |

---

## Project Structure

```
vivebien-dashboard-local/
├── app/
│   ├── page.tsx                    # Main dashboard (stats, patients, follow-ups, system health)
│   ├── layout.tsx                  # Root layout with nav, ViveBien branding
│   ├── MobileNav.tsx               # Mobile navigation component
│   ├── globals.css                 # Tailwind + custom ViveBien design tokens
│   ├── loading.tsx                 # Loading skeleton
│   ├── not-found.tsx               # 404 page
│   ├── analytics/
│   │   └── page.tsx                # Analytics (message volume, emotional states, topics, user growth, active users)
│   ├── followups/
│   │   └── page.tsx                # Follow-ups management (pending, overdue, completed)
│   ├── patient/
│   │   └── [id]/
│   │       ├── page.tsx            # Patient detail (profile, vault, messages, notes)
│   │       └── PatientTabs.tsx     # Client component for tab navigation
│   ├── system-health/
│   │   └── page.tsx                # System health (circuit breakers, AI usage, DB overview, executions)
│   └── api/                        # API routes (if any)
├── lib/
│   └── db.ts                       # ALL database queries (~897 lines). Single source of truth.
├── public/                         # Static assets (logo, favicon)
├── Dockerfile                      # Multi-stage Docker build (node:18-alpine)
├── next.config.js                  # standalone output, pg external package
├── tailwind.config.ts              # Custom ViveBien theme tokens
├── package.json                    # Dependencies: next 14, react 18, pg 8
├── .env.local                      # Local environment variables (DO NOT COMMIT)
└── HANDOFF.md                      # This file
```

---

## Key File: lib/db.ts

This is the most important file. It contains ALL database access logic — every query, interface, and data function. There is no ORM.

### Exported Functions (grouped by page)

**Dashboard (page.tsx)**:
- `fetchUsers()` — All patients with details
- `fetchDashboardStats()` — Summary stats (total users, messages, active users, etc.)
- `fetchPendingFollowups()` — Upcoming follow-ups
- `fetchEngagementOpportunities()` — Users needing attention
- `fetchSystemHealth()` — Quick system health check
- `fetchRecentActivity(limit)` — Recent activity feed

**Patient Detail (patient/[id]/page.tsx)**:
- `fetchUserById(id)` — Single user with full details
- `fetchUserMessages(userId, limit)` — Conversation history
- `fetchUserNotes(userId)` — Operator notes
- `addOperatorNote(userId, note, createdBy, tags)` — Add a note

**Follow-ups (followups/page.tsx)**:
- `fetchPendingFollowups()` — Pending follow-ups
- `fetchOverdueFollowups()` — Overdue follow-ups

**Analytics (analytics/page.tsx)**:
- `fetchMessageVolumeByDay(days)` — Message volume bar chart (14 days)
- `fetchEmotionalStateDistribution()` — Emotional state pie data
- `fetchTopicDistribution()` — Topic breakdown
- `fetchUserGrowth(days)` — User growth line chart
- `fetchEngagementMetrics()` — Engagement stats
- `fetchTodaysActiveUsers()` — Today's active users list
- `fetchDailyActiveUsers(days)` — Daily active user count chart

**System Health (system-health/page.tsx)**:
- `fetchSystemHealth()` — Core health metrics (messages 24h, errors, response time)
- `fetchCircuitBreakers()` — Circuit breaker states (chatwoot, claude, twilio)
- `fetchAiUsageStats()` — AI cost/token breakdown (ai_usage + production.media)
- `fetchRecentExecutions(limit)` — Recent execution logs

### Key Interfaces
- `SystemHealth` — { messagesProcessed24h, aiCalls24h, avgResponseTimeMs, errorCount24h, totalMessagesAllTime, totalUsersAllTime, totalAiCallsAllTime, dbConnected }
- `AiUsageStats` — { totalCostUsd, totalInputTokens, totalOutputTokens, cost24h, inputTokens24h, outputTokens24h, avgLatency24h, modelBreakdown[] }
- `CircuitBreakerInfo` — { serviceName, state, failureCount, lastFailureAt, failureThreshold, recoveryTimeoutSeconds }

---

## Pages Overview

### 1. Dashboard (`/`)
Main overview page. Shows:
- Stat cards: Total patients, active conversations, messages processed, pending follow-ups
- Recent patients list with status badges
- Engagement opportunities (users needing attention)
- System health summary card
- Recent activity feed

### 2. Analytics (`/analytics`)
Data visualization page. Shows:
- Message volume bar chart (14 days)
- Today's active users list
- Daily active users bar chart
- Emotional state distribution
- Topic distribution
- User growth line chart
- Engagement metrics

Custom CSS-based charts (BarChart, LineChart) with hover tooltips — no chart library dependencies.

### 3. Follow-ups (`/followups`)
Follow-up management. Shows:
- Pending follow-ups with due dates
- Overdue follow-ups highlighted
- Follow-up type badges

### 4. Patient Detail (`/patient/[id]`)
Individual patient view with tabs:
- Profile (name, phone, language, status, join date)
- Medical vault (conditions, medications, allergies, symptoms, family history)
- Conversation history (messages with timestamps)
- Operator notes (add/view notes with tags)

### 5. System Health (`/system-health`)
System monitoring page. Shows:
- Overall health status banner
- 24h metrics: Messages processed, AI calls, avg response time, errors
- Service Status: Real circuit breaker data (Claude AI, Chatwoot, Twilio/WhatsApp)
- AI Usage: All-time vs last 24h cost/tokens, model breakdown (includes media models)
- Database Overview: Total users, messages, AI calls
- Recent Executions log

---

## Design System

The dashboard uses a custom warm/earthy ViveBien design system defined in `globals.css` and `tailwind.config.ts`:

### Color Tokens
- `ebano` (#2C2C2C) — Primary text
- `barro` (#B45309) — Primary accent (amber/brown)
- `tierra` (#92400E) — Dark accent
- `arena` (#FEF3C7) — Light background
- `crema` (#FFFBEB) — Card backgrounds
- `success` (#16A34A) — Green
- `warning` (#D97706) — Amber
- `error` (#DC2626) — Red

### Component Classes
- `.stat-card` — Rounded cards with shadows
- `.badge-*` — Status badges (active, inactive, pending)
- Font: System fonts with `font-display` and `font-body` variants

---

## Deployment

### Easypanel Configuration
- **Project**: projecto-1
- **Service**: vivebien-console
- **Source**: GitHub → `jmariano19/vivebien-console`, branch `main`, build path `/`
- **Domain**: patients.vivebien.io

### Environment Variables (Easypanel)
```
DATABASE_URL=postgres://postgres:bd894cefacb1c52998f3@projecto-1_postgress:5432/projecto-1
DB_SCHEMA=public
```

### Auto-Deploy Pipeline (GitHub → Easypanel)

Pushing to `main` automatically deploys:

1. Code is pushed to `main` branch on GitHub
2. GitHub Actions workflow (`.github/workflows/deploy.yml`) runs automatically
3. The workflow calls the Easypanel deploy webhook (stored as GitHub secret)
4. Easypanel rebuilds the Docker container

**GitHub Secret:** `EASYPANEL_DEPLOY_WEBHOOK` — contains the Easypanel deploy URL

### Deploy Process (for Claude)
To deploy changes, simply commit and push to `main`:
```bash
git add <files>
git commit -m "Description of changes"
git push origin main
```
Deploy happens automatically — no manual steps needed.

### GitHub CLI Access
- `gh` CLI is installed via Homebrew at `/opt/homebrew/bin/gh`
- Authenticated as **jmariano19** via `gh auth login`
- If `gh` is not in PATH, use full path: `/opt/homebrew/bin/gh`

### Manual Deploy (if needed)
1. Go to Easypanel → projecto-1 → vivebien-console
2. Click **Deploy** (green button, top left)
3. Wait for build to complete (~30-60 seconds)

### Docker Build
The Dockerfile uses multi-stage builds:
1. `deps` stage: Install node_modules
2. `builder` stage: Run `next build` (with empty DATABASE_URL since build is static)
3. `runner` stage: Copy standalone output, run with `node server.js`

The `next.config.js` sets `output: 'standalone'` and marks `pg` as an external server package.

---

## Local Development

```bash
# Clone the repo
git clone https://github.com/jmariano19/vivebien-console.git vivebien-dashboard-local
cd vivebien-dashboard-local

# Install dependencies
npm install

# Create .env.local with:
DATABASE_URL=postgres://postgres:bd894cefacb1c52998f3@85.209.95.19:5432/projecto-1
DB_SCHEMA=public
USE_MOCK_DATA=false

# Run dev server
npm run dev
# Opens at http://localhost:3000
```

---

## n8n DevOps Gateway

There's an n8n workflow (`Claude_DevOps_Gateway_v3`, ID: `dEoR_KiQ2LQYAE7Q9Jv9E`) that can execute arbitrary SQL against the production database. This is useful for querying data or making changes:

- **Webhook**: POST to `https://projecto-1-n8n.yydhsb.easypanel.host/webhook/claude-devops`
- **Body**: `{ "tool": "database", "query": "SELECT * FROM users LIMIT 5;" }`

---

## AI Models in the System

| Model | Purpose | Tracked In |
|-------|---------|------------|
| `claude-sonnet-4-20250514` | Chat conversations + vision | `public.ai_usage` |
| `whisper-1` | Voice message transcription | `production.media` |
| `claude-sonnet-4-5-20250929` | Image analysis (Claude Vision) | `production.media` |

The `fetchAiUsageStats()` function in `db.ts` queries both tables and combines them into the model breakdown. Media models appear with their type label, e.g., `whisper-1 (audio)`.

---

## Known Issues & Notes

1. **production.media table has 0 rows currently** — Media cost tracking will auto-populate once users send voice/images through WhatsApp
2. **No `conversations` table in public schema** — Messages link directly to users via `user_id`, not through a conversations junction table
3. **Circuit breakers**: 3 services tracked: `chatwoot_api`, `claude_api`, `twilio_api`. State "closed" = healthy
4. **Schema confusion**: The `production` schema has legacy n8n-era tables. The `public` schema is where `vivebien-core` writes active data. Always use `DB_SCHEMA=public`
5. **Git lock files**: When using automated tools, `.git/index.lock` or `.git/HEAD.lock` may get stuck. Delete them manually if git operations fail
6. **Easypanel source repo**: Make sure the service source points to `vivebien-console` (NOT `vivebien-core`)

---

## Removed Features (Feb 2026)
These were cleaned up as unnecessary:
- **Routines page** (`/routines`) — Removed, health_routines table has 0 rows
- **Credits page** (`/credits`) — Removed, credit system not actively used
- **Credits Usage chart** on analytics — Removed
- **Mock routines data** — Removed from db.ts
- **Fake service statuses** — Replaced with real circuit breaker data
- ~300 lines of dead code removed from db.ts (9 unused functions, 10 unused types)

---

## Recent Changes (Feb 5, 2026)

1. **System Health page rewrite**: Real circuit breaker data, AI usage with all-time vs 24h labels, database overview, recent executions
2. **AI Usage includes media costs**: `fetchAiUsageStats()` now queries `production.media` for Whisper/Vision costs alongside `ai_usage` for Claude chat costs
3. **Analytics improvements**: BarChart/LineChart with hover tooltips and spaced date labels, today's active users section
4. **Dead code cleanup**: Removed routines, credits, and ~300 lines of unused exports from db.ts
5. **Easypanel source fix**: Repository was pointing to `vivebien-core` instead of `vivebien-console` — corrected

---

## Quick Reference

| Item | Value |
|------|-------|
| Live URL | https://patients.vivebien.io |
| GitHub | https://github.com/jmariano19/vivebien-console |
| DB Host (external) | 85.209.95.19:5432 |
| DB Host (Easypanel internal) | projecto-1_postgress:5432 |
| DB Name | projecto-1 |
| DB User | postgres |
| DB Password | bd894cefacb1c52998f3 |
| DB Schema | public |
| Easypanel | https://85.209.95.19:3000 → projecto-1 → vivebien-console |
| n8n DevOps | Workflow ID: dEoR_KiQ2LQYAE7Q9Jv9E |
| Core Bot Repo | https://github.com/jmariano19/vivebien-core |
| Core Bot HANDOFF | See vivebien-project/HANDOFF.md |

---

## GitHub Push Access (for Claude)

At the start of each session, configure git to push directly:

```bash
TOKEN=$(cat .github-token)
git remote set-url origin https://jmariano19:${TOKEN}@github.com/jmariano19/vivebien-console.git
```

The token is stored in `.github-token` (gitignored, never committed). After configuring, Claude can push and deploy directly.
