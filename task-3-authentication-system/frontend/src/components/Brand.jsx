export const BRAND = 'Harbor';

export default function Brand() {
  return (
    <div className="brand">
      <span className="brand__mark" aria-hidden="true" />
      <span className="brand__name">{BRAND}</span>
    </div>
  );
}
