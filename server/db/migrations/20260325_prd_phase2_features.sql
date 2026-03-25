-- PRD phase 2 migration: score dates/edit support, charity directory expansion,
-- contribution percentages, independent donations, and payment metadata.

ALTER TABLE IF EXISTS scores
  ADD COLUMN IF NOT EXISTS played_at date,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS charity_percent numeric(5,2) NOT NULL DEFAULT 10;

ALTER TABLE IF EXISTS charities
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS upcoming_event_title text,
  ADD COLUMN IF NOT EXISTS upcoming_event_date date;

ALTER TABLE IF EXISTS subscription_payments
  ADD COLUMN IF NOT EXISTS charity_percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS charity_amount_inr numeric(12,2);

CREATE TABLE IF NOT EXISTS donations (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  charity_id bigint NOT NULL REFERENCES charities(id) ON DELETE CASCADE,
  amount_inr numeric(12,2) NOT NULL CHECK (amount_inr > 0),
  provider text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'completed',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_charities_featured ON charities(is_featured);
CREATE INDEX IF NOT EXISTS idx_charities_category ON charities(category);
CREATE INDEX IF NOT EXISTS idx_scores_user_played_at ON scores(user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_user ON donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_charity ON donations(charity_id);

ALTER TABLE IF EXISTS users
  DROP CONSTRAINT IF EXISTS users_charity_percent_min_chk;
ALTER TABLE IF EXISTS users
  ADD CONSTRAINT users_charity_percent_min_chk CHECK (charity_percent >= 10 AND charity_percent <= 100);

ALTER TABLE IF EXISTS donations
  DROP CONSTRAINT IF EXISTS donations_status_chk;
ALTER TABLE IF EXISTS donations
  ADD CONSTRAINT donations_status_chk CHECK (status IN ('pending', 'completed', 'failed'));
