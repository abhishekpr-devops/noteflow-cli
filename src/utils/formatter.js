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
 * Strips ANSI color escape sequences from a string to measure visible length.
 */
function stripAnsi(str) {
  return String(str).replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Calculates visual display width in monospace terminal columns.
 * Unicode emojis like 📁, ⚡, ⚙, 📝 occupy 2 columns visually.
 */
function getDisplayWidth(str) {
  const clean = stripAnsi(str);
  let width = 0;
  for (const char of clean) {
    const code = char.codePointAt(0);
    // Common ranges for full-width characters and emojis
    if (
      (code >= 0x1f300 && code <= 0x1f9ff) || // Miscellaneous Symbols and Pictographs
      (code >= 0x2600 && code <= 0x27bf) ||   // Miscellaneous Symbols & Dingbats
      (code >= 0xfe00 && code <= 0xfe0f)      // Variation selectors
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * Pads a string based on visible terminal display width instead of byte length.
 */
function padDisplay(str, targetWidth) {
  const currentWidth = getDisplayWidth(str);
  const diff = targetWidth - currentWidth;
  return diff > 0 ? str + ' '.repeat(diff) : str;
}

/**
 * Prints a perfectly aligned columnar table using box-drawing characters.
 * @param {Array<Object>} rows - Array of row objects
 * @param {Array<string>} headers - Column headers to display
 */
export function printTable(rows, headers) {
  if (!rows || rows.length === 0) {
    console.log(colors.dim + '(empty directory)' + colors.reset);
    return;
  }

  // Calculate visual width for every column
  const widths = {};
  headers.forEach((h) => {
    widths[h] = h.length;
    rows.forEach((row) => {
      let val = '';
      if (h === 'name') {
        const glyph = getFileGlyph ? getFileGlyph(row.name, row.isDirectory) : '';
        val = `${glyph}${row.name}${row.isDirectory ? '/' : ''}`;
      } else {
        val = row[h] !== undefined ? String(row[h]) : '';
      }

      const w = getDisplayWidth(val);
      if (w > widths[h]) {
        widths[h] = w;
      }
    });
  });

  // Construct border lines
  const topBorder = '┌' + headers.map((h) => '─'.repeat(widths[h] + 2)).join('┬') + '┐';
  const midBorder = '├' + headers.map((h) => '─'.repeat(widths[h] + 2)).join('┼') + '┤';
  const botBorder = '└' + headers.map((h) => '─'.repeat(widths[h] + 2)).join('┴') + '┘';

  // Render top border
  console.log(topBorder);

  // Render table header
  const headerContent = headers
    .map((h) => ` ${padDisplay(h.toUpperCase(), widths[h])} `)
    .join('│');
  console.log(`│${colors.bold}${headerContent}${colors.reset}│`);

  // Render divider
  console.log(midBorder);

  // Render data rows
  rows.forEach((row) => {
    const rowContent = headers
      .map((h) => {
        let text = '';
        if (h === 'name') {
          const glyph = getFileGlyph ? getFileGlyph(row.name, row.isDirectory) : '';
          const nameWithSuffix = `${row.name}${row.isDirectory ? '/' : ''}`;
          text = `${glyph}${row.isDirectory ? colors.cyan + nameWithSuffix + colors.reset : nameWithSuffix}`;
        } else {
          text = row[h] !== undefined ? String(row[h]) : '';
        }

        return ` ${padDisplay(text, widths[h])} `;
      })
      .join('│');

    console.log(`│${rowContent}│`);
  });

  // Render bottom border
  console.log(botBorder);
}
