-- Walkthrough support: track completion + top up existing null-tier users
-- with 2 bonus scans so they can finish the hands-on flow (product + plate).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS walkthrough_completed boolean NOT NULL DEFAULT false;

-- Backfill: give existing null-tier users 2 bonus scans + a 30-day window
-- so they can complete the walkthrough on next open. Skip users who already
-- have a healthy bonus balance to avoid stacking.
UPDATE users
   SET bonus_scans_remaining = GREATEST(bonus_scans_remaining, 2),
       bonus_scans_expires_at = CASE
         WHEN bonus_scans_expires_at IS NULL OR bonus_scans_expires_at < now()
           THEN now() + interval '30 days'
         ELSE bonus_scans_expires_at
       END
 WHERE user_type IS NULL
   AND walkthrough_completed = false;
