import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { resolveSafePath, verifySymlinkSafety } from '../utils/pathGuard.js';
import { renderProgressBar, formatBytes } from '../utils/formatter.js';
import { AppError } from '../errors/AppError.js';
import { OperationLogger } from '../utils/logger.js';

/**
 * Copies a single file using chunked readable/writable streams with live progress tracking.
 */
async function streamCopyFile(sourcePath, destPath) {
  const stats = await fsPromises.stat(sourcePath);
  const totalBytes = stats.size;
  let copiedBytes = 0;
  let lastReportedPercentage = -1;

  const readStream = fs.createReadStream(sourcePath);
  const writeStream = fs.createWriteStream(destPath);

  const progressTracker = new Transform({
    transform(chunk, encoding, callback) {
      copiedBytes += chunk.length;
      if (totalBytes > 0) {
        const percentage = Math.floor((copiedBytes / totalBytes) * 100);
        if (percentage !== lastReportedPercentage) {
          lastReportedPercentage = percentage;
          const bar = renderProgressBar(percentage);
          process.stdout.write(`\rCopying: ${bar} (${formatBytes(copiedBytes)} / ${formatBytes(totalBytes)})`);
        }
      }
      callback(null, chunk);
    },
  });

  await pipeline(readStream, progressTracker, writeStream);
  process.stdout.write('\n');
}

/**
 * Recursively copies a directory tree.
 */
async function copyDirectoryRecursive(src, dest) {
  await fsPromises.mkdir(dest, { recursive: true });
  const entries = await fsPromises.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectoryRecursive(srcPath, destPath);
    } else {
      await streamCopyFile(srcPath, destPath);
    }
  }
}

/**
 * Implements 'copy': supports stream-based large file and recursive folder copying.
 */
export async function copy(sourceArg, destArg, context) {
  if (!sourceArg || !destArg) {
    throw new AppError("Usage: copy <source> <destination>", 'INVALID_ARGUMENT');
  }

  const srcSafe = resolveSafePath(sourceArg, context.currentDir, context.rootDir);
  let destSafe = resolveSafePath(destArg, context.currentDir, context.rootDir);

  await verifySymlinkSafety(srcSafe, context.rootDir);

  // If destination is an existing directory, copy inside it
  try {
    const destStats = await fsPromises.stat(destSafe);
    if (destStats.isDirectory()) {
      destSafe = path.join(destSafe, path.basename(srcSafe));
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  const srcStats = await fsPromises.stat(srcSafe);
  const logger = new OperationLogger(context.rootDir);
  await logger.append('STARTED', 'copy', { from: srcSafe, to: destSafe });

  if (srcStats.isDirectory()) {
    await copyDirectoryRecursive(srcSafe, destSafe);
  } else {
    await streamCopyFile(srcSafe, destSafe);
  }

  await logger.append('COMPLETED', 'copy', { from: srcSafe, to: destSafe });

  context.pushAction({
    type: 'copy',
    source: srcSafe,
    destination: destSafe,
    isDir: srcStats.isDirectory(),
    undo: async () => {
      await fsPromises.rm(destSafe, { recursive: true, force: true });
    },
    redo: async () => {
      if (srcStats.isDirectory()) {
        await copyDirectoryRecursive(srcSafe, destSafe);
      } else {
        await streamCopyFile(srcSafe, destSafe);
      }
    },
  });

  console.log(`Copied: '${path.basename(srcSafe)}' -> '${path.basename(destSafe)}'`);
}

/**
 * Implements 'move': relocates files or folders across paths.
 */
export async function move(sourceArg, destArg, context) {
  if (!sourceArg || !destArg) {
    throw new AppError("Usage: move <source> <destination>", 'INVALID_ARGUMENT');
  }

  const srcSafe = resolveSafePath(sourceArg, context.currentDir, context.rootDir);
  let destSafe = resolveSafePath(destArg, context.currentDir, context.rootDir);

  await verifySymlinkSafety(srcSafe, context.rootDir);

  try {
    const destStats = await fsPromises.stat(destSafe);
    if (destStats.isDirectory()) {
      destSafe = path.join(destSafe, path.basename(srcSafe));
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  const logger = new OperationLogger(context.rootDir);
  await logger.append('STARTED', 'move', { from: srcSafe, to: destSafe });

  await fsPromises.rename(srcSafe, destSafe);
  await logger.append('COMPLETED', 'move', { from: srcSafe, to: destSafe });

  context.pushAction({
    type: 'move',
    from: srcSafe,
    to: destSafe,
    undo: async () => {
      await fsPromises.rename(destSafe, srcSafe);
    },
    redo: async () => {
      await fsPromises.rename(srcSafe, destSafe);
    },
  });

  console.log(`Moved: '${path.basename(srcSafe)}' -> '${path.basename(destSafe)}'`);
}
