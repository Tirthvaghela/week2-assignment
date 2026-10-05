// Standard departments, in the order they appear in the sidebar and the form.
// The API accepts any department name; one that is not listed here is still
// shown, with a colour worked out from its name (see departmentHue).
export const DEPARTMENTS = ['Engineering', 'Finance', 'Human Resources', 'Marketing', 'Operations', 'Sales'];

// Each department has a colour hue, used for its dot, avatar and chart segment.
export const DEPARTMENT_HUES = {
  Engineering: 260,
  Finance: 155,
  'Human Resources': 15,
  Marketing: 330,
  Operations: 85,
  Sales: 210,
};

// Shorter names for tight spaces such as mobile cards and the chart legend.
export const DEPARTMENT_SHORT = { 'Human Resources': 'HR' };

export const COLUMNS = [
  { key: 'name', label: 'Name', align: 'left' },
  { key: 'department', label: 'Department', align: 'left' },
  { key: 'role', label: 'Role', align: 'left' },
  { key: 'salary', label: 'Salary', align: 'right' },
  { key: 'joinDate', label: 'Joined', align: 'right' },
];

export const PAGE_SIZE_DESKTOP = 8;
export const PAGE_SIZE_MOBILE = 5;

// Below this width the sidebar is replaced by a top bar and the table by cards.
// Keep in step with the media queries in styles.css.
export const MOBILE_QUERY = '(max-width: 819.98px)';

// Below this width there is not enough room beside the sidebar for the full
// table, so employees are shown as cards (as they are on phones).
export const CARDS_QUERY = '(max-width: 1279.98px)';
