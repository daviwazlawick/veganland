import './env.js';
import { ImapFlow } from 'imapflow';
import { getPool } from './db.js';

// Some mail clients (Apple Mail confirmed) use the mailto fallback in the
// List-Unsubscribe header instead of the one-click URL — that path never
// hits our server, it just lands as a plain email. This scans the inbox
// read-only (never modifies mailbox state — no \Seen, no delete, no move)
// and applies the opt-out by hand, tracking what it's already processed in
// our own DB table so re-scanning never double-applies anything.
const IMAP_HOST = 'imap.hostinger.com';
const IMAP_PORT = 993;

export async function runUnsubscribeInbox() {
  const db = await getPool();
  if (!db) return;
  const user = process.env.NOVAQI_SMTP_USER;
  const pass = process.env.NOVAQI_SMTP_PASS;
  if (!user || !pass) return;

  const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    let candidates = [];
    try {
      if (!client.mailbox.exists) return;
      for await (const msg of client.fetch('1:*', { envelope: true, uid: true })) {
        const subject = msg.envelope?.subject || '';
        if (subject.toLowerCase().includes('unsubscribe')) {
          candidates.push(msg);
        }
      }
    } finally {
      lock.release();
    }

    if (candidates.length === 0) { await client.logout(); return; }

    let applied = 0;
    for (const msg of candidates) {
      const messageId = msg.envelope?.messageId || `uid-${msg.uid}`;
      const already = await db.query(
        'SELECT 1 FROM processed_unsubscribe_emails WHERE message_id = $1', [messageId]
      ).catch(() => ({ rowCount: 0 }));
      if (already.rowCount > 0) continue;

      const subject = msg.envelope?.subject || '';
      const fromAddr = msg.envelope?.from?.[0]?.address || null;
      // "unsubscribe: user@example.com" (our mailto fallback subject) is
      // authoritative when present; otherwise fall back to the sender.
      const subjectMatch = subject.match(/unsubscribe:\s*([^\s,;]+@[^\s,;]+)/i);
      const targetEmail = (subjectMatch?.[1] || fromAddr || '').toLowerCase().trim();

      let matchedUserId = null;
      if (targetEmail) {
        const userRes = await db.query('SELECT id FROM users WHERE lower(email) = $1', [targetEmail]).catch(() => ({ rows: [] }));
        if (userRes.rows[0]) {
          matchedUserId = userRes.rows[0].id;
          await db.query('UPDATE users SET marketing_email_opt_out = true WHERE id = $1', [matchedUserId]).catch(() => {});
          applied++;
        }
      }

      await db.query(
        `INSERT INTO processed_unsubscribe_emails (message_id, matched_user_id, matched_email) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [messageId, matchedUserId, targetEmail || null]
      ).catch(() => {});
    }

    if (applied > 0) console.log(`[unsubscribe-inbox] opted out ${applied} account(s) from ${candidates.length} matching email(s)`);
    await client.logout();
  } catch (e) {
    console.warn('[unsubscribe-inbox]', e.message);
    try { await client.logout(); } catch {}
  }
}
