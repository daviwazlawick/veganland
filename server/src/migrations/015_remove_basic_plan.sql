UPDATE users SET user_type = 'starter' WHERE user_type = 'basic';
ALTER TABLE users ALTER COLUMN user_type SET DEFAULT 'starter';
