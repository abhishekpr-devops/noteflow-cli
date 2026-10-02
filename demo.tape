# VHS tape script for NoteFlow CLI demo recording
# Requirements:
#   Output target: assets/demo.gif
#   Theme: Catppuccin Mocha
#   Window size: 1000x600, Font size: 16
#   Cursor visible, Typing speed ~50ms

Output "assets/demo.gif"

Set Shell "bash"
Set Theme "Catppuccin Mocha"
Set Width 1000
Set Height 600
Set FontSize 16
Set TypingSpeed 50ms
Set CursorBlink true

# Clean up any leftover demo artifacts and reset the viewport
Hide
Type "rm -rf demo_folder"
Enter
Type "clear"
Enter
Sleep 500ms
Show

# 1. Launch NoteFlow CLI
Type "npm start"
Enter

# 2. Pause to showcase the ASCII welcome banner and sandbox path
Sleep 2.5s

# 3. List directory contents with box-drawing table and glyphs
Type "ls"
Enter
Sleep 2s

# 4. Create a demo directory
Type "mkdir demo_folder"
Enter
Sleep 1.5s

# 5. Navigate into demo_folder to show the prompt badge change
Type "cd demo_folder"
Enter
Sleep 1.5s

# 6. Create a new file
Type "touch file.txt"
Enter
Sleep 1.5s

# 7. Rename the file
Type "rename file.txt document.txt"
Enter
Sleep 1.5s

# 8. Undo the rename operation to demonstrate rollback
Type "undo"
Enter
Sleep 2s

# 9. Exit the CLI session gracefully
Type "exit"
Enter
Sleep 2s
