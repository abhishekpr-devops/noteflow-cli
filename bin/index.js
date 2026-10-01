#!/usr/bin/env node

import { FileCommanderApp } from '../src/app.js';

// Parse optional root directory sandbox from CLI arguments
const targetRoot = process.argv[2] || process.cwd();

const app = new FileCommanderApp(targetRoot);

// Launch CLI REPL
app.start().catch((err) => {
  console.error('Fatal crash on startup:', err);
  process.exit(1);
});
