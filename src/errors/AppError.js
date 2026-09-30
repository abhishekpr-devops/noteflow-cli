/**
 * Custom error hierarchy for noteflow-cli
 * Allows the REPL to distinguish between expected operational errors
 * (e.g. file missing, permission denied) and unhandled programmatic bugs.
 */
export class AppError extends Error {
  /**
   * @param {string} message - User-friendly error message
   * @param {string} [code='OPERATIONAL_ERROR'] - Error categorization code
   */
  constructor(message, code = 'OPERATIONAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.isOperational = true;

    // Captures the current stack trace without polluting it with this constructor call
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Maps standard POSIX system error codes to human-readable AppError instances.
 * @param {Error} err - Caught system or custom error
 * @param {string} [targetPath=''] - The target path that triggered the error
 * @returns {AppError}
 */
export function normalizeFsError(err, targetPath = '') {
  if (err instanceof AppError) {
    return err;
  }

  const prefix = targetPath ? `'${targetPath}': ` : '';

  switch (err.code) {
    case 'ENOENT':
      return new AppError(`${prefix}No such file or directory`, 'FILE_NOT_FOUND');
    case 'EACCES':
    case 'EPERM':
      return new AppError(`${prefix}Permission denied`, 'PERMISSION_DENIED');
    case 'EEXIST':
      return new AppError(`${prefix}File or directory already exists`, 'ALREADY_EXISTS');
    case 'EISDIR':
      return new AppError(`${prefix}Is a directory, not a regular file`, 'IS_DIRECTORY');
    case 'ENOTDIR':
      return new AppError(`${prefix}Not a directory`, 'NOT_A_DIRECTORY');
    case 'ENOTEMPTY':
      return new AppError(`${prefix}Directory not empty`, 'DIRECTORY_NOT_EMPTY');
    default:
      return new AppError(`${prefix}${err.message || 'Unknown filesystem error'}`, err.code || 'UNKNOWN_ERROR');
  }
}
