import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { resolveSafePath, verifySymlinkSafety } from '../utils/pathGuard.js';
import { AppError } from '../errors/AppError.js';
import { OperationLogger } from '../utils/logger.js';

/**
 * Implements 'touch': creates a blank file or updates timestamps.
 */
export async function touch(fileName, context) {
  if (!fileName) {
    throw new AppError("Usage: touch <filename>", 'INVALID_ARGUMENT');
  }

  const safePath = resolveSafePath(fileName, context.currentDir, context.rootDir);
  const logger = new OperationLogger(context.rootDir);

  await logger.append('STARTED', 'touch', { target: safePath });

  const fileHandle = await fs.open(safePath, 'a');
  await fileHandle.close();

  await logger.append('COMPLETED', 'touch', { target: safePath });

  // Record reversible action
  context.pushAction({
    type: 'touch',
    path: safePath,
    undo: async () => {
      await fs.unlink(safePath);
    },
    redo: async () => {
      const h = await fs.open(safePath, 'a');
      await h.close();
    },
  });

  console.log(`Created file: ${path.basename(safePath)}`);
}

/**
 * Implements 'mkdir': creates a directory asynchronously.
 */
export async function mkdir(dirName, context) {
  if (!dirName) {
    throw new AppError("Usage: mkdir <dirname>", 'INVALID_ARGUMENT');
  }

  const safePath = resolveSafePath(dirName, context.currentDir, context.rootDir);
  const logger = new OperationLogger(context.rootDir);

  await logger.append('STARTED', 'mkdir', { target: safePath });
  await fs.mkdir(safePath, { recursive: false });
  await logger.append('COMPLETED', 'mkdir', { target: safePath });

  // Record reversible action
  context.pushAction({
    type: 'mkdir',
    path: safePath,
    undo: async () => {
      await fs.rm(safePath, { recursive: true, force: true });
    },
    redo: async () => {
      await fs.mkdir(safePath, { recursive: false });
    },
  });

  console.log(`Created directory: ${path.basename(safePath)}`);
}

/**
 * Implements 'rename': safely moves/renames a file or folder.
 */
export async function rename(oldName, newName, context) {
  if (!oldName || !newName) {
    throw new AppError("Usage: rename <old_path> <new_path>", 'INVALID_ARGUMENT');
  }

  const oldSafe = resolveSafePath(oldName, context.currentDir, context.rootDir);
  const newSafe = resolveSafePath(newName, context.currentDir, context.rootDir);

  await verifySymlinkSafety(oldSafe, context.rootDir);

  const logger = new OperationLogger(context.rootDir);
  await logger.append('STARTED', 'rename', { from: oldSafe, to: newSafe });

  await fs.rename(oldSafe, newSafe);
  await logger.append('COMPLETED', 'rename', { from: oldSafe, to: newSafe });

  context.pushAction({
    type: 'rename',
    from: oldSafe,
    to: newSafe,
    undo: async () => {
      await fs.rename(newSafe, oldSafe);
    },
    redo: async () => {
      await fs.rename(oldSafe, newSafe);
    },
  });

  console.log(`Renamed '${path.basename(oldSafe)}' -> '${path.basename(newSafe)}'`);
}

/**
 * Implements 'delete': deletes a file or directory with interactive confirmation.
 */
export async function deletePath(targetName, context) {
  if (!targetName) {
    throw new AppError("Usage: delete <path>", 'INVALID_ARGUMENT');
  }

  const safePath = resolveSafePath(targetName, context.currentDir, context.rootDir);
  await verifySymlinkSafety(safePath, context.rootDir);

  const stats = await fs.stat(safePath);
  const isDir = stats.isDirectory();

  // Confirmation prompt using readline/promises
  const rl = readline.createInterface({ input, output });
  const message = isDir
    ? `Are you sure you want to RECURSIVELY delete directory '${path.basename(safePath)}'? (y/N): `
    : `Are you sure you want to delete file '${path.basename(safePath)}'? (y/N): `;

  const answer = await rl.question(message);
  rl.close();

  if (answer.trim().toLowerCase() !== 'y') {
    console.log('Operation aborted.');
    return;
  }

  const logger = new OperationLogger(context.rootDir);
  await logger.append('STARTED', 'delete', { target: safePath, isDir });

  // Move to a hidden trash staging area so Undo can restore it
  const trashDir = path.join(context.rootDir, '.noteflow_trash');
  await fs.mkdir(trashDir, { recursive: true });
  const trashPath = path.join(trashDir, `${Date.now()}_${path.basename(safePath)}`);

  await fs.rename(safePath, trashPath);
  await logger.append('COMPLETED', 'delete', { target: safePath, trashPath });

  context.pushAction({
    type: 'delete',
    originalPath: safePath,
    stagedTrashPath: trashPath,
    undo: async () => {
      await fs.rename(trashPath, safePath);
    },
    redo: async () => {
      await fs.rename(safePath, trashPath);
    },
  });

  console.log(`Deleted: ${path.basename(safePath)}`);
}
