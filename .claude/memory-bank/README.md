# Memory Bank - onAI Academy Architecture

> **Last Updated**: 2026-01-10
> **Version**: 1.0.1

## Quick Navigation

| Document | Description |
|----------|-------------|
| [main-platform.md](./main-platform.md) | Main learning platform architecture |
| [tripwire.md](./tripwire.md) | Tripwire 3-day challenge course |
| [traffic-dashboard.md](./traffic-dashboard.md) | Marketing analytics dashboard |
| [integrations.md](./integrations.md) | External API integrations |
| [database-schema.md](./database-schema.md) | Database structure and relations |
| [conventions.md](./conventions.md) | Coding standards and patterns |
| [deployment.md](./deployment.md) | **Production deployment guide** |

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           onAI Academy Platform                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │  Main Platform  │  │    Tripwire     │  │ Traffic Dashboard│          │
│  │  (Students)     │  │  (3-day course) │  │ (Targetologists) │          │
│  │                 │  │                 │  │                  │          │
│  │ onai.academy    │  │ expresscourse.  │  │ traffic.onai.    │          │
│  │                 │  │ onai.academy    │  │ academy          │          │
│  └────────┬────────┘  └────────┬────────┘  └────────┬─────────┘          │
│           │                    │                    │                    │
│           ▼                    ▼                    ▼                    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     Express.js Backend API                       │    │
│  │                     (backend/src/server.ts)                      │    │
│  │                                                                  │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │ Self-Healing │  │ Rate Limiter │  │ SecureLogger │           │    │
│  │  │   System     │  │  (OpenAI)    │  │ (DataMasker) │           │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│           ┌────────────────────────┼────────────────────────┐           │
│           ▼                        ▼                        ▼           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │ Supabase Main   │  │ Supabase        │  │ Supabase        │          │
│  │ (Main Platform) │  │ Tripwire        │  │ Traffic         │          │
│  │                 │  │ (Isolated)      │  │ (Analytics)     │          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
           ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
           │    OpenAI     │ │    AmoCRM     │ │   Telegram    │
           │ Assistants API│ │  (CRM/Sales)  │ │    Bots       │
           └───────────────┘ └───────────────┘ └───────────────┘
```

---

## Project Structure

```
onai-integrator-login/
├── src/                          # Frontend (React + TypeScript)
│   ├── components/               # Shared UI components
│   ├── contexts/                 # React contexts (Auth, Theme)
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utility libraries
│   ├── pages/                    # Page components
│   │   ├── admin/                # Admin panel
│   │   ├── expresscourse/        # Express course
│   │   ├── landing/              # Landing pages
│   │   ├── traffic/              # Traffic Dashboard
│   │   └── tripwire/             # Tripwire course
│   └── utils/                    # Helper functions
│
├── backend/                      # Backend (Node.js + Express)
│   └── src/
│       ├── config/               # Configuration files
│       ├── controllers/          # Request handlers
│       ├── core/                 # Core systems (NEW)
│       │   ├── data-masker.ts    # Sensitive data filtering
│       │   ├── secure-logger.ts  # Production-safe logging
│       │   ├── service-health-manager.ts  # Self-healing
│       │   └── service-registry.ts  # Service health checks
│       ├── middleware/           # Express middleware
│       ├── routes/               # API routes
│       ├── services/             # Business logic
│       └── server.ts             # Main entry point
│
├── .claude/                      # Claude Code documentation
│   ├── memory-bank/              # Architecture knowledge base
│   └── progress/                 # Session progress reports
│
└── CLAUDE.md                     # Mandatory reading protocol
```

---

## Database Instances

| Instance | Purpose | Tables | URL Variable |
|----------|---------|--------|--------------|
| **Main** | Student data, courses, progress | profiles, courses, lessons, progress | `SUPABASE_URL` |
| **Tripwire** | Isolated 3-day course data | tripwire_users, tripwire_progress | `SUPABASE_TRIPWIRE_URL` |
| **Traffic** | Marketing analytics | traffic_users, fb_campaigns, sales | `SUPABASE_TRAFFIC_URL` |
| **Landing** | Lead capture | landing_leads, utm_tracking | `SUPABASE_LANDING_URL` |

---

## Key Environment Variables

```bash
# Supabase (4 instances)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_TRIPWIRE_URL=
SUPABASE_TRAFFIC_URL=
SUPABASE_LANDING_URL=

# OpenAI (3 separate keys for rate limit isolation)
OPENAI_API_KEY_CURATOR=    # AI Curator assistant
OPENAI_API_KEY_MENTOR=     # AI Mentor assistant
OPENAI_API_KEY_ANALYST=    # AI Analyst assistant

# External Services
AMOCRM_DOMAIN=
AMOCRM_ACCESS_TOKEN=
TELEGRAM_BOT_TOKEN_MENTOR=
GROQ_API_KEY=
RESEND_API_KEY=

# Security
JWT_SECRET=
```

---

## Critical Files Reference

### Backend Core

| File | Purpose |
|------|---------|
| `backend/src/server.ts` | Main entry point, routes registration |
| `backend/src/core/secure-logger.ts` | Production-safe logging with data masking |
| `backend/src/core/service-health-manager.ts` | Self-healing coordination |
| `backend/src/services/openai-rate-limiter.ts` | OpenAI API rate limiting |
| `backend/src/middleware/errorHandler.ts` | Global error handling |
| `backend/src/config/jwt.ts` | JWT secret management |

### Frontend Core

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main app component, routing |
| `src/contexts/AuthContext.tsx` | Authentication state |
| `src/lib/supabase.ts` | Supabase client |

---

## Recent Changes Log

### 2026-01-10
- Fixed Admin Panel Students section (401 errors resolved)
- Fixed ResponseFilter breaking API responses (removed DataMasker from response filtering)
- Created proxy endpoint `/api/admin/tripwire-students` for Main Platform admins
- Added deployment guide to Memory Bank (`deployment.md`)

### 2026-01-09
- Implemented self-healing system (`/backend/src/core/`)
- Added SecureLogger with DataMasker for production logging
- Fixed JWT secret caching vulnerability
- Added JWT payload validation

### 2026-01-08
- Implemented OpenAI Rate Limiter with 3 separate API keys
- Added circuit breaker pattern for API resilience

---

## Health Monitoring

### Endpoints

```
GET /health          → Quick liveness check
GET /health/ready    → Readiness with critical services
GET /health/detailed → Full system status
GET /health/metrics  → Prometheus metrics
```

### Monitored Services

- `supabase-main` (CRITICAL)
- `supabase-tripwire` (HIGH)
- `traffic-db` (MEDIUM)
- `openai-api` (HIGH)
- `amocrm-api` (HIGH)
- `telegram-bot` (MEDIUM)
- `memory-monitor` (CRITICAL)

---

## Security Checklist

- [x] JWT secrets cached (not regenerated per import)
- [x] JWT payload validation before trust
- [x] SecureLogger masks all sensitive data
- [x] Debug endpoints protected in production
- [x] Password logging removed
- [x] Empty catch blocks have error logging
- [x] Rate limiting on all API endpoints
- [x] CORS restricted to known domains

---

## Contact Points

- **Production Server**: `207.154.231.30`
- **Main Domain**: `onai.academy`
- **API Domain**: `api.onai.academy`
