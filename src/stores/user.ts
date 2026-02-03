import { atom, map, computed } from 'nanostores';

// =====================
// USER TYPES
// =====================
export interface BirthData {
  date: string;          // ISO date string "1990-02-15"
  timeRange?: 'morning' | 'afternoon' | 'evening' | 'night' | null;
  location?: {
    city: string;
    lat: number;
    lng: number;
  } | null;
}

export interface InnerOctave {
  P: number;  // Perception
  F: number;  // Feeling
  A: number;  // Action
  M: number;  // Memory
  T: number;  // Thought
  R: number;  // Relation
  C: number;  // Creation
  W: number;  // Will/Witness
}

export interface UserState {
  email: string | null;
  isPro: boolean;
  birthData: BirthData | null;
  innerOctave: InnerOctave | null;
  onboardedAt: string | null;  // ISO date
}

// =====================
// USER STORE
// =====================
const defaultUser: UserState = {
  email: null,
  isPro: false,
  birthData: null,
  innerOctave: null,
  onboardedAt: null,
};

export const $user = map<UserState>(defaultUser);

// Initialize from localStorage
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('rop_user');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      $user.set({ ...defaultUser, ...parsed });
    } catch (e) {
      console.error('Failed to parse saved user data');
    }
  }
}

// Persist changes to localStorage
$user.subscribe((user) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('rop_user', JSON.stringify(user));
  }
});

// =====================
// USER ACTIONS
// =====================
export function setEmail(email: string) {
  $user.setKey('email', email);
}

export function setPro(isPro: boolean) {
  $user.setKey('isPro', isPro);
}

export function setBirthData(birthData: BirthData) {
  $user.setKey('birthData', birthData);
}

export function setInnerOctave(innerOctave: InnerOctave) {
  $user.setKey('innerOctave', innerOctave);
  $user.setKey('onboardedAt', new Date().toISOString());
}

export function clearUser() {
  $user.set(defaultUser);
  if (typeof window !== 'undefined') {
    localStorage.removeItem('rop_user');
  }
}

// =====================
// COMPUTED
// =====================
export const $isOnboarded = computed($user, (user) => {
  return user.innerOctave !== null;
});

export const $hasEmail = computed($user, (user) => {
  return user.email !== null;
});

// Inner octave as array (for calculations)
export const $innerOctaveArray = computed($user, (user) => {
  if (!user.innerOctave) return null;
  const { P, F, A, M, T, R, C, W } = user.innerOctave;
  return [P, F, A, M, T, R, C, W];
});
