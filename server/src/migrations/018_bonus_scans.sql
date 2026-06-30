-- Bonus scans (referral rewards) — work on top of any plan tier.
-- Consumed before the monthly limit is touched. Each new grant resets the
-- expiry to now() + 30 days, so active inviters keep a rolling window.

alter table users
  add column if not exists bonus_scans_remaining int not null default 0,
  add column if not exists bonus_scans_expires_at timestamptz;

-- Clear out any leftover promotional Starter window from the previous mechanic.
-- The column itself stays for backwards compatibility but is no longer read.
update users set promotional_starter_until = null where promotional_starter_until is not null;
