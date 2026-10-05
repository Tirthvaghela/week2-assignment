import { COLUMNS, DEPARTMENTS } from '../constants.js';
import {
  formatCompact,
  formatDate,
  formatMonth,
  formatSalary,
  formatTenure,
  getInitials,
  hueStyle,
  shortDepartment,
} from '../utils/format.js';

function LoadingState() {
  return (
    <div className="skeleton" role="status" aria-label="Loading employees">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="skeleton__row" style={{ animationDelay: `${index * 0.12}s` }}>
          <div className="skeleton__avatar" />
          <div className="skeleton__lines">
            <div className="skeleton__line skeleton__line--name" />
            <div className="skeleton__line skeleton__line--meta" />
          </div>
          <div className="skeleton__line skeleton__line--end" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  return (
    <div className="state" role="alert">
      {/* The HTTP status when the API answered; "Offline" when it could not be reached. */}
      <div className="state__code">{error.status || 'Offline'}</div>
      <div className="state__title">The server isn't responding</div>
      <p className="state__text">
        We couldn't load the employee list. Your data is safe; check that the API and database are running and try again.
      </p>
      <p className="state__detail">{error.message}</p>
      <button type="button" className="pill-button pill-button--dark pill-button--auto" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="state">
      <div className="state__dots" aria-hidden="true">
        {DEPARTMENTS.slice(0, 4).map((department) => (
          <div key={department} className="state__dot" style={hueStyle(department)} />
        ))}
      </div>
      <div className="state__title">Your directory is empty</div>
      <p className="state__text state__text--narrow">Add the first employee and they'll appear here.</p>
      <button type="button" className="pill-button pill-button--amber pill-button--auto" onClick={onAdd}>
        New employee
      </button>
    </div>
  );
}

function NoMatchState({ term, onClear }) {
  return (
    <div className="state state--compact">
      <div className="state__title state__title--small">Nobody matches “{term}”</div>
      <p className="state__text">Try another name, department or role.</p>
      <button type="button" className="pill-button pill-button--outline pill-button--auto pill-button--small" onClick={onClear}>
        Clear search and filters
      </button>
    </div>
  );
}

function Table({ rows, sort, order, onSort, onEdit, onDelete }) {
  return (
    <div className="table-scroll">
      <table className="employee-table">
        <thead>
          <tr>
            {COLUMNS.map((column) => {
              const active = sort === column.key;
              const ariaSort = active ? (order === 'asc' ? 'ascending' : 'descending') : 'none';
              return (
                <th key={column.key} scope="col" aria-sort={ariaSort} className={column.align === 'right' ? 'is-right' : undefined}>
                  <button
                    type="button"
                    className={`sort-header${active ? ' sort-header--active' : ''}`}
                    onClick={() => onSort(column.key)}
                  >
                    {column.label}
                    <span className="sort-header__arrow">{active ? (order === 'asc' ? '↑' : '↓') : ''}</span>
                  </button>
                </th>
              );
            })}
            <th scope="col" className="is-actions">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((employee) => (
            <tr key={employee.id}>
              <td>
                <div className="person">
                  <div className="avatar" style={hueStyle(employee.department)} aria-hidden="true">
                    {getInitials(employee.name)}
                  </div>
                  <div className="person__text">
                    <span className="person__name">{employee.name}</span>
                    <span className="person__meta">{formatTenure(employee.joinDate)}</span>
                  </div>
                </div>
              </td>
              <td>
                <span className="dept-label">
                  <span className="dot" style={hueStyle(employee.department)} />
                  {employee.department}
                </span>
              </td>
              <td className="is-soft">{employee.role}</td>
              <td className="is-right is-mono">{formatSalary(employee.salary)}</td>
              <td className="is-right is-soft is-nowrap">{formatDate(employee.joinDate)}</td>
              <td className="is-actions">
                <div className="row-actions">
                  <button type="button" className="row-button" onClick={() => onEdit(employee)} aria-label={`Edit ${employee.name}`}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="row-button row-button--danger"
                    onClick={() => onDelete(employee)}
                    aria-label={`Delete ${employee.name}`}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cards({ rows, onEdit, onDelete }) {
  return (
    <ul className="card-list">
      {rows.map((employee) => (
        <li key={employee.id} className="employee-card">
          <div className="person">
            <div className="avatar avatar--card" style={hueStyle(employee.department)} aria-hidden="true">
              {getInitials(employee.name)}
            </div>
            <div className="person__text">
              <span className="person__name">{employee.name}</span>
              <span className="person__meta">{employee.role}</span>
            </div>
          </div>

          <dl className="employee-card__facts">
            <div>
              <dt>Department</dt>
              <dd className="dept-label">
                <span className="dot dot--small" style={hueStyle(employee.department)} />
                {shortDepartment(employee.department)}
              </dd>
            </div>
            <div>
              <dt>Salary</dt>
              <dd className="is-mono">{formatCompact(employee.salary)}</dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>{formatMonth(employee.joinDate)}</dd>
            </div>
          </dl>

          <div className="employee-card__actions">
            <button type="button" className="card-button" onClick={() => onEdit(employee)} aria-label={`Edit ${employee.name}`}>
              Edit
            </button>
            <button
              type="button"
              className="card-button card-button--danger"
              onClick={() => onDelete(employee)}
              aria-label={`Delete ${employee.name}`}
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Pager({ page, pageCount, rangeText, onPageChange }) {
  return (
    <nav className="pager" aria-label="Pages">
      <div className="pager__range">{rangeText}</div>
      <div className="pager__buttons">
        <button type="button" className="pager__arrow" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          ←
        </button>
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
          <button
            key={number}
            type="button"
            className="pager__page"
            aria-current={number === page ? 'page' : undefined}
            aria-label={`Page ${number}`}
            onClick={() => onPageChange(number)}
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          className="pager__arrow"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
        >
          →
        </button>
      </div>
    </nav>
  );
}

// The employee list panel: one page of rows as a table (wide screens) or
// cards (small screens), or the matching loading, error or empty state.
export default function EmployeeTable({
  status,
  error,
  totalEmployees,
  matchCount,
  rows,
  asCards,
  sort,
  order,
  page,
  pageCount,
  pageSize,
  noMatchTerm,
  onSort,
  onEdit,
  onDelete,
  onAdd,
  onRetry,
  onClearFilters,
  onPageChange,
}) {
  let content;
  if (status === 'loading') content = <LoadingState />;
  else if (status === 'error') content = <ErrorState error={error} onRetry={onRetry} />;
  else if (totalEmployees === 0) content = <EmptyState onAdd={onAdd} />;
  else if (matchCount === 0) content = <NoMatchState term={noMatchTerm} onClear={onClearFilters} />;
  else if (asCards) content = <Cards rows={rows} onEdit={onEdit} onDelete={onDelete} />;
  else content = <Table rows={rows} sort={sort} order={order} onSort={onSort} onEdit={onEdit} onDelete={onDelete} />;

  const showPager = status === 'ready' && matchCount > pageSize;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, matchCount);

  return (
    <div className="panel">
      {content}
      {showPager && (
        <Pager page={page} pageCount={pageCount} rangeText={`${first}–${last} of ${matchCount}`} onPageChange={onPageChange} />
      )}
    </div>
  );
}
