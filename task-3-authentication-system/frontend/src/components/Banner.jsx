// Message box with a coloured tag, a title and a line of detail.
// Errors and warnings interrupt screen readers; the others are announced politely.
export default function Banner({ banner, wide = false }) {
  const urgent = banner.kind === 'error' || banner.kind === 'warn';

  return (
    <div className={`banner banner--${banner.kind}${wide ? ' banner--wide' : ''}`} role={urgent ? 'alert' : 'status'}>
      <span className="tag">
        <span className="tag__dot" aria-hidden="true" />
        {banner.tag}
      </span>
      <div className="banner__title">{banner.title}</div>
      <div className="banner__body">{banner.body}</div>
    </div>
  );
}
