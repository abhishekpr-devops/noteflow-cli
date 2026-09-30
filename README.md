# noteflow-cli

An interactive, non-blocking Terminal File Manager built from scratch using native Node.js APIs.

---

## Overview

`noteflow-cli` is a terminal-based file navigation and management environment designed to showcase core Node.js architectural concepts without reliance on external utility libraries or shell execution wrappers (`rm`, `cp`, `mv`, etc.).

---

## Features

- **Interactive REPL**: Persistent shell-like prompt with command history navigation.
- **Sandboxed Path Traversal**: Strict path boundary enforcement and symlink verification to prevent directory jailbreaks.
- **Pure Node.js Filesystem Operations**: Built entirely on `node:fs/promises` and `node:path`.
- **Memory-Efficient File Streaming**: Large file transfers piped via chunked readable/writable streams with live progress counters.
- **Safety and Reversibility**: Reversible command pattern supporting undo/redo for mutating actions (`mkdir`, `touch`, `rename`, `delete`, `copy`, `move`).
- **Crash Resilience**: POSIX error normalization and append-only operational journaling to survive unexpected process interruptions.

---

## Architecture & Directory Structure

```text
noteflow-cli/
├── bin/
│   └── index.js             # CLI executable entry point
├── src/
│   ├── app.js               # Interactive REPL prompt and command dispatcher
│   ├── context.js           # Session state (working directory, history stacks)
│   ├── operations/          # Concrete file system operations
│   │   ├── navigation.js    # pwd, cd, ls, tree
│   │   ├── manipulation.js  # mkdir, touch, rename, delete
│   │   ├── transfer.js      # copy, move (stream-driven)
│   │   ├── inspection.js    # cat, info, find
│   │   └── history.js       # undo, redo, and transaction tracking
│   ├── utils/               # Shared utilities
│   │   ├── pathGuard.js     # Path normalization, traversal guards, symlink safety
│   │   ├── formatter.js     # ANSI terminal colors, human-readable units, ASCII tree
│   │   └── logger.js        # Append-only journal manager
│   └── errors/
│       └── AppError.js      # Operational error boundary and POSIX normalizer
├── tests/
│   └── fs.test.js           # Automated test suite using node:test
├── package.json
└── README.md
