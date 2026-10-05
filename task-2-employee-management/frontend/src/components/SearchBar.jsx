import { COLUMNS } from '../constants.js';

// Search box and sort controls shown above the employee list.
export default function SearchBar({ search, onSearchChange, sort, order, onSortChange, onOrderToggle }) {
  const orderLabel = order === 'asc' ? 'Ascending, switch to descending' : 'Descending, switch to ascending';

  return (
    <div className="toolbar">
      <label className="search">
        <span className="search__icon" aria-hidden="true" />
        <input
          className="search__input"
          aria-label="Search employees"
          placeholder="Search name, department or role"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          autoComplete="off"
        />
        {search && (
          <button type="button" className="search__clear" onClick={() => onSearchChange('')} aria-label="Clear search">
            ×
          </button>
        )}
      </label>

      <div className="sort">
        <span>Sort</span>
        <select className="sort__select" aria-label="Sort by" value={sort} onChange={(event) => onSortChange(event.target.value)}>
          {COLUMNS.map((column) => (
            <option key={column.key} value={column.key}>
              {column.label}
            </option>
          ))}
        </select>
        <button type="button" className="sort__order" onClick={onOrderToggle} aria-label={orderLabel} title={orderLabel}>
          {order === 'asc' ? '↑' : '↓'}
        </button>
      </div>
    </div>
  );
}
