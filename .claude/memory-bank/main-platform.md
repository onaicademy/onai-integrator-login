# Main Platform Architecture

> **Domain**: onai.academy
> **Purpose**: Student learning portal with AI-powered mentoring

## Overview

The main platform is an educational portal for learning AI and automation. It features:
- Gamified learning with XP, levels, and streaks
- AI Curator for personalized guidance
- Video lessons with progress tracking
- Homework submissions with AI feedback

## Frontend Structure

```
src/pages/
├── Dashboard.tsx           # Main student dashboard
├── Courses.tsx             # Course catalog
├── CourseDetail.tsx        # Individual course view
├── LessonPage.tsx          # Video lesson player
├── Profile.tsx             # User profile
├── Progress.tsx            # Learning progress
├── Onboarding.tsx          # New user onboarding
└── admin/                  # Admin panel
    ├── AdminDashboard.tsx
    ├── UsersManagement.tsx
    └── CoursesManagement.tsx
```

## Key Components

### Authentication (AuthContext.tsx)
- Supabase Auth integration
- Session management with auto-refresh
- Role-based access (student, curator, admin)
- Token stored in localStorage for API requests

### Video Player
- BunnyCDN Stream integration
- Progress tracking (saves every 30 seconds)
- Playback speed control
- Quality selection

### AI Curator
- OpenAI Assistants API integration
- Thread-based conversations
- Voice message support (Groq Whisper)
- Image analysis (Groq Vision)

## Database Schema (Main Supabase)

### profiles
```sql
id UUID PRIMARY KEY
email TEXT
full_name TEXT
avatar_url TEXT
role TEXT (student|curator|admin)
level INTEGER DEFAULT 1
xp INTEGER DEFAULT 0
current_streak INTEGER DEFAULT 0
longest_streak INTEGER DEFAULT 0
created_at TIMESTAMP
```

### courses
```sql
id UUID PRIMARY KEY
title TEXT
description TEXT
thumbnail_url TEXT
order_index INTEGER
is_published BOOLEAN
created_at TIMESTAMP
```

### modules
```sql
id UUID PRIMARY KEY
course_id UUID REFERENCES courses(id)
title TEXT
description TEXT
order_index INTEGER
```

### lessons
```sql
id UUID PRIMARY KEY
module_id UUID REFERENCES modules(id)
title TEXT
description TEXT
video_url TEXT
video_id TEXT (BunnyCDN)
duration INTEGER
order_index INTEGER
xp_reward INTEGER DEFAULT 10
```

### user_progress
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES profiles(id)
lesson_id UUID REFERENCES lessons(id)
progress_percent INTEGER DEFAULT 0
completed BOOLEAN DEFAULT false
last_position INTEGER DEFAULT 0
completed_at TIMESTAMP
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/courses` | GET | List all courses |
| `/api/courses/:id` | GET | Get course details |
| `/api/lessons/:id` | GET | Get lesson details |
| `/api/progress` | POST | Update video progress |
| `/api/progress/:lessonId` | GET | Get lesson progress |
| `/api/openai/chat` | POST | AI Curator chat |
| `/api/openai/voice` | POST | Voice message transcription |

## Gamification System

### XP Rewards
- Complete lesson: 10-50 XP (based on duration)
- Complete module: 100 XP bonus
- Complete course: 500 XP bonus
- Daily login streak: 5 XP × streak days

### Levels
```
Level 1: 0 XP
Level 2: 100 XP
Level 3: 300 XP
Level 4: 600 XP
Level 5: 1000 XP
...
```

## Admin Panel Features

- User management (view, edit roles)
- Course management (CRUD)
- Lesson management with video upload
- Analytics dashboard
- System health monitoring
