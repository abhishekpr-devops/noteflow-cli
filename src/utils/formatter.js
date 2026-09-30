/**
 * ANSI Escape sequences for styling terminal output without external packages
 */
export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
};

/**
 * Converts raw bytes into human-readable metric strings (B, KB, MB, GB).
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted string
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (!bytes || isNaN(bytes)) return '-';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = (bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2);

  return `${size} ${units[index]}`;
}

/**
 * Formats a Date object or timestamp into ISO local string (YYYY-MM-DD HH:mm:ss).
 * @param {Date|number} timestamp
 * @returns {string}
 */
export function formatDate(timestamp) {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Converts a POSIX numerical file mode to a permission string (e.g. 'rwxr-xr-x').
 * @param {number} mode - Mode bitmask from fs.stat
 * @returns {string}
 */
export function formatPermissions(mode) {
  if (!mode) return '---------';
  const perms = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];
  const user = perms[(mode >> 6) & 7];
  const group = perms[(mode >> 3) & 7];
  const others = perms[mode & 7];
  return `${user}${group}${others}`;
}

/**
 * Generates an ASCII visual progress bar for streams.
 * @param {number} percentage - Integer or float between 0 and 100
 * @param {number} [barLength=30] - Terminal column width of the progress bar
 * @returns {string}
 */
export function renderProgressBar(percentage, barLength = 30) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const completed = Math.round((clamped / 100) * barLength);
  const remaining = barLength - completed;

  const bar = '='.repeat(completed) + (completed < barLength ? '>' : '') + ' '.repeat(Math.max(0, remaining - 1));
  return `[${bar}] ${clamped.toFixed(1)}%`;
}

/**
 * Prints a clean columnar table to the console.
 * @param {Array<Object>} rows - Array of objects representing rows
 * @param {Array<string>} headers - Column keys to display
 */
export function printTable(rows, headers) {
  if (!rows || rows.length === 0) {
    console.log(colors.dim + '(empty directory)' + colors.reset);
    return;
  }

  // Calculate maximum column widths
  const widths = {};
  headers.forEach((h) => {
    widths[h] = h.length;
    rows.forEach((row) => {
      const val = row[h] ? String(row[h]) : '';
      if (val.length > widths[h]) {
        widths[h] = val.length;
      }
    });
  });

  // Render header
  const headerLine = headers.map((h) => h.toUpperCase().padEnd(widths[h])).join('  ');
  console.log(colors.bold + headerLine + colors.reset);
  console.log(colors.dim + headers.map((h) => '-'.repeat(widths[h])).join('  ') + colors.reset);

  // Render data rows
  rows.forEach((row) => {
    const line = headers
      .map((h) => {
        const val = row[h] !== undefined ? String(row[h]) : '';
        const padded = val.padEnd(widths[h]);
        if (h === 'name') {
          return row.isDirectory ? `${colors.cyan}${padded}${colors.reset}` : padded;
        }
        return padded;
      })
      .join('  ');
    console.log(line);
  });
}
