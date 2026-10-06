import { useState } from 'react';
import { PASSWORD_HINT, STRENGTH_LABELS, passwordScore } from '../utils/validation.js';

// One labelled form field with its error message.
//   password       adds a Show/Hide button
//   showStrength   adds the strength meter and the password hint
//   invalid        marks the field red without a message of its own (used
//                  when the login as a whole was refused)
export default function Field({
  id,
  label,
  value,
  onChange,
  error = '',
  invalid = false,
  type = 'text',
  password = false,
  showStrength = false,
  placeholder = '',
  autoComplete,
  disabled = false,
  inputRef,
}) {
  const [revealed, setRevealed] = useState(false);

  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const isInvalid = Boolean(error) || invalid;
  const score = showStrength ? passwordScore(value) : 0;

  let describedBy;
  if (error) describedBy = errorId;
  else if (showStrength) describedBy = hintId;

  return (
    <div className={`field${isInvalid ? ' field--invalid' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>

      <div className="field__control">
        <input
          ref={inputRef}
          id={id}
          name={id}
          className={`field__input${password ? ' field__input--password' : ''}`}
          type={password ? (revealed ? 'text' : 'password') : type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          disabled={disabled}
          aria-invalid={isInvalid ? 'true' : 'false'}
          aria-describedby={describedBy}
        />
        {password && (
          <button
            type="button"
            className="field__toggle"
            onClick={() => setRevealed((current) => !current)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed ? 'true' : 'false'}
            aria-controls={id}
          >
            {revealed ? 'Hide' : 'Show'}
          </button>
        )}
      </div>

      {showStrength && (
        <div className={`meter meter--${score}`}>
          <div className="meter__bars" aria-hidden="true">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className={`meter__bar${step <= score ? ' meter__bar--on' : ''}`} />
            ))}
          </div>
          <span className="meter__label">{score ? STRENGTH_LABELS[score] : '—'}</span>
        </div>
      )}

      {error && (
        <div className="field__error" id={errorId}>
          <span className="field__error-mark" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {showStrength && !error && (
        <div className="field__hint" id={hintId}>
          {PASSWORD_HINT}
        </div>
      )}
    </div>
  );
}
