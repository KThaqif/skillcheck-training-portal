export const LIMITS = {
  name: 120,
  email: 190,
  employeeId: 80,
  department: 120,
  passwordMin: 6,
  passwordMax: 128,
  topicTitle: 120,
  topicDescription: 1000,
  category: 120,
  thumbnail: 500,
  videoTitle: 120,
  videoDescription: 1000,
  questionText: 500,
  optionText: 200,
  maxVideoSizeBytes: 500 * 1024 * 1024
};

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function isValidUrlOrLocalPath(value) {
  const text = String(value || '').trim();
  if (!text) return true;

  if (text.startsWith('/')) {
    return text.length <= LIMITS.thumbnail && !text.includes('..') && !/[<>"'\\\x00-\x1F]/.test(text);
  }

  try {
    const url = new URL(text);
    return ['http:', 'https:'].includes(url.protocol) && text.length <= LIMITS.thumbnail;
  } catch {
    return false;
  }
}

export function formatFileSize(bytes) {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}
