import path from 'node:path';
import fs from 'node:fs/promises';
import { AppError } from '../errors/AppError.js';

/**
 * Validates and safely resolves a user-supplied target path relative
 * to the current working directory, guaranteeing it does not escape rootDir.
 *
 * @param {string} inputPath - Relative or absolute path requested by the user
 * @param {string} currentDir - The active working directory inside the CLI
 * @param {string} rootDir - Sandboxed boundary directory (operations cannot escape here)
 * @returns {string} The fully qualified, sandboxed absolute path
 * @throws {AppError} If inputPath attempts path traversal beyond rootDir
 */
export function resolveSafePath(inputPath, currentDir, rootDir) {
  if (!inputPath || typeof inputPath !== 'string') {
    return currentDir;
  }

  // Resolve user input against either the active directory or rootDir
  const resolvedTarget = path.isAbsolute(inputPath)
    ? path.resolve(rootDir, '.' + path.normalize(inputPath))
    : path.resolve(currentDir, inputPath);

  // Canonical boundary checks
  const normalizedRoot = path.normalize(rootDir);
  const isInside =
    resolvedTarget === normalizedRoot ||
    resolvedTarget.startsWith(normalizedRoot + path.sep);

  if (!isInside) {
    throw new AppError(
      `Access Denied: Path escapes allowed root boundary '${normalizedRoot}'`,
      'SANDBOX_VIOLATION'
    );
  }

  return resolvedTarget;
}

/**
 * Safely resolves symlinks and checks if the real disk location
 * is contained inside the sandboxed root boundary.
 *
 * @param {string} targetPath - Path to inspect
 * @param {string} rootDir - Sandboxed boundary directory
 * @returns {Promise<string>} The real canonical path on disk
 * @throws {AppError} If symlink targets an external disk resource
 */
export async function verifySymlinkSafety(targetPath, rootDir) {
  try {
    const realTarget = await fs.realpath(targetPath);
    const normalizedRoot = path.normalize(rootDir);

    const isInside =
      realTarget === normalizedRoot ||
      realTarget.startsWith(normalizedRoot + path.sep);

    if (!isInside) {
      throw new AppError(
        `Security Error: Symlink points outside root boundary to '${realTarget}'`,
        'EXTERNAL_SYMLINK_BLOCKED'
      );
    }
    return realTarget;
  } catch (err) {
    // If the path doesn't exist yet (e.g. creating a new file), skip realpath
    if (err.code === 'ENOENT') {
      return targetPath;
    }
    throw err;
  }
}
