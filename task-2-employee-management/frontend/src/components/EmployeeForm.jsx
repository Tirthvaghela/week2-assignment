import { useRef, useState } from 'react';
import { formatCompact, formatSalary, hueStyle } from '../utils/format.js';
import { EARLIEST_JOIN_DATE, FIELDS, latestJoinDate, toPayload, validateEmployee } from '../utils/validation.js';
import Modal from './Modal.jsx';

const EMPTY_VALUES = { name: '', department: '', role: '', salary: '', joinDate: '' };

const valuesFrom = (employee, defaultDepartment) =>
  employee
    ? {
        name: employee.name,
        department: employee.department,
        role: employee.role,
        salary: String(employee.salary),
        joinDate: employee.joinDate,
      }
    : { ...EMPTY_VALUES, department: defaultDepartment };

// Add and edit drawer. Pass `employee` to edit an existing record, or leave
// it out to add a new one. `onSubmit` receives the API payload and returns a
// promise; if it rejects, the error is shown here and the drawer stays open.
export default function EmployeeForm({ employee = null, departments, defaultDepartment = '', onSubmit, onClose }) {
  const isEditing = Boolean(employee);
  const [values, setValues] = useState(() => valuesFrom(employee, defaultDepartment));
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [serverMessage, setServerMessage] = useState('');
  const formRef = useRef(null);

  // A field's message is shown once it has been visited or the form has been
  // submitted. Messages returned by the API are shown until that field changes.
  const found = validateEmployee(values);
  const errors = {};
  FIELDS.forEach((field) => {
    if (found[field] && (submitted || touched[field])) errors[field] = found[field];
    else if (serverErrors[field]) errors[field] = serverErrors[field];
  });
  const errorCount = Object.keys(errors).length;

  const setField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setServerErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const touch = (field) => setTouched((current) => ({ ...current, [field]: true }));

  const focusField = (field) => {
    const target =
      field === 'department'
        ? formRef.current?.querySelector('.dept-pick [role="radio"]')
        : formRef.current?.querySelector(`#employee-${field}`);
    target?.focus();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    setSubmitted(true);
    setServerMessage('');
    setServerErrors({});
    const firstInvalid = FIELDS.find((field) => found[field]);
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }

    setSaving(true);
    try {
      await onSubmit(toPayload(values));
    } catch (error) {
      // The parent closes the drawer on success, so this state is only
      // reached while it is still open.
      const fieldErrors = error.fieldErrors || {};
      setServerErrors(fieldErrors);
      setServerMessage(error.message || 'Something went wrong. Please try again.');
      setSaving(false);
      const firstRejected = FIELDS.find((field) => fieldErrors[field]);
      if (firstRejected) focusField(firstRejected);
    }
  };

  const inputProps = (field) => ({
    id: `employee-${field}`,
    name: field,
    value: values[field],
    onChange: (event) => setField(field, event.target.value),
    onBlur: (event) => {
      // Ignore the blur that happens when the dialog itself is closing.
      if (event.currentTarget.closest('dialog')?.open) touch(field);
    },
    'aria-invalid': errors[field] ? 'true' : 'false',
    'aria-describedby': errors[field] ? `employee-${field}-error` : undefined,
  });

  const renderError = (field) =>
    errors[field] ? (
      <span className="field__error" id={`employee-${field}-error`}>
        {errors[field]}
      </span>
    ) : null;

  const alertText =
    serverMessage || (submitted && errorCount ? `Fix ${errorCount} ${errorCount === 1 ? 'field' : 'fields'} to continue.` : '');

  const salary = Number(values.salary);
  const salaryPreview =
    salary > 0 && !errors.salary
      ? `${formatCompact(salary)} per year · ${formatSalary(Math.round(salary / 12))} per month`
      : '';

  // Keep a department that is not in the standard list selectable when editing.
  const options = values.department && !departments.includes(values.department) ? [...departments, values.department] : departments;

  return (
    <Modal className="drawer" labelledBy="form-title" onClose={onClose} busy={saving}>
      <form ref={formRef} className="drawer__form" onSubmit={handleSubmit} noValidate>
        <div className="drawer__header">
          <div className="drawer__heading">
            <p className="drawer__eyebrow">{isEditing ? 'Editing record' : 'Add to directory'}</p>
            <h2 className="drawer__title" id="form-title">
              {isEditing ? values.name || 'Edit employee' : 'New employee'}
            </h2>
          </div>
          <button type="button" className="round-button" onClick={onClose} disabled={saving} aria-label="Close">
            ×
          </button>
        </div>

        {alertText && (
          <div className="form-alert" role="alert">
            {alertText}
          </div>
        )}

        <div className="drawer__body">
          <label className={`field${errors.name ? ' field--invalid' : ''}`}>
            Full name
            <input
              type="text"
              className="field__input"
              placeholder="e.g. Tirth Vaghela"
              autoComplete="off"
              maxLength={80}
              disabled={saving}
              data-autofocus
              {...inputProps('name')}
            />
            {renderError('name')}
          </label>

          <div className={`field${errors.department ? ' field--invalid' : ''}`}>
            <span id="employee-department-label">Department</span>
            <div
              className="dept-pick"
              role="radiogroup"
              aria-labelledby="employee-department-label"
              aria-describedby={errors.department ? 'employee-department-error' : undefined}
            >
              {options.map((department) => (
                <button
                  key={department}
                  type="button"
                  role="radio"
                  aria-checked={values.department === department ? 'true' : 'false'}
                  className="dept-pick__option"
                  style={hueStyle(department)}
                  disabled={saving}
                  onClick={() => {
                    setField('department', department);
                    touch('department');
                  }}
                >
                  <span className="dot" />
                  {department}
                </button>
              ))}
            </div>
            {renderError('department')}
          </div>

          <label className={`field${errors.role ? ' field--invalid' : ''}`}>
            Role
            <input
              type="text"
              className="field__input"
              placeholder="e.g. Software Developer"
              autoComplete="off"
              maxLength={80}
              disabled={saving}
              {...inputProps('role')}
            />
            {renderError('role')}
          </label>

          <div className="field-row">
            <label className={`field${errors.salary ? ' field--invalid' : ''}`}>
              Annual salary
              <span className="field__input field__input--prefixed">
                <span className="field__prefix">₹</span>
                <input type="number" inputMode="numeric" placeholder="60000" disabled={saving} {...inputProps('salary')} />
              </span>
              {salaryPreview && <span className="field__hint">{salaryPreview}</span>}
              {renderError('salary')}
            </label>

            <label className={`field${errors.joinDate ? ' field--invalid' : ''}`}>
              Join date
              <input
                type="date"
                className="field__input"
                min={EARLIEST_JOIN_DATE}
                max={latestJoinDate()}
                disabled={saving}
                {...inputProps('joinDate')}
              />
              {renderError('joinDate')}
            </label>
          </div>
        </div>

        <div className="drawer__footer">
          <button type="button" className="pill-button pill-button--outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="pill-button pill-button--dark" disabled={saving}>
            {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add employee'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
