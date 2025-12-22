-- Table to store daily exchange rates
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,  -- Date in Almaty timezone
  usd_to_kzt DECIMAL(10,4) NOT NULL,  -- e.g., 475.2500
  source VARCHAR(50) DEFAULT 'exchangerate-api',
  fetched_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT exchange_rates_date_unique UNIQUE (date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates (date DESC);

-- Add columns to traffic_stats
ALTER TABLE traffic_stats 
  ADD COLUMN IF NOT EXISTS transaction_date DATE,
  ADD COLUMN IF NOT EXISTS usd_to_kzt_rate DECIMAL(10,4);

-- Add columns to amocrm_sales
ALTER TABLE amocrm_sales
  ADD COLUMN IF NOT EXISTS sale_date DATE,
  ADD COLUMN IF NOT EXISTS usd_to_kzt_rate DECIMAL(10,4);

-- Insert example rate
INSERT INTO exchange_rates (date, usd_to_kzt) 
VALUES (CURRENT_DATE, 475.25)
ON CONFLICT (date) DO NOTHING;
