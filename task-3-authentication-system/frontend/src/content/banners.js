// Messages shown in the banner above the forms. `kind` sets the colour:
// error (red), success (green), warn (amber) or info (black).
export const BANNERS = {
  credentials: {
    kind: 'error',
    tag: 'Error',
    title: 'Incorrect email, username or password',
    body: 'Check your details and try again.',
  },
  registerServer: {
    kind: 'error',
    tag: 'Server error',
    title: "We couldn't create your account",
    body: "Something went wrong on our side and your details weren't saved. Try again in a moment.",
  },
  loginServer: {
    kind: 'error',
    tag: 'Server error',
    title: "We couldn't log you in right now",
    body: 'This is a problem on our side, not with your details. Try again in a moment.',
  },
  sessionCheckFailed: {
    kind: 'error',
    tag: 'Server error',
    title: "We couldn't check your session",
    body: 'This is a problem on our side. Try again in a moment.',
  },
  logoutFailed: {
    kind: 'error',
    tag: 'Server error',
    title: "We couldn't log you out",
    body: 'You are still logged in. Check your connection and try again.',
  },
  loginSuccess: {
    kind: 'success',
    tag: 'Success',
    title: 'Logged in',
    body: 'Taking you to your dashboard…',
  },
  registered: {
    kind: 'success',
    tag: 'Success',
    title: 'Account created',
    body: 'Log in with your new username or email.',
  },
  loggedOut: {
    kind: 'info',
    tag: 'Logged out',
    title: "You've logged out",
    body: 'Your session has ended on this device.',
  },
  expired: {
    kind: 'warn',
    tag: 'Session expired',
    title: 'Your session expired',
    body: 'For your security, sessions end after 60 minutes. Log in again to continue.',
  },
  required: {
    kind: 'info',
    tag: 'Protected page',
    title: 'Log in to continue',
    body: 'The dashboard is only available to logged-in users.',
  },
};
