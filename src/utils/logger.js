import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Journaling logger for operation persistence and crash recovery.
 * Uses an append-only write pattern to track file state transitions.
 */
export class OperationLogger {
  /**
   * @param {string} rootDir - Base path where the journal file is stored
   */
  constructor(rootDir) {
    this.journalPath = path.join(rootDir, '.noteflow_journal.log');
  }

  /**
   * Appends a log entry to the journal file.
   * @param {string} status - 'STARTED' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK'
   * @param {string} action - 'mkdir' | 'touch' | 'rename' | 'copy' | 'move' | 'delete'
   * @param {Object} details - Parameters describing the operation
   * @returns {Promise<void>}
   */
  async append(status, action, details) {
    const entry = {
      timestamp: new Date().toISOString(),
      status,
      action,
      details,
    };

    try {
      await fs.appendFile(this.journalPath, JSON.stringify(entry) + '\n', 'utf-8');
    } catch {
      // Non-fatal if logging fails, but keeps process resilient
    }
  }

  /**
   * Reads the journal and identifies interrupted operations (STARTED but not COMPLETED).
   * @returns {Promise<Array<Object>>}
   */
  async getIncompleteOperations() {
    try {
      const content = await fs.readFile(this.journalPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      const opsMap = new Map();

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const key = `${entry.action}_${JSON.stringify(entry.details)}`;

          if (entry.status === 'STARTED') {
            opsMap.set(key, entry);
          } else if (entry.status === 'COMPLETED' || entry.status === 'ROLLED_BACK') {
            opsMap.delete(key);
          }
        } catch {
          // Skip corrupted lines
        }
      }

      return Array.from(opsMap.values());
    } catch (err) {
      if (err.code === 'ENOENT') {
        return [];
      }
      return [];
    }
  }

  /**
   * Clears the log file once transactions are stabilized.
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      await fs.unlink(this.journalPath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }
}
