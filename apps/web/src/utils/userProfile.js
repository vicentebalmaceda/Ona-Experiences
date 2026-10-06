const STORAGE_KEY = 'ona-user-profile';

const DOCUMENT_TYPES = ['rut', 'passport'];

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function cleanText(value) {
  return String(value || '').trim();
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
      lastName: profile.lastName,
      documentType: DOCUMENT_TYPES.includes(profile.documentType) ? profile.documentType : 'rut',
      documentNumber: cleanText(profile.documentNumber),
      phone: cleanText(profile.phone)
    };
  } catch {
    return null;
  }
}

export function saveUserProfile({ email, firstName, lastName, documentType, documentNumber, phone }) {
  const profile = {
    email: normalizeEmail(email),
    firstName: cleanText(firstName),
    lastName: cleanText(lastName),
    documentType: DOCUMENT_TYPES.includes(documentType) ? documentType : 'rut',
    documentNumber: cleanText(documentNumber),
    phone: cleanText(phone)
  };

  if (!profile.email || !profile.firstName || !profile.lastName) {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Storage may be unavailable (private mode); the quote still goes through.
  }
}
