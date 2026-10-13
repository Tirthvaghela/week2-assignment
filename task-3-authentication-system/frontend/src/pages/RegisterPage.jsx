import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Banner from '../components/Banner.jsx';
import { BRAND } from '../components/Brand.jsx';
import Field from '../components/Field.jsx';
import PublicLayout from '../components/PublicLayout.jsx';
import SubmitButton from '../components/SubmitButton.jsx';
import { BANNERS } from '../content/banners.js';
import { registerUser } from '../services/authApi.js';
import { validateRegistration } from '../utils/validation.js';

const EMPTY = { email: '', username: '', password: '', confirm: '' };
const FIELD_ORDER = ['email', 'username', 'password', 'confirm'];
const REDIRECT_DELAY_MS = 2200;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [createdUsername, setCreatedUsername] = useState('');
  const [focusRequest, setFocusRequest] = useState(null);
  const inputs = useRef({});

  // Move the cursor after the form has re-rendered. Doing it straight away
  // would fail when a request has just ended, because the inputs are still
  // disabled at that moment.
  useEffect(() => {
    if (focusRequest) inputs.current[focusRequest.field]?.focus();
  }, [focusRequest]);

  const goToLogin = () => navigate('/login', { state: { banner: 'registered', identifier: createdUsername } });

  // After a successful registration, move on to the login page by itself.
  useEffect(() => {
    if (!createdUsername) return undefined;
    const timer = setTimeout(goToLogin, REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdUsername]);

  const setValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const showErrors = (found) => {
    setErrors(found);
    const first = FIELD_ORDER.find((field) => found[field]);
    if (first) setFocusRequest({ field: first });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setBanner(null);
    const found = validateRegistration(values);
    if (Object.keys(found).length > 0) {
      showErrors(found);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const user = await registerUser({ ...values, email: values.email.trim(), username: values.username.trim() });
      setCreatedUsername(user.username);
    } catch (error) {
      setLoading(false);
      // 400 (invalid data) and 409 (duplicate account) carry field messages.
      const { confirm_password: confirm, ...rest } = error.fieldErrors || {};
      const fieldErrors = confirm ? { ...rest, confirm } : rest;
      if (Object.keys(fieldErrors).length > 0) showErrors(fieldErrors);
      else setBanner(BANNERS.registerServer);
    }
  };

  const fieldProps = (field) => ({
    id: field,
    value: values[field],
    onChange: (value) => setValue(field, value),
    error: errors[field],
    disabled: loading,
    inputRef: (element) => {
      inputs.current[field] = element;
    },
  });

  return (
    <PublicLayout
      pageTitle="Register"
      title={createdUsername ? 'Account created.' : 'Create an account.'}
      lede={`Register with your email and a username to reach your protected ${BRAND} dashboard.`}
      formKicker="Your details"
    >
      {createdUsername ? (
        <div className="success" role="status">
          <div className="success__box">
            <span className="tag tag--success">
              <span className="tag__dot" aria-hidden="true" />
              Success
            </span>
            <div className="success__title">Your account is ready.</div>
            <div className="success__text">
              Welcome to {BRAND}, <strong>{createdUsername}</strong>. Taking you to log in…
            </div>
            <div className="success__track">
              <div className="success__fill" style={{ animationDuration: `${REDIRECT_DELAY_MS}ms` }} />
            </div>
          </div>
          <button type="button" className="button button--outline" onClick={goToLogin}>
            <span>Continue to log in</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : (
        <>
          {banner && <Banner banner={banner} />}

          <form className="form" onSubmit={handleSubmit} noValidate>
            <Field {...fieldProps('email')} label="Email" type="email" autoComplete="email" placeholder="name@example.com" />
            <Field {...fieldProps('username')} label="Username" autoComplete="username" placeholder="e.g. Tirth Vaghela" />
            <Field {...fieldProps('password')} label="Password" password showStrength autoComplete="new-password" />
            <Field {...fieldProps('confirm')} label="Confirm password" password autoComplete="new-password" />
            <SubmitButton label="Create account" loadingLabel="Creating account…" loading={loading} />
          </form>

          <div className="switch">
            <span className="switch__prompt">Already have an account?</span>
            <Link className="switch__link" to="/login">
              Log in →
            </Link>
          </div>
        </>
      )}
    </PublicLayout>
  );
}
