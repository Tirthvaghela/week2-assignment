import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DeleteModal from '../components/DeleteModal.jsx';
import EmployeeForm from '../components/EmployeeForm.jsx';
import EmployeeTable from '../components/EmployeeTable.jsx';
import SearchBar from '../components/SearchBar.jsx';
import Sidebar, { DepartmentChips } from '../components/Sidebar.jsx';
import StatsPanel from '../components/StatsPanel.jsx';
import ToastList from '../components/Toast.jsx';
import { CARDS_QUERY, DEPARTMENTS, MOBILE_QUERY, PAGE_SIZE_DESKTOP, PAGE_SIZE_MOBILE } from '../constants.js';
import useMediaQuery from '../hooks/useMediaQuery.js';
import { createEmployee, deleteEmployee, getEmployees, updateEmployee } from '../services/employeeApi.js';

const compareText = new Intl.Collator('en', { sensitivity: 'base' }).compare;

export default function EmployeeDashboard() {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const asCards = useMediaQuery(CARDS_QUERY);

  // Every employee, as returned by the API. Search, department filter,
  // sorting and paging are applied to this list in the browser, because the
  // sidebar counts and the payroll summary need the full set anyway.
  const [employees, setEmployees] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [loadError, setLoadError] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(1);

  const [form, setForm] = useState(null); // null | { employee: object | null }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toasts, setToasts] = useState([]);
  const nextToastId = useRef(1);

  // READ: load the list on start, on "Try again", and after every change.
  useEffect(() => {
    const controller = new AbortController();

    getEmployees({}, controller.signal)
      .then((data) => {
        setEmployees(data);
        setLoadError(null);
        setStatus('ready');
      })
      .catch((error) => {
        // An aborted request was replaced by a newer one; ignore it.
        if (error.name === 'AbortError') return;
        setLoadError({ message: error.message, status: error.status });
        setStatus('error');
      });

    return () => controller.abort();
  }, [reloadCount]);

  // Quietly re-read the list from the API, keeping the current rows on screen.
  const refresh = useCallback(() => setReloadCount((count) => count + 1), []);

  const retry = () => {
    setStatus('loading');
    refresh();
  };

  const ready = status === 'ready';

  // Standard departments first, then any others found in the data.
  const departments = useMemo(() => {
    const extra = [...new Set(employees.map((employee) => employee.department))]
      .filter((name) => !DEPARTMENTS.includes(name))
      .sort(compareText);
    return [...DEPARTMENTS, ...extra];
  }, [employees]);

  const navItems = useMemo(() => {
    const counts = {};
    employees.forEach((employee) => {
      counts[employee.department] = (counts[employee.department] || 0) + 1;
    });
    return [
      { key: '', label: 'All', count: ready ? employees.length : '' },
      ...departments.map((name) => ({ key: name, label: name, count: ready ? counts[name] || 0 : '' })),
    ];
  }, [employees, departments, ready]);

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = employees.filter(
      (employee) =>
        (!department || employee.department === department) &&
        (!term || [employee.name, employee.department, employee.role].some((value) => value.toLowerCase().includes(term))),
    );
    const direction = order === 'asc' ? 1 : -1;
    return filtered.sort((a, b) => {
      const result = sort === 'salary' ? a.salary - b.salary : compareText(a[sort], b[sort]);
      return (result || compareText(a.name, b.name)) * direction;
    });
  }, [employees, search, department, sort, order]);

  const pageSize = asCards ? PAGE_SIZE_MOBILE : PAGE_SIZE_DESKTOP;
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const rows = matches.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const changeSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const changeDepartment = (value) => {
    setDepartment(value);
    setPage(1);
  };

  const changeSortField = (field) => {
    setSort(field);
    setPage(1);
  };

  // Table headers: a new column sorts ascending, the same column reverses.
  const sortByColumn = (field) => {
    setOrder(sort === field && order === 'asc' ? 'desc' : 'asc');
    setSort(field);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setDepartment('');
    setPage(1);
  };

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message) => {
    const id = nextToastId.current++;
    setToasts((current) => [...current, { id, message }]);
  }, []);

  // If a record no longer exists (deleted elsewhere), refresh so the stale
  // row disappears, then let the open dialog show the error.
  const refreshIfMissing = (error) => {
    if (error.status === 404) refresh();
    throw error;
  };

  // CREATE and UPDATE
  const handleSave = async (payload) => {
    const editing = form.employee;
    if (editing) {
      const updated = await updateEmployee(editing.id, payload).catch(refreshIfMissing);
      setEmployees((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } else {
      const created = await createEmployee(payload);
      setEmployees((current) => [...current, created]);
    }
    setForm(null);
    showToast(editing ? 'Employee updated successfully.' : 'Employee added successfully.');
    refresh();
  };

  // DELETE (called only after the confirmation dialog)
  const handleDelete = async (employee) => {
    await deleteEmployee(employee.id).catch(refreshIfMissing);
    setEmployees((current) => current.filter((item) => item.id !== employee.id));
    setDeleteTarget(null);
    showToast('Employee deleted successfully.');
    refresh();
  };

  const openAdd = () => setForm({ employee: null });

  const departmentLabel = department || 'All departments';
  const eyebrow = ready
    ? `${departmentLabel} · ${matches.length} ${matches.length === 1 ? 'person' : 'people'}`
    : departmentLabel;

  return (
    <div className="shell">
      <Sidebar items={navItems} selected={department} onSelect={changeDepartment} />

      <main className="main">
        <div className="mobile-bar">
          <div className="brand brand--small">
            <div className="brand__mark">A</div>
            <span className="brand__name">Management</span>
          </div>
          <span className="mobile-bar__user">HR Admin</span>
        </div>

        <div className="content">
          <header className="page-head">
            <div className="page-head__text">
              <p className="page-head__eyebrow" aria-live="polite">
                {eyebrow}
              </p>
              <h1 className="page-head__title">Employees Management</h1>
            </div>
            <button type="button" className="new-button" onClick={openAdd}>
              <span className="new-button__plus" aria-hidden="true">
                +
              </span>
              New employee
            </button>
          </header>

          <StatsPanel employees={employees} ready={ready} compactLabels={isMobile} />

          <section className="directory" aria-label="Employees">
            <DepartmentChips items={navItems} selected={department} onSelect={changeDepartment} />

            <SearchBar
              search={search}
              onSearchChange={changeSearch}
              sort={sort}
              order={order}
              onSortChange={changeSortField}
              onOrderToggle={() => setOrder((current) => (current === 'asc' ? 'desc' : 'asc'))}
            />

            <EmployeeTable
              status={status}
              error={loadError}
              totalEmployees={employees.length}
              matchCount={matches.length}
              rows={rows}
              asCards={asCards}
              sort={sort}
              order={order}
              page={currentPage}
              pageCount={pageCount}
              pageSize={pageSize}
              noMatchTerm={search.trim() || departmentLabel}
              onSort={sortByColumn}
              onEdit={(employee) => setForm({ employee })}
              onDelete={setDeleteTarget}
              onAdd={openAdd}
              onRetry={retry}
              onClearFilters={clearFilters}
              onPageChange={setPage}
            />
          </section>
        </div>
      </main>

      {form && (
        <EmployeeForm
          key={form.employee?.id ?? 'new'}
          employee={form.employee}
          departments={departments}
          defaultDepartment={department}
          onSubmit={handleSave}
          onClose={() => setForm(null)}
        />
      )}

      {deleteTarget && (
        <DeleteModal employee={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}

      <ToastList toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
