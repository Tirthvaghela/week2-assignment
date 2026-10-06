import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Banner from '../components/Banner.jsx';
import Brand, { BRAND } from '../components/Brand.jsx';
import Spinner from '../components/Spinner.jsx';
import { BANNERS } from '../content/banners.js';
import { logoutUser } from '../services/authApi.js';
import { firstName, formatCountdown, formatCreated, formatDayTime, formatUserId, isToday } from '../utils/format.js';

const WARNING_SECONDS = 5 * 60;

// The protected page. It is only rendered by ProtectedRoute, after the
// server has confirmed the login and returned `account`.
export default function DashboardPage({ account }) {
  const { user, session } = account;
  const navigate = useNavigate();

  const totalSeconds = session.length_minutes * 60;
  const [remaining, setRemaining] = useState(session.expires_in);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutFailed, setLogoutFailed] = useState(false);

  useEffect(() => {
    document.title = `Dashboard · ${BRAND}`;
  }, []);

  // Count down to the end of the session. The end time is fixed once and
  // compared with the clock on every tick, so the display stays accurate
  // even if the browser slows timers in a background tab.
  useEffect(() => {
    const endsAt = Date.now() + session.expires_in * 1000;
    const tick = () => {
      const secondsLeft = Math.ceil((endsAt - Date.now()) / 1000);
      if (secondsLeft <= 0) {
        // The server stops accepting the token at the same moment.
        navigate('/login', { replace: true, state: { banner: 'expired' } });
      } else {
        setRemaining(secondsLeft);
      }
    };
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session.expires_in, navigate]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutFailed(false);
    try {
      await logoutUser();
      navigate('/login', { replace: true, state: { banner: 'loggedOut' } });
    } catch {
      setLoggingOut(false);
      setLogoutFailed(true);
    }
  };

  const expiring = remaining <= WARNING_SECONDS;
  const used = Math.max(0, totalSeconds - remaining);
  const usedPercent = Math.min(100, (used / totalSeconds) * 100);
  const countdown = formatCountdown(remaining);
  const quarter = session.length_minutes / 4;

  let sessionState = 'active';
  let sessionLabel = 'Active';
  if (loggingOut) {
    sessionState = 'ending';
    sessionLabel = 'Ending';
  } else if (expiring) {
    sessionState = 'warning';
    sessionLabel = 'Ending soon';
  }

  const greeting = `${isToday(user.created_at) ? 'Welcome' : 'Welcome back'}, ${firstName(user.username)}.`;

  const details = [
    { label: 'Username', value: user.username },
    { label: 'Email', value: user.email },
    { label: 'User ID', value: formatUserId(user.id), mono: true },
    { label: 'Account created', value: formatCreated(user.created_at) },
    { label: 'Logged in', value: formatDayTime(session.issued_at) },
    { label: 'Session expires', value: formatDayTime(session.expires_at) },
    { label: 'Session length', value: `${session.length_minutes} minutes` },
    { label: 'Stored in', value: 'Secure cookie*' },
  ];

  return (
    <div className="page">
      <header className="dashbar">
        <Brand />
        <div className="dashbar__status">
          <span className="dashbar__ok">
            <span className="tag__dot" aria-hidden="true" />
            Authenticated
          </span>
          <span className="dashbar__area">Protected area</span>
        </div>
        <div className="dashbar__user">
          <span className="dashbar__name">{user.username}</span>
          <button
            type="button"
            className="button button--inverse"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-busy={loggingOut ? 'true' : 'false'}
          >
            <span>{loggingOut ? 'Logging out…' : 'Log out'}</span>
            {loggingOut && <Spinner />}
          </button>
        </div>
      </header>

      <main className={`dash${loggingOut ? ' dash--leaving' : ''}`} aria-busy={loggingOut ? 'true' : 'false'}>
        <div className="dash__hero">
          <span className="kicker">Protected dashboard</span>
          <h1 className="dash__title">{greeting}</h1>
          <p className="dash__intro">
            You're logged in as <strong>{user.username}</strong>. This page is only available while your session is active.
          </p>
        </div>

        <section className={`session session--${sessionState}`} aria-labelledby="session-heading">
          <div className="session__head">
            <h2 className="kicker" id="session-heading">
              Session ends in
            </h2>
            <span className="tag session__state">
              <span className="tag__dot" aria-hidden="true" />
              {sessionLabel}
            </span>
          </div>
          <span className="session__count">{countdown}</span>
          <div className="session__meter">
            <div
              className="session__track"
              role="progressbar"
              aria-label="Session time used"
              aria-valuemin={0}
              aria-valuemax={session.length_minutes}
              aria-valuenow={Math.floor(used / 60)}
            >
              <div className="session__fill" style={{ width: `${usedPercent.toFixed(2)}%` }} />
            </div>
            <div className="session__scale">
              <span>0</span>
              <span>{quarter}</span>
              <span>{quarter * 2}</span>
              <span>{quarter * 3}</span>
              <span>{session.length_minutes} min</span>
            </div>
          </div>
        </section>

        {logoutFailed && <Banner banner={BANNERS.logoutFailed} wide />}

        {expiring && (
          <Banner
            wide
            banner={{
              kind: 'warn',
              tag: 'Session ending',
              title: `Your session ends in ${countdown}.`,
              body: "When it ends you'll be returned to the login page and asked to log in again.",
            }}
          />
        )}

        <section className="details" aria-label="Account and session details">
          {details.map((item) => (
            <div key={item.label} className="detail">
              <span className="detail__label">{item.label}</span>
              <span className={`detail__value${item.mono ? ' detail__value--mono' : ''}`}>{item.value}</span>
            </div>
          ))}
        </section>

        <div className="dash__footer">
          <p className="dash__note">
            * Your session is kept in a secure cookie that only your browser and our server can use. Logging out ends it
            immediately.
          </p>
          <button type="button" className="button button--outline dash__logout" onClick={handleLogout} disabled={loggingOut}>
            <span>Log out of this device</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </main>
    </div>
  );
}
