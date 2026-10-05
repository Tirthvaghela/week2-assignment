import { hueStyle } from '../utils/format.js';

// Department navigation. `items` is [{ key, label, count }], where the item
// with an empty key means "All". Rendered as the sidebar on wide screens and
// as a row of chips on small ones (DepartmentChips).
export default function Sidebar({ items, selected, onSelect }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand__mark">A</div>
        <div className="brand__name">Management</div>
      </div>

      <nav className="dept-nav" aria-label="Departments">
        <div className="dept-nav__heading">Departments</div>
        {items.map((item) => (
          <button
            key={item.key || 'all'}
            type="button"
            className="dept-nav__item"
            aria-pressed={selected === item.key ? 'true' : 'false'}
            onClick={() => onSelect(item.key)}
          >
            <span className={`dot${item.key ? '' : ' dot--all'}`} style={item.key ? hueStyle(item.key) : undefined} />
            <span className="dept-nav__label">{item.label}</span>
            <span className="dept-nav__count">{item.count}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__user">
        <div className="sidebar__user-badge">HR</div>
        <div className="sidebar__user-text">
          <span className="sidebar__user-name">HR Admin</span>
          <span className="sidebar__user-team">People team</span>
        </div>
      </div>
    </aside>
  );
}

export function DepartmentChips({ items, selected, onSelect }) {
  return (
    <div className="dept-chips" role="group" aria-label="Departments">
      {items.map((item) => (
        <button
          key={item.key || 'all'}
          type="button"
          className="dept-chip"
          aria-pressed={selected === item.key ? 'true' : 'false'}
          onClick={() => onSelect(item.key)}
        >
          {item.label}
          <span className="dept-chip__count">{item.count}</span>
        </button>
      ))}
    </div>
  );
}
