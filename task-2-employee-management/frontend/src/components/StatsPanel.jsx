import { formatCompact, formatSalary, hueStyle, shortDepartment } from '../utils/format.js';

// Headcount, payroll and average salary, with payroll split by department.
// Figures always cover every employee, whatever search or filter is active.
export default function StatsPanel({ employees, ready, compactLabels }) {
  const headcount = employees.length;
  const total = employees.reduce((sum, employee) => sum + employee.salary, 0);

  const byDepartment = {};
  employees.forEach((employee) => {
    byDepartment[employee.department] = (byDepartment[employee.department] || 0) + employee.salary;
  });
  const segments = Object.keys(byDepartment)
    .sort((a, b) => byDepartment[b] - byDepartment[a])
    .map((department) => ({
      department,
      share: (byDepartment[department] / total) * 100,
      title: `${department}: ${formatSalary(byDepartment[department])}`,
    }));

  const stats = [
    { label: 'Headcount', value: ready ? String(headcount) : '—' },
    { label: compactLabels ? 'Payroll' : 'Annual payroll', value: ready ? formatCompact(total) : '—' },
    {
      label: compactLabels ? 'Avg' : 'Average salary',
      value: ready && headcount ? formatCompact(Math.round(total / headcount)) : '—',
    },
  ];

  return (
    <section className="stats" aria-label="Summary">
      {stats.map((stat) => (
        <div key={stat.label} className="stat">
          <div className="stat__label">{stat.label}</div>
          <div className="stat__value">{stat.value}</div>
        </div>
      ))}

      <div className="payroll">
        <div className="payroll__head">
          <span>Payroll by department</span>
          <span className="payroll__total">{ready ? `${formatSalary(total)} / yr` : ''}</span>
        </div>
        <div className="payroll__bar">
          {ready &&
            segments.map((segment) => (
              <div
                key={segment.department}
                className="payroll__segment"
                title={segment.title}
                style={{ ...hueStyle(segment.department), width: `${segment.share}%` }}
              />
            ))}
        </div>
        <div className="payroll__legend">
          {ready &&
            segments.map((segment) => (
              <span key={segment.department} className="payroll__key">
                <span className="payroll__swatch" style={hueStyle(segment.department)} />
                {shortDepartment(segment.department)} <span className="payroll__pct">{Math.round(segment.share)}%</span>
              </span>
            ))}
        </div>
      </div>
    </section>
  );
}
