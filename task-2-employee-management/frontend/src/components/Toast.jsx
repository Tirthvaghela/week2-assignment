import { useEffect } from 'react';

const DISMISS_AFTER_MS = 3800;

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), DISMISS_AFTER_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className="toast" role="status">
      <span className="toast__dot" />
      <span className="toast__message">{toast.message}</span>
      <button type="button" className="toast__close" onClick={() => onDismiss(toast.id)} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

// Notification stack at the bottom of the screen. It is a live region, so
// screen readers announce each message as it appears.
export default function ToastList({ toasts, onDismiss }) {
  return (
    <div className="toast-list" aria-live="polite">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
