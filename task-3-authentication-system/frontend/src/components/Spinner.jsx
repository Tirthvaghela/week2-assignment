// Decorative: the text beside it says what is happening.
export default function Spinner({ large = false }) {
  return <span className={`spinner${large ? ' spinner--large' : ''}`} aria-hidden="true" />;
}
