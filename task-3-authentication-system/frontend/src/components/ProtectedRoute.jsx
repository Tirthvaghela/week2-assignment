import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../services/authApi.js';
import Brand, { BRAND } from './Brand.jsx';
import Spinner from './Spinner.jsx';

// Guards a page that needs a login.
//
// The browser cannot tell by itself whether the user is logged in, because
// it cannot read the HttpOnly cookie. So this asks the server: it requests
// the protected dashboard data, and the server checks the cookie.
//   200  the user is logged in; render the page with the returned data
//   401  not logged in or the session expired; go to the login page
//
// The real protection is on the server. Even if this component were removed,
// the API would still refuse to return the data without a valid cookie.
export default function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);

  useEffect(() => {
    document.title = `Checking your session · ${BRAND}`;
    const controller = new AbortController();

    getDashboard(controller.signal)
      .then(setAccount)
      .catch((error) => {
        if (error.name === 'AbortError') return;

        let banner = 'sessionCheckFailed';
        if (error.status === 401) banner = error.code === 'session_expired' ? 'expired' : 'required';
        navigate('/login', { replace: true, state: { banner } });
      });

    return () => controller.abort();
  }, [navigate]);

  if (account) return children(account);

  return (
    <div className="page checking" role="status" aria-live="polite">
      <Brand />
      <div className="checking__body">
        <span className="kicker">Protected route · /dashboard</span>
        <div className="checking__line">
          <span className="checking__title">Checking your session</span>
          <Spinner large />
        </div>
      </div>
    </div>
  );
}
