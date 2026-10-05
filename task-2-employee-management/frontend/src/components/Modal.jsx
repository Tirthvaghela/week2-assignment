import { useEffect, useRef } from 'react';

// Shared dialog shell built on the native <dialog> element, which provides
// the focus trap and Escape handling. Each dialog supplies its own content
// and look through `className`. While `busy` is true it cannot be dismissed.
// Give one element inside a `data-autofocus` attribute to receive focus.
export default function Modal({ className, labelledBy, role, onClose, busy = false, children }) {
  const dialogRef = useRef(null);
  const pressStartedOnBackdrop = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('[data-autofocus]')?.focus();

    return () => {
      dialog.close();
      // React has already removed the dialog from the page at this point, so
      // the browser cannot restore focus by itself.
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  const requestClose = () => {
    if (!busy) onClose();
  };

  const handleCancel = (event) => {
    // Fired by the Escape key. React controls whether the dialog is shown,
    // so the browser's own closing is prevented.
    event.preventDefault();
    requestClose();
  };

  // The <dialog> element itself is only the event target when the backdrop is
  // used. Requiring the press to start there too means dragging a text
  // selection out of the panel does not close the dialog.
  const handleMouseDown = (event) => {
    pressStartedOnBackdrop.current = event.target === dialogRef.current;
  };

  const handleClick = (event) => {
    if (event.target === dialogRef.current && pressStartedOnBackdrop.current) requestClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className={`modal ${className}`}
      role={role}
      aria-labelledby={labelledBy}
      onCancel={handleCancel}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {children}
    </dialog>
  );
}
