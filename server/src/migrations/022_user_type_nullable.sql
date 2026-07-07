-- New users created from now on start with user_type = NULL (no tier
-- selected). The app routes them to the paywall on every cold start until
-- they pick a paid plan (or, later, redeem a gift code / hit a referral
-- goal). Existing users keep their current user_type.
ALTER TABLE users ALTER COLUMN user_type DROP NOT NULL;
ALTER TABLE users ALTER COLUMN user_type DROP DEFAULT;
