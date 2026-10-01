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
 * Returns a Unicode glyph prefix for a file or directory name.
 * @param {string} name - File or directory name
 * @param {boolean} isDirectory - Whether the entry is a directory
 * @returns {string} Glyph with trailing space
 */
export function getFileGlyph(name, isDirectory) {
  if (isDirectory) return '📁 ';
  if (name.endsWith('.js') || name.endsWith('.mjs')) return '⚡ ';
  if (name.endsWith('.json')) return '⚙  ';
  if (name.endsWith('.md') || name.endsWith('.txt')) return '📝 ';
  return '📄 ';
}

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
 * Generates a Unicode block visual progress bar for streams.
 * @param {number} percentage - Integer or float between 0 and 100
 * @param {number} [barLength=24] - Number of block characters in the bar
 * @returns {string}
 */
export function renderProgressBar(percentage, barLength = 24) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const completed = Math.round((clamped / 100) * barLength);
  const remaining = barLength - completed;

  const filled = '█'.repeat(completed);
  const empty = '░'.repeat(remaining);

  return `${colors.cyan}${filled}${colors.dim}${empty}${colors.reset} ${clamped.toFixed(1)}%`;
}

/**
 * Prints a clean columnar table with Unicode box-drawing borders to the console.
 * @param {Array<Object>} rows - Array of objects representing rows
 * @param {Array<string>} headers - Column keys to display
 */
export function printTable(rows, headers) {
  if (!rows || rows.length === 0) {
    console.log(colors.dim + '(empty directory)' + colors.reset);
    return;
  }

  const CELL_SEP = ' │ ';

  const widths = {};
  headers.forEach((h) => {
    widths[h] = h.length;
    rows.forEach((row) => {
      let val = row[h] !== undefined ? String(row[h]) : '';
      if (h === 'name') {
        val = getFileGlyph(row.name, row.isDirectory) + val;
        if (row.isDirectory && !val.endsWith('/')) {
          val += '/';
        }
      }
      if (val.length > widths[h]) {
        widths[h] = val.length;
      }
    });
  });

  const buildBorder = (left, mid, right, fill) =>
    left + headers.map((h) => fill.repeat(widths[h])).join(mid) + right;

  const topBorder    = buildBorder('┌', '┬', '┐', '─');
  const headerSep    = buildBorder('├', '┼', '┤', '─');
  const bottomBorder = buildBorder('└', '┴', '┘', '─');

  const headerLine = '│' + headers.map((h) => h.toUpperCase().padEnd(widths[h])).join(CELL_SEP) + '│';
  console.log(colors.bold + topBorder + colors.reset);
  console.log(colors.bold + headerLine + colors.reset);
  console.log(headerSep);

  rows.forEach((row) => {
    const cells = headers.map((h) => {
      let val = row[h] !== undefined ? String(row[h]) : '';
      if (h === 'name') {
        val = getFileGlyph(row.name, row.isDirectory) + val;
        if (row.isDirectory && !val.endsWith('/')) {
          val += '/';
        }
        if (row.isDirectory) {
          return colors.cyan + val.padEnd(widths[h]) + colors.reset;
        }
      }
      return val.padEnd(widths[h]);
    });
    console.log('│' + cells.join(CELL_SEP) + '│');
  });

  console.log(bottomBorder);
}
