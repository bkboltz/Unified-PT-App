const STORAGE_KEY = 'pt_saved_member_profile_v1';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 365 days in seconds

const DEFAULT_PROFILE = {
  rank: '',
  firstName: '',
  lastName: '',
  gender: 'male',
  age: '',
  heightMode: 'ft_in',
  heightFeet: '',
  heightInches: '',
  heightTotalInches: ''
};

function readCookie(name) {
  if (typeof document === 'undefined' || !document.cookie) return null;
  const prefix = `${name}=`;
  const parts = document.cookie.split(';');
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (part.startsWith(prefix)) {
      try {
        return JSON.parse(decodeURIComponent(part.slice(prefix.length)));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function writeCookie(name, value) {
  if (typeof document === 'undefined') return;
  try {
    const encoded = encodeURIComponent(JSON.stringify(value));
    document.cookie = `${name}=${encoded}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
  } catch {
    // Ignore cookie write errors
  }
}

/**
 * Synchronously loads saved member profile data from localStorage
 * with fallback to a 365-day first-party browser cookie.
 */
export function loadSavedMemberProfile() {
  let stored = null;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        stored = JSON.parse(raw);
      }
    } catch {
      stored = null;
    }
  }

  const cookieData = readCookie(STORAGE_KEY);

  // Merge cookie fallback with localStorage so neither store loses fields
  const merged = {
    ...DEFAULT_PROFILE,
    ...(cookieData && typeof cookieData === 'object' ? cookieData : {}),
    ...(stored && typeof stored === 'object' ? stored : {})
  };

  return merged;
}

/**
 * Silently merges and saves updated member profile fields into
 * both localStorage and a 365-day browser cookie.
 */
export function saveMemberProfile(partialProfile) {
  if (!partialProfile || typeof partialProfile !== 'object') return;

  const current = loadSavedMemberProfile();
  const updated = { ...current };

  for (const key of Object.keys(DEFAULT_PROFILE)) {
    if (partialProfile[key] !== undefined) {
      updated[key] = partialProfile[key];
    }
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage quota / private mode errors
    }
  }

  writeCookie(STORAGE_KEY, updated);
}
