/**
 * usePrivacyStorage - React Hook for Privacy-First Data Management
 *
 * Handles:
 * - Local-first storage (data stays on device by default)
 * - Optional server sync (encrypted)
 * - Cross-device restore via sync code
 * - GDPR deletion and export
 */

import { useState, useEffect, useCallback } from 'react';
import {
  type BirthData,
  type CheckinData,
  type LocalUserData,
  getOrCreateDeviceId,
  getLocalData,
  saveLocalData,
  initializeLocalData,
  clearLocalData,
  addCheckin as addCheckinLocal,
  calculateStreak,
  encryptData,
  generateSalt,
} from '../lib/privacy';

// ============================================
// API Response Types
// ============================================

interface InitApiResponse {
  success: boolean;
  userHash: string;
  syncCode?: string;
  created: boolean;
}

interface SyncApiResponse {
  success: boolean;
  synced: { checkins: number; profile: boolean };
  lastSyncAt: string;
}

interface RestoreApiResponse {
  success: boolean;
  vault: { birthDataEnc: string; keySalt: string };
  profile: {
    dominantDimension: number | null;
    secondaryDimension: number | null;
    currentStage: string | null;
    kappaAverage: number | null;
    checkinCount: number;
    streakCurrent: number;
    streakLongest: number;
  };
  checkins: {
    id: string;
    date: string;
    vector: number[];
    stage: string;
    kappa: number;
    moodScore: number | null;
  }[];
  newUserHash: string;
}

// ============================================
// Types
// ============================================

interface UsePrivacyStorageReturn {
  // State
  isLoading: boolean;
  isInitialized: boolean;
  deviceId: string | null;
  birthData: BirthData | null;
  checkins: CheckinData[];
  streak: { current: number; longest: number };
  syncCode: string | null;
  lastSyncAt: string | null;
  preferences: LocalUserData['preferences'];

  // Actions
  setBirthData: (data: BirthData) => void;
  addCheckin: (checkin: Omit<CheckinData, 'id'>) => CheckinData;
  updatePreferences: (prefs: Partial<LocalUserData['preferences']>) => void;

  // Sync
  enableSync: () => Promise<{ syncCode: string } | null>;
  syncToServer: () => Promise<boolean>;
  restoreFromCode: (code: string) => Promise<boolean>;

  // GDPR
  exportData: () => Promise<void>;
  deleteAllData: () => Promise<boolean>;
}

// ============================================
// Hook Implementation
// ============================================

export function usePrivacyStorage(): UsePrivacyStorageReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [localData, setLocalData] = useState<LocalUserData | null>(null);

  // Initialize on mount
  useEffect(() => {
    const init = () => {
      let data = getLocalData();
      if (!data) {
        data = initializeLocalData();
      }
      setLocalData(data);
      setIsInitialized(true);
      setIsLoading(false);
    };

    // Only run on client
    if (typeof window !== 'undefined') {
      init();
    }
  }, []);

  // Save whenever localData changes
  useEffect(() => {
    if (localData && isInitialized) {
      saveLocalData(localData);
    }
  }, [localData, isInitialized]);

  // ============================================
  // Basic Actions
  // ============================================

  const setBirthData = useCallback((data: BirthData) => {
    setLocalData((prev) => {
      if (!prev) return prev;
      return { ...prev, birthData: data };
    });
  }, []);

  const addCheckin = useCallback((checkin: Omit<CheckinData, 'id'>): CheckinData => {
    const newCheckin = addCheckinLocal(checkin);
    setLocalData((prev) => {
      if (!prev) return prev;
      return { ...prev, checkins: [...prev.checkins, newCheckin] };
    });
    return newCheckin;
  }, []);

  const updatePreferences = useCallback((prefs: Partial<LocalUserData['preferences']>) => {
    setLocalData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        preferences: { ...prev.preferences, ...prefs },
      };
    });
  }, []);

  // ============================================
  // Server Sync
  // ============================================

  const enableSync = useCallback(async (): Promise<{ syncCode: string } | null> => {
    if (!localData?.birthData) {
      console.error('Cannot enable sync without birth data');
      return null;
    }

    try {
      const salt = generateSalt();
      const birthDataEnc = await encryptData(localData.birthData, localData.deviceId, salt);

      const response = await fetch('/api/user/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: localData.deviceId,
          birthDataEnc,
          keySalt: salt,
          generateSyncCode: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to enable sync');
      }

      const result: InitApiResponse = await response.json();

      if (result.success && result.syncCode) {
        setLocalData((prev) => {
          if (!prev) return prev;
          return { ...prev, syncCode: result.syncCode };
        });
        return { syncCode: result.syncCode };
      }

      return null;
    } catch (error) {
      console.error('Enable sync error:', error);
      return null;
    }
  }, [localData]);

  const syncToServer = useCallback(async (): Promise<boolean> => {
    if (!localData) return false;

    try {
      // Calculate profile stats
      const streak = calculateStreak(localData.checkins);
      const dominantCounts: Record<number, number> = {};

      for (const checkin of localData.checkins) {
        const maxIdx = checkin.vector.indexOf(Math.max(...checkin.vector));
        dominantCounts[maxIdx] = (dominantCounts[maxIdx] || 0) + 1;
      }

      const dominantDimension = Object.entries(dominantCounts).sort(
        ([, a], [, b]) => b - a
      )[0]?.[0];

      const avgKappa =
        localData.checkins.length > 0
          ? localData.checkins.reduce((sum, c) => sum + c.kappa, 0) / localData.checkins.length
          : 0;

      const response = await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: localData.deviceId,
          checkins: localData.checkins.map((c) => ({
            id: c.id,
            date: c.date,
            vector: c.vector,
            stage: c.stage,
            kappa: c.kappa,
            moodScore: c.moodScore,
            dominantToday: c.vector.indexOf(Math.max(...c.vector)),
          })),
          profile: {
            dominantDimension: dominantDimension ? parseInt(dominantDimension) : null,
            currentStage: localData.checkins[localData.checkins.length - 1]?.stage,
            kappaAverage: avgKappa,
            streakCurrent: streak.current,
            streakLongest: streak.longest,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const result: SyncApiResponse = await response.json();

      if (result.success) {
        setLocalData((prev) => {
          if (!prev) return prev;
          return { ...prev, lastSyncAt: result.lastSyncAt };
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Sync error:', error);
      return false;
    }
  }, [localData]);

  const restoreFromCode = useCallback(
    async (code: string): Promise<boolean> => {
      const deviceId = getOrCreateDeviceId();

      try {
        const response = await fetch('/api/user/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            syncCode: code,
            newDeviceId: deviceId,
          }),
        });

        if (!response.ok) {
          throw new Error('Restore failed');
        }

        const result: RestoreApiResponse = await response.json();

        if (result.success) {
          // Note: Birth data is encrypted and needs decryption with original device
          // For now, we restore check-ins and profile
          setLocalData((prev) => {
            const newData: LocalUserData = {
              deviceId,
              checkins: result.checkins.map((c) => ({
                id: c.id,
                date: c.date,
                vector: c.vector,
                stage: c.stage,
                kappa: c.kappa,
                moodScore: c.moodScore ?? undefined,
              })),
              preferences: prev?.preferences || {
                mode: 'sol',
                theme: 'dark',
                language: 'en',
              },
              syncCode: code,
              lastSyncAt: new Date().toISOString(),
            };
            return newData;
          });
          return true;
        }

        return false;
      } catch (error) {
        console.error('Restore error:', error);
        return false;
      }
    },
    []
  );

  // ============================================
  // GDPR Actions
  // ============================================

  const exportData = useCallback(async (): Promise<void> => {
    if (!localData) return;

    try {
      const response = await fetch(`/api/user/export?deviceId=${localData.deviceId}`);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `realm-of-patterns-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  }, [localData]);

  const deleteAllData = useCallback(async (): Promise<boolean> => {
    if (!localData) return false;

    try {
      // Delete from server
      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: localData.deviceId,
          confirm: true,
        }),
      });

      // Clear local storage regardless of server response
      clearLocalData();
      setLocalData(null);
      setIsInitialized(false);

      return response.ok;
    } catch (error) {
      console.error('Delete error:', error);
      // Still clear local data
      clearLocalData();
      setLocalData(null);
      return false;
    }
  }, [localData]);

  // ============================================
  // Computed Values
  // ============================================

  const streak = localData ? calculateStreak(localData.checkins) : { current: 0, longest: 0 };

  return {
    isLoading,
    isInitialized,
    deviceId: localData?.deviceId || null,
    birthData: localData?.birthData || null,
    checkins: localData?.checkins || [],
    streak,
    syncCode: localData?.syncCode || null,
    lastSyncAt: localData?.lastSyncAt || null,
    preferences: localData?.preferences || { mode: 'sol', theme: 'dark', language: 'en' },

    setBirthData,
    addCheckin,
    updatePreferences,

    enableSync,
    syncToServer,
    restoreFromCode,

    exportData,
    deleteAllData,
  };
}

export default usePrivacyStorage;
