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
  answerText: 200,
  maxVideoSizeBytes: 500 * 1024 * 1024
};

export const allowedRoles = new Set(['ADMIN', 'EMPLOYEE', 'MANAGER']);
export const allowedPublicRoles = new Set(['EMPLOYEE']);

export function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function cleanEmail(value) {
  return cleanString(value).toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function hasMaxLength(value, max) {
  return cleanString(value).length <= max;
}

export function isDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isPastDate(value) {
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const inputDate = new Date(`${value}T00:00:00Z`);
  return inputDate.getTime() < todayUtc;
}

export function isValidUrlOrLocalPath(value) {
  const text = cleanString(value);
  if (!text) return true;

  if (text.startsWith('/')) {
    return text.length <= LIMITS.thumbnail
      && !text.includes('..')
      && !/[<>"'\\\x00-\x1F]/.test(text);
  }

  try {
    const url = new URL(text);
    return ['http:', 'https:'].includes(url.protocol) && text.length <= LIMITS.thumbnail;
  } catch {
    return false;
  }
}

export function parsePositiveInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export function parseNonNegativeInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

export function validatePassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    return 'Password is required.';
  }
  if (password.length < LIMITS.passwordMin) {
    return `Password must be at least ${LIMITS.passwordMin} characters.`;
  }
  if (password.length > LIMITS.passwordMax) {
    return `Password must not exceed ${LIMITS.passwordMax} characters.`;
  }
  return '';
}

export function validateLoginInput(body = {}) {
  const email = cleanEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email) return { message: 'Email is required.' };
  if (email.length > LIMITS.email) return { message: `Email must not exceed ${LIMITS.email} characters.` };
  if (!isValidEmail(email)) return { message: 'Please enter a valid email address.' };
  if (!password) return { message: 'Password is required.' };
  if (password.length > LIMITS.passwordMax) return { message: `Password must not exceed ${LIMITS.passwordMax} characters.` };

  return { value: { email, password } };
}

export function validateUserInput(body = {}, options = {}) {
  const name = cleanString(body.name);
  const email = cleanEmail(body.email);
  const employeeId = cleanString(body.employeeId);
  const department = cleanString(body.department);
  const role = cleanString(body.role || 'EMPLOYEE').toUpperCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const roleSet = options.publicOnly ? allowedPublicRoles : allowedRoles;

  if (!name) return { message: 'Name is required.' };
  if (name.length > LIMITS.name) return { message: `Name must not exceed ${LIMITS.name} characters.` };
  if (!email) return { message: 'Email is required.' };
  if (email.length > LIMITS.email) return { message: `Email must not exceed ${LIMITS.email} characters.` };
  if (!isValidEmail(email)) return { message: 'Please enter a valid email address.' };
  if (!employeeId) return { message: 'Employee ID is required.' };
  if (employeeId.length > LIMITS.employeeId) return { message: `Employee ID must not exceed ${LIMITS.employeeId} characters.` };
  if (!department) return { message: 'Department is required.' };
  if (department.length > LIMITS.department) return { message: `Department must not exceed ${LIMITS.department} characters.` };
  if (!roleSet.has(role)) {
    return { message: options.publicOnly ? 'Public registration is only available for employee accounts.' : 'Role must be ADMIN, EMPLOYEE, or MANAGER.' };
  }

  const passwordError = validatePassword(password);
  if (passwordError) return { message: passwordError };

  return { value: { name, email, employeeId, department, role, password } };
}

export function validateTopicInput(body = {}) {
  const title = cleanString(body.title);
  const category = cleanString(body.category);
  const description = cleanString(body.description);
  const thumbnailUrl = cleanString(body.thumbnailUrl);
  const startDate = cleanString(body.startDate);
  const deadline = cleanString(body.deadline);

  if (!title) return { message: 'Safety campaign title is required.' };
  if (title.length > LIMITS.topicTitle) return { message: `Safety campaign title must not exceed ${LIMITS.topicTitle} characters.` };
  if (!category) return { message: 'Safety category is required.' };
  if (category.length > LIMITS.category) return { message: `Safety category must not exceed ${LIMITS.category} characters.` };
  if (description.length > LIMITS.topicDescription) return { message: `Safety campaign description must not exceed ${LIMITS.topicDescription} characters.` };
  if (thumbnailUrl && !isValidUrlOrLocalPath(thumbnailUrl)) return { message: 'Thumbnail URL must be a valid URL or local path.' };
  if (startDate && !isDateString(startDate)) return { message: 'Start date must be a valid date.' };
  if (!deadline) return { message: 'Campaign deadline is required.' };
  if (!isDateString(deadline)) return { message: 'Campaign deadline must be a valid date.' };
  if (isPastDate(deadline)) return { message: 'Campaign deadline cannot be in the past.' };

  return {
    value: {
      title,
      category,
      description,
      thumbnailUrl,
      startDate: startDate || new Date().toISOString().slice(0, 10),
      deadline
    }
  };
}
