/**
 * Privacy-First Data Architecture
 *
 * Implements pseudonymization for GDPR compliance:
 * - User PII encrypted in vault (system can't read)
 * - Astrology data linked by hash (no PII)
 * - User controls their data via device_id
 */

// ============================================
// Types
// ============================================

export interface BirthData {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface EncryptedVault {
  userHash: string;
  birthDataEnc: string;
  emailEnc?: string;
  keySalt: string;
  syncCode?: string;
}

export interface CheckinData {
  id: string;
  date: string;
  vector: number[];
  stage: string;
  kappa: number;
  moodScore?: number;
}

export interface LocalUserData {
  deviceId: string;
  birthData?: BirthData;
  checkins: CheckinData[];
  preferences: {
    mode: 'kasra' | 'river' | 'sol';
    theme: 'dark' | 'light' | 'auto';
    language: string;
  };
  syncCode?: string;
  lastSyncAt?: string;
}

// ============================================
// Constants
// ============================================

const STORAGE_KEY = 'realm_user_data';
const DEVICE_ID_KEY = 'realm_device_id';

// ============================================
// Hash Generation
// ============================================

/**
 * Generate a SHA-256 hash of the input with pepper
 * The pepper ensures hashes can't be reversed even with rainbow tables
 */
export async function generateUserHash(deviceId: string, pepper: string): Promise<string> {
  const data = new TextEncoder().encode(deviceId + pepper);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

/**
 * Generate a human-readable sync code
 * Format: COSMIC-XXXX-XXXX
 */
export function generateSyncCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars (0/O, 1/I/L)
  let code = 'COSMIC-';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Generate a random device ID (UUID v4)
 */
export function generateDeviceId(): string {
  return crypto.randomUUID();
}

// ============================================
// Encryption / Decryption
// ============================================

/**
 * Derive an encryption key from device ID using PBKDF2
 * This ensures only the user (with their device) can decrypt
 */
async function deriveKey(deviceId: string, salt: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(deviceId),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(): string {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  return bufferToHex(saltBytes.buffer as ArrayBuffer);
}

/**
 * Encrypt data using AES-256-GCM
 * Returns base64 encoded string: iv (12 bytes) + ciphertext
 */
export async function encryptData(
  data: unknown,
  deviceId: string,
  salt: string
): Promise<string> {
  const key = await deriveKey(deviceId, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decryptData<T>(
  encrypted: string,
  deviceId: string,
  salt: string
): Promise<T> {
  const key = await deriveKey(deviceId, salt);

  // Decode base64 and split IV + ciphertext
  const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return JSON.parse(new TextDecoder().decode(plaintext));
}

// ============================================
// Local Storage Management
// ============================================

/**
 * Get or create device ID from localStorage
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return generateDeviceId();
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Get local user data from localStorage
 */
export function getLocalData(): LocalUserData | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Save local user data to localStorage
 */
export function saveLocalData(data: LocalUserData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Initialize local data structure
 */
export function initializeLocalData(): LocalUserData {
  const deviceId = getOrCreateDeviceId();
  const data: LocalUserData = {
    deviceId,
    checkins: [],
    preferences: {
      mode: 'sol',
      theme: 'dark',
      language: 'en',
    },
  };
  saveLocalData(data);
  return data;
}

/**
 * Clear all local data (for GDPR deletion)
 */
export function clearLocalData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(DEVICE_ID_KEY);
}

// ============================================
// Checkin Management
// ============================================

/**
 * Add a check-in to local storage
 */
export function addCheckin(checkin: Omit<CheckinData, 'id'>): CheckinData {
  const data = getLocalData() || initializeLocalData();
  const newCheckin: CheckinData = {
    id: crypto.randomUUID(),
    ...checkin,
  };
  data.checkins.push(newCheckin);
  saveLocalData(data);
  return newCheckin;
}

/**
 * Get check-in history
 */
export function getCheckins(): CheckinData[] {
  const data = getLocalData();
  return data?.checkins || [];
}

/**
 * Calculate streak data
 */
export function calculateStreak(checkins: CheckinData[]): { current: number; longest: number } {
  if (checkins.length === 0) return { current: 0, longest: 0 };

  // Sort by date descending
  const sorted = [...checkins].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let current = 0;
  let longest = 0;
  let streak = 0;
  let lastDate: Date | null = null;

  for (const checkin of sorted) {
    const checkinDate = new Date(checkin.date);
    checkinDate.setHours(0, 0, 0, 0);

    if (!lastDate) {
      // First checkin
      const daysDiff = Math.floor((today.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 1) {
        streak = 1;
        current = 1;
      }
    } else {
      const daysDiff = Math.floor((lastDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff === 1) {
        streak++;
        if (current > 0) current = streak;
      } else if (daysDiff > 1) {
        longest = Math.max(longest, streak);
        streak = 1;
      }
    }

    lastDate = checkinDate;
  }

  longest = Math.max(longest, streak);

  return { current, longest };
}

// ============================================
// Utility Functions
// ============================================

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================
// Server Sync Types (for API)
// ============================================

export interface SyncRequest {
  userHash: string;
  birthDataEnc: string;
  keySalt: string;
  checkins: {
    date: string;
    vector: number[];
    stage: string;
    kappa: number;
    moodScore?: number;
  }[];
  syncCode?: string;
}

export interface RestoreRequest {
  syncCode: string;
  deviceId: string; // Needed to decrypt
}

export interface DeleteRequest {
  userHash: string;
  deviceId: string; // Verify ownership
}
