/* Contact form: client-side validation and feedback. Loaded on contact.html only. */
(() => {
  'use strict';

  const form = document.getElementById('contact-form');
  if (!form) return;

  const summary = document.getElementById('form-summary');
  const status = document.getElementById('form-status');
  const statusTitle = document.getElementById('form-status-title');
  const counter = document.getElementById('message-count');

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_PATTERN = /^[\d\s+\-.()]+$/;
  const MESSAGE_MIN = 20;

  // Each rule receives the trimmed value (or checked state) and returns an
  // error message, or an empty string when the value is acceptable.
  const rules = {
    name(value) {
      if (!value) return 'Enter your full name.';
      if (value.length < 2) return 'Name must be at least 2 characters.';
      if (!/\p{L}/u.test(value)) return 'Name must contain at least one letter.';
      return '';
    },
    email(value) {
      if (!value) return 'Enter your work email.';
      if (!EMAIL_PATTERN.test(value)) return 'Enter an email address like name@company.com.';
      return '';
    },
    phone(value) {
      if (!value) return '';
      const digits = value.replace(/\D/g, '').length;
      if (!PHONE_PATTERN.test(value) || digits < 7 || digits > 15) {
        return 'Enter a phone number with 7 to 15 digits, or leave this blank.';
      }
      return '';
    },
    topic(value) {
      return value ? '' : 'Choose what your enquiry is about.';
    },
    message(value) {
      if (!value) return 'Enter a message.';
      if (value.length < MESSAGE_MIN) {
        return `Message must be at least ${MESSAGE_MIN} characters (${value.length} so far).`;
      }
      return '';
    },
    consent(checked) {
      return checked ? '' : 'Tick the box so we can reply to you.';
    },
  };

  const names = Object.keys(rules);

  // A name maps to one control, or to several for the radio group.
  const controlsFor = (name) => {
    const entry = form.elements[name];
    return entry instanceof RadioNodeList ? [...entry] : [entry];
  };

  const wrapperFor = (name) => controlsFor(name)[0].closest('.field');

  const getValue = (name) => {
    const entry = form.elements[name];
    if (entry instanceof RadioNodeList) return entry.value;
    return entry.type === 'checkbox' ? entry.checked : entry.value.trim();
  };

  const setError = (name, message) => {
    document.getElementById(`${name}-error`).textContent = message;
    wrapperFor(name).classList.toggle('field--invalid', Boolean(message));
    controlsFor(name).forEach((control) => {
      if (message) {
        control.setAttribute('aria-invalid', 'true');
      } else {
        control.removeAttribute('aria-invalid');
      }
    });
  };

  const validate = (name) => {
    const message = rules[name](getValue(name));
    setError(name, message);
    return !message;
  };

  const isFlagged = (name) => wrapperFor(name).classList.contains('field--invalid');

  const updateCounter = () => {
    counter.textContent = `${form.elements.message.value.length} / ${form.elements.message.maxLength}`;
  };

  // The browser's own bubbles are replaced by the inline messages below.
  form.noValidate = true;

  names.forEach((name) => {
    const wrapper = wrapperFor(name);

    // Validate when focus leaves the field. Checking relatedTarget stops the
    // radio group from flagging itself while moving between its own options.
    wrapper.addEventListener('focusout', (event) => {
      if (!wrapper.contains(event.relatedTarget)) validate(name);
    });

    // Once a field is flagged, clear the error as soon as it is corrected.
    const recheck = () => {
      if (isFlagged(name)) validate(name);
    };
    wrapper.addEventListener('input', recheck);
    wrapper.addEventListener('change', recheck);
  });

  form.elements.message.addEventListener('input', updateCounter);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    status.hidden = true;

    const invalid = names.filter((name) => !validate(name));

    if (invalid.length > 0) {
      const count = invalid.length;
      summary.textContent =
        count === 1
          ? '1 field needs your attention before you can send.'
          : `${count} fields need your attention before you can send.`;
      summary.hidden = false;
      controlsFor(invalid[0])[0].focus();
      return;
    }

    const firstName = getValue('name').split(/\s+/)[0];
    summary.hidden = true;
    statusTitle.textContent = `Thanks, ${firstName}.`;
    status.hidden = false;

    form.reset();
    updateCounter();
    status.focus();
  });

  updateCounter();
})();
