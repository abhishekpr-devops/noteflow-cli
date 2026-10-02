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
    this.isExiting = false;
  }

  /**
   * Initializes the interactive REPL.
   */
  async start() {
    console.clear();

    const bannerTitle = 'NOTEFLOW CLI  v1.0.0';
    const bannerSubtitle = 'Fast, native Node.js filesystem navigator';
    const sandboxLine = `Sandbox: ${this.context.rootDir}`;

    const contentLines = [bannerTitle, bannerSubtitle, sandboxLine];
    const contentWidth = Math.max(...contentLines.map((l) => l.textLength || l.length));
    const pad = 3;
    const borderWidth = contentWidth + pad * 2 + 2;
    const dashes = '─'.repeat(borderWidth - 2);

    console.log(`${colors.bold}┌${dashes}┐${colors.reset}`);
    console.log(`${colors.bold}│${' '.repeat(pad)}${bannerTitle}${' '.repeat(contentWidth - bannerTitle.length + pad)}│${colors.reset}`);
    console.log(`${colors.bold}│${' '.repeat(pad)}${bannerSubtitle}${' '.repeat(contentWidth - bannerSubtitle.length + pad)}│${colors.reset}`);
    console.log(`${colors.dim}│${' '.repeat(pad)}${sandboxLine}${' '.repeat(contentWidth - sandboxLine.length + pad)}│${colors.reset}`);
    console.log(`${colors.bold}└${dashes}┘${colors.reset}\n`);

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
    if (this.isExiting || (this.rl && this.rl.closed)) return;
    const relPath = path.relative(this.context.rootDir, this.context.currentDir) || '/';
    const badge = '\x1b[46m\x1b[30m NOTEFLOW \x1b[0m';
    const pathPart = `\x1b[44m\x1b[37m ${relPath} \x1b[0m`;
    const promptStr = `${badge}${pathPart} ❯ `;
    this.rl.question(promptStr, async (line) => {
      await this.processCommand(line);
      if (!this.isExiting) {
        this.promptUser();
      }
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
    this.isExiting = true;
    console.log(`\n${colors.dim}Exiting NoteFlow File Manager. Goodbye!${colors.reset}`);
    if (this.rl) this.rl.close();
    process.exit(0);
  }
}
