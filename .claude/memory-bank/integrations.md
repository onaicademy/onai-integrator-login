# External API Integrations

## OpenAI Integration

### Configuration
```
OPENAI_API_KEY_CURATOR=sk-proj-...   # AI Curator
OPENAI_API_KEY_MENTOR=sk-proj-...    # AI Mentor
OPENAI_API_KEY_ANALYST=sk-proj-...   # AI Analyst
```

### Why 3 Separate Keys?
1. **Rate Limit Isolation**: Each assistant has independent limits
2. **Cost Tracking**: Separate billing per assistant type
3. **Failure Isolation**: One key exhausted doesn't affect others

### Rate Limiter Architecture

```typescript
// backend/src/services/openai-rate-limiter.ts

Features:
- Token bucket algorithm (400 RPM per key)
- Priority queues (CRITICAL > HIGH > MEDIUM > LOW)
- Circuit breaker (opens after 5 consecutive failures)
- Exponential backoff on 429 errors
- Request deduplication
```

### Assistants

| Assistant | Purpose | ID |
|-----------|---------|-----|
| Curator | General learning guidance | `asst_curator_id` |
| Mentor | Homework feedback | `asst_mentor_id` |
| Analyst | Analytics reports | `asst_analyst_id` |

---

## Groq AI Integration

### Configuration
```
GROQ_API_KEY=gsk_...
```

### Services

1. **Whisper Large V3** - Voice transcription
   - 96% cheaper than OpenAI Whisper
   - ~2x faster response time

2. **Llama 4 Scout** - Image analysis
   - Vision capabilities
   - 96% cheaper than GPT-4V

### Usage
```typescript
// backend/src/services/groqAiService.ts

export async function transcribeAudio(audioFile, language)
export async function analyzeImage(imageBuffer, question)
```

---

## AmoCRM Integration

### Configuration
```
AMOCRM_DOMAIN=onaiagencykz
AMOCRM_ACCESS_TOKEN=...
AMOCRM_CLIENT_ID=...
AMOCRM_CLIENT_SECRET=...
AMOCRM_REDIRECT_URI=...
```

### Rate Limiting
- 7 requests per second (official limit)
- We use 2-second delay between requests
- Rate limiter class in `backend/src/lib/amocrm.ts`

### Token Refresh
- Access token expires every 24 hours
- Refresh token stored in Supabase
- Auto-refresh via `tokenAutoRefresh.ts`

### Webhooks Received

| Webhook | Endpoint | Purpose |
|---------|----------|---------|
| Express Course Sale | `/api/amocrm/expresscourse` | Track course purchases |
| Main Product Sale | `/webhook/amocrm/traffic` | Track main product sales |
| Challenge 3D Sale | `/api/amocrm/challenge3d-sale` | Track challenge purchases |
| Lead Created | `/api/amocrm/challenge3d-lead` | Track new leads |

### Webhooks Sent

| Event | Destination | Data |
|-------|-------------|------|
| Lead Registration | AmoCRM | Contact + Lead creation |
| Course Completion | AmoCRM | Lead status update |
| Payment Received | AmoCRM | Deal status update |

---

## Telegram Bots Integration

### Bots

| Bot | Token Variable | Purpose |
|-----|----------------|---------|
| AI Mentor | `TELEGRAM_BOT_TOKEN_MENTOR` | Student AI interactions |
| IAE Agent | `TELEGRAM_IAE_BOT_TOKEN` | Analytics reports |
| Traffic Bot | `TELEGRAM_TRAFFIC_BOT_TOKEN` | Traffic team reports |

### Webhooks
- Webhook URL: `https://api.onai.academy/api/telegram/webhook`
- Uses long polling for development

### Message Types
- Text messages
- Voice messages (transcribed via Groq)
- Images (analyzed via Groq Vision)
- Buttons and inline keyboards

---

## Facebook Ads API

### Configuration
```
FB_APP_ID=...
FB_APP_SECRET=...
FB_ACCESS_TOKEN=...
FB_AD_ACCOUNT_IDS=act_123,act_456
```

### Data Retrieved
- Campaigns (spend, impressions, clicks, conversions)
- Ad Sets (same metrics)
- Ads (same metrics)
- Insights (breakdowns by age, gender, placement)

### Cron Jobs
```
- facebook-ads-loader.ts: Every 6 hours
- facebook-ads-sync.ts: Every hour
```

### Rate Limiting
- 60 requests per 2 minutes per user
- Redis caching (15-minute TTL)
- Fallback to memory cache

---

## BunnyCDN Integration

### Configuration
```
BUNNY_STREAM_API_KEY=...
BUNNY_STREAM_LIBRARY_ID=...
BUNNY_CDN_HOSTNAME=video.onai.academy
```

### Features
- Video upload and transcoding
- Adaptive bitrate streaming
- Video analytics
- Webhook notifications (transcoding complete)

### Upload Flow
```
Frontend → /api/stream/upload → BunnyCDN → Webhook → Save video_id
```

---

## Resend (Email Service)

### Configuration
```
RESEND_API_KEY=re_...
```

### Email Types
- Welcome emails
- Password reset
- Certificate delivery
- Course notifications

### Templates
Located in `backend/src/templates/emails/`

---

## Redis

### Configuration
```
REDIS_URL=redis://...
```

### Usage
- BullMQ job queues (Tripwire processing)
- Facebook API response caching
- Rate limiter state
- Session storage
