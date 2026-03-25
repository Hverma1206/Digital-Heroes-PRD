-- PRD workflow migration: draw publish lifecycle, prize pools, winner verification/payout states.

ALTER TABLE IF EXISTS draws
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS draw_mode text,
  ADD COLUMN IF NOT EXISTS draw_month integer,
  ADD COLUMN IF NOT EXISTS draw_year integer,
  ADD COLUMN IF NOT EXISTS active_subscribers_snapshot integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_revenue_snapshot numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prize_pool_total numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tier_3_pool numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tier_4_pool numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tier_5_pool numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jackpot_rollover_in numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jackpot_rollover_out numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

ALTER TABLE IF EXISTS winners
  ADD COLUMN IF NOT EXISTS payout_amount numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS proof_url text,
  ADD COLUMN IF NOT EXISTS verification_notes text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_draws_status_month_year ON draws(status, draw_year, draw_month);
CREATE INDEX IF NOT EXISTS idx_winners_draw_id ON winners(draw_id);
CREATE INDEX IF NOT EXISTS idx_winners_user_id ON winners(user_id);
CREATE INDEX IF NOT EXISTS idx_winners_verification_status ON winners(verification_status);
CREATE INDEX IF NOT EXISTS idx_winners_payout_status ON winners(payout_status);

ALTER TABLE IF EXISTS draws
  DROP CONSTRAINT IF EXISTS draws_status_chk;
ALTER TABLE IF EXISTS draws
  ADD CONSTRAINT draws_status_chk CHECK (status IN ('simulation', 'published'));

ALTER TABLE IF EXISTS winners
  DROP CONSTRAINT IF EXISTS winners_payout_status_chk;
ALTER TABLE IF EXISTS winners
  ADD CONSTRAINT winners_payout_status_chk CHECK (payout_status IN ('pending', 'paid', 'canceled'));

ALTER TABLE IF EXISTS winners
  DROP CONSTRAINT IF EXISTS winners_verification_status_chk;
ALTER TABLE IF EXISTS winners
  ADD CONSTRAINT winners_verification_status_chk CHECK (verification_status IN ('pending', 'submitted', 'approved', 'rejected'));
