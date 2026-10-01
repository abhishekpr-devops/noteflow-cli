import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveSafePath, verifySymlinkSafety } from '../utils/pathGuard.js';
import { formatBytes, formatDate, formatPermissions, colors } from '../utils/formatter.js';
import { AppError } from '../errors/AppError.js';

/**
 * Implements 'cat': outputs text content of a target file.
 */
export async function cat(filePathArg, context) {
  if (!filePathArg) {
    throw new AppError("Usage: cat <file_path>", 'INVALID_ARGUMENT');
  }

  const safePath = resolveSafePath(filePathArg, context.currentDir, context.rootDir);
  await verifySymlinkSafety(safePath, context.rootDir);

  const stats = await fs.stat(safePath);
  if (stats.isDirectory()) {
    throw new AppError(`Cannot display '${filePathArg}': It is a directory`, 'IS_DIRECTORY');
  }

  const content = await fs.readFile(safePath, 'utf-8');
  console.log(content);
}

/**
 * Implements 'info': displays detailed metadata for a file or directory.
 */
export async function info(targetPathArg, context) {
  if (!targetPathArg) {
    throw new AppError("Usage: info <path>", 'INVALID_ARGUMENT');
  }

  const safePath = resolveSafePath(targetPathArg, context.currentDir, context.rootDir);
  await verifySymlinkSafety(safePath, context.rootDir);

  const stats = await fs.stat(safePath);
  const ext = path.extname(safePath) || '(none)';

  let type = 'Regular File';
  if (stats.isDirectory()) type = 'Directory';
  else if (stats.isSymbolicLink()) type = 'Symbolic Link';
  else if (stats.isSocket()) type = 'Socket';
  else if (stats.isFIFO()) type = 'FIFO/Pipe';

  console.log(`${colors.bold}Path:${colors.reset}         ${safePath}`);
  console.log(`${colors.bold}Type:${colors.reset}         ${type}`);
  console.log(`${colors.bold}Extension:${colors.reset}    ${ext}`);
  console.log(`${colors.bold}Size:${colors.reset}         ${formatBytes(stats.size)} (${stats.size} bytes)`);
  console.log(`${colors.bold}Permissions:${colors.reset}  ${formatPermissions(stats.mode)}`);
  console.log(`${colors.bold}Created:${colors.reset}      ${formatDate(stats.birthtime)}`);
  console.log(`${colors.bold}Modified:${colors.reset}     ${formatDate(stats.mtime)}`);
  console.log(`${colors.bold}Accessed:${colors.reset}     ${formatDate(stats.atime)}`);
}

/**
 * Implements 'find': recursively searches directories matching patterns.
 * Usage: find <pattern> [-i] [-e <ext>]
 */
export async function find(args, context) {
  if (!args || args.length === 0) {
    throw new AppError("Usage: find <query> [-i] [-e extension]", 'INVALID_ARGUMENT');
  }

  let pattern = '';
  let caseInsensitive = false;
  let targetExt = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-i') {
      caseInsensitive = true;
    } else if (args[i] === '-e' && args[i + 1]) {
      targetExt = args[i + 1].startsWith('.') ? args[i + 1] : `.${args[i + 1]}`;
      i++;
    } else if (!args[i].startsWith('-') && !pattern) {
      pattern = args[i];
    }
  }

  const matches = [];

  async function searchRecursive(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await searchRecursive(fullPath);
      } else {
        const fileExt = path.extname(entry.name);
        let matchName = entry.name;
        let comparePattern = pattern;

        if (caseInsensitive) {
          matchName = matchName.toLowerCase();
          comparePattern = comparePattern.toLowerCase();
        }

        const matchesPattern = pattern ? matchName.includes(comparePattern) : true;
        const matchesExt = targetExt ? fileExt.toLowerCase() === targetExt.toLowerCase() : true;

        if (matchesPattern && matchesExt) {
          const relative = path.relative(context.currentDir, fullPath);
          matches.push(relative || entry.name);
        }
      }
    }
  }

  await searchRecursive(context.currentDir);

  if (matches.length === 0) {
    console.log(colors.dim + 'No matches found.' + colors.reset);
  } else {
    console.log(`${colors.green}Found ${matches.length} matches:${colors.reset}`);
    matches.forEach((m) => console.log(`  ${m}`));
  }
}
