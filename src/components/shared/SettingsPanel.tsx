import { useState } from 'react';
import { usePrivacyStorage } from '../../hooks/usePrivacyStorage';
import { useStore } from '@nanostores/react';
import { $mode, setMode, type Mode } from '../../stores';

const MODE_INFO: Record<Mode, { icon: string; color: string; label: string }> = {
  kasra: { icon: '⌘', color: '#22d3ee', label: 'Kasra' },
  river: { icon: '◈', color: '#8b5cf6', label: 'River' },
  sol: { icon: '☀', color: '#fbbf24', label: 'Sol' },
};

export function SettingsPanel() {
  const mode = useStore($mode);
  const {
    isLoading,
    isInitialized,
    deviceId,
    syncCode,
    lastSyncAt,
    checkins,
    streak,
    preferences,
    enableSync,
    syncToServer,
    restoreFromCode,
    exportData,
    deleteAllData,
  } = usePrivacyStorage();

  const [restoreCode, setRestoreCode] = useState('');
  const [showSyncCode, setShowSyncCode] = useState(false);
  const [isEnablingSync, setIsEnablingSync] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleEnableSync = async () => {
    setIsEnablingSync(true);
    setMessage(null);
    try {
      const result = await enableSync();
      if (result?.syncCode) {
        setShowSyncCode(true);
        setMessage({ type: 'success', text: 'Sync enabled! Save your sync code to restore on other devices.' });
      } else {
        setMessage({ type: 'error', text: 'Failed to enable sync. Please add your birth data first.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to enable sync.' });
    }
    setIsEnablingSync(false);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setMessage(null);
    try {
      const success = await syncToServer();
      if (success) {
        setMessage({ type: 'success', text: 'Data synced successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Sync failed. Please try again.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Sync failed.' });
    }
    setIsSyncing(false);
  };

  const handleRestore = async () => {
    if (!restoreCode.trim()) return;
    setIsRestoring(true);
    setMessage(null);
    try {
      const success = await restoreFromCode(restoreCode.trim());
      if (success) {
        setMessage({ type: 'success', text: 'Data restored successfully!' });
        setRestoreCode('');
      } else {
        setMessage({ type: 'error', text: 'Invalid sync code or account not found.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Restore failed.' });
    }
    setIsRestoring(false);
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setIsDeleting(true);
    setMessage(null);
    try {
      await deleteAllData();
      setMessage({ type: 'success', text: 'All data deleted. Refreshing...' });
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setMessage({ type: 'error', text: 'Delete failed.' });
    }
    setIsDeleting(false);
    setShowDeleteConfirm(false);
  };

  const copySyncCode = () => {
    if (syncCode) {
      navigator.clipboard.writeText(syncCode);
      setMessage({ type: 'success', text: 'Sync code copied!' });
    }
  };

  if (isLoading) {
    return (
      <div className="settings-panel">
        <div className="loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="settings-panel">
      {/* Message Banner */}
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="close-btn">×</button>
        </div>
      )}

      {/* Mode Selection */}
      <section className="settings-section">
        <h2>Voice Mode</h2>
        <p className="section-desc">Choose how the patterns speak to you</p>
        <div className="mode-grid">
          {(['kasra', 'river', 'sol'] as Mode[]).map((m) => {
            const info = MODE_INFO[m];
            const isActive = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`mode-card ${isActive ? 'active' : ''}`}
                style={{ '--mode-color': info.color } as React.CSSProperties}
              >
                <span className="mode-icon">{info.icon}</span>
                <span className="mode-label">{info.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Data & Privacy */}
      <section className="settings-section">
        <h2>Data & Privacy</h2>
        <p className="section-desc">Your data stays on your device by default</p>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat">
            <span className="stat-value">{checkins.length}</span>
            <span className="stat-label">Check-ins</span>
          </div>
          <div className="stat">
            <span className="stat-value">{streak.current}</span>
            <span className="stat-label">Day Streak</span>
          </div>
          <div className="stat">
            <span className="stat-value">{streak.longest}</span>
            <span className="stat-label">Best Streak</span>
          </div>
        </div>

        {/* Sync Status */}
        <div className="sync-status">
          <div className="sync-indicator">
            <span className={`dot ${syncCode ? 'synced' : 'local'}`} />
            <span>{syncCode ? 'Sync enabled' : 'Local only'}</span>
          </div>
          {lastSyncAt && (
            <span className="last-sync">
              Last sync: {new Date(lastSyncAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Sync Code Display */}
        {syncCode && (
          <div className="sync-code-box">
            <label>Your Sync Code</label>
            <div className="code-display">
              <code>{showSyncCode ? syncCode : '••••-••••-••••'}</code>
              <button onClick={() => setShowSyncCode(!showSyncCode)} className="icon-btn">
                {showSyncCode ? '🙈' : '👁️'}
              </button>
              <button onClick={copySyncCode} className="icon-btn">📋</button>
            </div>
            <p className="hint">Save this code to restore your data on another device</p>
          </div>
        )}

        {/* Actions */}
        <div className="action-buttons">
          {!syncCode ? (
            <button
              onClick={handleEnableSync}
              disabled={isEnablingSync}
              className="btn btn-primary"
            >
              {isEnablingSync ? 'Enabling...' : 'Enable Cloud Sync'}
            </button>
          ) : (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="btn btn-secondary"
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          )}

          <button onClick={() => exportData()} className="btn btn-secondary">
            Export My Data
          </button>
        </div>

        {/* Restore */}
        {!syncCode && (
          <div className="restore-section">
            <h3>Restore from Another Device</h3>
            <div className="restore-input">
              <input
                type="text"
                placeholder="COSMIC-XXXX-XXXX"
                value={restoreCode}
                onChange={(e) => setRestoreCode(e.target.value.toUpperCase())}
                className="input"
              />
              <button
                onClick={handleRestore}
                disabled={isRestoring || !restoreCode.trim()}
                className="btn btn-primary"
              >
                {isRestoring ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Danger Zone */}
      <section className="settings-section danger-zone">
        <h2>Danger Zone</h2>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn btn-danger"
          >
            Delete All My Data
          </button>
        ) : (
          <div className="delete-confirm">
            <p>This will permanently delete all your data. Type <strong>DELETE</strong> to confirm:</p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="input"
            />
            <div className="confirm-buttons">
              <button
                onClick={handleDelete}
                disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                className="btn btn-danger"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Device Info */}
      <section className="settings-section device-info">
        <h2>Device Info</h2>
        <div className="info-row">
          <span className="info-label">Device ID</span>
          <code className="info-value">{deviceId?.slice(0, 8)}...</code>
        </div>
        <p className="hint">
          Your identity is protected by pseudonymization. We cannot link this ID to you.
        </p>
      </section>

      <style>{`
        .settings-panel {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .loading {
          text-align: center;
          padding: 4rem 0;
          color: rgba(240, 232, 216, 0.5);
        }

        .message {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
        }
        .message.success {
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #22c55e;
        }
        .message.error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }
        .close-btn {
          background: none;
          border: none;
          color: inherit;
          font-size: 1.25rem;
          cursor: pointer;
          opacity: 0.7;
        }
        .close-btn:hover { opacity: 1; }

        .settings-section {
          background: rgba(26, 24, 20, 0.6);
          border: 1px solid rgba(212, 168, 84, 0.15);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .settings-section h2 {
          font-size: 1.1rem;
          font-weight: 500;
          color: #d4a854;
          margin-bottom: 0.25rem;
        }

        .settings-section h3 {
          font-size: 0.95rem;
          font-weight: 500;
          color: #f0e8d8;
          margin: 1.25rem 0 0.75rem;
        }

        .section-desc {
          font-size: 0.85rem;
          color: rgba(240, 232, 216, 0.5);
          margin-bottom: 1rem;
        }

        .mode-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
        }

        .mode-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: rgba(10, 9, 8, 0.4);
          border: 1px solid rgba(212, 168, 84, 0.1);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .mode-card:hover {
          border-color: var(--mode-color);
        }
        .mode-card.active {
          background: rgba(212, 168, 84, 0.1);
          border-color: var(--mode-color);
        }
        .mode-icon {
          font-size: 1.5rem;
        }
        .mode-card.active .mode-icon,
        .mode-card.active .mode-label {
          color: var(--mode-color);
        }
        .mode-label {
          font-size: 0.85rem;
          color: rgba(240, 232, 216, 0.7);
        }

        .stats-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .stat {
          flex: 1;
          text-align: center;
          padding: 0.75rem;
          background: rgba(10, 9, 8, 0.4);
          border-radius: 8px;
        }
        .stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 500;
          color: #d4a854;
        }
        .stat-label {
          font-size: 0.75rem;
          color: rgba(240, 232, 216, 0.5);
        }

        .sync-status {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          background: rgba(10, 9, 8, 0.4);
          border-radius: 8px;
          margin-bottom: 1rem;
        }
        .sync-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .dot.local { background: #fbbf24; }
        .dot.synced { background: #22c55e; }
        .last-sync {
          font-size: 0.8rem;
          color: rgba(240, 232, 216, 0.4);
        }

        .sync-code-box {
          padding: 1rem;
          background: rgba(10, 9, 8, 0.6);
          border: 1px dashed rgba(212, 168, 84, 0.3);
          border-radius: 8px;
          margin-bottom: 1rem;
        }
        .sync-code-box label {
          display: block;
          font-size: 0.8rem;
          color: rgba(240, 232, 216, 0.5);
          margin-bottom: 0.5rem;
        }
        .code-display {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .code-display code {
          flex: 1;
          font-size: 1.1rem;
          font-family: 'Geist Mono', monospace;
          color: #d4a854;
          letter-spacing: 0.1em;
        }
        .icon-btn {
          background: none;
          border: none;
          font-size: 1rem;
          cursor: pointer;
          padding: 0.25rem;
          opacity: 0.7;
        }
        .icon-btn:hover { opacity: 1; }

        .hint {
          font-size: 0.8rem;
          color: rgba(240, 232, 216, 0.4);
          margin-top: 0.5rem;
        }

        .action-buttons {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .btn {
          flex: 1;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-primary {
          background: rgba(212, 168, 84, 0.2);
          border-color: rgba(212, 168, 84, 0.4);
          color: #d4a854;
        }
        .btn-primary:hover:not(:disabled) {
          background: rgba(212, 168, 84, 0.3);
        }
        .btn-secondary {
          background: rgba(240, 232, 216, 0.05);
          border-color: rgba(240, 232, 216, 0.2);
          color: rgba(240, 232, 216, 0.8);
        }
        .btn-secondary:hover:not(:disabled) {
          background: rgba(240, 232, 216, 0.1);
        }
        .btn-danger {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }
        .btn-danger:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.25);
        }

        .restore-section {
          padding-top: 1rem;
          border-top: 1px solid rgba(212, 168, 84, 0.1);
        }
        .restore-input {
          display: flex;
          gap: 0.5rem;
        }
        .restore-input .input {
          flex: 1;
        }
        .restore-input .btn {
          flex: 0;
          white-space: nowrap;
        }

        .input {
          padding: 0.75rem 1rem;
          background: rgba(10, 9, 8, 0.6);
          border: 1px solid rgba(212, 168, 84, 0.2);
          border-radius: 8px;
          color: #f0e8d8;
          font-size: 0.9rem;
          font-family: 'Geist Mono', monospace;
        }
        .input::placeholder {
          color: rgba(240, 232, 216, 0.3);
        }
        .input:focus {
          outline: none;
          border-color: rgba(212, 168, 84, 0.5);
        }

        .danger-zone {
          border-color: rgba(239, 68, 68, 0.2);
        }
        .danger-zone h2 {
          color: #ef4444;
        }
        .delete-confirm p {
          font-size: 0.9rem;
          color: rgba(240, 232, 216, 0.7);
          margin-bottom: 0.75rem;
        }
        .delete-confirm .input {
          width: 100%;
          margin-bottom: 0.75rem;
        }
        .confirm-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .device-info {
          opacity: 0.7;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .info-label {
          font-size: 0.85rem;
          color: rgba(240, 232, 216, 0.6);
        }
        .info-value {
          font-size: 0.85rem;
          font-family: 'Geist Mono', monospace;
          color: rgba(240, 232, 216, 0.5);
        }

        @media (max-width: 480px) {
          .mode-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .stats-row {
            flex-direction: column;
          }
          .action-buttons {
            flex-direction: column;
          }
          .restore-input {
            flex-direction: column;
          }
          .confirm-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
