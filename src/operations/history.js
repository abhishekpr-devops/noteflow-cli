import { colors } from '../utils/formatter.js';
import { OperationLogger } from '../utils/logger.js';
import { AppError } from '../errors/AppError.js';
import fs from 'node:fs/promises';

/**
 * Reverts the most recent mutating file operation.
 * @param {import('../context.js').SessionContext} context
 */
export async function undo(context) {
  const action = context.popUndoAction();

  if (!action) {
    console.log(colors.dim + 'Nothing to undo.' + colors.reset);
    return;
  }

  const logger = new OperationLogger(context.rootDir);
  await logger.append('STARTED', 'undo', { type: action.type });

  try {
    await action.undo();
    context.pushRedoAction(action);
    await logger.append('COMPLETED', 'undo', { type: action.type });
    console.log(`${colors.green}Undid operation:${colors.reset} ${action.type}`);
  } catch (err) {
    await logger.append('FAILED', 'undo', { type: action.type, error: err.message });
    throw new AppError(`Undo failed for '${action.type}': ${err.message}`, 'UNDO_FAILED');
  }
}

/**
 * Reapplies the most recently undone file operation.
 * @param {import('../context.js').SessionContext} context
 */
export async function redo(context) {
  const action = context.popRedoAction();

  if (!action) {
    console.log(colors.dim + 'Nothing to redo.' + colors.reset);
    return;
  }

  const logger = new OperationLogger(context.rootDir);
  await logger.append('STARTED', 'redo', { type: action.type });

  try {
    await action.redo();
    context.pushAction(action);
    await logger.append('COMPLETED', 'redo', { type: action.type });
    console.log(`${colors.green}Redid operation:${colors.reset} ${action.type}`);
  } catch (err) {
    await logger.append('FAILED', 'redo', { type: action.type, error: err.message });
    throw new AppError(`Redo failed for '${action.type}': ${err.message}`, 'REDO_FAILED');
  }
}

/**
 * Scans the journal for interrupted operations and reconciles them.
 * @param {import('../context.js').SessionContext} context
 */
export async function recoverInterruptedOperations(context) {
  const logger = new OperationLogger(context.rootDir);
  const uncompleted = await logger.getIncompleteOperations();

  if (uncompleted.length === 0) return;

  console.log(colors.yellow + `Detected ${uncompleted.length} interrupted operation(s). Reconciling...` + colors.reset);

  for (const entry of uncompleted) {
    try {
      if (entry.action === 'copy' && entry.details?.to) {
        // Remove incomplete copied target
        await fs.rm(entry.details.to, { recursive: true, force: true });
      }
      await logger.append('ROLLED_BACK', entry.action, entry.details);
    } catch {
      // Best effort recovery
    }
  }

  console.log(colors.green + 'Interrupted operation recovery complete.' + colors.reset);
}
