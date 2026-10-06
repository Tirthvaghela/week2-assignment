// All communication with the Flask API lives in this file.
//
// The login token is never handled here. The server sends it in an HttpOnly
// cookie, which the browser stores and attaches to later requests by itself;
// JavaScript cannot read it.

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

// Error with details that are safe to show to the user.
//   status       HTTP status, or 0 when the server could not be reached
//   code         the API's reason, e.g. "invalid_credentials", "session_expired"
//   fieldErrors  { field: message } for form fields
export class ApiError extends Error {
  constructor(message, { status = 0, code = '', fieldErrors = {} } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      signal,
      // Send and accept the login cookie.
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Could not reach the server.');
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Not JSON (for example the server is down behind the proxy).
  }

  if (!response.ok || !payload?.success) {
    throw new ApiError(payload?.message || 'The server returned an error.', {
      status: response.status,
      code: payload?.code,
      fieldErrors: payload?.errors,
    });
  }
  return payload;
}

export async function registerUser({ email, username, password, confirm }) {
  const payload = await request('/register', {
    method: 'POST',
    body: { email, username, password, confirm_password: confirm },
  });
  return payload.data.user;
}

export async function loginUser({ identifier, password }) {
  const payload = await request('/login', { method: 'POST', body: { identifier, password } });
  return payload.data.user;
}

export async function logoutUser() {
  await request('/logout', { method: 'POST' });
}

// Protected: succeeds only when the browser holds a valid login cookie.
// Returns { user, session }.
export async function getDashboard(signal) {
  const payload = await request('/dashboard', { signal });
  return payload.data;
}
