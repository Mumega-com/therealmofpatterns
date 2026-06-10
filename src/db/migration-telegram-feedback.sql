-- The Realm of Patterns - Telegram Reading Feedback
-- "Sol was right ✓ / Sol missed ✗" buttons after daily readings (GTM roadmap §2.4).
-- One verdict per user per day; re-votes replace the previous row.

CREATE TABLE IF NOT EXISTS telegram_reading_feedback (
    id TEXT PRIMARY KEY,
    telegram_user_id TEXT NOT NULL,
    reading_date TEXT NOT NULL, -- YYYY-MM-DD (UTC)
    verdict TEXT NOT NULL CHECK (verdict IN ('hit', 'miss')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (telegram_user_id) REFERENCES telegram_users(telegram_user_id) ON DELETE CASCADE,
    UNIQUE(telegram_user_id, reading_date)
);

CREATE INDEX IF NOT EXISTS idx_telegram_reading_feedback_user ON telegram_reading_feedback(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_reading_feedback_date ON telegram_reading_feedback(reading_date);
CREATE INDEX IF NOT EXISTS idx_telegram_reading_feedback_verdict ON telegram_reading_feedback(verdict);
