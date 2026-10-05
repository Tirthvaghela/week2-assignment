/* Mobile navigation: opens and closes the primary menu on small screens. */
(() => {
  'use strict';

  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-nav');
  if (!toggle || !nav) return;

  const label = toggle.querySelector('.nav-toggle__label');

  // Must match the breakpoint where the full nav appears in style.css.
  const desktopQuery = window.matchMedia('(min-width: 48em)');

  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    label.textContent = open ? 'Close' : 'Menu';
  };

  toggle.addEventListener('click', () => setOpen(!isOpen()));

  // Close after choosing a link, so the menu is not left open on the next view.
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (isOpen() && !event.target.closest('.site-header')) setOpen(false);
  });

  // Reset when the viewport grows past the mobile layout.
  desktopQuery.addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
})();
