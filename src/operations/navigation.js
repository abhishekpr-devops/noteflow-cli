import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveSafePath, verifySymlinkSafety } from '../utils/pathGuard.js';
import { formatBytes, formatDate, formatPermissions, printTable, colors } from '../utils/formatter.js';
import { AppError } from '../errors/AppError.js';

/**
 * Implements 'pwd': prints the active directory.
 */
export function pwd(context) {
  console.log(context.currentDir);
}

/**
 * Implements 'cd': changes active working directory within sandbox limits.
 */
export async function cd(targetPath, context) {
  const destination = resolveSafePath(targetPath, context.currentDir, context.rootDir);
  const realDest = await verifySymlinkSafety(destination, context.rootDir);

  const stats = await fs.stat(realDest);
  if (!stats.isDirectory()) {
    throw new AppError(`Not a directory: '${targetPath}'`, 'NOT_A_DIRECTORY');
  }

  context.setCurrentDir(destination);
}

/**
 * Implements 'ls': asynchronous directory listing with sorting and filtering flags.
 * Flags: -a (all/hidden), -s <name|size|time>, -r (reverse order), -f (files only), -d (dirs only)
 */
export async function ls(args, context) {
  const flags = {
    all: false,
    sortBy: 'name',
    reverse: false,
    filesOnly: false,
    dirsOnly: false,
  };

  let targetDir = context.currentDir;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-a') flags.all = true;
    else if (arg === '-r') flags.reverse = true;
    else if (arg === '-f') flags.filesOnly = true;
    else if (arg === '-d') flags.dirsOnly = true;
    else if (arg === '-s' && args[i + 1]) {
      flags.sortBy = args[i + 1].toLowerCase();
      i++;
    } else if (!arg.startsWith('-')) {
      targetDir = resolveSafePath(arg, context.currentDir, context.rootDir);
    }
  }

  await verifySymlinkSafety(targetDir, context.rootDir);

  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  const rows = [];

  for (const entry of entries) {
    if (!flags.all && entry.name.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(targetDir, entry.name);
    let stats;
    try {
      stats = await fs.stat(fullPath);
    } catch {
      // Inaccessible entry fallback
      continue;
    }

    const isDir = entry.isDirectory();
    if (flags.filesOnly && isDir) continue;
    if (flags.dirsOnly && !isDir) continue;

    rows.push({
      name: entry.name,
      isDirectory: isDir,
      type: isDir ? 'DIR' : 'FILE',
      size: isDir ? '-' : formatBytes(stats.size),
      rawSize: stats.size,
      permissions: formatPermissions(stats.mode),
      modified: formatDate(stats.mtime),
      rawTime: stats.mtimeMs,
    });
  }

  // Sorting
  rows.sort((a, b) => {
    let comparison = 0;
    if (flags.sortBy === 'size') {
      comparison = a.rawSize - b.rawSize;
    } else if (flags.sortBy === 'time') {
      comparison = a.rawTime - b.rawTime;
    } else {
      comparison = a.name.localeCompare(b.name);
    }
    return flags.reverse ? -comparison : comparison;
  });

  printTable(rows, ['permissions', 'type', 'size', 'modified', 'name']);
}

/**
 * Implements 'tree': renders recursive ASCII hierarchy with configurable depth.
 */
export async function tree(maxDepthArg, context) {
  const maxDepth = maxDepthArg ? parseInt(maxDepthArg, 10) : 3;
  if (isNaN(maxDepth) || maxDepth < 1) {
    throw new AppError('Tree depth must be a positive integer', 'INVALID_ARGUMENT');
  }

  async function renderBranch(currentPath, prefix = '', currentDepth = 1) {
    if (currentDepth > maxDepth) return;

    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    // Filter hidden files out of tree by default
    const visibleEntries = entries.filter((e) => !e.name.startsWith('.'));

    for (let i = 0; i < visibleEntries.length; i++) {
      const entry = visibleEntries[i];
      const isLast = i === visibleEntries.length - 1;
      const pointer = isLast ? '└── ' : '├── ';
      const displayName = entry.isDirectory()
        ? `${colors.cyan}${entry.name}/${colors.reset}`
        : entry.name;

      console.log(`${prefix}${pointer}${displayName}`);

      if (entry.isDirectory()) {
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        await renderBranch(path.join(currentPath, entry.name), nextPrefix, currentDepth + 1);
      }
    }
  }

  console.log(`${colors.bold}${path.basename(context.currentDir) || context.currentDir}${colors.reset}`);
  await renderBranch(context.currentDir);
}
