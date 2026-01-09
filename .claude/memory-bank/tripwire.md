# Tripwire Course Architecture

> **Domain**: expresscourse.onai.academy
> **Purpose**: 3-day challenge course with isolated database

## Overview

Tripwire is a short-term (3-day) introductory course designed to:
- Introduce students to AI concepts
- Generate leads for the main platform
- Track completion for sales follow-up

**Key Feature**: Uses a completely isolated Supabase database to keep data separate from the main platform.

## Isolated Database

```
SUPABASE_TRIPWIRE_URL=https://pjmvxecykysfrzppdcto.supabase.co
SUPABASE_TRIPWIRE_SERVICE_KEY=...
```

### Why Isolated?
1. Performance: Prevents main platform slowdown during marketing campaigns
2. Security: Limits exposure if one database is compromised
3. Compliance: Easier to manage data deletion requests
4. Analytics: Clean data for course-specific metrics

## Frontend Structure

```
src/pages/tripwire/
├── TripwireLanding.tsx      # Course landing page
├── TripwireLogin.tsx        # Login/registration
├── TripwireDashboard.tsx    # Student dashboard
├── TripwireLessonPage.tsx   # Video lesson viewer
├── TripwireProfile.tsx      # Student profile
└── TripwireCertificate.tsx  # Completion certificate
```

## Database Schema (Tripwire Supabase)

### tripwire_users
```sql
id UUID PRIMARY KEY
email TEXT UNIQUE
phone TEXT
full_name TEXT
password_hash TEXT
utm_source TEXT
utm_medium TEXT
utm_campaign TEXT
amocrm_lead_id INTEGER
is_verified BOOLEAN DEFAULT false
created_at TIMESTAMP
last_login_at TIMESTAMP
```

### tripwire_lessons
```sql
id UUID PRIMARY KEY
day INTEGER (1, 2, 3)
title TEXT
description TEXT
video_url TEXT
video_id TEXT
duration INTEGER
order_index INTEGER
homework_instructions TEXT
```

### tripwire_progress
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES tripwire_users(id)
lesson_id UUID REFERENCES tripwire_lessons(id)
progress_percent INTEGER DEFAULT 0
completed BOOLEAN DEFAULT false
homework_submitted BOOLEAN DEFAULT false
homework_url TEXT
completed_at TIMESTAMP
```

### tripwire_certificates
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES tripwire_users(id)
certificate_number TEXT UNIQUE
issued_at TIMESTAMP
pdf_url TEXT
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/tripwire/auth/register` | POST | Register new student |
| `/api/tripwire/auth/login` | POST | Login |
| `/api/tripwire/lessons` | GET | Get all lessons |
| `/api/tripwire/progress` | POST | Update progress |
| `/api/tripwire/homework` | POST | Submit homework |
| `/api/tripwire/certificate` | GET | Generate certificate |

## Authentication Flow

1. User registers with email/phone
2. Password hashed with bcrypt
3. JWT token issued (7-day expiry)
4. Token stored in localStorage
5. All API requests include Bearer token

## AmoCRM Integration

When user registers:
1. Create lead in AmoCRM funnel
2. Store `amocrm_lead_id` in tripwire_users
3. Update lead status on:
   - Day 1 completion
   - Day 2 completion
   - Day 3 completion
   - Certificate generation

## Certificate Generation

1. Check all 3 days completed
2. Generate unique certificate number
3. Create PDF with student name and date
4. Store in Supabase Storage
5. Send email with download link

## Sales Manager Dashboard

Located at `/api/admin/tripwire`:
- View all registered students
- Filter by completion status
- Export to CSV
- Trigger follow-up actions
