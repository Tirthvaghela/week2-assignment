import { useState } from 'react';
import { getInitials, hueStyle } from '../utils/format.js';
import Modal from './Modal.jsx';

// Confirmation step before deleting. `onConfirm` returns a promise; if it
// rejects, the error is shown here and the dialog stays open.
export default function DeleteModal({ employee, onConfirm, onCancel }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (deleting) return;
    setDeleting(true);
    setError('');
    try {
      await onConfirm(employee);
    } catch (failure) {
      setError(failure.message || 'Something went wrong. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <Modal className="confirm" role="alertdialog" labelledBy="delete-title" onClose={onCancel} busy={deleting}>
      <div className="confirm__panel">
        <div className="confirm__person">
          <div className="avatar avatar--large" style={hueStyle(employee.department)} aria-hidden="true">
            {getInitials(employee.name)}
          </div>
          <div className="confirm__identity">
            <span className="confirm__name">{employee.name}</span>
            <span className="confirm__meta">
              {employee.role} · {employee.department}
            </span>
          </div>
        </div>

        <div className="confirm__copy">
          <h2 className="confirm__title" id="delete-title">
            Delete this employee?
          </h2>
          <p className="confirm__text">
            Are you sure you want to delete {employee.name}? Their record will be removed permanently.
          </p>
        </div>

        {error && (
          <div className="form-alert form-alert--flush" role="alert">
            {error}
          </div>
        )}

        <div className="confirm__actions">
          {/* "Keep" receives focus when the dialog opens, so pressing Enter
              cannot delete by accident. */}
          <button type="button" className="pill-button pill-button--outline" onClick={onCancel} disabled={deleting} data-autofocus>
            Keep
          </button>
          <button type="button" className="pill-button pill-button--danger" onClick={handleConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
