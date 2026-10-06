// Form validation. These rules mirror backend/auth/validation.py, which is
// the authority: the API re-checks everything that is sent to it.

export const PASSWORD_HINT = 'Use 8 or more characters with letters, numbers and a symbol.';
export const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const MIN_PASSWORD_SCORE = 3;

export const MESSAGES = {
  emailEmpty: 'Enter your email address.',
  emailInvalid: 'Enter a valid email address, like name@example.com.',
  usernameEmpty: 'Choose a username.',
  usernameInvalid: 'Use 3–20 characters: letters, numbers, dots or underscores.',
  passwordEmpty: 'Create a password.',
  passwordWeak: `This password is too weak. ${PASSWORD_HINT}`,
  confirmEmpty: 'Confirm your password.',
  confirmMismatch: "Passwords don't match.",
  identifierEmpty: 'Enter your email or username.',
  loginPasswordEmpty: 'Enter your password.',
};

// Strength from 0 to 4. One point each for: 8+ characters, both upper and
// lower case, a digit, a symbol. Shorter than 8 characters is always 1.
export function passwordScore(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return password.length < 8 ? 1 : Math.max(score, 1);
}

// Each validator returns { field: message } containing only invalid fields.

export function validateRegistration({ email, username, password, confirm }) {
  const errors = {};

  if (!email.trim()) errors.email = MESSAGES.emailEmpty;
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) errors.email = MESSAGES.emailInvalid;

  if (!username.trim()) errors.username = MESSAGES.usernameEmpty;
  else if (!/^[A-Za-z0-9._]{3,20}$/.test(username.trim())) errors.username = MESSAGES.usernameInvalid;

  if (!password) errors.password = MESSAGES.passwordEmpty;
  else if (passwordScore(password) < MIN_PASSWORD_SCORE) errors.password = MESSAGES.passwordWeak;

  if (!confirm) errors.confirm = MESSAGES.confirmEmpty;
  else if (confirm !== password) errors.confirm = MESSAGES.confirmMismatch;

  return errors;
}

export function validateLogin({ identifier, password }) {
  const errors = {};
  if (!identifier.trim()) errors.identifier = MESSAGES.identifierEmpty;
  if (!password) errors.password = MESSAGES.loginPasswordEmpty;
  return errors;
}
