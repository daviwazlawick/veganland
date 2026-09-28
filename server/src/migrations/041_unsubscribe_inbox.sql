-- Tracks which inbox messages the unsubscribe-inbox worker has already
-- processed, so re-scanning the mailbox never re-applies the same
-- opt-out twice. Keyed by IMAP Message-ID, not mailbox flags — the
-- mailbox itself is never modified (read-only), so this table is the
-- only source of truth for "already handled".
CREATE TABLE IF NOT EXISTS processed_unsubscribe_emails (
  message_id      TEXT PRIMARY KEY,
  matched_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  matched_email   TEXT,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
