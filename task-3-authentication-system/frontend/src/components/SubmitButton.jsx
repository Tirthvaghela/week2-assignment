import Spinner from './Spinner.jsx';

// The main form button. It shows one of three states:
//   ready    label and arrow
//   loading  busy label and spinner, not clickable
//   done     green confirmation and tick, not clickable
export default function SubmitButton({ label, loadingLabel, doneLabel, loading = false, done = false }) {
  let text = label;
  let icon = <span aria-hidden="true">→</span>;
  let state = 'ready';

  if (done) {
    text = doneLabel;
    icon = <span aria-hidden="true">✓</span>;
    state = 'done';
  } else if (loading) {
    text = loadingLabel;
    icon = <Spinner />;
    state = 'loading';
  }

  return (
    <button
      type="submit"
      className={`button button--solid button--${state}`}
      disabled={loading || done}
      aria-busy={loading ? 'true' : 'false'}
    >
      <span>{text}</span>
      {icon}
    </button>
  );
}
