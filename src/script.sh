#!/bin/bash

# Collect contents of all files in a directory tree into a single log.
# Defaults:
#   - directory = current directory (.)
#   - output log = log.log
# Skips: this script itself and the log file

INPUT_DIR="${1:-.}"
OUTPUT_FILE="${2:-log.log}"
SCRIPT_PATH="$(realpath "$0")"
OUTPUT_PATH="$(realpath "$OUTPUT_FILE")"

# Verify input directory
if [ ! -d "$INPUT_DIR" ]; then
  echo "Error: $INPUT_DIR is not a directory."
  exit 1
fi

# Clear the output file
> "$OUTPUT_FILE"

# Walk through all files
find "$INPUT_DIR" -type f | while read -r FILE; do
  FILE_PATH="$(realpath "$FILE")"

  # Skip the script itself and the log file
  if [ "$FILE_PATH" = "$SCRIPT_PATH" ] || [ "$FILE_PATH" = "$OUTPUT_PATH" ]; then
    continue
  fi

  echo "===== $FILE =====" >> "$OUTPUT_FILE"
  cat "$FILE" >> "$OUTPUT_FILE" 2>/dev/null
  echo -e "\n" >> "$OUTPUT_FILE"
done

echo "Log file created at: $OUTPUT_FILE"
