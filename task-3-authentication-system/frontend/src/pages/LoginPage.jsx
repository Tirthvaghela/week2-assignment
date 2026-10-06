import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Banner from '../components/Banner.jsx';
import Field from '../components/Field.jsx';
import PublicLayout from '../components/PublicLayout.jsx';
import SubmitButton from '../components/SubmitButton.jsx';
import { BANNERS } from '../content/banners.js';
import { loginUser } from '../services/authApi.js';
import { validateLogin } from '../utils/validation.js';

const DASHBOARD_DELAY_MS = 900;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Other pages send the user here with a message to show (for example
  // "You've logged out") and, after registering, the new username.
  const arrival = useRef(location.state || {}).current;

  const [values, setValues] = useState({ identifier: arrival.identifier || '', password: '' });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(BANNERS[arrival.banner] || null);
  const [credentialsRejected, setCredentialsRejected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [focusRequest, setFocusRequest] = useState(null);
  const identifierInput = useRef(null);
  const passwordInput = useRef(null);

  // Move the cursor after the form has re-rendered. Doing it straight away
  // would fail when a request has just ended, because the inputs are still
  // disabled at that moment.
  useEffect(() => {
    if (focusRequest) (focusRequest.field === 'identifier' ? identifierInput : passwordInput).current?.focus();
  }, [focusRequest]);

  useEffect(() => {
    // Forget the arrival message so it is not shown again after a refresh.
    if (location.state) navigate(location.pathname, { replace: true, state: null });
    // Start in the first field that still needs filling in.
    (arrival.identifier ? passwordInput : identifierInput).current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loggedIn) return undefined;
    const timer = setTimeout(() => navigate('/dashboard'), DASHBOARD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [loggedIn, navigate]);

  const setValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setCredentialsRejected(false);
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const showErrors = (found) => {
    setErrors(found);
    setFocusRequest({ field: found.identifier ? 'identifier' : 'password' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || loggedIn) return;

    setBanner(null);
    setCredentialsRejected(false);
    const found = validateLogin(values);
    if (Object.keys(found).length > 0) {
      showErrors(found);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      await loginUser({ identifier: values.identifier.trim(), password: values.password });
      setLoading(false);
      setLoggedIn(true);
      setBanner(BANNERS.loginSuccess);
    } catch (error) {
      setLoading(false);
      if (error.status === 401) {
        // Wrong password or unknown account: the same message for both.
        setBanner(BANNERS.credentials);
        setCredentialsRejected(true);
        setValues((current) => ({ ...current, password: '' }));
        setFocusRequest({ field: 'password' });
      } else if (Object.keys(error.fieldErrors || {}).length > 0) {
        showErrors(error.fieldErrors);
      } else {
        setBanner(BANNERS.loginServer);
      }
    }
  };

  return (
    <PublicLayout
      pageTitle="Log in"
      title={loggedIn ? 'Welcome back.' : 'Log in.'}
      lede="Use your email or username and password to open your dashboard."
      formKicker="Credentials"
    >
      {banner && <Banner banner={banner} />}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <Field
          id="identifier"
          label="Email or username"
          value={values.identifier}
          onChange={(value) => setValue('identifier', value)}
          error={errors.identifier}
          invalid={credentialsRejected}
          autoComplete="username"
          placeholder="name@example.com or username"
          disabled={loading}
          inputRef={identifierInput}
        />
        <Field
          id="password"
          label="Password"
          value={values.password}
          onChange={(value) => setValue('password', value)}
          error={errors.password}
          invalid={credentialsRejected}
          password
          autoComplete="current-password"
          disabled={loading}
          inputRef={passwordInput}
        />
        <SubmitButton label="Log in" loadingLabel="Logging in…" doneLabel="Logged in" loading={loading} done={loggedIn} />
      </form>

      <div className="switch">
        <span className="switch__prompt">Don't have an account?</span>
        <Link className="switch__link" to="/register">
          Create one →
        </Link>
      </div>
    </PublicLayout>
  );
}
