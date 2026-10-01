import readline from 'node:readline';
import path from 'node:path';
import { SessionContext } from './context.js';
import { normalizeFsError } from './errors/AppError.js';
import { colors } from './utils/formatter.js';
import { OperationLogger } from './utils/logger.js';

import { pwd, cd, ls, tree } from './operations/navigation.js';
import { cat, info, find } from './operations/inspection.js';
import { touch, mkdir, rename, deletePath } from './operations/manipulation.js';
import { copy, move } from './operations/transfer.js';
import { undo, redo } from './operations/history.js';

/**
 * Main application coordinator managing the REPL loop and signal trapping.
 */
export class FileCommanderApp {
  constructor(rootDir = process.cwd()) {
    this.context = new SessionContext(rootDir);
    this.logger = new OperationLogger(this.context.rootDir);
    this.rl = null;
  }

  /**
   * Initializes the interactive REPL.
   */
  async start() {
    console.clear();
    console.log(`${colors.bold}${colors.cyan}=== NoteFlow Terminal File Manager ===${colors.reset}`);
    console.log(`${colors.dim}Type 'exit' to quit or Ctrl+C. Root: ${this.context.rootDir}${colors.reset}\n`);

    // Verify and reconcile incomplete crash operations
    await this.checkCrashRecovery();

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    this.rl.on('SIGINT', () => {
      this.handleShutdown();
    });

    this.promptUser();
  }

  /**
   * Generates interactive prompt showing relative or base path.
   */
  promptUser() {
    const relPath = path.relative(this.context.rootDir, this.context.currentDir) || '/';
    this.rl.question(`${colors.green}noteflow${colors.reset}:${colors.blue}${relPath}${colors.reset}$ `, async (line) => {
      await this.processCommand(line);
      this.promptUser();
    });
  }

  /**
   * Parses and routes commands to their concrete asynchronous handlers.
   */
  async processCommand(line) {
    const raw = line.trim();
    if (!raw) return;

    this.context.recordCommand(raw);
    const [command, ...args] = raw.split(/\s+/);

    try {
      switch (command) {
        case 'pwd':
          pwd(this.context);
          break;
        case 'cd':
          await cd(args[0], this.context);
          break;
        case 'ls':
          await ls(args, this.context);
          break;
        case 'tree':
          await tree(args[0], this.context);
          break;
        case 'touch':
          await touch(args[0], this.context);
          break;
        case 'mkdir':
          await mkdir(args[0], this.context);
          break;
        case 'rename':
          await rename(args[0], args[1], this.context);
          break;
        case 'delete':
          await deletePath(args[0], this.context);
          break;
        case 'copy':
          await copy(args[0], args[1], this.context);
          break;
        case 'move':
          await move(args[0], args[1], this.context);
          break;
        case 'cat':
          await cat(args[0], this.context);
          break;
        case 'info':
          await info(args[0], this.context);
          break;
        case 'find':
          await find(args, this.context);
          break;
        case 'undo':
          await undo(this.context);
          break;
        case 'redo':
          await redo(this.context);
          break;
        case 'clear':
          console.clear();
          break;
        case 'exit':
          this.handleShutdown();
          break;
        default:
          console.log(`${colors.red}Unknown command:${colors.reset} '${command}'`);
      }
    } catch (err) {
      const safeError = normalizeFsError(err);
      console.log(`${colors.red}Error [${safeError.code}]:${colors.reset} ${safeError.message}`);
    }
  }

  /**
   * Recovers from unhandled interrupted writes using journal logs.
   */
  async checkCrashRecovery() {
    const interrupted = await this.logger.getIncompleteOperations();
    if (interrupted.length > 0) {
      console.log(`${colors.yellow}Warning: Detected ${interrupted.length} interrupted operation(s) from previous session.${colors.reset}`);
    }
  }

  /**
   * Graceful cleanup handling for SIGINT (Ctrl+C) and exit.
   */
  handleShutdown() {
    console.log(`\n${colors.dim}Exiting NoteFlow File Manager. Goodbye!${colors.reset}`);
    if (this.rl) this.rl.close();
    process.exit(0);
  }
}
