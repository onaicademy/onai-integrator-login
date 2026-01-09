# onAI Academy - Claude Code Instructions

## MANDATORY PROTOCOL

**CRITICAL: Before making ANY decisions or changes, you MUST:**

1. Read `.claude/memory-bank/README.md` for project architecture overview
2. Check `.claude/progress/` for recent session reports
3. Follow the conventions and patterns established in this codebase

## Project Overview

This is the **onAI Academy** platform - an educational platform for AI training with multiple integrated subsystems.

### Core Projects

| Project | Description | Location |
|---------|-------------|----------|
| **Main Platform** | Student learning portal with gamification | `/src/` (frontend), `/backend/` |
| **Tripwire Course** | 3-day challenge course with isolated DB | `/src/pages/tripwire/` |
| **Traffic Dashboard** | Marketing analytics for targetologists | `/src/pages/traffic/` |
| **Express Course** | Short-term course with payment integration | `/src/pages/expresscourse/` |
| **Landing Pages** | Lead generation pages | `/src/pages/landing/` |

### Key Technologies

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL) - 4 separate instances
- **AI**: OpenAI Assistants API (3 separate keys), Groq AI
- **Integrations**: AmoCRM, Telegram Bots, Facebook Ads API

### Critical Systems

1. **Self-Healing System** (`/backend/src/core/`)
   - ServiceHealthManager for automatic recovery
   - SecureLogger for production-safe logging
   - DataMasker for sensitive data filtering

2. **Rate Limiting** (`/backend/src/services/openai-rate-limiter.ts`)
   - Token bucket algorithm
   - Circuit breaker pattern
   - Priority queues

3. **Authentication**
   - Supabase Auth for main platform
   - Custom JWT for Traffic Dashboard
   - Session management with token refresh

## Memory Bank Location

All architectural documentation is in `.claude/memory-bank/`:

```
.claude/memory-bank/
├── README.md           # Architecture overview
├── main-platform.md    # Main platform details
├── tripwire.md         # Tripwire course system
├── traffic-dashboard.md # Traffic analytics
├── integrations.md     # External API integrations
├── database-schema.md  # Database structure
└── conventions.md      # Coding conventions
```

## Progress Reports

Session reports are automatically created in `.claude/progress/`:

```
.claude/progress/
├── 2026-01-09_session.md  # Today's session
├── 2026-01-08_session.md  # Previous sessions
└── ...
```

## Before Each Session

```
1. READ: .claude/memory-bank/README.md
2. CHECK: .claude/progress/ (last 3 files)
3. UNDERSTAND: Current state of the system
4. THEN: Proceed with requested changes
```

## Coding Conventions

- **Language**: Code in English, comments can be Russian
- **Logging**: Use SecureLogger from `/backend/src/core/secure-logger.ts`
- **Error Handling**: Use custom error classes from `/backend/src/middleware/errorHandler.ts`
- **Security**: NEVER log secrets, tokens, or passwords
- **Testing**: Verify TypeScript compilation before committing

## Important Contacts

- **Platform**: onai.academy
- **Traffic Dashboard**: traffic.onai.academy
- **Tripwire**: expresscourse.onai.academy

## Emergency Procedures

If something breaks:
1. Check `/health/detailed` endpoint for system status
2. Review recent commits with `git log --oneline -10`
3. Check logs for errors (use SecureLogger output)
4. If needed, rollback with `git revert`
