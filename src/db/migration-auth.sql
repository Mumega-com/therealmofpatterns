-- Magic link auth tokens
CREATE TABLE IF NOT EXISTS auth_tokens (
  id         TEXT PRIMARY KEY,
  email_hash TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  used_at    DATETIME
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash  ON auth_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_email ON auth_tokens(email_hash);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,
  email_hash   TEXT NOT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at   DATETIME NOT NULL,
  last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_email ON sessions(email_hash);
