import { useEffect } from 'react';
import Brand, { BRAND } from './Brand.jsx';

// Shared frame for the Register and Log in pages: top bar with the brand,
// the large heading, the form column and the security notes.
export default function PublicLayout({ title, lede, formKicker, pageTitle, children }) {
  useEffect(() => {
    document.title = `${pageTitle} · ${BRAND}`;
  }, [pageTitle]);

  return (
    <div className="page">
      <header className="topbar">
        <Brand />
      </header>

      <div className="public-grid">
        <div className="display">
          <h1 className="display__title">{title}</h1>
          <p className="display__lede">{lede}</p>
        </div>

        <main className="form-column">
          <span className="kicker">{formKicker}</span>
          {children}
        </main>

        <aside className="facts" aria-label="Account security">
          <div className="fact">
            <span className="fact__number">01</span>
            <div className="fact__title">Passwords are hashed</div>
            <div className="fact__text">We store a one-way hash of your password, never the password itself.</div>
          </div>
          <div className="fact">
            <span className="fact__number">02</span>
            <div className="fact__title">Sessions stay in the browser</div>
            <div className="fact__text">Your sign-in is held in a secure cookie that scripts on the page can't read.</div>
          </div>
          <div className="fact">
            <span className="fact__number">03</span>
            <div className="fact__title">Sessions expire</div>
            <div className="fact__text">You're logged out after 60 minutes, or whenever you choose.</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
