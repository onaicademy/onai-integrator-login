# System Architecture Diagram

## Currency & Reports System Flow

```mermaid
sequenceDiagram
    participant Cron as Cron Jobs
    participant ExchangeAPI as Exchange Rate API
    participant DB as Supabase DB
    participant ROI as ROI Calculator
    participant TG as Telegram Bot
    
    Note over Cron,TG: Daily Cycle (Almaty UTC+6)
    
    rect rgb(0, 50, 0)
        Note right of Cron: 08:00 Almaty (02:00 UTC)
        Cron->>ExchangeAPI: Fetch USD/KZT rate
        ExchangeAPI-->>Cron: 475.25 KZT
        Cron->>ExchangeAPI: Try backup API (if failed)
        Cron->>DB: Store rate + date
        Cron->>TG: "Курс обновлен: 475.25"
    end
    
    rect rgb(0, 0, 50)
        Note right of Cron: 08:05 Almaty (02:05 UTC)
        Cron->>DB: Get today's rate
        DB-->>Cron: 475.25 KZT
        Cron->>DB: Get teams
        loop Each Team
            Cron->>ROI: calculateROI(team, yesterday)
            ROI->>DB: Get expenses with historical rates
            ROI->>DB: Get sales with historical rates
            ROI-->>Cron: profit_kzt, roi_percent
        end
        Cron->>TG: Daily Report (KZT format)
    end
    
    rect rgb(50, 0, 50)
        Note right of Cron: Monday 08:10 Almaty
        Cron->>ROI: calculateROI(all teams, last week)
        ROI-->>Cron: Weekly stats + trends
        Cron->>Cron: generateRecommendations()
        Cron->>TG: Weekly Report + Recommendations
    end
```

## AI Analysis Flow

```mermaid
flowchart TD
    User[User clicks AI Analysis] --> Frontend[TrafficDetailedAnalytics.tsx]
    Frontend --> Loader[10-second Loader Modal<br/>4 progress steps]
    Loader --> API[POST /ai-analysis]
    API --> Enrich[Enrich Campaign Data<br/>Calculate metrics]
    Enrich --> GROQ{GROQ API Available?}
    
    GROQ -->|Yes| GroqCall[Call llama-3.1-70b-versatile<br/>Professional Marketer Prompt]
    GROQ -->|No| Fallback[Rule-based Analysis<br/>CTR, ROI, CPC checks]
    
    GroqCall --> Analysis[Health Score + Red Flags<br/>Immediate Fixes + Projections]
    Fallback --> Analysis
    
    Analysis --> Modal[Results Modal<br/>Full analysis display]
    Modal --> User
    
    style GROQ fill:#00FF88,stroke:#00DD70
    style Analysis fill:#00DD70,stroke:#00BB58
```

## Sales Funnel Data Flow

```mermaid
flowchart LR
    subgraph DataSources[Data Sources]
        FB[Facebook Ads API<br/>Impressions]
        AMO1[AmoCRM Leads<br/>Registrations by UTM]
        AMO2[AmoCRM Sales<br/>Express + Main]
    end
    
    subgraph API[Backend API]
        Funnel[GET /funnel/:team]
        GetImp[getFacebookImpressions]
    end
    
    subgraph Frontend[Frontend]
        Component[SalesFunnel.tsx<br/>Pyramid Component]
        Dashboard[TrafficCommandDashboard]
    end
    
    FB --> GetImp
    GetImp --> Funnel
    AMO1 --> Funnel
    AMO2 --> Funnel
    
    Funnel -->|JSON| Component
    Component --> Dashboard
    
    style Funnel fill:#00FF88
    style Component fill:#00DD70
```

## Transaction Flow with Exchange Rate

```mermaid
sequenceDiagram
    participant WebHook as AmoCRM Webhook
    participant Fetcher as Exchange Rate Fetcher
    participant DB as Database
    participant Calc as ROI Calculator
    
    Note over Fetcher,DB: Daily at 08:00 Almaty
    Fetcher->>DB: Store exchange_rates<br/>date, usd_to_kzt
    
    Note over WebHook,DB: When Sale Happens
    WebHook->>Fetcher: getExchangeRateForDate(today)
    Fetcher->>DB: SELECT rate WHERE date = today
    DB-->>WebHook: 475.25
    WebHook->>DB: INSERT amocrm_sales<br/>amount_usd, usd_to_kzt_rate
    
    Note over Calc,DB: When Calculating ROI
    Calc->>DB: SELECT with historical rates
    DB-->>Calc: expenses + their rates<br/>sales + their rates
    Calc->>Calc: Calculate using<br/>STORED rates
    Calc-->>Calc: Accurate ROI in KZT
```

## Component Hierarchy

```mermaid
graph TD
    Dashboard[TrafficCommandDashboard.tsx]
    Dashboard --> OnBoarding[OnboardingTour<br/>React Joyride]
    Dashboard --> CurrencyToggle[USD/KZT Toggle<br/>Already implemented]
    Dashboard --> KPICards[KPI Metrics Cards]
    Dashboard --> Funnel[SalesFunnel Component<br/>NEW - Pyramid]
    Dashboard --> TeamCards[Team Performance Cards]
    Dashboard --> UTMTop[Top UTM Metrics]
    
    Funnel --> Stage1[IMPRESSIONS 100%]
    Funnel --> Stage2[REGISTRATIONS 85%]
    Funnel --> Stage3[EXPRESS SALES 60%]
    Funnel --> Stage4[MAIN SALES 35%]
    
    style Dashboard fill:#000,stroke:#00FF88
    style Funnel fill:#00FF88,stroke:#00DD70
    style OnBoarding fill:#00DD70,stroke:#00BB58
```

## Cron Jobs Schedule

```mermaid
gantt
    title Cron Jobs Timeline (Almaty UTC+6)
    dateFormat HH:mm
    axisFormat %H:%M
    
    section Daily
    Exchange Rate Fetch    :08:00, 1m
    Daily Traffic Report   :08:05, 1m
    
    section Weekly
    Weekly Report (Mon)    :08:10, 1m
```

## Database Schema

```mermaid
erDiagram
    exchange_rates {
        uuid id PK
        date date UK
        decimal usd_to_kzt
        varchar source
        timestamp fetched_at
    }
    
    traffic_stats {
        uuid id PK
        uuid team_id FK
        decimal spend_usd
        decimal spend_kzt
        date transaction_date
        decimal usd_to_kzt_rate
    }
    
    amocrm_sales {
        uuid id PK
        integer deal_id
        decimal amount_usd
        decimal amount_kzt
        date sale_date
        decimal usd_to_kzt_rate
        varchar utm_source
    }
    
    traffic_teams {
        uuid id PK
        varchar name
        boolean active
    }
    
    exchange_rates ||--o{ traffic_stats : "provides rate"
    exchange_rates ||--o{ amocrm_sales : "provides rate"
    traffic_teams ||--o{ traffic_stats : "tracks spend"
    traffic_teams ||--o{ amocrm_sales : "tracks sales"
```

---

## API Endpoints

### New Endpoints:
1. `POST /api/traffic-detailed-analytics/ai-analysis` - GROQ campaign analysis
2. `GET /api/traffic-stats/funnel/:teamId` - Sales funnel data
3. `GET /webhook/amocrm/traffic/test` - Webhook status check

### Updated Endpoints:
- `/webhook/amocrm/traffic` - Now stores exchange rate with each sale

---

## Technology Stack

### Backend:
- **Cron Jobs:** `node-cron`
- **Exchange Rate APIs:** exchangerate-api.com, currencyapi.com
- **AI Model:** GROQ `llama-3.1-70b-versatile`
- **Database:** Supabase PostgreSQL
- **Messaging:** Telegram Bot API

### Frontend:
- **Charts:** `framer-motion` for animations
- **UI:** Tailwind CSS with custom gradients
- **State:** React hooks (useState, useEffect)
- **HTTP:** Axios

---

## Key Metrics

### Exchange Rate System:
- Updates: Daily at 08:00 Almaty
- Fallback: 2 backup APIs + yesterday's rate
- Storage: Historical rates with each transaction

### AI Analysis:
- Model: llama-3.1-70b-versatile (8K context)
- Temperature: 0.3 (analytical)
- Fallback: Rule-based if GROQ fails
- Response time: ~10 seconds

### Sales Funnel:
- 4 stages with conversion rates
- Data sources: Facebook API + AmoCRM
- Refresh: On date range change
- Empty state: "Нет данных"

---

**Architecture Status:** PRODUCTION READY ✅
