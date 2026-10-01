import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SessionContext } from '../src/context.js';
import { resolveSafePath } from '../src/utils/pathGuard.js';
import { touch, mkdir, rename } from '../src/operations/manipulation.js';
import { copy, move } from '../src/operations/transfer.js';
import { undo, redo } from '../src/operations/history.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testSandbox = path.join(__dirname, '.test_sandbox');

describe('NoteFlow File Manager Test Suite', () => {
  let context;

  before(async () => {
    await fs.rm(testSandbox, { recursive: true, force: true });
    await fs.mkdir(testSandbox, { recursive: true });
    context = new SessionContext(testSandbox);
  });

  after(async () => {
    await fs.rm(testSandbox, { recursive: true, force: true });
  });

  test('Security: Prevent directory traversal outside root directory', () => {
    assert.throws(
      () => {
        resolveSafePath('../../../etc/passwd', context.currentDir, context.rootDir);
      },
      {
        name: 'AppError',
        code: 'SANDBOX_VIOLATION',
      }
    );
  });

  test('Touch & Undo: Create a file and roll it back via undo', async () => {
    const fileName = 'test_note.txt';
    const filePath = path.join(testSandbox, fileName);

    await touch(fileName, context);
    let stats = await fs.stat(filePath);
    assert.ok(stats.isFile(), 'File should exist on disk');

    await undo(context);
    await assert.rejects(async () => {
      await fs.stat(filePath);
    }, /ENOENT/);
  });

  test('Mkdir: Create directories safely', async () => {
    const dirName = 'nested_folder';
    const dirPath = path.join(testSandbox, dirName);

    await mkdir(dirName, context);
    const stats = await fs.stat(dirPath);
    assert.ok(stats.isDirectory(), 'Directory should exist');
  });

  test('Stream Transfer: Copy file using stream pipeline', async () => {
    const src = 'stream_source.txt';
    const dest = 'stream_copy.txt';
    const srcPath = path.join(testSandbox, src);
    const destPath = path.join(testSandbox, dest);

    await fs.writeFile(srcPath, 'Hello NoteFlow Streams!'.repeat(100), 'utf-8');
    await copy(src, dest, context);

    const copyStats = await fs.stat(destPath);
    assert.ok(copyStats.size > 0, 'Copied file must not be empty');

    const content = await fs.readFile(destPath, 'utf-8');
    assert.ok(content.startsWith('Hello NoteFlow'), 'Content should match');
  });
});
