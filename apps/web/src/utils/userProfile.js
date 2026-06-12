const STORAGE_KEY = 'ona-user-profile';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function loadUserProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const profile = JSON.parse(raw);
    if (!profile?.email || !profile?.firstName || !profile?.lastName) {
      return null;
    }

    return {
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName
    };
  } catch {
    return null;
  }
}

export function saveUserProfile({ email, firstName, lastName }) {
  const profile = {
    email: normalizeEmail(email),
    firstName: String(firstName || '').trim(),
    lastName: String(lastName || '').trim()
  };

  if (!profile.email || !profile.firstName || !profile.lastName) {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}
