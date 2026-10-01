import path from 'node:path';

/**
 * Encapsulates the runtime state of the active file manager session.
 */
export class SessionContext {
  /**
   * @param {string} [rootDir=process.cwd()] - Allowed sandbox root directory
   */
  constructor(rootDir = process.cwd()) {
    this.rootDir = path.resolve(rootDir);
    this.currentDir = this.rootDir;
    this.commandHistory = [];
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Updates the active working directory.
   * @param {string} nextDir - Validated absolute directory path
   */
  setCurrentDir(nextDir) {
    this.currentDir = nextDir;
  }

  /**
   * Appends an executed command string to the session history.
   * @param {string} rawCommand
   */
  recordCommand(rawCommand) {
    const trimmed = rawCommand.trim();
    if (trimmed && this.commandHistory[this.commandHistory.length - 1] !== trimmed) {
      this.commandHistory.push(trimmed);
    }
  }

  /**
   * Registers a reversible file mutation into the undo stack and clears the redo stack.
   * @param {Object} action - Action descriptor with inverse execution details
   */
  pushAction(action) {
    this.undoStack.push(action);
    this.redoStack = []; // New actions invalidate the redo history
  }

  /**
   * Pops the latest action for undo execution.
   * @returns {Object|null}
   */
  popUndoAction() {
    return this.undoStack.pop() || null;
  }

  /**
   * Pops the latest undone action for redo execution.
   * @returns {Object|null}
   */
  popRedoAction() {
    return this.redoStack.pop() || null;
  }

  /**
   * Pushes an undone action onto the redo stack.
   * @param {Object} action
   */
  pushRedoAction(action) {
    this.redoStack.push(action);
  }
}
