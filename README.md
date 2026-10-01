# noteflow-cli

An interactive, non-blocking terminal file manager built strictly using native Node.js APIs.

---

## Overview

`noteflow-cli` is a terminal-based file management environment developed without external runtime libraries or native shell command invocations (such as `ls`, `cp`, `mv`, `rm`, or `find`). The application relies entirely on Node.js core modules (`node:fs/promises`, `node:stream`, `node:path`, `node:readline`) to demonstrate non-blocking asynchronous I/O, path confinement, stream piping, and crash-resilient command patterns.

---

## Key Features

* **Asynchronous Non-Blocking I/O:** Every disk query and modification executes through `node:fs/promises` without stalling the Node.js event loop.


* **Sandboxed Path Security:** Enforces root directory confinement using canonical resolution and `fs.realpath` verification to mitigate directory traversal exploits and external symbolic link bypasses.


* **Memory-Safe File Streaming:** Transfers large files via chunked readable and writable streams (`node:stream/promises` pipeline) with real-time ASCII progress reporting.


* **Reversible Operations (Undo/Redo):** In-memory command pattern supporting full rollback and roll-forward for actions (`touch`, `mkdir`, `rename`, `delete`, `copy`, `move`). Deletions are safely staged in an internal trash cache to prevent instant unlinking.


* **Crash Recovery Journaling:** Append-only Write-Ahead Logging (`.noteflow_journal.log`) flags interrupted disk operations across process restarts.


* **Operational Error Boundary:** Custom `AppError` architecture translates standard POSIX system error codes (`ENOENT`, `EACCES`, `EEXIST`) into human-readable diagnostics while keeping the REPL active.


* **Built-in Automated Testing:** Complete integration test suite written with the native `node:test` runner and `node:assert/strict` assertion engine.



---

## Architecture & Directory Structure

```text
noteflow-cli/
├── bin/
│   └── index.js             # CLI binary entry point (bootstrapper & shebang)
├── src/
│   ├── app.js               # Interactive REPL session & command router
│   ├── context.js           # Session state container (working directory & undo/redo stacks)
│   ├── operations/          # Concrete file operations
│   │   ├── navigation.js    # pwd, cd, ls, tree
│   │   ├── manipulation.js  # mkdir, touch, rename, delete
│   │   ├── transfer.js      # copy, move (stream-driven)
│   │   ├── inspection.js    # cat, info, find
│   │   └── history.js       # undo, redo execution handlers
│   ├── utils/               # Internal utilities
│   │   ├── pathGuard.js     # Path normalization, sandbox boundary, and symlink validation
│   │   ├── formatter.js     # ANSI terminal styles, byte conversion, table & tree rendering
│   │   └── logger.js        # Append-only operational journal
│   └── errors/
│       └── AppError.js      # Normalized POSIX error handling
├── tests/
│   └── fs.test.js           # Automated test suite using node:test
├── package.json             # ECMAScript Modules (ESM) package configuration
└── README.md

```

---

## Supported Commands

| Command | Syntax | Description |
| --- | --- | --- |
| `pwd` | `pwd` | Print absolute path of current working directory.

 |
| `cd` | `cd <path>` | Change active working directory within sandbox boundary.

 |
| `ls` | `ls [-a] [-s name|size|time] [-r] [-f] [-d]` | List directory contents with sorting, filtering, and hidden files.

 |
| `tree` | `tree [depth]` | Render recursive ASCII directory structure up to specified depth.

 |
| `touch` | `touch <filename>` | Create an empty file or update access timestamps.

 |
| `mkdir` | `mkdir <dirname>` | Create a new directory.

 |
| `rename` | `rename <old_path> <new_path>` | Rename or relocate a file/directory.

 |
| `delete` | `delete <path>` | Recursively delete a file or directory with interactive confirmation.

 |
| `copy` | `copy <src> <dest>` | Stream-copy files with progress indicator, or copy directories recursively.

 |
| `move` | `move <src> <dest>` | Move files or directories across paths.

 |
| `cat` | `cat <filepath>` | Output textual content of a file.

 |
| `info` | `info <path>` | Display file size, permissions, type, extension, and timestamps.

 |
| `find` | `find <pattern> [-i] [-e ext]` | Recursively locate files by substring, case-sensitivity, or extension.

 |
| `undo` | `undo` | Revert the most recent mutating file operation.

 |
| `redo` | `redo` | Reapply the most recently reverted file operation.

 |
| `clear` | `clear` | Clear terminal display. |
| `exit` | `exit` | Terminate session cleanly (or trigger via `Ctrl+C`). |

---

## Getting Started

### Prerequisites

* **Node.js**: `>= 18.0.0`

* **npm**: `>= 9.0.0`


### Installation

Clone the repository and inspect the workspace:

```bash
git clone https://github.com/abhishekpr-devops/noteflow-cli.git
cd noteflow-cli

```

### Execution

Start the interactive terminal file manager within the current working directory:

```bash
npm start

```

Launch the file manager sandboxed to a specific root target:

```bash
node ./bin/index.js /path/to/sandbox

```

Optionally link the package to run globally as a system command:

```bash
npm link
noteflow

```

---

## Running Automated Tests

Run the built-in test suite to validate path sandboxing, stream copying, and reversible file operations:

```bash
npm test

```

---

## License

This project is licensed under the MIT License.  
